import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext";
import { Shield, CheckCircle, Activity, FileText, ChevronLeft, AlertTriangle, Brain, Lock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "../utils/cn";
import PipelineTracker from "../components/PipelineTracker";
import { motion, AnimatePresence } from "motion/react";

const STATUS_PRIORITY = { pending: 0, under_analysis: 1, resolved: 2, rejected: 3 };
const SEV_DOT = { critical: "bg-red-500", high: "bg-amber-500", medium: "bg-yellow-500", low: "bg-emerald-500" };
const SEV_BADGE = {
  critical: "text-red-400 border-red-500/20 bg-red-500/10",
  high:     "text-amber-400 border-amber-500/20 bg-amber-500/10",
  medium:   "text-yellow-400 border-yellow-500/20 bg-yellow-500/10",
  low:      "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
};

function StatusBadge({ status, isDark }: { status: string; isDark: boolean }) {
  const styles: Record<string, string> = {
    pending:        isDark ? "bg-zinc-800/50 text-zinc-400 border-white/5"   : "bg-zinc-100 text-zinc-500 border-zinc-200",
    under_analysis: isDark ? "bg-zinc-800 text-zinc-300 border-white/10 animate-pulse" : "bg-zinc-200 text-zinc-600 border-zinc-300 animate-pulse",
    resolved:       "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    rejected:       "bg-red-500/10 text-red-400 border-red-500/20",
  };
  const labels: Record<string, string> = { pending: "Pending", under_analysis: "AI Analyzing", resolved: "Resolved", rejected: "Rejected" };
  return <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border", styles[status] || styles.pending)}>{labels[status] || status}</span>;
}

export default function DefenceDashboard() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const isDark = theme.mode === 'dark';

  const cardBg   = isDark ? 'bg-zinc-900 border-white/5'  : 'bg-white border-zinc-200';
  const innerBg  = isDark ? 'bg-zinc-950 border-white/5'  : 'bg-zinc-50 border-zinc-200';
  const inputCls = isDark ? 'bg-zinc-900 border-white/10 text-zinc-200' : 'bg-white border-zinc-200 text-zinc-800';
  const textMuted   = isDark ? 'text-zinc-400' : 'text-zinc-500';
  const textPrimary = isDark ? 'text-white'    : 'text-zinc-900';

  const [reports, setReports]             = useState<any[]>([]);
  const [selected, setSelected]           = useState<any>(null);
  const [loading, setLoading]             = useState(true);
  const [analyzing, setAnalyzing]         = useState(false);
  const [resolving, setResolving]         = useState(false);
  const [rejecting, setRejecting]         = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [rejectReason, setRejectReason]   = useState("");
  const [showDetail, setShowDetail]       = useState(false);
  const [apiError, setApiError]           = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    if (!token) return;
    try {
      const [r1, r2, r3] = await Promise.all([
        fetch("/api/reports?status=pending&limit=100",        { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/reports?status=under_analysis&limit=100", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/reports?status=resolved&limit=100",       { headers: { Authorization: `Bearer ${token}` } }),
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
    es.addEventListener("report:new",     fetchReports as any);
    es.addEventListener("report:updated", fetchReports as any);
    return () => es.close();
  }, [fetchReports]);

  const apiCall = async (path: string, body: any) => {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  };

  const selectReport  = (r: any) => { setSelected(r); setResolutionNotes(""); setRejectReason(""); setApiError(null); setShowDetail(true); };
  const handleAnalyze = async (report: any) => { setAnalyzing(true); setApiError(null); try { await apiCall("/api/analyze", { reportId: report._id||report.id }); await fetchReports(); } catch (e: any) { setApiError(e.message); } finally { setAnalyzing(false); } };
  const handleResolve = async () => { if (!selected || !resolutionNotes.trim()) return; setResolving(true); setApiError(null); try { await apiCall("/api/resolve", { reportId: selected._id||selected.id, resolutionNotes }); setSelected(null); setShowDetail(false); await fetchReports(); } catch (e: any) { setApiError(e.message); } finally { setResolving(false); } };
  const handleReject  = async (report: any) => { setRejecting(true); setApiError(null); try { await apiCall("/api/reject", { reportId: report._id||report.id, reason: rejectReason||"False alarm" }); setSelected(null); setShowDetail(false); await fetchReports(); } catch (e: any) { setApiError(e.message); } finally { setRejecting(false); } };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent-primary)' }} />
            <span className={cn("text-[10px] font-bold uppercase tracking-wider", textMuted)}>Defence Operations</span>
          </div>
          <h1 className={cn("text-3xl font-bold tracking-tight", textPrimary)}>
            Central <span className={cn("font-light", textMuted)}>Command</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {[
            { label: "Pending",   count: reports.filter(r=>r.status==="pending").length,        color: textPrimary },
            { label: "Analyzing", count: reports.filter(r=>r.status==="under_analysis").length, color: textMuted },
            { label: "Resolved",  count: reports.filter(r=>r.status==="resolved").length,       color: "text-emerald-400" },
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
                    <Activity className={cn("w-8 h-8 mx-auto", textMuted)} />
                    <p className={cn("text-sm", textMuted)}>No active threats in queue.</p>
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
                    {r.severity && (
                      <div className="flex items-center gap-2">
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", SEV_DOT[r.severity as keyof typeof SEV_DOT])} />
                        <span className={cn("text-[10px] uppercase font-bold tracking-wider truncate", textMuted)}>{r.threatType||"Classifying..."} · {r.severity}</span>
                      </div>
                    )}
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
                    <h3 className={cn("text-xl font-bold tracking-tight", textPrimary)}>Intelligence Log</h3>
                    <StatusBadge status={selected.status} isDark={isDark} />
                  </div>
                  <p className={cn("text-[11px] font-mono", textMuted)}>Ref: {selected._id||selected.id}</p>
                </div>
                {selected.severity && <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border", SEV_BADGE[selected.severity as keyof typeof SEV_BADGE])}>SEV: {selected.severity}</span>}
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
                  <div className="space-y-2">
                    <h4 className={cn("text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ml-1", textMuted)}>
                      <FileText className="w-3.5 h-3.5" /> Narrative Details
                    </h4>
                    <div className={cn("p-4 rounded-lg border text-sm leading-relaxed", innerBg, textMuted)}>{selected.description}</div>
                  </div>
                  {selected.location && (
                    <div className={cn("p-4 rounded-lg border", innerBg)}>
                      <p className={cn("text-[10px] font-bold uppercase tracking-wider", textMuted)}>Node Location</p>
                      <p className={cn("text-sm mt-1", textMuted)}>{selected.location}</p>
                    </div>
                  )}
                  {selected.fileUrl && (
                    <a href={selected.fileUrl} target="_blank" rel="noreferrer"
                      className={cn("block p-3 rounded-md border text-xs font-bold hover:opacity-80 transition-opacity text-center", isDark ? "bg-zinc-800 border-white/10 text-zinc-300" : "bg-zinc-100 border-zinc-200 text-zinc-700")}>
                      Review Artifacts ↗
                    </a>
                  )}
                </div>

                <div className="space-y-4">
                  {selected.status === "pending" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className={cn("flex flex-col items-center justify-center p-6 border rounded-lg space-y-5 text-center", innerBg)}>
                      <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mb-1 border", isDark ? "bg-zinc-800 border-white/5 text-zinc-400" : "bg-zinc-100 border-zinc-200 text-zinc-500")}>
                        <Brain className="w-6 h-6" />
                      </div>
                      <div>
                        <p className={cn("text-[10px] font-bold uppercase tracking-wider", textMuted)}>Analysis Required</p>
                        <h4 className={cn("font-bold text-base mt-1", textPrimary)}>Automated Triage</h4>
                        <p className={cn("text-xs mt-1.5 max-w-[200px] mx-auto leading-relaxed", textMuted)}>Engage diagnostic routines to classify tactical indicators.</p>
                      </div>
                      <button onClick={() => handleAnalyze(selected)} disabled={analyzing}
                        className="w-full py-2.5 rounded-md text-white font-bold text-sm transition-all disabled:opacity-50 btn-accent"
                        style={{ background: 'var(--accent-primary)' }}>
                        {analyzing
                          ? <span className="flex items-center justify-center gap-2"><div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />Processing...</span>
                          : "Initialize Assessment"}
                      </button>
                      <div className={cn("w-full pt-4 border-t space-y-2 mt-2", isDark ? "border-white/5" : "border-zinc-100")}>
                        <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                          placeholder="Documentation for dismissal (optional)"
                          className={cn("w-full border rounded-md px-3 py-2 text-xs focus:outline-none transition-colors", inputCls)} />
                        <button onClick={() => handleReject(selected)} disabled={rejecting}
                          className={cn("w-full py-2 rounded-md text-xs font-bold hover:bg-red-500/10 transition-colors disabled:opacity-40", isDark ? "text-zinc-500 hover:text-red-400" : "text-zinc-400 hover:text-red-500")}>
                          {rejecting ? "Executing..." : "Dismiss as Non-Threat"}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {(selected.status === "under_analysis" || selected.status === "resolved") && (
                    <div className="space-y-4">
                      <div className={cn("p-4 rounded-lg border space-y-3", innerBg)}>
                        <div className="flex items-center gap-1.5">
                          <Brain className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
                          <p className={cn("text-[10px] font-bold uppercase tracking-wider", textMuted)}>Diagnostic Summary</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={cn("text-sm font-bold pr-4", textPrimary)}>{selected.threatType||"Processing..."}</span>
                          {selected.confidenceScore !== undefined && (
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded", isDark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-200 text-zinc-600")}>{selected.confidenceScore}% conf.</span>
                          )}
                        </div>
                        {selected.analysisNotes && <p className={cn("text-sm leading-relaxed", textMuted)}>"{selected.analysisNotes}"</p>}
                        {selected.suggestedMitigation && (
                          <div className={cn("pt-3 border-t", isDark ? "border-white/5" : "border-zinc-100")}>
                            <p className={cn("text-[10px] font-bold uppercase tracking-wider", textMuted)}>Recommended Protocols</p>
                            <p className={cn("text-xs leading-relaxed mt-1.5", textMuted)}>{selected.suggestedMitigation}</p>
                          </div>
                        )}
                      </div>

                      {selected.status === "under_analysis" && (
                        <div className={cn("space-y-3 p-4 rounded-lg border border-emerald-500/15", innerBg)}>
                          <div className="flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-emerald-500" />
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Tactical Resolution</p>
                          </div>
                          <textarea value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)}
                            placeholder="Detail strict measures executed to neutralize..." rows={3}
                            className={cn("w-full border rounded-md p-3 text-sm focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/40 transition-colors resize-none", inputCls)} />
                          <button onClick={handleResolve} disabled={resolving||!resolutionNotes.trim()}
                            className="w-full py-2.5 rounded-md bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500 transition-colors disabled:opacity-50">
                            {resolving ? "Executing..." : "Confirm & Escalate to Law Enforcement"}
                          </button>
                        </div>
                      )}

                      {selected.status === "resolved" && (
                        <div className={cn("p-4 rounded-lg border space-y-3", innerBg)}>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Operation Concluded</p>
                          </div>
                          <p className={cn("text-sm leading-relaxed", textMuted)}>"{selected.resolutionNotes}"</p>
                          <p className={cn("text-[10px] font-bold uppercase tracking-wider pt-2 border-t", textMuted, isDark ? "border-white/5" : "border-zinc-100")}>⏳ Pending Verification</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className={cn("w-14 h-14 rounded-full border flex items-center justify-center", isDark ? "bg-zinc-950 border-white/5" : "bg-zinc-100 border-zinc-200")}>
                <Lock className={cn("w-6 h-6", textMuted)} />
              </div>
              <div>
                <h3 className={cn("text-base font-bold tracking-tight", textPrimary)}>Select a Log</h3>
                <p className={cn("text-sm mt-1", textMuted)}>Review items to designate actionable responses.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
