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
    if (!content.includes('###')) {
      return (
        <div className="text-slate-700 whitespace-pre-wrap" dangerouslySetInnerHTML={{ 
          __html: content.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') 
        }} />
      );
    }

    return content.split('###').map((section, idx) => {
      if (!section.trim()) return null;
      const lowerSection = section.toLowerCase();

      // 1. 💰 FINANCIAL BENEFITS (Green Card)
      if (lowerSection.includes("financial benefits") || lowerSection.includes("💰")) {
        const body = section.split('\n').slice(1).join('\n').trim();
        return (
          <div key={idx} className="my-4 p-5 bg-emerald-50 rounded-2xl border border-emerald-100 border-l-4 border-l-emerald-500 shadow-sm">
            <h4 className="text-emerald-800 font-bold flex items-center gap-2 mb-2 text-xs uppercase tracking-widest">
              <Landmark size={16}/> Financial Benefits
            </h4>
            <div className="text-emerald-700 text-sm whitespace-pre-line leading-relaxed font-medium" 
                 dangerouslySetInnerHTML={{ __html: body.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
          </div>
        );
      }

      // 2. 📋 DOCUMENT CHECKLIST (Orange Checklist)
      if ((lowerSection.includes("prerequisites") || lowerSection.includes("checklist")) && !lowerSection.includes("application process")) {
        const items = section.split('\n').filter(line => line.trim().startsWith('-') || line.trim().match(/^[0-9]\./));
        return (
          <div key={idx} className="my-4 p-5 bg-orange-50 rounded-2xl border border-orange-100">
            <h4 className="text-orange-800 font-bold flex items-center gap-2 mb-4 text-xs uppercase tracking-widest">
              <FileText size={16}/> Required Documents
            </h4>
            <div className="grid gap-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/60 p-3 rounded-xl border border-orange-200/20 shadow-sm">
                  <CheckCircle size={14} className="text-orange-500" />
                  <span className="text-sm text-slate-700 font-medium">{item.replace(/^[-0-9.]\s*/, '').trim()}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // 3. 🚀 APPLICATION PROCESS (Clean Steps)
      if (lowerSection.includes("application process") || lowerSection.includes("🚀")) {
        const steps = section.split(/\n\d+\.\s+/).filter(s => s.trim().length > 5);
        return (
          <div key={idx} className="mt-8 mb-4 border-l-2 border-slate-100 ml-3 pl-8 relative">
            <h4 className="text-slate-800 font-bold flex items-center gap-2 mb-6 text-xs uppercase tracking-widest -ml-8 bg-white pr-4 w-fit">
              <Zap size={16} className="text-orange-500"/> Step-by-Step Guide
            </h4>
            {steps.map((step, i) => (
              <div key={i} className="relative mb-8 last:mb-0">
                <div className="absolute -left-[41px] top-0 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-[10px] font-bold text-white shadow-md border-4 border-white">
                  {i + 1}
                </div>
                <div className="text-[14px] text-slate-600 leading-relaxed" 
                     dangerouslySetInnerHTML={{ __html: step.replace(/\*\*(.*?)\*\*/g, '<b class="text-slate-900">$1</b>').trim() }} />
              </div>
            ))}
          </div>
        );
      }

      // DEFAULT: Objective or General Text
      const title = section.split('\n')[0].replace(/[#*🌟🛡️]/g, '').trim();
      const body = section.split('\n').slice(1).join('\n').trim();
      return (
        <div key={idx} className="mb-6 last:mb-0">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{title}</h4>
          <div className="text-slate-700 text-[15px] leading-relaxed whitespace-pre-line"
               dangerouslySetInnerHTML={{ __html: body.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
        </div>
      );
    });
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