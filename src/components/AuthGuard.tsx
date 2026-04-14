import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { ShieldOff, LogOut, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../utils/cn';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: ('public' | 'defence' | 'police')[];
}

const ROLE_LABELS: Record<string, { label: string; portal: string }> = {
  defence: { label: 'Defence Command', portal: 'Defence Portal' },
  police:  { label: 'Police Command',  portal: 'Police Portal'  },
  public:  { label: 'Public Domain',   portal: 'Public Portal'  },
};

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { profile, loading, signOut } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();
  const isDark = theme.mode === 'dark';

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-700/50 rounded-full animate-spin"
          style={{ borderTopColor: 'var(--accent-primary)' }} />
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    const required    = allowedRoles[0];
    const reqInfo     = ROLE_LABELS[required]      || { label: required,      portal: required };
    const currentInfo = ROLE_LABELS[profile.role]  || { label: profile.role,  portal: profile.role };

    const cardBg    = isDark ? 'bg-zinc-900 border-white/5'   : 'bg-white border-zinc-200';
    const rowBg     = isDark ? 'bg-zinc-950 border-white/5'   : 'bg-zinc-50 border-zinc-200';
    const textMuted = isDark ? 'text-zinc-400' : 'text-zinc-500';
    const heading   = isDark ? 'text-white'    : 'text-zinc-900';

    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          className="w-full max-w-md space-y-6 text-center"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0.7, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
            className="w-16 h-16 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto"
          >
            <ShieldOff className="w-8 h-8 text-red-500" />
          </motion.div>

          {/* Message */}
          <div className="space-y-1.5">
            <h2 className={cn('text-2xl font-bold tracking-tight', heading)}>
              Access <span className="text-red-500 font-light">Denied</span>
            </h2>
            <p className={cn('text-sm leading-relaxed', textMuted)}>
              You do not have clearance to access this portal.
            </p>
          </div>

          {/* Role info */}
          <div className={cn('p-5 rounded-xl border space-y-3 text-left', cardBg)}>
            <div className={cn('flex items-center justify-between p-3 rounded-lg border', rowBg)}>
              <span className={cn('text-[10px] font-bold uppercase tracking-wider', textMuted)}>Your Clearance</span>
              <span className="text-xs font-bold tracking-wide" style={{ color: 'var(--accent-primary)' }}>
                {currentInfo.label}
              </span>
            </div>
            <div className={cn('flex items-center justify-between p-3 rounded-lg border', rowBg)}>
              <span className={cn('text-[10px] font-bold uppercase tracking-wider', textMuted)}>Required</span>
              <span className={cn('text-xs font-bold tracking-wide text-emerald-400')}>
                {reqInfo.label}
              </span>
            </div>
            <p className={cn('text-xs leading-relaxed pt-1', textMuted)}>
              The <span className="font-bold text-emerald-400">{reqInfo.portal}</span> is restricted to authorized personnel. Contact your system administrator to request access.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Link to="/"
              className={cn('flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold transition-colors',
                isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              )}>
              <ArrowLeft className="w-4 h-4" />
              Return to Active Intel
            </Link>
            <button
              onClick={async () => { await signOut(); }}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-red-500/20 text-red-400 text-sm font-semibold hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Terminate Session
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
