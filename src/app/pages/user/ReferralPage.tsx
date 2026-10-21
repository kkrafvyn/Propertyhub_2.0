import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Copy,
  Users,
  Check,
  Gift,
  Share2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Coins,
  QrCode,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { DesktopShell } from "../../components/baytmiftah/DesktopShell";
import { PageMeta } from "../../components/baytmiftah/PageMeta";
import { EmptyState } from "../../components/ux/EmptyState";
import { OperationalQueryState, PageLayout } from "../../components/ux";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/badge";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n/LocaleContext";
import { getSiteOrigin } from "../../../content/legal";

export function ReferralPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const inviteLink = useMemo(() => {
    const origin = getSiteOrigin();
    const ref = user?.id ? user.id.slice(0, 8) : "invite";
    return `${origin}/signup?ref=${encodeURIComponent(ref)}`;
  }, [user?.id]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success(t("share.copied") || "Referral link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <DesktopShell minimal showFooter>
      <PageMeta title={t("referral.title")} description={t("referral.subtitle")} />
      <PageLayout variant="consumer" maxWidthClassName="max-w-4xl">
        <OperationalQueryState phase="ready">
      <div className="space-y-8 py-12 md:py-16">
        {/* Editorial Header */}
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-10 bg-gradient-to-br from-emerald-500/10 via-primary/5 to-surface/80 border border-emerald-500/20 shadow-lg backdrop-blur-md">
          <div className="absolute top-0 right-0 w-80 h-80 bg-radial from-emerald-500/15 via-primary/10 to-transparent blur-3xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="success" dot className="text-xs font-bold px-2.5 py-0.5">
                  Network Rewards Program
                </Badge>
                <span className="text-xs text-ink-muted flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  Instant Credits & Fee Discounts
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-display font-medium text-ink tracking-tight">
                {t("referral.title")}
              </h1>
              <p className="text-xs sm:text-sm text-ink-secondary max-w-xl leading-relaxed">
                Invite fellow property owners, prospective tenants, or real estate brokers to BaytMiftah and earn management fee credits upon their first verified lease.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface/80 border border-surface-border backdrop-blur-md shadow-xs shrink-0 text-right">
              <span className="text-xs uppercase font-bold text-ink-muted tracking-wider block">
                Reward Benefit
              </span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                Up to GHS 500 Credit
              </span>
            </div>
          </div>
        </div>

        {/* Highlight Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="glass" className="p-5 border border-surface-border/80 bg-surface/80">
            <span className="text-xs font-medium text-ink-secondary">Network Signups</span>
            <div className="text-2xl font-bold text-ink mt-2 font-mono">
              {user ? "0" : "—"}
            </div>
            <p className="text-xs text-ink-muted mt-1">Users registered with your link</p>
          </Card>

          <Card variant="glass" className="p-5 border border-surface-border/80 bg-surface/80">
            <span className="text-xs font-medium text-ink-secondary">Earned Escrow Credits</span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
              {user ? "GHS 0.00" : "—"}
            </div>
            <p className="text-xs text-ink-muted mt-1">Available for fee settlement</p>
          </Card>

          <Card variant="glass" className="p-5 border border-surface-border/80 bg-surface/80">
            <span className="text-xs font-medium text-ink-secondary">Reward Multiplier</span>
            <div className="text-2xl font-bold text-primary mt-2 font-mono">
              1.0x Tier
            </div>
            <p className="text-xs text-ink-muted mt-1">Standard member referral rate</p>
          </Card>
        </div>

        {/* Referral Card */}
        <Card
          variant="glass"
          className="p-6 sm:p-8 space-y-6 border border-surface-border/80 bg-surface/90 backdrop-blur-md rounded-3xl shadow-sm"
        >
          {user ? (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-border">
                <div>
                  <h2 className="text-base font-semibold text-ink">Your Private Referral Code</h2>
                  <p className="text-xs text-ink-secondary">
                    Share this unique invitation with teammates, tenants, or owners.
                  </p>
                </div>
                <div className="p-2.5 px-4 rounded-xl bg-primary/10 border border-primary/20 text-center">
                  <span className="font-mono font-bold text-lg text-primary tracking-wider">
                    {user.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-ink" htmlFor="invite-link">
                  Direct Invitation Link
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    id="invite-link"
                    readOnly
                    value={inviteLink}
                    className="min-w-0 flex-1 rounded-xl border border-surface-border bg-surface-subtle px-4 py-3 text-xs font-mono text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <Button
                    type="button"
                    variant="gradient"
                    onClick={() => void copyLink()}
                    className="shrink-0 gap-2 text-xs h-11 px-5"
                  >
                    {copied ? <Check className="h-4 w-4 text-white" /> : <Copy className="h-4 w-4" />}
                    <span>{copied ? "Copied Link!" : t("referral.copyLink")}</span>
                  </Button>
                </div>
              </div>

              {/* 3-step progression visualizer */}
              <div className="pt-4 border-t border-surface-border space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  How Referral Rewards Work
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-ink-secondary">
                  <div className="p-3.5 rounded-2xl bg-surface-subtle/60 border border-surface-border space-y-1">
                    <span className="font-mono font-bold text-primary text-xs">STEP 01</span>
                    <p className="font-semibold text-ink">Share Your Link</p>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      Send your link to prospective clients, tenants, or agency colleagues.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-surface-subtle/60 border border-surface-border space-y-1">
                    <span className="font-mono font-bold text-primary text-xs">STEP 02</span>
                    <p className="font-semibold text-ink">They Execute Lease</p>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      When your referral signs a lease or lists a verified property on BaytMiftah.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-surface-subtle/60 border border-surface-border space-y-1">
                    <span className="font-mono font-bold text-primary text-xs">STEP 03</span>
                    <p className="font-semibold text-ink">Collect Credits</p>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      Receive automated escrow fee deductions and cash credits to your wallet.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="Join the Network Rewards Program"
              description="Sign in to obtain your personalized invitation credentials and start accumulating network credits."
              actionLabel="Sign In"
              actionHref="/login"
              secondaryActionLabel="Create Account"
              secondaryActionHref="/signup"
            />
          )}
        </Card>
      </div>
        </OperationalQueryState>
      </PageLayout>
    </DesktopShell>
  );
}
