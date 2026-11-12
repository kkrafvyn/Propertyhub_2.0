import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { supabase } from "../../../lib/supabase";
import {
  removeSessionFromActivityList,
  trackUserSession,
} from "../../../lib/security/session-tracking";
import { nativePluginsService } from "../../../lib/native-plugins.service";
import { WORKSPACE_ENTRY_PATH } from "../../../lib/workspace";
import { clearWorkspaceMfaSkip } from "../../../lib/security/mfa";
import {
  TwoFactorPanel,
  type AuthenticatorFactor,
} from "../../components/security/TwoFactorPanel";
import {
  isBiometricAppLockEnabled,
  setBiometricAppLockEnabled,
} from "../../../lib/biometric-preferences";
import { useTranslation } from "../../i18n/LocaleContext";
import { toast } from "sonner";
import { PageMeta } from "../../components/baytmiftah/PageMeta";
import { ConsumerHubChrome, PageHeader, PageLayout } from "../../components/ux";
import { ActionDialog } from "../../components/ux/ActionDialog";
import {
  Smartphone,
  Laptop,
  Monitor,
  Globe,
  LogOut,
  Fingerprint,
  AlertTriangle,
} from "lucide-react";

interface SessionInfo {
  id: string;
  session_label: string | null;
  last_seen_at: string;
  user_agent: string | null;
  auth_session_id: string | null;
}

type PendingSecurityAction =
  | { kind: "factor"; id: string }
  | { kind: "session"; id: string }
  | { kind: "all" };

function parseDeviceFromUserAgent(ua: string | null) {
  if (!ua) return { type: "unknown", name: "Unknown Device", icon: Globe };
  const lower = ua.toLowerCase();

  let name = "Web Browser";
  let icon = Monitor;
  let type = "desktop";

  if (
    lower.includes("iphone") ||
    lower.includes("ipad") ||
    lower.includes("ios")
  ) {
    name = lower.includes("ipad") ? "Apple iPad" : "Apple iPhone";
    icon = Smartphone;
    type = "mobile";
  } else if (lower.includes("android")) {
    name = "Android Device";
    icon = Smartphone;
    type = "mobile";
  } else if (lower.includes("macintosh") || lower.includes("mac os")) {
    name = "Apple Mac";
    icon = Laptop;
    type = "desktop";
  } else if (lower.includes("windows")) {
    name = "Windows PC";
    icon = Monitor;
    type = "desktop";
  } else if (lower.includes("linux")) {
    name = "Linux Workstation";
    icon = Monitor;
    type = "desktop";
  }

  let browser = "";
  if (lower.includes("edg/")) browser = "Edge";
  else if (lower.includes("chrome") && !lower.includes("edg/"))
    browser = "Chrome";
  else if (lower.includes("safari") && !lower.includes("chrome"))
    browser = "Safari";
  else if (lower.includes("firefox")) browser = "Firefox";

  return {
    type,
    name: browser ? `${name} • ${browser}` : name,
    icon,
  };
}

