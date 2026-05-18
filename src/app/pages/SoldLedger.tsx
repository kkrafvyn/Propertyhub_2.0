import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  ExternalLink,
  Hash,
  Home,
  Loader2,
  Radio,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import {
  formatBuyerHash,
  formatSoldAmount,
  formatTransactionHash,
  soldAnnouncementService,
  type SoldPropertyAnnouncement,
} from "../../lib/sold-announcement.service";

function formatRelativeTime(value?: string | null) {
  if (!value) return "Recently";

  const diffMs = new Date(value).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, "minute");

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, "hour");

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}

export function SoldLedger() {
  const [announcements, setAnnouncements] = useState<SoldPropertyAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const loadAnnouncements = async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setLoading(true);
      else setRefreshing(true);

      const result = await soldAnnouncementService.getRecentAnnouncements(36, 0);
      setAnnouncements(result.announcements);
      setUnavailable(result.unavailable);
    } catch (error) {
      console.error("Failed to load sold ledger:", error);
      setUnavailable(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadAnnouncements();
  }, []);

  const stats = useMemo(() => {
    const receiptHashCount = announcements.filter((item) => item.receiptHash).length;
    const totalValueMinor = announcements.reduce(
      (total, item) => total + Number(item.soldAmountMinor || 0),
      0
    );
    const uniqueCities = new Set(announcements.map((item) => item.city).filter(Boolean)).size;

    return {
      count: announcements.length,
      receiptHashCount,
      totalValue: formatSoldAmount(totalValueMinor, announcements[0]?.currency || "GHS"),
      uniqueCities,
    };
  }, [announcements]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-16">
        <section className="px-4">
          <div className="mx-auto max-w-7xl">
            <Card className="overflow-hidden border-primary/15 bg-[radial-gradient(circle_at_top_right,rgba(0,122,255,0.16),transparent_28%),linear-gradient(135deg,#ffffff,#f8fafc)]">
              <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="p-8 md:p-12">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    <Radio className="h-3.5 w-3.5" />
                    Sold ledger
                  </div>
                  <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">
                    Public sales, private buyers.
                  </h1>
                  <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                    When a sale closes, BaytMiftah removes the property from active listings and
                    publishes a privacy-safe sale event. The buyer is shown as a hash, not a name.
                  </p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <Button onClick={() => void loadAnnouncements("refresh")} disabled={refreshing}>
                      {refreshing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Refresh feed
                    </Button>
                    <Link to="/search?listingType=sale">
                      <Button variant="outline">
                        Browse active sale listings
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="bg-foreground p-8 text-white md:p-12">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-3xl bg-white/10 p-5">
                      <span className="text-sm text-white/65">Closed sales</span>
                      <strong className="mt-2 block text-3xl">{stats.count}</strong>
                    </div>
                    <div className="rounded-3xl bg-white/10 p-5">
                      <span className="text-sm text-white/65">Receipt hashes</span>
                      <strong className="mt-2 block text-3xl">{stats.receiptHashCount}</strong>
                    </div>
                    <div className="rounded-3xl bg-white/10 p-5">
                      <span className="text-sm text-white/65">Cities</span>
                      <strong className="mt-2 block text-3xl">{stats.uniqueCities}</strong>
                    </div>
                    <div className="rounded-3xl bg-white/10 p-5">
                      <span className="text-sm text-white/65">Published value</span>
                      <strong className="mt-2 block text-2xl">{stats.totalValue}</strong>
                    </div>
                  </div>
                  <p className="mt-6 text-sm leading-7 text-white/70">
                    This is intentionally not a main navigation item. It lives with market trust
                    and discovery so users can find proof without turning the app into a technical console.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section className="mt-10 px-4">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.75fr_1.25fr]">
            <Card className="h-fit p-6">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold">How privacy works</h2>
                  <p className="text-sm text-muted-foreground">Buyer details stay hidden.</p>
                </div>
              </div>
              <div className="mt-6 space-y-4 text-sm leading-7 text-muted-foreground">
                <p>
                  The buyer hash is generated from private sale data and only the shortened hash is
                  shown publicly.
                </p>
                <p>
                  Sold listings are marked as sold and hidden from public search results after the
                  final sale payment or sale-finalized transaction.
                </p>
                <p>
                  Receipt hashes appear when a successful payment receipt has been generated and
                  verified by BaytMiftah.
                </p>
                <p>
                  Receipt proof verifies the payment receipt hash only. It does not replace legal
                  conveyancing, land registry checks, or title transfer review.
                </p>
              </div>
            </Card>

            <div className="space-y-4">
              {loading ? (
                <Card className="p-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin" />
                  Loading public sale events...
                </Card>
              ) : unavailable ? (
                <Card className="p-8">
                  <h2 className="text-xl font-semibold">Sold ledger is waiting on the database migration</h2>
                  <p className="mt-3 text-muted-foreground">
                    Apply the sold-property announcement SQL migration, then finalized sale payments
                    will publish here automatically.
                  </p>
                </Card>
              ) : announcements.length === 0 ? (
                <Card className="p-8">
                  <h2 className="text-xl font-semibold">No public sale events yet</h2>
                  <p className="mt-3 text-muted-foreground">
                    The first finalized sale will appear here with a hashed buyer identity and any
                    available receipt hash.
                  </p>
                </Card>
              ) : (
                announcements.map((announcement) => {
                  const receiptUrl = announcement.verificationUrl;
                  const integrityStatus = announcement.metadata.integrityStatus || null;

                  return (
                    <Card key={announcement.id} className="overflow-hidden">
                      <div className="grid gap-0 md:grid-cols-[1fr_14rem]">
                        <div className="p-6">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="default">Sold</Badge>
                            <Badge variant="outline">Receipt integrity</Badge>
                            {integrityStatus ? (
                              <Badge variant="outline">Integrity {integrityStatus}</Badge>
                            ) : null}
                            <span className="text-sm text-muted-foreground">
                              {formatRelativeTime(announcement.announcedAt)}
                            </span>
                          </div>

                          <h2 className="mt-4 text-2xl font-semibold">{announcement.propertyLabel}</h2>
                          <p className="mt-2 text-muted-foreground">
                            {[announcement.city, announcement.region].filter(Boolean).join(", ") ||
                              "Location private"}
                          </p>

                          <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-border bg-secondary/25 p-4">
                              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                Buyer hash
                              </span>
                              <p className="mt-2 font-mono text-sm">
                                {formatBuyerHash(announcement.buyerHash)}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-border bg-secondary/25 p-4">
                              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                Receipt hash
                              </span>
                              <p className="mt-2 font-mono text-sm">
                                {formatTransactionHash(announcement.receiptHash)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 flex flex-wrap gap-3">
                            {receiptUrl ? (
                              <a
                                href={receiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-border px-3 py-1.5 text-sm text-foreground transition-all duration-200 hover:bg-secondary"
                              >
                                View receipt proof
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            ) : null}
                            <Link to="/search?listingType=sale">
                              <Button variant="outline" size="sm">
                                Find similar active homes
                              </Button>
                            </Link>
                          </div>
                        </div>

                        <div className="border-t border-border bg-secondary/35 p-6 md:border-l md:border-t-0">
                          <div className="grid h-full content-between gap-6">
                            <div>
                              <Hash className="h-8 w-8 text-primary" />
                              <p className="mt-4 text-sm text-muted-foreground">Published amount</p>
                              <p className="mt-1 text-2xl font-semibold">
                                {formatSoldAmount(announcement.soldAmountMinor, announcement.currency)}
                              </p>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <Home className="mb-2 h-4 w-4" />
                              {announcement.metadata.organizationName ||
                                "Verified BaytMiftah workspace"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
