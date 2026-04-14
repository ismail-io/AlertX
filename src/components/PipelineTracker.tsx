import React from 'react';
import { FileText, Zap, Shield, CheckCircle, Bell, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../utils/cn';

export const PIPELINE_STAGES = [
  { key: 'pending',        label: 'Triage',         icon: FileText,    },
  { key: 'under_analysis', label: 'Analysis',       icon: Zap,         },
  { key: 'resolved',       label: 'Defence',        icon: Shield,      },
  { key: 'verified',       label: 'Verified',       icon: CheckCircle, },
  { key: 'broadcasted',    label: 'Broadcast',      icon: Bell,        },
  { key: 'public',         label: 'Public',         icon: Users,       },
] as const;

const STAGE_INDEX: Record<string, number> = {
  pending: 0,
  under_analysis: 1,
  resolved: 2,
  verified: 3,
  broadcasted: 4,
  rejected: -1,
};

interface Props {
  currentStatus: string;
  compact?: boolean;
}

export default function PipelineTracker({ currentStatus, compact = false }: Props) {
  const activeIdx = STAGE_INDEX[currentStatus] ?? 0;
  const isRejected = currentStatus === 'rejected';

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {PIPELINE_STAGES.slice(0, 5).map((stage, i) => (
          <motion.div
            key={stage.key}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className={cn(
              'h-1.5 rounded-sm flex-1 origin-left',
              isRejected
                ? 'bg-red-500/50'
                : i < activeIdx
                  ? 'bg-zinc-500'
                  : i === activeIdx
                    ? 'bg-[var(--accent-primary)]'
                    : 'bg-zinc-900'
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Desktop: horizontal */}
      <div className="hidden sm:flex items-center w-full">
        {PIPELINE_STAGES.map((stage, i) => {
          const isDone    = !isRejected && i < activeIdx;
          const isActive  = !isRejected && i === activeIdx;

          return (
            <React.Fragment key={stage.key}>
              <div className="flex flex-col items-center gap-2 flex-shrink-0 z-10 w-[72px]">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.06 }}
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center transition-all relative border',
                    isRejected && i <= activeIdx
                      ? 'bg-red-500/10 border-red-500/30 text-red-400'
                      : isDone
                        ? 'bg-zinc-800 border-white/15 text-zinc-300'
                        : isActive
                          ? 'border text-white'
                          : 'bg-zinc-950 border-white/5 text-zinc-600'
                  )}
                  style={isActive ? {
                    background: 'rgba(239,68,68,0.12)',
                    borderColor: 'var(--accent-primary)',
                    color: 'var(--accent-primary)',
                    boxShadow: '0 0 12px var(--shadow-glow)',
                  } : {}}
                >
                  <stage.icon className={cn('w-4 h-4', isActive && 'animate-pulse')} />
                </motion.div>
                <span className={cn(
                  'text-[10px] font-semibold tracking-wide text-center leading-tight whitespace-nowrap',
                  isDone ? 'text-zinc-400' : isActive ? 'text-white' : 'text-zinc-600'
                )}
                  style={isActive ? { color: 'var(--accent-primary)' } : {}}>
                  {stage.label}
                </span>
              </div>
              {i < PIPELINE_STAGES.length - 1 && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: i * 0.06 + 0.1, duration: 0.4 }}
                  className={cn('flex-1 h-0.5 mx-1 mb-6 origin-left transition-colors',
                    isDone ? 'bg-zinc-600' : 'bg-white/5'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Mobile: vertical */}
      <div className="flex sm:hidden flex-col gap-0 ml-2">
        {PIPELINE_STAGES.map((stage, i) => {
          const isDone   = !isRejected && i < activeIdx;
          const isActive = !isRejected && i === activeIdx;

          return (
            <div key={stage.key} className="flex items-start gap-3 h-14">
              <div className="flex flex-col items-center h-full">
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all z-10 relative border',
                    isDone
                      ? 'bg-zinc-800 border-white/15 text-zinc-300'
                      : isActive
                        ? 'text-white'
                        : 'bg-zinc-950 border-white/5 text-zinc-600'
                  )}
                  style={isActive ? {
                    background: 'rgba(239,68,68,0.12)',
                    borderColor: 'var(--accent-primary)',
                    color: 'var(--accent-primary)',
                  } : {}}
                >
                  <stage.icon className="w-3.5 h-3.5" />
                </div>
                {i < PIPELINE_STAGES.length - 1 && (
                  <div className={cn('w-px flex-1 mt-1 -mb-1', isDone ? 'bg-zinc-600' : 'bg-white/5')} />
                )}
              </div>
              <div className="pt-1 flex-1">
                <span
                  className={cn('text-[11px] font-semibold tracking-wide block',
                    isDone ? 'text-zinc-400' : isActive ? 'text-white' : 'text-zinc-600'
                  )}
                  style={isActive ? { color: 'var(--accent-primary)' } : {}}
                >
                  {stage.label}
                </span>
                {isActive && (
                  <span className="text-[9px] text-zinc-500 font-medium">Current Phase</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isRejected && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-400 font-semibold tracking-wide mt-4 text-center bg-red-500/10 py-2.5 rounded-md border border-red-500/20"
        >
          Dismissed as Non-Threat
        </motion.p>
      )}
    </div>
  );
}
