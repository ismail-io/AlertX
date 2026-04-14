import React, { useEffect, useState, useMemo } from "react";
import { Bell, FileText, MapPin, Shield, ShieldCheck, Activity, AlertTriangle, Users, Clock, TrendingUp, Zap, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "../utils/cn";
import { useTheme } from "../context/ThemeContext";
import MatrixRain from "../components/MatrixRain";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { Link } from "react-router-dom";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const SEV = {
  critical: { color: "#ef4444", dot: "bg-red-500",    badge: "text-red-400 bg-red-500/10 border-red-500/20",    label: "Critical" },
  high:     { color: "#f59e0b", dot: "bg-amber-500",  badge: "text-amber-400 bg-amber-500/10 border-amber-500/20", label: "High" },
  medium:   { color: "#eab308", dot: "bg-yellow-500", badge: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", label: "Medium" },
  low:      { color: "#10b981", dot: "bg-emerald-500",badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",   label: "Low" },
};

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  pending:        { text: "Reported",         color: "text-zinc-400" },
  under_analysis: { text: "AI Analyzing",     color: "text-zinc-400" },
  resolved:       { text: "Defence Resolved", color: "text-zinc-300" },
  verified:       { text: "Police Verified",  color: "text-emerald-400" },
  broadcasted:    { text: "Alert Broadcast",  color: "text-amber-400" },
  rejected:       { text: "Rejected",         color: "text-red-400" },
};

const INDIA_COORDS: [number, number][] = [
  [77.2,28.6],[72.8,19.0],[80.2,13.0],[88.3,22.5],
  [78.4,17.4],[73.8,18.5],[76.9,11.0],[85.8,20.2],
  [75.8,26.9],[83.0,17.7],[77.6,12.9],[80.9,26.8],
];

interface Incident { _id?: string; id?: string; incidentType?: string; description?: string; status: string; severity?: string; location?: string; createdAt?: string; analysisNotes?: string; }
interface Alert { _id?: string; id?: string; title: string; message: string; severity: string; safetyInstructions?: string; location?: string; createdAt?: string; }

export default function Home() {
  const { theme } = useTheme();
  const isDark = theme.mode === 'dark';
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("feed");

  const fetchData = async () => {
    try {
      const [iRes, aRes] = await Promise.all([fetch("/api/reports/public"), fetch("/api/alerts")]);
      if (iRes.ok) { const d = await iRes.json(); setIncidents(d.reports || []); }
      if (aRes.ok) { const d = await aRes.json(); setAlerts(d.alerts || []); }
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const es = new EventSource("/api/events");
    es.addEventListener("report:new",     () => fetchData());
    es.addEventListener("report:updated", () => fetchData());
    es.addEventListener("alert:new",      () => fetchData());
    return () => es.close();
  }, []);

  const stats = useMemo(() => ({
    live:     incidents.filter(i => !["broadcasted","rejected"].includes(i.status)).length,
    resolved: incidents.filter(i => i.status === "broadcasted").length,
    critical: incidents.filter(i => i.severity === "critical").length,
    total:    incidents.length,
  }), [incidents]);

  const markers = useMemo(() =>
    incidents.filter(i => i.severity).slice(0, 12).map((i, idx) => ({
      id: i._id || i.id || idx.toString(),
      coordinates: INDIA_COORDS[idx % INDIA_COORDS.length],
      severity: i.severity || "low",
      type: i.incidentType,
    })),
  [incidents]);

  const cardBg = isDark ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-200';
  const cardHover = isDark ? 'hover:border-white/10' : 'hover:border-zinc-300';
  const heroBg = isDark ? 'bg-zinc-900/60 border-white/8' : 'bg-white border-zinc-200';
  const tabBg = isDark ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-200';
  const tabActive = isDark ? 'bg-zinc-800 text-white border-white/8' : 'bg-zinc-100 text-zinc-900 border-zinc-200';
  const tabInactive = isDark ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50';
  const textMuted = isDark ? 'text-zinc-400' : 'text-zinc-500';
  const textPrimary = isDark ? 'text-white' : 'text-zinc-900';

  return (
    <div className="space-y-8 pb-20 max-w-6xl mx-auto">
      {/* HERO */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={cn("relative rounded-xl border p-6 sm:p-10 shadow-sm overflow-hidden", heroBg)}
      >
        {/* Animated background glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {isDark && <MatrixRain opacity={0.12} color="var(--accent-primary)" />}
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.05, 0.1, 0.05] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl"
            style={{ background: 'var(--accent-primary)' }}
          />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
          <div className="space-y-5 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border"
              style={{ borderColor: 'var(--accent-primary)', background: 'rgba(239,68,68,0.08)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent-primary)' }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent-primary)' }}>Operations Active</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className={cn("text-4xl sm:text-5xl font-bold tracking-tight leading-tight", textPrimary)}
            >
              Alert<span style={{ color: 'var(--accent-primary)' }}>X</span> Intelligence &{' '}
              <br className="hidden sm:block" />
              <span className="gradient-text">Incident Hub</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={cn("text-sm sm:text-base max-w-lg leading-relaxed", textMuted)}
            >
              Real-time threat feeds, AI-augmented analysis, and verified broadcasts from active operational commands.
            </motion.p>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="pt-2">
              <Link to="/report"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-md text-white font-bold text-sm btn-accent"
                style={{ background: 'var(--accent-primary)' }}>
                <FileText className="w-4 h-4" /> Log Incident
                <ChevronRight className="w-4 h-4 ml-1 opacity-70" />
              </Link>
            </motion.div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 shrink-0 w-full md:w-auto">
            {[
              { label: "Active Operations", value: stats.live,     color: textPrimary,      bg: isDark ? "bg-zinc-800/50" : "bg-zinc-50", border: isDark ? "border-white/5" : "border-zinc-200" },
              { label: "Critical Priority", value: stats.critical, color: "text-red-400",   bg: "bg-red-500/5",     border: "border-red-500/15" },
              { label: "Resolved / Safe",   value: stats.resolved, color: "text-emerald-400", bg: "bg-emerald-500/5", border: "border-emerald-500/15" },
              { label: "Total Handled",     value: stats.total,    color: textMuted,         bg: isDark ? "bg-zinc-800/30" : "bg-zinc-50", border: isDark ? "border-white/5" : "border-zinc-200" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.07 }}
                className={cn("p-5 rounded-lg border flex flex-col justify-center min-w-[140px] card-hover", s.bg, s.border)}
              >
                <p className={cn("text-2xl font-bold tracking-tight", s.color)}>{s.value}</p>
                <p className={cn("text-[10px] uppercase tracking-wider mt-1", textMuted)}>{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* TABS */}
      <div className={cn("flex gap-1.5 p-1 rounded-lg border w-fit mx-auto sm:mx-0 shadow-sm", tabBg)}>
        {[{ key: "feed", label: "Live Feed", icon: Activity }, { key: "map", label: "Geospatial", icon: MapPin }, { key: "alerts", label: "Broadcasts", icon: Bell }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn("flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm transition-all font-semibold",
              activeTab === tab.key ? tabActive : tabInactive)}>
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* FEED */}
        {activeTab === "feed" && (
          <motion.div key="feed" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={cn("h-56 rounded-xl border animate-pulse", isDark ? "bg-zinc-900/50 border-white/5" : "bg-zinc-100 border-zinc-200")} />
            )) : incidents.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 space-y-4">
                <div className={cn("w-14 h-14 rounded-full flex items-center justify-center border", isDark ? "bg-zinc-900 border-white/5" : "bg-zinc-100 border-zinc-200")}>
                  <Shield className={cn("w-6 h-6", isDark ? "text-zinc-600" : "text-zinc-400")} />
                </div>
                <p className={cn("font-medium text-sm", textMuted)}>No operational incidents detected.</p>
                <Link to="/report" className={cn("px-5 py-2.5 rounded-md border text-sm font-semibold transition-colors", isDark ? "bg-zinc-800 border-white/5 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200")}>
                  Log New Incident
                </Link>
              </div>
            ) : incidents.map((inc, i) => {
              const sev = SEV[inc.severity as keyof typeof SEV] || SEV.low;
              const st  = STATUS_LABEL[inc.status] || STATUS_LABEL.pending;
              return (
                <motion.div key={inc._id || inc.id || i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn("group flex flex-col p-5 rounded-xl border transition-all shadow-sm space-y-4 relative overflow-hidden card-hover", cardBg, cardHover)}>
                  {/* Severity accent line */}
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: sev.color, opacity: 0.7 }} />

                  <div className="flex items-start justify-between gap-3 relative z-10">
                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border", sev.badge)}>
                      SEV: {sev.label}
                    </span>
                    <span className={cn("text-[10px] font-semibold uppercase tracking-wider", st.color)}>{st.text}</span>
                  </div>

                  {inc.incidentType && (
                    <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--accent-primary)' }}>
                      <Zap className="w-3.5 h-3.5" />
                      {inc.incidentType}
                    </div>
                  )}

                  <p className={cn("text-sm leading-relaxed line-clamp-3 flex-1", textMuted)}>{inc.description}</p>

                  {inc.analysisNotes && (
                    <div className={cn("p-3 rounded-md border", isDark ? "bg-zinc-950/50 border-white/5" : "bg-zinc-50 border-zinc-200")}>
                      <p className={cn("text-[10px] uppercase tracking-wider mb-1 font-bold", textMuted)}>System Audit</p>
                      <p className={cn("text-xs line-clamp-2 leading-relaxed", textMuted)}>{inc.analysisNotes}</p>
                    </div>
                  )}

                  <div className={cn("flex items-center justify-between pt-4 mt-auto border-t w-full relative z-10", isDark ? "border-white/5" : "border-zinc-100")}>
                    <div className={cn("flex items-center gap-1.5 text-[11px] font-medium", textMuted)}>
                      {inc.location && <><MapPin className="w-3.5 h-3.5" /><span className="truncate max-w-[120px]">{inc.location}</span></>}
                    </div>
                    <div className={cn("flex items-center gap-1.5 text-[11px] font-medium", textMuted)}>
                      <Clock className="w-3.5 h-3.5" />
                      {inc.createdAt ? formatDistanceToNow(new Date(inc.createdAt), { addSuffix: true }) : ""}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* MAP */}
        {activeTab === "map" && (
          <motion.div key="map" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className={cn("flex flex-wrap items-center gap-6 p-4 rounded-xl border shadow-sm", cardBg)}>
              <p className={cn("text-xs font-semibold", textMuted)}>Tactical Geography Map</p>
              <div className="h-4 w-px bg-white/10 hidden sm:block"></div>
              <div className="flex items-center gap-5 flex-wrap">
                {Object.entries(SEV).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", val.dot)} />
                    <span className={cn("text-xs", textMuted)}>{val.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={cn("relative rounded-xl overflow-hidden border shadow-inner", isDark ? "bg-zinc-950 border-white/5" : "bg-zinc-100 border-zinc-200")} style={{ height: "550px" }}>
              <ComposableMap projectionConfig={{ scale: 900, center: [82, 22] }} className="w-full h-full">
                <Geographies geography={geoUrl}>
                  {({ geographies }) => geographies.map(geo => (
                    <Geography key={geo.rsmKey} geography={geo}
                      fill={isDark ? "#18181b" : "#e4e4e7"}
                      stroke={isDark ? "#27272a" : "#d4d4d8"}
                      strokeWidth={0.5}
                      style={{ default: { outline: "none" }, hover: { fill: isDark ? "#27272a" : "#d4d4d8", outline: "none" }, pressed: { outline: "none" } }} />
                  ))}
                </Geographies>
                {markers.map(({ id, coordinates, severity }) => {
                  const s = SEV[severity as keyof typeof SEV] || SEV.low;
                  return (
                    <Marker key={id} coordinates={coordinates}>
                      <circle r={4} fill={s.color} fillOpacity={1} />
                      <circle r={12} fill={s.color} fillOpacity={0.2} />
                      <circle r={24} fill={s.color} fillOpacity={0.05} />
                    </Marker>
                  );
                })}
              </ComposableMap>

              <div className="absolute bottom-6 left-6 flex flex-col gap-2">
                {Object.entries(SEV).map(([key, val]) => {
                  const count = incidents.filter(i => i.severity === key).length;
                  if (!count) return null;
                  return (
                    <div key={key} className={cn("flex items-center gap-3 px-3 py-1.5 rounded-lg border shadow-sm", isDark ? "bg-zinc-900 border-white/10" : "bg-white border-zinc-200")}>
                      <span className={cn("w-2 h-2 rounded-full", val.dot)} />
                      <span className={cn("text-[11px] font-semibold uppercase tracking-wider", textMuted)}>{val.label}</span>
                      <span className={cn("text-xs font-bold ml-2", textPrimary)}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ALERTS */}
        {activeTab === "alerts" && (
          <motion.div key="alerts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className={cn("p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center gap-5 shadow-sm", cardBg)}>
              <div className="p-3 rounded-lg w-fit shrink-0" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <Bell className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
              </div>
              <div className="flex-1">
                <h3 className={cn("text-sm font-bold", textPrimary)}>Broadcast Advisories</h3>
                <p className={cn("text-xs mt-1", textMuted)}>Verified tactical information and public safety notices.</p>
              </div>
              <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-md border text-[11px] font-semibold", isDark ? "bg-zinc-800 border-white/5 text-zinc-300" : "bg-zinc-100 border-zinc-200 text-zinc-600")}>
                <Users className="w-3.5 h-3.5" /> Public Access
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-zinc-700/50 rounded-full animate-spin" style={{ borderTopColor: 'var(--accent-primary)' }} />
              </div>
            ) : alerts.length === 0 ? (
              <div className={cn("flex flex-col items-center justify-center py-20 px-4 space-y-4 rounded-xl border", cardBg)}>
                <div className={cn("w-14 h-14 rounded-full flex items-center justify-center border", isDark ? "bg-zinc-950 border-white/5" : "bg-zinc-100 border-zinc-200")}>
                  <Bell className={cn("w-6 h-6", isDark ? "text-zinc-600" : "text-zinc-400")} />
                </div>
                <p className={cn("font-medium text-sm", textMuted)}>No active advisories broadcasted.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {alerts.map((alert, i) => {
                  const sev = SEV[alert.severity as keyof typeof SEV] || SEV.low;
                  return (
                    <motion.div key={alert._id || alert.id || i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={cn("p-5 rounded-xl border shadow-sm transition-all space-y-4 card-hover relative overflow-hidden", cardBg, cardHover)}>
                      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: sev.color, opacity: 0.6 }} />
                      <div className="flex items-center justify-between gap-3">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border", sev.badge)}>
                          {sev.label}
                        </span>
                        <span className={cn("text-[10px] font-medium flex items-center gap-1.5", textMuted)}>
                          <Clock className="w-3 h-3" />
                          {alert.createdAt ? formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true }) : ""}
                        </span>
                      </div>
                      <h4 className={cn("text-base font-bold leading-snug", textPrimary)}>{alert.title}</h4>
                      <p className={cn("text-sm leading-relaxed", textMuted)}>{alert.message}</p>

                      {alert.safetyInstructions && (
                        <div className={cn("p-4 rounded-lg border space-y-2 mt-2", isDark ? "bg-zinc-950/50 border-white/5" : "bg-zinc-50 border-zinc-200")}>
                          <p className={cn("text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5", textMuted)}>
                            <Shield className="w-3.5 h-3.5" /> Actionable Protocol
                          </p>
                          <div className={cn("text-sm leading-relaxed space-y-1", textMuted)}>
                            {alert.safetyInstructions.split('\n').map((line, idx) => {
                              if (!line.trim()) return null;
                              return (
                                <p key={idx} className="flex items-start gap-2">
                                  {line.trim().startsWith('•') ? '' : <span className="mt-0.5 opacity-40">•</span>}
                                  <span>{line.replace(/^•\s*/, '')}</span>
                                </p>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className={cn("flex items-center gap-2 pt-4 border-t text-[11px] font-semibold mt-4", isDark ? "border-white/5" : "border-zinc-100")}>
                        <div className="flex items-center gap-1.5 text-emerald-500">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verified Notice</span>
                        </div>
                        {alert.location && (
                          <>
                            <span className="opacity-20 mx-2">|</span>
                            <div className={cn("flex items-center gap-1.5", textMuted)}>
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{alert.location}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}