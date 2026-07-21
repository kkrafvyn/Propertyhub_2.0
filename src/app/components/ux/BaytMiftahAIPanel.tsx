import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Sparkles } from "lucide-react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { aiAssistantService } from "../../../lib/ai-assistant.service";

export type AIContext =
  | "consumer"
  | "workspace"
  | "search"
  | "property"
  | "documents"
  | "payments"
  | "maintenance";

const CONTEXT_COPY: Record<
  AIContext,
  { title: string; description: string; placeholder: string; exploreLabel?: string; exploreHref?: string }
> = {
  consumer: {
    title: "BaytMiftah AI",
    description: "One assistant across search, My BaytMiftah, documents, and support.",
    placeholder: "Find pet-friendly apartments near East Legon...",
    exploreLabel: "Open Explore with AI",
    exploreHref: "/search",
  },
  workspace: {
    title: "BaytMiftah AI",
    description: "Draft listings, prioritize leads, and summarize workspace activity.",
    placeholder: "Show this week's highest-priority leads...",
    exploreLabel: "Open AI Assistant",
    exploreHref: undefined,
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
    description: "Understand payments, escrow, and receipts.",
    placeholder: "Explain my escrow hold...",
  },
  maintenance: {
    title: "BaytMiftah AI",
    description: "Describe an issue and get vendor suggestions.",
    placeholder: "My AC is leaking — what should I do?",
  },
};

export function BaytMiftahAIPanel({
  context = "consumer",
  compact = false,
  onNavigate,
}: {
  context?: AIContext;
  compact?: boolean;
  onNavigate?: (href: string) => void;
}) {
  const copy = CONTEXT_COPY[context];
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const suggestions = useMemo(() => {
    switch (context) {
      case "workspace":
        return ["Summarize new leads", "Improve listing copy", "Draft follow-up message"];
      case "search":
        return ["Short stay in Accra", "3 bed house under 8000", "Commercial space in Tema"];
      default:
        return ["Find rentals in East Legon", "Check my trip status", "Explain escrow"];
    }
  }, [context]);

  const handleAsk = async () => {
    if (!query.trim()) return;

    try {
      setLoading(true);
      const filters = await aiAssistantService.parseSearchQuery(query);
      const parts = Object.entries(filters).map(([key, value]) => `${key}: ${value}`);

      if (context === "search" || Object.keys(filters).length > 0) {
        const href = `/search?q=${encodeURIComponent(query.trim())}`;
        setAnswer(
          parts.length > 0
            ? `Parsed as ${parts.join(", ")}. Opening matching listings...`
            : "Opening Explore with your query..."
        );
        if (onNavigate) onNavigate(href);
        else window.location.href = href;
        return;
      }

      setAnswer(
        "BaytMiftah AI can help with search, documents, payments, and maintenance. Try a specific question or open Explore."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={`${compact ? "p-4" : "p-6"} border-primary/20 bg-primary/5`}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-primary" aria-hidden="true" />
        <h3 className="font-semibold">{copy.title}</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{copy.description}</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.placeholder}
          aria-label="Ask BaytMiftah AI"
          onKeyDown={(event) => {
            if (event.key === "Enter") void handleAsk();
          }}
        />
        <Button onClick={() => void handleAsk()} disabled={loading} className="sm:min-w-24">
          {loading ? "Thinking..." : "Ask"}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="text-xs rounded-full border border-border px-3 py-1 hover:bg-background transition-colors"
            onClick={() => {
              setQuery(suggestion);
            }}
          >
            {suggestion}
          </button>
        ))}
      </div>
      {answer ? <p className="text-sm mt-4">{answer}</p> : null}
      {copy.exploreHref ? (
        <Link to={copy.exploreHref} className="inline-block mt-4">
          <Button variant="outline" size="sm">
            {copy.exploreLabel}
          </Button>
        </Link>
      ) : null}
    </Card>
  );
}
