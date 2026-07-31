import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "../../i18n/LocaleContext";
import {
  COOKIE_CONSENT_KEY,
  COOKIE_DEFINITIONS,
  DEFAULT_COOKIE_CONSENT,
  type CookieConsent,
} from "../../../lib/legal-config";

function readConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CookieConsent;
  } catch {
    return null;
  }
}

function saveConsent(consent: CookieConsent) {
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
  window.dispatchEvent(new CustomEvent("bm:cookie-consent", { detail: consent }));
}

export function CookieConsentBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [draft, setDraft] = useState<CookieConsent>(DEFAULT_COOKIE_CONSENT);

  useEffect(() => {
    setVisible(!readConsent());
  }, []);

  if (!visible) return null;

  const acceptAll = () => {
    const consent: CookieConsent = {
      essential: true,
      functional: true,
      analytics: true,
      marketing: true,
      updatedAt: new Date().toISOString(),
    };
    saveConsent(consent);
    setVisible(false);
  };

  const acceptSelected = () => {
    saveConsent({ ...draft, essential: true, updatedAt: new Date().toISOString() });
    setVisible(false);
  };

  const rejectOptional = () => {
    saveConsent({
      essential: true,
      functional: true,
      analytics: false,
      marketing: false,
      updatedAt: new Date().toISOString(),
    });
    setVisible(false);
  };

  return (
    <div
      className="cookie-consent-banner fixed inset-x-0 bottom-0 z-[100] border-t border-surface-border bg-white p-4 shadow-lg md:p-6"
      role="dialog"
      aria-label={t("legal.cookies.bannerTitle")}
    >
      <div className="mx-auto max-w-[var(--max-width-page)]">
        <p className="text-sm font-semibold text-ink">{t("legal.cookies.bannerTitle")}</p>
        <p className="mt-1 text-sm text-ink-secondary">
          {t("legal.cookies.bannerBody")}{" "}
          <Link to="/legal/cookies" className="text-brand-forest hover:underline">
            {t("legal.cookies.policyLink")}
          </Link>
        </p>

        {showDetails ? (
          <div className="mt-4 max-h-48 overflow-y-auto rounded-lg border border-surface-border text-xs">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-surface-subtle">
                <tr>
                  <th className="p-2 font-semibold">{t("legal.cookies.tableName")}</th>
                  <th className="p-2 font-semibold">{t("legal.cookies.tablePurpose")}</th>
                  <th className="p-2 font-semibold">{t("legal.cookies.tableDuration")}</th>
                </tr>
              </thead>
              <tbody>
                {COOKIE_DEFINITIONS.map((cookie) => (
                  <tr key={cookie.name} className="border-t border-surface-border">
                    <td className="p-2 font-mono">{cookie.name}</td>
                    <td className="p-2">{cookie.purpose}</td>
                    <td className="p-2">{cookie.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-wrap gap-4 border-t border-surface-border p-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.functional}
                  onChange={(e) => setDraft((d) => ({ ...d, functional: e.target.checked }))}
                />
                {t("legal.cookies.functional")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.analytics}
                  onChange={(e) => setDraft((d) => ({ ...d, analytics: e.target.checked }))}
                />
                {t("legal.cookies.analytics")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.marketing}
                  onChange={(e) => setDraft((d) => ({ ...d, marketing: e.target.checked }))}
                />
                {t("legal.cookies.marketing")}
              </label>
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={acceptAll}
            className="rounded-lg bg-brand-forest px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            {t("legal.cookies.acceptAll")}
          </button>
          <button
            type="button"
            onClick={rejectOptional}
            className="rounded-lg border border-surface-border px-4 py-2 text-sm font-medium text-ink hover:bg-surface-subtle"
          >
            {t("legal.cookies.essentialOnly")}
          </button>
          {showDetails ? (
            <button
              type="button"
              onClick={acceptSelected}
              className="rounded-lg border border-brand-forest px-4 py-2 text-sm font-medium text-brand-forest hover:bg-brand-forest/5"
            >
              {t("legal.cookies.saveChoices")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowDetails(true)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-ink-secondary hover:underline"
            >
              {t("legal.cookies.customize")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
