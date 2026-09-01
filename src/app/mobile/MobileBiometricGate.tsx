import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Eye, Fingerprint, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { nativePluginsService } from "../../lib/native-plugins.service";
import {
  isBiometricAppLockEnabled,
  setBiometricAppLockEnabled,
} from "../../lib/biometric-preferences";
import { useTranslation } from "../i18n/LocaleContext";

export function MobileBiometricGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [locked, setLocked] = useState(false);
  const [checking, setChecking] = useState(false);
  const [platform, setPlatform] = useState<"android" | "ios" | "web">("web");

  useEffect(() => {
    setPlatform(nativePluginsService.getPlatform());
  }, []);

  const unlock = useCallback(async () => {
    setChecking(true);
    try {
      const ok = await nativePluginsService.authenticateWithBiometric({
        reason: t("mobile.biometric.unlockReason"),
        title: t("mobile.biometric.unlockTitle"),
        subtitle: t("mobile.biometric.unlockSubtitle"),
      });
      if (ok) {
        await nativePluginsService.hapticSuccess();
        setLocked(false);
      } else {
        await nativePluginsService.hapticError();
      }
    } finally {
      setChecking(false);
    }
  }, [t]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user || !isBiometricAppLockEnabled()) {
      setLocked(false);
      return undefined;
    }

    setLocked(true);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") setLocked(true);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [user]);

  useEffect(() => {
    if (!locked) return;
    void unlock();
  }, [locked, unlock]);

  if (!locked) return <>{children}</>;

  const Icon = platform === "ios" ? Eye : Fingerprint;

  return (
    <div className="mobile-biometric-gate">
      <div className="mobile-biometric-gate-card">
        <span className="mobile-biometric-gate-icon" aria-hidden>
          {checking ? <Loader2 className="h-8 w-8 animate-spin" /> : <Icon className="h-8 w-8" />}
        </span>
        <h2>{t("mobile.biometric.unlockTitle")}</h2>
        <p>{t("mobile.biometric.unlockSubtitle")}</p>
        <button type="button" className="mobile-primary-button mt-4" onClick={() => void unlock()}>
          {checking ? t("mobile.biometric.verifying") : t("mobile.biometric.tryAgain")}
        </button>
      </div>
    </div>
  );
}
