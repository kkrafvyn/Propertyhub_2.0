import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Sparkles,
  X,
  ArrowRight,
  Bot,
  GripHorizontal,
  RotateCcw,
} from "lucide-react";
import { Button } from "../ui/Button";
import { DegradedModeBanner } from "./DegradedModeBanner";
import { Input } from "../ui/Input";
import { Badge } from "../ui/badge";
import {
  aiAssistantService,
  type AiResponseMode,
  type AiSource,
} from "../../../lib/ai-assistant.service";
import { clientIntegrations } from "../../../lib/integrations";
import { AI_PANEL_OPEN_EVENT } from "../../lib/baytmiftah/ai-panel";

export type AIContext =
  | "consumer"
  | "workspace"
  | "search"
  | "property"
  | "documents"
  | "payments"
  | "maintenance";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  responseMode?: AiResponseMode;
}

const CONTEXT_COPY: Record<
  AIContext,
  { title: string; description: string; placeholder: string }
> = {
  consumer: {
    title: "BaytMiftah REOS Copilot",
    description: "Plain-language help across properties, payments, leases, and maintenance.",
    placeholder: "Ask how to find a home, review a lease, or report an issue...",
  },
  workspace: {
    title: "Workspace REOS Assistant",
    description: "Plain-language guidance for portfolio units, occupancies, and leads.",
    placeholder: "Ask about units, occupancies, or leads...",
  },
  search: {
    title: "Marketplace Query Copilot",
    description: "Find and compare properties using plain language.",
    placeholder: "Find a 3-bed house in Cantonments under 15000...",
  },
  property: {
    title: "Property 360 Intelligence",
    description: "Understand occupancy, charges, pricing, and amenities.",
    placeholder: "Explain this property's occupancy and active leases...",
  },
  documents: {
    title: "Leasing & Legal Copilot",
    description: "Get clear guidance on leases, deposits, documents, and KYC.",
    placeholder: "Which leases expire in the next 60 days?...",
  },
  payments: {
    title: "Ledger & Finance Copilot",
    description: "Understand payments, arrears, allocations, and ledger rules.",
    placeholder: "Explain overdue rent charges and payment allocations...",
  },
  maintenance: {
    title: "Maintenance & SLA Copilot",
    description: "Work through open jobs, assignments, and SLA issues.",
    placeholder: "Show high-priority plumbing issues breaching SLA...",
  },
};

const HIDDEN_PATHS = ["/login", "/signup", "/reset-password", "/auth", "/verify-email"];

function contextFromPath(pathname: string): AIContext {
  if (pathname.startsWith("/workspace")) return "workspace";
  if (pathname.startsWith("/search")) return "search";
  if (pathname.startsWith("/property/")) return "property";
  if (pathname.startsWith("/app/documents")) return "documents";
  if (pathname.startsWith("/app/payments") || pathname.startsWith("/checkout")) return "payments";
  if (pathname.startsWith("/app/maintenance")) return "maintenance";
  if (pathname.startsWith("/app")) return "consumer";
  return "search";
}

