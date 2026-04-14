import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext";
import { Shield, Bell, CheckCircle, Send, FileText, Info, ChevronLeft, AlertTriangle, RotateCcw, Lock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "../utils/cn";
import PipelineTracker from "../components/PipelineTracker";
import { motion, AnimatePresence } from "motion/react";

const STATUS_PRIORITY = { resolved: 0, verified: 1, broadcasted: 2 };
const SEV_DOT  = { critical: "bg-red-500", high: "bg-amber-500", medium: "bg-yellow-500", low: "bg-emerald-500" };
const SEV_BADGE = {
  critical: "text-red-400 border-red-500/20 bg-red-500/10",
  high:     "text-amber-400 border-amber-500/20 bg-amber-500/10",
  medium:   "text-yellow-400 border-yellow-500/20 bg-yellow-500/10",
  low:      "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
};

function StatusBadge({ status, isDark }: { status: string; isDark: boolean }) {
  const styles: Record<string, string> = {
    resolved:    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    verified:    isDark ? "bg-zinc-800 text-zinc-300 border-white/10" : "bg-zinc-100 text-zinc-600 border-zinc-200",
    broadcasted: "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse",
  };
  const labels: Record<string, string> = { resolved: "Awaiting Verification", verified: "Verified", broadcasted: "Broadcast Active" };
  return <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border", styles[status]||styles.resolved)}>{labels[status]||status}</span>;
}

export default function PoliceDashboard() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const isDark = theme.mode === 'dark';

  const cardBg   = isDark ? 'bg-zinc-900 border-white/5'  : 'bg-white border-zinc-200';
  const innerBg  = isDark ? 'bg-zinc-950 border-white/5'  : 'bg-zinc-50 border-zinc-200';
  const inputCls = isDark ? 'bg-zinc-900 border-white/5 text-zinc-200'  : 'bg-white border-zinc-200 text-zinc-800';
  const textMuted   = isDark ? 'text-zinc-400' : 'text-zinc-500';
  const textPrimary = isDark ? 'text-white'    : 'text-zinc-900';

  const [reports, setReports]           = useState<any[]>([]);
  const [selected, setSelected]         = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [verifying, setVerifying]       = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [requestingRevision, setRequestingRevision] = useState(false);
  const [showDetail, setShowDetail]     = useState(false);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [apiError, setApiError]         = useState<string | null>(null);
  const [alertData, setAlertData]       = useState({ title: "", message: "", safetyInstructions: "" });

  const fetchReports = useCallback(async () => {
    if (!token) return;
    try {
      const [r1, r2, r3] = await Promise.all([
        fetch("/api/reports?status=resolved&limit=100",    { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/reports?status=verified&limit=100",    { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/reports?status=broadcasted&limit=100", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [d1, d2, d3] = await Promise.all([r1.json(), r2.json(), r3.json()]);
      const all = [...(d1.reports||[]), ...(d2.reports||[]), ...(d3.reports||[])];
      all.sort((a, b) =>
        (STATUS_PRIORITY[a.status as keyof typeof STATUS_PRIORITY]??9) -
        (STATUS_PRIORITY[b.status as keyof typeof STATUS_PRIORITY]??9) ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setReports(all);
      if (selected) { const upd = all.find(r => (r._id||r.id) === (selected._id||selected.id)); if (upd) setSelected(upd); }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [token, selected]);

  useEffect(() => {
    fetchReports();
    const es = new EventSource("/api/events");
    es.addEventListener("report:updated", fetchReports as any);
    es.addEventListener("alert:new",      fetchReports as any);
    return () => es.close();
  }, [fetchReports]);

  const apiCall = async (path: string, body: any) => {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  };

  const selectReport = (r: any) => { setSelected(r); setRevisionNotes(""); setAlertData({ title: "", message: "", safetyInstructions: "" }); setApiError(null); setShowDetail(true); };

  const handleVerify = async (report: any) => {
    setVerifying(true); setApiError(null);
    try { const result = await apiCall("/api/verify", { reportId: report._id||report.id }); if (result.alertDraft) setAlertData(result.alertDraft); await fetchReports(); }
    catch (e: any) { setApiError(e.message); } finally { setVerifying(false); }
  };

  const handleBroadcast = async () => {
    if (!selected || !alertData.title.trim() || !alertData.message.trim()) return;
    setBroadcasting(true); setApiError(null);
    try { await apiCall("/api/broadcast", { reportId: selected._id||selected.id, ...alertData }); setSelected(null); setShowDetail(false); await fetchReports(); }
    catch (e: any) { setApiError(e.message); } finally { setBroadcasting(false); }
  };

  const handleRequestRevision = async (report: any) => {
    if (!revisionNotes.trim()) return;
    setRequestingRevision(true); setApiError(null);
    try { await apiCall("/api/request-revision", { reportId: report._id||report.id, revisionNotes }); setSelected(null); setShowDetail(false); await fetchReports(); }
    catch (e: any) { setApiError(e.message); } finally { setRequestingRevision(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent-primary)' }} />
            <span className={cn("text-[10px] font-bold uppercase tracking-wider", textMuted)}>Law Enforcement Operations</span>
          </div>
          <h1 className={cn("text-3xl font-bold tracking-tight", textPrimary)}>
            Verification <span className={cn("font-light", textMuted)}>Desk</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {[
            { label: "Awaiting",  count: reports.filter(r=>r.status==="resolved").length,    color: "text-amber-400" },
            { label: "Verified",  count: reports.filter(r=>r.status==="verified").length,    color: textPrimary },
            { label: "Broadcast", count: reports.filter(r=>r.status==="broadcasted").length, color: "text-emerald-500" },
          ].map(s => (
            <div key={s.label} className={cn("text-center px-4 py-2.5 rounded-lg border shadow-sm min-w-[80px]", cardBg)}>
              <p className={cn("text-xl font-bold", s.color)}>{s.count}</p>
              <p className={cn("text-[10px] font-bold uppercase tracking-wider mt-0.5", textMuted)}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:h-[calc(100vh-14rem)]">
        {/* Queue */}
        <div className={cn("lg:col-span-4 flex flex-col gap-4 overflow-hidden", showDetail ? "hidden lg:flex" : "flex")}>
          <div className="flex-grow overflow-y-auto space-y-3 custom-scrollbar pr-2">
            {loading
              ? <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-zinc-700/50 rounded-full animate-spin" style={{ borderTopColor: 'var(--accent-primary)' }} /></div>
              : reports.length === 0
                ? <div className={cn("text-center py-12 border border-dashed rounded-xl space-y-3", isDark ? "border-white/10 bg-zinc-900/50" : "border-zinc-200 bg-zinc-50")}>
                    <Shield className={cn("w-8 h-8 mx-auto", textMuted)} />
                    <p className={cn("text-sm", textMuted)}>No incidents await verification.</p>
                  </div>
                : reports.map((r, i) => (
                  <motion.button key={r._id||r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    onClick={() => selectReport(r)}
                    className={cn("w-full text-left p-4 rounded-xl border transition-all space-y-3 outline-none",
                      (selected?._id||selected?.id) === (r._id||r.id)
                        ? isDark ? "bg-zinc-800 border-white/20 shadow-sm" : "bg-zinc-100 border-zinc-300 shadow-sm"
                        : isDark ? "bg-zinc-900 border-white/5 hover:bg-zinc-800/80 hover:border-white/10" : "bg-white border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300"
                    )}>
                    <div className="flex justify-between items-center">
                      <StatusBadge status={r.status} isDark={isDark} />
                      <span className={cn("text-[10px] font-medium", textMuted)}>{r.createdAt ? formatDistanceToNow(new Date(r.createdAt), { addSuffix: true }) : ""}</span>
                    </div>
                    <p className={cn("text-sm line-clamp-2 leading-relaxed", textMuted)}>{r.description}</p>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: isDark ? '#09090b' : '#f4f4f5' }}>
                      <PipelineTracker currentStatus={r.status} compact />
                    </div>
                    <div className={cn("flex items-center justify-between mt-2 pt-2 border-t", isDark ? "border-white/5" : "border-zinc-100")}>
                      <div className="flex items-center gap-2">
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", SEV_DOT[r.severity as keyof typeof SEV_DOT]||"bg-zinc-600")} />
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider truncate", textMuted)}>{r.threatType}</span>
                      </div>
                      <span className={cn("text-[10px] font-bold uppercase tracking-wider", textMuted)}>{r.severity}</span>
                    </div>
                  </motion.button>
                ))
            }
          </div>
        </div>

        {/* Detail */}
        <div className={cn("lg:col-span-8 border rounded-xl flex flex-col overflow-hidden shadow-sm", cardBg, showDetail ? "flex" : "hidden lg:flex")}>
          {selected ? (
            <div className="flex-grow overflow-y-auto p-6 sm:p-8 space-y-6 custom-scrollbar">
              <button onClick={() => setShowDetail(false)} className={cn("lg:hidden flex items-center gap-1.5 text-xs font-bold transition-colors", textMuted)}>
                <ChevronLeft className="w-4 h-4" /> Back to Queue
              </button>

              <div className={cn("flex flex-wrap gap-4 justify-between items-start border-b pb-5", isDark ? "border-white/5" : "border-zinc-100")}>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className={cn("text-xl font-bold tracking-tight", textPrimary)}>Verification Panel</h3>
                    <StatusBadge status={selected.status} isDark={isDark} />
                  </div>
                  <p className={cn("text-[11px] font-mono", textMuted)}>Ref: {selected._id||selected.id}</p>
                </div>
                <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border", SEV_BADGE[selected.severity as keyof typeof SEV_BADGE]||SEV_BADGE.low)}>SEV: {selected.severity}</span>
              </div>

              <div className={cn("p-4 rounded-lg border", innerBg)}>
                <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-3", textMuted)}>Workflow State</p>
                <PipelineTracker currentStatus={selected.status} />
              </div>

              <AnimatePresence>
                {apiError && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />{apiError}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className={cn("text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ml-1", textMuted)}>
                    <FileText className="w-3.5 h-3.5" /> Intelligence Details
                  </h4>
                  <div className={cn("p-4 rounded-lg border space-y-1.5", innerBg)}>
                    <p className={cn("text-[10px] font-bold uppercase tracking-wider", textMuted)}>Narrative</p>
                    <p className={cn("text-sm leading-relaxed", textMuted)}>{selected.description}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/10 space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Tactical Resolution</p>
                    <p className={cn("text-sm leading-relaxed", textMuted)}>"{selected.resolutionNotes}"</p>
                  </div>
                  {selected.analysisNotes && (
                    <div className={cn("p-4 rounded-lg border space-y-1.5", innerBg)}>
                      <p className={cn("text-[10px] font-bold uppercase tracking-wider", textMuted)}>Diagnostic Notes</p>
                      <p className={cn("text-sm leading-relaxed", textMuted)}>"{selected.analysisNotes}"</p>
                    </div>
                  )}

                  {selected.status === "resolved" && (
                    <div className={cn("space-y-4 pt-4 border-t", isDark ? "border-white/5" : "border-zinc-100")}>
                      <button onClick={() => handleVerify(selected)} disabled={verifying}
                        className="w-full py-2.5 rounded-md text-white font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 btn-accent"
                        style={{ background: 'var(--accent-primary)' }}>
                        {verifying
                          ? <span className="flex items-center gap-2"><div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />Verifying...</span>
                          : <><CheckCircle className="w-4 h-4" /> Verify & Auto-Draft Alert</>}
                      </button>
                      <div className={cn("space-y-2.5 pt-2 border-t", isDark ? "border-white/5" : "border-zinc-100")}>
                        <label className={cn("text-[10px] font-bold uppercase tracking-wider ml-1", textMuted)}>Escalate for Revision</label>
                        <textarea value={revisionNotes} onChange={e => setRevisionNotes(e.target.value)}
                          placeholder="If resolution is inadequate, note revision requirements..." rows={3}
                          className={cn("w-full border rounded-md p-3 text-xs focus:outline-none resize-none transition-colors", inputCls)} />
                        <button onClick={() => handleRequestRevision(selected)} disabled={!revisionNotes.trim()||requestingRevision}
                          className="w-full py-2 rounded-md text-amber-500/70 hover:text-amber-400 text-xs font-bold hover:bg-amber-500/10 transition-colors disabled:opacity-30 flex items-center justify-center gap-2">
                          <RotateCcw className="w-3 h-3" />{requestingRevision ? "Executing..." : "Return to Central Command"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {(selected.status === "verified" || selected.status === "broadcasted") ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                      <div className="flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
                        <p className={cn("text-[11px] font-bold uppercase tracking-wider", textMuted)}>Public Advisory Protocol</p>
                      </div>
                      <div className={cn("space-y-4 border p-4 rounded-lg", innerBg)}>
                        <div className="space-y-1.5">
                          <label className={cn("text-[10px] font-bold uppercase tracking-wider ml-1", textMuted)}>Advisory Headline</label>
                          <input type="text" value={alertData.title} onChange={e => setAlertData({...alertData, title: e.target.value})}
                            placeholder="e.g. Critical Phishing Campaign Active"
                            className={cn("w-full border rounded-md p-2.5 text-sm focus:outline-none transition-colors font-semibold", inputCls)} />
                        </div>
                        <div className="space-y-1.5">
                          <label className={cn("text-[10px] font-bold uppercase tracking-wider ml-1", textMuted)}>Public Overview</label>
                          <textarea value={alertData.message} onChange={e => setAlertData({...alertData, message: e.target.value})} rows={4}
                            className={cn("w-full border rounded-md p-3 text-sm focus:outline-none resize-none transition-colors leading-relaxed", inputCls)} />
                        </div>
                        <div className="space-y-1.5">
                          <label className={cn("text-[10px] font-bold uppercase tracking-wider ml-1", textMuted)}>Safety Protocols</label>
                          <textarea value={alertData.safetyInstructions} onChange={e => setAlertData({...alertData, safetyInstructions: e.target.value})} rows={4}
                            placeholder={"• Do not click suspicious links\n• Change passwords\n• Validate endpoints"}
                            className={cn("w-full border rounded-md p-3 text-sm focus:outline-none resize-none transition-colors leading-relaxed", inputCls)} />
                        </div>
                        {selected.status === "verified" && (
                          <button onClick={handleBroadcast} disabled={broadcasting||!alertData.title.trim()||!alertData.message.trim()}
                            className="w-full py-2.5 rounded-md bg-amber-600 text-white font-bold text-sm hover:bg-amber-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                            {broadcasting
                              ? <span className="flex items-center gap-2"><div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />Transmitting...</span>
                              : <><Send className="w-4 h-4" /> Issue Broadcast Notice</>}
                          </button>
                        )}
                        {selected.status === "broadcasted" && (
                          <div className={cn("p-3 rounded-md border border-emerald-500/20 flex items-center justify-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-[11px]", isDark ? "bg-zinc-900" : "bg-emerald-50")}>
                            <CheckCircle className="w-4 h-4" />Public Notice Active
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <div className={cn("h-full flex flex-col items-center justify-center p-8 border rounded-lg space-y-3 text-center", innerBg)}>
                      <div className={cn("w-12 h-12 rounded border flex items-center justify-center", isDark ? "bg-zinc-900 border-white/5 text-zinc-500" : "bg-zinc-100 border-zinc-200 text-zinc-400")}>
                        <Info className="w-5 h-5" />
                      </div>
                      <p className={cn("text-sm leading-relaxed", textMuted)}>Review the tactical resolution. Validate to generate drafted advisories.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className={cn("w-14 h-14 rounded border flex items-center justify-center", isDark ? "bg-zinc-950 border-white/5" : "bg-zinc-100 border-zinc-200")}>
                <Lock className={cn("w-6 h-6", textMuted)} />
              </div>
              <div>
                <h3 className={cn("text-base font-bold tracking-tight", textPrimary)}>Select a Record</h3>
                <p className={cn("text-sm mt-1", textMuted)}>Designate a ticket to review operational history.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
