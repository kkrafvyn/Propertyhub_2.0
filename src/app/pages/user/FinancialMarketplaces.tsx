import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Calculator,
  Shield,
  Building2,
  Star,
  TrendingUp,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  Landmark,
  Wrench,
  RefreshCw,
  ArrowRight,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button, buttonVariants } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { cn } from "../../components/ui/utils";
import { mortgageInsuranceService } from "../../../lib/mortgage-insurance.service";
import {
  INSURANCE_PARTNERS,
  MORTGAGE_PARTNERS,
  type MarketplacePartner,
} from "../../../lib/marketplace-partners";
import { CONSUMER_ROUTES } from "../../lib/consumer-routes";

// ── Math helpers ──────────────────────────────────────────────────────────────

function estimateMonthlyPayment(principal: number, annualRate: number, years: number) {
  if (!principal || !years) return 0;
  const monthlyRate = annualRate / 100 / 12;
  const months = years * 12;
  if (monthlyRate === 0) return principal / months;
  return (principal * monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1);
}

function buildAmortization(principal: number, annualRate: number, years: number) {
  const monthlyRate = annualRate / 100 / 12;
  const months = years * 12;
  const payment = estimateMonthlyPayment(principal, annualRate, years);
  const schedule: { year: number; principal: number; interest: number; balance: number }[] = [];
  let balance = principal;
  for (let y = 1; y <= Math.min(years, 30); y++) {
    let yearPrincipal = 0;
    let yearInterest = 0;
    for (let m = 0; m < 12; m++) {
      const interest = balance * monthlyRate;
      const princ = payment - interest;
      yearInterest += interest;
      yearPrincipal += princ;
      balance = Math.max(0, balance - princ);
    }
    schedule.push({ year: y, principal: yearPrincipal, interest: yearInterest, balance });
    if (balance <= 0) break;
  }
  return schedule;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 0 }).format(n);

// ── Amortization mini-chart ───────────────────────────────────────────────────

