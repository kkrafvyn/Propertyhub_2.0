import { COOKIE_CONSENT_KEY, type CookieConsent } from "../../../../lib/legal-config";
import { monitoring } from "../../../../lib/monitoring";

function analyticsAllowed(): boolean {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return false;
    const consent = JSON.parse(raw) as CookieConsent;
    return Boolean(consent.analytics);
  } catch {
    return false;
  }
}

/** Marketing events — no PII; gated on analytics cookie consent. */
export function trackMarketingEvent(eventName: string, payload: Record<string, string | number | boolean> = {}) {
  if (!analyticsAllowed()) return;
  monitoring.trackEvent(eventName, { surface: "marketing_home", ...payload });
}
