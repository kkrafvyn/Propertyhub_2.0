import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Check, CreditCard, Loader2, Lock, Shield } from "lucide-react";
import { toast } from "sonner";
import { DesktopShell } from "../../components/baytmiftah/DesktopShell";
import { PageMeta } from "../../components/baytmiftah/PageMeta";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import { LegalAcceptanceCheckbox } from "../../components/legal/LegalAcceptanceCheckbox";
import { legalAcceptanceService } from "../../../lib/legal-acceptance.service";
import { ACCEPTANCE_SCOPES, LEGAL_POLICY_VERSION } from "../../../lib/legal-config";
import {
  parseCheckoutParams,
  PURPOSE_LABELS,
  type CheckoutParams,
} from "../../lib/checkout-navigation";
import { listingService } from "../../../lib/listing.service";
import {
  resolvePaymentContextFromListing,
} from "../../../lib/payment-routing.service";
import { paymentService } from "../../../lib/payment.service";
import { openPayAngelsInline } from "../../../lib/payangels-inline";
import { clientIntegrations } from "../../../lib/integrations";
import { realEstateComplianceService } from "../../../lib/real-estate-compliance.service";
import { CONSUMER_ROUTES } from "../../lib/consumer-routes";
import { MarketplaceDisclaimerStrip } from "../../components/legal/MarketplaceDisclaimerStrip";
import { CHECKOUT_PAYMENT_DISCLAIMER } from "../../../lib/legal-disclaimers";
import { revenueManagementService } from "../../../lib/revenue-management.service";
import type { PropertyCheckoutPricing } from "../../../lib/property-checkout-pricing.service";
import { previewPropertyCheckoutPricing } from "../../../lib/property-checkout-pricing.service";
import { PropertyJurisdictionBadge } from "../../components/compliance/PropertyJurisdictionBadge";
import { Input } from "../../components/ui/Input";
import { validateLegalJurisdictionForTransactionalAction } from "../../../lib/legal-jurisdiction-gate";
import { DegradedModeBanner } from "../../components/ux";

type CheckoutPhase = "review" | "processing" | "success" | "error";

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  }
}

