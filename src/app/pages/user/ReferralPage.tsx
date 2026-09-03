import { useMemo } from "react";
import { Link } from "react-router";
import { Copy, Users } from "lucide-react";
import { toast } from "sonner";
import { DesktopShell } from "../../components/baytmiftah/DesktopShell";
import { PageMeta } from "../../components/baytmiftah/PageMeta";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n/LocaleContext";
import { getSiteOrigin } from "../../../content/legal";

export function ReferralPage() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const inviteLink = useMemo(() => {
    const origin = getSiteOrigin();
    const ref = user?.id ? user.id.slice(0, 8) : "invite";
    return `${origin}/signup?ref=${encodeURIComponent(ref)}`;
  }, [user?.id]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success(t("share.copied"));
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <DesktopShell minimal showFooter>
      <PageMeta title={t("referral.title")} description={t("referral.subtitle")} />
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 md:py-16">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-brand-forest/10 p-3 text-brand-forest">
            <Users className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-ink md:text-3xl">{t("referral.title")}</h1>
            <p className="mt-2 text-ink-secondary">{t("referral.subtitle")}</p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-surface-border bg-surface p-6">
          {user ? (
            <>
              <p className="text-sm font-medium text-ink">{t("referral.yourCode")}</p>
              <p className="mt-2 font-mono text-lg text-brand-forest">{user.id.slice(0, 8).toUpperCase()}</p>
              <label className="mt-6 block text-sm font-medium text-ink" htmlFor="invite-link">
                Invite link
              </label>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <input
                  id="invite-link"
                  readOnly
                  value={inviteLink}
                  className="min-w-0 flex-1 rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm text-ink"
                />
                <Button type="button" onClick={copyLink} className="shrink-0 gap-2">
                  <Copy className="h-4 w-4" aria-hidden />
                  {t("referral.copyLink")}
                </Button>
              </div>
              <p className="mt-4 text-sm text-ink-secondary">
                Share this link with buyers, renters, or agency teammates. When they sign up, mention your code
                to support so we can track your network.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-secondary">
                Sign in to get your personal invite link and share BaytMiftah with your network.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/login" className="rounded-xl bg-brand-forest px-5 py-2.5 text-sm font-semibold text-white">
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="rounded-xl border border-surface-border px-5 py-2.5 text-sm font-semibold text-ink"
                >
                  Create account
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-sm text-ink-secondary">
          Agency referrals and lead sources can also be tracked in{" "}
          <Link to="/workspace" className="font-medium text-brand-forest hover:underline">
            Workspace → Leads
          </Link>
          .
        </p>
      </div>
    </DesktopShell>
  );
}
