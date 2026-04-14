/**
 * AlertHub — Backend (MongoDB Atlas + JWT)
 * Pipeline: pending → under_analysis → resolved → verified → broadcasted
 */

import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import multer from "multer";
import mongoose, { Schema, Document, model } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const JWT_SECRET   = process.env.JWT_SECRET   || "alerthub-jwt-secret-2026";
const ADMIN_SECRET = process.env.ADMIN_SECRET  || "alerthub-admin-2026";
const MONGO_URI    = process.env.MONGO_URI     || "mongodb://localhost:27017/alerthub";

// ─── Mongoose Models ──────────────────────────────────────────────────────────
const UserSchema = new Schema({
  email:       { type: String, required: true, unique: true, lowercase: true },
  password:    { type: String, required: true },
  displayName: { type: String, required: true },
  role:        { type: String, enum: ["public","defence","police"], default: "public" },
}, { timestamps: true });
const User = model("User", UserSchema);

const ReportSchema = new Schema({
  reporterUid:         String,
  reporterName:        { type: String, default: "Anonymous" },
  incidentType:        { type: String, default: "Other" },
  description:         { type: String, required: true },
  location:            { type: String, default: "" },
  fileUrl:             { type: String, default: "" },
  status:              { type: String, default: "pending" },
  severity:            String,
  threatType:          String,
  analysisNotes:       String,
  suggestedMitigation: String,
  confidenceScore:     Number,
  resolutionNotes:     String,
  resolutionStatus:    String,
  resolvedBy:          String,
  verificationNotes:   String,
  verifiedBy:          String,
  rejectedBy:          String,
  rejectReason:        String,
  alertId:             String,
}, { timestamps: true });
const Report = model("Report", ReportSchema);

const AlertSchema = new Schema({
  incidentId:         { type: String, required: true },
  title:              { type: String, required: true },
  message:            { type: String, required: true },
  safetyInstructions: { type: String, default: "" },
  severity:           { type: String, default: "low" },
  threatType:         { type: String, default: "Other" },
  location:           { type: String, default: "National" },
  broadcastedBy:      String,
}, { timestamps: true });
const Alert = model("Alert", AlertSchema);

const AuditLogSchema = new Schema({
  reportId:   { type: String, required: true },
  actorUid:   String,
  actorRole:  String,
  fromStatus: String,
  toStatus:   String,
  notes:      String,
}, { timestamps: true });
const AuditLog = model("AuditLog", AuditLogSchema);

// ─── Pipeline ─────────────────────────────────────────────────────────────────
const PIPELINE: Record<string, string> = {
  pending:        "under_analysis",
  under_analysis: "resolved",
  resolved:       "verified",
  verified:       "broadcasted",
};

const ROLE_TRANSITIONS: Record<string, string[]> = {
  defence: ["under_analysis", "resolved", "rejected"],
  police:  ["verified", "broadcasted", "under_analysis"],
};

function sanitize(s: string): string {
  return (s || "").replace(/<[^>]*>/g, "").trim().slice(0, 5000);
}

async function auditLog(reportId: string, actorUid: string, actorRole: string,
  fromStatus: string, toStatus: string, notes?: string) {
  await AuditLog.create({ reportId, actorUid, actorRole, fromStatus, toStatus, notes });
}

async function enforceTransition(reportId: string, targetStatus: string, actorRole: string) {
  const report = await Report.findById(reportId);
  if (!report) return { ok: false, error: "Report not found" };
  const allowed = ROLE_TRANSITIONS[actorRole] || [];
  if (!allowed.includes(targetStatus))
    return { ok: false, error: `Role '${actorRole}' cannot set status to '${targetStatus}'` };
  if (targetStatus === "rejected") {
    if (actorRole !== "defence") return { ok: false, error: "Only defence can reject" };
    return { ok: true, report };
  }
  if (actorRole === "police" && targetStatus === "under_analysis") {
    if (report.get("status") !== "resolved") return { ok: false, error: "Can only revise a resolved report" };
    return { ok: true, report };
  }
  if (PIPELINE[report.get("status")] !== targetStatus)
    return { ok: false, error: `Invalid transition: '${report.get("status")}' → '${targetStatus}'. Expected: '${PIPELINE[report.get("status")]}'` };
  return { ok: true, report };
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────
interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  userName?: string;
}

