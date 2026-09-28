const AUTH_CALLBACK_PROTOCOL = "baytmiftah:";
const AUTH_CALLBACK_HOST = "auth";

function parseAuthCallback(url) {
  if (!url || typeof url !== "string") return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== AUTH_CALLBACK_PROTOCOL || parsed.hostname !== AUTH_CALLBACK_HOST) return null;

    const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ""));
    if (parsed.searchParams.has("access_token") || parsed.searchParams.has("refresh_token")
      || hashParams.has("access_token") || hashParams.has("refresh_token")) return null;

    const code = parsed.searchParams.get("code");
    const state = parsed.searchParams.get("bm_state");
    if (!code || !state) return null;
    return { type: "code", code, state };
  } catch {
    return null;
  }
}

module.exports = parseAuthCallback;
