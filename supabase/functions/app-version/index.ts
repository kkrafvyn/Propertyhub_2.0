import { corsHeaders, jsonResponse } from "../_shared/http.ts";

type Surface = "web" | "desktop" | "ios" | "android";

function readVersion(key: string, fallback: string) {
  return Deno.env.get(key)?.trim() || fallback;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let surface: Surface = "web";
  let current = "0.0.0";

  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    surface = (body?.surface || "web") as Surface;
    current = String(body?.current || "0.0.0").trim();
  } else {
    const url = new URL(req.url);
    surface = (url.searchParams.get("surface") || "web") as Surface;
    current = url.searchParams.get("current")?.trim() || "0.0.0";
  }

  const latest = readVersion("APP_LATEST_VERSION", readVersion("VITE_APP_VERSION", "1.0.0"));
  const minimum = readVersion(
    "APP_MINIMUM_VERSION",
    readVersion("VITE_APP_MINIMUM_VERSION", latest),
  );
  const changelog = Deno.env.get("APP_CHANGELOG")?.trim() || null;
  const forceUpdate = Deno.env.get("APP_FORCE_UPDATE") === "true";

  const downloadUrl =
    surface === "desktop"
      ? Deno.env.get("DESKTOP_DOWNLOAD_URL") ||
        Deno.env.get("VITE_DESKTOP_DOWNLOAD_URL") ||
        "/downloads/baytmiftah-desktop-setup.exe"
      : surface === "ios"
        ? Deno.env.get("IOS_APP_URL") || Deno.env.get("VITE_IOS_APP_URL") || ""
        : surface === "android"
          ? Deno.env.get("ANDROID_APP_URL") || Deno.env.get("VITE_ANDROID_APP_URL") || ""
          : Deno.env.get("PUBLIC_APP_URL") || Deno.env.get("VITE_PUBLIC_APP_URL") || "";

  function parseVersion(version: string) {
    const [major, minor, patch] = version.split(".").map((part) => Number(part) || 0);
    return major * 10000 + minor * 100 + patch;
  }

  const updateAvailable = parseVersion(latest) > parseVersion(current);
  const belowMinimum = parseVersion(current) < parseVersion(minimum);

  return jsonResponse(200, {
    surface,
    current_version: current,
    latest_version: latest,
    minimum_version: minimum,
    update_available: updateAvailable,
    force_update: forceUpdate || belowMinimum,
    download_url: downloadUrl,
    changelog,
    checked_at: new Date().toISOString(),
  });
});
