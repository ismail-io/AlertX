import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Shield, Upload, MapPin, Send, CheckCircle, AlertCircle, X, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils/cn';
import PipelineTracker from '../components/PipelineTracker';
import { Link } from 'react-router-dom';

const INCIDENT_TYPES = [
  'Phishing', 'Malware', 'Ransomware', 'DDoS',
  'Identity Theft', 'Social Engineering', 'Data Breach',
  'Cyber Stalking', 'Financial Fraud', 'Other',
];

export default function Report() {
  const { profile, token } = useAuth();
  const [incidentType, setIncidentType] = useState('Phishing');
  const [description, setDescription]   = useState('');
  const [location, setLocation]         = useState('');
  const [file, setFile]                 = useState<File | null>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [submittedId, setSubmittedId]   = useState<string | null>(null);
  const [reportStatus, setReportStatus] = useState('pending');

  useEffect(() => {
    if (!submittedId || !token) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/pipeline/${submittedId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setReportStatus(data.currentStatus);
          if (data.currentStatus === 'broadcasted') clearInterval(interval);
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [submittedId, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) { setError('Please describe the incident.'); return; }
    if (!token) { setError('You must be logged in to submit a report.'); return; }
    setLoading(true);
    setError(null);
    try {
      let fileUrl = '';
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (upRes.ok) {
          const upData = await upRes.json();
          fileUrl = upData.url;
        }
      }

      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ incidentType, description, location, fileUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      setSubmittedId(data.reportId);
      setReportStatus('pending');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submittedId) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 px-4">
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
          className="p-8 rounded-xl bg-zinc-900 border border-white/10 shadow-sm relative overflow-hidden space-y-8">
          
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight text-white">
                Log Submitted Successfully
              </h2>
              <p className="text-xs text-zinc-500 font-mono">Reference ID: {submittedId}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-zinc-400">Pipeline Status</p>
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Tracking Active
              </span>
            </div>
            <div className="p-5 rounded-lg bg-zinc-950 border border-white/5">
              <PipelineTracker currentStatus={reportStatus} />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-white/5">
            {[
              { done: ['under_analysis','resolved','verified','broadcasted'].includes(reportStatus), active: reportStatus === 'pending', text: 'Command receives intelligence log' },
              { done: ['resolved','verified','broadcasted'].includes(reportStatus), active: reportStatus === 'under_analysis', text: 'Automated threat classification active' },
              { done: ['verified','broadcasted'].includes(reportStatus), active: reportStatus === 'resolved', text: 'Tactical mitigation reviewed' },
              { done: reportStatus === 'broadcasted', active: reportStatus === 'verified', text: 'Law enforcement cross-verification' },
              { done: false, active: reportStatus === 'broadcasted', text: 'Actionable advisory broadcast' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={cn('w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors',
                  item.done ? 'bg-emerald-500 border-emerald-500 text-white' :
                  item.active ? 'bg-zinc-800 border-white/20' :
                  'bg-zinc-900 border-white/5')}>
                  {item.done && <CheckCircle className="w-2.5 h-2.5 text-white" />}
                  {item.active && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                </div>
                <p className={cn('text-sm transition-colors', 
                  item.done ? 'text-zinc-500' : item.active ? 'text-zinc-100 font-medium' : 'text-zinc-600')}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-6 mt-4 border-t border-white/5">
            <button onClick={() => { setSubmittedId(null); setDescription(''); setLocation(''); setFile(null); setIncidentType('Phishing'); }}
              className="flex-1 py-2.5 rounded-md border border-white/10 text-white text-sm font-medium hover:bg-white/5 transition-colors">
              Log Another Incident
            </button>
            <Link to="/" className="flex-1 py-2.5 rounded-md bg-white text-zinc-950 text-sm font-medium hover:bg-zinc-200 transition-colors text-center flex items-center justify-center">
              Return to Feed
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 px-4">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Log Incident <span className="font-light text-zinc-400">Report</span>
        </h1>
        <p className="text-zinc-400 text-sm leading-relaxed max-w-xl">
          Submit verified details of anomalous or malicious activity. All logs are securely directed to standard command analysis pipelines.
        </p>
      </header>

      <div className="p-4 rounded-xl bg-zinc-900 border border-white/5 space-y-3 shadow-sm">
        <p className="text-xs font-medium text-zinc-500">Workflow Visualization</p>
        <PipelineTracker currentStatus="pending" compact />
      </div>

      {!profile && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm font-medium flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>Authentication required. Please <Link to="/login" className="underline hover:text-amber-400">sign in</Link> to log an incident.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-zinc-900 border border-white/5 p-6 sm:p-8 rounded-xl space-y-6 shadow-sm">
        
        <div className="space-y-3">
          <label className="text-xs font-semibold text-zinc-300">Classification</label>
          <div className="flex flex-wrap gap-2">
            {INCIDENT_TYPES.map(type => (
              <button key={type} type="button" onClick={() => setIncidentType(type)}
                className={cn('px-3 py-1.5 rounded-md text-xs font-medium border transition-colors outline-none',
                  incidentType === type ? 'bg-zinc-100 text-zinc-900 border-zinc-100' : 'bg-zinc-950 text-zinc-400 border-white/10 hover:border-white/20 hover:text-zinc-200')}>
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
            Tactical Description <span className="text-red-500">*</span>
          </label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Detailed narrative of observed events, systems impacted, and potential threat vectors..."
            rows={5} className="w-full bg-zinc-950 border border-white/10 rounded-lg p-4 text-zinc-200 text-sm focus:outline-none focus:border-white/30 transition-colors resize-none" />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300">Geospatial / Network Location <span className="text-zinc-500 font-normal">(optional)</span></label>
          <div className="relative">
            <Navigation className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
              placeholder="Physical coordinates, IP Range, or System Node Name"
              className="w-full bg-zinc-950 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-zinc-200 text-sm focus:outline-none focus:border-white/30 transition-colors" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300">Evidence Attachments <span className="text-zinc-500 font-normal">(image / video)</span></label>
          <div className="relative group">
            <input type="file" accept="image/*,video/*" onChange={e => setFile(e.target.files?.[0] || null)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
            <div className={cn('w-full border rounded-lg p-4 flex items-center gap-3 transition-colors',
              file ? 'bg-zinc-800 border-white/20 text-white' : 'bg-zinc-950 border-white/10 text-zinc-500 hover:border-white/20')}>
              <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center shrink-0 border border-white/5">
                <Upload className="w-4 h-4 text-zinc-400" />
              </div>
              <span className="text-sm font-medium truncate flex-1">{file ? file.name : 'Select structured data or artifacts to attach'}</span>
              
              {file && (
                <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }}
                  className="z-20 relative p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </motion.div>
          )}
        </AnimatePresence>

        <button type="submit" disabled={loading || !profile}
          className="w-full py-3 rounded-lg bg-zinc-100 text-zinc-900 font-semibold text-sm hover:bg-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? <div className="w-4 h-4 border-2 border-zinc-900/20 border-t-zinc-900 rounded-full animate-spin" /> : 
          <><Send className="w-4 h-4" /> Finalize and Submit</>}
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        {[
          { icon: Shield, label: 'Encrypted Transit', desc: 'Enterprise-grade JWT secured routing.' }, 
          { icon: CheckCircle, label: 'Automated Triaging', desc: 'Real-time structural threat analysis.' }, 
          { icon: Send, label: 'Direct Integration', desc: 'Immediate intelligence insertion.' }
        ].map((item, i) => (
          <div key={i} className="p-4 rounded-xl bg-zinc-900 border border-white/5 flex flex-col gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 border border-white/5">
              <item.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-zinc-200 mb-0.5">{item.label}</p>
              <p className="text-[11px] text-zinc-500 leading-tight">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
