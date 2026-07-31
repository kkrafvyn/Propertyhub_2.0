import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n/LocaleContext";
import { LEGAL_POLICY_VERSION, LEGAL_VERSION_KEY } from "../../../lib/legal-config";
import { legalAcceptanceService } from "../../../lib/legal-acceptance.service";

export function PolicyUpdateBanner() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (!user) return;

    const localVersion = localStorage.getItem(LEGAL_VERSION_KEY);
    const metaVersion = user.user_metadata?.legal_policy_version as string | undefined;

    if (
      legalAcceptanceService.needsReacceptance(metaVersion || localVersion, LEGAL_POLICY_VERSION)
    ) {
      setVisible(true);
    }
  }, [user]);

  if (!visible || !user) return null;

  const accept = async () => {
    setDismissing(true);
    try {
      await legalAcceptanceService.recordAcceptance({
        userId: user.id,
        scope: "signup_consumer",
        policySlugs: ["terms", "privacy", "marketplace-rules"],
        policyVersion: LEGAL_POLICY_VERSION,
      });
      localStorage.setItem(LEGAL_VERSION_KEY, LEGAL_POLICY_VERSION);
      setVisible(false);
    } catch {
      setDismissing(false);
    }
  };

  return (
    <div className="policy-update-banner border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <div className="mx-auto flex max-w-[var(--max-width-page)] flex-wrap items-center justify-between gap-3">
        <p>
          {t("legal.policyUpdate.message")}{" "}
          <Link to="/legal" className="font-medium underline">
            {t("legal.policyUpdate.review")}
          </Link>
        </p>
        <button
          type="button"
          disabled={dismissing}
          onClick={() => void accept()}
          className="rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {t("legal.policyUpdate.accept")}
        </button>
      </div>
    </div>
  );
}
