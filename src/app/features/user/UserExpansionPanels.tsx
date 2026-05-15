import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  Building2,
  Calculator,
  Copy,
  ExternalLink,
  FileSignature,
  Globe2,
  HandCoins,
  Loader2,
  MapPinned,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
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
  buildReferralPerformanceSnapshot,
  getStoredReferralEvents,
} from "../../../lib/referral-attribution.service";
import {
  buildDealTimeline,
  buildDiasporaChecklist,
  buildPropertyComparisonRows,
  buildReferralLink,
  calculateMonthlyMortgage,
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
  dealCases: any[];
  propertyTransactions: any[];
  propertyViewings: any[];
  documents: any[];
  conversations: any[];
}

export function DealRoomsPanel({
  dealCases,
  propertyTransactions,
  propertyViewings,
  documents,
  conversations,
}: DealRoomsPanelProps) {
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(dealCases[0]?.id || null);
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

  const handleSubmitRequest = async (event: React.FormEvent) => {
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
