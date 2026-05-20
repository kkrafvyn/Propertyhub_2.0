import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { Building2, CheckCircle2, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import {
  formatMinorCurrency,
  subscriptionService,
  type SubscriptionTier,
} from "../../../lib/subscription.service";
import { organizationService } from "../../../lib/organization.service";
import {
  WORKSPACE_ENTRY_PATH,
  getWorkspaceRoute,
  normalizeOrganizationMemberships,
  toOrganizationSlug,
  type MembershipRow,
  type OrganizationMembership,
} from "../../../lib/workspace";

const ALLOWED_WORKSPACE_PAGES = new Set([
  "new",
  "listings",
  "leads",
  "team",
  "settings",
  "billing",
  "documents",
  "trust",
  "calendar",
  "payments",
  "smart-access",
  "finance",
]);

const PROPERTY_TYPE_OPTIONS = [
  "Apartment",
  "House",
  "Commercial",
  "Office",
  "Warehouse",
  "Car Park",
  "Office Complex",
  "Land",
  "Developer Projects",
];

const BILLING_LANES = [
  {
    id: "paystack-ghs",
    label: "Paystack",
    helper: "GHS billing with Mobile Money, card, or bank transfer. Live default.",
    provider: "paystack" as const,
    currency: "GHS" as const,
  },
  {
    id: "stripe-usd",
    label: "Stripe",
    helper: "USD card billing for diaspora teams. Falls back to Paystack until configured.",
    provider: "stripe" as const,
    currency: "USD" as const,
  },
  {
    id: "flutterwave-ghs",
    label: "Flutterwave",
    helper: "GHS card/mobile money billing. Falls back to Paystack until configured.",
    provider: "flutterwave" as const,
    currency: "GHS" as const,
  },
];

function sanitizeRequestedPage(value: string | null) {
  if (!value) return "";
  return ALLOWED_WORKSPACE_PAGES.has(value) ? value : "";
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return "We couldn't start billing right now.";
}

function getErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    return String(error.code);
  }

  return "";
}