function AmortizationBar({ schedule }: { schedule: ReturnType<typeof buildAmortization> }) {
  if (schedule.length === 0) return null;
  const maxTotal = Math.max(...schedule.map((r) => r.principal + r.interest));
  return (
    <div className="space-y-1.5 mt-4">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Year-by-year repayment breakdown</span>
        <span className="flex gap-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />Principal</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Interest</span>
        </span>
      </div>
      <div className="flex items-end gap-0.5 h-20">
        {schedule.map((row, i) => {
          const pW = (row.principal / maxTotal) * 100;
          const iW = (row.interest / maxTotal) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col justify-end gap-px group relative" title={`Yr ${row.year}: Principal ${fmt(row.principal)}, Interest ${fmt(row.interest)}`}>
              <div className="bg-indigo-500 rounded-t-sm transition-all" style={{ height: `${pW}%` }} />
              <div className="bg-amber-400 rounded-t-sm transition-all" style={{ height: `${iW}%` }} />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground px-0.5">
        <span>Year 1</span>
        <span>Year {schedule[schedule.length - 1]?.year}</span>
      </div>
    </div>
  );
}

// ── Partner card ──────────────────────────────────────────────────────────────

function PartnerCard({
  partner,
  onRequest,
  requesting,
}: {
  partner: MarketplacePartner;
  onRequest: (partner: MarketplacePartner) => void;
  requesting: boolean;
}) {
  return (
    <Card className="p-5 space-y-3 flex flex-col hover:shadow-md transition-shadow border-border">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-sm">{partner.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{partner.description}</p>
        </div>
        {(partner.typicalRate || partner.coverage) ? (
          <Badge className="bg-indigo-500/10 text-indigo-700 border-indigo-200 shrink-0 text-xs">
            {partner.typicalRate || partner.coverage}
          </Badge>
        ) : null}
      </div>

      <ul className="space-y-1.5 flex-1">
        {partner.highlights.map((item) => (
          <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
            {item}
          </li>
        ))}
      </ul>

      <Button
        size="sm"
        className="w-full"
        onClick={() => onRequest(partner)}
        disabled={requesting}
      >
        {requesting
          ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Submitting…</>
          : <>{partner.contactLabel || "Request quote"} <ArrowRight className="w-3.5 h-3.5 ml-1.5" /></>
        }
      </Button>
    </Card>
  );
}

// ── Mortgage ─────────────────────────────────────────────────────────────────

export function MortgageMarketplaceSection({
  userId,
  dealCases,
  inquiries,
  onSubmitted,
}: {
  userId: string;
  dealCases: any[];
  inquiries: any[];
  onSubmitted: () => Promise<void>;
}) {
  const [price, setPrice] = useState("500000");
  const [downPayment, setDownPayment] = useState("100000");
  const [rate, setRate] = useState("22");
  const [years, setYears] = useState("20");
  const [notes, setNotes] = useState("");
  const [requesting, setRequesting] = useState<string | null>(null);
  const [showAmort, setShowAmort] = useState(false);

  const purchaseCases = dealCases.filter(
    (dc) => dc.case_type === "purchase_offer" && !["closed", "rejected"].includes(String(dc.status))
  );

  const principal = Math.max(0, Number(price) - Number(downPayment));
  const monthly = useMemo(() => estimateMonthlyPayment(principal, Number(rate), Number(years)), [principal, rate, years]);
  const amortization = useMemo(() => showAmort ? buildAmortization(principal, Number(rate), Number(years)) : [], [principal, rate, years, showAmort]);
  const totalInterest = amortization.reduce((s, r) => s + r.interest, 0);
  const ltv = price ? Math.round((principal / Number(price)) * 100) : 0;

  const submitInquiry = async (partner?: MarketplacePartner, dealCase?: any) => {
    try {
      setRequesting(partner?.id || dealCase?.id || "general");
      const partnerNote = partner ? `Partner: ${partner.name}. ${notes}`.trim() : notes;
      await mortgageInsuranceService.submitInquiry({
        userId, inquiryType: "mortgage",
        dealCaseId: dealCase?.id || purchaseCases[0]?.id || null,
        listingId: dealCase?.listing_id || purchaseCases[0]?.listing_id || null,
        notes: partnerNote || null,
      });
      toast.success(partner ? `Quote requested via ${partner.name}.` : "Mortgage inquiry submitted.");
      setNotes("");
      await onSubmitted();
    } catch {
      toast.error("Unable to submit mortgage inquiry.");
    } finally {
      setRequesting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Calculator card ── */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10">
              <Calculator className="h-4 w-4 text-indigo-600" />
            </div>
            <h3 className="font-bold">Affordability Calculator</h3>
          </div>
          <button
            className="text-xs text-indigo-600 font-medium flex items-center gap-1 hover:underline"
            onClick={() => setShowAmort((v) => !v)}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            {showAmort ? "Hide" : "View"} amortization
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Property Price (GHS)</label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="500000" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Down Payment (GHS)</label>
            <Input type="number" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} placeholder="100000" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Interest Rate (%)</label>
            <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="22" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Loan Term (years)</label>
            <Input type="number" value={years} onChange={(e) => setYears(e.target.value)} placeholder="20" />
          </div>
        </div>

        {/* Result strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "Monthly Payment", value: fmt(monthly), accent: "text-indigo-600" },
            { label: "Loan Amount", value: fmt(principal), accent: "" },
            { label: "LTV Ratio", value: `${ltv}%`, accent: ltv > 80 ? "text-amber-600" : "text-emerald-600" },
            { label: "Total Interest", value: showAmort ? fmt(totalInterest) : "—", accent: "text-rose-600" },
          ].map((m) => (
            <div key={m.label} className="rounded-xl bg-muted/40 px-3 py-2">
              <p className="text-[10px] text-muted-foreground">{m.label}</p>
              <p className={`font-bold text-sm tabular-nums ${m.accent}`}>{m.value}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground flex items-start gap-1">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          Indicative only — not a loan offer. Actual rates depend on lender assessment.
        </p>

        {showAmort && <AmortizationBar schedule={amortization} />}
      </Card>

      {/* ── Partners ── */}
      <div>
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Landmark className="w-4 h-4 text-muted-foreground" /> Mortgage Partners
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {MORTGAGE_PARTNERS.map((partner) => (
            <PartnerCard
              key={partner.id}
              partner={partner}
              onRequest={(p) => void submitInquiry(p)}
              requesting={requesting === partner.id}
            />
          ))}
        </div>
      </div>

      {/* ── Linked offers ── */}
      {purchaseCases.length > 0 ? (
        <Card className="p-5 space-y-3">
          <h3 className="font-bold text-sm">Linked to your offers</h3>
          {purchaseCases.map((dc) => (
            <div key={dc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
              <div>
                <p className="font-medium text-sm">{dc.listing?.property?.address || "Purchase offer"}</p>
                <p className="text-xs text-muted-foreground capitalize">{dc.status}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => void submitInquiry(undefined, dc)} disabled={requesting === dc.id}>
                {requesting === dc.id ? "Submitting…" : "Request quote"}
              </Button>
            </div>
          ))}
        </Card>
      ) : (
        <Card className="p-6 text-center space-y-2 bg-muted/30">
          <p className="text-sm text-muted-foreground">Submit a purchase offer to link mortgage quotes to a specific property.</p>
          <Link to={CONSUMER_ROUTES.applications} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "inline-flex mt-1")}>
            View offers <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </Card>
      )}

      {/* ── Notes ── */}
      <div>
        <label className="text-xs text-muted-foreground block mb-2">Notes for our team (optional)</label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Salary band, timeline, preferred bank…" />
        <Button className="mt-3" size="sm" variant="outline" onClick={() => void submitInquiry()} disabled={Boolean(requesting)}>
          {requesting === "general" ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Submitting…</> : "Submit general inquiry"}
        </Button>
      </div>

      {/* ── Inquiry history ── */}
      {inquiries.filter((i) => i.inquiry_type === "mortgage").length > 0 && (
        <Card className="p-5">
          <h3 className="font-bold text-sm mb-3">Your mortgage inquiries</h3>
          <div className="space-y-2">
            {inquiries.filter((i) => i.inquiry_type === "mortgage").map((inquiry) => (
              <div key={inquiry.id} className="flex items-center justify-between text-sm rounded-lg bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">{inquiry.notes || "Mortgage inquiry"}</span>
                <Badge variant="outline" className="capitalize text-xs">{inquiry.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Insurance ─────────────────────────────────────────────────────────────────

export function InsuranceMarketplaceSection({
  userId,
  dealCases,
  inquiries,
  onSubmitted,
}: {
  userId: string;
  dealCases: any[];
  inquiries: any[];
  onSubmitted: () => Promise<void>;
}) {
  const [notes, setNotes] = useState("");
  const [requesting, setRequesting] = useState<string | null>(null);

  const submitInquiry = async (partner?: MarketplacePartner, dealCase?: any) => {
    try {
      setRequesting(partner?.id || dealCase?.id || "general");
      const partnerNote = partner ? `Partner: ${partner.name}. ${notes}`.trim() : notes;
      await mortgageInsuranceService.submitInquiry({
        userId, inquiryType: "insurance",
        dealCaseId: dealCase?.id || null,
        listingId: dealCase?.listing_id || null,
        notes: partnerNote || null,
      });
      toast.success(partner ? `Quote requested via ${partner.name}.` : "Insurance inquiry submitted.");
      setNotes("");
      await onSubmitted();
    } catch {
      toast.error("Unable to submit insurance inquiry.");
    } finally {
      setRequesting(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 bg-emerald-500/5 border-emerald-200 dark:border-emerald-900">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-emerald-500/10">
            <Shield className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold">Protect your property</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Compare home and contents insurance from verified Ghana insurers. Quotes are coordinated by BaytMiftah — not instant binding cover.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {INSURANCE_PARTNERS.map((partner) => (
          <PartnerCard
            key={partner.id}
            partner={partner}
            onRequest={(p) => void submitInquiry(p)}
            requesting={requesting === partner.id}
          />
        ))}
      </div>

      <div>
        <label className="text-xs text-muted-foreground block mb-2">Coverage notes (optional)</label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Building value, contents cover, landlord vs owner-occupied…" />
        <Button className="mt-3" size="sm" onClick={() => void submitInquiry()} disabled={Boolean(requesting)}>
          {requesting === "general" ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Submitting…</> : "Submit general insurance inquiry"}
        </Button>
      </div>

      {inquiries.filter((i) => i.inquiry_type === "insurance").length > 0 && (
        <Card className="p-5">
          <h3 className="font-bold text-sm mb-3">Your insurance inquiries</h3>
          <div className="space-y-2">
            {inquiries.filter((i) => i.inquiry_type === "insurance").map((inquiry) => (
              <div key={inquiry.id} className="flex items-center justify-between text-sm rounded-lg bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">{inquiry.notes || "Insurance inquiry"}</span>
                <Badge variant="outline" className="capitalize text-xs">{inquiry.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Vendor Marketplace ────────────────────────────────────────────────────────

export function VendorMarketplaceSection() {
  const [category, setCategory] = useState("general");
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadVendors = async (cat: string) => {
    try {
      setLoading(true);
      const { vendorService } = await import("../../../lib/vendor.service");
      const rows = await vendorService.listMarketplaceVendors(cat, 24);
      setVendors(rows);
    } catch {
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadVendors(category); }, [category]);

  const CATEGORIES = [
    { id: "plumbing", label: "Plumbing" },
    { id: "electrical", label: "Electrical" },
    { id: "hvac", label: "HVAC" },
    { id: "cleaning", label: "Cleaning" },
    { id: "security", label: "Security" },
    { id: "general", label: "General" },
  ];

  return (
    <div className="space-y-6">
      <Card className="p-5 bg-violet-500/5 border-violet-200 dark:border-violet-900">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-violet-500/10">
            <Wrench className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <h3 className="font-bold">Verified Service Vendors</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Browse maintenance and property service providers. Hire through an active lease maintenance request or contact your property manager.
            </p>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => { setCategory(c.id); void loadVendors(c.id); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
              ${category === c.id ? "bg-foreground text-background border-foreground" : "bg-background border-border text-muted-foreground hover:border-muted-foreground"}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 rounded-xl border border-border bg-muted/30 animate-pulse" />)}
        </div>
      ) : vendors.length === 0 ? (
        <Card className="p-10 text-center space-y-3 bg-muted/30">
          <Building2 className="w-10 h-10 mx-auto text-muted-foreground/40" />
          <p className="font-semibold text-muted-foreground">No vendors in this category yet</p>
          <p className="text-sm text-muted-foreground">Check back soon or submit a maintenance request from your lease.</p>
          <Link to={CONSUMER_ROUTES.maintenance} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "inline-flex mt-1")}>
            Maintenance requests
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {vendors.map((vendor) => (
            <Card key={vendor.id} className="p-5 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm">{vendor.business_name}</h3>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">
                    {vendor.business_category?.replace(/_/g, " ")}
                  </p>
                </div>
                <Badge className="gap-1 bg-amber-500/10 text-amber-700 border-amber-200 text-xs shrink-0">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  {vendor.rating_avg || "—"}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground">
                {vendor.total_jobs_completed || 0} jobs completed
                {vendor.service_areas?.length ? ` · ${vendor.service_areas.slice(0, 2).join(", ")}` : ""}
              </p>

              {vendor.services?.length ? (
                <div className="space-y-1">
                  {vendor.services.slice(0, 3).map((service: any) => (
                    <div key={service.id} className="flex items-center justify-between text-xs rounded-lg bg-muted/40 px-2.5 py-1.5">
                      <span className="text-muted-foreground">{service.service_name}</span>
                      {service.base_price && <span className="font-mono font-medium">from GHS {service.base_price}</span>}
                    </div>
                  ))}
                </div>
              ) : null}

              <Link to={CONSUMER_ROUTES.maintenance} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "inline-flex w-full justify-center")}>
                Hire via maintenance <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
