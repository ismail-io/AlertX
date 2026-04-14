import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const PHRASES = ['AlertX', 'Cyber Intel', 'Threat Hub', 'AlertX'];

interface Props {
  className?: string;
}

export default function AnimatedBrand({ className = '' }: Props) {
  const [index, setIndex] = useState(0);
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Stay on first phrase (AlertX) for 3s, then cycle through others
    const timeout = setTimeout(() => {
      setShow(false);
      setTimeout(() => {
        setIndex(prev => (prev + 1) % PHRASES.length);
        setShow(true);
      }, 300);
    }, index === 0 ? 3000 : 2000);
    return () => clearTimeout(timeout);
  }, [index, show]);

  const text = PHRASES[index];
  const isAlertX = text === 'AlertX';

  return (
    <span className={`inline-flex items-center font-bold tracking-tight ${className}`}>
      <AnimatePresence mode="wait">
        {show && (
          <motion.span
            key={text}
            initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="inline-flex"
          >
            {isAlertX ? (
              <>
                <span>Alert</span>
                <span style={{ color: 'var(--accent-primary)' }}>X</span>
              </>
            ) : (
              <span style={{ color: 'var(--accent-primary)' }}>{text}</span>
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
