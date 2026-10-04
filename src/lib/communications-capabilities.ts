/** Production communication / calling capability detection (no fake providers). */

export function voiceCallsAvailable() {
  if (typeof navigator === "undefined") return false;
  return true;
}

export function videoCallsAvailable() {
  const provider =
    import.meta.env.VITE_VIDEO_PROVIDER?.trim() ||
    import.meta.env.VITE_DAILY_API_KEY?.trim() ||
    import.meta.env.VITE_TWILIO_VIDEO_ENABLED?.trim();
  return provider === "true" || (provider?.length ?? 0) > 8;
}

export function nativePushAvailable() {
  return (
    import.meta.env.VITE_FCM_SERVER_CONFIGURED === "true" ||
    Boolean(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim())
  );
}
