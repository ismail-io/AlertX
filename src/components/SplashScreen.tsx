import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: Props) {
  const [phase, setPhase] = useState<'logo' | 'text' | 'bar' | 'exit'>('logo');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Phase timeline
    const t1 = setTimeout(() => setPhase('text'), 700);
    const t2 = setTimeout(() => setPhase('bar'),  1300);
    const t3 = setTimeout(() => setPhase('exit'), 3000);
    const t4 = setTimeout(() => onDone(),         3600);

    // Progress bar fill
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 6 + 2;
      if (p >= 100) { p = 100; clearInterval(interval); }
      setProgress(p);
    }, 60);

    return () => {
      clearTimeout(t1); clearTimeout(t2);
      clearTimeout(t3); clearTimeout(t4);
      clearInterval(interval);
    };
  }, [onDone]);

  return (
    <AnimatePresence>
      {phase !== 'exit' ? (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.55, ease: 'easeInOut' }}
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: '#0a0a0a' }}
        >
          {/* Animated radial glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 0.18, scale: 1.4 }}
            transition={{ duration: 1.8, ease: 'easeOut' }}
            className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, #ef4444 0%, transparent 70%)' }}
          />

          {/* Scan line sweep */}
          <motion.div
            initial={{ top: '-10%' }}
            animate={{ top: '110%' }}
            transition={{ duration: 2.5, ease: 'linear', repeat: Infinity }}
            className="absolute left-0 right-0 h-px pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.4), transparent)' }}
          />

          {/* Corner brackets */}
          {[
            'top-8 left-8 border-t-2 border-l-2',
            'top-8 right-8 border-t-2 border-r-2',
            'bottom-8 left-8 border-b-2 border-l-2',
            'bottom-8 right-8 border-b-2 border-r-2',
          ].map((cls, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.08, duration: 0.4 }}
              className={`absolute w-8 h-8 ${cls}`}
              style={{ borderColor: 'rgba(239,68,68,0.5)' }}
            />
          ))}

          {/* Main content */}
          <div className="relative z-10 flex flex-col items-center gap-6">

            {/* Logo */}
            <motion.div
              initial={{ scale: 0.4, opacity: 0, rotate: -15 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.1 }}
              className="relative"
            >
              {/* Outer ring pulse */}
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.3) 0%, transparent 70%)' }}
              />
              {/* Logo image */}
              <div
                className="w-28 h-28 rounded-2xl flex items-center justify-center relative overflow-hidden"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.3)' }}
              >
                <img src="/logo.svg" alt="AlertX" className="w-24 h-24 object-contain" />
                {/* Shimmer sweep */}
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '200%' }}
                  transition={{ duration: 1.2, delay: 0.6, ease: 'easeInOut' }}
                  className="absolute inset-0 w-1/2"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)', skewX: '-15deg' }}
                />
              </div>
            </motion.div>

            {/* Brand name */}
            <AnimatePresence>
              {(phase === 'text' || phase === 'bar') && (
                <motion.div
                  initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                  className="flex flex-col items-center gap-1"
                >
                  {/* Letter-by-letter animation */}
                  <div className="flex items-center text-4xl font-black tracking-widest">
                    {['A','l','e','r','t'].map((ch, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07, duration: 0.3 }}
                        className="text-white"
                      >
                        {ch}
                      </motion.span>
                    ))}
                    <motion.span
                      initial={{ opacity: 0, scale: 1.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4, duration: 0.35, type: 'spring', stiffness: 300 }}
                      style={{ color: '#ef4444' }}
                    >
                      X
                    </motion.span>
                  </div>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-[11px] font-bold uppercase tracking-[0.3em]"
                    style={{ color: 'rgba(239,68,68,0.7)' }}
                  >
                    Cyber Intelligence Platform
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Progress bar */}
            <AnimatePresence>
              {phase === 'bar' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center gap-2 w-56"
                >
                  {/* Bar track */}
                  <div className="w-full h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        width: `${progress}%`,
                        background: 'linear-gradient(90deg, #ef4444, #ff6666)',
                        boxShadow: '0 0 8px rgba(239,68,68,0.6)',
                        transition: 'width 0.1s ease',
                      }}
                    />
                  </div>

                  {/* Status text */}
                  <motion.p
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: 'rgba(239,68,68,0.6)' }}
                  >
                    {progress < 40 ? 'Initializing...' : progress < 75 ? 'Loading Systems...' : progress < 95 ? 'Securing Connection...' : 'Ready'}
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom credit */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-6 text-[10px] font-semibold uppercase tracking-widest text-zinc-500"
          >
            by A.MOHAMED ISMAIL
          </motion.p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
