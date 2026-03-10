"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Bot, User, ShieldCheck, Landmark,
  ArrowRight, Search, FileText, CheckCircle,
  ChevronRight, Zap, ArrowLeft, RefreshCw,
  TrendingUp, MapPin, IndianRupee, Sparkles,
  RotateCcw
} from 'lucide-react';


// ─── Types ────────────────────────────────────────────────────────────────────
type Message = { role: string; content: string; failed?: boolean };

// ─── Quick Start Prompts ──────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { label: "✅ Check my eligibility", message: "I want to check which government schemes I am eligible for. Please ask me for my details." },
  { label: "🏛️ Maharashtra schemes", message: "Show me the top government schemes available in Maharashtra." },
  { label: "🌾 Explain PM Kisan Yojana", message: "Explain PM Kisan Samman Nidhi Yojana" },
];

// ─── Stats ────────────────────────────────────────────────────────────────────
const STATS = [
  { icon: <TrendingUp size={18} />, value: "3,400+", label: "Schemes Covered" },
  { icon: <MapPin size={18} />, value: "28", label: "States & UTs" },
  { icon: <IndianRupee size={18} />, value: "₹50K+", label: "Avg. Annual Benefit" },
  { icon: <Sparkles size={18} />, value: "15+", label: "Scheme Categories" },
];

// ─── How It Works Steps ───────────────────────────────────────────────────────
const HOW_STEPS = [
  {
    num: "01",
    icon: <User size={22} />,
    title: "Share Your Profile",
    desc: "Provide your age, income, state, and life situation in plain language — no complex forms required.",
  },
  {
    num: "02",
    icon: <ShieldCheck size={22} />,
    title: "Eligibility Verification",
    desc: "Your profile is verified against official scheme guidelines and eligibility criteria across all 28 states.",
  },
  {
    num: "03",
    icon: <FileText size={22} />,
    title: "Receive Your Guide",
    desc: "Get a personalised list of eligible schemes with document requirements and step-by-step application guidance.",
  },
];