export function InAppCheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [checkoutParams, setCheckoutParams] = useState<CheckoutParams | null>(null);
  const [listing, setListing] = useState<any>(null);
  const [loadingListing, setLoadingListing] = useState(true);
  const [paymentTermsAccepted, setPaymentTermsAccepted] = useState(false);
  const [phase, setPhase] = useState<CheckoutPhase>("review");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedReference, setCompletedReference] = useState<string | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PropertyCheckoutPricing | null>(null);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [simulatedCheckoutDetected, setSimulatedCheckoutDetected] = useState(false);
  const showSandboxPaymentBanner =
    simulatedCheckoutDetected ||
    String(import.meta.env.VITE_ENABLE_DEMO_DATA ?? "").toLowerCase() === "true" ||
    !clientIntegrations.payangels.checkoutReady;

  useEffect(() => {
    setCheckoutParams(parseCheckoutParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    if (!checkoutParams?.listingId) {
      setLoadingListing(false);
      return;
    }

    let cancelled = false;
    setLoadingListing(true);

    void listingService
      .getListingForPayment(checkoutParams.listingId)
      .then((row) => {
        if (!cancelled) setListing(row);
      })
      .catch(() => {
        if (!cancelled) setListing(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingListing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [checkoutParams?.listingId, user]);

  const paymentContext = useMemo(
    () => (listing ? resolvePaymentContextFromListing(listing) : null),
    [listing],
  );

  const checkoutLegalGate = useMemo(() => {
    if (!listing?.property) return null;
    return validateLegalJurisdictionForTransactionalAction({
      country: listing.property.country,
      region: listing.property.region,
      city: listing.property.city,
      action: "payment_checkout",
    });
  }, [listing]);

  const currency = pricing?.currency || listing?.currency || paymentContext?.currency || "GHS";
  const amount = checkoutParams?.amount ?? 0;
  const serverSubtotalMajor = pricing ? pricing.totalMinor / 100 : amount;
  const taxEstimateMajor = pricing ? pricing.taxMinor / 100 : 0;
  const purposeLabel = checkoutParams
    ? PURPOSE_LABELS[checkoutParams.purpose] || "Payment"
    : "Payment";

  const returnPath = checkoutParams?.returnTo || CONSUMER_ROUTES.payments;
  const propertyLabel =
    listing?.property?.address ||
    [listing?.property?.city, listing?.property?.region].filter(Boolean).join(", ") ||
    "Property";

  const usePayangels = clientIntegrations.payangels.checkoutReady;

  useEffect(() => {
    if (!checkoutParams || amount <= 0) {
      setPricing(null);
      return;
    }

    let cancelled = false;

    void previewPropertyCheckoutPricing({
      baseAmountMajor: amount,
      purpose: checkoutParams.purpose,
      promoCode: appliedPromo,
      property: listing?.property
        ? {
            country: listing.property.country,
            region: listing.property.region,
            city: listing.property.city,
            subdivision_code: listing.property.subdivision_code,
            currency: listing.currency,
          }
        : null,
      organizationId: listing?.organization_id,
    })
      .then((preview) => {
        if (!cancelled) {
          setPricing(preview);
          setPricingError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setPricing(null);
          setPricingError(error instanceof Error ? error.message : "Unable to calculate checkout total");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [amount, appliedPromo, checkoutParams, listing]);

  const handleApplyPromo = async () => {
    if (!checkoutParams || !promoInput.trim()) return;
    setApplyingPromo(true);
    setPricingError(null);
    try {
      const preview = await previewPropertyCheckoutPricing({
        baseAmountMajor: amount,
        purpose: checkoutParams.purpose,
        promoCode: promoInput.trim(),
        property: listing?.property
          ? {
              country: listing.property.country,
              region: listing.property.region,
              city: listing.property.city,
              subdivision_code: listing.property.subdivision_code,
              currency: listing.currency,
            }
          : null,
        organizationId: listing?.organization_id,
      });
      setAppliedPromo(preview.promoCode);
      setPricing(preview);
      toast.success("Promo code applied.");
    } catch (error) {
      setAppliedPromo(null);
      const message = error instanceof Error ? error.message : "Invalid promo code";
      setPricingError(message);
      toast.error(message);
    } finally {
      setApplyingPromo(false);
    }
  };

  const handleClearPromo = () => {
    setPromoInput("");
    setAppliedPromo(null);
    setPricingError(null);
  };

  const handlePay = async () => {
    if (!user?.email || !checkoutParams) {
      navigate("/login", { state: { from: `/checkout?${searchParams.toString()}` } });
      return;
    }

    if (!paymentTermsAccepted) {
      toast.error("Please accept the Payments & Transaction Processing Policy to continue.");
      return;
    }

    if (checkoutLegalGate && !checkoutLegalGate.allowed) {
      toast.error(checkoutLegalGate.message || "Checkout is not available in this jurisdiction.");
      return;
    }

    if (!usePayangels) {
      toast.error("In-app checkout is not available for this market. Contact support for help.");
      return;
    }

    try {
      setPhase("processing");
      setErrorMessage(null);

      await legalAcceptanceService.recordAcceptance({
        userId: user.id,
        scope: "payment_checkout",
        policySlugs: ACCEPTANCE_SCOPES.payment_checkout.policySlugs,
        policyVersion: LEGAL_POLICY_VERSION,
      });

      const checkout = await paymentService.initializePropertyPayment({
        listingId: checkoutParams.listingId,
        purpose: checkoutParams.purpose,
        bookingId: checkoutParams.bookingId,
        dealCaseId: checkoutParams.dealCaseId,
        customerName: checkoutParams.customerName || user.user_metadata?.full_name,
        customerPhone: checkoutParams.customerPhone,
        promoCode: appliedPromo || undefined,
      });

      if (checkout.simulated || String(checkout.accessCode || "").startsWith("sim_")) {
        setSimulatedCheckoutDetected(true);
        throw new Error("Checkout is not configured for live payments.");
      }

      const chargeMinor =
        Number(checkout.transaction?.amount_minor) ||
        Number(checkout.pricing?.totalMinor) ||
        Math.round(serverSubtotalMajor * 100);

      let paid = false;

      await openPayAngelsInline({
        email: user.email,
        amountMinor: chargeMinor,
        currency,
        reference: checkout.reference,
        accessCode: checkout.accessCode,
        onClose: () => {
          if (!paid) setPhase("review");
        },
        onSuccess: async (reference) => {
          paid = true;
          const result = await paymentService.verifyCheckoutReturn({ reference });
          if (result.status !== "success" && result.status !== "completed") {
            throw new Error("Payment could not be verified. Contact support if you were charged.");
          }
          setCompletedReference(reference);
          setPhase("success");
          toast.success("Payment successful.");
        },
      });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "Payment could not be completed.";
      if (message !== "Payment window closed.") {
        setErrorMessage(message);
        setPhase("error");
        toast.error(message);
      } else {
        setPhase("review");
      }
    }
  };

  if (!user) {
    return (
      <DesktopShell minimal>
        <PageMeta title="Checkout" />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold text-ink">Sign in to pay</h1>
          <p className="mt-2 text-ink-secondary">You need an account to complete this payment securely.</p>
          <Button className="mt-6" onClick={() => navigate("/login")}>
            Sign in
          </Button>
        </div>
      </DesktopShell>
    );
  }

  if (!checkoutParams) {
    return (
      <DesktopShell minimal>
        <PageMeta title="Checkout" />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold text-ink">Invalid checkout</h1>
          <p className="mt-2 text-ink-secondary">This payment link is missing required details.</p>
          <Link to="/search" className="mt-6 inline-block text-brand-forest hover:underline">
            Browse properties
          </Link>
        </div>
      </DesktopShell>
    );
  }

  if (phase === "success") {
    return (
      <DesktopShell minimal>
        <PageMeta title="Payment complete" />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
            <Check className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-2xl font-semibold text-ink">Payment successful</h1>
          <p className="mt-2 text-ink-secondary">
            {formatMoney(serverSubtotalMajor, currency)} for {purposeLabel.toLowerCase()} has been received.
          </p>
          {completedReference ? (
            <p className="mt-2 text-sm text-ink-secondary">
              Reference: <code className="font-mono">{completedReference}</code>
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button onClick={() => navigate(returnPath)}>View payments</Button>
            <Button variant="outline" onClick={() => navigate(CONSUMER_ROUTES.home)}>
              Back to home
            </Button>
          </div>
        </div>
      </DesktopShell>
    );
  }

  return (
    <DesktopShell minimal>
      <PageMeta title="Secure checkout" description="Complete your BaytMiftah payment without leaving the app." />
      <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
        {showSandboxPaymentBanner ? (
          <DegradedModeBanner tone="warning" title="Test / sandbox payment mode.">
            Live checkout is unavailable until PayAngels is configured and demo data is turned off.
          </DegradedModeBanner>
        ) : null}

        {checkoutLegalGate && !checkoutLegalGate.allowed ? (
          <DegradedModeBanner tone="danger">{checkoutLegalGate.message}</DegradedModeBanner>
        ) : null}

        <div className="mb-8">
          <p className="text-sm text-ink-secondary">BaytMiftah checkout</p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">Complete payment</h1>
          <p className="mt-2 text-ink-secondary">
            Pay with card or mobile money through our licensed payment partner — the form opens here
            without redirecting you away.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <section className="app-surface-card rounded-2xl p-6 shadow-card">
              <h2 className="text-lg font-semibold text-ink">Promo code</h2>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Input
                  value={promoInput}
                  onChange={(event) => setPromoInput(event.target.value.toUpperCase())}
                  placeholder="Enter promo code"
                  disabled={Boolean(appliedPromo) || applyingPromo}
                />
                {appliedPromo ? (
                  <Button variant="outline" onClick={handleClearPromo}>
                    Remove
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    disabled={!promoInput.trim() || applyingPromo}
                    onClick={() => void handleApplyPromo()}
                  >
                    {applyingPromo ? "Applying…" : "Apply"}
                  </Button>
                )}
              </div>
              {appliedPromo ? (
                <p className="mt-2 text-sm text-green-700">Promo {appliedPromo} applied.</p>
              ) : null}
              {pricingError ? (
                <p className="mt-2 text-sm text-red-700">{pricingError}</p>
              ) : null}
            </section>

            <section className="app-surface-card rounded-2xl p-6 shadow-card">
              <h2 className="text-lg font-semibold text-ink">Payment method</h2>
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-brand-forest/20 bg-brand-forest/5 p-4">
                <CreditCard className="mt-0.5 h-5 w-5 text-brand-forest" />
                <div>
                  <p className="font-medium text-ink">Card & mobile money</p>
                  <p className="mt-1 text-sm text-ink-secondary">
                    Card, bank, and Ghana mobile money wallets are supported.
                    BaytMiftah does not hold or custody the funds.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-xl border border-surface-border bg-surface-subtle/50 p-4 text-sm text-ink-secondary">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand-forest" />
                <p>
                  Your card details are entered on the payment provider&apos;s secure form inside this
                  page. BaytMiftah never stores your full card number. A completed status means we
                  received confirmation from the payment provider.
                </p>
              </div>

              {paymentContext ? (
                <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-ink-secondary">
                  {realEstateComplianceService
                    .getPaymentComplianceDisclosures(paymentContext.jurisdictionId)
                    .disclosures.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                </ul>
              ) : null}
            </section>

            <LegalAcceptanceCheckbox
              scope="payment_checkout"
              checked={paymentTermsAccepted}
              onChange={setPaymentTermsAccepted}
              id="in-app-payment-terms"
              className="rounded-2xl border border-surface-border bg-surface p-4"
            />

            {errorMessage ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                {errorMessage}
              </div>
            ) : null}

            <Button
              size="lg"
              className="w-full"
              disabled={loadingListing || phase === "processing" || !paymentTermsAccepted || !usePayangels || !pricing}
              onClick={() => void handlePay()}
            >
              {phase === "processing" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opening secure payment…
                </>
              ) : (
                <>Pay {formatMoney(serverSubtotalMajor, currency)}</>
              )}
            </Button>

            <button
              type="button"
              className="w-full text-center text-sm text-ink-secondary hover:text-ink"
              onClick={() => navigate(-1)}
            >
              Cancel and go back
            </button>
          </div>

          <aside className="app-surface-card h-fit rounded-2xl p-6 shadow-card md:sticky md:top-24">
            <h2 className="text-lg font-semibold text-ink">Order summary</h2>
            {loadingListing ? (
              <p className="mt-4 text-sm text-ink-secondary">Loading property…</p>
            ) : (
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <p className="text-ink-secondary">Property</p>
                  <p className="font-medium text-ink">{propertyLabel}</p>
                  {listing?.property ? (
                    <div className="mt-2">
                      <PropertyJurisdictionBadge property={listing.property} compact />
                    </div>
                  ) : null}
                </div>
                <div>
                  <p className="text-ink-secondary">Payment for</p>
                  <p className="font-medium text-ink">{purposeLabel}</p>
                </div>
                <div className="border-t border-surface-border pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-secondary">Subtotal</span>
                    <span className="font-medium text-ink">{formatMoney(amount, currency)}</span>
                  </div>
                  {pricing && pricing.platformFeeMinor > 0 ? (
                    <div className="flex items-center justify-between">
                      <span className="text-ink-secondary">
                        {pricing.feeDisplayName || "BaytMiftah platform fee"}
                      </span>
                      <span className="font-medium text-ink">
                        {formatMoney(pricing.platformFeeMinor / 100, currency)}
                      </span>
                    </div>
                  ) : pricing && pricing.feesEnabled === false ? (
                    <p className="text-xs text-ink-secondary">Platform fees are turned off for this checkout.</p>
                  ) : null}
                  {pricing && pricing.providerPlatformFeeMinor > 0 ? (
                    <p className="text-xs text-ink-secondary">
                      Provider platform fee {formatMoney(pricing.providerPlatformFeeMinor / 100, currency)}{" "}
                      is withheld from the seller/landlord proceeds (not added to your charge).
                    </p>
                  ) : null}
                  {pricing && pricing.processingFeeMinor > 0 ? (
                    <div className="flex items-center justify-between">
                      <span className="text-ink-secondary">Payment processing</span>
                      <span className="font-medium text-ink">
                        {formatMoney(pricing.processingFeeMinor / 100, currency)}
                      </span>
                    </div>
                  ) : null}
                  {pricing && pricing.discountMinor > 0 ? (
                    <div className="flex items-center justify-between text-green-700">
                      <span>Promo discount</span>
                      <span className="font-medium">
                        -{formatMoney(pricing.discountMinor / 100, currency)}
                      </span>
                    </div>
                  ) : null}
                  {pricing?.taxesEnabled !== false
                    ? pricing?.taxLines.map((line) => (
                        <div key={line.id} className="flex items-center justify-between">
                          <span className="text-ink-secondary">{line.label} (est.)</span>
                          <span className="font-medium text-ink">
                            {formatMoney(line.amountMinor / 100, currency)}
                          </span>
                        </div>
                      ))
                    : (
                      <p className="text-xs text-ink-secondary">
                        Checkout taxes are turned off for this seller/organization.
                      </p>
                    )}
                  {pricing?.taxesEnabled !== false && pricing?.subdivisionLabel ? (
                    <p className="text-xs text-ink-secondary pt-1">
                      Tax rules: {pricing.subdivisionLabel} ({pricing.jurisdictionId})
                    </p>
                  ) : null}
                  <div className="flex items-center justify-between border-t border-surface-border pt-3">
                    <span className="text-ink-secondary">Amount due</span>
                    <span className="text-xl font-semibold text-ink">
                      {formatMoney(serverSubtotalMajor, currency)}
                    </span>
                  </div>
                  {taxEstimateMajor > 0 && pricing?.taxesEnabled !== false ? (
                    <p className="text-xs text-ink-secondary">
                      VAT/levy estimate on BaytMiftah platform fee (
                      {formatMoney(taxEstimateMajor, currency)}) — shown for transparency, not
                      included in charge in this pilot.
                    </p>
                  ) : null}
                </div>
              </div>
            )}

            <div className="mt-6 flex items-start gap-2 rounded-lg bg-surface-subtle/60 p-3 text-xs text-ink-secondary">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-brand-forest" />
              <span>{CHECKOUT_PAYMENT_DISCLAIMER}</span>
            </div>
            <MarketplaceDisclaimerStrip compact className="mt-3" />
          </aside>
        </div>
      </div>
    </DesktopShell>
  );
}