function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    return res.status(401).json({ error: "Missing auth token" });
  try {
    const payload = jwt.verify(header.split(" ")[1], JWT_SECRET) as any;
    req.userId = payload.id; req.userRole = payload.role; req.userName = payload.displayName;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!roles.includes(req.userRole || ""))
      return res.status(403).json({ error: `Access denied. Required: ${roles.join(" or ")}` });
    next();
  };
}

// ─── SSE ──────────────────────────────────────────────────────────────────────
const sseClients = new Set<Response>();
function broadcastSSE(event: string, data: object) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(c => { try { c.write(msg); } catch { sseClients.delete(c); } });
}

// ─── Rate Limiters ────────────────────────────────────────────────────────────
const reportLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: "Too many reports. Wait 15 minutes." } });
const apiLimiter    = rateLimit({ windowMs: 60 * 1000, max: 60, message: { error: "Too many requests." } });
const authLimiter   = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: "Too many auth attempts." } });

// ─── File Upload ──────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, "uploads/"),
    filename: (_req, file, cb) => cb(null, `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, ["image/jpeg","image/png","image/gif","image/webp","video/mp4","video/webm"].includes(file.mimetype));
  },
});

// ─── Server Bootstrap ─────────────────────────────────────────────────────────
async function startServer() {
  console.log("🚀 AlertHub starting...");
  console.log("🔗 Connecting to MongoDB Atlas...");

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log("✅ MongoDB Atlas connected");

  const fs = await import("fs");
  if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

  const app = express();
  const PORT = parseInt(process.env.PORT || "3000");

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: process.env.APP_URL || "*", credentials: true }));
  app.use(express.json({ limit: "10mb" }));
  app.use(morgan("dev"));
  app.use("/api/", apiLimiter);
  app.use("/uploads", express.static("uploads"));

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  // Health
  app.get("/api/health", (_req, res) => res.json({ status: "ok", db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" }));

  // SSE
  app.get("/api/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    sseClients.add(res);
    res.write(`event: connected\ndata: {}\n\n`);
    req.on("close", () => sseClients.delete(res));
  });

  // ── Auth ──────────────────────────────────────────────────────────────────
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      const { email, password, displayName, role = "public" } = req.body;
      if (!email || !password || !displayName) return res.status(400).json({ error: "email, password, displayName required" });
      if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
      if (!["public","defence","police"].includes(role)) return res.status(400).json({ error: "Invalid role" });
      if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ error: "Email already registered" });
      const user = await User.create({ email: email.toLowerCase(), password: await bcrypt.hash(password, 12), displayName, role });
      const token = jwt.sign({ id: user._id, role: user.get("role"), displayName }, JWT_SECRET, { expiresIn: "7d" });
      return res.status(201).json({ token, user: { id: user._id, email: user.get("email"), displayName, role: user.get("role") } });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: "email and password required" });
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user || !(await bcrypt.compare(password, user.get("password")))) return res.status(401).json({ error: "Invalid email or password" });
      const token = jwt.sign({ id: user._id, role: user.get("role"), displayName: user.get("displayName") }, JWT_SECRET, { expiresIn: "7d" });
      return res.json({ token, user: { id: user._id, email: user.get("email"), displayName: user.get("displayName"), role: user.get("role") } });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  app.get("/api/me", requireAuth, async (req: AuthRequest, res: Response) => {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ id: user._id, email: user.get("email"), displayName: user.get("displayName"), role: user.get("role") });
  });

  app.post("/api/seed-roles", authLimiter, async (req, res) => {
    const { secret, email, role } = req.body;
    if (secret !== ADMIN_SECRET) return res.status(403).json({ error: "Invalid admin secret" });
    if (!["defence","police","public"].includes(role)) return res.status(400).json({ error: "Invalid role" });
    const user = await User.findOneAndUpdate({ email: email.toLowerCase() }, { role }, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ ok: true, email: user.get("email"), role: user.get("role") });
  });

  // ── Upload ────────────────────────────────────────────────────────────────
  app.post("/api/upload", requireAuth, upload.single("file"), (req: AuthRequest, res: Response) => {
    if (!req.file) return res.status(400).json({ error: "No file or invalid type" });
    return res.json({ url: `${process.env.APP_URL || "http://localhost:3000"}/uploads/${req.file.filename}` });
  });

  // ── Stage 1: Report ───────────────────────────────────────────────────────
  app.post("/api/report", requireAuth, reportLimiter, async (req: AuthRequest, res: Response) => {
    try {
      const { incidentType, description, location, fileUrl } = req.body;
      if (!description?.trim()) return res.status(400).json({ error: "Description is required" });
      const report = await Report.create({ reporterUid: req.userId, reporterName: req.userName, incidentType: sanitize(incidentType || "Other"), description: sanitize(description), location: sanitize(location || ""), fileUrl: fileUrl || "", status: "pending" });
      await auditLog(report._id.toString(), req.userId!, req.userRole!, "—", "pending", "Report submitted");
      broadcastSSE("report:new", { id: report._id, status: "pending" });
      return res.status(201).json({ reportId: report._id, status: "pending" });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  // ── Stage 2: Analyze ──────────────────────────────────────────────────────
  app.post("/api/analyze", requireAuth, requireRole("defence"), async (req: AuthRequest, res: Response) => {
    try {
      const { reportId } = req.body;
      if (!reportId) return res.status(400).json({ error: "reportId required" });
      const guard = await enforceTransition(reportId, "under_analysis", "defence");
      if (!guard.ok) return res.status(403).json({ error: guard.error });
      const aiRes = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `You are a cybersecurity AI analyst. Analyze this cyber incident and return ONLY valid JSON with: threatType (Phishing|Malware|Ransomware|DDoS|SQL Injection|Intrusion|Social Engineering|Data Breach|Identity Theft|Other), severity (low|medium|high|critical), analysisNotes (2-3 sentences), suggestedMitigation (3-5 steps), confidenceScore (0-100).\n\nIncident: "${sanitize(guard.report!.get("description"))}"`,
        config: { responseMimeType: "application/json" },
      });
      const analysis = JSON.parse(aiRes.text);
      await Report.findByIdAndUpdate(reportId, { status: "under_analysis", ...analysis, analysedBy: req.userId, analysedAt: new Date() });
      await auditLog(reportId, req.userId!, "defence", "pending", "under_analysis", `AI: ${analysis.threatType} (${analysis.severity})`);
      broadcastSSE("report:updated", { id: reportId, status: "under_analysis", severity: analysis.severity });
      return res.json({ ...analysis, status: "under_analysis" });
    } catch (err: any) { return res.status(500).json({ error: "AI analysis failed: " + err.message }); }
  });

  // ── Stage 3: Resolve ──────────────────────────────────────────────────────
  app.post("/api/resolve", requireAuth, requireRole("defence"), async (req: AuthRequest, res: Response) => {
    try {
      const { reportId, resolutionNotes, resolutionStatus = "resolved" } = req.body;
      if (!reportId || !resolutionNotes?.trim()) return res.status(400).json({ error: "reportId and resolutionNotes required" });
      const guard = await enforceTransition(reportId, "resolved", "defence");
      if (!guard.ok) return res.status(403).json({ error: guard.error });
      await Report.findByIdAndUpdate(reportId, { status: "resolved", resolutionNotes: sanitize(resolutionNotes), resolutionStatus, resolvedBy: req.userId, resolvedAt: new Date() });
      await auditLog(reportId, req.userId!, "defence", "under_analysis", "resolved", resolutionNotes);
      broadcastSSE("report:updated", { id: reportId, status: "resolved" });
      return res.json({ status: "resolved" });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  // ── Reject ────────────────────────────────────────────────────────────────
  app.post("/api/reject", requireAuth, requireRole("defence"), async (req: AuthRequest, res: Response) => {
    try {
      const { reportId, reason } = req.body;
      if (!reportId) return res.status(400).json({ error: "reportId required" });
      const guard = await enforceTransition(reportId, "rejected", "defence");
      if (!guard.ok) return res.status(403).json({ error: guard.error });
      await Report.findByIdAndUpdate(reportId, { status: "rejected", rejectedBy: req.userId, rejectReason: sanitize(reason || "False alarm") });
      await auditLog(reportId, req.userId!, "defence", guard.report!.get("status"), "rejected", reason);
      broadcastSSE("report:updated", { id: reportId, status: "rejected" });
      return res.json({ status: "rejected" });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  // ── Stage 4: Verify ───────────────────────────────────────────────────────
  app.post("/api/verify", requireAuth, requireRole("police"), async (req: AuthRequest, res: Response) => {
    try {
      const { reportId, verificationNotes } = req.body;
      if (!reportId) return res.status(400).json({ error: "reportId required" });
      const guard = await enforceTransition(reportId, "verified", "police");
      if (!guard.ok) return res.status(403).json({ error: guard.error });
      await Report.findByIdAndUpdate(reportId, { status: "verified", verificationNotes: sanitize(verificationNotes || ""), verifiedBy: req.userId, verifiedAt: new Date() });
      await auditLog(reportId, req.userId!, "police", "resolved", "verified", verificationNotes);
      const r = guard.report!;
      let alertDraft = { title: "", message: "", safetyInstructions: "" };
      try {
        const aiRes = await ai.models.generateContent({ model: "gemini-2.0-flash", contents: `Create a public safety alert. Return ONLY JSON with title, message, safetyInstructions (bullet points with •).\nType: ${r.get("threatType")}, Severity: ${r.get("severity")}\nDescription: ${sanitize(r.get("description"))}\nResolution: ${sanitize(r.get("resolutionNotes") || "")}`, config: { responseMimeType: "application/json" } });
        alertDraft = JSON.parse(aiRes.text);
      } catch { /* non-fatal */ }
      broadcastSSE("report:updated", { id: reportId, status: "verified" });
      return res.json({ status: "verified", alertDraft });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  // ── Revision request ──────────────────────────────────────────────────────
  app.post("/api/request-revision", requireAuth, requireRole("police"), async (req: AuthRequest, res: Response) => {
    try {
      const { reportId, revisionNotes } = req.body;
      if (!reportId || !revisionNotes?.trim()) return res.status(400).json({ error: "reportId and revisionNotes required" });
      const guard = await enforceTransition(reportId, "under_analysis", "police");
      if (!guard.ok) return res.status(403).json({ error: guard.error });
      await Report.findByIdAndUpdate(reportId, { status: "under_analysis", analysisNotes: `POLICE REVISION REQUEST: ${sanitize(revisionNotes)}` });
      await auditLog(reportId, req.userId!, "police", "resolved", "under_analysis", `Revision: ${revisionNotes}`);
      broadcastSSE("report:updated", { id: reportId, status: "under_analysis" });
      return res.json({ status: "under_analysis" });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  // ── Stage 5: Broadcast ────────────────────────────────────────────────────
  app.post("/api/broadcast", requireAuth, requireRole("police"), async (req: AuthRequest, res: Response) => {
    try {
      const { reportId, title, message, safetyInstructions } = req.body;
      if (!reportId || !title?.trim() || !message?.trim()) return res.status(400).json({ error: "reportId, title, and message required" });
      const guard = await enforceTransition(reportId, "broadcasted", "police");
      if (!guard.ok) return res.status(403).json({ error: guard.error });
      const r = guard.report!;
      const alert = await Alert.create({ incidentId: reportId, title: sanitize(title), message: sanitize(message), safetyInstructions: sanitize(safetyInstructions || ""), severity: r.get("severity"), threatType: r.get("threatType"), location: r.get("location") || "National", broadcastedBy: req.userId });
      await Report.findByIdAndUpdate(reportId, { status: "broadcasted", alertId: alert._id.toString(), broadcastedAt: new Date() });
      await auditLog(reportId, req.userId!, "police", "verified", "broadcasted", `Alert: ${title}`);
      broadcastSSE("alert:new", { id: alert._id, title, severity: r.get("severity") });
      return res.json({ status: "broadcasted", alertId: alert._id });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  // ── Data endpoints ────────────────────────────────────────────────────────
  app.get("/api/reports", requireAuth, requireRole("defence","police"), async (req: AuthRequest, res: Response) => {
    const { status, severity, limit: lim = "50" } = req.query as Record<string, string>;
    const filter: any = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    const reports = await Report.find(filter).sort({ createdAt: -1 }).limit(parseInt(lim));
    return res.json({ reports });
  });

  app.get("/api/reports/public", async (req, res) => {
    const { limit: lim = "50" } = req.query as Record<string, string>;
    const reports = await Report.find({}, "incidentType status severity location description analysisNotes createdAt").sort({ createdAt: -1 }).limit(parseInt(lim));
    return res.json({ reports });
  });

  app.get("/api/alerts", async (req, res) => {
    const { limit: lim = "20" } = req.query as Record<string, string>;
    const alerts = await Alert.find().sort({ createdAt: -1 }).limit(parseInt(lim));
    return res.json({ alerts });
  });

  app.get("/api/stats", requireAuth, requireRole("defence","police"), async (_req, res) => {
    const [reports, alertCount] = await Promise.all([Report.find(), Alert.countDocuments()]);
    const byStatus: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};
    reports.forEach(r => {
      byStatus[r.get("status")] = (byStatus[r.get("status")] || 0) + 1;
      if (r.get("severity")) bySeverity[r.get("severity")] = (bySeverity[r.get("severity")] || 0) + 1;
      if (r.get("incidentType")) byType[r.get("incidentType")] = (byType[r.get("incidentType")] || 0) + 1;
    });
    return res.json({ total: reports.length, byStatus, bySeverity, byType, alerts: alertCount });
  });

  app.get("/api/audit/:reportId", requireAuth, requireRole("defence","police"), async (req, res) => {
    const isAll = req.params.reportId === "all";
    const filter = isAll ? {} : { reportId: req.params.reportId };
    const logs = await AuditLog.find(filter).sort({ createdAt: isAll ? -1 : 1 }).limit(200);
    return res.json({ logs });
  });

  app.get("/api/pipeline/:reportId", requireAuth, async (req: AuthRequest, res: Response) => {
    const report = await Report.findById(req.params.reportId);
    if (!report) return res.status(404).json({ error: "Report not found" });
    const stages = ["pending","under_analysis","resolved","verified","broadcasted"];
    const status = report.get("status");
    return res.json({ reportId: report._id, currentStatus: status, currentStageIndex: stages.indexOf(status), nextStage: PIPELINE[status] || null, completedStages: stages.slice(0, stages.indexOf(status) + 1), pipeline: stages, severity: report.get("severity"), threatType: report.get("threatType") });
  });

  // ── Error handler ─────────────────────────────────────────────────────────
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Error:", err.message);
    res.status(err.status || 500).json({ error: err.message || "Internal server error" });
  });

  // ── Vite / Static ─────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🛡️  AlertHub — http://localhost:${PORT}`);
    console.log(`📋 Pipeline: pending → under_analysis → resolved → verified → broadcasted`);
    console.log(`🗄️  MongoDB Atlas connected\n`);
  });
}

startServer().catch(err => {
  console.error("❌ Startup failed:", err.message);
  console.error(err);
  process.exit(1);
});
