import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { Shield, Clock, ArrowRight, Activity, Filter } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '../utils/cn';
import { motion } from 'motion/react';

interface AuditLog {
  _id: string;
  reportId: string;
  actorUid: string;
  actorRole: string;
  fromStatus: string;
  toStatus: string;
  notes?: string;
  createdAt: string;
}

const STATUS_COLOR: Record<string, string> = {
  pending:        'text-zinc-400 bg-zinc-800/50 border-white/5',
  under_analysis: 'text-zinc-300 bg-zinc-800 border-white/10',
  resolved:       'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  verified:       'text-zinc-300 bg-zinc-800 border-white/10',
  broadcasted:    'text-amber-500 bg-amber-500/10 border-amber-500/20',
  rejected:       'text-red-400 bg-red-500/10 border-red-500/20',
};

const ROLE_COLOR: Record<string, string> = {
  defence: 'text-zinc-300 font-semibold',
  police:  'text-zinc-300 font-semibold',
  public:  'text-zinc-400 font-medium',
};

export default function AuditTrail() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const isDark = theme.mode === 'dark';

  const cardBg    = isDark ? 'bg-zinc-900 border-white/5'  : 'bg-white border-zinc-200';
  const rowBg     = isDark ? 'bg-zinc-900 border-white/5 hover:bg-zinc-800/80 hover:border-white/10' : 'bg-white border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300';
  const innerBg   = isDark ? 'bg-zinc-950 border-white/5'  : 'bg-zinc-50 border-zinc-200';
  const textMuted   = isDark ? 'text-zinc-400' : 'text-zinc-500';
  const textPrimary = isDark ? 'text-white'    : 'text-zinc-900';

  const [logs, setLogs]             = useState<AuditLog[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filterRole, setFilterRole] = useState('all');

  const fetchLogs = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/audit/all', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLogs();
    const es = new EventSource('/api/events');
    es.addEventListener('report:updated', fetchLogs as any);
    es.addEventListener('report:new', fetchLogs as any);
    return () => es.close();
  }, [fetchLogs]);

  const filtered = filterRole === 'all' ? logs : logs.filter(l => l.actorRole === filterRole);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-primary)' }} />
            <span className={cn("text-[10px] font-bold uppercase tracking-wider", textMuted)}>System Logs</span>
          </div>
          <h1 className={cn("text-3xl font-bold tracking-tight", textPrimary)}>
            Audit <span className={cn("font-light", textMuted)}>Trail</span>
          </h1>
          <p className={cn("text-sm mt-1.5 font-medium", textMuted)}>Complete pipeline transition history — every system action logged.</p>
        </div>
        <div className="flex items-center gap-3">
          <Filter className={cn("w-4 h-4", textMuted)} />
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
            className={cn("border rounded-lg px-4 py-2 text-sm focus:outline-none font-semibold transition-colors shadow-sm cursor-pointer", isDark ? "bg-zinc-900 border-white/10 text-zinc-300" : "bg-white border-zinc-200 text-zinc-700")}>
            <option value="all">All Actors</option>
            <option value="defence">Defence Command</option>
            <option value="police">Police Command</option>
            <option value="public">Public Domain</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        {[
          { label: 'Total Events',      value: logs.length,                                        color: textPrimary },
          { label: 'Defence Audits',    value: logs.filter(l => l.actorRole === 'defence').length, color: textMuted },
          { label: 'Police Checks',     value: logs.filter(l => l.actorRole === 'police').length,  color: 'text-emerald-500' },
          { label: 'Broadcasts Issued', value: logs.filter(l => l.toStatus === 'broadcasted').length, color: 'text-amber-500' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className={cn("p-5 rounded-xl border text-center shadow-sm relative overflow-hidden card-hover", cardBg)}>
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'var(--accent-primary)', opacity: 0.4 }} />
            <p className={cn("text-3xl font-bold tracking-tight", s.color)}>{s.value}</p>
            <p className={cn("text-[10px] font-bold uppercase tracking-wider mt-1.5", textMuted)}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Log list */}
      <div className={cn("space-y-3 border rounded-xl p-4 min-h-[400px]", innerBg)}>
        {loading ? (
          <div className="flex justify-center flex-col items-center py-20 space-y-4">
            <div className="w-8 h-8 border-2 border-zinc-700/50 rounded-full animate-spin" style={{ borderTopColor: 'var(--accent-primary)' }} />
            <p className={cn("text-sm font-semibold", textMuted)}>Retrieving secure logs...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={cn("text-center py-20 border border-dashed rounded-lg m-2", isDark ? "border-white/10 bg-zinc-900" : "border-zinc-200 bg-zinc-50")}>
            <Activity className={cn("w-10 h-10 mx-auto mb-4", textMuted)} />
            <p className={cn("text-sm font-semibold", textMuted)}>No operational history found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((log, i) => (
              <motion.div key={log._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                className={cn("flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg border transition-all shadow-sm", rowBg)}>

                {/* Timestamp */}
                <div className="sm:w-36 shrink-0 space-y-0.5">
                  <p className={cn("text-xs font-bold", textPrimary)}>
                    {log.createdAt ? format(new Date(log.createdAt), 'dd MMM HH:mm:ss') : '—'}
                  </p>
                  <p className={cn("text-[10px] font-medium", textMuted)}>
                    {log.createdAt ? formatDistanceToNow(new Date(log.createdAt), { addSuffix: true }) : ''}
                  </p>
                </div>

                {/* Flow */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className={cn("text-[11px] uppercase tracking-wider shrink-0 px-2 py-0.5 rounded border font-bold",
                    isDark ? "bg-zinc-950 border-white/5" : "bg-zinc-100 border-zinc-200",
                    ROLE_COLOR[log.actorRole] || textMuted)}>
                    {log.actorRole}
                  </span>

                  <div className="h-4 w-px hidden sm:block mx-1" style={{ background: 'var(--border-subtle)' }} />

                  <div className="flex items-center gap-2 max-w-[50%] shrink-0 overflow-hidden">
                    <span className={cn("px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border whitespace-nowrap", STATUS_COLOR[log.fromStatus] || STATUS_COLOR.pending)}>
                      {log.fromStatus || 'started'}
                    </span>
                    <ArrowRight className={cn("w-3.5 h-3.5 shrink-0", textMuted)} />
                    <span className={cn("px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border whitespace-nowrap", STATUS_COLOR[log.toStatus] || STATUS_COLOR.pending)}>
                      {log.toStatus}
                    </span>
                  </div>

                  {log.notes && (
                    <p className={cn("text-xs font-medium truncate ml-2 hidden lg:block italic", textMuted)}>"{log.notes}"</p>
                  )}
                </div>

                {log.notes && (
                  <p className={cn("text-xs font-medium lg:hidden italic mt-2 sm:mt-0", textMuted)}>"{log.notes}"</p>
                )}

                <div className="shrink-0 hidden sm:flex items-center justify-end w-24">
                  <p className={cn("text-[10px] font-mono px-2 py-1 rounded-md border", isDark ? "text-zinc-500 bg-zinc-950 border-white/5" : "text-zinc-400 bg-zinc-100 border-zinc-200")}>
                    {log.reportId?.slice(-8)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
