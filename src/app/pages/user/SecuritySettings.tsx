import { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/badge";
import { supabase } from "../../../lib/supabase";
import {
  removeSessionFromActivityList,
  trackUserSession,
} from "../../../lib/security/session-tracking";
import { nativePluginsService } from "../../../lib/native-plugins.service";
import { WORKSPACE_ENTRY_PATH } from "../../../lib/workspace";
import {
  isBiometricAppLockEnabled,
  setBiometricAppLockEnabled,
} from "../../../lib/biometric-preferences";
import { useTranslation } from "../../i18n/LocaleContext";
import { toast } from "sonner";
import { ConsumerHubChrome, PageHeader, PageLayout } from "../../components/ux";
import { ActionDialog } from "../../components/ux/ActionDialog";
import {
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Laptop,
  Monitor,
  Globe,
  KeyRound,
  Copy,
  Check,
  LogOut,
  Fingerprint,
  AlertTriangle,
  CheckCircle2,
  Lock,
  RefreshCw,
  QrCode,
  Sparkles,
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

  if (lower.includes("iphone") || lower.includes("ipad") || lower.includes("ios")) {
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
  else if (lower.includes("chrome") && !lower.includes("edg/")) browser = "Chrome";
  else if (lower.includes("safari") && !lower.includes("chrome")) browser = "Safari";
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
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [verifiedFactors, setVerifiedFactors] = useState<any[]>([]);
  const [currentAal, setCurrentAal] = useState<string | null>(null);
  const [stepUpCode, setStepUpCode] = useState("");
  const [steppingUp, setSteppingUp] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [appLockEnabled, setAppLockEnabled] = useState(() => isBiometricAppLockEnabled());
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [currentActivitySessionId, setCurrentActivitySessionId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingSecurityAction | null>(null);
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
    const target = returnTo?.startsWith("/workspace") ? returnTo : WORKSPACE_ENTRY_PATH;
    navigate(target, { replace: true });
  }, [workspaceMfaRequired, isMfaActive, currentAal, location.state, navigate]);

  useEffect(() => {
    void nativePluginsService.isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  const loadEnrolledFactors = async () => {
    try {
      const [{ data, error }, { data: assurance }] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ]);
      if (error) throw error;
      const active = (data?.totp || []).filter((f: any) => f.status === "verified");
      setVerifiedFactors(active);
      setCurrentAal(assurance?.currentLevel || null);
    } catch {
      // ignore silently if mfa table not populated
    }
  };

  const stepUpMfaSession = async () => {
    const factor = verifiedFactors[0];
    if (!factor || !/^\d{6}$/.test(stepUpCode.trim())) return;
    try {
      setSteppingUp(true);
      const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id });
      if (challenge.error) throw challenge.error;
      const verification = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: challenge.data.id,
        code: stepUpCode.trim(),
      });
      if (verification.error) throw verification.error;
      const { data: assurance, error: assuranceError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assuranceError) throw assuranceError;
      if (assurance?.currentLevel !== "aal2") {
        throw new Error("The session was not elevated. Please enter a fresh authenticator code.");
      }
      setCurrentAal("aal2");
      setStepUpCode("");
      toast.success(
        workspaceMfaRequired
          ? t("securityPage.workspaceStepUpSuccess")
          : t("securityPage.adminStepUpSuccess"),
      );
      navigate(resolvePostStepUpPath(), { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to verify the authenticator code.");
    } finally {
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
    try {
      setEnrolling(true);
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) throw error;
      setFactorId(data.id);
      setQrCode(data.totp?.qr_code || null);
      setSecretKey(data.totp?.secret || null);
      setWizardStep(2);
      toast.success(t("securityPage.scanQrToast"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("securityPage.mfaStartFailed"));
    } finally {
      setEnrolling(false);
    }
  };

  const copySecretToClipboard = async () => {
    if (!secretKey) return;
    await navigator.clipboard.writeText(secretKey);
    setCopiedSecret(true);
    toast.success("Secret key copied to clipboard");
    setTimeout(() => setCopiedSecret(false), 2500);
  };

  const verifyMfaEnrollment = async () => {
    if (!factorId || !verifyCode.trim()) return;
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: verifyCode.trim(),
      });
      if (verify.error) throw verify.error;

      toast.success(t("securityPage.mfaEnabledToast"));
      setQrCode(null);
      setSecretKey(null);
      setVerifyCode("");
      setWizardStep(1);
      await loadEnrolledFactors();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("securityPage.mfaVerifyFailed"));
    }
  };

  const unenrollFactor = async (fId: string) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: fId });
      if (error) throw error;
      toast.success("Authenticator factor removed.");
      await loadEnrolledFactors();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to unenroll factor");
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
      if (pendingAction.kind === "factor") await unenrollFactor(pendingAction.id);
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

  // Security score calculation
  const securityScore = useMemo(() => {
    let score = 30; // base account
    if (isMfaActive) score += 40;
    if (appLockEnabled) score += 20;
    if (sessions.length > 0 && sessions.length <= 3) score += 10;
    return Math.min(score, 100);
  }, [isMfaActive, appLockEnabled, sessions.length]);

  return (
    <PageLayout variant="consumer" maxWidthClassName="max-w-3xl">
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
              <p className="font-semibold text-sm">Administrative MFA Required</p>
              <p className="text-xs">{t("securityPage.adminMfaRequired")}</p>
            </div>
          </Card>
        ) : null}

        {workspaceMfaRequired ? (
          <Card className="p-4 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="flex-1 space-y-1">
              <p className="font-semibold text-sm">{t("securityPage.workspaceMfaBannerTitle")}</p>
              <p className="text-xs">
                {needsWorkspaceStepUp
                  ? t("securityPage.workspaceMfaStepUp")
                  : t("securityPage.workspaceMfaRequired")}
              </p>
            </div>
            {!isMfaActive ? (
              <Button
                variant="gradient"
                size="sm"
                onClick={() => void startMfaEnrollment()}
                disabled={enrolling}
                className="shrink-0"
              >
                {enrolling ? t("securityPage.startingMfa") : t("securityPage.workspaceMfaEnrollCta")}
              </Button>
            ) : null}
          </Card>
        ) : null}

        {/* ── Security Health Score Card ── */}
        <Card
          variant="glass"
          className="relative overflow-hidden p-6 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-primary/5 to-surface/90 rounded-3xl shadow-lg backdrop-blur-md"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-emerald-500/15 via-transparent to-transparent blur-3xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant={securityScore >= 80 ? "success" : "warning"}
                  dot
                  className="text-xs font-bold px-2.5 py-0.5"
                >
                  {securityScore >= 80 ? "Optimal Protection" : "Action Recommended"}
                </Badge>
                <span className="text-xs text-ink-muted">Trust & Authentication</span>
              </div>
              <h2 className="text-xl font-display font-medium text-ink">
                Account Security Health
              </h2>
              <p className="text-xs text-ink-secondary max-w-md leading-relaxed">
                Protect your enterprise wallets, legal documents, and digital lease agreements by enabling multi-factor authentication.
              </p>
            </div>

            {/* Score Ring / Badge */}
            <div className="flex items-center gap-4 bg-surface/80 border border-surface-border/80 rounded-2xl p-4 shadow-sm shrink-0">
              <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-bold text-lg font-mono">
                {securityScore}%
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                  {isMfaActive ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span>2FA {isMfaActive ? "Enabled" : "Missing"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  <span>{sessions.length} Active Session{sessions.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

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

        {/* ── 2FA TOTP WIZARD ── */}
        <Card className="p-6 space-y-5 rounded-2xl border border-surface-border bg-surface/80 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-semibold text-sm text-ink">
                  {t("securityPage.totpTitle")}
                </h2>
                <p className="text-xs text-ink-secondary">
                  Time-based One-Time Password via Google Authenticator, 1Password, or Authy.
                </p>
              </div>
            </div>
            {isMfaActive && (
              <Badge variant="success" dot className="text-xs font-bold">
                Active & Enrolled
              </Badge>
            )}
          </div>

          {/* Active 2FA status */}
          {isMfaActive && !qrCode ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Authenticator app is actively protecting your account</span>
                </div>
                {verifiedFactors.map((f) => (
                  <Button
                    key={f.id}
                    variant="outline"
                    size="sm"
                    onClick={() => setPendingAction({ kind: "factor", id: f.id })}
                    className="text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900/40"
                  >
                    Unlink Authenticator
                  </Button>
                ))}
              </div>
              {needsSessionStepUp ? (
                <div className="space-y-2 border-t border-emerald-500/20 pt-3">
                  <p className="text-xs text-ink-secondary">
                    {needsWorkspaceStepUp
                      ? t("securityPage.workspaceStepUpHint")
                      : t("securityPage.adminStepUpHint")}
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:max-w-md">
                    <Input
                      aria-label="Authenticator code"
                      value={stepUpCode}
                      onChange={(event) => setStepUpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void stepUpMfaSession();
                      }}
                      placeholder="000000"
                      maxLength={6}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      className="font-mono text-center tracking-widest"
                    />
                    <Button
                      variant="gradient"
                      onClick={() => void stepUpMfaSession()}
                      disabled={steppingUp || stepUpCode.length !== 6}
                      className="shrink-0"
                    >
                      {steppingUp
                        ? t("securityPage.verifyingStepUp")
                        : needsWorkspaceStepUp
                          ? t("securityPage.workspaceStepUpButton")
                          : t("securityPage.adminStepUpButton")}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : !qrCode ? (
            /* Not enrolled - Start setup */
            <div className="space-y-4 pt-2 border-t border-surface-border">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border border-surface-border bg-surface-subtle/50 space-y-1">
                  <span className="text-xs font-mono font-bold text-primary">STEP 1</span>
                  <p className="text-xs font-semibold text-ink">Get Authenticator App</p>
                  <p className="text-[11px] text-ink-secondary">Install Google Authenticator or 1Password</p>
                </div>
                <div className="p-3 rounded-xl border border-surface-border bg-surface-subtle/50 space-y-1">
                  <span className="text-xs font-mono font-bold text-primary">STEP 2</span>
                  <p className="text-xs font-semibold text-ink">Scan Secret QR</p>
                  <p className="text-[11px] text-ink-secondary">Link your account securely in seconds</p>
                </div>
                <div className="p-3 rounded-xl border border-surface-border bg-surface-subtle/50 space-y-1">
                  <span className="text-xs font-mono font-bold text-primary">STEP 3</span>
                  <p className="text-xs font-semibold text-ink">Enter 6-Digit Code</p>
                  <p className="text-[11px] text-ink-secondary">Verify and activate 2FA protection</p>
                </div>
              </div>

              <Button
                variant="gradient"
                onClick={() => void startMfaEnrollment()}
                disabled={enrolling}
                className="gap-2 w-full sm:w-auto"
              >
                <QrCode className="w-4 h-4" />
                {enrolling ? t("securityPage.startingMfa") : t("securityPage.startMfa")}
              </Button>
            </div>
          ) : (
            /* Active Setup Wizard */
            <div className="space-y-5 pt-3 border-t border-surface-border">
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-surface-subtle/70 border border-surface-border">
                {qrCode && (
                  <div className="p-2 bg-white rounded-xl shadow-md border border-neutral-200 shrink-0">
                    <img
                      src={qrCode}
                      alt={t("securityPage.mfaQrAlt")}
                      className="w-44 h-44 rounded-lg"
                    />
                  </div>
                )}

                <div className="space-y-3 flex-1">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                      Step 2: Scan QR or Enter Secret
                    </h3>
                    <p className="text-xs text-ink-secondary mt-1">
                      Open your authenticator app, tap &quot;Add Account&quot; or &quot;+&quot;, and point your camera at the QR code.
                    </p>
                  </div>

                  {secretKey && (
                    <div className="space-y-1">
                      <span className="text-xs font-semibold uppercase text-ink-muted">
                        Manual Entry Secret Key:
                      </span>
                      <div className="flex items-center gap-2">
                        <code className="px-2.5 py-1.5 rounded-lg bg-surface border border-surface-border text-xs font-mono font-bold text-ink select-all">
                          {secretKey}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void copySecretToClipboard()}
                          className="gap-1.5 text-xs h-8"
                        >
                          {copiedSecret ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedSecret ? "Copied" : "Copy"}</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: Verify 6-digit code */}
              <div className="space-y-2 max-w-sm">
                <label className="text-xs font-semibold text-ink">
                  Enter 6-Digit Code from App
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    value={verifyCode}
                    onChange={(event) => setVerifyCode(event.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    inputMode="numeric"
                    className="font-mono text-center tracking-widest text-base font-bold"
                  />
                  <Button
                    variant="gradient"
                    onClick={() => void verifyMfaEnrollment()}
                    disabled={verifyCode.length < 6}
                    className="shrink-0"
                  >
                    Verify & Enable
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>

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
                  Recent sign-in activity on this account. Removing a device hides it here only; use Sign out everywhere to invalidate credentials.
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
                            time: new Date(session.last_seen_at).toLocaleString(),
                          })}
                        </p>
                      </div>
                    </div>

                    {!isCurrent ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPendingAction({ kind: "session", id: session.id })}
                        disabled={revokingId === session.id}
                        className="text-xs shrink-0 ml-3 h-8"
                      >
                        {revokingId === session.id ? "Removing..." : "Remove from list"}
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
        title={pendingAction?.kind === "factor" ? "Disable authenticator?" : pendingAction?.kind === "all" ? "Sign out everywhere?" : "Remove from activity list?"}
        description={
          pendingAction?.kind === "factor"
            ? "Two-factor protection from this authenticator will be removed from your account."
            : pendingAction?.kind === "all"
              ? String(t("securityPage.signOutConfirm"))
              : pendingAction?.kind === "session" &&
                  sessions.find((row) => row.id === pendingAction.id)?.auth_session_id
                ? "This will invalidate that device's sign-in session when supported by the auth provider."
                : "This hides the device from your activity list only. Use Sign out everywhere to invalidate all sessions."
        }
        confirmLabel={
          pendingAction?.kind === "factor"
            ? "Disable authenticator"
            : pendingAction?.kind === "all"
              ? "Sign out everywhere"
              : pendingAction?.kind === "session" &&
                  sessions.find((row) => row.id === pendingAction.id)?.auth_session_id
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
