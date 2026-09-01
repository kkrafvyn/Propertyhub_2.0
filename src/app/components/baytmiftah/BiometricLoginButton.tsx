import { useEffect, useState } from "react";
import { Fingerprint, Eye, Shield, ChevronRight } from "lucide-react";
import { nativePluginsService } from "../../../lib/native-plugins.service";
import { useTranslation } from "../../i18n/LocaleContext";

interface BiometricLoginButtonProps {
  onBiometricSuccess: (credentials: { username: string; password: string }) => void;
  onBiometricFailed?: (reason: string) => void;
}

export function BiometricLoginButton({
  onBiometricSuccess,
  onBiometricFailed,
}: BiometricLoginButtonProps) {
  const { t } = useTranslation();
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [platform, setPlatform] = useState<"android" | "ios" | "web">("web");

  useEffect(() => {
    const checkAvailability = async () => {
      setPlatform(nativePluginsService.getPlatform());
      setIsAvailable(await nativePluginsService.isBiometricAvailable());
    };
    void checkAvailability();
  }, []);

  if (!isAvailable) return null;

  const handleBiometricLogin = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      await nativePluginsService.hapticMedium();
      const credentials = await nativePluginsService.loadBiometricCredentials();

      if (credentials) {
        await nativePluginsService.hapticSuccess();
        onBiometricSuccess(credentials);
      } else {
        await nativePluginsService.hapticError();
        onBiometricFailed?.(t("mobile.biometric.failed"));
      }
    } catch (err: unknown) {
      await nativePluginsService.hapticError();
      onBiometricFailed?.(
        err instanceof Error ? err.message : t("searchPage.authError"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const BiometricIcon = platform === "ios" ? Eye : Fingerprint;
  const biometricLabel =
    platform === "ios" ? t("mobile.biometric.faceId") : t("mobile.biometric.fingerprint");

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-surface-border" />
        <span className="text-xs font-medium text-ink-muted">{t("mobile.biometric.authDivider")}</span>
        <div className="flex-1 h-px bg-surface-border" />
      </div>

      <button
        type="button"
        onClick={() => void handleBiometricLogin()}
        disabled={isLoading}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 bg-surface-subtle border border-surface-border rounded-2xl hover:bg-surface-hover hover:border-primary/30 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed group focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/15 transition-colors shrink-0">
            {isLoading ? (
              <Shield className="w-5 h-5 text-primary animate-pulse" />
            ) : (
              <BiometricIcon className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-ink">
              {isLoading ? t("mobile.biometric.verifying") : biometricLabel}
            </p>
            <p className="text-xs text-ink-secondary mt-0.5">
              {platform === "ios"
                ? t("mobile.biometric.signInHintIos")
                : t("mobile.biometric.signInHintAndroid")}
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-ink-muted group-hover:text-primary transition-colors shrink-0" />
      </button>
    </div>
  );
}
