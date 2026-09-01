import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { supabase } from "../../../lib/supabase";
import { nativePluginsService } from "../../../lib/native-plugins.service";
import {
  isBiometricAppLockEnabled,
  setBiometricAppLockEnabled,
} from "../../../lib/biometric-preferences";
import { useTranslation } from "../../i18n/LocaleContext";
import { toast } from "sonner";

export function SecuritySettingsPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const mfaRequired = searchParams.get("mfa") === "required";
  const workspaceMfaRequired = searchParams.get("mfa") === "workspace-required";
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [appLockEnabled, setAppLockEnabled] = useState(() => isBiometricAppLockEnabled());
  const [sessions, setSessions] = useState<
    Array<{ id: string; session_label: string | null; last_seen_at: string; user_agent: string | null }>
  >([]);

  useEffect(() => {
    void loadSessions();
  }, [user?.id]);

  useEffect(() => {
    void nativePluginsService.isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  const loadSessions = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("user_sessions")
      .select("id, session_label, last_seen_at, user_agent")
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
      toast.success(t("securityPage.scanQrToast"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("securityPage.mfaStartFailed"));
    } finally {
      setEnrolling(false);
    }
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
      setVerifyCode("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("securityPage.mfaVerifyFailed"));
    }
  };

  const revokeSession = async (sessionId: string) => {
    if (!window.confirm(t("securityPage.revokeConfirm"))) return;
    await supabase
      .from("user_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", sessionId);
    toast.success(t("securityPage.sessionRevoked"));
    void loadSessions();
  };

  const signOutEverywhere = async () => {
    if (!window.confirm(t("securityPage.signOutConfirm"))) return;
    await supabase.auth.signOut({ scope: "global" });
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("securityPage.title")}</h1>
        <p className="text-muted-foreground">{t("securityPage.subtitle")}</p>
      </div>

      {mfaRequired ? (
        <Card className="p-4 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          {t("securityPage.adminMfaRequired")}
        </Card>
      ) : null}
      {workspaceMfaRequired ? (
        <Card className="p-4 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          {t("securityPage.workspaceMfaRequired")}
        </Card>
      ) : null}

      {Capacitor.isNativePlatform() && biometricAvailable ? (
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="font-semibold">{t("mobile.biometric.appLockTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("mobile.biometric.appLockDescription")}</p>
          </div>
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">{t("mobile.biometric.appLockTitle")}</span>
            <input
              type="checkbox"
              checked={appLockEnabled}
              onChange={(event) => {
                const enabled = event.target.checked;
                setBiometricAppLockEnabled(enabled);
                setAppLockEnabled(enabled);
                toast.success(
                  enabled ? t("mobile.biometric.appLockEnabled") : t("mobile.biometric.appLockDisabled"),
                );
              }}
              className="h-5 w-5 accent-brand-forest"
            />
          </label>
        </Card>
      ) : null}

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">{t("securityPage.totpTitle")}</h2>
        {!qrCode ? (
          <Button onClick={() => void startMfaEnrollment()} disabled={enrolling}>
            {enrolling ? t("securityPage.startingMfa") : t("securityPage.startMfa")}
          </Button>
        ) : (
          <div className="space-y-3">
            {qrCode ? (
              <img src={qrCode} alt={t("securityPage.mfaQrAlt")} className="w-48 h-48 border rounded-lg" />
            ) : null}
            <Input
              value={verifyCode}
              onChange={(event) => setVerifyCode(event.target.value)}
              placeholder={t("securityPage.verifyCodePlaceholder")}
              inputMode="numeric"
            />
            <Button onClick={() => void verifyMfaEnrollment()}>{t("securityPage.verifyEnableMfa")}</Button>
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t("securityPage.activeSessions")}</h2>
          <Button variant="outline" size="sm" onClick={() => void signOutEverywhere()}>
            {t("securityPage.signOutEverywhere")}
          </Button>
        </div>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("securityPage.noSessions")}</p>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <p className="font-medium">{session.session_label || t("securityPage.browserSession")}</p>
                <p className="text-xs text-muted-foreground">
                  {session.user_agent || t("securityPage.unknownDevice")} ·{" "}
                  {t("securityPage.lastSeen", {
                    time: new Date(session.last_seen_at).toLocaleString(),
                  })}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => void revokeSession(session.id)}>
                {t("securityPage.revokeSession")}
              </Button>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
