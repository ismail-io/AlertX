import React, { useState } from 'react';
import { X, Sun, Moon, User, Save, Palette, Check, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme, AccentColor, ACCENT_MAP } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../utils/cn';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

const ACCENT_OPTIONS: { key: AccentColor; label: string; hex: string }[] = [
  { key: 'red',     label: 'Crimson',  hex: '#ef4444' },
  { key: 'blue',    label: 'Sapphire', hex: '#3b82f6' },
  { key: 'emerald', label: 'Emerald',  hex: '#10b981' },
  { key: 'violet',  label: 'Violet',   hex: '#8b5cf6' },
  { key: 'amber',   label: 'Amber',    hex: '#f59e0b' },
  { key: 'cyan',    label: 'Cyan',     hex: '#06b6d4' },
];

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { theme, setMode, setAccent } = useTheme();
  const { profile, token } = useAuth();
  const isDark = theme.mode === 'dark';

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveProfile = async () => {
    if (!displayName.trim() || !token) return;
    setSaving(true);
    setSaveError(null);
    try {
      // Update local storage profile display name
      const userKey = 'alerthub_user';
      const saved = localStorage.getItem(userKey);
      if (saved) {
        const user = JSON.parse(saved);
        user.displayName = displayName.trim();
        localStorage.setItem(userKey, JSON.stringify(user));
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const panelBg = isDark ? 'bg-zinc-950 border-white/10' : 'bg-white border-zinc-200';
  const sectionBg = isDark ? 'bg-zinc-900 border-white/5' : 'bg-zinc-50 border-zinc-200';
  const inputBg = isDark ? 'bg-zinc-800 border-white/10 text-zinc-100' : 'bg-white border-zinc-300 text-zinc-900';
  const labelColor = isDark ? 'text-zinc-400' : 'text-zinc-500';
  const headingColor = isDark ? 'text-white' : 'text-zinc-900';
  const subColor = isDark ? 'text-zinc-500' : 'text-zinc-400';

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={cn('fixed right-0 top-0 h-full w-full max-w-sm z-[101] border-l shadow-2xl flex flex-col overflow-hidden', panelBg)}
          >
            {/* Header */}
            <div className={cn('flex items-center justify-between px-6 py-5 border-b', isDark ? 'border-white/5' : 'border-zinc-200')}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-zinc-900 border border-white/10 flex items-center justify-center">
                  <img src="/logo.svg" alt="AlertX" className="w-7 h-7 object-contain" />
                </div>
                <div>
                  <h2 className={cn('text-sm font-bold tracking-tight', headingColor)}>Settings</h2>
                  <p className={cn('text-[10px] uppercase tracking-wider font-medium', subColor)}>AlertX Configuration</p>
                </div>
              </div>
              <button onClick={onClose} className={cn('p-1.5 rounded-lg transition-colors', isDark ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500')}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

              {/* Profile */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
                  <h3 className={cn('text-xs font-bold uppercase tracking-wider', labelColor)}>Edit Profile</h3>
                </div>
                <div className={cn('p-4 rounded-xl border space-y-4', sectionBg)}>
                  {profile ? (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                          style={{ background: 'var(--accent-primary)' }}>
                          {(displayName || profile.displayName).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className={cn('text-sm font-semibold', headingColor)}>{profile.displayName}</p>
                          <p className={cn('text-[10px] uppercase tracking-wider font-medium', subColor)}>{profile.role} · {profile.email}</p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className={cn('text-[10px] font-semibold uppercase tracking-wider', labelColor)}>Display Name</label>
                        <input
                          value={displayName}
                          onChange={e => setDisplayName(e.target.value)}
                          className={cn('w-full rounded-lg px-3 py-2.5 text-sm border focus:outline-none transition-colors', inputBg)}
                          style={{ '--tw-ring-color': 'var(--accent-primary)' } as any}
                        />
                      </div>

                      {saveError && <p className="text-xs text-red-400">{saveError}</p>}

                      <button
                        onClick={handleSaveProfile}
                        disabled={saving || !displayName.trim()}
                        className="w-full py-2.5 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        style={{ background: 'var(--accent-primary)' }}
                      >
                        {saved ? <><Check className="w-4 h-4" /> Saved!</> : saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                      </button>
                    </>
                  ) : (
                    <p className={cn('text-sm text-center py-4', subColor)}>Sign in to edit your profile.</p>
                  )}
                </div>
              </section>

              {/* Appearance */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
                  <h3 className={cn('text-xs font-bold uppercase tracking-wider', labelColor)}>Appearance</h3>
                </div>

                {/* Dark / Light toggle */}
                <div className={cn('p-4 rounded-xl border space-y-3', sectionBg)}>
                  <p className={cn('text-[10px] font-semibold uppercase tracking-wider', labelColor)}>Color Mode</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { mode: 'dark' as const, icon: Moon, label: 'Dark' },
                      { mode: 'light' as const, icon: Sun, label: 'Light' },
                    ]).map(({ mode, icon: Icon, label }) => (
                      <button
                        key={mode}
                        onClick={() => setMode(mode)}
                        className={cn(
                          'flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-semibold transition-all',
                          theme.mode === mode
                            ? 'text-white border-transparent'
                            : isDark
                              ? 'bg-zinc-800 border-white/5 text-zinc-400 hover:text-zinc-200'
                              : 'bg-white border-zinc-200 text-zinc-500 hover:text-zinc-700'
                        )}
                        style={theme.mode === mode ? { background: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' } : {}}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accent color */}
                <div className={cn('p-4 rounded-xl border space-y-3', sectionBg)}>
                  <p className={cn('text-[10px] font-semibold uppercase tracking-wider', labelColor)}>Template Color</p>
                  <div className="grid grid-cols-3 gap-2">
                    {ACCENT_OPTIONS.map(({ key, label, hex }) => (
                      <button
                        key={key}
                        onClick={() => setAccent(key)}
                        className={cn(
                          'flex flex-col items-center gap-2 py-3 px-2 rounded-xl border transition-all',
                          theme.accent === key
                            ? isDark ? 'border-white/30 bg-white/5' : 'border-zinc-400 bg-zinc-100'
                            : isDark ? 'border-white/5 hover:border-white/15 bg-zinc-800/50' : 'border-zinc-200 hover:border-zinc-300 bg-white'
                        )}
                      >
                        <div className="relative w-7 h-7 rounded-full flex items-center justify-center" style={{ background: hex }}>
                          {theme.accent === key && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className={cn('text-[10px] font-semibold', headingColor)}>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* About */}
              <section className={cn('p-4 rounded-xl border text-center space-y-1', sectionBg)}>
                <div className="flex items-center justify-center gap-2">
                  <img src="/logo.svg" alt="AlertX" className="w-5 h-5 object-contain" />
                  <span className={cn('text-sm font-bold', headingColor)}>AlertX</span>
                </div>
                <p className={cn('text-[10px] uppercase tracking-wider font-medium', subColor)}>v2.0 · Security Intelligence Platform</p>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
