import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'dark' | 'light';
export type AccentColor = 'red' | 'blue' | 'emerald' | 'violet' | 'amber' | 'cyan';

export interface ThemeConfig {
  mode: ThemeMode;
  accent: AccentColor;
}

interface ThemeContextType {
  theme: ThemeConfig;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentColor) => void;
}

const ACCENT_MAP: Record<AccentColor, { primary: string; light: string; border: string; text: string; bg: string }> = {
  red:     { primary: '#ef4444', light: '#fca5a5', border: 'border-red-500/30',     text: 'text-red-400',     bg: 'bg-red-500/10' },
  blue:    { primary: '#3b82f6', light: '#93c5fd', border: 'border-blue-500/30',    text: 'text-blue-400',    bg: 'bg-blue-500/10' },
  emerald: { primary: '#10b981', light: '#6ee7b7', border: 'border-emerald-500/30', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  violet:  { primary: '#8b5cf6', light: '#c4b5fd', border: 'border-violet-500/30',  text: 'text-violet-400',  bg: 'bg-violet-500/10' },
  amber:   { primary: '#f59e0b', light: '#fcd34d', border: 'border-amber-500/30',   text: 'text-amber-400',   bg: 'bg-amber-500/10' },
  cyan:    { primary: '#06b6d4', light: '#67e8f9', border: 'border-cyan-500/30',    text: 'text-cyan-400',    bg: 'bg-cyan-500/10' },
};

export { ACCENT_MAP };

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'alertx_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { mode: 'dark', accent: 'red' };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme.mode);
    const accent = ACCENT_MAP[theme.accent];
    root.style.setProperty('--accent-primary', accent.primary);
    root.style.setProperty('--accent-light', accent.light);
  }, [theme]);

  const setMode = (mode: ThemeMode) => setTheme(prev => ({ ...prev, mode }));
  const setAccent = (accent: AccentColor) => setTheme(prev => ({ ...prev, accent }));

  return (
    <ThemeContext.Provider value={{ theme, setMode, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
