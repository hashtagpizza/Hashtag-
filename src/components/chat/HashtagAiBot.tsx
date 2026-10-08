import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Pizza,
  MapPin,
  Clock,
  Phone,
  Flame,
  ChevronDown,
  RefreshCw,
  ExternalLink,
  Zap,
  Cpu,
  Globe,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  modelUsed?: string;
  mapLinks?: { title: string; uri: string }[];
}

const BOT_NAME = 'Hashtag Pizza AI Bot';

const QUICK_PROMPTS = [
  '⏰ What are your opening hours?',
  '🛵 What are the delivery rates in Birgunj?',
  '🍕 Recommend top 3 pizzas for dinner',
  '🍗 Tell me about CFC Fried Chicken',
  '🥟 What makes Kurkure Momos special?',
  '📍 Where is your store located?',
];

export const HashtagAiBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [complexity, setComplexity] = useState<'general' | 'fast' | 'complex'>('general');

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: `Namaste! 🙏 I am **${BOT_NAME}**, your smart food buddy for Hashtag Pizza Birgunj.\n\nI can recommend pizzas, verify Birgunj delivery rates, and locate our store using real-time Google Maps Grounding! How can I help you today? 🍕✨`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Prepare multi-turn history payload
    const historyPayload = messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text,
      }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
          complexity,
          location: { lat: 27.0135, lng: 84.8770 },
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat API error: ${response.statusText}`);
      }

      const data = await response.json();

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: data.text || 'Thank you for messaging Hashtag Pizza Birgunj!',
        modelUsed: data.modelUsed,
        mapLinks: data.mapLinks || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.warn('Backend chat API failed, displaying local response:', err);

      // Local fallback
      const fallbackText =
        query.toLowerCase().includes('rate') || query.toLowerCase().includes('delivery')
          ? `🛵 **Hashtag Pizza Birgunj Official Delivery Rates (Max 5 km):**\n\n- **Up to 1.0 km:** Rs. 40 (Adarshnagar, Ghantaghar, Maisthan)\n- **1.0 km – 2.0 km:** Rs. 50 (Ranighat, Panitanki, Murli)\n- **2.0 km – 3.0 km:** Rs. 60 (Shreepur, Vishwa)\n- **3.0 km – 4.0 km:** Rs. 70 (Pipra, Powerhouse / Bypass)\n- **4.0 km – 5.0 km:** Rs. 80 (Birgunj Customs / Inarwa, Gandak / NMC)\n- **Beyond 5.0 km:** Delivery not available (we only deliver within 5 km inside Birgunj).\n\n🚦 Calculated via Birgunj One-Way traffic rules for hot doorstep dispatch.`
          : query.toLowerCase().includes('hour') || query.toLowerCase().includes('timing') || query.toLowerCase().includes('open')
          ? `⏰ **Hashtag Pizza Birgunj Opening Hours:**\n\nWe are open **11:30 AM – 9:30 PM Daily** for Dine In, Take Away, and Doorstep Delivery across Birgunj! 🍕 Visit us at Shop No. 01, Ground Floor, RB Complex, Adarshnagar.`
          : `We serve hot artisan pizzas, crispy Kurkure Momos, and CFC fried chicken at RB Complex, Adarshnagar, Birgunj. Opening Hours: 11:30 AM – 9:30 PM Daily. Hotline: 9861370721 / 051-591718. Would you like to check out our menu highlights? 🍕`;

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: fallbackText,
        mapLinks: [
          {
            title: 'Hashtag Pizza (RB Complex, Adarshnagar) on Google Maps',
            uri: 'https://maps.google.com/?q=27.0135,84.8770',
          },
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* FLOATING LAUNCHER BUTTON */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 px-4 py-3 bg-[#E31B23] hover:bg-[#b8141b] text-white rounded-full shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer border-2 border-white/50"
          aria-label="Open Hashtag Pizza AI Bot"
        >
          <div className="relative">
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-300"></span>
            </span>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-black uppercase tracking-wider leading-none">
              Hashtag AI Bot
            </p>
            <p className="text-[10px] text-amber-200 font-medium">Maps Grounded · Gemini</p>
          </div>
        </button>
      )}

      {/* CHAT WINDOW MODAL */}
      {isOpen && (
        <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50 w-[94vw] sm:w-[410px] h-[550px] max-h-[88vh] bg-white rounded-3xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-[#164699] via-[#0047AB] to-[#164699] text-white flex flex-col gap-2 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shadow-inner">
                  <Sparkles className="w-5 h-5 text-[#FFD700]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm tracking-tight flex items-center gap-1.5">
                    <span>{BOT_NAME}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                  </h3>
                  <p className="text-[10px] text-blue-100 font-medium">
                    Maps Grounding · Menu & Rates Assistant
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
                aria-label="Close Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Model & Grounding Mode Selector */}
            <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl text-[10px]">
              <button
                type="button"
                onClick={() => setComplexity('general')}
                className={`flex-1 py-1 rounded-lg font-bold flex items-center justify-center gap-1 transition-colors ${
                  complexity === 'general'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-blue-100 hover:text-white'
                }`}
                title="Gemini 3.5 Flash with Google Maps Grounding"
              >
                <Globe className="w-3 h-3 text-[#0047AB]" />
                <span>Maps Grounded</span>
              </button>
              <button
                type="button"
                onClick={() => setComplexity('fast')}
                className={`flex-1 py-1 rounded-lg font-bold flex items-center justify-center gap-1 transition-colors ${
                  complexity === 'fast'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-blue-100 hover:text-white'
                }`}
                title="Gemini 3.1 Flash Lite for quick response"
              >
                <Zap className="w-3 h-3 text-amber-500" />
                <span>Fast Lite</span>
              </button>
              <button
                type="button"
                onClick={() => setComplexity('complex')}
                className={`flex-1 py-1 rounded-lg font-bold flex items-center justify-center gap-1 transition-colors ${
                  complexity === 'complex'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-blue-100 hover:text-white'
                }`}
                title="Gemini 3.1 Pro Preview for complex culinary recommendations"
              >
                <Cpu className="w-3 h-3 text-purple-600" />
                <span>Pro Gourmet</span>
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF8F5]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'bot' && (
                  <div className="w-7 h-7 rounded-full bg-[#164699] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-2`}>
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-xs shadow-xs leading-relaxed whitespace-pre-line ${
                      m.sender === 'user'
                        ? 'bg-[#0047AB] text-white rounded-tr-xs font-medium'
                        : 'bg-white text-stone-800 rounded-tl-xs border border-stone-200'
                    }`}
                  >
                    {m.text}
                    <span
                      className={`block text-[9px] mt-1 text-right ${
                        m.sender === 'user' ? 'text-blue-200' : 'text-stone-400'
                      }`}
                    >
                      {m.timestamp}
                    </span>
                  </div>

                  {/* Google Maps Grounding Links (Required by GMP policy) */}
                  {m.mapLinks && m.mapLinks.length > 0 && (
                    <div className="space-y-1 pt-0.5">
                      <p className="text-[10px] font-bold text-stone-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#E31B23]" />
                        <span>Google Maps Grounded Locations:</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {m.mapLinks.map((link, idx) => (
                          <a
                            key={idx}
                            href={link.uri}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#0047AB] text-[11px] font-semibold transition-colors"
                          >
                            <span className="truncate max-w-[200px]">{link.title}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {m.sender === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-stone-300 text-stone-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 justify-start items-center">
                <div className="w-7 h-7 rounded-full bg-[#164699] text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-stone-200 rounded-2xl px-3.5 py-2 text-xs text-stone-500 flex items-center gap-1.5 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:0.4s]"></span>
                  <span className="text-[11px] ml-1">
                    {complexity === 'general' ? 'Consulting Google Maps...' : 'Thinking...'}
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-3 py-2 bg-stone-100 border-t border-stone-200/80 overflow-x-auto flex gap-1.5 scrollbar-thin">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleSend(p)}
                className="px-2.5 py-1 rounded-full bg-white hover:bg-amber-50 hover:border-amber-300 border border-stone-300 text-stone-700 text-[11px] whitespace-nowrap transition-colors cursor-pointer shrink-0 font-medium"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-stone-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask menu, delivery rates, or Birgunj locations..."
              className="flex-1 px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#0047AB] focus:bg-white transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2 rounded-xl bg-[#0047AB] hover:bg-[#003882] disabled:opacity-50 text-white transition-colors cursor-pointer"
              aria-label="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
