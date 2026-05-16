import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Loader2, Megaphone, Search, Shield } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "../components/Navbar";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/textarea";
import { useMobileShell } from "../mobile/MobileShellContext";
import { useAuth } from "../context/AuthContext";
import { publicDiscoveryService, type BuyerRequestBoardEntry } from "../../lib/public-discovery.service";
import { readReferralContext } from "../../lib/referral-context";
import { trackReferralBuyerRequest } from "../../lib/referral-attribution.service";

function formatMoney(amount?: number | null) {
  if (!amount) return "Flexible budget";
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function BuyerRequests() {
  const { isMobileShell } = useMobileShell();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<BuyerRequestBoardEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
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
    setRequests(publicDiscoveryService.getBuyerRequestBoard());
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

      setRequests(publicDiscoveryService.getBuyerRequestBoard());
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
    <div className="min-h-screen bg-background">
      {!isMobileShell && <Navbar />}

      <div className={isMobileShell ? "pt-4 pb-32 px-4" : "pt-24 pb-16 px-4"}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-8">
          <section>
            <Card className="p-8 rounded-[2rem] bg-[linear-gradient(135deg,rgba(255,255,255,1),rgba(246,244,238,1))]">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">
                Buyer Request Board
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight">
                Let buyers describe what they need before they ever see a listing.
              </h1>
              <p className="mt-5 text-lg text-muted-foreground">{helpCopy}</p>

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
                  value={form.location}
                  onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="buyer-request-listing-type" className="block mb-2 text-sm text-foreground">
                      Need
                    </label>
                    <select
                      id="buyer-request-listing-type"
                      className="w-full px-4 py-3 rounded-lg border border-border bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <label htmlFor="buyer-request-notes" className="block mb-2 text-sm text-foreground">
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
                <div className="flex gap-3 flex-wrap">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      <>
                        <Megaphone className="w-4 h-4" />
                        Post Request
                      </>
                    )}
                  </Button>
                  {!user && (
                    <Button variant="outline" type="button" onClick={() => navigate("/login")}>
                      <Shield className="w-4 h-4" />
                      Log In to Save Alerts
                    </Button>
                  )}
                </div>
              </form>
            </Card>
          </section>

          <section>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-primary/80 font-semibold">Live Board</p>
                <h2 className="mt-2 text-3xl font-semibold">Recent buyer requests</h2>
              </div>
              <Button variant="outline" onClick={() => navigate("/search")}>
                <Search className="w-4 h-4" />
                Browse Listings
              </Button>
            </div>

            <div className="mt-6 space-y-4">
              {requests.map((request) => (
                <Card key={request.id} className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {request.buyerLabel} · {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold capitalize">{request.title}</h3>
                    </div>
                    <span className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary capitalize">
                      {request.listingType}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
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
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
