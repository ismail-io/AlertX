import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils/cn';

interface Message {
  role: 'user' | 'bot';
  text: string;
  time: string;
}

const QUICK_REPLIES = [
  'Who created AlertX?',
  'What is AlertX?',
  'How do I report a phishing attack?',
  'How to stay safe online?',
];

const BOT_RESPONSES: Record<string, string> = {
  creator:    '👨‍💻 AlertX was created by A.MOHAMED ISMAIL — a passionate developer building next-gen cyber intelligence platforms.',
  alertx:     '⚡ AlertX is a real-time cyber threat intelligence platform. It uses AI to analyze incidents, routes them through a defence-police pipeline, and broadcasts verified public safety alerts.',
  phishing:   '🎣 Phishing attacks trick you into revealing credentials via fake emails/sites. Never click suspicious links. Report immediately via the Report Incident page.',
  ransomware: '🔒 Ransomware encrypts your files and demands payment. Disconnect from network immediately, do NOT pay, and report to AlertX for defence response.',
  malware:    '🦠 Malware is malicious software. Run antivirus, disconnect from internet, and submit a report with any suspicious file details.',
  ddos:       '⚡ DDoS floods your system with traffic. Contact your ISP and report the attack with source IPs if available.',
  safe:       '🛡️ Stay safe: Use strong unique passwords, enable 2FA, keep software updated, avoid public WiFi for sensitive tasks, and verify all communications.',
  report:     '📋 After you submit a report: 1) AI classifies the threat, 2) Defence team analyzes it, 3) Police verify, 4) Public alert is broadcast if needed. You can track status live.',
  pipeline:   '🔄 The AlertX pipeline has 5 stages: Pending → Under Analysis (AI) → Resolved (Defence) → Verified (Police) → Broadcasted (Public Alert).',
  default:    '🤖 I\'m AlertX AI Assistant, created by A.MOHAMED ISMAIL. I can help with cyber safety tips, incident reporting, and threat information. What would you like to know?',
};

function getBotResponse(input: string): string {
  const lower = input.toLowerCase();
  // Creator / author questions
  if (lower.includes('who') && (lower.includes('creat') || lower.includes('made') || lower.includes('built') || lower.includes('develop') || lower.includes('author') || lower.includes('owner')))
    return BOT_RESPONSES.creator;
  if (lower.includes('creat') || lower.includes('made by') || lower.includes('built by') || lower.includes('developer') || lower.includes('author'))
    return BOT_RESPONSES.creator;
  if (lower.includes('a.mohamed') || lower.includes('mohamed') || lower.includes('ismail'))
    return BOT_RESPONSES.creator;
  // AlertX info
  if (lower.includes('alertx') || lower.includes('alert x') || lower.includes('what is this') || lower.includes('about this'))
    return BOT_RESPONSES.alertx;
  // Pipeline
  if (lower.includes('pipeline') || lower.includes('stage') || lower.includes('workflow') || lower.includes('process'))
    return BOT_RESPONSES.pipeline;
  // Threats
  if (lower.includes('phish')) return BOT_RESPONSES.phishing;
  if (lower.includes('ransom')) return BOT_RESPONSES.ransomware;
  if (lower.includes('malware') || lower.includes('virus')) return BOT_RESPONSES.malware;
  if (lower.includes('ddos') || lower.includes('attack')) return BOT_RESPONSES.ddos;
  if (lower.includes('safe') || lower.includes('protect') || lower.includes('password')) return BOT_RESPONSES.safe;
  if (lower.includes('report') || lower.includes('after') || lower.includes('happen')) return BOT_RESPONSES.report;
  return BOT_RESPONSES.default;
}

export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: '👋 Hello! I\'m AlertX AI. How can I help you stay cyber-safe today?', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
  ]);
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role: 'user', text, time }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages(prev => [...prev, { role: 'bot', text: getBotResponse(text), time }]);
    }, 900 + Math.random() * 600);
  };

  return (
    <>
      {/* Trigger button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => { setOpen(true); setMinimized(false); }}
        className={cn(
          'fixed bottom-8 right-8 z-[90] w-12 h-12 rounded-full text-white flex items-center justify-center shadow-lg accent-glow',
          open && 'hidden'
        )}
        style={{ background: 'var(--accent-primary)' }}
        aria-label="Open AI chatbot"
      >
        <MessageCircle className="w-5 h-5" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-8 right-8 z-[90] w-80 sm:w-96 rounded-xl bg-zinc-950 border border-white/10 shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: minimized ? 'auto' : '520px' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-zinc-900">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <Bot className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-white">AlertX AI</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[9px] text-zinc-400 font-medium uppercase tracking-wider">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setMinimized(!minimized)} className="p-1 text-zinc-500 hover:text-white transition-colors">
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button onClick={() => setOpen(false)} className="p-1 text-zinc-500 hover:text-red-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!minimized && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" style={{ minHeight: '280px' }}>
                  {messages.map((msg, i) => (
                    <div key={i} className={cn('flex gap-2.5', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                      <div className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                        msg.role === 'bot' ? 'bg-zinc-800 border border-white/5' : 'bg-zinc-800 border border-white/5'
                      )}
                        style={msg.role === 'bot' ? { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' } : {}}>
                        {msg.role === 'bot'
                          ? <Bot className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
                          : <User className="w-3.5 h-3.5 text-zinc-400" />}
                      </div>
                      <div className={cn('max-w-[75%] space-y-1', msg.role === 'user' ? 'items-end' : 'items-start')}>
                        <div className={cn(
                          'px-3.5 py-2 rounded-lg text-sm leading-relaxed',
                          msg.role === 'bot'
                            ? 'bg-zinc-900 border border-white/5 text-zinc-300 rounded-tl-none'
                            : 'text-white rounded-tr-none'
                        )}
                          style={msg.role === 'user' ? { background: 'var(--accent-primary)' } : {}}>
                          {msg.text}
                        </div>
                        <p className="text-[10px] text-zinc-500 px-1">{msg.time}</p>
                      </div>
                    </div>
                  ))}
                  {typing && (
                    <div className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <Bot className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
                      </div>
                      <div className="bg-zinc-900 border border-white/5 px-4 py-3 rounded-lg rounded-tl-none flex items-center gap-1">
                        {[0, 1, 2].map(i => (
                          <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                            style={{ background: 'var(--accent-primary)', animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Quick replies */}
                <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                  {QUICK_REPLIES.map(q => (
                    <button key={q} onClick={() => send(q)}
                      className="px-2.5 py-1 rounded bg-zinc-900 text-zinc-400 text-[10px] font-semibold tracking-wide hover:bg-zinc-800 hover:text-zinc-200 transition-colors border border-white/5">
                      {q.length > 22 ? q.slice(0, 22) + '…' : q}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <div className="p-3 border-t border-white/5 bg-zinc-900/50 flex gap-2">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && send(input)}
                    placeholder="Ask about cyber safety..."
                    className="flex-1 bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none placeholder:text-zinc-600 transition-colors"
                  />
                  <button onClick={() => send(input)} disabled={!input.trim()}
                    className="w-10 h-10 shrink-0 rounded-lg text-white flex items-center justify-center transition-colors disabled:opacity-40 btn-accent"
                    style={{ background: 'var(--accent-primary)' }}>
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
