import { useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Calculator,
  Camera,
  CheckCircle2,
  CreditCard,
  FileText,
  KeyRound,
  Mail,
  MapPinned,
  MessageSquareText,
  Radio,
  ShieldCheck,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "../components/Navbar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import {
  API_KEY_FREE_FEATURES,
  buildAffordabilitySchedule,
  buildHyperlocalSourceSummary,
  buildMediaStudioPlan,
  buildProviderActivationPlan,
  calculatePropertyTaxImpact,
  summarizeApiKeyFreeFeatures,
  type ApiKeyFreeFeature,
  type ApiKeyFreeFeatureStatus,
} from "../../lib/feature-completion.service";
import { implementedProviderReadyFunctionNames } from "../../lib/provider-ready-features.service";

const categoryConfig: Record<
  ApiKeyFreeFeature["category"],
  { label: string; icon: typeof FileText; tone: string }
> = {
  content: { label: "Content", icon: FileText, tone: "bg-rose-50 text-primary" },
  media: { label: "Media", icon: Video, tone: "bg-sky-50 text-sky-700" },
  finance: { label: "Finance", icon: Calculator, tone: "bg-emerald-50 text-emerald-700" },
  hyperlocal: { label: "Hyperlocal", icon: MapPinned, tone: "bg-amber-50 text-amber-700" },
  community: { label: "Community", icon: MessageSquareText, tone: "bg-indigo-50 text-indigo-700" },
  trust: { label: "Trust", icon: ShieldCheck, tone: "bg-teal-50 text-teal-700" },
  payments: { label: "Payments", icon: CreditCard, tone: "bg-orange-50 text-orange-700" },
  iot: { label: "IoT", icon: KeyRound, tone: "bg-violet-50 text-violet-700" },
  operations: { label: "Operations", icon: CheckCircle2, tone: "bg-slate-100 text-slate-700" },
};

const statusLabels: Record<ApiKeyFreeFeatureStatus, string> = {
  available_now: "Available now",
  provider_ready: "Provider-ready",
  legal_review: "Legal review",
  human_review: "Human review",
  production_data_needed: "Needs live data",
};

function formatMoney(amount: number, currency = "GHS") {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function getStatusVariant(
  status: ApiKeyFreeFeatureStatus
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "available_now") return "default";
  if (status === "legal_review") return "secondary";
  if (status === "production_data_needed") return "destructive";
  return "outline";
}

