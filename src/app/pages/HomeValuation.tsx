import { useState } from "react";
import { Calculator, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "../components/Navbar";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useMobileShell } from "../mobile/MobileShellContext";
import { publicDiscoveryService, type ValuationEstimate } from "../../lib/public-discovery.service";

function formatMoney(amount?: number | null) {
  if (!amount) return "No estimate";
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function HomeValuation() {
  const { isMobileShell } = useMobileShell();
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState<ValuationEstimate | null>(null);
  const [form, setForm] = useState({
    city: "Accra",
    region: "Greater Accra",
    neighborhood: "",
    propertyType: "apartment",
    bedrooms: "3",
    bathrooms: "2",
    squareMeters: "180",
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.city.trim()) {
      toast.error("Add at least a city to estimate your value.");
      return;
    }

    try {
      setLoading(true);
      const result = await publicDiscoveryService.estimateHomeValue({
        city: form.city.trim(),
        region: form.region.trim(),
        neighborhood: form.neighborhood.trim() || null,
        propertyType: form.propertyType.trim() || null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        squareMeters: form.squareMeters ? Number(form.squareMeters) : null,
      });
      setEstimate(result);
    } catch (error) {
      console.error("Failed to estimate home value:", error);
      toast.error("We could not estimate that home value right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {!isMobileShell && <Navbar />}

      <div className={isMobileShell ? "pt-4 pb-32 px-4" : "pt-24 pb-16 px-4"}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-8">
          <section>
            <Card className="p-8 rounded-[2rem] bg-[linear-gradient(135deg,rgba(255,255,255,1),rgba(246,244,238,1))]">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">
                Home Valuation
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight">
                Get a fast asking-price range from public sale comps in your marketplace.
              </h1>
              <p className="mt-5 text-lg text-muted-foreground">
                This estimate blends nearby public listings, size signals, and local demand context. It works best as a pricing starting point, not a legal valuation.
              </p>

              <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="City"
                    value={form.city}
                    onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                  />
                  <Input
                    label="Region"
                    value={form.region}
                    onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))}
                  />
                </div>
                <Input
                  label="Neighborhood"
                  placeholder="East Legon"
                  value={form.neighborhood}
                  onChange={(event) => setForm((current) => ({ ...current, neighborhood: event.target.value }))}
                />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Input
                    label="Property Type"
                    value={form.propertyType}
                    onChange={(event) => setForm((current) => ({ ...current, propertyType: event.target.value }))}
                  />
                  <Input
                    label="Bedrooms"
                    type="number"
                    min="0"
                    value={form.bedrooms}
                    onChange={(event) => setForm((current) => ({ ...current, bedrooms: event.target.value }))}
                  />
                  <Input
                    label="Bathrooms"
                    type="number"
                    min="0"
                    value={form.bathrooms}
                    onChange={(event) => setForm((current) => ({ ...current, bathrooms: event.target.value }))}
                  />
                  <Input
                    label="Size (sqm)"
                    type="number"
                    min="0"
                    value={form.squareMeters}
                    onChange={(event) => setForm((current) => ({ ...current, squareMeters: event.target.value }))}
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Estimating...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-4 h-4" />
                      Estimate Value
                    </>
                  )}
                </Button>
              </form>
            </Card>
          </section>

          <section>
            <Card className="p-8 min-h-full">
              <h2 className="text-2xl font-semibold">Suggested Asking Range</h2>
              {estimate ? (
                <>
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-border bg-secondary/30 p-5">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Suggested Ask</p>
                      <p className="mt-2 text-3xl font-semibold text-primary">
                        {formatMoney(estimate.suggestedAsk)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-secondary/30 p-5">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Range</p>
                      <p className="mt-2 text-lg font-semibold">
                        {formatMoney(estimate.lowerBound)} - {formatMoney(estimate.upperBound)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-secondary/30 p-5">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Confidence</p>
                      <p className="mt-2 text-3xl font-semibold">{estimate.confidenceLabel}</p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-border bg-primary/5 p-5">
                    <p className="font-medium flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Market context
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">{estimate.insightNote}</p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Comparable listings used: {estimate.comparableCount}. Average comparable price: {formatMoney(estimate.averageComparablePrice)}.
                    </p>
                  </div>

                  <div className="mt-8">
                    <h3 className="text-xl font-semibold">Comparable listings</h3>
                    <div className="mt-4 space-y-3">
                      {estimate.comparables.map((listing) => (
                        <div key={listing.id} className="rounded-2xl border border-border bg-secondary/20 p-4">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                              <p className="font-semibold">{listing.property?.address || "Property"}</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {listing.property?.city}, {listing.property?.region}
                              </p>
                            </div>
                            <p className="text-lg font-semibold text-primary">{formatMoney(listing.price)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-10 rounded-2xl border border-dashed border-border bg-secondary/20 p-8 text-center text-muted-foreground">
                  Enter the property details to generate a pricing range from your public sale comps.
                </div>
              )}
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