function shouldHideChat(pathname: string) {
  return HIDDEN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function workspaceOrganizationIdFromSession() {
  if (typeof window === "undefined") return undefined;
  return sessionStorage.getItem("bm_workspace_org_id") || undefined;
}

export function BaytMiftahAIPanel({
  context,
  organizationId: organizationIdProp,
}: {
  context?: AIContext;
  organizationId?: string;
  compact?: boolean;
  onNavigate?: (href: string) => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const resolvedContext = context ?? contextFromPath(location.pathname);
  const workspaceOrganizationId =
    organizationIdProp ||
    (resolvedContext === "workspace" ? workspaceOrganizationIdFromSession() : undefined);
  const copy = CONTEXT_COPY[resolvedContext];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<AiSource | null>(null);
  const [responseMode, setResponseMode] = useState<AiResponseMode | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const smartMode = clientIntegrations.ai.enhanced;
  const providerLabel =
    clientIntegrations.ai.provider === "qwen"
      ? "Qwen"
      : clientIntegrations.ai.provider === "openai"
        ? "OpenAI"
        : "Smart AI";

  // Draggable Bubble State
  // On mobile we push the bubble above the floating tab bar (~92px) and safe-area.
  const MOBILE_BOTTOM_CLEARANCE = 160; // tab bar height + breathing room
  const isMobileViewport = () =>
    typeof window !== "undefined" && window.innerWidth < 768;
  const getDefaultBubblePos = () => {
    if (typeof window === "undefined") return { x: 20, y: 20 };
    const bottomClearance = isMobileViewport() ? MOBILE_BOTTOM_CLEARANCE : 88;
    return {
      x: Math.max(10, window.innerWidth - 76),
      y: Math.max(10, window.innerHeight - bottomClearance),
    };
  };

  const [bubblePos, setBubblePos] = useState<{ x: number; y: number }>(() => {
    if (typeof window === "undefined") return { x: 20, y: 20 };
    const saved = localStorage.getItem("bm_ai_bubble_pos");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          const bottomClearance = isMobileViewport() ? MOBILE_BOTTOM_CLEARANCE : 88;
          return {
            x: Math.max(10, Math.min(window.innerWidth - 70, parsed.x)),
            y: Math.max(10, Math.min(window.innerHeight - bottomClearance, parsed.y)),
          };
        }
      } catch {
        // ignore
      }
    }
    return getDefaultBubblePos();
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    isDragging: boolean;
    pointerId: number;
  } | null>(null);

  // Recalculate on screen resize to keep bubble inside viewport
  useEffect(() => {
    const handleResize = () => {
      setBubblePos((prev) => ({
        x: Math.max(12, Math.min(window.innerWidth - 68, prev.x)),
        y: Math.max(12, Math.min(window.innerHeight - 68, prev.y)),
      }));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: bubblePos.x,
      originY: bubblePos.y,
      isDragging: false,
      pointerId: e.pointerId,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (!dragRef.current.isDragging && Math.hypot(dx, dy) > 4) {
      dragRef.current.isDragging = true;
      setIsDragging(true);
    }
    if (dragRef.current.isDragging) {
      const newX = Math.max(12, Math.min(window.innerWidth - 68, dragRef.current.originX + dx));
      const newY = Math.max(12, Math.min(window.innerHeight - 68, dragRef.current.originY + dy));
      setBubblePos({ x: newX, y: newY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    const wasDragging = dragRef.current.isDragging;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    dragRef.current = null;
    setIsDragging(false);

    if (wasDragging) {
      localStorage.setItem("bm_ai_bubble_pos", JSON.stringify(bubblePos));
    } else {
      setOpen((curr) => !curr);
    }
  };

  const handleResetPosition = (e: React.MouseEvent) => {
    e.stopPropagation();
    const defaultPos = getDefaultBubblePos();
    setBubblePos(defaultPos);
    localStorage.setItem("bm_ai_bubble_pos", JSON.stringify(defaultPos));
  };

  // Adaptive Placement Calculation
  const isUpperHalf = typeof window !== "undefined" ? bubblePos.y < window.innerHeight / 2 : false;
  const isLeftHalf = typeof window !== "undefined" ? bubblePos.x < window.innerWidth / 2 : false;

  const suggestions = useMemo(() => {
    switch (resolvedContext) {
      case "workspace":
        return [
          "Which units have arrears over 30 days?",
          "Show active leases expiring in 60 days",
          "What high-priority maintenance is pending?",
        ];
      case "search":
        return [
          "3-bed rentals in East Legon under ₵8,000",
          "Short stays in Cantonments with pool",
          "Commercial office in Airport Residential",
        ];
      case "payments":
        return [
          "Show overdue charges in Airport Residential",
          "Explain payment allocations for unit A12",
          "How do ledger reversals work?",
        ];
      case "documents":
        return [
          "Which leases expire in the next 60 days?",
          "What's the status of Ghana Card verifications?",
          "How do lease deposit releases work?",
        ];
      case "maintenance":
        return [
          "What work orders are breaching SLA?",
          "How do I find certified plumbing contractors?",
          "Show unit AC repair history",
        ];
      default:
        return [
          "3-bed rentals in East Legon under ₵8,000",
          "Which charges are overdue by more than 30 days?",
          "Show leases expiring soon",
        ];
    }
  }, [resolvedContext]);

  useEffect(() => {
    const openPanel = () => setOpen(true);
    window.addEventListener(AI_PANEL_OPEN_EVENT, openPanel);
    return () => window.removeEventListener(AI_PANEL_OPEN_EVENT, openPanel);
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (shouldHideChat(location.pathname)) return null;

  const appendMessage = (
    role: ChatMessage["role"],
    text: string,
    mode?: AiResponseMode
  ) => {
    setMessages((current) => [
      ...current,
      {
        id: `${role}-${Date.now()}-${current.length}`,
        role,
        text,
        ...(mode ? { responseMode: mode } : {}),
      },
    ]);
  };

  const handleAsk = async (preset?: string) => {
    const nextQuery = (preset ?? query).trim();
    if (!nextQuery || loading) return;

    setQuery("");
    appendMessage("user", nextQuery);

    try {
      setLoading(true);

      const assistantRes = await aiAssistantService.askAssistant({
        message: nextQuery,
        context: resolvedContext,
        organizationId: workspaceOrganizationId,
        history: messages.map((message) => ({
          role: message.role,
          content: message.text,
        })),
      });

      setSource(assistantRes.source);
      setResponseMode(assistantRes.responseMode);
      appendMessage("assistant", assistantRes.answer, assistantRes.responseMode);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        left: `${bubblePos.x}px`,
        top: `${bubblePos.y}px`,
        zIndex: 9999,
        touchAction: "none",
      }}
      className="bm-ai-chat select-none"
    >
      {/* Floating Chat Modal (Positioned Adaptively relative to Draggable Bubble) */}
      {open ? (
        <section
          role="dialog"
          aria-label="BaytMiftah REOS Copilot"
          style={{
            position: "absolute",
            ...(isUpperHalf ? { top: "64px" } : { bottom: "64px" }),
            ...(isLeftHalf ? { left: "0px" } : { right: "0px" }),
          }}
          className="flex h-[min(38rem,calc(100dvh-5.5rem))] w-[min(28rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl border border-surface-border bg-surface text-ink shadow-[0_24px_64px_rgba(0,0,0,0.32)] backdrop-blur-2xl animate-in fade-in-0 zoom-in-95 duration-200"
        >
          {/* Header */}
          <header className="flex items-start gap-3 border-b border-surface-border bg-gradient-to-r from-brand-forest via-[#16382c] to-[#1f4a3c] p-4 text-white">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 shadow-inner ring-1 ring-white/20">
              <Sparkles className="h-5 w-5 text-amber-300" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-bold tracking-tight text-white">{copy.title}</h3>
              <p className="mt-0.5 truncate text-xs text-white/80">{copy.description}</p>
              {responseMode === "local_faq" ? (
                <Badge
                  variant="outline"
                  className="mt-1.5 border-amber-300/50 bg-amber-500/15 text-xs text-amber-100"
                >
                  Built-in FAQ (AI model unavailable)
                </Badge>
              ) : responseMode === "llm" && source ? (
                <Badge
                  variant="outline"
                  className="mt-1.5 border-white/30 bg-white/10 text-xs text-white/90"
                >
                  {source === "qwen" ? "Qwen" : "OpenAI"} response
                </Badge>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="rounded-full p-1.5 text-white/70 hover:bg-white/15 hover:text-white transition"
                title="Reset AI position to bottom-right"
                onClick={handleResetPosition}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="rounded-full p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white"
                aria-label="Close BaytMiftah AI"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          {responseMode === "local_faq" ? (
            <div className="px-4 pt-3">
              <DegradedModeBanner tone="warning" className="mb-0">
                Answers use built-in help topics — the live AI model is unavailable.
              </DegradedModeBanner>
            </div>
          ) : null}

          {/* Chat Messages List */}
          <div ref={listRef} className="flex-1 space-y-3.5 overflow-y-auto bg-surface-subtle/40 p-4">
            {messages.length === 0 ? (
              <div className="rounded-2xl border border-surface-border bg-surface p-4 text-sm shadow-sm">
                <div className="flex items-center gap-2 font-semibold text-ink">
                  <Bot className="h-4 w-4 text-primary" />
                  <span>BaytMiftah Assistant</span>
                </div>
                <p className="mt-1.5 text-xs text-ink-secondary leading-relaxed">
                  Ask questions in plain language and get helpful guidance across properties, payments, leases, documents, and maintenance.
                </p>
              </div>
            ) : null}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                    message.role === "user"
                      ? "bg-brand-forest dark:bg-primary text-white font-medium whitespace-pre-wrap"
                      : "bg-surface border border-surface-border text-ink"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.text}</div>
                  {message.role === "assistant" && message.responseMode === "local_faq" ? (
                    <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                      Answered from built-in help topics, not a live AI model.
                    </p>
                  ) : null}
                </div>
              </div>
            ))}

            {loading ? (
              <div className="flex items-center gap-2 text-xs text-ink-secondary bg-surface p-2.5 rounded-xl w-fit border border-surface-border">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                </span>
                <span>Thinking...</span>
              </div>
            ) : null}
          </div>

          {/* Prompt Suggestions & Input */}
          <div className="border-t border-surface-border bg-surface p-3">
            {messages.length === 0 ? (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="flex items-center gap-1 rounded-full border border-surface-border bg-surface-subtle px-2.5 py-1 text-[11px] font-medium text-ink-secondary transition hover:border-primary hover:bg-surface hover:text-ink"
                    onClick={() => void handleAsk(suggestion)}
                  >
                    <span className="truncate max-w-[220px]">{suggestion}</span>
                    <ArrowRight className="h-3 w-3 opacity-60 ml-0.5 shrink-0" />
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.placeholder}
                aria-label="Ask BaytMiftah Assistant"
                className="bg-surface text-ink text-xs h-9"
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleAsk();
                }}
              />
              <Button
                onClick={() => void handleAsk()}
                disabled={loading || !query.trim()}
                size="sm"
                className="h-9 px-3 shrink-0 bg-brand-forest dark:bg-primary text-white font-bold"
              >
                Ask
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {/* Floating AI Trigger Bubble (Draggable) */}
      <div className="relative group cursor-grab active:cursor-grabbing">
        {/* Ambient Pulsing Halo */}
        <div
          className={`pointer-events-none absolute -inset-1.5 rounded-full bg-gradient-to-r from-brand-forest via-emerald-400 to-[#52b788] opacity-50 blur-md transition duration-500 ${
            isDragging ? "opacity-90 scale-110" : "group-hover:opacity-80 animate-pulse"
          }`}
          aria-hidden="true"
        />

        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-brand-forest via-[#184232] to-[#2b644d] dark:from-[#0f2820] dark:via-[#163d30] dark:to-primary text-white shadow-[0_12px_28px_rgba(15,41,34,0.45)] ring-2 ring-white/30 dark:ring-primary/50 transition-transform select-none ${
            isDragging ? "scale-105 cursor-grabbing" : "hover:scale-110 active:scale-95 cursor-grab"
          }`}
          aria-label={open ? "Close BaytMiftah AI" : "Open BaytMiftah AI (Drag to move)"}
          aria-expanded={open}
        >
          {open ? (
            <X className="h-6 w-6 transition-transform duration-200" />
          ) : (
            <div className="relative flex items-center justify-center pointer-events-none">
              <Sparkles className="h-6 w-6 text-amber-300 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
              <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-orange px-1 text-[8px] font-black text-white shadow-sm ring-1 ring-white">
                QL
              </span>
            </div>
          )}
        </button>

        {/* Hover Drag Tooltip when closed */}
        {!open && !isDragging && (
          <div
            className={`pointer-events-none absolute hidden sm:group-hover:block transition-all duration-200 animate-in fade-in-0 ${
              isUpperHalf ? "top-full mt-2" : "bottom-full mb-2"
            } ${isLeftHalf ? "left-0" : "right-0"}`}
          >
            <div className="whitespace-nowrap rounded-xl border border-surface-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-lg flex items-center gap-1.5">
              <GripHorizontal className="h-3.5 w-3.5 text-emerald-500 opacity-80" />
              <span>Drag to move · Click for REOS-QL</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