export function SecuritySettingsPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const mfaRequired = searchParams.get("mfa") === "required";
  const workspaceMfaRequired = searchParams.get("mfa") === "workspace-required";

  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [verifiedFactors, setVerifiedFactors] = useState<AuthenticatorFactor[]>(
    [],
  );
  const [currentAal, setCurrentAal] = useState<string | null>(null);
  const [stepUpCode, setStepUpCode] = useState("");
  const [steppingUp, setSteppingUp] = useState(false);
  const [factorsLoading, setFactorsLoading] = useState(true);
  const [mfaError, setMfaError] = useState("");
  const [verifyingEnrollment, setVerifyingEnrollment] = useState(false);
  const [cancellingEnrollment, setCancellingEnrollment] = useState(false);
  const mfaRequestPending = useRef(false);
  const securityAccount = useRef(user?.id);
  securityAccount.current = user?.id;

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [appLockEnabled, setAppLockEnabled] = useState(() =>
    isBiometricAppLockEnabled(),
  );
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [currentActivitySessionId, setCurrentActivitySessionId] = useState<
    string | null
  >(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] =
    useState<PendingSecurityAction | null>(null);
  const [actionPending, setActionPending] = useState(false);

  const isMfaActive = verifiedFactors.length > 0;
  const needsWorkspaceStepUp =
    workspaceMfaRequired && isMfaActive && currentAal !== "aal2";
  const needsAdminStepUp = mfaRequired && isMfaActive && currentAal !== "aal2";
  const needsSessionStepUp = needsWorkspaceStepUp || needsAdminStepUp;

  const resolvePostStepUpPath = () => {
    const returnTo = (location.state as { from?: string } | null)?.from;
    if (workspaceMfaRequired) {
      if (returnTo?.startsWith("/workspace")) return returnTo;
      return WORKSPACE_ENTRY_PATH;
    }
    if (returnTo?.startsWith("/admin")) return returnTo;
    return "/admin";
  };

  useEffect(() => {
    setVerifiedFactors([]);
    setCurrentAal(null);
    setFactorId(null);
    setQrCode(null);
    setSecretKey(null);
    setVerifyCode("");
    setStepUpCode("");
    void loadSessions();
    void loadEnrolledFactors();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    void trackUserSession(user.id).then((id) => {
      if (id) setCurrentActivitySessionId(id);
      void loadSessions();
    });
  }, [user?.id]);

  useEffect(() => {
    if (!workspaceMfaRequired || !isMfaActive || currentAal !== "aal2") return;
    const returnTo = (location.state as { from?: string } | null)?.from;
    const target = returnTo?.startsWith("/workspace")
      ? returnTo
      : WORKSPACE_ENTRY_PATH;
    navigate(target, { replace: true });
  }, [workspaceMfaRequired, isMfaActive, currentAal, location.state, navigate]);

  useEffect(() => {
    void nativePluginsService
      .isBiometricAvailable()
      .then(setBiometricAvailable);
  }, []);

  const loadEnrolledFactors = async () => {
    const accountId = user?.id;
    if (!accountId) {
      setFactorsLoading(false);
      return false;
    }
    setFactorsLoading(true);
    setMfaError("");
    try {
      const [{ data, error }, { data: assurance, error: assuranceError }] =
        await Promise.all([
          supabase.auth.mfa.listFactors(),
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        ]);
      if (error) throw error;
      if (assuranceError) throw assuranceError;
      if (securityAccount.current !== accountId) return false;
      setVerifiedFactors(
        (data?.totp || []).filter((factor) => factor.status === "verified"),
      );
      setCurrentAal(assurance?.currentLevel || null);
      return true;
    } catch {
      if (securityAccount.current === accountId) {
        setMfaError(
          "We couldn’t check your two-factor authentication status. Refresh security status before making changes.",
        );
      }
      return false;
    } finally {
      if (securityAccount.current === accountId) setFactorsLoading(false);
    }
  };

  const verifyAuthenticator = async (enrollment: boolean) => {
    const id = enrollment ? factorId : verifiedFactors[0]?.id;
    const code = (enrollment ? verifyCode : stepUpCode).trim();
    const accountId = user?.id;
    if (!id || !/^\d{6}$/.test(code) || mfaRequestPending.current) return;
    mfaRequestPending.current = true;
    setMfaError("");
    if (enrollment) setVerifyingEnrollment(true);
    else setSteppingUp(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: id });
      if (challenge.error) throw challenge.error;
      if (securityAccount.current !== accountId) return;
      const verification = await supabase.auth.mfa.verify({
        factorId: id,
        challengeId: challenge.data.id,
        code,
      });
      if (verification.error) throw verification.error;
      const { data: assurance, error } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) throw error;
      if (securityAccount.current !== accountId) return;
      if (assurance?.currentLevel !== "aal2")
        throw new Error(
          "Verification did not finish. Try a fresh code from your authenticator.",
        );
      clearWorkspaceMfaSkip();
      setCurrentAal("aal2");
      setFactorId(null);
      setQrCode(null);
      setSecretKey(null);
      setVerifyCode("");
      setStepUpCode("");
      toast.success(
        enrollment
          ? t("securityPage.mfaEnabledToast")
          : "Two-factor verification complete.",
      );
      const refreshed = await loadEnrolledFactors();
      if (refreshed && (mfaRequired || workspaceMfaRequired))
        navigate(resolvePostStepUpPath(), { replace: true });
    } catch (error) {
      if (securityAccount.current === accountId) {
        setMfaError(
          error instanceof Error
            ? error.message
            : "That code could not be verified. Try the current six-digit code from your authenticator.",
        );
      }
    } finally {
      mfaRequestPending.current = false;
      setVerifyingEnrollment(false);
      setSteppingUp(false);
    }
  };

  const loadSessions = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("user_sessions")
      .select("id, session_label, last_seen_at, user_agent, auth_session_id")
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .order("last_seen_at", { ascending: false });
    setSessions(data || []);
  };

  const startMfaEnrollment = async () => {
    if (mfaRequestPending.current || factorsLoading || factorId) return;
    const accountId = user?.id;
    mfaRequestPending.current = true;
    setMfaError("");
    setEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "BaytMiftah",
      });
      if (error) throw error;
      if (securityAccount.current !== accountId) return;
      setFactorId(data.id);
      setQrCode(data.totp?.qr_code || null);
      setSecretKey(data.totp?.secret || null);
      setVerifyCode("");
    } catch (error) {
      if (securityAccount.current === accountId)
        setMfaError(
          error instanceof Error
            ? error.message
            : t("securityPage.mfaStartFailed"),
        );
    } finally {
      mfaRequestPending.current = false;
      setEnrolling(false);
    }
  };

  const cancelMfaEnrollment = async () => {
    if (!factorId || mfaRequestPending.current) return;
    mfaRequestPending.current = true;
    setCancellingEnrollment(true);
    setMfaError("");
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      setFactorId(null);
      setQrCode(null);
      setSecretKey(null);
      setVerifyCode("");
    } catch (error) {
      setMfaError(
        error instanceof Error
          ? error.message
          : "Unable to cancel setup. Try again before starting another enrollment.",
      );
    } finally {
      mfaRequestPending.current = false;
      setCancellingEnrollment(false);
    }
  };

  const unenrollFactor = async (fId: string) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: fId });
      if (error) throw error;
      toast.success("Authenticator factor removed.");
      await loadEnrolledFactors();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to unenroll factor",
      );
    }
  };

  const removeActivitySession = async (session: SessionInfo) => {
    if (!user?.id) return;
    try {
      setRevokingId(session.id);
      if (session.auth_session_id) {
        const { error } = await supabase.rpc("revoke_user_auth_session", {
          p_auth_session_id: session.auth_session_id,
        });
        if (error) throw error;
        toast.success("That device has been signed out.");
      } else {
        await removeSessionFromActivityList(user.id, session.id);
        toast.success("Device removed from your activity list.");
      }
      void loadSessions();
    } finally {
      setRevokingId(null);
    }
  };

  const signOutEverywhere = async () => {
    await supabase.auth.signOut({ scope: "global" });
  };

  const confirmSecurityAction = async () => {
    if (!pendingAction) return;
    setActionPending(true);
    try {
      if (pendingAction.kind === "factor")
        await unenrollFactor(pendingAction.id);
      if (pendingAction.kind === "session") {
        const target = sessions.find((row) => row.id === pendingAction.id);
        if (target) await removeActivitySession(target);
      }
      if (pendingAction.kind === "all") await signOutEverywhere();
      setPendingAction(null);
    } finally {
      setActionPending(false);
    }
  };

  return (
    <PageLayout variant="consumer" maxWidthClassName="max-w-3xl">
      <PageMeta
        title={t("securityPage.title")}
        description={t("securityPage.subtitle")}
        canonicalPath="/app/security"
      />
      <ConsumerHubChrome activeSection="settings">
        <PageHeader
          title={t("securityPage.title")}
          description={t("securityPage.subtitle")}
        />

        <div className="space-y-6">
          {/* Urgent MFA Notice */}
          {mfaRequired ? (
            <Card className="p-4 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-semibold text-sm">
                  Administrative MFA Required
                </p>
                <p className="text-xs">{t("securityPage.adminMfaRequired")}</p>
              </div>
            </Card>
          ) : null}

          {workspaceMfaRequired ? (
            <Card className="p-4 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="flex-1 space-y-1">
                <p className="font-semibold text-sm">
                  {t("securityPage.workspaceMfaBannerTitle")}
                </p>
                <p className="text-xs">
                  {needsWorkspaceStepUp
                    ? t("securityPage.workspaceMfaStepUp")
                    : t("securityPage.workspaceMfaRequired")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {!isMfaActive && !factorId && !factorsLoading && !mfaError ? (
                  <Button
                    variant="gradient"
                    size="sm"
                    onClick={() => void startMfaEnrollment()}
                    disabled={
                      enrolling || verifyingEnrollment || cancellingEnrollment
                    }
                  >
                    {enrolling
                      ? t("securityPage.startingMfa")
                      : t("securityPage.workspaceMfaEnrollCta")}
                  </Button>
                ) : null}
              </div>
            </Card>
          ) : null}

          <Card className="space-y-2 p-5">
            <h2 className="font-semibold">
              Lost access to your authenticator?
            </h2>
            <p className="text-sm text-muted-foreground">
              Contact support from a device where you are still signed in, or
              use our help page. Support will verify your identity and request
              an owner review before any account recovery.
            </p>
            <a
              className="inline-block text-sm font-semibold text-primary underline"
              href="/help"
            >
              Get account recovery help
            </a>
          </Card>

          <div className="rounded-2xl border border-surface-border bg-surface-subtle/40 p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Account protection
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">
              Keep your account in your hands
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-secondary">
              Manage your authenticator, review signed-in devices, and choose
              how this device unlocks. Two-factor authentication uses an app on
              your phone, without SMS charges.
            </p>
          </div>

          <TwoFactorPanel
            loading={factorsLoading}
            error={mfaError}
            factors={verifiedFactors}
            currentAal={currentAal}
            needsStepUp={needsSessionStepUp}
            required={mfaRequired || workspaceMfaRequired}
            qrCode={qrCode}
            secretKey={secretKey}
            setupPending={enrolling}
            verifyPending={verifyingEnrollment || steppingUp}
            cancelPending={cancellingEnrollment}
            code={factorId ? verifyCode : stepUpCode}
            onCodeChange={factorId ? setVerifyCode : setStepUpCode}
            onStart={() => void startMfaEnrollment()}
            onVerify={() => void verifyAuthenticator(Boolean(factorId))}
            onCancel={() => void cancelMfaEnrollment()}
            onRetry={() => void loadEnrolledFactors()}
            onRemove={(id) => setPendingAction({ kind: "factor", id })}
          />

          {/* ── Native Biometric App Lock (Mobile Only) ── */}
          {Capacitor.isNativePlatform() && biometricAvailable ? (
            <Card className="p-6 space-y-4 rounded-2xl border border-surface-border bg-surface/80 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm text-ink">
                    {t("mobile.biometric.appLockTitle")}
                  </h2>
                  <p className="text-xs text-ink-secondary">
                    {t("mobile.biometric.appLockDescription")}
                  </p>
                </div>
              </div>
              <label className="flex items-center justify-between gap-4 pt-2 border-t border-surface-border">
                <span className="text-xs font-medium text-ink">
                  Require Biometrics to Unlock
                </span>
                <input
                  type="checkbox"
                  checked={appLockEnabled}
                  onChange={(event) => {
                    const enabled = event.target.checked;
                    setBiometricAppLockEnabled(enabled);
                    setAppLockEnabled(enabled);
                    toast.success(
                      enabled
                        ? t("mobile.biometric.appLockEnabled")
                        : t("mobile.biometric.appLockDisabled"),
                    );
                  }}
                  className="h-5 w-5 accent-emerald-600 rounded cursor-pointer"
                />
              </label>
            </Card>
          ) : null}

          {/* ── ACTIVE SESSIONS & DEVICE TRUST ── */}
          <Card className="p-6 space-y-4 rounded-2xl border border-surface-border bg-surface/80 backdrop-blur-md shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm text-ink">
                    {t("securityPage.activeSessions")}
                  </h2>
                  <p className="text-xs text-ink-secondary">
                    Recent sign-in activity on this account. Removing a device
                    hides it here only; use Sign out everywhere to invalidate
                    credentials.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPendingAction({ kind: "all" })}
                className="text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900/40 gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t("securityPage.signOutEverywhere")}</span>
              </Button>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-surface-border">
              {sessions.length === 0 ? (
                <p className="text-xs text-ink-secondary py-4 text-center">
                  {t("securityPage.noSessions")}
                </p>
              ) : (
                sessions.map((session, index) => {
                  const device = parseDeviceFromUserAgent(session.user_agent);
                  const DeviceIcon = device.icon;
                  const isCurrent = session.id === currentActivitySessionId;

                  return (
                    <div
                      key={session.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                        isCurrent
                          ? "border-emerald-500/40 bg-emerald-500/5 shadow-xs"
                          : "border-surface-border bg-surface-subtle/50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-lg shrink-0 ${
                            isCurrent
                              ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                              : "bg-surface-border/50 text-ink-secondary"
                          }`}
                        >
                          <DeviceIcon className="w-4 h-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-xs text-ink truncate">
                              {session.session_label || device.name}
                            </p>
                            {isCurrent && (
                              <span className="text-xs font-bold px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                                Current Device
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-ink-muted truncate">
                            {device.name} ·{" "}
                            {t("securityPage.lastSeen", {
                              time: new Date(
                                session.last_seen_at,
                              ).toLocaleString(),
                            })}
                          </p>
                        </div>
                      </div>

                      {!isCurrent ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setPendingAction({
                              kind: "session",
                              id: session.id,
                            })
                          }
                          disabled={revokingId === session.id}
                          className="text-xs shrink-0 ml-3 h-8"
                        >
                          {revokingId === session.id
                            ? "Removing..."
                            : "Remove from list"}
                        </Button>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
        <ActionDialog
          open={Boolean(pendingAction)}
          onOpenChange={(open) => !open && setPendingAction(null)}
          title={
            pendingAction?.kind === "factor"
              ? "Disable authenticator?"
              : pendingAction?.kind === "all"
                ? "Sign out everywhere?"
                : "Remove from activity list?"
          }
          description={
            pendingAction?.kind === "factor"
              ? "Two-factor protection from this authenticator will be removed from your account."
              : pendingAction?.kind === "all"
                ? String(t("securityPage.signOutConfirm"))
                : pendingAction?.kind === "session" &&
                    sessions.find((row) => row.id === pendingAction.id)
                      ?.auth_session_id
                  ? "This will invalidate that device's sign-in session when supported by the auth provider."
                  : "This hides the device from your activity list only. Use Sign out everywhere to invalidate all sessions."
          }
          confirmLabel={
            pendingAction?.kind === "factor"
              ? "Disable authenticator"
              : pendingAction?.kind === "all"
                ? "Sign out everywhere"
                : pendingAction?.kind === "session" &&
                    sessions.find((row) => row.id === pendingAction.id)
                      ?.auth_session_id
                  ? "Sign out device"
                  : "Remove device"
          }
          tone="destructive"
          pending={actionPending}
          onConfirm={confirmSecurityAction}
        />
      </ConsumerHubChrome>
    </PageLayout>
  );
}
