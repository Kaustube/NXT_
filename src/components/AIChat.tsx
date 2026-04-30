import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { sendMessage, type ChatMessage, type AIContext } from "@/lib/ai";
import {
  Sparkles, X, Send, Minimize2, GripVertical,
  BookOpen, Code2, Briefcase, Trophy, Building2,
  CalendarDays, ShoppingBag, MessageSquare, ChevronDown,
  RotateCcw, Copy, Check,
} from "lucide-react";

// ── Context detection from route ──────────────────────────────────────────────

function detectContext(pathname: string): AIContext {
  if (pathname.includes("/lms")) return "lms";
  if (pathname.includes("/games") || pathname.includes("/challenges")) return "coding";
  if (pathname.includes("/opportunities") || pathname.includes("/placement")) return "career";
  if (pathname.includes("/sports")) return "sports";
  if (pathname.includes("/campus-services")) return "campus";
  if (pathname.includes("/events")) return "events";
  if (pathname.includes("/marketplace")) return "marketplace";
  return "general";
}

const CONTEXT_META: Record<AIContext, { label: string; icon: React.ElementType; color: string; placeholder: string }> = {
  general:     { label: "NXT AI",        icon: Sparkles,    color: "text-primary",    placeholder: "Ask me anything about campus life…" },
  study:       { label: "Study AI",      icon: BookOpen,    color: "text-blue-400",   placeholder: "Ask me any academic question…" },
  lms:         { label: "LMS AI",        icon: BookOpen,    color: "text-green-400",  placeholder: "Ask about your courses or assignments…" },
  coding:      { label: "Code AI",       icon: Code2,       color: "text-purple-400", placeholder: "Paste your code or describe the problem…" },
  career:      { label: "Career AI",     icon: Briefcase,   color: "text-yellow-400", placeholder: "Ask about jobs, internships, or resume…" },
  sports:      { label: "Sports AI",     icon: Trophy,      color: "text-orange-400", placeholder: "Ask about sports, fitness, or bookings…" },
  campus:      { label: "Campus AI",     icon: Building2,   color: "text-cyan-400",   placeholder: "Ask about campus services…" },
  events:      { label: "Events AI",     icon: CalendarDays,color: "text-pink-400",   placeholder: "Ask about events or hackathons…" },
  marketplace: { label: "Market AI",     icon: ShoppingBag, color: "text-emerald-400",placeholder: "Ask about buying or selling…" },
};

const QUICK_PROMPTS: Record<AIContext, string[]> = {
  general:     ["What can you help me with?", "How do I use NXT Campus?", "Tips for college life"],
  study:       ["Explain Big O notation", "Help me with DBMS normalization", "Create a study plan for GATE"],
  lms:         ["Explain today's topic", "Help me with my assignment", "What should I study next?"],
  coding:      ["Debug my code", "Explain dynamic programming", "How to solve this LeetCode problem?"],
  career:      ["Review my resume", "How to prepare for placements?", "Tips for technical interviews"],
  sports:      ["Suggest a workout plan", "How to book a court?", "Fitness tips for students"],
  campus:      ["How to request laundry pickup?", "How to report maintenance?", "How to share a cab?"],
  events:      ["How to prepare for a hackathon?", "Find upcoming events", "Tips for pitching ideas"],
  marketplace: ["How to price my textbook?", "Safe transaction tips", "What sells well on campus?"],
};

// ── Simple HTML sanitizer (strips script/iframe/event handlers) ───────────────
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/data:/gi, "");
}

// ── Message renderer with markdown-like formatting ────────────────────────────

