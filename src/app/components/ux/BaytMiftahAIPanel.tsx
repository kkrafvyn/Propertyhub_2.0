import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Sparkles, X } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Badge } from "../ui/badge";
import { aiAssistantService } from "../../../lib/ai-assistant.service";
import type { AiSource } from "../../../lib/ai-assistant.service";
import { clientIntegrations } from "../../../lib/integrations";

export type AIContext =
  | "consumer"
  | "workspace"
  | "search"
  | "property"
  | "documents"
  | "payments"
  | "maintenance";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

const CONTEXT_COPY: Record<
  AIContext,
  { title: string; description: string; placeholder: string }
> = {
  consumer: {
    title: "BaytMiftah AI",
    description: "One assistant across search, My BaytMiftah, documents, and support.",
    placeholder: "Find pet-friendly apartments near East Legon...",
  },
  workspace: {
    title: "BaytMiftah AI",
    description: "Draft listings, prioritize leads, and summarize workspace activity.",
    placeholder: "Show this week's highest-priority leads...",
  },
  search: {
    title: "BaytMiftah AI",
    description: "Describe what you want and we'll translate it into search filters.",
    placeholder: "2 bed rental in Osu under 6000...",
  },
  property: {
    title: "BaytMiftah AI",
    description: "Ask about this property, neighborhood, or next steps.",
    placeholder: "Is this area good for families?",
  },
  documents: {
    title: "BaytMiftah AI",
    description: "Find documents, explain terms, or prepare for signing.",
    placeholder: "Summarize my lease documents...",
  },
  payments: {
    title: "BaytMiftah AI",
    description: "Understand payments, receipts, and transaction status.",
    placeholder: "Explain my latest payment confirmation...",
  },
  maintenance: {
    title: "BaytMiftah AI",
    description: "Describe an issue and get vendor suggestions.",
    placeholder: "My AC is leaking — what should I do?",
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

export function BaytMiftahAIPanel({
  context,
}: {
  context?: AIContext;
  compact?: boolean;
  onNavigate?: (href: string) => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const resolvedContext = context ?? contextFromPath(location.pathname);
  const copy = CONTEXT_COPY[resolvedContext];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<AiSource | null>(null);
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
        return ["Summarize new leads", "Improve listing copy", "Draft follow-up message"];
      case "search":
        return ["Short stay in Accra", "3 bed house under 8000", "Commercial space in Tema"];
      default:
        return ["Find rentals in East Legon", "Check my trip status", "Explain a payment confirmation"];
    }
  }, [resolvedContext]);

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

  const appendMessage = (role: ChatMessage["role"], text: string) => {
    setMessages((current) => [
      ...current,
      { id: `${role}-${Date.now()}-${current.length}`, role, text },
    ]);
  };

  const handleAsk = async (preset?: string) => {
    const nextQuery = (preset ?? query).trim();
    if (!nextQuery || loading) return;

    setQuery("");
    appendMessage("user", nextQuery);

    try {
      setLoading(true);
      const filters = await aiAssistantService.parseSearchQuery(nextQuery);
      const parts = Object.entries(filters).map(([key, value]) => `${key}: ${value}`);

      if (resolvedContext === "search" || Object.keys(filters).length > 0) {
        const href = `/search?q=${encodeURIComponent(nextQuery)}`;
        const answer =
          parts.length > 0
            ? `Parsed as ${parts.join(", ")}. Opening matching listings...`
            : "Opening Explore with your query...";
        appendMessage("assistant", answer);
        navigate(href);
        return;
      }

      const faqAnswer = await aiAssistantService.askAssistant({
        message: nextQuery,
        context: resolvedContext,
        history: messages.map((message) => ({
          role: message.role,
          content: message.text,
        })),
      });
      setSource(faqAnswer.source);
      appendMessage("assistant", faqAnswer.answer);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bm-ai-chat pointer-events-none fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] end-4 z-[90] flex flex-col items-end gap-3 sm:end-6">
      {open ? (
        <section
          role="dialog"
          aria-label="BaytMiftah AI chat"
          className="pointer-events-auto flex h-[min(32rem,calc(100dvh-8rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-brand-forest/15 bg-white shadow-2xl"
        >
          <header className="flex items-start gap-3 border-b border-surface-border bg-brand-forest px-4 py-3 text-white">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-semibold">{copy.title}</h3>
                <Badge className="border-0 bg-white/15 text-[10px] text-white hover:bg-white/15">
                  {smartMode ? providerLabel : "Guided help"}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-white/80">{copy.description}</p>
            </div>
            <button
              type="button"
              className="rounded-full p-1 text-white/80 transition hover:bg-white/10 hover:text-white"
              aria-label="Close BaytMiftah AI"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-surface-subtle/60 px-4 py-4">
            {messages.length === 0 ? (
              <div className="rounded-2xl bg-white p-4 text-sm text-ink-secondary shadow-sm">
                {copy.description}
              </div>
            ) : null}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <p
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    message.role === "user"
                      ? "bg-brand-forest text-white"
                      : "bg-white text-ink shadow-sm"
                  }`}
                >
                  {message.text}
                </p>
              </div>
            ))}
            {loading ? (
              <p className="text-xs text-ink-secondary">Thinking...</p>
            ) : null}
            {source === "local" && !smartMode && messages.length > 0 ? (
              <p className="text-xs text-ink-secondary">{clientIntegrations.ai.hint}</p>
            ) : null}
          </div>

          <div className="border-t border-surface-border bg-white p-3">
            {messages.length === 0 ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="rounded-full border border-surface-border px-3 py-1 text-xs text-ink-secondary transition hover:border-brand-forest/40 hover:bg-brand-forest/5 hover:text-ink"
                    onClick={() => void handleAsk(suggestion)}
                  >
                    {suggestion}
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
                aria-label="Ask BaytMiftah AI"
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleAsk();
                }}
              />
              <Button onClick={() => void handleAsk()} disabled={loading} className="shrink-0">
                Ask
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-forest text-white shadow-lg transition hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-forest"
        aria-label={open ? "Close BaytMiftah AI" : "Open BaytMiftah AI"}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
      </button>
    </div>
  );
}
