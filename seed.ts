import mongoose from "mongoose";
import "dotenv/config";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/alerthub";

const ReportSchema = new mongoose.Schema({
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
const Report = mongoose.models.Report || mongoose.model("Report", ReportSchema);

const AlertSchema = new mongoose.Schema({
  incidentId:         { type: String, required: true },
  title:              { type: String, required: true },
  message:            { type: String, required: true },
  safetyInstructions: { type: String, default: "" },
  severity:           { type: String, default: "low" },
  threatType:         { type: String, default: "Other" },
  location:           { type: String, default: "National" },
  broadcastedBy:      String,
}, { timestamps: true });
const Alert = mongoose.models.Alert || mongoose.model("Alert", AlertSchema);

const AuditLogSchema = new mongoose.Schema({
  reportId:   { type: String, required: true },
  actorUid:   String,
  actorRole:  String,
  fromStatus: String,
  toStatus:   String,
  notes:      String,
}, { timestamps: true });
const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB Atlas");
  
  await Report.deleteMany({});
  await Alert.deleteMany({});
  await AuditLog.deleteMany({});
  
  console.log("Cleared existing data");

  const now = new Date();

  // 1. Pending Report
  const r1 = await Report.create({
    reporterName: "John Doe",
    incidentType: "Phishing",
    description: "Received a highly suspicious email claiming to be from my bank requesting immediate password reset. URL looks like secure-login-bank[.]com.",
    location: "New York, USA",
    status: "pending",
  });
  await AuditLog.create({ reportId: r1._id, actorRole: "public", fromStatus: "—", toStatus: "pending", notes: "Report submitted", createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24) });

  // 2. Under Analysis Report
  const r2 = await Report.create({
    reporterName: "Jane Smith",
    incidentType: "Malware",
    description: "My computer running extremely slow after downloading a supposed PDF invoice. Strange files with .lock extensions appearing.",
    location: "London, UK",
    status: "under_analysis",
    severity: "high",
    threatType: "Ransomware",
    analysisNotes: "Indicators suggest a ransomware infection spreading rapidly across the local machine. Network isolation is critical.",
    suggestedMitigation: "1. Disconnect machine from network.\n2. Do not pay ransom.\n3. Image the drive for analysis.",
    confidenceScore: 92,
  });
  await AuditLog.create({ reportId: r2._id, actorRole: "public", fromStatus: "—", toStatus: "pending", notes: "Report submitted", createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 12) });
  await AuditLog.create({ reportId: r2._id, actorRole: "defence", fromStatus: "pending", toStatus: "under_analysis", notes: "AI: Ransomware (high)", createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 11) });

  // 3. Resolved Report
  const r3 = await Report.create({
    reporterName: "Acme Corp IT",
    incidentType: "DDoS",
    description: "Our main application servers are experiencing massive inbound UDP traffic from multiple IPs. Services are currently unreachable.",
    location: "Frankfurt, DE",
    status: "resolved",
    severity: "critical",
    threatType: "DDoS",
    analysisNotes: "Volumetric UDP flood detected targeting edge routers. Traffic volume exceeds 50Gbps.",
    suggestedMitigation: "1. Implement BGP Flowspec.\n2. Coordinate with ISP for upstream filtering.\n3. Enable strict rate limiting.",
    confidenceScore: 98,
    resolutionNotes: "Upstream ISP successfully filtered malicious traffic. Services are now stabilizing and coming back online.",
    resolutionStatus: "resolved",
  });
  await AuditLog.create({ reportId: r3._id, actorRole: "public", fromStatus: "—", toStatus: "pending", notes: "Report submitted", createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 5) });
  await AuditLog.create({ reportId: r3._id, actorRole: "defence", fromStatus: "pending", toStatus: "under_analysis", notes: "AI: DDoS (critical)", createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 4) });
  await AuditLog.create({ reportId: r3._id, actorRole: "defence", fromStatus: "under_analysis", toStatus: "resolved", notes: "Upstream ISP successfully filtered malicious traffic.", createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 1) });

  // 4. Verified Report
  const r4 = await Report.create({
    reporterName: "State University",
    incidentType: "Data Breach",
    description: "Database containing student records appears to have been accessed without authorization. Extracted data found on pastebin.",
    location: "California, USA",
    status: "verified",
    severity: "critical",
    threatType: "Data Breach",
    analysisNotes: "SQL injection vulnerability exploited in legacy student portal. Attackers exfiltrated 15,000 records.",
    confidenceScore: 95,
    resolutionNotes: "Vulnerability patched, compromised database credentials revoked. Forensic analysis is ongoing to determine exact data exfiltrated.",
    resolutionStatus: "resolved",
    verificationNotes: "Confirmed breach incident. Details match with local law enforcement reports. Preparing public advisory.",
  });
  await AuditLog.create({ reportId: r4._id, actorRole: "public", fromStatus: "—", toStatus: "pending", notes: "Report submitted" });
  await AuditLog.create({ reportId: r4._id, actorRole: "defence", fromStatus: "pending", toStatus: "under_analysis", notes: "AI: Data Breach (critical)" });
  await AuditLog.create({ reportId: r4._id, actorRole: "defence", fromStatus: "under_analysis", toStatus: "resolved", notes: "Vulnerability patched, credentials revoked." });
  await AuditLog.create({ reportId: r4._id, actorRole: "police", fromStatus: "resolved", toStatus: "verified", notes: "Confirmed breach incident." });

  // 5. Broadcasted Report
  const r5 = await Report.create({
    reporterName: "City Hospital",
    incidentType: "Ransomware",
    description: "Critical hospital systems are locked. 'WannaCry' variant detected spreading across the internal network.",
    location: "Tokyo, JP",
    status: "broadcasted",
    severity: "critical",
    threatType: "Ransomware",
    analysisNotes: "High-priority ransomware outbreak affecting medical systems. Immediate threat to life and operations.",
    confidenceScore: 99,
    resolutionNotes: "Affected subnets isolated. Backup restoration initiated. Relevant cybersecurity authorities engaged.",
    resolutionStatus: "resolved",
    verificationNotes: "Verified via national CERT. Authorizing immediate localized alert.",
  });
  
  const a5 = await Alert.create({
    incidentId: r5._id,
    title: "Critical Ransomware Attack on Medical Facilities",
    message: "A major ransomware attack is affecting critical medical infrastructure. Services may be delayed or unavailable.",
    safetyInstructions: "• Do not connect personal devices to hospital networks\n• Follow instructions from staff\n• Emergency services are being rerouted",
    severity: "critical",
    threatType: "Ransomware",
    location: "Tokyo, JP",
  });
  
  r5.alertId = a5._id.toString();
  await r5.save();

  await AuditLog.create({ reportId: r5._id, actorRole: "public", fromStatus: "—", toStatus: "pending", notes: "Report submitted" });
  await AuditLog.create({ reportId: r5._id, actorRole: "defence", fromStatus: "pending", toStatus: "under_analysis", notes: "AI: Ransomware (critical)" });
  await AuditLog.create({ reportId: r5._id, actorRole: "defence", fromStatus: "under_analysis", toStatus: "resolved", notes: "Subnets isolated, restoring backups." });
  await AuditLog.create({ reportId: r5._id, actorRole: "police", fromStatus: "resolved", toStatus: "verified", notes: "Verified via national CERT." });
  await AuditLog.create({ reportId: r5._id, actorRole: "police", fromStatus: "verified", toStatus: "broadcasted", notes: "Alert: Critical Ransomware Attack on Medical Facilities" });

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch(console.error);