function MessageContent({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Parse code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const lines = part.slice(3, -3).split("\n");
          const lang = lines[0].trim();
          const code = lines.slice(1).join("\n").trim();
          return (
            <div key={i} className="relative rounded-lg overflow-hidden bg-[hsl(var(--surface-1))] border border-border">
              <div className="flex items-center justify-between px-3 py-1.5 bg-[hsl(var(--surface-2))] border-b border-border">
                <span className="text-[10px] text-muted-foreground font-mono">{lang || "code"}</span>
                <button
                  onClick={() => copyCode(code)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              <pre className="p-3 text-xs font-mono overflow-x-auto text-foreground/90 whitespace-pre-wrap">
                {code}
              </pre>
            </div>
          );
        }

        // Inline formatting
        const formatted = part
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 rounded bg-[hsl(var(--surface-2))] font-mono text-xs text-primary">$1</code>')
          .replace(/^### (.*)/gm, '<h3 class="font-bold text-sm mt-2">$1</h3>')
          .replace(/^## (.*)/gm, '<h2 class="font-bold text-base mt-3">$1</h2>')
          .replace(/^# (.*)/gm, '<h1 class="font-bold text-lg mt-3">$1</h1>')
          .replace(/^- (.*)/gm, '<li class="ml-4 list-disc">$1</li>')
          .replace(/^\d+\. (.*)/gm, '<li class="ml-4 list-decimal">$1</li>')
          .replace(/\n\n/g, '</p><p class="mt-2">')
          .replace(/\n/g, '<br/>');

        return (
          <div
            key={i}
            dangerouslySetInnerHTML={{ __html: `<p>${sanitizeHtml(formatted)}</p>` }}
            className="[&_strong]:font-semibold [&_em]:italic [&_li]:my-0.5 [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground"
          />
        );
      })}
    </div>
  );
}

// ── Draggable position (persists) ─────────────────────────────────────────────

