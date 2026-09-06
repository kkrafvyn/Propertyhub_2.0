import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { Download, Laptop, Lock, MonitorSmartphone } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { isElectron } from "../../../lib/surface-detection";
import {
  DESKTOP_GATEWAY_FEATURES,
  getDesktopDownloadUrl,
  isBusinessWebUser,
  markDesktopPromptSeen,
  openBaytMiftahDesktop,
} from "../../../lib/desktop-gateway";
import {
  entitlementsService,
  type DesktopEligibilityResult,
} from "../../../lib/entitlements.service";
import { WORKSPACE_ENTRY_PATH } from "../../../lib/workspace";

export function DesktopGateway() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const forceGateway = searchParams.get("force") === "1";
  const downloadUrl = useMemo(() => getDesktopDownloadUrl(), []);
  const [eligibility, setEligibility] = useState<DesktopEligibilityResult | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setEligibility(null);
      setEligibilityLoading(false);
      return;
    }

    let cancelled = false;
    setEligibilityLoading(true);

    void entitlementsService
      .resolveUserDesktopEligibility(user.id)
      .then((result) => {
        if (!cancelled) setEligibility(result);
      })
      .catch((error) => {
        console.error("Failed to resolve desktop eligibility:", error);
        if (!cancelled) {
          setEligibility({ eligible: true, reason: "no_organization" });
        }
      })
      .finally(() => {
        if (!cancelled) setEligibilityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const desktopAllowed = forceGateway || eligibility?.eligible !== false;

  if (!user) {
    return <Navigate to="/login?next=/workspace/desktop" replace />;
  }

  if (!isBusinessWebUser(user, profile)) {
    return <Navigate to="/app" replace />;
  }

  if (isElectron()) {
    return <Navigate to={WORKSPACE_ENTRY_PATH} replace />;
  }

  const continueOnWeb = () => {
    markDesktopPromptSeen(user.id);
    navigate(WORKSPACE_ENTRY_PATH, { replace: true });
  };

  const handleDownload = () => {
    if (!desktopAllowed) return;
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
  };

  if (eligibilityLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white/70">
        Checking plan eligibility for desktop…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-12 sm:px-6">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <Laptop className="h-7 w-7" />
          </div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/60">
            BaytMiftah Workspace
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {desktopAllowed
              ? "Your professional desktop app is ready"
              : "Desktop is available on Business plans"}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/70">
            {desktopAllowed
              ? "Manage properties, team, finance, leasing, and operations from a workspace built for landlords, agents, and property managers — not consumer browsing."
              : eligibility?.planLabel
                ? `Your ${eligibility.planLabel} workspace (${eligibility.organizationName || "current organization"}) includes web access only. Upgrade to Business or Enterprise to download BaytMiftah Desktop.`
                : "Your current plan includes web access only. Upgrade to Business or Enterprise to download BaytMiftah Desktop."}
          </p>
        </div>

        {!desktopAllowed ? (
          <Card className="mb-8 border-amber-400/20 bg-amber-500/10 p-6 text-white">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
              <div>
                <h2 className="font-semibold">Desktop not included in your plan</h2>
                <p className="mt-1 text-sm text-white/75">
                  Personal Property Workspaces stay on web and mobile. You can still manage
                  everything from any browser or the BaytMiftah mobile app — the same login,
                  organizations, and data sync automatically.
                </p>
              </div>
            </div>
          </Card>
        ) : null}

        <Card className="border-white/10 bg-white/5 p-6 text-white shadow-2xl backdrop-blur sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold">BaytMiftah Workspace</h2>
              <p className="mt-2 max-w-xl text-sm text-white/70">
                The desktop app for your real-estate operation — same business account,
                same organizations. Consumer marketplace features stay on web and mobile.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Button
                size="lg"
                className="bg-white text-slate-950 hover:bg-slate-100 disabled:opacity-50"
                onClick={handleDownload}
                disabled={!desktopAllowed}
              >
                <Download className="mr-2 h-4 w-4" />
                Download for Windows
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 bg-transparent text-white hover:bg-white/10 disabled:opacity-50"
                onClick={openBaytMiftahDesktop}
                disabled={!desktopAllowed}
              >
                Open BaytMiftah Desktop
              </Button>
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <p className="mb-4 text-sm font-medium text-white/80">What you can do on Desktop</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {DESKTOP_GATEWAY_FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-white/10 bg-black/20 p-4"
                >
                  <p className="font-medium">{feature.title}</p>
                  <p className="mt-1 text-xs text-white/60">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-white/60">
            Work from anywhere: web, mobile, and desktop (when included) share one account and
            stay in sync.
          </p>
          <p className="text-sm text-white/60">
            Prefer the browser? Continue on web — nothing is desktop-only except the installer.
          </p>
          <Button
            variant="ghost"
            className="text-white hover:bg-white/10 hover:text-white"
            onClick={continueOnWeb}
          >
            <MonitorSmartphone className="mr-2 h-4 w-4" />
            Continue on Web
          </Button>
          {forceGateway ? (
            <p className="text-xs text-white/40">Preview mode: gateway forced via ?force=1</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
