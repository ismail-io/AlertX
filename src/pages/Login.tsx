import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { Lock, Mail, Eye, EyeOff, User, ChevronRight, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils/cn';

type Portal = 'public' | 'defence' | 'police';
type Mode = 'login' | 'register';

const PORTALS = [
  { key: 'public'  as Portal, label: 'Public Portal',  icon: '🌐', desc: 'Report cyber incidents & view public alerts' },
  { key: 'defence' as Portal, label: 'Defence Portal', icon: '🛡️', desc: 'AI analysis & threat resolution — Level 4 clearance' },
  { key: 'police'  as Portal, label: 'Police Portal',  icon: '⚖️', desc: 'Verify resolutions & broadcast public alerts' },
];

export default function Login() {
  const { login, register } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/';
  const isDark = theme.mode === 'dark';

  const [portal, setPortal]     = useState<Portal | null>(null);
  const [mode, setMode]         = useState<Mode>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const selectedPortal = PORTALS.find(p => p.key === portal);

  const getRedirect = (role: string) => {
    if (role === 'defence') return '/defence';
    if (role === 'police')  return '/police';
    return from === '/login' ? '/' : from;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portal) return;
    setLoading(true);
    setError(null);
    try {
      let user;
      if (mode === 'register') {
        if (!name.trim()) { setError('Display name is required'); setLoading(false); return; }
        user = await register(email, password, name, portal);
      } else {
        user = await login(email, password);
      }
      if (portal !== 'public' && user.role !== portal) {
        setError(`Access denied. This account has "${user.role}" clearance. The ${portal} portal requires "${portal}" clearance.`);
        setLoading(false);
        return;
      }
      navigate(getRedirect(user.role), { replace: true });
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const cardBg = isDark ? 'bg-[#111111] border-white/8' : 'bg-white border-zinc-200';
  const inputBg = isDark ? 'bg-[#0a0a0a] border-white/10 text-zinc-200' : 'bg-zinc-50 border-zinc-300 text-zinc-900';
  const labelColor = isDark ? 'text-zinc-400' : 'text-zinc-500';
  const headingColor = isDark ? 'text-white' : 'text-zinc-900';
  const portalBg = isDark ? 'bg-white/4 border-white/8 hover:bg-white/8 hover:border-white/15' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300';

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 relative">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--accent-primary)' }} />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Logo */}
        <div className="text-center space-y-3">
          <motion.div
            initial={{ scale: 0.7, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto shadow-xl overflow-hidden bg-zinc-900 border border-white/10"
          >
            <img src="/logo.svg" alt="AlertX" className="w-16 h-16 object-contain" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cn('text-3xl font-bold tracking-tight', headingColor)}
          >
            Alert<span style={{ color: 'var(--accent-primary)' }}>X</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={cn('text-sm font-medium', labelColor)}
          >
            {portal ? `${selectedPortal?.label} Access` : 'Select your access portal'}
          </motion.p>
        </div>

        <AnimatePresence mode="wait">
          {!portal ? (
            <motion.div key="portals" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className="space-y-3">
              {PORTALS.map((p, i) => (
                <motion.button
                  key={p.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => setPortal(p.key)}
                  className={cn('w-full p-5 rounded-2xl border text-left flex items-center gap-5 transition-all outline-none', portalBg)}
                >
                  <div className={cn('text-2xl w-10 h-10 flex items-center justify-center rounded-xl border', isDark ? 'bg-white/5 border-white/5' : 'bg-zinc-100 border-zinc-200')}>
                    {p.icon}
                  </div>
                  <div className="flex-1">
                    <p className={cn('text-[14px] font-semibold tracking-wide', headingColor)}>{p.label}</p>
                    <p className={cn('text-xs mt-1', labelColor)}>{p.desc}</p>
                  </div>
                  <ChevronRight className={cn('w-5 h-5 opacity-40', headingColor)} />
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className={cn('border rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden', cardBg)}>

              {/* Top accent bar */}
              <div className="absolute top-0 inset-x-0 h-0.5" style={{ background: 'var(--accent-primary)' }} />

              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold tracking-wide"
                  style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', background: 'rgba(239,68,68,0.08)' }}>
                  <span>{selectedPortal?.icon}</span>{selectedPortal?.label}
                </div>
                <button onClick={() => { setPortal(null); setError(null); }}
                  className={cn('text-xs font-medium transition-colors', labelColor, 'hover:text-zinc-200')}>
                  ← Change Portal
                </button>
              </div>

              <div className={cn('flex p-1 rounded-xl border mb-6', isDark ? 'bg-white/5 border-white/5' : 'bg-zinc-100 border-zinc-200')}>
                {(['login', 'register'] as Mode[]).map(m => (
                  <button key={m} onClick={() => { setMode(m); setError(null); }}
                    className={cn('flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
                      mode === m
                        ? 'text-white'
                        : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700'
                    )}
                    style={mode === m ? { background: 'var(--accent-primary)' } : {}}>
                    {m === 'login' ? 'Sign In' : 'Create Account'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div className="space-y-1.5">
                    <label className={cn('text-xs font-semibold ml-1', labelColor)}>Full Name</label>
                    <div className="relative">
                      <User className={cn('absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4', labelColor)} />
                      <input type="text" value={name} onChange={e => setName(e.target.value)}
                        placeholder="e.g. John Doe" required
                        className={cn('w-full border rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none transition-all', inputBg)} />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className={cn('text-xs font-semibold ml-1', labelColor)}>Email Address</label>
                  <div className="relative">
                    <Mail className={cn('absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4', labelColor)} />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="name@organization.com" required
                      className={cn('w-full border rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none transition-all', inputBg)} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className={cn('text-xs font-semibold ml-1', labelColor)}>Password</label>
                  <div className="relative">
                    <Lock className={cn('absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4', labelColor)} />
                    <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" required minLength={6}
                      className={cn('w-full border rounded-xl py-3 pl-10 pr-10 text-sm focus:outline-none transition-all', inputBg)} />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className={cn('absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors outline-none', labelColor, 'hover:text-zinc-200')}>
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2 btn-accent"
                  style={{ background: 'var(--accent-primary)' }}
                >
                  {loading
                    ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    : mode === 'login' ? 'Sign In to Portal' : 'Create Secure Account'}
                </motion.button>
              </form>

              {(portal === 'defence' || portal === 'police') && (
                <div className={cn('mt-6 p-4 rounded-xl border space-y-2', isDark ? 'border-white/5 bg-[#0a0a0a]' : 'border-zinc-200 bg-zinc-50')}>
                  <div className={cn('flex items-center gap-2 text-xs font-semibold', labelColor)}>
                    <Shield className="w-3.5 h-3.5" /> Clearance Notice
                  </div>
                  <p className={cn('text-xs leading-relaxed', labelColor)}>
                    Restricted portal. Unauthorized access attempts are logged. Ensure you have{' '}
                    <span className="font-bold" style={{ color: 'var(--accent-primary)' }}>{portal}</span> clearance.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