const AI_POS_KEY = "nxt-ai-widget-pos";
const DEFAULT_POS = { right: 24, bottom: 100 };

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function loadWidgetPos(): { right: number; bottom: number } {
  try {
    const raw = localStorage.getItem(AI_POS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as { right?: unknown; bottom?: unknown };
      if (typeof p.right === "number" && typeof p.bottom === "number") {
        return { right: p.right, bottom: p.bottom };
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_POS;
}

type DragSession = {
  pointerId: number;
  startX: number;
  startY: number;
  startR: number;
  startB: number;
  dragged: boolean;
  elW: number;
  elH: number;
  isPanel?: boolean;
};

// ── Main component ────────────────────────────────────────────────────────────

export default function AIChat() {
  const { profile } = useAuth();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [manualContext, setManualContext] = useState<AIContext | null>(null);
  const [showContextPicker, setShowContextPicker] = useState(false);
  const [pos, setPos] = useState(loadWidgetPos);
  
  // Separate position for the open panel so it doesn't jump based on the small FAB's bottom-right
  const [panelPos, setPanelPos] = useState({ right: 24, bottom: 80 });

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dragRef = useRef<DragSession | null>(null);

  const panelW = Math.min(420, typeof window !== "undefined" ? window.innerWidth - 32 : 420);
  const panelH = Math.min(600, typeof window !== "undefined" ? window.innerHeight - 100 : 600);

  useEffect(() => {
    try {
      localStorage.setItem(AI_POS_KEY, JSON.stringify(pos));
    } catch {
      /* ignore */
    }
  }, [pos]);

  function beginDrag(e: React.PointerEvent, elW: number, elH: number, isPanel = false) {
    if (e.button !== 0) return;
    const startPos = isPanel ? panelPos : pos;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startR: startPos.right,
      startB: startPos.bottom,
      dragged: false,
      elW,
      elH,
      isPanel,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function moveDrag(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.hypot(dx, dy) > 8) d.dragged = true;
    if (!d.dragged) return;
    const margin = 8;
    const newPos = {
      right: clamp(d.startR - dx, margin, window.innerWidth - d.elW - margin),
      bottom: clamp(d.startB - dy, margin, window.innerHeight - d.elH - margin),
    };
    if (d.isPanel) setPanelPos(newPos);
    else setPos(newPos);
  }

  function releaseDrag(e: React.PointerEvent): boolean | undefined {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return undefined;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    const wasDrag = d.dragged;
    dragRef.current = null;
    return wasDrag;
  }

  function onFabPointerUp(e: React.PointerEvent) {
    const wasDrag = releaseDrag(e);
    if (wasDrag === undefined) return;
    if (!wasDrag) setOpen(true);
  }

  function onMinimizedPointerUp(e: React.PointerEvent) {
    const wasDrag = releaseDrag(e);
    if (wasDrag === undefined) return;
    if (!wasDrag) setMinimized(false);
  }

  function onPanelGripPointerUp(e: React.PointerEvent) {
    void releaseDrag(e);
  }

  function onLostPointerCapture() {
    dragRef.current = null;
  }

  const autoContext = detectContext(location.pathname);
  const context = manualContext ?? autoContext;
  const meta = CONTEXT_META[context];
  const Icon = meta.icon;

  useEffect(() => {
    if (open && messages.length === 0) {
      // Welcome message
      setMessages([{
        role: "assistant",
        content: `Hi ${profile?.display_name?.split(" ")[0] ?? "there"}! 👋 I'm your **${meta.label}**.\n\n${getWelcomeMessage(context)}\n\nWhat can I help you with?`,
      }]);
    }
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  function getWelcomeMessage(ctx: AIContext): string {
    const msgs: Record<AIContext, string> = {
      general:     "I can help with anything on NXT Campus — academics, career, campus life, and more.",
      study:       "I'm your personal tutor. Ask me to explain concepts, solve problems, or create study plans.",
      lms:         "I can help you understand your courses, assignments, and coding challenges.",
      coding:      "Paste your code, describe a bug, or ask about any programming concept.",
      career:      "I can help with your resume, interview prep, and career planning.",
      sports:      "Ask me about fitness, sports bookings, or workout plans.",
      campus:      "I can help you navigate campus services like laundry, printing, and maintenance.",
      events:      "Ask me about upcoming events, hackathon prep, or how to organize events.",
      marketplace: "I can help you price items, find deals, or navigate the campus marketplace.",
    };
    return msgs[ctx];
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const reply = await sendMessage(newMessages, context, {
      name: profile?.display_name,
      college: profile?.college_name ?? undefined,
      department: profile?.roll_number ? detectDept(profile.roll_number) : undefined,
    });

    setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function detectDept(rollNumber: string): string | undefined {
    const upper = rollNumber.toUpperCase();
    if (upper.includes("CSE") || upper.includes("CS")) return "Computer Science";
    if (upper.includes("ECE") || upper.includes("EC")) return "Electronics";
    if (upper.includes("ME") || upper.includes("MECH")) return "Mechanical";
    if (upper.includes("BBA")) return "Business Administration";
    return undefined;
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  function clearChat() {
    setMessages([]);
    setTimeout(() => {
      setMessages([{
        role: "assistant",
        content: `Chat cleared! I'm still here to help. What would you like to know?`,
      }]);
    }, 100);
  }

  function switchContext(ctx: AIContext) {
    setManualContext(ctx);
    setShowContextPicker(false);
    setMessages([{
      role: "assistant",
      content: `Switched to **${CONTEXT_META[ctx].label}**. ${getWelcomeMessage(ctx)}`,
    }]);
  }

  const fabStyle = { right: pos.right, bottom: pos.bottom };
  const panelStyle = { right: panelPos.right, bottom: panelPos.bottom };

  if (!open) {
    return (
      <div className="fixed z-40 touch-none select-none" style={fabStyle}>
        <button
          type="button"
          title="Open AI assistant — drag to move"
          onPointerDown={(e) => beginDrag(e, 56, 56)}
          onPointerMove={moveDrag}
          onPointerUp={onFabPointerUp}
          onPointerCancel={onFabPointerUp}
          onLostPointerCapture={onLostPointerCapture}
          className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 grid place-items-center hover:scale-110 transition-transform hover:shadow-[0_0_20px_hsl(var(--primary)/0.5)] cursor-grab active:cursor-grabbing"
        >
          <Sparkles className="h-6 w-6 pointer-events-none" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`fixed z-50 touch-none select-none transition-[width] duration-300 ${
        minimized ? "w-auto" : "w-[calc(100vw-2rem)] md:w-[420px]"
      }`}
      style={minimized ? fabStyle : panelStyle}
    >
      {minimized ? (
        <button
          type="button"
          title="Expand — drag to move"
          onPointerDown={(e) => beginDrag(e, 240, 56)}
          onPointerMove={moveDrag}
          onPointerUp={onMinimizedPointerUp}
          onPointerCancel={onMinimizedPointerUp}
          onLostPointerCapture={onLostPointerCapture}
          className="h-14 px-4 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center gap-2 hover:scale-105 transition-transform cursor-grab active:cursor-grabbing max-w-[calc(100vw-2rem)]"
        >
          <Sparkles className="h-5 w-5 shrink-0 pointer-events-none" />
          <span className="text-sm font-semibold truncate">{meta.label}</span>
        </button>
      ) : (
        <div
          className="panel flex flex-col shadow-2xl shadow-black/30 overflow-hidden w-full"
          style={{ height: `min(${panelH}px, calc(100dvh - 120px))` }}
        >

          {/* Header — drag via grip only so header buttons stay clickable */}
          <div className="flex items-center gap-1 px-2 py-3 border-b border-border/50 bg-[hsl(var(--surface-2))] shrink-0">
            <button
              type="button"
              title="Drag to move"
              aria-label="Move AI chat window"
              onPointerDown={(e) => {
                e.stopPropagation();
                beginDrag(e, panelW, panelH, true);
              }}
              onPointerMove={moveDrag}
              onPointerUp={onPanelGripPointerUp}
              onPointerCancel={onPanelGripPointerUp}
              onLostPointerCapture={onLostPointerCapture}
              className="h-9 w-7 shrink-0 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-3))] cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <div className={`h-8 w-8 rounded-lg bg-primary/10 grid place-items-center shrink-0 ${meta.color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0 pl-0.5">
              <div className="text-sm font-semibold">{meta.label}</div>
              <div className="text-[10px] text-muted-foreground">Powered by Gemini</div>
            </div>

            {/* Context switcher */}
            <div className="relative">
              <button
                onClick={() => setShowContextPicker(v => !v)}
                className="h-7 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-3))] flex items-center gap-1 transition-colors"
              >
                Switch <ChevronDown className="h-3 w-3" />
              </button>
              {showContextPicker && (
                <div className="absolute right-0 top-8 w-48 panel p-1 shadow-xl z-10">
                  {(Object.keys(CONTEXT_META) as AIContext[]).map(ctx => {
                    const m = CONTEXT_META[ctx];
                    const CtxIcon = m.icon;
                    return (
                      <button
                        key={ctx}
                        onClick={() => switchContext(ctx)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs hover:bg-[hsl(var(--surface-2))] transition-colors ${ctx === context ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
                      >
                        <CtxIcon className="h-3.5 w-3.5 shrink-0" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button onClick={clearChat} title="Clear chat"
              className="h-7 w-7 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-3))] transition-colors">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setMinimized(true)} title="Minimize"
              className="h-7 w-7 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-3))] transition-colors">
              <Minimize2 className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setOpen(false)} title="Close"
              className="h-7 w-7 rounded-md grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className={`h-7 w-7 rounded-lg bg-primary/10 grid place-items-center shrink-0 mt-0.5 ${meta.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-[hsl(var(--surface-2))] text-foreground rounded-bl-sm"
                  }`}
                >
                  {m.role === "assistant"
                    ? <MessageContent content={m.content} />
                    : <p className="text-sm leading-relaxed">{m.content}</p>
                  }
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 justify-start">
                <div className={`h-7 w-7 rounded-lg bg-primary/10 grid place-items-center shrink-0 ${meta.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="bg-[hsl(var(--surface-2))] rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1 items-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick prompts */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
              {QUICK_PROMPTS[context].map(p => (
                <button
                  key={p}
                  onClick={() => { setInput(p); setTimeout(() => inputRef.current?.focus(), 50); }}
                  className="text-xs px-2.5 py-1 rounded-full border border-border bg-[hsl(var(--surface-2))] text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-border/50 shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={meta.placeholder}
                rows={1}
                className="flex-1 px-3 py-2.5 rounded-xl bg-[hsl(var(--input))] border border-border text-sm outline-none focus:border-ring resize-none max-h-32 leading-relaxed"
                style={{ minHeight: "2.75rem" }}
              />
              <button
                onClick={() => void send()}
                disabled={!input.trim() || loading}
                className="h-11 w-11 rounded-xl bg-primary text-primary-foreground grid place-items-center hover:opacity-90 disabled:opacity-40 transition-all shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
