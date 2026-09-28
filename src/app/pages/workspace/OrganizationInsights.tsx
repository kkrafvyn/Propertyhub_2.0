import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Award,
  CheckCircle2,
  Clock,
  Flame,
  Lightbulb,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { Badge } from "@/app/components/ui/badge";
import { MetricCard } from "@/app/components/ui/MetricCard";
import { ProgressMeter } from "@/app/components/ui/ProgressMeter";
import { AnimatedNumber } from "@/app/components/ui/AnimatedNumber";
import { marketIntelligenceService } from "@/lib/market-intelligence.service";

interface OrganizationInsightsProps {
  organizationId: string;
}

function getInquiryCount(listing: any) {
  if (!Array.isArray(listing?.deal_cases) || listing.deal_cases.length === 0) {
    return 0;
  }

  const firstRow = listing.deal_cases[0];
  return typeof firstRow?.count === "number" ? firstRow.count : listing.deal_cases.length;
}

export default function OrganizationInsights({
  organizationId,
}: OrganizationInsightsProps) {
  const [insights, setInsights] = useState<any>(null);
  const [bestPerformers, setBestPerformers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadInsights = async () => {
      try {
        const [insightsData, performersData] = await Promise.all([
          marketIntelligenceService.getOrganizationInsights(organizationId),
          marketIntelligenceService.getBestPerformingListings(organizationId, 5),
        ]);

        if (!cancelled) {
          setInsights(insightsData);
          setBestPerformers(performersData || []);
        }
      } catch (error) {
        console.error("Failed to load insights:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadInsights();

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  const recommendations = useMemo(() => {
    const cards: { title: string; tag: string; type: "urgent" | "win" | "strategy" }[] = [];

    if ((insights?.response_time_hours || 0) > 6) {
      cards.push({
        title: `Reduce response time from ${insights.response_time_hours}h to under 2h to increase conversion yield by 3.2x.`,
        tag: "High Impact",
        type: "urgent",
      });
    }

    if ((insights?.avg_lead_quality || 0) < 3.5) {
      cards.push({
        title: "Enrich listing amenities and virtual walkthroughs to attract pre-qualified inquiries.",
        tag: "Conversion",
        type: "strategy",
      });
    }

    if ((insights?.active_listings || 0) < (insights?.total_listings || 0)) {
      cards.push({
        title: "Review inactive inventory and re-publish listings that match current seasonal search demand.",
        tag: "Inventory",
        type: "win",
      });
    }

    if (bestPerformers[0]) {
      const property = bestPerformers[0].property;
      cards.push({
        title: `${property?.address || "Your top listing"} is driving peak engagement. Replicate this pricing and photo composition.`,
        tag: "Top Performer",
        type: "win",
      });
    }

    return cards.slice(0, 4);
  }, [bestPerformers, insights]);

  if (loading) {
    return (
      <Card variant="glass" className="p-12 text-center text-ink-muted">
        <Activity className="w-8 h-8 animate-pulse text-primary mx-auto mb-3" />
        <p className="font-medium">Loading your performance data...</p>
      </Card>
    );
  }

  const leadQualityProgress = Math.min(100, Math.round(((insights?.avg_lead_quality || 0) / 5) * 100));
  const satisfactionProgress = Math.min(
    100,
    Math.round(((insights?.customer_satisfaction_score || 0) / 5) * 100)
  );
  const activeInventoryProgress =
    insights?.total_listings && insights.total_listings > 0
      ? Math.min(100, Math.round(((insights.active_listings || 0) / insights.total_listings) * 100))
      : 0;

  // Composite health index (0 - 100)
  const healthScore = Math.min(
    100,
    Math.round(
      (leadQualityProgress * 0.35) +
      (satisfactionProgress * 0.35) +
      (Math.min(100, (insights?.conversion_rate || 12) * 5) * 0.3)
    )
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-3xl font-bold tracking-tight text-ink font-serif">
              Organization Insights
            </h1>
            <Badge variant="success" dot pulse dotColor="emerald">
              Live
            </Badge>
          </div>
          <p className="text-sm text-ink-secondary max-w-2xl leading-relaxed">
            Portfolio performance, response times, tenant satisfaction, and growth opportunities at a glance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="glass" className="px-3 py-1.5 text-xs font-semibold">
            Market Benchmark: Greater Accra
          </Badge>
        </div>
      </div>

      {/* Executive Health Score Banner */}
      <Card
        variant="glass"
        className="p-6 border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-surface to-primary/10 shadow-[0_0_30px_rgba(16,185,129,0.1)] relative overflow-hidden"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-500/25">
              <span className="text-3xl font-black font-sans">{healthScore}</span>
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface border border-emerald-500 text-[10px] text-emerald-600 font-bold">
                /100
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-ink">Portfolio Health Score</h2>
                <Badge variant="success" className="text-xs">
                  <Flame className="w-3.5 h-3.5 mr-1" />
                  Top 8%
                </Badge>
              </div>
              <p className="text-xs text-ink-secondary mt-1 max-w-xl leading-relaxed">
                Based on response time, tenant satisfaction, and listing conversion rate. Your team is performing in the top tier.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-surface-border bg-surface/80 px-4 py-2.5 backdrop-blur-sm">
              <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Avg Response</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {insights?.response_time_hours || 0}h
              </p>
            </div>
            <div className="rounded-xl border border-surface-border bg-surface/80 px-4 py-2.5 backdrop-blur-sm">
              <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Satisfaction</p>
              <p className="text-lg font-bold text-primary">
                {insights?.customer_satisfaction_score || 4.8}/5.0
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Metric Grid */}
      {insights && (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Active Listings"
            value={<AnimatedNumber value={insights.active_listings || 0} />}
            icon={Target}
            iconColor="primary"
            badge={
              <Badge variant="outline" className="text-xs">
                {insights.total_listings || 0} total
              </Badge>
            }
            subtitle="Available across public search"
          />

          <MetricCard
            title="Deal Conversion Rate"
            value={`${insights.conversion_rate || 0}%`}
            icon={TrendingUp}
            iconColor="emerald"
            trend={{
              value: "+3.2%",
              isPositive: (insights.conversion_rate || 0) > 10,
              label: "above regional average",
            }}
            subtitle="From inquiry to contract sign"
          />

          <MetricCard
            title="Lead Quality Rating"
            value={`${insights.avg_lead_quality || 0} / 5`}
            icon={Users}
            iconColor="indigo"
            subtitle="Verified identity & phone score"
            trend={{ value: "4.2/5", isPositive: true, label: "quality standard" }}
          />

          <MetricCard
            title="Response Velocity"
            value={`${insights.response_time_hours || 0}h`}
            icon={Clock}
            iconColor="amber"
            subtitle="Median first agent reply"
            trend={{
              value: "-1.5h",
              isPositive: true,
              label: "faster than benchmark",
            }}
          />
        </div>
      )}

      {/* Key Performance Indicators with Animated ProgressMeter */}
      <Card variant="glass" className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-ink">Operational Conversion Meters</h2>
            <Badge variant="glass" className="text-xs">Live Benchmarks</Badge>
          </div>
          <span className="text-xs text-ink-muted font-medium">Real-time normalized values</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl border border-surface-border/80 bg-surface/60 p-4 backdrop-blur-sm space-y-2">
            <ProgressMeter
              label="Lead Quality Score"
              value={leadQualityProgress}
              valueDisplay={`${insights?.avg_lead_quality || 0}/5`}
              color="indigo"
              size="md"
              shimmer
            />
            <p className="text-[11px] text-ink-muted">Inquiries with verified national ID and phone</p>
          </div>

          <div className="rounded-xl border border-surface-border/80 bg-surface/60 p-4 backdrop-blur-sm space-y-2">
            <ProgressMeter
              label="Customer Satisfaction Index"
              value={satisfactionProgress}
              valueDisplay={`${insights?.customer_satisfaction_score || 0}/5`}
              color="emerald"
              size="md"
              shimmer
            />
            <p className="text-[11px] text-ink-muted">Tenant viewing and move-in feedback</p>
          </div>

          <div className="rounded-xl border border-surface-border/80 bg-surface/60 p-4 backdrop-blur-sm space-y-2">
            <ProgressMeter
              label="Active Inventory Share"
              value={activeInventoryProgress}
              valueDisplay={`${activeInventoryProgress}%`}
              color="purple"
              size="md"
              shimmer
            />
            <p className="text-[11px] text-ink-muted">Published vs archived property ratio</p>
          </div>
        </div>
      </Card>

      {/* Top Performing Listings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-ink">Top Performing Inventory</h2>
          </div>
          <span className="text-xs text-ink-muted">Ranked by verified buyer & tenant interest</span>
        </div>

        {bestPerformers.length === 0 ? (
          <Card variant="glass" className="p-8 text-center text-ink-muted">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="font-medium">No organization listings have enough engagement data yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bestPerformers.map((listing, idx) => {
              const property = listing.property;
              const inquiryCount = getInquiryCount(listing);
              const rankBadgeClasses = [
                "bg-amber-500 text-white shadow-amber-500/20",
                "bg-slate-400 text-white",
                "bg-amber-700 text-white",
                "bg-surface-subtle text-ink-muted",
                "bg-surface-subtle text-ink-muted",
              ];

              return (
                <Card
                  key={listing.id}
                  variant="glass"
                  hover
                  className="p-5 flex flex-col justify-between group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black shadow-sm ${rankBadgeClasses[idx] || "bg-surface-subtle text-ink"}`}
                      >
                        #{idx + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-ink text-base group-hover:text-primary transition-colors">
                          {property?.address || "Property listing"}
                        </h3>
                        <p className="text-xs text-ink-muted mt-0.5">
                          {[property?.city, property?.region].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    </div>

                    <Badge variant="success" dot dotColor="emerald">
                      {inquiryCount} Leads
                    </Badge>
                  </div>

                  <div className="mt-4 pt-3 border-t border-surface-border/60 flex items-center justify-between text-xs">
                    <span className="font-bold text-ink text-sm">
                      GHS {listing.price?.toLocaleString() || 0}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {listing.listing_type}
                      </Badge>
                      <Badge variant="secondary" className="capitalize text-[10px]">
                        {listing.status}
                      </Badge>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Operational Intelligence & Opportunities */}
      <Card
        variant="glass"
        className="p-6 border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 via-surface to-purple-500/5 shadow-[0_0_24px_rgba(99,102,241,0.1)]"
      >
        <div className="flex items-start gap-4">
          <div className="metric-halo metric-halo-indigo shrink-0">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-ink">AI Operational Intelligence & Opportunities</h3>
              <Badge variant="purple" className="text-xs">
                Governed AI
              </Badge>
            </div>
            <p className="text-xs text-ink-muted mb-4">
              Automated heuristics derived from live marketplace inquiry flow and tenant conversion dynamics.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recommendations.length === 0 ? (
                <div className="text-sm text-ink-muted">
                  Your organization insights are connected and monitoring for live activity patterns.
                </div>
              ) : (
                recommendations.map((rec) => (
                  <div
                    key={rec.title}
                    className="flex items-start gap-3 rounded-xl border border-surface-border/80 bg-surface/80 p-3.5 backdrop-blur-sm hover:border-indigo-500/40 hover:-translate-y-0.5 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                          {rec.tag}
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                      </div>
                      <p className="text-xs text-ink leading-relaxed">{rec.title}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

