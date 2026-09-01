import { useEffect, useState } from "react";
import { Eye, Fingerprint, Loader2 } from "lucide-react";
import { nativePluginsService } from "../../lib/native-plugins.service";
import { useTranslation } from "../i18n/LocaleContext";

export function MobileBiometricQuickSignIn({
  onSuccess,
  onError,
}: {
  onSuccess: (credentials: { username: string; password: string }) => void;
  onError?: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState<"android" | "ios" | "web">("web");

  useEffect(() => {
    void (async () => {
      setPlatform(nativePluginsService.getPlatform());
      setAvailable(await nativePluginsService.isBiometricAvailable());
    })();
  }, []);

  if (!available) return null;

  const Icon = platform === "ios" ? Eye : Fingerprint;
  const label =
    platform === "ios" ? t("mobile.biometric.faceId") : t("mobile.biometric.fingerprint");

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await nativePluginsService.hapticMedium();
      const credentials = await nativePluginsService.loadBiometricCredentials();
      if (credentials) {
        await nativePluginsService.hapticSuccess();
        onSuccess(credentials);
      } else {
        await nativePluginsService.hapticError();
        onError?.(t("mobile.biometric.failed"));
      }
    } catch {
      await nativePluginsService.hapticError();
      onError?.(t("mobile.biometric.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={loading}
      className="mobile-icon-button shrink-0"
      aria-label={label}
      title={label}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
    </button>
  );
}
