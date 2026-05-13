import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Brain, Send, MessageSquare, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Badge } from "@/app/components/ui/badge";
import { useAuth } from "@/app/context/AuthContext";
import { aiAssistantService } from "@/lib/ai-assistant.service";
import { listingService } from "@/lib/listing.service";

export function AIAssistant() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [workflowOutput, setWorkflowOutput] = useState("");

  useEffect(() => {
    if (!user) {
      setLoadingRecommendations(false);
      return;
    }

    let cancelled = false;

    const loadRecommendations = async () => {
      try {
        if (!cancelled) setLoadingRecommendations(true);
        const data = await aiAssistantService.getRecommendations(user.id, 5);
        if (!cancelled) {
          setRecommendations(data || []);
        }
      } catch (error) {
        console.error("Failed to load recommendations:", error);
        if (!cancelled) {
          setRecommendations([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingRecommendations(false);
        }
      }
    };

    loadRecommendations();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;

    setLoading(true);

    try {
      const query = searchQuery.trim();
      const filters = await aiAssistantService.parseSearchQuery(query);
      const searchResults = await listingService.searchListings(filters, 8, 0);

      await aiAssistantService.logSearch(user.id, null, query, searchResults.length);

      setResults(searchResults);
      setChatHistory((current) => [
        ...current,
        { role: "user", content: query },
        {
          role: "assistant",
          content:
            searchResults.length > 0
              ? `I found ${searchResults.length} matching properties. Open any result to keep the conversation moving.`
              : "I didn't find a matching property yet. Try broadening the location or budget.",
        },
      ]);
      setSearchQuery("");
    } catch (error) {
      console.error("Failed to search:", error);
      toast.error("The assistant couldn't complete that search.");
    } finally {
      setLoading(false);
    }
  };

  const handleRecommendationClick = async (recommendation: any) => {
    try {
      await aiAssistantService.trackRecommendationClick(recommendation.id);
    } catch (error) {
      console.error("Failed to track recommendation click:", error);
    }

    if (recommendation.listing_id) {
      navigate(`/property/${recommendation.listing_id}`);
    }
  };

  const handleWorkflowAction = (action: "follow_up" | "summary" | "pricing") => {
    const latestUserPrompt = [...chatHistory].reverse().find((item) => item.role === "user")?.content;
    const topResult = results[0];
    const topRecommendation = recommendations[0];

    if (action === "follow_up") {
      setWorkflowOutput(
        topResult
          ? `Draft follow-up:\n\nHi ${
              user?.user_metadata?.full_name || "team"
            },\nThanks for the interest in ${topResult.property?.address || "the property"}. The next best step is to confirm viewing availability and clarify budget expectations before sending payment instructions.\n\nSuggested CTA: Would you like us to lock a viewing slot this week?`
          : "Run a search first so the assistant can draft a follow-up tied to a real property."
      );
      return;
    }

    if (action === "summary") {
      setWorkflowOutput(
        latestUserPrompt
          ? `Lead intent summary:\n\nThe latest request was "${latestUserPrompt}". The buyer/renter is likely optimizing for ${
              results[0]?.listing_type || "property type"
            }, location, and budget fit. Recommended next action: confirm must-haves, offer 2-3 shortlisted listings, and move quickly to a viewing request.`
          : "Start a search or recommendation flow first so the assistant has context to summarize."
      );
      return;
    }

    setWorkflowOutput(
      topRecommendation
        ? `Pricing angle:\n\n${
            topRecommendation.listing?.property?.address || "This recommended listing"
          } appears to fit current user behavior strongly. Consider emphasizing the value story around ${
            topRecommendation.listing?.property?.city || "the location"
          } and timing urgency if inventory is limited.`
        : "Recommendations will power pricing and positioning guidance once the assistant has enough user behavior."
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Property Assistant</h1>
        <p className="text-muted-foreground mt-2">
          Search listings in natural language and use your saved behavior to guide the next step.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4 h-96 flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {chatHistory.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Try a prompt like "3 bedroom rental in East Legon under 8000"</p>
                  </div>
                </div>
              ) : (
                chatHistory.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-md px-3 py-2 rounded-lg ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Input
                placeholder="Try: 2 bedroom apartment for sale in Osu under 900000"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              />
              <Button onClick={handleSearch} disabled={loading || !searchQuery.trim()} size="sm">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </Card>

          {results.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Results ({results.length})</h3>
                <Badge variant="outline">Live listing search</Badge>
              </div>
              {results.map((result) => (
                <Card key={result.id} className="p-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">
                          {result.property?.address || "Property listing"}
                        </h4>
                        <Badge variant="outline" className="capitalize">
                          {result.listing_type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {result.property?.bedrooms ?? "N/A"} bed | {result.property?.bathrooms ?? "N/A"} bath |{" "}
                        {result.property?.city}, {result.property?.region}
                      </p>
                      <p className="text-lg font-bold mt-2">
                        GHS {result.price.toLocaleString()}
                        {result.listing_type === "rental" ? "/month" : ""}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/property/${result.id}`)}>
                      View
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-4">Recommended for You</h2>
            <div className="space-y-3">
              {loadingRecommendations ? (
                <Card className="p-4 text-center text-muted-foreground">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50 animate-pulse" />
                  <p className="text-sm">Loading recommendations...</p>
                </Card>
              ) : recommendations.length === 0 ? (
                <Card className="p-4 text-center text-muted-foreground">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Search a few times and recommendations will start to appear.</p>
                </Card>
              ) : (
                recommendations.map((recommendation) => (
                  <Card
                    key={recommendation.id}
                    className="p-3 cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleRecommendationClick(recommendation)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-sm">
                          {recommendation.listing?.property?.address || "Recommended property"}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {recommendation.reason || "Matches your recent search behavior."}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {recommendation.listing?.property?.city}, {recommendation.listing?.property?.region}
                        </p>
                      </div>
                      <Badge
                        variant={
                          recommendation.confidence_score > 0.8
                            ? "default"
                            : recommendation.confidence_score > 0.6
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {Math.round((recommendation.confidence_score || 0) * 100)}%
                      </Badge>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          <Card className="p-4 bg-secondary/50">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Prompt Ideas</h3>
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>3 bedroom rental in East Legon under 8000</li>
              <li>office space for sale in Accra</li>
              <li>family house with 4 bedrooms in Tema</li>
              <li>commercial property near Cantonments</li>
            </ul>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Copilot Workflows</h3>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <Button size="sm" variant="outline" onClick={() => handleWorkflowAction("follow_up")}>
                Draft Follow-up
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleWorkflowAction("summary")}>
                Summarize Intent
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleWorkflowAction("pricing")}>
                Pricing Angle
              </Button>
            </div>
            <div className="rounded-lg bg-secondary/40 p-3 min-h-[140px]">
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {workflowOutput || "Use the quick workflows to draft responses and next-step guidance from current search context."}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
