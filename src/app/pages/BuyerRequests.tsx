import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Loader2, Megaphone, Search, Shield } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "../components/Navbar";
import { ActionEmptyState, PageLoadingState } from "../components/PageStates";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/textarea";
import { useMobileShell } from "../mobile/MobileShellContext";
import { useAuth } from "../context/AuthContext";
import { publicDiscoveryService, type BuyerRequestBoardEntry } from "../../lib/public-discovery.service";
import { readReferralContext } from "../../lib/referral-context";
import { trackReferralBuyerRequest } from "../../lib/referral-attribution.service";
import { listingService, type PublicLocationSummary } from "../../lib/listing.service";

function formatMoney(amount?: number | null) {
  if (!amount) return "Flexible budget";
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 0,
  }).format(amount);
}

const buyerRequestFlow = ["Describe need", "Match agents", "Receive leads", "Message", "Track"];

export function BuyerRequests() {
  const { isMobileShell } = useMobileShell();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<BuyerRequestBoardEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingBoard, setLoadingBoard] = useState(true);
  const [popularLocations, setPopularLocations] = useState<PublicLocationSummary[]>([]);
  const [form, setForm] = useState({
    buyerName: user?.user_metadata?.full_name || "",
    location: "",
    listingType: "sale" as "rental" | "sale" | "lease",
    propertyType: "apartment",
    budgetMin: "",
    budgetMax: "",
    bedrooms: "",
    notes: "",
    channel: user ? "marketplace" : "anonymous",
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoadingBoard(true);
        const [board, locations] = await Promise.all([
          publicDiscoveryService.getBuyerRequestBoard(),
          listingService.getPopularLocations(8).catch(() => [] as PublicLocationSummary[]),
        ]);

        if (!cancelled) {
          setRequests(board);
          setPopularLocations(locations);
        }
      } catch (error) {
        console.error("Failed to load buyer request board:", error);
        if (!cancelled) {
          toast.error("We could not load the buyer request board right now.");
        }
      } finally {
        if (!cancelled) {
          setLoadingBoard(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const helpCopy = useMemo(() => {
    if (user) {
      return "Post your request and we will also save it as a search alert in your account.";
    }

    return "You can post anonymously for now. Log in later if you want search alerts saved to your account.";
  }, [user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.location.trim() || !form.notes.trim()) {
      toast.error("Add a location and a short brief so agents know what to send.");
      return;
    }

    try {
      setSubmitting(true);
      const result = await publicDiscoveryService.submitBuyerRequest({
        userId: user?.id,
        buyerName: form.buyerName,
        location: form.location.trim(),
        listingType: form.listingType,
        propertyType: form.propertyType,
        budgetMin: form.budgetMin ? Number(form.budgetMin) : null,
        budgetMax: form.budgetMax ? Number(form.budgetMax) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        notes: form.notes.trim(),
        channel: form.channel,
      });

      setRequests((current) => [result.entry, ...current.filter((item) => item.id !== result.entry.id)]);
      setForm((current) => ({
        ...current,
        location: "",
        budgetMin: "",
        budgetMax: "",
        bedrooms: "",
        notes: "",
      }));

      trackReferralBuyerRequest(readReferralContext(), {
        source: "buyer-requests",
        landingPath: "/buyer-requests",
      });

      if (user && result.alertSaved) {
        toast.success("Buyer request posted and saved as a daily alert.");
      } else {
        toast.success("Buyer request posted to the marketplace board.");
      }
    } catch (error) {
      console.error("Failed to submit buyer request:", error);
      toast.error("We could not post that request right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_12%_0%,rgba(255,56,92,0.13),transparent_34rem),linear-gradient(180deg,#fff7fa_0%,#ffffff_44%,#fff7fa_100%)] text-[#171214]">
      {!isMobileShell && <Navbar />}

      <div className={isMobileShell ? "pt-4 pb-32 px-4" : "pt-24 pb-16 px-4"}>
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <section>
            <Card className="rounded-[2.5rem] border-white bg-white/88 p-8 shadow-[0_28px_90px_rgba(255,56,92,0.12)] backdrop-blur-xl">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">
                Buyer Request Board
              </p>
              <h1 className="mt-5 text-4xl font-black leading-[0.98] tracking-[-0.07em] md:text-5xl">
                Let buyers describe what they need before they ever see a listing.
              </h1>
              <p className="mt-5 text-base font-semibold leading-7 text-muted-foreground md:text-lg">{helpCopy}</p>

              <div className="mt-7 flex flex-wrap gap-2">
                {buyerRequestFlow.map((step, index) => (
                  <span
                    key={step}
                    className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-3 py-2 text-xs font-black text-muted-foreground"
                  >
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[0.65rem] text-white">
                      {index + 1}
                    </span>
                    {step}
                  </span>
                ))}
              </div>

              <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                <Input
                  label="Name"
                  placeholder="Ama"
                  value={form.buyerName}
                  onChange={(event) => setForm((current) => ({ ...current, buyerName: event.target.value }))}
                />
                <Input
                  label="Location"
                  placeholder="East Legon, Accra"
                  list="buyer-request-popular-locations"
                  value={form.location}
                  onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                />
                <datalist id="buyer-request-popular-locations">
                  {popularLocations.map((location) => (
                    <option key={`${location.label}-${location.region}`} value={location.label} />
                  ))}
                </datalist>
                {popularLocations.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {popularLocations.slice(0, 6).map((location) => (
                      <button
                        key={`${location.label}-${location.region}`}
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, location: location.label }))}
                        className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:border-primary/30 hover:bg-primary/10"
                      >
                        {location.label}
                      </button>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="buyer-request-listing-type" className="mb-2 block text-sm text-foreground">
                      Need
                    </label>
                    <select
                      id="buyer-request-listing-type"
                      className="w-full rounded-lg border border-border bg-input-background px-4 py-3 text-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                      value={form.listingType}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          listingType: event.target.value as typeof current.listingType,
                        }))
                      }
                    >
                      <option value="sale">Buy</option>
                      <option value="rental">Rent</option>
                      <option value="lease">Lease</option>
                    </select>
                  </div>
                  <Input
                    label="Property Type"
                    placeholder="Apartment"
                    value={form.propertyType}
                    onChange={(event) => setForm((current) => ({ ...current, propertyType: event.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Input
                    label="Budget Min"
                    type="number"
                    min="0"
                    placeholder="500000"
                    value={form.budgetMin}
                    onChange={(event) => setForm((current) => ({ ...current, budgetMin: event.target.value }))}
                  />
                  <Input
                    label="Budget Max"
                    type="number"
                    min="0"
                    placeholder="900000"
                    value={form.budgetMax}
                    onChange={(event) => setForm((current) => ({ ...current, budgetMax: event.target.value }))}
                  />
                  <Input
                    label="Bedrooms"
                    type="number"
                    min="0"
                    placeholder="3"
                    value={form.bedrooms}
                    onChange={(event) => setForm((current) => ({ ...current, bedrooms: event.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="buyer-request-notes" className="mb-2 block text-sm text-foreground">
                    Brief
                  </label>
                  <Textarea
                    id="buyer-request-notes"
                    rows={5}
                    placeholder="Describe the budget, documents you care about, move timeline, and any must-haves."
                    value={form.notes}
                    onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      <>
                        <Megaphone className="h-4 w-4" />
                        Post Request
                      </>
                    )}
                  </Button>
                  {!user && (
                    <Button variant="outline" type="button" onClick={() => navigate("/login")}>
                      <Shield className="h-4 w-4" />
                      Log In to Save Alerts
                    </Button>
                  )}
                </div>
              </form>
            </Card>
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">Live Board</p>
                <h2 className="mt-2 text-3xl font-semibold">Recent buyer requests</h2>
              </div>
              <Button variant="outline" onClick={() => navigate("/search")}>
                <Search className="h-4 w-4" />
                Browse Listings
              </Button>
            </div>

            <div className="mt-6 space-y-4">
              {loadingBoard ? (
                <PageLoadingState label="Loading buyer demand..." />
              ) : requests.length === 0 ? (
                <ActionEmptyState
                  icon={Megaphone}
                  eyebrow="No public requests yet"
                  title="Be the first buyer brief on the demand board."
                  description="Post the location, budget, property type, and must-haves so agencies can match you with inventory before it appears in search."
                  actions={
                    <Button type="button" variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                      Write a Request
                    </Button>
                  }
                />
              ) : (
                requests.map((request) => (
                  <Card key={request.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {request.buyerLabel} / {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                        <h3 className="mt-2 text-xl font-semibold capitalize">{request.title}</h3>
                      </div>
                      <span className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold capitalize text-primary">
                        {request.listingType}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Location</p>
                        <p className="mt-2 font-semibold">{request.location}</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Budget</p>
                        <p className="mt-2 font-semibold">
                          {request.budgetMin || request.budgetMax
                            ? `${formatMoney(request.budgetMin)} - ${formatMoney(request.budgetMax)}`
                            : "Flexible"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Bedrooms</p>
                        <p className="mt-2 font-semibold">
                          {request.bedrooms != null ? request.bedrooms : "Open"}
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">{request.notes}</p>
                  </Card>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