// ─── Generate fresh session ID ────────────────────────────────────────────────
function generateSessionId() {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SevaSetuPortal() {
  const [isChatActive, setIsChatActive]   = useState(false);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [input, setInput]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [sessionId, setSessionId]         = useState<string>("guest_user");
  const chatEndRef                        = useRef<HTMLDivElement>(null);
  const inputRef                          = useRef<HTMLInputElement>(null);

  // Generate fresh session on mount
  useEffect(() => {
    setSessionId(generateSessionId());
    localStorage.removeItem('seva_session_id');
  }, []);

  // Auto-scroll on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Scroll to anchor ────────────────────────────────────────────────────────
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  // ── Reset session ───────────────────────────────────────────────────────────
  const handleNewSession = () => {
    setMessages([]);
    setSessionId(generateSessionId());
    setInput("");
  };

  // ── Core send logic ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (msg: string) => {
    if (!msg.trim()) return;
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: msg }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Could not reach the backend. Please ensure the server is running on port 8000.",
          failed: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const handleSendMessage = () => {
    const msg = input.trim();
    if (!msg) return;
    sendMessage(msg);
  };

  const handleSchemeClick = (schemeName: string) => {
    sendMessage(`Explain ${schemeName}`);
  };

  // ── Retry last failed message ───────────────────────────────────────────────
  const handleRetry = () => {
    // Find the last user message before the failed assistant message
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
    if (!lastUserMsg) return;
    // Remove the failed response
    setMessages(prev => prev.filter(m => !m.failed));
    sendMessage(lastUserMsg.content);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // CHAT CONTENT RENDERER
  // ─────────────────────────────────────────────────────────────────────────────
  const renderFormattedContent = (content: string) => {

    // ── CASE A: ## ELIGIBLE_SCHEMES ──────────────────────────────────────────
    if (content.includes('## ELIGIBLE_SCHEMES')) {
      const body = content.replace('## ELIGIBLE_SCHEMES', '').trim();
      const entries = body.split(/\n(?=\d+\.)/).filter(e => e.trim());
      return (
        <div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
            ✅ Schemes You May Be Eligible For
          </p>
          <div className="space-y-3">
            {entries.map((entry, i) => {
              const lines = entry.split('\n').map(l => l.trim()).filter(Boolean);
              const titleLine = lines[0]?.replace(/^\d+\.\s*/, '').trim() ?? '';
              const benefitLine = lines.find(l => l.toLowerCase().startsWith('financial benefit')) ?? '';
              const benefit = benefitLine.replace(/financial benefit:\s*/i, '').trim();
              return (
                <div
                  key={i}
                  onClick={() => handleSchemeClick(titleLine)}
                  className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl cursor-pointer hover:bg-emerald-100 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-100 transition-all group active:scale-[0.98]"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-emerald-600 transition-colors">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-emerald-900 text-sm">{titleLine}</p>
                    {benefit && (
                      <p className="text-emerald-700 text-xs mt-1">
                        <span className="font-semibold">💰 </span>{benefit}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={14} className="text-emerald-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 mt-1 shrink-0 transition-all" />
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 mt-3 text-center">Click any scheme to get full details</p>
        </div>
      );
    }

    // ── CASE C: ## STATE_SCHEMES ─────────────────────────────────────────────
    if (content.includes('## STATE_SCHEMES')) {
      const body = content.replace('## STATE_SCHEMES', '').trim();
      const entries = body.split(/\n(?=\d+\.)/).filter(e => e.trim());
      return (
        <div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
            🏛️ Top Schemes in Your State
          </p>
          <div className="space-y-3">
            {entries.map((entry, i) => {
              const lines = entry.split('\n').map(l => l.trim()).filter(Boolean);
              const titleLine = lines[0]?.replace(/^\d+\.\s*/, '').trim() ?? '';
              const eligLine = lines.find(l => l.toLowerCase().startsWith('eligibility')) ?? '';
              const benefitLine = lines.find(l => l.toLowerCase().startsWith('financial benefit')) ?? '';
              const eligibility = eligLine.replace(/eligibility:\s*/i, '').trim();
              const benefit = benefitLine.replace(/financial benefit:\s*/i, '').trim();
              return (
                <div
                  key={i}
                  onClick={() => handleSchemeClick(titleLine)}
                  className="p-4 bg-orange-50 border border-orange-200 rounded-xl cursor-pointer hover:bg-orange-100 hover:border-orange-400 hover:shadow-lg hover:shadow-orange-100 transition-all group active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-orange-900 text-sm">{titleLine}</p>
                    <ChevronRight size={14} className="text-orange-400 group-hover:text-orange-600 group-hover:translate-x-0.5 shrink-0 transition-all" />
                  </div>
                  {eligibility && (
                    <p className="text-orange-800 text-xs">
                      <span className="font-semibold">👤 Eligibility: </span>{eligibility}
                    </p>
                  )}
                  {benefit && (
                    <p className="text-orange-700 text-xs mt-1">
                      <span className="font-semibold">💰 Benefit: </span>{benefit}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 mt-3 text-center">Click any scheme to get full details</p>
        </div>
      );
    }

    // ── CASE B: ## SCHEME_DETAIL ──────────────────────────────────────────────
    if (content.includes('## SCHEME_DETAIL')) {
      const body = content.replace('## SCHEME_DETAIL', '').trim();

      // Extract scheme name from # heading
      const nameMatch = body.match(/^#\s+(.+)$/m);
      const schemeName = nameMatch ? nameMatch[1].trim() : '';

      // Split into sections including leading prose before first ###
      const rawSections = body.split(/\n(?=###\s)/);

      return (
        <div className="space-y-4">
          {schemeName && (
            <h3 className="text-lg font-black text-slate-900 pb-2 border-b border-slate-100">{schemeName}</h3>
          )}
          {rawSections.map((section, i) => {
            const trimmed = section.trim();
            if (!trimmed) return null;

            // Leading prose section (no ### header) — e.g. objective paragraph
            if (!trimmed.startsWith('###')) {
              const prose = trimmed.replace(/^#\s+.+\n?/, '').trim(); // remove # title if present
              if (!prose) return null;
              return (
                <p key={i} className="text-slate-600 text-sm leading-relaxed"
                   dangerouslySetInnerHTML={{ __html: prose.replace(/\*\*(.*?)\*\*/g, '<b class="text-slate-900">$1</b>') }} />
              );
            }

            const headerMatch = trimmed.match(/^###\s+(.+)$/m);
            if (!headerMatch) return null;
            const header = headerMatch[1].trim();
            const sectionBody = trimmed.replace(/^###\s+.+$/m, '').trim();
            const lowerHeader = header.toLowerCase();

            // 💰 Financial Benefits
            if (lowerHeader.includes('financial') || lowerHeader.includes('💰')) {
              return (
                <div key={i} className="p-4 bg-emerald-50 border border-emerald-100 border-l-4 border-l-emerald-500 rounded-xl">
                  <h4 className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Landmark size={12} /> Financial Benefits
                  </h4>
                  <p className="text-emerald-800 text-sm leading-relaxed whitespace-pre-line"
                     dangerouslySetInnerHTML={{ __html: sectionBody.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
                </div>
              );
            }

            // 📋 Documents
            if (lowerHeader.includes('document') || lowerHeader.includes('📋')) {
              const items = sectionBody.split('\n').filter(l => l.trim().startsWith('-'));
              return (
                <div key={i} className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
                  <h4 className="text-xs font-black text-orange-700 uppercase tracking-widest mb-3 flex items-center gap-1">
                    <FileText size={12} /> Required Documents
                  </h4>
                  <div className="grid gap-2">
                    {items.map((item, j) => (
                      <div key={j} className="flex items-center gap-2 bg-white/70 px-3 py-2 rounded-lg border border-orange-100">
                        <CheckCircle size={12} className="text-orange-500 shrink-0" />
                        <span className="text-sm text-slate-700">{item.replace(/^-\s*/, '').trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            // 🚀 Application Process
            if (lowerHeader.includes('application') || lowerHeader.includes('🚀')) {
              const steps = sectionBody.split(/\n\d+\.\s+/).filter(s => s.trim().length > 3);
              return (
                <div key={i} className="border-l-2 border-slate-200 ml-3 pl-6 relative mt-2">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 -ml-6 flex items-center gap-1">
                    <Zap size={12} className="text-orange-500" /> Application Steps
                  </h4>
                  {steps.map((step, j) => (
                    <div key={j} className="relative mb-5 last:mb-0">
                      <div className="absolute -left-[29px] top-0 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-[9px] font-bold text-white border-2 border-white">
                        {j + 1}
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed"
                         dangerouslySetInnerHTML={{ __html: step.replace(/\*\*(.*?)\*\*/g, '<b class="text-slate-900">$1</b>').trim() }} />
                    </div>
                  ))}
                </div>
              );
            }

            // Default section
            return (
              <div key={i} className="mb-2">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{header.replace(/[🎯💰📋🚀]/g, '').trim()}</h4>
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line"
                   dangerouslySetInnerHTML={{ __html: sectionBody.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
              </div>
            );
          })}
        </div>
      );
    }

    // ── FALLBACK: Plain text ──────────────────────────────────────────────────
    return (
      <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap"
           dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-orange-100">

      {/* ── GOVT TOP BAR ── */}
      <div className="fixed top-0 w-full z-[60] bg-[#1a3a5c] text-white">
        <div className="max-w-7xl mx-auto px-8 py-1.5 flex items-center gap-3 text-[11px]">
          <div className="flex gap-0.5 items-center">
            <span className="w-1 h-4 rounded-sm bg-[#FF9933] inline-block" />
            <span className="w-1 h-4 rounded-sm bg-white inline-block" />
            <span className="w-1 h-4 rounded-sm bg-[#138808] inline-block" />
          </div>
          <span className="font-semibold tracking-wide">Government of India — Ministry of Social Justice &amp; Empowerment</span>
        </div>
      </div>

      {/* ── NAVBAR ── */}
      <nav className="fixed top-[33px] w-full z-50 bg-white border-b-2 border-[#FF9933] px-8 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setIsChatActive(false); }}>
          {/* Emblem */}
          <div className="w-10 h-10 rounded-full bg-[#1a3a5c] flex items-center justify-center text-white shadow-md">
            <Landmark size={18} />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-[#1a3a5c]">
              Seva<span className="text-[#FF9933]">Setu</span>
            </span>
            <p className="text-[9px] text-slate-400 font-medium tracking-widest uppercase -mt-0.5">Citizen Welfare Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-8 text-sm font-semibold text-slate-600">
          {!isChatActive && (
            <>
              <button onClick={() => scrollTo('how-it-works')} className="hover:text-[#FF9933] transition-colors">How it Works</button>
              <button onClick={() => scrollTo('features')} className="hover:text-[#FF9933] transition-colors">Scheme Directory</button>
            </>
          )}
          {isChatActive ? (
            <button
              onClick={() => setIsChatActive(false)}
              className="flex items-center gap-2 text-[#1a3a5c] hover:text-[#FF9933] transition-colors font-semibold"
            >
              <ArrowLeft size={16} /> Back to Home
            </button>
          ) : (
            <button
              onClick={() => setIsChatActive(true)}
              className="bg-[#138808] hover:bg-[#0f6606] text-white px-5 py-2 rounded transition-all shadow-md font-semibold text-sm active:scale-95"
            >
              Check Your Eligibility
            </button>
          )}
        </div>
      </nav>

      <AnimatePresence mode="wait">

        {/* ════════════════════════════════════════════════════════════════
            LANDING PAGE
        ════════════════════════════════════════════════════════════════ */}
        {!isChatActive ? (
          <motion.main
            key="landing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.35 }}
          >
            {/* ── HERO ── */}
            <section className="pt-44 pb-20 px-8 max-w-7xl mx-auto text-center relative overflow-hidden">
              {/* Background glow — original */}
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-300/20 rounded-full blur-3xl pointer-events-none" />

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.07 }}
                className="text-6xl md:text-7xl font-extrabold text-slate-900 mb-6 leading-[1.1]"
              >
                Your Bridge to <br />
                <span className="gradient-text">Government Benefits</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="text-lg text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed"
              >
                SevaSetu is a citizen welfare portal that matches your profile with 3,400+ Central and State Government schemes — instantly and at no cost.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.17 }}
                className="flex items-center justify-center gap-4"
              >
                <button
                  onClick={() => setIsChatActive(true)}
                  className="group relative inline-flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl text-lg font-bold hover:bg-[#FF9933] transition-all shadow-xl shadow-slate-200 active:scale-95"
                >
                  Try SevaSetu Now
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => scrollTo('how-it-works')}
                  className="inline-flex items-center gap-2 text-[#1a3a5c] hover:text-[#FF9933] font-semibold transition-colors text-sm"
                >
                  How it works <ChevronRight size={16} />
                </button>
              </motion.div>

              {/* Trust badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center gap-6 mt-10 text-xs text-slate-400"
              >
                <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-[#138808]" /> Free for all citizens</span>
                <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-[#138808]" /> No registration required</span>
                <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-[#138808]" /> Multilingual support</span>
              </motion.div>
            </section>

            {/* ── STATS STRIP ── */}
            <section className="border-y border-slate-100 bg-white py-6 px-8">
              <div className="max-w-5xl mx-auto grid grid-cols-4 gap-6 divide-x divide-slate-100">
                {STATS.map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.07 }}
                    className="flex flex-col items-center text-center px-4"
                  >
                    <div className="text-orange-500 mb-1">{stat.icon}</div>
                    <div className="text-2xl font-black text-slate-900">{stat.value}</div>
                    <div className="text-xs text-slate-500 font-medium">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section id="how-it-works" className="py-24 px-8 max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <span className="text-xs font-black text-orange-500 uppercase tracking-widest">Process</span>
                <h2 className="text-4xl font-extrabold text-slate-900 mt-2">How SevaSetu Works</h2>
                <p className="text-slate-500 mt-3 max-w-xl mx-auto">Three simple steps from profile to a personalised scheme list with document guide.</p>
              </div>
              <div className="grid md:grid-cols-3 gap-8 relative">
                {/* Connector line */}
                <div className="hidden md:block absolute top-12 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-orange-200 via-orange-400 to-orange-200" />
                {HOW_STEPS.map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.1 }}
                    className="relative text-center"
                  >
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 flex items-center justify-center mx-auto mb-6 text-orange-600 relative z-10">
                      {step.icon}
                      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center justify-center">
                        {step.num.replace('0', '')}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">{step.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">{step.desc}</p>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* ── FEATURE CARDS ── */}
            <section id="features" className="pb-24 px-8 max-w-7xl mx-auto">
              <div className="text-center mb-14">
                <span className="text-xs font-black text-[#FF9933] uppercase tracking-widest">Key Features</span>
                <h2 className="text-4xl font-extrabold text-[#1a3a5c] mt-2">What SevaSetu Offers</h2>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                <FeatureCard
                  icon={<Search className="text-[#1a3a5c]" size={24} />}
                  title="Smart Scheme Search"
                  desc="Describe your situation in your own language. SevaSetu understands your needs and finds the most relevant schemes for you."
                />
                <FeatureCard
                  icon={<ShieldCheck className="text-[#1a3a5c]" size={24} />}
                  title="Eligibility Verification"
                  desc="Your age, income, category, and state are matched against official scheme eligibility criteria to confirm you qualify."
                />
                <FeatureCard
                  icon={<FileText className="text-[#1a3a5c]" size={24} />}
                  title="Document Guidance"
                  desc="Receive a personalised checklist of required documents and step-by-step application guidance for every matched scheme."
                />
              </div>
            </section>

            {/* ── CTA BANNER ── */}
            <section className="mx-8 mb-20 rounded border border-[#FF9933]/30 bg-gradient-to-br from-[#1a3a5c] to-[#0f2540] text-white py-14 px-12 flex items-center justify-between max-w-7xl mx-auto relative overflow-hidden">
              {/* Tricolor accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1 flex">
                <div className="flex-1 bg-[#FF9933]" />
                <div className="flex-1 bg-white/30" />
                <div className="flex-1 bg-[#138808]" />
              </div>
              <div>
                <p className="text-[#FF9933] text-xs font-bold uppercase tracking-widest mb-2">Citizen Welfare Initiative</p>
                <h2 className="text-3xl font-extrabold mb-2">Know the Schemes You Are Entitled To</h2>
                <p className="text-slate-300 text-sm">Free for all Indian citizens. No registration or login required.</p>
              </div>
              <button
                onClick={() => setIsChatActive(true)}
                className="group inline-flex items-center gap-3 bg-[#FF9933] hover:bg-[#e8861f] text-white px-7 py-3.5 rounded font-bold transition-all shadow-xl active:scale-95 shrink-0"
              >
                Check Your Eligibility <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </section>

            {/* ── FOOTER ── */}
            <footer className="border-t-2 border-[#FF9933] bg-[#1a3a5c] text-white">
              <div className="max-w-7xl mx-auto px-8 py-8">
                <div className="flex items-start justify-between gap-8 mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <Landmark size={16} className="text-[#FF9933]" />
                      </div>
                      <span className="font-black text-lg">Seva<span className="text-[#FF9933]">Setu</span></span>
                    </div>
                    <p className="text-slate-300 text-xs max-w-xs leading-relaxed">A citizen welfare portal under the Digital India initiative to bridge the gap between citizens and government welfare schemes.</p>
                  </div>
                  <div className="text-xs text-slate-400 text-right">
                    <p className="font-semibold text-white mb-1">Ministry of Social Justice &amp; Empowerment</p>
                    <p>Government of India</p>
                    <p className="mt-2">National Informatics Centre</p>
                  </div>
                </div>
                <div className="border-t border-white/10 pt-4 flex items-center justify-between text-xs text-slate-400">
                  <span>© 2025 SevaSetu · Government of India. All rights reserved.</span>
                  <div className="flex items-center gap-1">
                    <span className="w-4 h-1 rounded bg-[#FF9933]" />
                    <span className="w-4 h-1 rounded bg-white/50" />
                    <span className="w-4 h-1 rounded bg-[#138808]" />
                    <span className="ml-2">Built for Bharat 🇮🇳</span>
                  </div>
                </div>
              </div>
            </footer>

          </motion.main>
        ) : (

          /* ════════════════════════════════════════════════════════════════
              CHAT VIEW
          ════════════════════════════════════════════════════════════════ */
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.3 }}
            className="flex h-screen pt-[88px] bg-white"
          >
            <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full border-x border-slate-100 shadow-2xl shadow-slate-100">

              {/* ── Chat Header ── */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-200">
                    <Bot size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">SevaSetu AI Assistant</p>
                    <p className="text-[10px] text-slate-400 font-mono">{sessionId}</p>
                  </div>
                </div>
                <button
                  onClick={handleNewSession}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-orange-600 border border-slate-200 hover:border-orange-300 px-3 py-1.5 rounded-full transition-all"
                  title="Start a new session"
                >
                  <RefreshCw size={12} /> New Session
                </button>
              </div>

              {/* ── Messages Area ── */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 chat-scroll-area">

                {/* Empty state + Quick prompts */}
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-10">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center mb-4">
                      <Bot size={32} className="text-orange-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-1">How can I help you?</h2>
                    <p className="text-sm text-slate-400 mb-8">Ask about any scheme or share your profile to find eligible benefits.</p>
                    <div className="flex flex-wrap gap-3 justify-center">
                      {QUICK_PROMPTS.map((p, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(p.message)}
                          className="bg-white border border-slate-200 hover:border-orange-400 hover:bg-orange-50 text-slate-700 hover:text-orange-700 text-sm px-4 py-2.5 rounded-xl font-medium transition-all shadow-sm hover:shadow-md"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages */}
                {messages.map((msg, i) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    key={i}
                    className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-orange-100 mt-1">
                        <Bot size={18} />
                      </div>
                    )}
                    <div className={`max-w-[82%] px-5 py-4 rounded-2xl shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-tr-none shadow-orange-200'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                    }`}>
                      {msg.role === 'assistant'
                        ? renderFormattedContent(msg.content)
                        : <p className="text-sm leading-relaxed">{msg.content}</p>
                      }
                      {/* Retry button for failed messages */}
                      {msg.failed && (
                        <button
                          onClick={handleRetry}
                          className="mt-3 flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-semibold border border-orange-200 px-3 py-1.5 rounded-full bg-orange-50 hover:bg-orange-100 transition-all"
                        >
                          <RotateCcw size={11} /> Retry
                        </button>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-white shrink-0 shadow-sm mt-1">
                        <User size={16} />
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* Typing Indicator */}
                {loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-4"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-orange-100">
                      <Bot size={18} />
                    </div>
                    <div className="bg-white border border-slate-200 px-5 py-4 rounded-2xl rounded-tl-none shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                      </div>
                    </div>
                  </motion.div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* ── Input Bar ── */}
              <div className="p-5 border-t border-slate-100 bg-white shrink-0">
                <div className="relative flex items-center gap-3">
                  <input
                    ref={inputRef}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-5 pr-14 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all text-slate-800 placeholder:text-slate-400 text-sm"
                    placeholder="Describe your situation or ask about a scheme..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    disabled={loading}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={loading || !input.trim()}
                    className="absolute right-3 p-2.5 bg-orange-500 text-white rounded-xl shadow-md hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send size={16} />
                  </button>
                </div>
                <p className="text-[10px] text-slate-300 text-center mt-2">SevaSetu AI · Responses may not reflect real-time scheme updates</p>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: "0 20px 40px -12px rgba(249,115,22,0.12)" }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm cursor-default"
    >
      <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mb-6 border border-orange-100">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-slate-800">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
    </motion.div>
  );
}