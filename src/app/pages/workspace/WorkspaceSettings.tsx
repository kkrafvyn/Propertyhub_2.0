import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { useAuth, type AuthMfaFactor } from "../../context/AuthContext";
import type { Database } from "../../../lib/database.types";
import { organizationService } from "../../../lib/organization.service";
import { supabase } from "../../../lib/supabase";
import { getWorkspaceRoute, toOrganizationSlug, type MemberRole } from "../../../lib/workspace";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];

interface WorkspaceSettingsProps {
  organization: Organization;
  currentRole: MemberRole | null;
}

export function WorkspaceSettings({
  organization,
  currentRole,
}: WorkspaceSettingsProps) {
  const navigate = useNavigate();
  const { user, authAssurance, listMfaFactors, refreshAuthAssurance } = useAuth();
  const canManageSettings = currentRole === "owner" || currentRole === "manager";
  const [submitting, setSubmitting] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [remoteLogoutLoading, setRemoteLogoutLoading] = useState(false);
  const [mfaFactors, setMfaFactors] = useState<AuthMfaFactor[]>([]);
  const [sessionInfo, setSessionInfo] = useState<{
    email: string | null;
    expiresAt: string | null;
    provider: string | null;
  }>({
    email: user?.email || null,
    expiresAt: null,
    provider: user?.app_metadata?.provider || null,
  });
  const [form, setForm] = useState({
    name: organization.name,
    slug: organization.slug,
    description: organization.description || "",
    website: organization.website || "",
    email: organization.email || "",
    phone: organization.phone || "",
    logoUrl: organization.logo_url || "",
    bannerUrl: organization.banner_url || "",
    paystackTransferRecipientCode: (organization as any).paystack_transfer_recipient_code || "",
    stripeConnectAccountId: (organization as any).stripe_connect_account_id || "",
    flutterwaveSubaccountId: (organization as any).flutterwave_subaccount_id || "",
    flutterwaveBeneficiaryId: (organization as any).flutterwave_beneficiary_id || "",
    flutterwaveAccountBank: (organization as any).flutterwave_account_bank || "",
    flutterwaveAccountNumber: (organization as any).flutterwave_account_number || "",
    paymentSetupStatus: (organization as any).payment_setup_status || "not_started",
    payoutSetupNotes: (organization as any).payout_setup_notes || "",
  });

  useEffect(() => {
    setForm({
      name: organization.name,
      slug: organization.slug,
      description: organization.description || "",
      website: organization.website || "",
      email: organization.email || "",
      phone: organization.phone || "",
      logoUrl: organization.logo_url || "",
      bannerUrl: organization.banner_url || "",
      paystackTransferRecipientCode: (organization as any).paystack_transfer_recipient_code || "",
      stripeConnectAccountId: (organization as any).stripe_connect_account_id || "",
      flutterwaveSubaccountId: (organization as any).flutterwave_subaccount_id || "",
      flutterwaveBeneficiaryId: (organization as any).flutterwave_beneficiary_id || "",
      flutterwaveAccountBank: (organization as any).flutterwave_account_bank || "",
      flutterwaveAccountNumber: (organization as any).flutterwave_account_number || "",
      paymentSetupStatus: (organization as any).payment_setup_status || "not_started",
      payoutSetupNotes: (organization as any).payout_setup_notes || "",
    });
  }, [organization]);

  const loadSecurityState = async () => {
    if (!user) return;

    try {
      setSecurityLoading(true);
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      const session = data.session;
      setSessionInfo({
        email: session?.user.email || user.email || null,
        expiresAt: session?.expires_at
          ? new Date(session.expires_at * 1000).toLocaleString()
          : null,
        provider:
          session?.user.app_metadata?.provider ||
          user.app_metadata?.provider ||
          "email",
      });

      const factors = await listMfaFactors();
      setMfaFactors(factors);
      await refreshAuthAssurance();
    } catch (error) {
      console.error("Failed to load security state:", error);
      toast.error("We couldn't refresh your security settings right now.");
    } finally {
      setSecurityLoading(false);
    }
  };

  useEffect(() => {
    void loadSecurityState();
  }, [user?.id]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canManageSettings) {
      toast.error("Only owners and managers can update organization settings.");
      return;
    }

    if (!form.name.trim()) {
      toast.error("Organization name is required.");
      return;
    }

    const nextSlug = toOrganizationSlug(form.slug || form.name);
    if (!nextSlug) {
      toast.error("Enter a valid slug using letters and numbers.");
      return;
    }

    try {
      setSubmitting(true);
      const updatedOrganization = await organizationService.updateOrganization(organization.id, {
        name: form.name.trim(),
        slug: nextSlug,
        description: form.description.trim() || null,
        website: form.website.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        logo_url: form.logoUrl.trim() || null,
        banner_url: form.bannerUrl.trim() || null,
        paystack_transfer_recipient_code: form.paystackTransferRecipientCode.trim() || null,
        stripe_connect_account_id: form.stripeConnectAccountId.trim() || null,
        flutterwave_subaccount_id: form.flutterwaveSubaccountId.trim() || null,
        flutterwave_beneficiary_id: form.flutterwaveBeneficiaryId.trim() || null,
        flutterwave_transfer_beneficiary_id: form.flutterwaveBeneficiaryId.trim() || null,
        flutterwave_account_bank: form.flutterwaveAccountBank.trim() || null,
        flutterwave_account_number: form.flutterwaveAccountNumber.trim() || null,
        payment_setup_status: form.paymentSetupStatus,
        payout_setup_notes: form.payoutSetupNotes.trim() || null,
      } as any);

      toast.success("Organization settings updated.");

      if (updatedOrganization.slug !== organization.slug) {
        navigate(getWorkspaceRoute(updatedOrganization.slug, "settings"), { replace: true });
      }
    } catch (error) {
      console.error("Failed to update organization settings:", error);
      const message =
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "";
      const code =
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "";

      if (code === "23505" || message.includes("duplicate") || message.includes("slug")) {
        toast.error("That workspace slug is already taken. Try another one.");
      } else {
        toast.error("We couldn't save those settings right now.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGlobalSignOut = async () => {
    const confirmed = window.confirm(
      "Sign this account out on every device? You will need to log in again."
    );
    if (!confirmed) return;

    try {
      setRemoteLogoutLoading(true);
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) throw error;

      toast.success("Signed out on all devices.");
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Failed to sign out globally:", error);
      toast.error("We couldn't sign out all sessions right now.");
    } finally {
      setRemoteLogoutLoading(false);
    }
  };

  const verifiedMfaFactors = mfaFactors.filter((factor) => factor.status === "verified");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Update the public profile and contact details for {organization.name}.
          </p>
        </div>
        <Badge variant="outline" className="capitalize w-fit">
          {currentRole || "member"}
        </Badge>
      </div>

      {!canManageSettings && (
        <Card className="p-4 bg-secondary/40">
          <p className="text-sm text-muted-foreground">
            You can view this organization profile, but only owners and managers can edit it.
          </p>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Organization Profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Organization Name"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              disabled={!canManageSettings}
              required
            />
            <Input
              label="Slug"
              value={form.slug}
              onChange={(event) => updateField("slug", event.target.value)}
              disabled={!canManageSettings}
              placeholder="prime-properties"
              required
            />
            <Input
              label="Website"
              value={form.website}
              onChange={(event) => updateField("website", event.target.value)}
              disabled={!canManageSettings}
              placeholder="https://example.com"
            />
            <Input
              label="Public Email"
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              disabled={!canManageSettings}
              placeholder="hello@example.com"
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              disabled={!canManageSettings}
              placeholder="+233 24 000 0000"
            />
            <Input
              label="Logo URL"
              value={form.logoUrl}
              onChange={(event) => updateField("logoUrl", event.target.value)}
              disabled={!canManageSettings}
              placeholder="https://..."
            />
            <div className="md:col-span-2">
              <Input
                label="Banner URL"
                value={form.bannerUrl}
                onChange={(event) => updateField("bannerUrl", event.target.value)}
                disabled={!canManageSettings}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block mb-2 text-sm text-foreground">Description</label>
            <textarea
              className="w-full px-4 py-3 rounded-lg border border-border bg-input-background text-foreground min-h-32"
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              disabled={!canManageSettings}
              placeholder="Tell clients what makes this organization different."
            />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Payment & Payout Setup</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Keep agency payout references ready before escrow releases are enabled.
              </p>
            </div>
            <Badge variant={form.paymentSetupStatus === "ready" ? "default" : "outline"} className="w-fit">
              {form.paymentSetupStatus.replaceAll("_", " ")}
            </Badge>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Paystack Transfer Recipient Code"
              value={form.paystackTransferRecipientCode}
              onChange={(event) =>
                updateField("paystackTransferRecipientCode", event.target.value)
              }
              disabled={!canManageSettings}
              placeholder="RCP_xxxxx"
            />
            <Input
              label="Stripe Connect Account ID"
              value={form.stripeConnectAccountId}
              onChange={(event) => updateField("stripeConnectAccountId", event.target.value)}
              disabled={!canManageSettings}
              placeholder="acct_xxxxx"
            />
            <Input
              label="Flutterwave Subaccount ID"
              value={form.flutterwaveSubaccountId}
              onChange={(event) => updateField("flutterwaveSubaccountId", event.target.value)}
              disabled={!canManageSettings}
              placeholder="Optional split or wallet subaccount ID"
            />
            <Input
              label="Flutterwave Beneficiary ID"
              value={form.flutterwaveBeneficiaryId}
              onChange={(event) => updateField("flutterwaveBeneficiaryId", event.target.value)}
              disabled={!canManageSettings}
              placeholder="Optional saved beneficiary ID"
            />
            <Input
              label="Flutterwave Bank Code"
              value={form.flutterwaveAccountBank}
              onChange={(event) => updateField("flutterwaveAccountBank", event.target.value)}
              disabled={!canManageSettings}
              placeholder="e.g. bank code from Flutterwave"
            />
            <Input
              label="Flutterwave Account Number"
              value={form.flutterwaveAccountNumber}
              onChange={(event) => updateField("flutterwaveAccountNumber", event.target.value)}
              disabled={!canManageSettings}
              placeholder="Payout account number"
            />
            <div>
              <label className="block mb-2 text-sm text-foreground">Payout Setup Status</label>
              <select
                className="w-full rounded-lg border border-border bg-input-background px-4 py-3 text-foreground"
                value={form.paymentSetupStatus}
                onChange={(event) => updateField("paymentSetupStatus", event.target.value)}
                disabled={!canManageSettings}
              >
                <option value="not_started">Not started</option>
                <option value="needs_details">Needs details</option>
                <option value="needs_review">Needs review</option>
                <option value="ready">Ready</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block mb-2 text-sm text-foreground">Payout Setup Notes</label>
            <textarea
              className="w-full px-4 py-3 rounded-lg border border-border bg-input-background text-foreground min-h-24"
              value={form.payoutSetupNotes}
              onChange={(event) => updateField("payoutSetupNotes", event.target.value)}
              disabled={!canManageSettings}
              placeholder="Internal notes about payout checks, missing bank details, or provider review."
            />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Workspace Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-secondary/30">
              <p className="text-sm text-muted-foreground">Verification</p>
              <p className="font-semibold mt-1">
                {organization.verified ? "Verified" : "Pending verification"}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/30">
              <p className="text-sm text-muted-foreground">Workspace Access</p>
              <p className="font-semibold mt-1">
                {organization.suspended ? "Suspended" : "Active"}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/30">
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-semibold mt-1">
                {new Date(organization.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/30">
              <p className="text-sm text-muted-foreground">Updated</p>
              <p className="font-semibold mt-1">
                {new Date(organization.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Security & Sessions</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Monitor your current login, MFA assurance, and revoke active sessions if access
                feels risky.
              </p>
            </div>
            <Badge variant={verifiedMfaFactors.length > 0 ? "default" : "outline"} className="w-fit">
              {verifiedMfaFactors.length > 0 ? "2FA enabled" : "2FA not enrolled"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5">
            <div className="p-4 rounded-lg bg-secondary/30">
              <p className="text-sm text-muted-foreground">Signed In As</p>
              <p className="font-semibold mt-1 break-words">{sessionInfo.email || "Unknown"}</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/30">
              <p className="text-sm text-muted-foreground">Provider</p>
              <p className="font-semibold mt-1 capitalize">{sessionInfo.provider || "email"}</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/30">
              <p className="text-sm text-muted-foreground">Assurance Level</p>
              <p className="font-semibold mt-1">
                {authAssurance.currentLevel || "Not available"}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/30">
              <p className="text-sm text-muted-foreground">Session Expires</p>
              <p className="font-semibold mt-1">
                {sessionInfo.expiresAt || "Managed by Supabase"}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-border p-4">
            <p className="font-medium">MFA factors</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {mfaFactors.length === 0
                ? "No MFA factors are enrolled yet. Owners and managers should enroll TOTP before production launch."
                : mfaFactors
                    .map((factor) => `${factor.friendly_name || factor.factor_type} (${factor.status})`)
                    .join(", ")}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadSecurityState()}
              disabled={securityLoading}
            >
              {securityLoading ? "Refreshing..." : "Refresh Security State"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleGlobalSignOut()}
              disabled={remoteLogoutLoading}
            >
              {remoteLogoutLoading ? "Signing out..." : "Sign Out on Every Device"}
            </Button>
          </div>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" disabled={!canManageSettings || submitting}>
            {submitting ? "Saving..." : "Save Settings"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => navigate(getWorkspaceRoute(organization.slug))}
          >
            Back to Dashboard
          </Button>
        </div>
      </form>
    </div>
  );
}