export function InnovationLab() {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [taxForm, setTaxForm] = useState({
    price: "1200000",
    annualRent: "144000",
    ownershipYears: "5",
    propertyTaxRate: "0.5",
    rentalTaxRate: "8",
    reserveRate: "1.5",
  });
  const [planAmount, setPlanAmount] = useState("12000");
  const [planCadence, setPlanCadence] = useState<"daily" | "weekly" | "monthly">("weekly");

  const summary = useMemo(() => summarizeApiKeyFreeFeatures(), []);
  const mediaPlan = useMemo(
    () =>
      buildMediaStudioPlan({
        mediaTypes: ["video", "floor_plan", "drone"],
        hasMeasuredFloorPlan: true,
        hasLiveOpenHouse: false,
      }),
    []
  );
  const providerPlans = useMemo(
    () => [
      buildProviderActivationPlan({
        provider: "Paystack / Stripe / Flutterwave fallback",
        hasCredentials: false,
        webhookConfigured: true,
        sandboxEvidence: false,
        legalApproved: true,
      }),
      buildProviderActivationPlan({
        provider: "TTLock / Yale / Tuya smart access",
        hasCredentials: false,
        webhookConfigured: false,
        sandboxEvidence: false,
        legalApproved: true,
      }),
      buildProviderActivationPlan({
        provider: "Ghana Card / liveness / registry checks",
        hasCredentials: false,
        webhookConfigured: false,
        sandboxEvidence: false,
        legalApproved: false,
      }),
    ],
    []
  );
  const hyperlocalSummary = useMemo(
    () =>
      buildHyperlocalSourceSummary([
        {
          sourceKey: "nadmo_flood_history",
          label: "Flood incident history",
          status: "manual_collection",
          confidenceScore: 45,
        },
        {
          sourceKey: "ecg_power_reliability",
          label: "Power reliability",
          status: "planned",
          confidenceScore: 0,
        },
        {
          sourceKey: "water_reliability",
          label: "Water reliability",
          status: "planned",
          confidenceScore: 0,
        },
        {
          sourceKey: "transit_density",
          label: "Transit and commercial density",
          status: "manual_collection",
          confidenceScore: 35,
        },
      ]),
    []
  );
  const taxImpact = useMemo(
    () =>
      calculatePropertyTaxImpact({
        price: Number(taxForm.price || 0),
        annualRent: Number(taxForm.annualRent || 0),
        ownershipYears: Number(taxForm.ownershipYears || 1),
        annualPropertyTaxRatePercent: Number(taxForm.propertyTaxRate || 0),
        rentalIncomeTaxPercent: Number(taxForm.rentalTaxRate || 0),
        maintenanceReservePercent: Number(taxForm.reserveRate || 0),
      }),
    [taxForm]
  );
  const affordabilityPlan = useMemo(
    () =>
      buildAffordabilitySchedule({
        amount: Number(planAmount || 0),
        cadence: planCadence,
        installments: planCadence === "daily" ? 30 : planCadence === "weekly" ? 4 : 1,
        providerConfigured: false,
        legalApproved: false,
      }),
    [planAmount, planCadence]
  );

  const groupedFeatures = useMemo(() => {
    return API_KEY_FREE_FEATURES.reduce((acc, feature) => {
      acc[feature.category] = [...(acc[feature.category] || []), feature];
      return acc;
    }, {} as Record<ApiKeyFreeFeature["category"], ApiKeyFreeFeature[]>);
  }, []);

  const handleNewsletter = (event: FormEvent) => {
    event.preventDefault();
    if (!newsletterEmail.includes("@")) {
      toast.error("Add a valid email before joining the newsletter waitlist.");
      return;
    }

    toast.success("Newsletter interest saved locally. Connect the email provider later.");
    setNewsletterEmail("");
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff_0%,#fff7f9_45%,#f8fafc_100%)]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2.25rem] border border-primary/15 bg-white shadow-sm">
          <div className="grid gap-8 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-10">
            <div>
              <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
                API-key-free completion pack
              </Badge>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
                Build every remaining moat now. Plug providers in later.
              </h1>
              <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
                This lab turns the unfinished list into working product surfaces: content,
                creators, rich media, tax tools, community, hyperlocal data, trust checks,
                payment fallback, and IoT activation. No API keys are stored or required here.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Badge variant="default">{summary.apiKeyFreeCount} local surfaces</Badge>
                <Badge variant="outline">{summary.externalActivationCount} provider-gated</Badge>
                <Badge variant="outline">{implementedProviderReadyFunctionNames.length} callable functions</Badge>
                <Badge variant="outline">No blockchain</Badge>
              </div>
            </div>

            <Card className="bg-[#10131c] p-6 text-white">
              <p className="text-sm uppercase tracking-[0.28em] text-white/55">Completion status</p>
              <p className="mt-4 text-5xl font-semibold">{summary.percentLocallyDemonstrable}%</p>
              <p className="mt-2 text-sm text-white/65">
                Locally demonstrable without secrets. External providers remain gated by credentials,
                sandbox evidence, legal review, and operating runbooks.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {Object.entries(statusLabels).map(([status, label]) => (
                  <div key={status} className="rounded-2xl bg-white/8 p-4">
                    <p className="text-2xl font-semibold">
                      {summary.byStatus[status as ApiKeyFreeFeatureStatus] || 0}
                    </p>
                    <p className="text-sm text-white/65">{label}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Newsletter and CMS</h2>
                <p className="text-sm text-muted-foreground">Capture demand before provider setup.</p>
              </div>
            </div>
            <form className="mt-5 flex gap-2" onSubmit={handleNewsletter}>
              <Input
                type="email"
                value={newsletterEmail}
                placeholder="buyer@example.com"
                onChange={(event) => setNewsletterEmail(event.target.value)}
              />
              <Button type="submit">Join</Button>
            </form>
            <p className="mt-3 text-xs text-muted-foreground">
              Later: connect Resend, Beehiiv, Mailchimp, or a CMS. For now, this proves the UX and
              consent copy without secrets.
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Media Studio</h2>
                <p className="text-sm text-muted-foreground">{mediaPlan.score}% remote-buyer ready</p>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              {mediaPlan.tasks.map((task) => (
                <div key={task.key} className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2 text-sm">
                  <span>{task.label}</span>
                  {task.complete ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-violet-50 p-3 text-violet-700">
                <Radio className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Live Open House</h2>
                <p className="text-sm text-muted-foreground">Provider-neutral stream readiness.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm text-muted-foreground">
              <p>Use a livestream URL, RSVP list, reminder notifications, and replay link metadata.</p>
              <p>Provider activation can later use Zoom, YouTube Live, Instagram Live, or a real-estate tour vendor.</p>
            </div>
          </Card>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Tax and Holding Cost Simulator</h2>
                <p className="text-sm text-muted-foreground">Editable estimates only, not advice.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["price", "Property price"],
                ["annualRent", "Annual rent"],
                ["ownershipYears", "Years held"],
                ["propertyTaxRate", "Property tax %"],
                ["rentalTaxRate", "Rental tax %"],
                ["reserveRate", "Maintenance reserve %"],
              ].map(([key, label]) => (
                <label key={key} className="text-sm">
                  <span className="mb-1 block text-muted-foreground">{label}</span>
                  <Input
                    value={taxForm[key as keyof typeof taxForm]}
                    onChange={(event) =>
                      setTaxForm((current) => ({ ...current, [key]: event.target.value }))
                    }
                  />
                </label>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold">Estimated output</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-secondary/40 p-4">
                <p className="text-sm text-muted-foreground">Annual property tax</p>
                <p className="mt-1 text-xl font-semibold">
                  {formatMoney(taxImpact.estimatedAnnualPropertyTax)}
                </p>
              </div>
              <div className="rounded-2xl bg-secondary/40 p-4">
                <p className="text-sm text-muted-foreground">Annual rental tax</p>
                <p className="mt-1 text-xl font-semibold">
                  {formatMoney(taxImpact.estimatedAnnualRentalTax)}
                </p>
              </div>
              <div className="rounded-2xl bg-secondary/40 p-4">
                <p className="text-sm text-muted-foreground">Annual carrying cost</p>
                <p className="mt-1 text-xl font-semibold">
                  {formatMoney(taxImpact.annualCarryingCost)}
                </p>
              </div>
              <div className="rounded-2xl bg-secondary/40 p-4">
                <p className="text-sm text-muted-foreground">Holding-period cost</p>
                <p className="mt-1 text-xl font-semibold">
                  {formatMoney(taxImpact.holdingPeriodCost)}
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{taxImpact.disclaimer}</p>
          </Card>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
                <MapPinned className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Hyperlocal Signal Board</h2>
                <p className="text-sm text-muted-foreground">
                  {hyperlocalSummary.averageConfidence}% average confidence from current sample sources.
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {hyperlocalSummary.sources.map((source) => (
                <div key={source.sourceKey} className="rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{source.label}</p>
                    <Badge variant={source.status === "connected" ? "default" : "outline"}>
                      {source.status.replaceAll("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Confidence: {source.confidenceScore}%
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{hyperlocalSummary.disclosure}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-700">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Community and Creator Marketplace</h2>
                <p className="text-sm text-muted-foreground">Moderated first. Payouts reviewed.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                "Neighborhood Q&A with report actions",
                "Emergency broadcast draft queue",
                "Paid local guide submissions",
                "Photography marketplace review",
                "Referral reward approval ledger",
                "Contributor tax and payout notes",
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-secondary/40 p-4 text-sm">
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="font-semibold">Affordability Plan Simulator</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">Amount</span>
                <Input value={planAmount} onChange={(event) => setPlanAmount(event.target.value)} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">Cadence</span>
                <select
                  value={planCadence}
                  onChange={(event) =>
                    setPlanCadence(event.target.value as "daily" | "weekly" | "monthly")
                  }
                  className="h-11 w-full rounded-lg border border-border bg-white px-3"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
            </div>
            <div className="mt-5 rounded-2xl bg-secondary/40 p-4">
              <p className="text-sm text-muted-foreground">
                {affordabilityPlan.cadenceLabel} installment
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {formatMoney(affordabilityPlan.installmentAmount, affordabilityPlan.currency)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {affordabilityPlan.installments} installment(s), total{" "}
                {formatMoney(affordabilityPlan.totalAmount, affordabilityPlan.currency)}
              </p>
            </div>
            <div className="mt-4 space-y-2">
              {affordabilityPlan.activationGaps.map((gap) => (
                <div key={gap} className="flex items-center gap-2 text-sm text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                  {gap}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold">Provider Activation Matrix</h2>
            <div className="mt-5 space-y-4">
              {providerPlans.map((plan) => (
                <div key={plan.provider} className="rounded-2xl border border-border p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <p className="font-medium">{plan.provider}</p>
                    <Badge variant={plan.canGoLive ? "default" : "outline"}>
                      {plan.canGoLive ? "Go-live ready" : `${plan.missing.length} gaps`}
                    </Badge>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {plan.checks.map((check) => (
                      <div key={check.label} className="rounded-xl bg-secondary/35 p-3 text-sm">
                        <div className="flex items-center gap-2">
                          {check.complete ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                          )}
                          <span>{check.label}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{check.helper}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">All Remaining Feature Surfaces</h2>
              <p className="text-muted-foreground">
                Built to run without API keys first. External activation stays behind evidence gates.
              </p>
            </div>
            <Badge variant="outline">{API_KEY_FREE_FEATURES.length} features</Badge>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {Object.entries(groupedFeatures).map(([category, features]) => {
              const config = categoryConfig[category as ApiKeyFreeFeature["category"]];
              const Icon = config.icon;

              return (
                <Card key={category} className="p-5">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-2xl p-3 ${config.tone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{config.label}</h3>
                      <p className="text-sm text-muted-foreground">{features.length} surface(s)</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {features.map((feature) => (
                      <div key={feature.key} className="rounded-2xl border border-border p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <p className="font-medium">{feature.title}</p>
                          <Badge variant={getStatusVariant(feature.status)}>
                            {statusLabels[feature.status]}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{feature.userValue}</p>
                        <div className="mt-3 grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
                          <div className="rounded-xl bg-secondary/35 p-3">
                            <span className="font-semibold text-foreground">Now: </span>
                            {feature.noKeyImplementation}
                          </div>
                          <div className="rounded-xl bg-secondary/35 p-3">
                            <span className="font-semibold text-foreground">Later: </span>
                            {feature.externalActivation}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
