import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowRightLeft,
  BarChart3,
  Bell,
  Brain,
  Building2,
  Calculator,
  CalendarDays,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  FileSignature,
  Globe2,
  HandCoins,
  Loader2,
  MapPinned,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { currencyService } from "../../../lib/currency.service";
import { internationalPaymentService } from "../../../lib/international-payment.service";
import { buildMaintenanceSummary, maintenanceOpsService } from "../../../lib/maintenance-ops.service";
import {
  aiConciergeService,
  buyerGroupService,
  escrowMilestoneService,
} from "../../../lib/production-depth.service";
import {
  buildReferralPerformanceSnapshot,
  getStoredReferralEvents,
} from "../../../lib/referral-attribution.service";
import {
  buildAffordabilityPlanGuardrails,
  buildContributorMonetizationPreview,
  buildInvestmentScorePreview,
  getReferralRewardStatusDisplay,
} from "../../../lib/competitive-operations.service";
import {
  trustVerificationService,
  type TrustRequestType,
} from "../../../lib/trust-verification.service";
import {
  buildDealTimeline,
  buildDiasporaChecklist,
  buildAiConciergePrompts,
  buildBuyerNegotiationPlan,
  buildBuyingGroupPlan,
  buildInspectionChecklist,
  buildRemoteBuyerReadiness,
  buildRentVsBuyAnalysis,
  buildViewingPrepPlan,
  buildEscrowMilestones,
  buildPropertyComparisonRows,
  buildReferralLink,
  calculateMonthlyMortgage,
  estimateClosingCosts,
  formatCaseType,
  formatLabel,
  formatMoney,
  formatRelativeTime,
  getMaintenancePlaybooks,
  getNeighborhoodSnapshot,
  parseOfferSummary,
  type ComparisonProperty,
} from "../expansion/feature-helpers";

function toComparisonProperty(item: any): ComparisonProperty | null {
  const listing = item?.listing || item;
  const property = listing?.property;
  if (!listing || !property) return null;

  return {
    id: listing.id,
    title: property.address || "Property",
    address: property.address || "Unknown address",
    city: property.city || "Unknown city",
    region: property.region || "Unknown region",
    neighborhood: property.neighborhood || null,
    price: Number(listing.price || 0),
    currency: listing.currency || "GHS",
    listingType: listing.listing_type || null,
    category: property.category || null,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    squareMeters: property.square_meters,
    amenities: property.amenities || [],
    qualityScore: listing.quality_score,
    floodRiskLevel: property.flood_risk_level,
    locationConfidence: property.location_confidence,
  };
}

interface PropertyComparisonPanelProps {
  savedProperties: any[];
}