export function WorkspaceEntry() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [selectedTierId, setSelectedTierId] = useState("starter");
  const [selectedBillingLaneId, setSelectedBillingLaneId] = useState("paystack-ghs");
  const [slugEdited, setSlugEdited] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    email: user?.email || "",
    phone: "",
    website: "",
    businessAddress: "",
    licenseNumber: "",
    contactPersonName: "",
    contactPersonPhone: "",
    propertyTypesHandled: ["Apartment", "House"],
  });

  const requestedPage = useMemo(
    () => sanitizeRequestedPage(searchParams.get("next")),
    [searchParams]
  );
  const billingMode = searchParams.get("billing");
  const paymentReference = searchParams.get("reference") || searchParams.get("trxref");
  const stripeSessionId = searchParams.get("stripe_session_id") || searchParams.get("session_id");
  const isBillingReturn = billingMode === "verify";

  const loadEntryData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setLoadError(null);
      const [rows, tierRows] = await Promise.all([
        organizationService.getUserOrganizations(user.id) as Promise<MembershipRow[]>,
        subscriptionService.getSubscriptionTiers(),
      ]);
      setMemberships(normalizeOrganizationMemberships(rows));
      setTiers(tierRows);
      setSelectedTierId((current) => tierRows.some((tier) => tier.id === current) ? current : tierRows[0]?.id || "starter");
    } catch (error) {
      console.error("Failed to load workspace entry data:", error);
      setLoadError("We couldn't load workspace billing options right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEntryData();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.email) return;

    setForm((current) => ({
      ...current,
      email: current.email || user.email || "",
    }));
  }, [user?.email]);

  useEffect(() => {
    if (!user || !isBillingReturn || verifying) return;

    const verifyBilling = async () => {
      if (!paymentReference && !stripeSessionId) {
        toast.error("The payment provider did not return a verification reference.");
        return;
      }

      try {
        setVerifying(true);
        const result = await subscriptionService.verifyOrganizationSubscription(
          paymentReference || stripeSessionId || "",
          stripeSessionId
        );
        toast.success(
          result.alreadyProcessed
            ? "Subscription was already verified."
            : "Subscription verified. Your workspace is active."
        );
        navigate(getWorkspaceRoute(result.organization.slug), { replace: true });
      } catch (error) {
        console.error("Failed to verify subscription:", error);
        toast.error(getErrorMessage(error));
      } finally {
        setVerifying(false);
      }
    };

    void verifyBilling();
  }, [user?.id, isBillingReturn, paymentReference, stripeSessionId, verifying, navigate]);

  const handleNameChange = (value: string) => {
    setForm((current) => ({
      ...current,
      name: value,
      slug: slugEdited ? current.slug : toOrganizationSlug(value),
    }));
  };

  const handleSlugChange = (value: string) => {
    setSlugEdited(true);
    setForm((current) => ({
      ...current,
      slug: toOrganizationSlug(value),
    }));
  };

  const togglePropertyType = (propertyType: string) => {
    setForm((current) => {
      const hasType = current.propertyTypesHandled.includes(propertyType);
      return {
        ...current,
        propertyTypesHandled: hasType
          ? current.propertyTypesHandled.filter((item) => item !== propertyType)
          : [...current.propertyTypesHandled, propertyType],
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user) {
      toast.error("You need to be signed in to create a workspace.");
      return;
    }

    if (!form.name.trim()) {
      toast.error("Organization name is required.");
      return;
    }

    if (!form.businessAddress.trim() || !form.licenseNumber.trim()) {
      toast.error("Business address and registration or license number are required.");
      return;
    }

    const nextSlug = toOrganizationSlug(form.slug || form.name);
    if (!nextSlug) {
      toast.error("Enter a valid workspace slug.");
      return;
    }

    try {
      setCreating(true);
      const selectedBillingLane =
        BILLING_LANES.find((lane) => lane.id === selectedBillingLaneId) || BILLING_LANES[0];
      const result = await subscriptionService.initializeOrganizationSubscription({
        tierId: selectedTierId,
        provider: selectedBillingLane.provider,
        currency: selectedBillingLane.currency,
        organization: {
          ...form,
          slug: nextSlug,
          registrationNumber: form.licenseNumber,
        },
      });

      toast.success(
        `Workspace reserved. Continue to ${
          result.provider || selectedBillingLane.provider
        } checkout to activate it.`
      );
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      console.error("Failed to initialize subscription:", error);
      const message = getErrorMessage(error);
      const code = getErrorCode(error);
      if (code === "23505" || message.includes("duplicate") || message.includes("slug")) {
        toast.error("That workspace slug is already taken. Try another one.");
      } else {
        toast.error(message);
      }
    } finally {
      setCreating(false);
    }
  };

  const firstMembership = memberships[0] || null;
  const selectedTier = tiers.find((tier) => tier.id === selectedTierId) || tiers[0] || null;
  const selectedBillingLane =
    BILLING_LANES.find((lane) => lane.id === selectedBillingLaneId) || BILLING_LANES[0];

  if (loading || verifying) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Card className="mx-auto max-w-xl p-8 text-center text-muted-foreground">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
          {verifying ? "Verifying subscription payment..." : "Loading workspace setup..."}
        </Card>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Card className="mx-auto max-w-xl p-8 text-center">
          <h1 className="mb-3 text-2xl font-semibold">Workspace unavailable</h1>
          <p className="mb-6 text-muted-foreground">{loadError}</p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => void loadEntryData()}>Try Again</Button>
            <Link to="/">
              <Button variant="outline">Back Home</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (firstMembership && !isBillingReturn) {
    return (
      <Navigate
        to={getWorkspaceRoute(
          firstMembership.organization.slug,
          requestedPage || undefined
        )}
        replace
      />
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f0f7ee,transparent_38%),linear-gradient(135deg,#fffdf7,#f7efe5)] px-4 py-10">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-[1.1fr,0.9fr]">
        <Card className="p-8 shadow-sm lg:p-10">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary">BaytMiftah Phase 1</p>
              <h1 className="text-3xl font-semibold">Create and activate your workspace</h1>
            </div>
          </div>

          <p className="mb-8 text-muted-foreground">
            Register the organization, choose a monthly SaaS tier, then complete the first
            subscription payment before the workspace unlocks.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Organization Name"
                value={form.name}
                onChange={(event) => handleNameChange(event.target.value)}
                placeholder="Prime Properties Ghana"
                required
              />
              <Input
                label="Workspace Slug"
                value={form.slug}
                onChange={(event) => handleSlugChange(event.target.value)}
                placeholder="prime-properties-ghana"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-foreground">Description</label>
              <textarea
                className="min-h-28 w-full rounded-lg border border-border bg-input-background px-4 py-3 text-foreground"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Tell clients and teammates what this organization does."
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Business Address"
                value={form.businessAddress}
                onChange={(event) =>
                  setForm((current) => ({ ...current, businessAddress: event.target.value }))
                }
                placeholder="East Legon, Accra"
                required
              />
              <Input
                label="Registration / License Number"
                value={form.licenseNumber}
                onChange={(event) =>
                  setForm((current) => ({ ...current, licenseNumber: event.target.value }))
                }
                placeholder="BN-0000000"
                required
              />
              <Input
                label="Public Email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="hello@example.com"
              />
              <Input
                label="Phone"
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone: event.target.value }))
                }
                placeholder="+233 24 000 0000"
              />
              <Input
                label="Contact Person"
                value={form.contactPersonName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, contactPersonName: event.target.value }))
                }
                placeholder="Ama Mensah"
              />
              <Input
                label="Contact Phone"
                value={form.contactPersonPhone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, contactPersonPhone: event.target.value }))
                }
                placeholder="+233 55 000 0000"
              />
            </div>

            <Input
              label="Website"
              value={form.website}
              onChange={(event) =>
                setForm((current) => ({ ...current, website: event.target.value }))
              }
              placeholder="https://example.com"
            />

            <div>
              <label className="mb-3 block text-sm text-foreground">Property types handled</label>
              <div className="flex flex-wrap gap-2">
                {PROPERTY_TYPE_OPTIONS.map((propertyType) => {
                  const selected = form.propertyTypesHandled.includes(propertyType);
                  return (
                    <button
                      key={propertyType}
                      type="button"
                      onClick={() => togglePropertyType(propertyType)}
                      className={`rounded-full border px-3 py-2 text-sm transition ${
                        selected
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-white hover:border-primary/50"
                      }`}
                    >
                      {propertyType}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-3 block text-sm text-foreground">Subscription tier</label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {tiers.map((tier) => {
                  const selected = tier.id === selectedTierId;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setSelectedTierId(tier.id)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        selected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-white hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">{tier.name}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatMinorCurrency(tier.price_minor, tier.currency)}/month
                          </p>
                        </div>
                        {selected ? <CheckCircle2 className="h-5 w-5 text-primary" /> : null}
                      </div>
                      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <p>
                          Seats:{" "}
                          {tier.agent_seat_limit == null ? "Unlimited" : tier.agent_seat_limit}
                        </p>
                        <p>
                          Active listings:{" "}
                          {tier.active_listing_limit == null
                            ? "Unlimited"
                            : tier.active_listing_limit}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-3 block text-sm text-foreground">Billing lane</label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {BILLING_LANES.map((lane) => {
                  const selected = lane.id === selectedBillingLaneId;
                  return (
                    <button
                      key={lane.id}
                      type="button"
                      onClick={() => setSelectedBillingLaneId(lane.id)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        selected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-white hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">{lane.label}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{lane.helper}</p>
                        </div>
                        {selected ? <CheckCircle2 className="h-5 w-5 text-primary" /> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="submit" size="lg" disabled={creating || !selectedTier}>
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Opening checkout...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Continue to {selectedBillingLane.label}
                  </>
                )}
              </Button>
              <Link to="/">
                <Button type="button" size="lg" variant="outline">
                  Back Home
                </Button>
              </Link>
            </div>
          </form>
        </Card>

        <Card className="overflow-hidden bg-white/85 p-8 shadow-sm lg:p-10">
          <div className="mb-6 flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <span className="font-medium">Payment-required activation</span>
          </div>

          <div className="space-y-5">
            <div>
              <h2 className="font-semibold">Phase 1 stays focused</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Dashboard, Billing, Team, Settings, and Verification are prioritized before the
                marketplace and escrow layers expand.
              </p>
            </div>
            <div>
              <h2 className="font-semibold">Admin verification starts immediately</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your business details enter the admin queue as soon as checkout is initialized.
              </p>
            </div>
            <div>
              <h2 className="font-semibold">Smart access is lined up cleanly</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Smart Property Access now has a later-phase lane, but workspace activation stays
                focused on subscription billing first.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-secondary/35 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="font-semibold">Selected tier</span>
              {selectedTier ? <Badge>{selectedTier.name}</Badge> : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedTier
                ? `${formatMinorCurrency(
                    selectedTier.price_minor,
                    selectedTier.currency
                  )} per month, ${
                    `requested through ${selectedBillingLane.label}. If that provider is not configured yet, BaytMiftah will activate through Paystack.`
                  }`
                : "Choose a tier to continue."}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              After checkout returns to{" "}
              <span className="font-medium text-foreground">{WORKSPACE_ENTRY_PATH}</span>, we verify
              the reference and open the workspace.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
