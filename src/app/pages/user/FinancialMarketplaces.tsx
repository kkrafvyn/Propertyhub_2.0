import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Calculator, Shield, Building2, Star } from "lucide-react";
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

function estimateMonthlyPayment(principal: number, annualRate: number, years: number) {
  if (!principal || !years) return 0;
  const monthlyRate = annualRate / 100 / 12;
  const months = years * 12;
  if (monthlyRate === 0) return principal / months;
  return (principal * monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1);
}

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
    <Card className="p-5 space-y-3 h-full flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{partner.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">{partner.description}</p>
        </div>
        {partner.typicalRate || partner.coverage ? (
          <Badge variant="secondary" className="shrink-0">
            {partner.typicalRate || partner.coverage}
          </Badge>
        ) : null}
      </div>
      <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4 flex-1">
        {partner.highlights.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <Button size="sm" onClick={() => onRequest(partner)} disabled={requesting}>
        {requesting ? "Submitting…" : partner.contactLabel || "Request quote"}
      </Button>
    </Card>
  );
}

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

  const purchaseCases = dealCases.filter(
    (dealCase) =>
      dealCase.case_type === "purchase_offer" &&
      !["closed", "rejected"].includes(String(dealCase.status)),
  );

  const monthly = useMemo(() => {
    const principal = Math.max(0, Number(price) - Number(downPayment));
    return estimateMonthlyPayment(principal, Number(rate), Number(years));
  }, [price, downPayment, rate, years]);

  const submitInquiry = async (partner?: MarketplacePartner, dealCase?: any) => {
    try {
      setRequesting(partner?.id || dealCase?.id || "general");
      const partnerNote = partner ? `Partner: ${partner.name}. ${notes}`.trim() : notes;
      await mortgageInsuranceService.submitInquiry({
        userId,
        inquiryType: "mortgage",
        dealCaseId: dealCase?.id || purchaseCases[0]?.id || null,
        listingId: dealCase?.listing_id || purchaseCases[0]?.listing_id || null,
        notes: partnerNote || null,
      });
      toast.success(
        partner
          ? `Mortgage introduction requested via ${partner.name}.`
          : "Mortgage inquiry submitted.",
      );
      setNotes("");
      await onSubmitted();
    } catch (error) {
      console.error(error);
      toast.error("Unable to submit mortgage inquiry.");
    } finally {
      setRequesting(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Affordability calculator</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Property price (GHS)"
          />
          <Input
            type="number"
            value={downPayment}
            onChange={(e) => setDownPayment(e.target.value)}
            placeholder="Down payment (GHS)"
          />
          <Input
            type="number"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="Interest rate (%)"
          />
          <Input
            type="number"
            value={years}
            onChange={(e) => setYears(e.target.value)}
            placeholder="Term (years)"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Estimated monthly payment:{" "}
          <span className="font-semibold text-foreground">
            GHS {monthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          . Indicative only — not a loan offer.
        </p>
      </Card>

      <div>
        <h3 className="font-semibold mb-3">Mortgage partners</h3>
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

      {purchaseCases.length > 0 ? (
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold">Linked to your offers</h3>
          {purchaseCases.map((dealCase) => (
            <div key={dealCase.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{dealCase.listing?.property?.address || "Purchase offer"}</p>
                <p className="text-sm text-muted-foreground capitalize">{dealCase.status}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void submitInquiry(undefined, dealCase)}
                disabled={requesting === dealCase.id}
              >
                Request quote for this offer
              </Button>
            </div>
          ))}
        </Card>
      ) : (
        <Card className="p-6 text-center text-muted-foreground">
          <p>Submit a purchase offer to link mortgage quotes to a specific property.</p>
          <Link
            to={CONSUMER_ROUTES.applications}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3 inline-flex")}
          >
            View offers
          </Link>
        </Card>
      )}

      <div>
        <label className="text-sm text-muted-foreground block mb-2">Notes for our team (optional)</label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Salary band, timeline, preferred bank…" />
      </div>

      {inquiries.filter((i) => i.inquiry_type === "mortgage").length > 0 ? (
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Your mortgage inquiries</h3>
          <div className="space-y-2">
            {inquiries
              .filter((i) => i.inquiry_type === "mortgage")
              .map((inquiry) => (
                <div key={inquiry.id} className="flex items-center justify-between text-sm">
                  <span>{inquiry.notes || "Mortgage inquiry"}</span>
                  <Badge variant="outline" className="capitalize">
                    {inquiry.status}
                  </Badge>
                </div>
              ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

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

  const purchaseCases = dealCases.filter(
    (dealCase) =>
      dealCase.case_type === "purchase_offer" &&
      !["closed", "rejected"].includes(String(dealCase.status)),
  );

  const submitInquiry = async (partner?: MarketplacePartner, dealCase?: any) => {
    try {
      setRequesting(partner?.id || dealCase?.id || "general");
      const partnerNote = partner ? `Partner: ${partner.name}. ${notes}`.trim() : notes;
      await mortgageInsuranceService.submitInquiry({
        userId,
        inquiryType: "insurance",
        dealCaseId: dealCase?.id || purchaseCases[0]?.id || null,
        listingId: dealCase?.listing_id || purchaseCases[0]?.listing_id || null,
        notes: partnerNote || null,
      });
      toast.success(
        partner
          ? `Insurance quote requested via ${partner.name}.`
          : "Insurance inquiry submitted.",
      );
      setNotes("");
      await onSubmitted();
    } catch (error) {
      console.error(error);
      toast.error("Unable to submit insurance inquiry.");
    } finally {
      setRequesting(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <h3 className="font-semibold">Protect your property</h3>
            <p className="text-sm text-muted-foreground mt-1">
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
        <label className="text-sm text-muted-foreground block mb-2">Coverage notes (optional)</label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Building value, contents cover, landlord vs owner-occupied…"
        />
        <Button className="mt-3" onClick={() => void submitInquiry()} disabled={Boolean(requesting)}>
          {requesting === "general" ? "Submitting…" : "Submit general insurance inquiry"}
        </Button>
      </div>

      {inquiries.filter((i) => i.inquiry_type === "insurance").length > 0 ? (
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Your insurance inquiries</h3>
          <div className="space-y-2">
            {inquiries
              .filter((i) => i.inquiry_type === "insurance")
              .map((inquiry) => (
                <div key={inquiry.id} className="flex items-center justify-between text-sm">
                  <span>{inquiry.notes || "Insurance inquiry"}</span>
                  <Badge variant="outline" className="capitalize">
                    {inquiry.status}
                  </Badge>
                </div>
              ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

export function VendorMarketplaceSection() {
  const [category, setCategory] = useState("general");
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadVendors = async (nextCategory: string) => {
    try {
      setLoading(true);
      const { vendorService } = await import("../../../lib/vendor.service");
      const rows = await vendorService.listMarketplaceVendors(nextCategory, 24);
      setVendors(rows);
    } catch (error) {
      console.error(error);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVendors(category);
  }, [category]);

  return (
    <div className="space-y-6">
      <Card className="p-5 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <Building2 className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <h3 className="font-semibold">Verified service vendors</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Browse maintenance and property service providers. Hire through an active lease maintenance request or contact your property manager.
            </p>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {[
          { id: "plumbing", label: "Plumbing" },
          { id: "electrical", label: "Electrical" },
          { id: "hvac", label: "HVAC" },
          { id: "cleaning", label: "Cleaning" },
          { id: "security", label: "Security" },
          { id: "general", label: "General" },
        ].map((item) => (
          <Button
            key={item.id}
            size="sm"
            variant={category === item.id ? "default" : "outline"}
            onClick={() => {
              setCategory(item.id);
              void loadVendors(item.id);
            }}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading vendors…</p>
      ) : vendors.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No verified vendors in this category yet. Check back soon or submit a maintenance request from your lease.
          <div className="mt-3">
            <Link
              to={CONSUMER_ROUTES.maintenance}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "inline-flex")}
            >
              Maintenance requests
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {vendors.map((vendor) => (
            <Card key={vendor.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{vendor.business_name}</h3>
                  <p className="text-sm text-muted-foreground capitalize">
                    {vendor.business_category?.replace(/_/g, " ")}
                  </p>
                </div>
                <Badge variant="outline" className="gap-1">
                  <Star className="h-3 w-3" />
                  {vendor.rating_avg || "—"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {vendor.total_jobs_completed || 0} jobs completed
                {vendor.service_areas?.length ? ` · ${vendor.service_areas.slice(0, 2).join(", ")}` : ""}
              </p>
              {vendor.services?.length ? (
                <ul className="text-xs text-muted-foreground space-y-1">
                  {vendor.services.slice(0, 3).map((service: any) => (
                    <li key={service.id}>
                      {service.service_name}
                      {service.base_price ? ` · from GHS ${service.base_price}` : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
              <Link
                to={CONSUMER_ROUTES.maintenance}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "inline-flex")}
              >
                Hire via maintenance
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
