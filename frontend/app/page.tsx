"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Bot, User, ShieldCheck, Landmark, 
  ArrowRight, Search, FileText, CheckCircle, 
  ChevronRight, Menu, X, Zap 
} from 'lucide-react';

export default function SevaSetuPortal() {
  const [isChatActive, setIsChatActive] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string>("guest_user");
  
  useEffect(() => {
    // 1. Generate a completely fresh ID every time the component mounts (page load/refresh)
    // We add Date.now() to ensure it's mathematically unique
    const newId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // 2. Set it to state immediately
    setSessionId(newId);
    
    // 3. Optional: Clear the old localStorage if you want to be tidy
    localStorage.removeItem('seva_session_id');
    
    console.log("🆕 Fresh Session Generated:", newId);
  }, []);


  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  const inputRef = useRef<string>("");

  const handleSchemeClick = (schemeName: string) => {
    setInput(`Explain ${schemeName}`);
    inputRef.current = `Explain ${schemeName}`;
    // Small delay to let state settle, then send
    setTimeout(() => {
      const syntheticSend = async () => {
        const msg = `Explain ${schemeName}`;
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
          const data = await res.json();
          setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
        } catch {
          setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Technical Error: Please ensure the backend server is active." }]);
        } finally {
          setLoading(false);
        }
      };
      syntheticSend();
    }, 50);
  };
  
  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: input }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Technical Error: Please ensure the backend server is active." }]);
    } finally {
      setLoading(false);
    }
  };

  // --- THE CHAT PRESENTATION ENGINE ---
  const renderFormattedContent = (content: string) => {

    // ── CASE A: ## ELIGIBLE_SCHEMES ─────────────────────────────────────────────
    if (content.includes('## ELIGIBLE_SCHEMES')) {
      const body = content.replace('## ELIGIBLE_SCHEMES', '').trim();
      // Parse numbered entries: "1. Scheme Name\n   Financial Benefit: ..."
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
                  className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl cursor-pointer hover:bg-emerald-100 hover:border-emerald-400 transition-all group active:scale-[0.98]"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
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
                  <ChevronRight size={14} className="text-emerald-400 group-hover:text-emerald-600 mt-1 shrink-0 transition-colors" />
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 mt-3 text-center">Click any scheme to get full details</p>
        </div>
      );
    }

    // ── CASE C: ## STATE_SCHEMES ────────────────────────────────────────────────
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
                  className="p-4 bg-orange-50 border border-orange-200 rounded-xl cursor-pointer hover:bg-orange-100 hover:border-orange-400 transition-all group active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-orange-900 text-sm">{titleLine}</p>
                    <ChevronRight size={14} className="text-orange-400 group-hover:text-orange-600 shrink-0 transition-colors" />
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

    // ── CASE B: ## SCHEME_DETAIL ───────────────────────────────────────────────
    if (content.includes('## SCHEME_DETAIL')) {
      const body = content.replace('## SCHEME_DETAIL', '').trim();
      const sections = body.split(/\n(?=###\s)/);

      // Extract scheme name from # heading
      const nameMatch = body.match(/^#\s+(.+)$/m);
      const schemeName = nameMatch ? nameMatch[1].trim() : '';

      return (
        <div className="space-y-4">
          {schemeName && (
            <h3 className="text-lg font-black text-slate-900 pb-2 border-b border-slate-100">{schemeName}</h3>
          )}
          {sections.map((section, i) => {
            if (!section.trim() || section.startsWith('#') && !section.startsWith('###')) return null;
            const headerMatch = section.match(/^###\s+(.+)$/m);
            if (!headerMatch) return null;
            const header = headerMatch[1].trim();
            const sectionBody = section.replace(/^###\s+.+$/m, '').trim();
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

            // 🎯 Objective / default section
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

    // ── FALLBACK: Plain text ────────────────────────────────────────────────────
    return (
      <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap"
           dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
    );
  };
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-orange-100">
      
      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-orange-100 px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-2 rounded-lg text-white shadow-lg shadow-orange-200">
            <Landmark size={22} />
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-800">
            Seva<span className="text-orange-500">Setu</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
          <a href="#" className="hover:text-orange-600 transition-colors">How it Works</a>
          <a href="#" className="hover:text-orange-600 transition-colors">Directory</a>
          <button onClick={() => setIsChatActive(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-full transition-all shadow-md active:scale-95">
            Launch Assistant
          </button>
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {!isChatActive ? (
          <motion.main key="landing" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }} className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6 border border-orange-100">
                <Bot size={14} /> Powered by 120B Agentic Intelligence
              </motion.div>
              <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-6 leading-[1.1]">
                Your Bridge to <br />
                <span className="bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">Government Benefits</span>
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
                SevaSetu uses advanced AI to audit your profile and match you with 3,400+ schemes instantly. No more paperwork confusion—just direct answers.
              </p>
              <button onClick={() => setIsChatActive(true)} className="group relative inline-flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl text-lg font-bold hover:bg-orange-600 transition-all shadow-xl shadow-slate-200 active:scale-95">
                Try SevaSetu Now
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard icon={<Search className="text-orange-600" />} title="Semantic Search" desc="Describe your life situation in your own language. Our Qdrant brain understands intent, not just keywords." />
              <FeatureCard icon={<ShieldCheck className="text-orange-600" />} title="Strict AI Audit" desc="The 120B Auditor verifies your age, income, and state against official rules to ensure you're actually eligible." />
              <FeatureCard icon={<FileText className="text-orange-600" />} title="Document Guide" desc="Get a personalized checklist of exactly what documents you need to bring to the Seva Kendra." />
            </div>
          </motion.main>
        ) : (
          <motion.div key="chat" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="flex h-screen pt-16 bg-white">
            <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full border-x border-slate-100 shadow-2xl">
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-40">
                    <Bot size={48} className="text-orange-500 mb-4" />
                    <h2 className="text-xl font-bold text-slate-800">SevaSetu AI Assistant</h2>
                    <p className="text-sm">Ask about any scheme or tell me your details.</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shrink-0 shadow-md"><Bot size={20}/></div>}
                    <div className={`max-w-[85%] px-5 py-4 rounded-2xl shadow-sm ${
                      msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                    }`}>
                      {msg.role === 'assistant' ? renderFormattedContent(msg.content) : msg.content}
                    </div>
                  </motion.div>
                ))}
                {loading && (
                  <div className="flex gap-4 animate-pulse">
                    <div className="w-10 h-10 rounded-xl bg-orange-200 flex items-center justify-center text-orange-400 shrink-0"><Bot size={20}/></div>
                    <div className="bg-white border border-slate-200 px-5 py-4 rounded-2xl text-slate-400 text-sm">Processing scheme data...</div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-6 border-t border-slate-100 bg-white">
                <div className="relative flex items-center">
                  <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-6 pr-14 focus:outline-none focus:border-orange-500 transition-all text-slate-800"
                    placeholder="Describe your situation..." value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} />
                  <button onClick={handleSendMessage} className="absolute right-3 p-2.5 bg-orange-500 text-white rounded-xl shadow-lg hover:bg-orange-600 transition-colors">
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
      <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mb-6 text-orange-600">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-slate-800">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}