export function PropertyComparisonPanel({ savedProperties }: PropertyComparisonPanelProps) {
  const compareOptions = useMemo(
    () =>
      savedProperties
        .map(toComparisonProperty)
        .filter((item): item is ComparisonProperty => Boolean(item)),
    [savedProperties]
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (selectedIds.length > 0) return;
    setSelectedIds(compareOptions.slice(0, 3).map((item) => item.id));
  }, [compareOptions, selectedIds.length]);

  const selectedProperties = compareOptions.filter((item) => selectedIds.includes(item.id)).slice(0, 3);
  const comparisonRows = useMemo(
    () => buildPropertyComparisonRows(selectedProperties),
    [selectedProperties]
  );

  const toggleProperty = (propertyId: string) => {
    setSelectedIds((current) => {
      if (current.includes(propertyId)) {
        return current.filter((id) => id !== propertyId);
      }
      if (current.length >= 3) {
        toast.error("Compare up to three properties at a time.");
        return current;
      }
      return [...current, propertyId];
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Property Comparison</h2>
        <p className="mt-1 text-muted-foreground">
          Compare up to three saved properties on price, trust, size, and market context.
        </p>
      </div>

      {compareOptions.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Save properties first, then compare them side by side here.
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {compareOptions.map((property) => {
              const insight = getNeighborhoodSnapshot(property);
              const isSelected = selectedIds.includes(property.id);

              return (
                <Card
                  key={property.id}
                  className={`p-5 transition-colors ${isSelected ? "border-primary bg-primary/5" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{property.address}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {property.city}, {property.region}
                      </p>
                    </div>
                    <Badge variant={isSelected ? "default" : "outline"}>
                      {isSelected ? "Selected" : "Optional"}
                    </Badge>
                  </div>
                  <p className="mt-4 text-lg font-semibold">
                    {formatMoney(property.price, property.currency || "GHS")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{formatLabel(property.category)}</span>
                    <span>{property.bedrooms ?? 0} beds</span>
                    <span>{property.squareMeters || "N/A"} sqm</span>
                  </div>
                  {insight && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      {insight.notes}
                    </p>
                  )}
                  <Button
                    className="mt-4 w-full"
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => toggleProperty(property.id)}
                  >
                    {isSelected ? "Included in Comparison" : "Add to Comparison"}
                  </Button>
                </Card>
              );
            })}
          </div>

          {selectedProperties.length > 0 && (
            <Card className="overflow-x-auto p-0">
              <table className="min-w-full text-sm">
                <thead className="border-b border-border bg-secondary/30">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Metric</th>
                    {selectedProperties.map((property) => (
                      <th key={property.id} className="px-4 py-3 text-left">
                        <div className="max-w-[180px]">
                          <p className="font-semibold">{property.address}</p>
                          <p className="text-xs text-muted-foreground">{property.city}</p>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.label} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-3 font-medium">{row.label}</td>
                      {row.values.map((value, index) => (
                        <td key={`${row.label}-${index}`} className="px-4 py-3 text-muted-foreground">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

interface BuyerToolkitPanelProps {
  savedProperties: any[];
  dealCases: any[];
}

export function BuyerToolkitPanel({ savedProperties, dealCases }: BuyerToolkitPanelProps) {
  const focusListing = savedProperties[0]?.listing || dealCases[0]?.listing || null;
  const focusProperty = focusListing?.property || null;
  const [monthlyIncome, setMonthlyIncome] = useState("18000");
  const [depositPercent, setDepositPercent] = useState("20");
  const [termYears, setTermYears] = useState("20");
  const [annualRate, setAnnualRate] = useState("18");
  const [rentAlternative, setRentAlternative] = useState("6000");
  const [ownershipYears, setOwnershipYears] = useState("5");
  const [targetCurrency, setTargetCurrency] = useState("USD");
  const [region, setRegion] = useState("US");
  const [convertedPrice, setConvertedPrice] = useState<number | null>(null);

  useEffect(() => {
    if (!focusListing?.price) {
      setConvertedPrice(null);
      return;
    }

    let cancelled = false;

    const loadConvertedPrice = async () => {
      try {
        const nextPrice = await currencyService.convertCurrency(
          Number(focusListing.price),
          focusListing.currency || "GHS",
          targetCurrency
        );
        if (!cancelled) setConvertedPrice(nextPrice);
      } catch (error) {
        console.error("Failed to convert focus listing price:", error);
        if (!cancelled) setConvertedPrice(null);
      }
    };

    void loadConvertedPrice();

    return () => {
      cancelled = true;
    };
  }, [focusListing?.currency, focusListing?.price, targetCurrency]);

  const depositAmount = useMemo(() => {
    const price = Number(focusListing?.price || 0);
    const percent = Number(depositPercent || 0);
    return (price * percent) / 100;
  }, [dealCases, depositPercent, focusListing?.price]);

  const financedAmount = Math.max(Number(focusListing?.price || 0) - depositAmount, 0);
  const monthlyPayment = calculateMonthlyMortgage(
    financedAmount,
    Number(annualRate || 0),
    Number(termYears || 0)
  );
  const rentVsBuy = useMemo(
    () =>
      buildRentVsBuyAnalysis({
        purchasePrice: Number(focusListing?.price || 0),
        monthlyRent: Number(rentAlternative || 0),
        depositPercent: Number(depositPercent || 0),
        annualRatePercent: Number(annualRate || 0),
        termYears: Number(termYears || 0),
        ownershipYears: Number(ownershipYears || 0),
      }),
    [
      annualRate,
      depositPercent,
      focusListing?.price,
      ownershipYears,
      rentAlternative,
      termYears,
    ]
  );
  const closingCostEstimate = useMemo(
    () =>
      estimateClosingCosts({
        price: Number(focusListing?.price || 0),
        listingType: focusListing?.listing_type,
        inspectionFee: Number(focusListing?.inspection_fee_amount || 0),
      }),
    [focusListing?.inspection_fee_amount, focusListing?.listing_type, focusListing?.price]
  );
  const focusMediaItems = useMemo(
    () => focusProperty?.media || focusProperty?.property_media || [],
    [focusProperty]
  );
  const remoteReadiness = useMemo(
    () =>
      buildRemoteBuyerReadiness({
        listing: focusListing,
        property: focusProperty,
        mediaItems: focusMediaItems,
      }),
    [focusListing, focusMediaItems, focusProperty]
  );
  const inspectionChecklist = useMemo(
    () =>
      buildInspectionChecklist({
        listing: focusListing,
        property: focusProperty,
        mediaItems: focusMediaItems,
      }),
    [focusListing, focusMediaItems, focusProperty]
  );
  const affordabilityRatio =
    Number(monthlyIncome || 0) > 0 ? monthlyPayment / Number(monthlyIncome) : 0;
  const paymentConfig = internationalPaymentService.getPaymentConfig(targetCurrency, region);
  const neighborhoodInsight = getNeighborhoodSnapshot(
    focusProperty
      ? {
          city: focusProperty.city,
          region: focusProperty.region,
          neighborhood: focusProperty.neighborhood,
        }
      : null
  );
  const mediaEvidenceScore = Math.min(
    100,
    focusMediaItems.length * 12 +
      (focusMediaItems.some((item: any) =>
        ["video", "virtual_tour", "floor_plan"].includes(item.media_type)
      )
        ? 25
        : 0)
  );
  const negotiationPlan = useMemo(
    () =>
      buildBuyerNegotiationPlan({
        listing: focusListing,
        property: focusProperty,
        trustScore: focusListing?.quality_score,
        readinessScore: remoteReadiness.score,
        mediaReadinessScore: mediaEvidenceScore,
        closingReserve: closingCostEstimate.recommendedReserve,
        activeDemand: neighborhoodInsight?.demandLevel,
      }),
    [
      closingCostEstimate.recommendedReserve,
      focusListing,
      focusProperty,
      mediaEvidenceScore,
      neighborhoodInsight?.demandLevel,
      remoteReadiness.score,
    ]
  );
  const viewingPrepPlan = useMemo(
    () =>
      buildViewingPrepPlan({
        listing: focusListing,
        property: focusProperty,
        mediaItems: focusMediaItems,
        readinessScore: remoteReadiness.score,
      }),
    [focusListing, focusMediaItems, focusProperty, remoteReadiness.score]
  );
  const diasporaChecklist = buildDiasporaChecklist(focusListing?.listing_type);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Buyer Finance & Diaspora Tools</h2>
        <p className="mt-1 text-muted-foreground">
          Model affordability, preview cross-border payment options, and plan a remote closing path.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Affordability Planner</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Monthly Income"
              type="number"
              value={monthlyIncome}
              onChange={(event) => setMonthlyIncome(event.target.value)}
            />
            <Input
              label="Deposit %"
              type="number"
              value={depositPercent}
              onChange={(event) => setDepositPercent(event.target.value)}
            />
            <Input
              label="Term (Years)"
              type="number"
              value={termYears}
              onChange={(event) => setTermYears(event.target.value)}
            />
            <Input
              label="Interest Rate %"
              type="number"
              value={annualRate}
              onChange={(event) => setAnnualRate(event.target.value)}
            />
            <Input
              label="Rent Alternative"
              type="number"
              value={rentAlternative}
              onChange={(event) => setRentAlternative(event.target.value)}
            />
            <Input
              label="Hold Period (Years)"
              type="number"
              value={ownershipYears}
              onChange={(event) => setOwnershipYears(event.target.value)}
            />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Deposit</p>
              <p className="mt-2 text-lg font-semibold">
                {formatMoney(depositAmount, focusListing?.currency || "GHS")}
              </p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Monthly Estimate</p>
              <p className="mt-2 text-lg font-semibold">
                {formatMoney(monthlyPayment, focusListing?.currency || "GHS")}
              </p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Income Ratio</p>
              <p className="mt-2 text-lg font-semibold">
                {affordabilityRatio > 0 ? `${Math.round(affordabilityRatio * 100)}%` : "N/A"}
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Keep housing costs under roughly 35% of monthly income for a healthier buffer.
          </p>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Globe2 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Diaspora Buyer Mode</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-foreground">Target Currency</label>
              <select
                className="w-full rounded-lg border border-border bg-input-background px-4 py-3"
                value={targetCurrency}
                onChange={(event) => setTargetCurrency(event.target.value)}
              >
                {currencyService.getSupportedCurrencies().map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} · {currency.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-foreground">Buyer Region</label>
              <select
                className="w-full rounded-lg border border-border bg-input-background px-4 py-3"
                value={region}
                onChange={(event) => setRegion(event.target.value)}
              >
                {["US", "GB", "EU", "AE", "GH", "CA"].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-border p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Converted Target</p>
            <p className="mt-2 text-xl font-semibold">
              {convertedPrice != null
                ? formatMoney(convertedPrice, targetCurrency, { maximumFractionDigits: 2 })
                : "Add a focus property to see conversion"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Best payment rails:{" "}
              {paymentConfig.availableMethods.slice(0, 4).map((method) => method.name).join(", ") || "No live options"}
            </p>
          </div>

          <div className="mt-4 space-y-2">
            {diasporaChecklist.map((item) => (
              <div key={item} className="flex gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Rent vs Buy Decision</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Ownership / Month</p>
              <p className="mt-2 text-lg font-semibold">
                {formatMoney(rentVsBuy.monthlyOwnershipCost, focusListing?.currency || "GHS")}
              </p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Rent / Month</p>
              <p className="mt-2 text-lg font-semibold">
                {formatMoney(rentVsBuy.monthlyRentCost, focusListing?.currency || "GHS")}
              </p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Est. Equity</p>
              <p className="mt-2 text-lg font-semibold">
                {formatMoney(rentVsBuy.equityAfterPeriod, focusListing?.currency || "GHS")}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{rentVsBuy.recommendation}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {rentVsBuy.breakEvenYears
              ? `Modeled break-even: about ${rentVsBuy.breakEvenYears} year(s).`
              : "Break-even depends on rent, price growth, financing, and closing cost assumptions."}
          </p>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Closing Reserve</h3>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Recommended Reserve</p>
            <p className="mt-2 text-2xl font-semibold text-primary">
              {formatMoney(closingCostEstimate.recommendedReserve, focusListing?.currency || "GHS")}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{closingCostEstimate.guidance}</p>
          </div>
          <div className="mt-4 space-y-3">
            {closingCostEstimate.lineItems.map((item) => (
              <div key={item.label} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-sm font-semibold">
                    {formatMoney(item.amount, focusListing?.currency || "GHS")}
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{item.helper}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Remote Buyer Readiness</h3>
          </div>
          <Badge variant={remoteReadiness.label === "Ready" ? "default" : "outline"}>
            {remoteReadiness.score}/100 {remoteReadiness.label}
          </Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {remoteReadiness.checks.map((check) => (
            <div
              key={check.label}
              className={`rounded-xl border p-3 ${
                check.complete ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/20"
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle2
                  className={`h-4 w-4 ${check.complete ? "text-primary" : "text-muted-foreground"}`}
                />
                <p className="text-sm font-medium">{check.label}</p>
              </div>
              <p className="text-xs text-muted-foreground">{check.helper}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {inspectionChecklist.slice(0, 4).map((item) => (
            <div key={item.label} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{item.label}</p>
                <Badge variant={item.priority === "urgent" ? "destructive" : "outline"}>
                  {formatLabel(item.priority)}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{item.helper}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Negotiation & Viewing Playbook</h3>
          </div>
          <Badge variant={negotiationPlan.confidence === "Strong" ? "default" : "outline"}>
            {negotiationPlan.confidence} - {negotiationPlan.leverage}
          </Badge>
        </div>
        <div className="grid gap-4 lg:grid-cols-[0.95fr,1.05fr]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Open", value: negotiationPlan.anchor },
                { label: "Target", value: negotiationPlan.target },
                { label: "Stretch", value: negotiationPlan.stretch },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-lg font-semibold">
                    {formatMoney(item.value, focusListing?.currency || "GHS")}
                  </p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-medium">Suggested message</p>
              <p className="mt-2 text-sm text-muted-foreground">{negotiationPlan.message}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {negotiationPlan.signals.map((signal) => (
                <div key={signal.label} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{signal.label}</p>
                    <Badge variant={signal.stance === "risk" ? "destructive" : "outline"}>
                      {formatLabel(signal.stance)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{signal.helper}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <p className="font-medium">{viewingPrepPlan.mode} viewing plan</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{viewingPrepPlan.headline}</p>
            </div>
            <div className="space-y-3">
              {viewingPrepPlan.checklist.slice(0, 4).map((item) => (
                <div key={item.label} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{item.label}</p>
                    <Badge variant={item.priority === "urgent" ? "destructive" : "outline"}>
                      {formatLabel(item.priority)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{item.helper}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-secondary/30 p-4">
              <p className="text-sm font-medium">Next best actions</p>
              <div className="mt-3 space-y-2">
                {negotiationPlan.nextSteps.slice(0, 3).map((step) => (
                  <div key={step} className="flex gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <MapPinned className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Neighborhood Intelligence</h3>
        </div>

        {!focusProperty || !neighborhoodInsight ? (
          <p className="text-sm text-muted-foreground">
            Save or open a property in Accra or Kumasi to unlock local demand, flood, access, and livability hints here.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Demand</p>
              <p className="mt-2 text-lg font-semibold">{formatLabel(neighborhoodInsight.demandLevel)}</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Flood Risk</p>
              <p className="mt-2 text-lg font-semibold">{formatLabel(neighborhoodInsight.floodRiskLevel)}</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Accessibility</p>
              <p className="mt-2 text-lg font-semibold">{neighborhoodInsight.accessibilityScore}/5</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Walkability</p>
              <p className="mt-2 text-lg font-semibold">{neighborhoodInsight.walkabilityScore}/5</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

interface DealRoomsPanelProps {
  user: { id: string; email?: string | null; user_metadata?: Record<string, any> } | null;
  dealCases: any[];
  propertyTransactions: any[];
  propertyViewings: any[];
  documents: any[];
  conversations: any[];
}

export function DealRoomsPanel({
  user,
  dealCases,
  propertyTransactions,
  propertyViewings,
  documents,
  conversations,
}: DealRoomsPanelProps) {
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(dealCases[0]?.id || null);
  const [persistedMilestones, setPersistedMilestones] = useState<any[]>([]);
  const [loadingMilestones, setLoadingMilestones] = useState(false);
  const [updatingMilestoneId, setUpdatingMilestoneId] = useState<string | null>(null);
  const selectedCase = dealCases.find((dealCase) => dealCase.id === selectedCaseId) || null;
  const selectedDocuments = documents.filter((document) => document.deal_case_id === selectedCase?.id);
  const selectedPayments = propertyTransactions.filter(
    (payment) =>
      payment.listing_id === selectedCase?.listing_id ||
      payment.organization_id === selectedCase?.organization_id
  );
  const selectedViewings = propertyViewings.filter(
    (viewing) =>
      viewing.deal_case_id === selectedCase?.id || viewing.listing_id === selectedCase?.listing_id
  );
  const selectedConversation = conversations.find((conversation) =>
    conversation.messages?.some((message: any) =>
      String(message.content || "").includes(selectedCase?.listing?.property?.address || "")
    )
  );
  const timeline = useMemo(
    () =>
      buildDealTimeline({
        dealCase: selectedCase,
        viewings: selectedViewings,
        payments: selectedPayments,
        documents: selectedDocuments,
        messages: selectedConversation?.messages || [],
      }),
    [selectedCase, selectedConversation?.messages, selectedDocuments, selectedPayments, selectedViewings]
  );
  const selectedOfferSummary = useMemo(
    () =>
      selectedCase?.case_type === "purchase_offer"
        ? parseOfferSummary(selectedCase.message)
        : null,
    [selectedCase?.case_type, selectedCase?.message]
  );
  const milestoneChecklist = useMemo(
    () => [
      {
        label: "Inquiry opened",
        complete: Boolean(selectedCase),
        helper: "The deal room is active.",
      },
      {
        label: "Viewing confirmed",
        complete: selectedViewings.some((viewing) =>
          ["confirmed", "completed"].includes(viewing.status)
        ),
        helper: "Lock the walkthrough or virtual tour.",
      },
      {
        label: "Offer or terms captured",
        complete: Boolean(selectedOfferSummary || selectedCase?.message),
        helper: "Keep offer terms in the timeline.",
      },
      {
        label: "Documents linked",
        complete: selectedDocuments.length > 0,
        helper: "Attach offer letters, ID, title, or lease drafts.",
      },
      {
        label: "Payment proof",
        complete: selectedPayments.some((payment) => payment.status === "success"),
        helper: "Track receipts and verified payment status.",
      },
    ],
    [selectedCase, selectedDocuments.length, selectedOfferSummary, selectedPayments, selectedViewings]
  );

  useEffect(() => {
    if (selectedCaseId || dealCases.length === 0) return;
    setSelectedCaseId(dealCases[0].id);
  }, [dealCases, selectedCaseId]);

  useEffect(() => {
    if (!user || !selectedCase?.id) {
      setPersistedMilestones([]);
      return;
    }

    let cancelled = false;

    const loadMilestones = async () => {
      try {
        setLoadingMilestones(true);
        const milestones = await escrowMilestoneService.ensureDefaultMilestones({
          dealCase: selectedCase,
          createdBy: user.id,
        });
        if (!cancelled) setPersistedMilestones(milestones);
      } catch (error) {
        console.error("Failed to load escrow milestones:", error);
        if (!cancelled) setPersistedMilestones([]);
      } finally {
        if (!cancelled) setLoadingMilestones(false);
      }
    };

    void loadMilestones();

    return () => {
      cancelled = true;
    };
  }, [selectedCase?.id, user?.id]);

  const handleMilestoneStatus = async (
    milestoneId: string,
    status: "pending" | "in_progress" | "completed" | "blocked" | "waived"
  ) => {
    try {
      setUpdatingMilestoneId(milestoneId);
      const updated = await escrowMilestoneService.updateMilestoneStatus(milestoneId, status);
      setPersistedMilestones((current) =>
        current.map((milestone) => (milestone.id === milestoneId ? updated : milestone))
      );
      toast.success("Payment milestone updated.");
    } catch (error) {
      console.error("Failed to update escrow milestone:", error);
      toast.error("We couldn't update that milestone yet.");
    } finally {
      setUpdatingMilestoneId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Deal Rooms</h2>
        <p className="mt-1 text-muted-foreground">
          Keep offers, viewings, signatures, and payment proof tied to each live opportunity.
        </p>
      </div>

      {dealCases.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Once you start inquiries, applications, or offers, they’ll appear here as private deal rooms.
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <Card className="p-4">
            <div className="space-y-3">
              {dealCases.map((dealCase) => (
                <button
                  key={dealCase.id}
                  type="button"
                  onClick={() => setSelectedCaseId(dealCase.id)}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${
                    selectedCaseId === dealCase.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {dealCase.listing?.property?.address || "Deal room"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatCaseType(dealCase.case_type)}
                      </p>
                    </div>
                    <Badge variant="outline">{formatLabel(dealCase.pipeline_stage || dealCase.status)}</Badge>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Updated {formatRelativeTime(dealCase.updated_at || dealCase.created_at)}
                  </p>
                </button>
              ))}
            </div>
          </Card>

          {selectedCase && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Stage</p>
                  <p className="mt-2 text-lg font-semibold">{formatLabel(selectedCase.pipeline_stage || selectedCase.status)}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Viewings</p>
                  <p className="mt-2 text-lg font-semibold">{selectedViewings.length}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Payments</p>
                  <p className="mt-2 text-lg font-semibold">{selectedPayments.length}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Documents</p>
                  <p className="mt-2 text-lg font-semibold">{selectedDocuments.length}</p>
                </Card>
              </div>

              {selectedOfferSummary && (
                <div className="grid gap-4 md:grid-cols-4">
                  <Card className="p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Offer Amount</p>
                    <p className="mt-2 text-lg font-semibold">
                      {formatMoney(selectedOfferSummary.amount, selectedCase.listing?.currency || "GHS")}
                    </p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Financing</p>
                    <p className="mt-2 text-lg font-semibold">{formatLabel(selectedOfferSummary.financing)}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Close Target</p>
                    <p className="mt-2 text-lg font-semibold">{selectedOfferSummary.targetCloseDate || "Flexible"}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Next Follow-up</p>
                    <p className="mt-2 text-lg font-semibold">
                      {selectedCase.next_follow_up_at
                        ? formatRelativeTime(selectedCase.next_follow_up_at)
                        : "Awaiting update"}
                    </p>
                  </Card>
                </div>
              )}

              <Card className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Deal Checklist</h3>
                </div>
                <div className="grid gap-3 md:grid-cols-5">
                  {milestoneChecklist.map((milestone) => (
                    <div
                      key={milestone.label}
                      className={`rounded-xl border p-3 ${
                        milestone.complete
                          ? "border-primary/30 bg-primary/5"
                          : "border-border bg-secondary/20"
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <CheckCircle2
                          className={`h-4 w-4 ${
                            milestone.complete ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                        <p className="text-sm font-medium">{milestone.label}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{milestone.helper}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Protected Payment Path</h3>
                  </div>
                  {loadingMilestones && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                {!user ? (
                  <p className="text-sm text-muted-foreground">
                    Sign in to persist escrow and handoff milestones for this deal room.
                  </p>
                ) : persistedMilestones.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Safe-payment milestones will appear here once the deal room is ready.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {persistedMilestones.map((milestone) => (
                      <div key={milestone.id} className="rounded-xl border border-border p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">{milestone.label}</p>
                              <Badge variant={milestone.status === "completed" ? "default" : "outline"}>
                                {formatLabel(milestone.status)}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {milestone.metadata?.guidance ||
                                "Keep this step complete before payment release or handoff."}
                            </p>
                            {milestone.due_at && (
                              <p className="mt-2 text-xs text-muted-foreground">
                                Target {new Date(milestone.due_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {milestone.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={updatingMilestoneId === milestone.id}
                                onClick={() => void handleMilestoneStatus(milestone.id, "in_progress")}
                              >
                                Start
                              </Button>
                            )}
                            {milestone.status !== "completed" && (
                              <Button
                                size="sm"
                                disabled={updatingMilestoneId === milestone.id}
                                onClick={() => void handleMilestoneStatus(milestone.id, "completed")}
                              >
                                Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <FileSignature className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Timeline</h3>
                </div>
                <div className="space-y-4">
                  {timeline.map((event) => (
                    <div key={event.id} className="flex gap-3 rounded-xl border border-border p-4">
                      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{event.title}</p>
                          <Badge variant="outline">{formatLabel(event.type)}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <MessageSquareText className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Conversation & Documents</h3>
                  </div>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    {selectedOfferSummary?.notes && (
                      <div className="rounded-xl border border-border p-3">
                        <p className="font-medium text-foreground">Buyer note</p>
                        <p className="mt-2">{selectedOfferSummary.notes}</p>
                      </div>
                    )}
                    <p>
                      {selectedConversation
                        ? `${selectedConversation.messages?.length || 0} tracked messages are attached to this lead flow.`
                        : "Lead conversation will appear here once the listing team replies in-app."}
                    </p>
                    <p>
                      {selectedDocuments.length > 0
                        ? `${selectedDocuments.filter((document) => document.status === "signed").length} document(s) already signed.`
                        : "No offer letters or agreements have been published into this room yet."}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Link to="/app/messages">
                        <Button variant="outline" size="sm">
                          Open Messages
                        </Button>
                      </Link>
                      <Link to="/app/payments">
                        <Button variant="outline" size="sm">
                          Open Payments
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>

                <Card className="p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Recommended Next Move</h3>
                  </div>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p>
                      {selectedOfferSummary
                        ? selectedCase.pipeline_stage === "negotiation"
                          ? "Your offer is actively in negotiation. Keep proof of funds, title questions, and timeline changes in this room so nothing gets lost."
                          : selectedCase.pipeline_stage === "payment_pending"
                            ? "Terms are moving forward. The next useful move is payment proof or a signed offer letter."
                            : "Watch for the team review note, then use this room to keep pricing, documents, and payment steps aligned."
                        : selectedViewings.length === 0
                          ? "Book a viewing first so the team can lock logistics before discussing terms."
                          : selectedPayments.length === 0
                            ? "Push the conversation toward deposit, booking fee, or proof-of-funds collection."
                            : "Keep documents, receipts, and signature requests together until the handoff is complete."}
                    </p>
                    <p>
                      If you are remote, use this room as the single source of truth for approvals, receipts, and signed paperwork.
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface TrustVerificationPanelProps {
  user: { id: string; email?: string | null } | null;
  dealCases: any[];
  documents: any[];
}

const TRUST_REQUEST_OPTIONS: Array<{
  type: TrustRequestType;
  label: string;
  helper: string;
}> = [
  {
    type: "ghana_card",
    label: "Ghana Card / ID",
    helper: "Confirm buyer identity before offers, signing, or remote close.",
  },
  {
    type: "tax_identity",
    label: "Tax Identity",
    helper: "Useful for higher-value purchases and formal sale contracts.",
  },
  {
    type: "property_title",
    label: "Title / Mandate Check",
    helper: "Ask the listing team to connect title, mandate, or ownership proof.",
  },
  {
    type: "address_verification",
    label: "Address Verification",
    helper: "Confirm address confidence before viewing, payment, or handoff.",
  },
];

export function TrustVerificationPanel({
  user,
  dealCases,
  documents,
}: TrustVerificationPanelProps) {
  const eligibleDealCases = useMemo(
    () => dealCases.filter((dealCase) => dealCase.organization_id),
    [dealCases]
  );
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState(eligibleDealCases[0]?.id || "");
  const [requestType, setRequestType] = useState<TrustRequestType>("ghana_card");
  const [summary, setSummary] = useState(
    "I want to complete buyer verification so the listing team can move faster on offers, documents, and payment review."
  );
  const selectedDeal = useMemo(
    () => eligibleDealCases.find((dealCase) => dealCase.id === selectedDealId) || null,
    [eligibleDealCases, selectedDealId]
  );
  const relatedDocuments = useMemo(
    () =>
      documents.filter(
        (document) =>
          document.deal_case_id === selectedDeal?.id ||
          document.listing_id === selectedDeal?.listing_id
      ),
    [documents, selectedDeal]
  );
  const verifiedCount = requests.filter((request) => request.status === "verified").length;
  const pendingCount = requests.filter((request) =>
    ["submitted", "in_review", "needs_changes"].includes(request.status)
  ).length;

  useEffect(() => {
    if (!user) {
      setLoadingRequests(false);
      return;
    }

    let cancelled = false;

    const loadRequests = async () => {
      try {
        setLoadingRequests(true);
        const rows = await trustVerificationService.getUserTrustRequests(user.id);
        if (!cancelled) setRequests(rows);
      } catch (error) {
        console.error("Failed to load trust requests:", error);
        if (!cancelled) setRequests([]);
      } finally {
        if (!cancelled) setLoadingRequests(false);
      }
    };

    void loadRequests();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (selectedDealId || eligibleDealCases.length === 0) return;
    setSelectedDealId(eligibleDealCases[0].id);
  }, [eligibleDealCases, selectedDealId]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!user) {
      toast.error("Sign in before submitting verification.");
      return;
    }

    if (!selectedDeal) {
      toast.error("Start a deal or inquiry before requesting verification.");
      return;
    }

    try {
      setSubmitting(true);
      const request = await trustVerificationService.submitTrustRequest({
        organizationId: selectedDeal.organization_id,
        listingId: selectedDeal.listing_id,
        documentId: relatedDocuments[0]?.id || null,
        requestType,
        submittedBy: user.id,
        publicSummary: summary.trim(),
        internalNotes: `Buyer-side verification request from ${user.email || user.id}`,
        evidence: {
          source: "user_dashboard",
          dealCaseId: selectedDeal.id,
          email: user.email || null,
          listingAddress: selectedDeal.listing?.property?.address || null,
          relatedDocumentIds: relatedDocuments.map((document) => document.id),
        },
      });

      setRequests((current) => [request, ...current]);
      toast.success("Verification request submitted.");
    } catch (error) {
      console.error("Failed to submit verification request:", error);
      toast.error("We couldn't submit that verification request yet.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Trust & Verification</h2>
        <p className="mt-1 text-muted-foreground">
          Prepare buyer identity checks, title questions, and address verification before money or signatures move.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Verified</p>
          <p className="mt-2 text-2xl font-semibold">{verifiedCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">In Progress</p>
          <p className="mt-2 text-2xl font-semibold">{pendingCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Deal Rooms</p>
          <p className="mt-2 text-2xl font-semibold">{eligibleDealCases.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Linked Docs</p>
          <p className="mt-2 text-2xl font-semibold">{documents.length}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Submit Verification Request</h3>
          </div>

          {eligibleDealCases.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Start an inquiry, application, or offer first. Verification requests need a listing team so the right workspace can review them.
            </p>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm text-foreground" htmlFor="trust-deal-case">
                  Deal / Listing
                </label>
                <select
                  id="trust-deal-case"
                  className="w-full rounded-lg border border-border bg-input-background px-4 py-3"
                  value={selectedDealId}
                  onChange={(event) => setSelectedDealId(event.target.value)}
                >
                  {eligibleDealCases.map((dealCase) => (
                    <option key={dealCase.id} value={dealCase.id}>
                      {dealCase.listing?.property?.address || formatCaseType(dealCase.case_type)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-foreground" htmlFor="trust-request-type">
                  Verification Type
                </label>
                <select
                  id="trust-request-type"
                  className="w-full rounded-lg border border-border bg-input-background px-4 py-3"
                  value={requestType}
                  onChange={(event) => setRequestType(event.target.value as TrustRequestType)}
                >
                  {TRUST_REQUEST_OPTIONS.map((option) => (
                    <option key={option.type} value={option.type}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-sm text-muted-foreground">
                  {TRUST_REQUEST_OPTIONS.find((option) => option.type === requestType)?.helper}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm text-foreground" htmlFor="trust-request-summary">
                  Request Notes
                </label>
                <textarea
                  id="trust-request-summary"
                  className="min-h-[120px] w-full rounded-lg border border-border bg-input-background px-4 py-3"
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                />
              </div>

              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Submit Verification
                  </>
                )}
              </Button>
            </form>
          )}
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Verification Readiness</h3>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            {[
              "Upload scanned ID or proof documents from the mobile field kit.",
              "Keep all title, mandate, or address questions in the selected deal room.",
              "Use verified receipts and public trust documents before large transfers.",
              "For diaspora buyers, ask for a virtual walkthrough and attorney review trail.",
            ].map((item) => (
              <div key={item} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Request History</h3>
        </div>
        {loadingRequests ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading verification requests...
          </div>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No verification requests yet. Submit one when a deal needs identity, title, or address review.
          </p>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div key={request.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold">{formatLabel(request.request_type)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {request.listing?.property?.address ||
                        request.organization?.name ||
                        "Verification request"}
                    </p>
                  </div>
                  <Badge variant={request.status === "verified" ? "default" : "outline"}>
                    {formatLabel(request.status)}
                  </Badge>
                </div>
                {request.public_summary ? (
                  <p className="mt-3 text-sm text-muted-foreground">{request.public_summary}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

interface UserInsightsPanelProps {
  savedProperties: any[];
  dealCases: any[];
  propertyTransactions: any[];
  propertyViewings: any[];
  savedAlerts: any[];
  conversations: any[];
}

export function UserInsightsPanel({
  savedProperties,
  dealCases,
  propertyTransactions,
  propertyViewings,
  savedAlerts,
  conversations,
}: UserInsightsPanelProps) {
  const activeDeals = dealCases.filter(
    (dealCase) => !["closed", "rejected"].includes(dealCase.status)
  );
  const successfulPayments = propertyTransactions.filter(
    (transaction) => transaction.status === "success"
  );
  const unreadMessages = conversations.reduce(
    (count, conversation) =>
      count +
      (conversation.messages?.filter((message: any) => !message.read).length || 0),
    0
  );
  const completedViewings = propertyViewings.filter(
    (viewing) => viewing.status === "completed"
  ).length;
  const activeAlerts = savedAlerts.filter((alert) => alert.is_active).length;
  const totalPaidMinor = successfulPayments.reduce(
    (sum, transaction) => sum + Number(transaction.amount_minor || 0),
    0
  );
  const nextBestActions = [
    activeDeals.length === 0
      ? "Start or revive a deal room from saved properties."
      : "Review active deal rooms and push the next follow-up forward.",
    propertyViewings.length === 0
      ? "Book at least one viewing before negotiating."
      : `${completedViewings}/${propertyViewings.length} viewings completed.`,
    activeAlerts === 0
      ? "Turn one saved search into an active alert."
      : `${activeAlerts} alerts are watching the market for you.`,
    unreadMessages > 0
      ? `Reply to ${unreadMessages} unread message${unreadMessages === 1 ? "" : "s"}.`
      : "Message inbox is currently caught up.",
  ];
  const focusListing = savedProperties[0]?.listing || dealCases[0]?.listing || null;
  const focusProperty = focusListing?.property || null;
  const focusInsight = getNeighborhoodSnapshot(
    focusProperty
      ? {
          city: focusProperty.city,
          region: focusProperty.region,
          neighborhood: focusProperty.neighborhood,
        }
      : null
  );
  const estimatedRentalYieldPercent = focusInsight?.investmentScore
    ? Number((focusInsight.investmentScore * 1.8).toFixed(1))
    : null;
  const investmentPreview = buildInvestmentScorePreview({
    price: Number(focusListing?.price || 0),
    rentalYieldPercent: estimatedRentalYieldPercent,
    locationConfidence: focusProperty?.location_confidence || null,
    documentVerified: ["verified", "approved"].includes(String(focusListing?.verification_status || "")),
    marketDemand: focusInsight?.demandLevel || null,
  });
  const affordabilityGuardrails = buildAffordabilityPlanGuardrails({
    planType: focusListing?.listing_type === "sale" ? "installment_purchase" : "weekly_rent",
    providerKey: "payment_service",
    legalReviewRequired: true,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Buyer Insights</h2>
        <p className="mt-1 text-muted-foreground">
          A lightweight command center for saved demand, deal movement, payments, and follow-up health.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2 text-primary">
            <Building2 className="h-5 w-5" />
            <span className="text-sm font-medium">Shortlist</span>
          </div>
          <p className="text-3xl font-semibold">{savedProperties.length}</p>
          <p className="mt-2 text-sm text-muted-foreground">Saved properties</p>
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2 text-primary">
            <BarChart3 className="h-5 w-5" />
            <span className="text-sm font-medium">Pipeline</span>
          </div>
          <p className="text-3xl font-semibold">{activeDeals.length}</p>
          <p className="mt-2 text-sm text-muted-foreground">Active deal rooms</p>
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2 text-primary">
            <CreditCard className="h-5 w-5" />
            <span className="text-sm font-medium">Payments</span>
          </div>
          <p className="text-3xl font-semibold">
            {formatMoney(totalPaidMinor, "GHS", { isMinor: true })}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Verified paid volume</p>
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2 text-primary">
            <Bell className="h-5 w-5" />
            <span className="text-sm font-medium">Alerts</span>
          </div>
          <p className="text-3xl font-semibold">{activeAlerts}</p>
          <p className="mt-2 text-sm text-muted-foreground">Active search watchers</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Next Best Actions</h3>
          </div>
          <div className="space-y-3">
            {nextBestActions.map((action) => (
              <div key={action} className="flex gap-2 rounded-xl border border-border p-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                <span>{action}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Momentum Score</h3>
          </div>
          <p className="text-4xl font-semibold">
            {Math.min(
              100,
              savedProperties.length * 8 +
                activeDeals.length * 18 +
                propertyViewings.length * 12 +
                successfulPayments.length * 20 +
                activeAlerts * 6
            )}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Based on saved properties, active deals, viewings, successful payments, and market alerts.
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Investment Score Preview</h3>
          </div>
          <p className="text-4xl font-semibold">{investmentPreview.score}/100</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Confidence {investmentPreview.confidence}/100 - {formatLabel(investmentPreview.status)}
          </p>
          <div className="mt-4 space-y-2">
            {investmentPreview.drivers.map((driver) => (
              <div key={driver} className="rounded-xl border border-border p-3 text-sm text-muted-foreground">
                {driver}
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{investmentPreview.disclosure}</p>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <HandCoins className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Affordability Plan Guardrails</h3>
          </div>
          <Badge variant={affordabilityGuardrails.canGoLive ? "default" : "outline"}>
            {affordabilityGuardrails.canGoLive ? "Can go live" : "Legal/provider review"}
          </Badge>
          <p className="mt-3 font-medium">{affordabilityGuardrails.label}</p>
          <div className="mt-4 space-y-2">
            {affordabilityGuardrails.guardrails.map((guardrail) => (
              <div key={guardrail} className="rounded-xl border border-border p-3 text-sm text-muted-foreground">
                {guardrail}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

interface ConciergePanelProps {
  user: { id: string; email?: string | null; user_metadata?: Record<string, any> } | null;
  savedProperties: any[];
  dealCases: any[];
  propertyViewings: any[];
  documents: any[];
}

export function ConciergePanel({
  user,
  savedProperties,
  dealCases,
  propertyViewings,
  documents,
}: ConciergePanelProps) {
  const focusListing = savedProperties[0]?.listing || dealCases[0]?.listing || null;
  const focusDeal = dealCases[0] || null;
  const prompts = useMemo(() => buildAiConciergePrompts(focusListing), [focusListing]);
  const escrowMilestones = useMemo(
    () =>
      buildEscrowMilestones({
        listingType: focusListing?.listing_type,
        hasViewing: propertyViewings.length > 0,
        hasOffer: dealCases.some((dealCase) => dealCase.case_type === "purchase_offer"),
        hasDocuments: documents.length > 0,
        hasPayment: false,
        hasVerification: documents.some((document) =>
          ["verified", "signed", "published"].includes(document.status)
        ),
      }),
    [dealCases, documents, focusListing?.listing_type, propertyViewings.length]
  );
  const [selectedPrompt, setSelectedPrompt] = useState(prompts[0] || "");
  const [promptDraft, setPromptDraft] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    setSelectedPrompt((current) => current || prompts[0] || "");
  }, [prompts]);

  useEffect(() => {
    setPromptDraft((current) => current || selectedPrompt || "");
  }, [selectedPrompt]);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    let cancelled = false;

    const loadHistory = async () => {
      try {
        setLoadingHistory(true);
        const rows = await aiConciergeService.getHistory(user.id, 6);
        if (!cancelled) setHistory(rows);
      } catch (error) {
        console.error("Failed to load concierge history:", error);
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    };

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handlePromptSelect = (prompt: string) => {
    setSelectedPrompt(prompt);
    setPromptDraft(
      `${prompt} Please use my saved properties, deal room activity, and verification status to recommend the next safest action.`
    );
  };

  const handleAskConcierge = async (event: FormEvent) => {
    event.preventDefault();

    if (!user) {
      toast.error("Sign in to use the AI concierge.");
      return;
    }

    if (!promptDraft.trim()) {
      toast.error("Add a question before asking the concierge.");
      return;
    }

    try {
      setAsking(true);
      const result = await aiConciergeService.ask({
        userId: user.id,
        listingId: focusListing?.id || null,
        dealCaseId: focusDeal?.id || null,
        prompt: promptDraft.trim(),
        context: {
          source: "user_dashboard",
          savedCount: savedProperties.length,
          dealCount: dealCases.length,
          documentCount: documents.length,
        },
      });
      const conversation =
        result.conversation || {
          id: `local-${Date.now()}`,
          prompt: promptDraft.trim(),
          response: result.response,
          created_at: new Date().toISOString(),
        };
      setHistory((current) => [conversation, ...current].slice(0, 8));
      toast.success("Concierge answer saved.");
    } catch (error) {
      console.error("Failed to ask concierge:", error);
      toast.error("The concierge could not answer yet. Please try again in a moment.");
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">AI Property Concierge</h2>
        <p className="mt-1 text-muted-foreground">
          Guided buyer questions, safe-payment milestones, and handoff prompts for your current shortlist.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,0.9fr]">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Suggested Questions</h3>
          </div>
          <div className="space-y-3">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className={`w-full rounded-xl border p-4 text-left text-sm transition-colors ${
                  selectedPrompt === prompt
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
                onClick={() => handlePromptSelect(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>

          <form className="mt-5 space-y-3" onSubmit={handleAskConcierge}>
            <div>
              <label className="mb-2 block text-sm text-foreground">Concierge Question</label>
              <textarea
                className="min-h-[140px] w-full rounded-lg border border-border bg-input-background px-4 py-3 text-foreground"
                placeholder="Ask about risk, documents, payment timing, viewing prep, or offer strategy."
                value={promptDraft}
                onChange={(event) => setPromptDraft(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={asking || !user}>
              {asking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Asking Concierge
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Ask & Save Answer
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/app/messages">
              <Button variant="outline">
                <MessageSquareText className="h-4 w-4" />
                Open Messages
              </Button>
            </Link>
            <Link to="/search">
              <Button variant="outline">
                <ExternalLink className="h-4 w-4" />
                Add Property Context
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Safe Payment Milestones</h3>
          </div>
          <div className="space-y-3">
            {escrowMilestones.map((milestone) => (
              <div key={milestone.label} className="rounded-xl border border-border p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={`h-4 w-4 ${
                      milestone.complete ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <p className="font-medium">{milestone.label}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{milestone.helper}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Saved Concierge Answers</h3>
          </div>
          {loadingHistory && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        {!user ? (
          <p className="text-sm text-muted-foreground">
            Sign in to keep concierge answers attached to your buyer account.
          </p>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ask your first question and the saved answer will appear here for later review.
          </p>
        ) : (
          <div className="space-y-4">
            {history.map((item) => (
              <div key={item.id} className="rounded-xl border border-border p-4">
                <p className="text-sm font-medium">{item.prompt}</p>
                <p className="mt-2 text-sm text-muted-foreground">{item.response}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {formatRelativeTime(item.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

interface BuyingGroupPanelProps {
  user: { id: string; email?: string | null; user_metadata?: Record<string, any> } | null;
  savedProperties: any[];
  dealCases: any[];
  conversations: any[];
}

export function BuyingGroupPanel({
  user,
  savedProperties,
  dealCases,
  conversations,
}: BuyingGroupPanelProps) {
  const plan = useMemo(
    () => buildBuyingGroupPlan({ savedProperties, dealCases, conversations }),
    [conversations, dealCases, savedProperties]
  );
  const focusListing = savedProperties[0]?.listing || dealCases[0]?.listing || null;
  const focusDeal = dealCases[0] || null;
  const shareTarget =
    savedProperties[0]?.listing?.id ? `/property/${savedProperties[0].listing.id}` : "/search";
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "family_reviewer" as "buyer" | "family_reviewer" | "legal_reviewer" | "local_representative" | "advisor",
    note: "",
  });
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) || groups[0] || null;
  const displayName = user?.user_metadata?.full_name || user?.email || "Buyer";

  const loadGroups = async () => {
    if (!user) {
      setGroups([]);
      return;
    }

    try {
      setLoadingGroups(true);
      const rows = await buyerGroupService.getVisibleGroups();
      setGroups(rows);
      setSelectedGroupId((current) => current || rows[0]?.id || "");
    } catch (error) {
      console.error("Failed to load buyer groups:", error);
      setGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    void loadGroups();
  }, [user?.id]);

  const handleCreateGroup = async () => {
    if (!user) {
      toast.error("Sign in to create a buying group.");
      return;
    }

    const title =
      focusListing?.property?.address
        ? `${focusListing.property.address} buying group`
        : "My Ghana property buying group";

    try {
      setCreatingGroup(true);
      const created = await buyerGroupService.createGroup({
        ownerUserId: user.id,
        ownerEmail: user.email || null,
        listingId: focusListing?.id || null,
        dealCaseId: focusDeal?.id || null,
        title,
      });
      await buyerGroupService.addComment({
        groupId: created.id,
        authorUserId: user.id,
        authorName: displayName,
        listingId: focusListing?.id || null,
        dealCaseId: focusDeal?.id || null,
        body: "Created this buying group so family, legal, and local review can happen in one place.",
      });
      const rows = await buyerGroupService.getVisibleGroups();
      setGroups(rows);
      setSelectedGroupId(created.id);
      toast.success("Buying group created.");
    } catch (error) {
      console.error("Failed to create buying group:", error);
      toast.error("We couldn't create that buying group yet.");
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleInvite = async (event: FormEvent) => {
    event.preventDefault();

    if (!user || !selectedGroup) {
      toast.error("Create or select a buying group first.");
      return;
    }

    if (!inviteForm.email.trim()) {
      toast.error("Add an email address to invite.");
      return;
    }

    try {
      setInviting(true);
      await buyerGroupService.inviteMember({
        groupId: selectedGroup.id,
        email: inviteForm.email,
        role: inviteForm.role,
        invitedByUserId: user.id,
        note: inviteForm.note.trim() || null,
      });
      setInviteForm((current) => ({ ...current, email: "", note: "" }));
      await loadGroups();
      toast.success("Reviewer invited to the buying group.");
    } catch (error) {
      console.error("Failed to invite buyer group member:", error);
      toast.error("We couldn't invite that reviewer yet.");
    } finally {
      setInviting(false);
    }
  };

  const handleAddComment = async (event: FormEvent) => {
    event.preventDefault();

    if (!user || !selectedGroup) {
      toast.error("Create or select a buying group first.");
      return;
    }

    if (!commentBody.trim()) {
      toast.error("Add a note before posting.");
      return;
    }

    try {
      setCommenting(true);
      await buyerGroupService.addComment({
        groupId: selectedGroup.id,
        authorUserId: user.id,
        authorName: displayName,
        listingId: selectedGroup.listing_id || focusListing?.id || null,
        dealCaseId: selectedGroup.deal_case_id || focusDeal?.id || null,
        body: commentBody.trim(),
      });
      setCommentBody("");
      await loadGroups();
      toast.success("Group note added.");
    } catch (error) {
      console.error("Failed to add buyer group comment:", error);
      toast.error("We couldn't add that note yet.");
    } finally {
      setCommenting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Shared Buying Group</h2>
        <p className="mt-1 text-muted-foreground">
          Bring family, a lawyer, or a local representative into the decision flow without scattering context.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {plan.actions.map((action) => (
          <Card key={action} className="p-5">
            <p className="text-sm text-muted-foreground">{action}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,0.9fr]">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Live Group Room</h3>
            </div>
            {loadingGroups && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          {!user ? (
            <p className="text-sm text-muted-foreground">
              Sign in to create a private group for family, legal, and local review.
            </p>
          ) : !selectedGroup ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Start a room for your current shortlist, then invite reviewers by email.
              </p>
              <Button onClick={() => void handleCreateGroup()} disabled={creatingGroup}>
                {creatingGroup ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Group
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4" />
                    Create Buying Group
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {groups.map((group) => (
                    <Button
                      key={group.id}
                      size="sm"
                      variant={group.id === selectedGroup.id ? "default" : "outline"}
                      onClick={() => setSelectedGroupId(group.id)}
                    >
                      {group.title}
                    </Button>
                  ))}
                </div>
              )}

              <div className="rounded-xl border border-border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold">{selectedGroup.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Share code {selectedGroup.share_code}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => void handleCreateGroup()}>
                    New Group
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {(selectedGroup.members || []).map((member: any) => (
                  <div key={member.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{member.email}</p>
                      <Badge variant={member.status === "accepted" ? "default" : "outline"}>
                        {formatLabel(member.status)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{formatLabel(member.role)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Copy className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Share Context</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Start with a shortlist link, then move legal, viewing, and payment questions into a single deal room.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to={shareTarget}>
              <Button>
                <ExternalLink className="h-4 w-4" />
                Open Share Target
              </Button>
            </Link>
            <Link to="/app/deals">
              <Button variant="outline">
                <ShieldCheck className="h-4 w-4" />
                Open Deal Rooms
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Invite Reviewer</h3>
          </div>
          <form className="space-y-4" onSubmit={handleInvite}>
            <Input
              label="Reviewer Email"
              type="email"
              placeholder="lawyer@example.com"
              value={inviteForm.email}
              onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))}
            />
            <div>
              <label className="mb-2 block text-sm text-foreground">Role</label>
              <select
                className="w-full rounded-lg border border-border bg-input-background px-4 py-3 text-foreground"
                value={inviteForm.role}
                onChange={(event) =>
                  setInviteForm((current) => ({
                    ...current,
                    role: event.target.value as typeof current.role,
                  }))
                }
              >
                <option value="family_reviewer">Family reviewer</option>
                <option value="legal_reviewer">Legal reviewer</option>
                <option value="local_representative">Local representative</option>
                <option value="advisor">Advisor</option>
              </select>
            </div>
            <Input
              label="Invite Note"
              placeholder="Please review the documents before I send a deposit."
              value={inviteForm.note}
              onChange={(event) => setInviteForm((current) => ({ ...current, note: event.target.value }))}
            />
            <Button type="submit" disabled={inviting || !selectedGroup}>
              {inviting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Inviting
                </>
              ) : (
                "Send Invite"
              )}
            </Button>
          </form>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Decision Trail</h3>
          </div>
          {selectedGroup?.comments?.length ? (
            <div className="mb-4 space-y-3">
              {[...selectedGroup.comments]
                .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 6)
                .map((comment: any) => (
                  <div key={comment.id} className="rounded-xl border border-border p-4">
                    <p className="text-sm font-medium">{comment.author_name || "Group member"}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{comment.body}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatRelativeTime(comment.created_at)}
                    </p>
                  </div>
                ))}
            </div>
          ) : (
            <p className="mb-4 text-sm text-muted-foreground">
              Group notes, legal questions, and local inspection updates will appear here.
            </p>
          )}
          <form className="space-y-3" onSubmit={handleAddComment}>
            <textarea
              className="min-h-[110px] w-full rounded-lg border border-border bg-input-background px-4 py-3 text-foreground"
              placeholder="Add a note, question, or decision for everyone reviewing this property."
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
            />
            <Button type="submit" disabled={commenting || !selectedGroup}>
              {commenting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Posting
                </>
              ) : (
                "Add Group Note"
              )}
            </Button>
          </form>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Recommended Group Roles</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {plan.roles.map((role) => (
            <div key={role.label} className="rounded-xl border border-border p-4">
              <p className="font-medium">{role.label}</p>
              <p className="mt-2 text-sm text-muted-foreground">{role.helper}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

interface ReferralProgramPanelProps {
  user: { id: string; email?: string | null } | null;
}

export function ReferralProgramPanel({ user }: ReferralProgramPanelProps) {
  const referralLink = useMemo(() => {
    if (typeof window === "undefined" || !user?.id) return "";
    return buildReferralLink(`${window.location.origin}/search`, user.id, "buyer-referral");
  }, [user?.id]);

  const copyReferralLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied.");
  };

  const referralPerformance = useMemo(
    () =>
      buildReferralPerformanceSnapshot({
        events: getStoredReferralEvents(user?.id),
        referrerKey: user?.id,
      }),
    [user?.id]
  );
  const rewardStatuses = ["pending_review", "approved", "paid", "fraud_hold"].map((status) =>
    getReferralRewardStatusDisplay(status)
  );
  const contributorPreview = buildContributorMonetizationPreview({
    contributionCount: referralPerformance.totals.savedAlerts + referralPerformance.totals.leads,
    approvedCount: referralPerformance.totals.wonDeals || 0,
    payoutStatus: "pending_verification",
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Referral Program</h2>
        <p className="mt-1 text-muted-foreground">
          Share trusted listings with friends, diaspora family, and relocation partners.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Referral Visits</p>
          <p className="mt-2 text-2xl font-semibold">{referralPerformance.totals.visits}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Saved Alerts</p>
          <p className="mt-2 text-2xl font-semibold">{referralPerformance.totals.savedAlerts}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Introduced Leads</p>
          <p className="mt-2 text-2xl font-semibold">{referralPerformance.totals.leads}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Estimated Credits</p>
          <p className="mt-2 text-2xl font-semibold">
            {formatMoney(referralPerformance.totals.estimatedRewardMinor, "GHS", { isMinor: true })}
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <HandCoins className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Your Referral Link</h3>
          </div>
          <div className="rounded-xl border border-border bg-secondary/20 p-4">
            <p className="break-all text-sm text-muted-foreground">
              {referralLink || "Log in to generate a referral link."}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={() => void copyReferralLink()} disabled={!referralLink}>
              <Copy className="h-4 w-4" />
              Copy Link
            </Button>
            <Link to="/search">
              <Button variant="outline">
                <ExternalLink className="h-4 w-4" />
                Browse Listings
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Best Referral Angles</h3>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Relocation support for family moving back to Ghana.</p>
            <p>Executive rental introductions for colleagues and partner teams.</p>
            <p>Investment leads who need verified listings and guided payments.</p>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Attribution Snapshot</h3>
        </div>
        {referralPerformance.campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Once someone opens your link, saves an alert, or starts a deal flow from it, the activity will appear here.
          </p>
        ) : (
          <div className="space-y-4">
            {referralPerformance.campaigns.map((campaign) => (
              <div key={`${campaign.referrerKey}-${campaign.channel}`} className="rounded-xl border border-border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold">{formatLabel(campaign.channel)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {campaign.visits} visits, {campaign.savedAlerts} alerts, {campaign.leads} leads, {campaign.wonDeals} won deals
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {campaign.lastTouchedAt ? `Last touch ${formatRelativeTime(campaign.lastTouchedAt)}` : "Waiting for first activity"}
                  </p>
                </div>
                {campaign.recentActivity.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {campaign.recentActivity.map((event) => (
                      <div key={event.id} className="rounded-lg bg-secondary/20 px-3 py-2 text-sm text-muted-foreground">
                        {formatLabel(event.eventType)} via {event.source || "shared flow"} {event.createdAt ? `- ${formatRelativeTime(event.createdAt)}` : ""}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Reward Review States</h3>
          </div>
          <div className="space-y-3">
            {rewardStatuses.map((status) => (
              <div key={status.label} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{status.label}</p>
                  <Badge variant={status.tone === "positive" ? "default" : "outline"}>
                    {status.tone}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{status.helper}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Contributor Monetization</h3>
          </div>
          <p className="text-3xl font-semibold">{contributorPreview.approvalRate}%</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Estimated contribution approval signal. Payouts remain tax, terms, and fraud-review gated.
          </p>
          <div className="mt-4 space-y-2">
            {contributorPreview.checklist.map((item) => (
              <div key={item} className="rounded-xl border border-border p-3 text-sm text-muted-foreground">
                {item}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

interface SupportPanelProps {
  organizationContacts: Array<{ name: string; email?: string | null; phone?: string | null }>;
  dealCases: any[];
}

const SERVICE_REQUEST_OPTIONS = [
  "cleaning",
  "plumbing",
  "electrical",
  "painting",
  "carpentry",
  "moving",
  "internet",
  "security",
] as const;

export function SupportPanel({ organizationContacts, dealCases }: SupportPanelProps) {
  const playbooks = getMaintenancePlaybooks();
  const propertyReferences = useMemo(() => {
    const references = new Map<string, {
      organizationId: string;
      propertyId: string;
      address: string;
      city: string | null;
      region: string | null;
      neighborhood: string | null;
    }>();

    dealCases.forEach((dealCase) => {
      const property = dealCase.listing?.property;
      if (!property?.id || !dealCase.organization_id) return;

      references.set(property.id, {
        organizationId: dealCase.organization_id,
        propertyId: property.id,
        address: property.address || "Property",
        city: property.city || null,
        region: property.region || null,
        neighborhood: property.neighborhood || null,
      });
    });

    return [...references.values()];
  }, [dealCases]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [form, setForm] = useState({
    propertyId: propertyReferences[0]?.propertyId || "",
    serviceType: "cleaning",
    vendorId: "",
    requestedDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString().slice(0, 10),
    cost: "",
    description: "",
  });

  useEffect(() => {
    if (!propertyReferences.length) return;
    setForm((current) => ({
      ...current,
      propertyId: current.propertyId || propertyReferences[0]?.propertyId || "",
    }));
  }, [propertyReferences]);

  useEffect(() => {
    const loadAssignments = async () => {
      try {
        setLoadingAssignments(true);
        const results = await maintenanceOpsService.getAssignmentsForPropertyReferences(propertyReferences);
        setAssignments(results);
      } catch (error) {
        console.error("Failed to load maintenance assignments:", error);
        setAssignments([]);
      } finally {
        setLoadingAssignments(false);
      }
    };

    void loadAssignments();
  }, [propertyReferences]);

  const selectedReference = useMemo(
    () => propertyReferences.find((reference) => reference.propertyId === form.propertyId) || null,
    [form.propertyId, propertyReferences]
  );

  useEffect(() => {
    if (!selectedReference) {
      setVendors([]);
      return;
    }

    const loadVendors = async () => {
      try {
        setLoadingVendors(true);
        const results = await maintenanceOpsService.getRecommendedVendors({
          serviceType: form.serviceType,
          neighborhood: selectedReference.neighborhood,
          city: selectedReference.city,
          region: selectedReference.region,
        });
        setVendors(results);
        setForm((current) => ({
          ...current,
          vendorId:
            results.some((vendor) => vendor.id === current.vendorId)
              ? current.vendorId
              : results[0]?.id || "",
        }));
      } catch (error) {
        console.error("Failed to load maintenance vendors:", error);
        setVendors([]);
      } finally {
        setLoadingVendors(false);
      }
    };

    void loadVendors();
  }, [form.serviceType, selectedReference]);

  const assignmentSummary = useMemo(() => buildMaintenanceSummary(assignments), [assignments]);

  const handleSubmitRequest = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedReference) {
      toast.error("Pick a property before sending a request.");
      return;
    }

    if (!form.vendorId || !form.description.trim()) {
      toast.error("Choose a vendor and describe the work needed.");
      return;
    }

    try {
      setSubmittingRequest(true);
      await maintenanceOpsService.createMaintenanceRequest({
        organizationId: selectedReference.organizationId,
        propertyId: selectedReference.propertyId,
        vendorId: form.vendorId,
        serviceType: form.serviceType,
        description: form.description.trim(),
        requestedDate: new Date(`${form.requestedDate}T12:00:00`),
        cost: form.cost ? Number(form.cost) : null,
      });

      const refreshed = await maintenanceOpsService.getAssignmentsForPropertyReferences(propertyReferences);
      setAssignments(refreshed);
      setForm((current) => ({
        ...current,
        vendorId: vendors[0]?.id || "",
        cost: "",
        description: "",
      }));
      toast.success("Maintenance request sent to the property team.");
    } catch (error) {
      console.error("Failed to create maintenance request:", error);
      toast.error("We could not submit that maintenance request right now.");
    } finally {
      setSubmittingRequest(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">After-Sale & Maintenance Support</h2>
        <p className="mt-1 text-muted-foreground">
          Turn completed deals into long-term client relationships with handoff and service follow-up.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {playbooks.map((playbook) => (
          <Card key={playbook.key} className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">{playbook.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{playbook.helper}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Open Requests</p>
          <p className="mt-2 text-2xl font-semibold">
            {assignmentSummary.pending + assignmentSummary.accepted + assignmentSummary.inProgress}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="mt-2 text-2xl font-semibold">{assignmentSummary.completed}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Tracked Spend</p>
          <p className="mt-2 text-2xl font-semibold">
            {formatMoney(assignmentSummary.totalSpend, "GHS")}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Properties Covered</p>
          <p className="mt-2 text-2xl font-semibold">{propertyReferences.length}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Request a Service Dispatch</h3>
          </div>
          {propertyReferences.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Once you have an inquiry, offer, or closed deal tied to a property, you can request cleaning, repairs, move support, and utility follow-up here.
            </p>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmitRequest}>
              <div>
                <label className="mb-2 block text-sm text-foreground">Property</label>
                <select
                  className="w-full rounded-lg border border-border bg-input-background px-4 py-3 text-foreground"
                  value={form.propertyId}
                  onChange={(event) => setForm((current) => ({ ...current, propertyId: event.target.value, vendorId: "" }))}
                >
                  {propertyReferences.map((reference) => (
                    <option key={reference.propertyId} value={reference.propertyId}>
                      {reference.address}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-foreground">Service Type</label>
                  <select
                    className="w-full rounded-lg border border-border bg-input-background px-4 py-3 text-foreground"
                    value={form.serviceType}
                    onChange={(event) => setForm((current) => ({ ...current, serviceType: event.target.value, vendorId: "" }))}
                  >
                    {SERVICE_REQUEST_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {formatLabel(option)}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Requested Date"
                  type="date"
                  value={form.requestedDate}
                  onChange={(event) => setForm((current) => ({ ...current, requestedDate: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-foreground">Preferred Vendor</label>
                <select
                  className="w-full rounded-lg border border-border bg-input-background px-4 py-3 text-foreground"
                  value={form.vendorId}
                  onChange={(event) => setForm((current) => ({ ...current, vendorId: event.target.value }))}
                  disabled={loadingVendors || vendors.length === 0}
                >
                  <option value="">
                    {loadingVendors ? "Loading vendors..." : vendors.length === 0 ? "No vendors found yet" : "Choose a vendor"}
                  </option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.business_name} {vendor.rating_avg ? `(${vendor.rating_avg.toFixed(1)}/5)` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Budget / Estimate (Optional)"
                type="number"
                min="0"
                placeholder="750"
                value={form.cost}
                onChange={(event) => setForm((current) => ({ ...current, cost: event.target.value }))}
              />
              <div>
                <label className="mb-2 block text-sm text-foreground">Work Summary</label>
                <textarea
                  className="min-h-[120px] w-full rounded-lg border border-border bg-input-background px-4 py-3 text-foreground"
                  placeholder="Describe the issue, access constraints, or handoff notes for the property team."
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                />
              </div>
              <Button type="submit" disabled={submittingRequest || !selectedReference}>
                {submittingRequest ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending Request
                  </>
                ) : (
                  <>
                    <Wrench className="h-4 w-4" />
                    Submit Request
                  </>
                )}
              </Button>
            </form>
          )}
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Concierge Handoff</h3>
        </div>
        <div className="space-y-3 text-sm text-muted-foreground">
            <p>Use your deal room to confirm move-in date, utility activation, and the first maintenance check.</p>
            <p>Keep vendor contacts, inventory notes, and signed agreements together before the first key handoff.</p>
            {organizationContacts.length > 0 && (
              <div className="rounded-xl border border-border p-4">
                <p className="font-medium text-foreground">Property team contacts</p>
                <div className="mt-3 space-y-2">
                  {organizationContacts.map((contact) => (
                    <div key={`${contact.name}-${contact.email || contact.phone}`} className="text-sm">
                      <p className="font-medium">{contact.name}</p>
                      <p>{contact.email || contact.phone || "No contact details yet"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border p-4">
              <p className="font-medium text-foreground">Recent service requests</p>
              {loadingAssignments ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading request history...
                </div>
              ) : assignments.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No service requests yet. Your first maintenance ticket will appear here after dispatch.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {assignments.slice(0, 5).map((assignment) => (
                    <div key={assignment.id} className="rounded-lg bg-secondary/20 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-foreground">
                          {assignment.property?.address || "Property service request"}
                        </p>
                        <Badge variant="outline">{formatLabel(assignment.status)}</Badge>
                      </div>
                      <p className="mt-1 text-sm">{formatLabel(assignment.service_type)}</p>
                      <p className="mt-1 text-xs">
                        {assignment.vendor?.business_name || "Assigned vendor pending"}{assignment.requested_date ? ` / ${new Date(assignment.requested_date).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </div>
      </Card>
      </div>
    </div>
  );
}
