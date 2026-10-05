import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { enableBrowserPush, isPushEnableFailure } from "../../lib/baytmiftah/push-service";
import { pushNotificationService } from "../../../lib/push-notification.service";
import { useTranslation } from "../../i18n/LocaleContext";

const DISMISS_KEY = "baytmiftah_push_dismissed";

export default function PushPrompt() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pushNotificationService.canUseLocalNotifications() || localStorage.getItem(DISMISS_KEY)) {
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.id) {
        setUserId(data.session.user.id);
        setVisible(true);
      }
    });
  }, []);

  async function enable() {
    if (!userId) return;
    setLoading(true);
    setError(null);
    const result = await enableBrowserPush(userId);
    if (isPushEnableFailure(result)) {
      setError(result.reason);
    } else {
      setVisible(false);
    }
    setLoading(false);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 end-4 z-50 max-w-sm rounded-xl border border-surface-border bg-surface p-4 shadow-card">
      <p className="text-sm font-semibold">{t("extensions.push.title")}</p>
      <p className="mt-1 text-xs text-ink-secondary">{t("extensions.push.body")}</p>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={enable}
          disabled={loading}
          className="rounded-lg bg-brand-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          {loading ? t("extensions.push.enabling") : t("extensions.push.enable")}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-semibold"
        >
          {t("extensions.push.later")}
        </button>
      </div>
    </div>
  );
}
