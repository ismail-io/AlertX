import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Shield, Bell, FileText, LayoutDashboard,
  LogOut, Menu, X, ClipboardList, Settings
} from 'lucide-react';
import AIChatbot from './AIChatbot';
import SettingsPanel from './SettingsPanel';
import AnimatedBrand from './AnimatedBrand';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'motion/react';

const NAV_ITEMS = [
  { label: 'Feed',    path: '/',        icon: Bell,          roles: ['public', 'defence', 'police', null] },
  { label: 'Report',  path: '/report',  icon: FileText,      roles: ['public', null] },
  { label: 'Defence', path: '/defence', icon: Shield,        roles: ['defence'] },
  { label: 'Police',  path: '/police',  icon: LayoutDashboard, roles: ['police'] },
  { label: 'Audit',   path: '/audit',   icon: ClipboardList, roles: ['defence', 'police'] },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const isDark = theme.mode === 'dark';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = NAV_ITEMS.filter(item =>
    item.roles.includes(profile?.role ?? null)
  );

  const navBg = isDark
    ? 'bg-zinc-950/90 border-white/5'
    : 'bg-white/90 border-zinc-200';
  const brandText = isDark ? 'text-white' : 'text-zinc-900';
  const navLinkActive = isDark
    ? 'bg-zinc-800 text-white border-white/8'
    : 'bg-zinc-100 text-zinc-900 border-zinc-200';
  const navLinkInactive = isDark
    ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100';
  const footerBg = isDark ? 'bg-zinc-950 border-white/5' : 'bg-white border-zinc-200';
  const mainBg = isDark ? 'bg-zinc-950' : 'bg-zinc-50';

  return (
    <div className={cn('min-h-screen font-sans flex flex-col', mainBg)} style={{ color: 'var(--text-primary)' }}>
      {/* Navbar */}
      <nav className={cn('sticky top-0 z-50 border-b backdrop-blur-md transition-all', navBg)}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 items-center">

            {/* Brand */}
            <Link to="/" className="flex items-center gap-2 group shrink-0">
              <motion.div
                whileHover={{ scale: 1.08, rotate: 3 }}
                transition={{ type: 'spring', stiffness: 400 }}
                className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-zinc-900 border border-white/10"
              >
                <img src="/logo.svg" alt="AlertX" className="w-7 h-7 object-contain" />
              </motion.div>
              <AnimatedBrand className="text-base" />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-2 lg:gap-5">
              <div className="flex items-center gap-1">
                {navItems.map(item => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link key={item.path} to={item.path}
                      className={cn(
                        'relative flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                        isActive ? navLinkActive : navLinkInactive
                      )}>
                      {isActive && (
                        <motion.span
                          layoutId="nav-pill"
                          className="absolute inset-0 rounded-md"
                          style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                      <item.icon className="w-4 h-4 relative z-10" />
                      <span className="relative z-10">{item.label}</span>
                      {isActive && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full nav-active-dot" />
                      )}
                    </Link>
                  );
                })}
              </div>

              <div className={cn('flex items-center gap-3 pl-4 ml-1 border-l', isDark ? 'border-white/10' : 'border-zinc-200')}>
                {profile ? (
                  <>
                    <div className="flex flex-col items-end leading-tight">
                      <span className={cn('text-sm font-semibold', brandText)}>{profile.displayName}</span>
                      <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--accent-primary)' }}>
                        {profile.role}
                      </span>
                    </div>
                    <button
                      onClick={() => setSettingsOpen(true)}
                      className={cn('p-1.5 rounded-lg transition-colors', isDark ? 'hover:bg-white/10 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900')}
                      aria-label="Settings"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button onClick={handleSignOut}
                      className="p-1.5 rounded-lg hover:bg-red-500/15 hover:text-red-400 transition-colors text-zinc-400"
                      aria-label="Sign out">
                      <LogOut className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSettingsOpen(true)}
                      className={cn('p-1.5 rounded-lg transition-colors', isDark ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500')}
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <Link to="/login"
                      className="px-4 py-1.5 rounded-md text-white font-semibold text-sm transition-all btn-accent"
                      style={{ background: 'var(--accent-primary)' }}>
                      Sign In
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Toggle */}
            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={() => setSettingsOpen(true)}
                className={cn('p-1.5 rounded-lg transition-colors', isDark ? 'text-zinc-400' : 'text-zinc-500')}
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                className={cn('p-1.5 rounded transition-colors', isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900')}
                onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Nav Drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={cn('md:hidden border-b overflow-hidden', isDark ? 'bg-zinc-950 border-white/10' : 'bg-white border-zinc-200')}
          >
            <div className="p-4 space-y-1">
              {navItems.map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path} onClick={() => setMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg transition-colors',
                      isActive
                        ? isDark ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-900'
                        : isDark ? 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                    )}>
                    <item.icon className="w-4 h-4" />
                    <span className="font-medium text-sm">{item.label}</span>
                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full nav-active-dot" />}
                  </Link>
                );
              })}

              {profile ? (
                <div className={cn('mt-4 pt-4 border-t', isDark ? 'border-white/10' : 'border-zinc-200')}>
                  <div className="px-3 pb-3">
                    <p className={cn('text-sm font-semibold', brandText)}>{profile.displayName}</p>
                    <p className="text-[10px] uppercase tracking-wider mt-0.5 font-medium" style={{ color: 'var(--accent-primary)' }}>{profile.role}</p>
                  </div>
                  <button onClick={handleSignOut}
                    className="w-full flex items-center gap-3 p-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                    <LogOut className="w-4 h-4" />
                    <span className="font-medium text-sm">Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className={cn('mt-4 pt-4 border-t', isDark ? 'border-white/10' : 'border-zinc-200')}>
                  <Link to="/login" onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-center w-full p-3 rounded-lg text-white font-semibold text-sm btn-accent"
                    style={{ background: 'var(--accent-primary)' }}>
                    Sign In
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </main>

      <footer className={cn('relative border-t py-6 mt-auto', footerBg)}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center gap-2">
          <div className="flex items-center gap-2 opacity-60">
            <img src="/logo.svg" alt="AlertX" className="w-4 h-4 object-contain" />
            <AnimatedBrand className="text-sm" />
          </div>
          <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} Security Intelligence Network
          </p>
        </div>
      </footer>

      <AIChatbot />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
