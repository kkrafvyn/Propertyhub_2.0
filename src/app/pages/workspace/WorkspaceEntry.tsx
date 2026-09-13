import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { Building2, Home, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { organizationService } from "../../../lib/organization.service";
import {
  WORKSPACE_ENTRY_PATH,
  getWorkspaceRoute,
  normalizeOrganizationMemberships,
  toOrganizationSlug,
  type MembershipRow,
  type OrganizationMembership,
} from "../../../lib/workspace";
import { WORKSPACE_PAGE_SLUGS } from "../../lib/workspace-role-nav";
import { LegalAcceptanceCheckbox } from "../../components/legal/LegalAcceptanceCheckbox";
import { legalAcceptanceService } from "../../../lib/legal-acceptance.service";
import { ACCEPTANCE_SCOPES, LEGAL_POLICY_VERSION } from "../../../lib/legal-config";
import { enrollmentService, type OrganizationEnrollmentRequest, type WorkspaceKind } from "../../../lib/enrollment.service";
import { listCountryPacks } from "../../../lib/country-rules";
import {
  canSubmitWorkspaceEnrollment,
  personalWorkspaceName,
  personalWorkspaceSlug,
} from "../../../lib/kyc-gate.service";
import { useMyKyc } from "../../hooks/useMyKyc";
import { WorkspaceEnrollmentKycPanel } from "../../components/workspace/WorkspaceEnrollmentKycPanel";
import { BusinessMobileShell } from "../../shells/BusinessMobileShell";
import { DesktopShell } from "../../components/baytmiftah/DesktopShell";
import { shouldUseBusinessMobileShell } from "../../lib/business-mobile-nav";

const ALLOWED_WORKSPACE_PAGES = new Set(WORKSPACE_PAGE_SLUGS);

function sanitizeRequestedPage(value: string | null) {
  if (!value) return "";
  return ALLOWED_WORKSPACE_PAGES.has(value) ? value : "";
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return "We couldn't create your workspace right now.";
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
  const { kyc, loading: kycLoading } = useMyKyc();
  const countryOptions = useMemo(() => listCountryPacks(), []);
  const [workspaceKind, setWorkspaceKind] = useState<WorkspaceKind>("personal");
  const [operatingJurisdiction, setOperatingJurisdiction] = useState("GH");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);
  const [pendingEnrollment, setPendingEnrollment] = useState<OrganizationEnrollmentRequest | null>(null);
  const [enrollmentHistory, setEnrollmentHistory] = useState<OrganizationEnrollmentRequest[]>([]);
  const [slugEdited, setSlugEdited] = useState(false);
  const [agencyTermsAccepted, setAgencyTermsAccepted] = useState(false);
  const [personalTermsAccepted, setPersonalTermsAccepted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    email: user?.email || "",
    phone: "",
    website: "",
  });

  const requestedPage = useMemo(
    () => sanitizeRequestedPage(searchParams.get("next")),
    [searchParams]
  );

  const loadMemberships = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);
      const rows = (await organizationService.getUserOrganizations(user.id)) as MembershipRow[];
      setMemberships(normalizeOrganizationMemberships(rows));

      if (normalizeOrganizationMemberships(rows).length === 0) {
        const [pending, history] = await Promise.all([
          enrollmentService.getPendingRequest(user.id),
          enrollmentService.getMyRequests(user.id),
        ]);
        setPendingEnrollment(pending);
        setEnrollmentHistory(history);
      } else {
        setPendingEnrollment(null);
        setEnrollmentHistory([]);
      }
    } catch (error) {
      console.error("Failed to load workspace memberships:", error);
      setLoadError("We couldn't load your workspace organizations right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMemberships();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.email) return;

    setForm((current) => ({
      ...current,
      email: current.email || user.email || "",
    }));
  }, [user?.email]);

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user) {
      toast.error("You need to be signed in to create a workspace.");
      return;
    }

    const termsAccepted = workspaceKind === "personal" ? personalTermsAccepted : agencyTermsAccepted;
    if (!termsAccepted) {
      toast.error("Please accept the terms to continue.");
      return;
    }

    if (!canSubmitWorkspaceEnrollment(kyc, operatingJurisdiction)) {
      toast.error("Complete identity verification (KYC) before submitting your application.");
      return;
    }

    const isPersonal = workspaceKind === "personal";
    const displayName = form.name.trim() || user.user_metadata?.full_name || "My";
    const companyName = isPersonal
      ? personalWorkspaceName(String(displayName))
      : form.name.trim();
    const nextSlug = isPersonal
      ? personalWorkspaceSlug(user.id)
      : toOrganizationSlug(form.slug || form.name);

    if (!companyName) {
      toast.error(isPersonal ? "Enter a display name for your workspace." : "Organization name is required.");
      return;
    }

    if (!nextSlug) {
      toast.error("Enter a valid workspace slug.");
      return;
    }

    if (!isPersonal && !form.name.trim()) {
      toast.error("Organization name is required.");
      return;
    }

    try {
      setCreating(true);
      const submissionId =
        (kyc as { submission?: { id?: string } | null } | null)?.submission?.id ?? null;

      await enrollmentService.submitRequest(user.id, {
        workspaceKind,
        operatingJurisdiction,
        companyName,
        desiredSlug: nextSlug,
        description: form.description.trim() || null,
        contactEmail: form.email.trim() || null,
        contactPhone: form.phone.trim() || null,
        website: isPersonal ? null : form.website.trim() || null,
        kycSubmissionId: submissionId,
        propertyListingClaimId: searchParams.get("claimId")?.trim() || null,
      });

      await legalAcceptanceService.recordAcceptance({
        userId: user.id,
        scope: isPersonal ? "personal_host_onboarding" : "agency_onboarding",
        policySlugs: isPersonal
          ? ACCEPTANCE_SCOPES.personal_host_onboarding.policySlugs
          : ACCEPTANCE_SCOPES.agency_onboarding.policySlugs,
        policyVersion: LEGAL_POLICY_VERSION,
      });

      const pending = await enrollmentService.getPendingRequest(user.id);
      setPendingEnrollment(pending);
      setEnrollmentHistory(await enrollmentService.getMyRequests(user.id));
      toast.success("Application submitted. Track status anytime at /enrollment.");
    } catch (error) {
      console.error("Failed to submit enrollment request:", error);
      const message = getErrorMessage(error);
      const code = getErrorCode(error);
      if (code === "23505" || message.includes("duplicate") || message.includes("slug")) {
        toast.error("That workspace slug is already reserved. Try another one.");
      } else {
        toast.error(message);
      }
    } finally {
      setCreating(false);
    }
  };

  const firstMembership = memberships[0] || null;
  const useBusinessShell = shouldUseBusinessMobileShell();

  const wrapEntryShell = (content: ReactNode) =>
    useBusinessShell ? (
      <BusinessMobileShell showNav={false} jobRole="property_manager">
        {content}
      </BusinessMobileShell>
    ) : (
      <DesktopShell minimal showFooter={false}>
        <div className="mx-auto w-full max-w-5xl px-4 py-10">{content}</div>
      </DesktopShell>
    );

  if (loading) {
    return wrapEntryShell(
      <div className="min-h-[50vh] flex items-center justify-center p-8">
        <Card className="max-w-xl w-full p-8 text-center text-ink-secondary">
          Loading workspace...
        </Card>
      </div>,
    );
  }

  if (loadError) {
    return wrapEntryShell(
      <div className="min-h-[50vh] flex items-center justify-center p-8">
        <Card className="max-w-xl w-full p-8 text-center">
          <h1 className="text-2xl font-semibold mb-3">Workspace unavailable</h1>
          <p className="text-ink-secondary mb-6">{loadError}</p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => void loadMemberships()}>Try Again</Button>
            <Link to="/">
              <Button variant="outline">Back Home</Button>
            </Link>
          </div>
        </Card>
      </div>,
    );
  }

  if (memberships.length === 1 && firstMembership) {
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

  if (pendingEnrollment) {
    return <Navigate to="/enrollment" replace />;
  }

  const latestRejected = enrollmentHistory.find((entry) => entry.status === "rejected");

  if (memberships.length > 1) {
    const orgPicker = (
      <div className="min-h-[50vh] px-4 py-8">
        <Card className="max-w-lg mx-auto p-6">
          <h1 className="text-2xl font-semibold mb-2">Choose a workspace</h1>
          <p className="text-ink-secondary mb-6">
            Select which organization you want to open.
          </p>
          <div className="space-y-3">
            {memberships.map((membership) => (
              <Link
                key={membership.organization.id}
                to={getWorkspaceRoute(
                  membership.organization.slug,
                  requestedPage || undefined,
                )}
                className="flex items-center gap-3 rounded-xl border border-border p-4 transition hover:border-primary hover:bg-primary/5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{membership.organization.name}</p>
                  <p className="text-xs text-ink-secondary">{membership.organization.slug}</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    );

    return wrapEntryShell(orgPicker);
  }

  const entryBody = (
    <div className="px-4 py-10">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr,0.9fr] gap-8">
        <Card className="p-8 lg:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              {workspaceKind === "personal" ? (
                <Home className="w-6 h-6 text-primary" />
              ) : (
                <Building2 className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <p className="text-sm text-primary font-medium">Workspace enrollment</p>
              <h1 className="text-3xl font-semibold">Apply for a workspace</h1>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setWorkspaceKind("personal")}
              className={`rounded-xl border p-4 text-left transition ${
                workspaceKind === "personal"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <Home className="mb-2 h-5 w-5 text-primary" />
              <p className="font-semibold">Personal property workspace</p>
              <p className="mt-1 text-sm text-ink-secondary">
                For individual owners managing their own properties (1–5 units).
              </p>
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceKind("company")}
              className={`rounded-xl border p-4 text-left transition ${
                workspaceKind === "company"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <Building2 className="mb-2 h-5 w-5 text-primary" />
              <p className="font-semibold">Organization workspace</p>
              <p className="mt-1 text-sm text-ink-secondary">
                For agencies, property managers, developers, and companies.
              </p>
            </button>
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium" htmlFor="operating-jurisdiction">
              Operating country
            </label>
            <select
              id="operating-jurisdiction"
              className="app-input w-full"
              value={operatingJurisdiction}
              onChange={(event) => setOperatingJurisdiction(event.target.value)}
            >
              {countryOptions.map((pack) => (
                <option key={pack.jurisdictionId} value={pack.jurisdictionId}>
                  {pack.label}
                </option>
              ))}
            </select>
          </div>

          <WorkspaceEnrollmentKycPanel
            kyc={kyc}
            loading={kycLoading}
            jurisdictionId={operatingJurisdiction}
            compact
          />

          <p className="text-ink-secondary my-6">
            {workspaceKind === "personal"
              ? "BaytMiftah reviews every property owner before granting a personal workspace. Complete KYC, then submit your application."
              : "BaytMiftah reviews every company before granting workspace access. Complete KYC, then submit your organization profile."}
          </p>

          {latestRejected ? (
            <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-ink-secondary">
              Your previous application was not approved
              {latestRejected.review_notes ? `: ${latestRejected.review_notes}` : "."} You may submit a
              revised application below.
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            {workspaceKind === "personal" ? (
              <>
                <Input
                  label="Display name"
                  value={form.name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  placeholder="Ada Mensah"
                  required
                />
                <p className="text-xs text-ink-secondary">
                  Your workspace will appear as{" "}
                  <span className="font-medium text-foreground">
                    {personalWorkspaceName(form.name || user?.user_metadata?.full_name || "My")}
                  </span>
                </p>
              </>
            ) : (
              <>
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
              </>
            )}

            <div>
              <label className="block mb-2 text-sm text-foreground">Description</label>
              <textarea
                className="app-input min-h-32"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Tell clients and teammates what this organization does."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            {workspaceKind === "company" ? (
              <Input
                label="Website"
                value={form.website}
                onChange={(event) =>
                  setForm((current) => ({ ...current, website: event.target.value }))
                }
                placeholder="https://example.com"
              />
            ) : null}

            <LegalAcceptanceCheckbox
              scope={workspaceKind === "personal" ? "personal_host_onboarding" : "agency_onboarding"}
              checked={workspaceKind === "personal" ? personalTermsAccepted : agencyTermsAccepted}
              onChange={workspaceKind === "personal" ? setPersonalTermsAccepted : setAgencyTermsAccepted}
              id={workspaceKind === "personal" ? "personal-onboarding-terms" : "agency-onboarding-terms"}
            />

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                type="submit"
                size="lg"
                disabled={
                  creating ||
                  kycLoading ||
                  !(workspaceKind === "personal" ? personalTermsAccepted : agencyTermsAccepted) ||
                  !canSubmitWorkspaceEnrollment(kyc, operatingJurisdiction)
                }
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting application...
                  </>
                ) : (
                  "Submit for review"
                )}
              </Button>
              <Link to="/enrollment">
                <Button type="button" size="lg" variant="outline">
                  Track application status
                </Button>
              </Link>
              <Link to="/">
                <Button type="button" size="lg" variant="outline">
                  Back Home
                </Button>
              </Link>
            </div>
          </form>
        </Card>

        <Card className="p-8 lg:p-10 bg-secondary/30">
          <div className="flex items-center gap-2 text-primary mb-6">
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">What you unlock</span>
          </div>

          <div className="space-y-5">
            <div>
              <h2 className="font-semibold mb-1">Reviewed onboarding + KYC</h2>
              <p className="text-sm text-ink-secondary">
                Every personal owner and company completes identity verification before BaytMiftah
                approves workspace access.
              </p>
            </div>
            <div>
              <h2 className="font-semibold mb-1">
                {workspaceKind === "personal" ? "Simple personal workspace" : "Publish after approval"}
              </h2>
              <p className="text-sm text-ink-secondary">
                {workspaceKind === "personal"
                  ? "Manage properties, tenants, rent, and maintenance without creating a company."
                  : "Once approved, create properties, manage leads, and invite teammates from one dashboard."}
              </p>
            </div>
            <div>
              <h2 className="font-semibold mb-1">Grow into the full platform</h2>
              <p className="text-sm text-ink-secondary">
                The same workspace becomes the entry point for analytics, automation,
                integrations, and enterprise features.
              </p>
            </div>
          </div>

          <div className="mt-8 p-5 rounded-2xl bg-secondary/40 border border-border">
            <p className="text-sm text-ink-secondary">
              After setup, you&apos;ll land in
              <span className="font-medium text-foreground"> {WORKSPACE_ENTRY_PATH}</span>
              and we&apos;ll route you into the right organization automatically.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );

  if (useBusinessShell) {
    return (
      <BusinessMobileShell showNav={false} jobRole="property_manager">
        {entryBody}
      </BusinessMobileShell>
    );
  }

  return entryBody;
}
