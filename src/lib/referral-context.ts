export interface ReferralContext {
  ref: string | null;
  channel: string | null;
}

const STORAGE_KEY = "baytmiftah_referral_context";

function normalizeValue(value?: string | null) {
  const nextValue = String(value || "").trim();
  return nextValue ? nextValue : null;
}

export function extractReferralContext(input?: URLSearchParams | string | null): ReferralContext {
  const params =
    input instanceof URLSearchParams
      ? input
      : new URLSearchParams(String(input || "").replace(/^\?/, ""));

  return {
    ref: normalizeValue(params.get("ref")),
    channel: normalizeValue(params.get("channel")),
  };
}

export function hasReferralContext(context?: ReferralContext | null) {
  return Boolean(context?.ref || context?.channel);
}

export function formatReferralChannel(channel?: string | null) {
  if (!channel) return "Trusted referral";

  return channel
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function buildReferralQueryString(context?: ReferralContext | null) {
  if (!hasReferralContext(context)) return "";

  const params = new URLSearchParams();
  if (context?.ref) params.set("ref", context.ref);
  if (context?.channel) params.set("channel", context.channel);

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export function persistReferralContext(context?: ReferralContext | null) {
  if (typeof window === "undefined" || !hasReferralContext(context)) return;

  window.sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...context,
      capturedAt: new Date().toISOString(),
    })
  );
}

export function captureReferralContext(input?: URLSearchParams | string | null) {
  const context = extractReferralContext(input);
  persistReferralContext(context);
  return context;
}

export function readReferralContext(): ReferralContext {
  if (typeof window === "undefined") {
    return { ref: null, channel: null };
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { ref: null, channel: null };

    const parsed = JSON.parse(raw) as { ref?: string | null; channel?: string | null };
    return {
      ref: normalizeValue(parsed?.ref),
      channel: normalizeValue(parsed?.channel),
    };
  } catch (error) {
    console.error("Failed to read referral context:", error);
    return { ref: null, channel: null };
  }
}
