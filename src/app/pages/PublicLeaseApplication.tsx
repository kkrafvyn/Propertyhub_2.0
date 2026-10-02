import { Textarea } from "@/app/components/ui/textarea";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import {
  CheckCircle2,
  ShieldCheck,
  Building2,
  Lock,
  User,
  Mail,
  Phone,
  Users,
  Briefcase,
  FileText,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/badge";
import { StandalonePageShell } from "../components/ux/StandalonePageShell";
import { leaseScreeningService } from "../../lib/lease-screening.service";

export function PublicLeaseApplication() {
  const estateId = window.location.pathname.split("/").pop() || "";
  const [submitting, setSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<{ id: string; public_token?: string } | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    householdSize: "1",
    employment: "",
    monthlyIncome: "",
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!consentGiven) {
      toast.error("Please confirm your consent to the Ghana Data Protection Act check.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await leaseScreeningService.submitApplication({
        estateId,
        applicantName: form.name,
        applicantEmail: form.email,
        applicantPhone: form.phone,
        householdSize: Number(form.householdSize),
        employmentSummary: form.monthlyIncome
          ? `${form.employment} (Est. Monthly Income: GHS ${form.monthlyIncome})`
          : form.employment,
      });
      setSubmittedData(res);
      toast.success("Lease application submitted successfully.");
    } catch (error: any) {
      toast.error(error?.message || "Unable to submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyRef = async (ref: string) => {
    await navigator.clipboard.writeText(ref);
    setCopiedToken(true);
    toast.success("Application reference copied!");
    setTimeout(() => setCopiedToken(false), 2500);
  };

  if (submittedData) {
    const refCode = (submittedData.public_token || submittedData.id || "APP-SUCCESS").slice(0, 10).toUpperCase();

    return (
      <StandalonePageShell maxWidthClassName="max-w-2xl">
        <div className="py-12 px-4">
          <Card
            variant="glass"
            className="p-8 sm:p-10 text-center space-y-6 border border-emerald-500/30 bg-surface/90 backdrop-blur-md rounded-3xl shadow-xl"
          >
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-10 w-10" />
              <div className="absolute inset-0 rounded-3xl bg-emerald-500/20 blur-xl pointer-events-none" />
            </div>

            <div className="space-y-2">
              <Badge variant="success" dot className="text-xs font-bold px-3 py-1">
                Application Received & Queued
              </Badge>
              <h1 className="text-3xl font-display font-medium text-ink">
                Your Tenancy Application is Submitted
              </h1>
              <p className="text-sm text-ink-secondary max-w-md mx-auto leading-relaxed">
                Your credentials have been securely routed to the property leasing desk. Automated screening and verification checks are now underway.
              </p>
            </div>

            {/* Application Reference Code */}
            <div className="p-4 rounded-2xl bg-surface-subtle/70 border border-surface-border inline-flex flex-col items-center gap-2 max-w-md w-full">
              <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                Application Tracking Reference
              </span>
              <div className="flex items-center gap-2">
                <code className="px-3 py-1.5 rounded-xl bg-surface border border-surface-border text-sm font-mono font-bold text-ink select-all">
                  {refCode}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void copyRef(refCode)}
                  className="gap-1.5 text-xs h-9"
                >
                  {copiedToken ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedToken ? "Copied" : "Copy"}</span>
                </Button>
              </div>
            </div>

            {/* Next Steps Visualizer */}
            <div className="text-left p-5 rounded-2xl bg-surface-subtle/50 border border-surface-border space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
                What Happens Next?
              </h3>
              <div className="space-y-2 text-xs text-ink-secondary">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-[10px] font-bold">
                    1
                  </div>
                  <span><strong>Background Screening:</strong> Income, credit profile, and identification are validated in accordance with Act 220 regulations.</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-[10px] font-bold">
                    2
                  </div>
                  <span><strong>Leasing Desk Review:</strong> The property manager evaluates the application and issues an approval or conditional notice.</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-[10px] font-bold">
                    3
                  </div>
                  <span><strong>Digital Lease Agreement:</strong> You will receive a direct invitation to sign the digital agreement via BaytMiftah eSignature.</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/" className="w-full sm:w-auto">
                <Button variant="gradient" className="w-full sm:w-auto gap-2">
                  <span>Return to BaytMiftah</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/search" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto">
                  Browse More Properties
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </StandalonePageShell>
    );
  }

  return (
    <StandalonePageShell maxWidthClassName="max-w-2xl">
      <div className="py-10 px-4 space-y-6">
        {/* Editorial Header */}
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-primary/10 via-emerald-500/5 to-surface/80 border border-primary/20 shadow-lg backdrop-blur-md">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="success" dot className="text-xs font-bold px-2.5 py-0.5">
                Verified Listing Portal
              </Badge>
              <span className="text-xs text-ink-muted flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                Ghana Rent Act 220 Compliant
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-medium text-ink tracking-tight">
              Apply for Residential Lease
            </h1>
            <p className="text-xs sm:text-sm text-ink-secondary max-w-xl leading-relaxed">
              Submit your tenancy credentials for expedited property review. All data is end-to-end encrypted and held in escrow compliance.
            </p>
          </div>
        </div>

        {/* Application Form */}
        <Card
          variant="glass"
          className="p-6 sm:p-8 border border-surface-border bg-surface/90 backdrop-blur-md rounded-3xl shadow-sm"
        >
          <form onSubmit={submit} className="space-y-6">
            {/* Section 1: Contact Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-surface-border">
                <User className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-ink">
                  1. Applicant Identity & Contact
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-ink">Full Legal Name *</label>
                  <Input
                    required
                    placeholder="e.g. Kwame Mensah"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink">Email Address *</label>
                  <Input
                    required
                    type="email"
                    placeholder="kwame@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink">Phone Number (Ghana / WhatsApp)</label>
                  <Input
                    placeholder="+233 24 000 0000"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Household & Occupancy */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-surface-border">
                <Users className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-ink">
                  2. Household & Tenancy Scope
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink">Household Occupants *</label>
                  <Input
                    required
                    type="number"
                    min="1"
                    step="1"
                    placeholder="1"
                    value={form.householdSize}
                    onChange={(e) => setForm({ ...form, householdSize: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink">Estimated Monthly Income (GHS)</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 15,000"
                    value={form.monthlyIncome}
                    onChange={(e) => setForm({ ...form, monthlyIncome: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Employment Summary */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-surface-border">
                <Briefcase className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-ink">
                  3. Employment & Professional Background
                </h2>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">
                  Employment or Business Summary
                </label>
                <Textarea
                  className="min-h-24 w-full rounded-xl border border-surface-border bg-surface-subtle/50 px-3.5 py-2.5 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                  placeholder="e.g. Senior Software Engineer at Stanbic Bank Ghana, employed since 2021..."
                  value={form.employment}
                  onChange={(e) => setForm({ ...form, employment: e.target.value })}
                />
              </div>
            </div>

            {/* Legal Consent */}
            <div className="p-4 rounded-2xl bg-surface-subtle/60 border border-surface-border space-y-3">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-primary rounded cursor-pointer shrink-0"
                />
                <span className="text-xs text-ink-secondary leading-relaxed">
                  I certify that all provided details are true and accurate. I authorize the landlord or verified property manager to perform background, credit, and employment verification under the <strong>Ghana Data Protection Act 2012 (Act 843)</strong> and <strong>Rent Act 1963 (Act 220)</strong>.
                </span>
              </label>
            </div>

            <Button
              type="submit"
              variant="gradient"
              size="lg"
              disabled={submitting}
              className="w-full gap-2 text-sm shadow-md"
            >
              {submitting ? (
                <span>Submitting Credentials...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Submit Application for Screening</span>
                </>
              )}
            </Button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-ink-muted">
              <Lock className="w-3.5 h-3.5" />
              <span>Protected by Bank-Grade 256-Bit SSL Escrow Protocol</span>
            </div>
          </form>
        </Card>
      </div>
    </StandalonePageShell>
  );
}