import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Sparkles,
  X,
  ArrowRight,
  Bot,
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
    title: "BaytMiftah Assistant",
    description: "Plain-language help across properties, payments, leases, and maintenance.",
    placeholder: "Ask how to find a home, review a lease, or report an issue...",
  },
  workspace: {
    title: "Workspace REOS Assistant",
    description: "Plain-language guidance for portfolio units, occupancies, and leads.",
    placeholder: "Ask about units, occupancies, or leads...",
  },
  search: {
    title: "BaytMiftah Assistant",
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
    <div className="bm-ai-chat fixed end-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-40 md:end-6 md:bottom-6">
      {/* Dock the panel above its launcher, within the available viewport. */}
      {open ? (
        <section
          role="dialog"
          aria-label="BaytMiftah Assistant"
          style={{ position: "absolute", bottom: "64px", right: 0 }}
          className="flex h-[min(38rem,calc(100dvh-12rem))] md:h-[min(38rem,calc(100dvh-6rem))] w-[min(28rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl border border-surface-border bg-surface text-ink shadow-[0_24px_64px_rgba(0,0,0,0.32)] backdrop-blur-2xl animate-in fade-in-0 zoom-in-95 duration-200"
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

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="bm-ai-launcher flex h-12 w-12 items-center justify-center rounded-full border border-surface-border bg-surface text-ink shadow-lg transition hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        aria-label={open ? "Close BaytMiftah AI" : "Open BaytMiftah AI"}
        aria-expanded={open}
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </button>
    </div>
  );
}
