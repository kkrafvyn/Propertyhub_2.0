export const PLATFORM_FEATURE_KEYS = {
  whatsapp: "feature_whatsapp_enabled",
  aiAssistant: "feature_ai_assistant_enabled",
} as const;

export function coerceSettingBoolean(value: unknown, fallback = true): boolean {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const normalized = String(value)
    .trim()
    .replace(/^"+|"+$/g, "")
    .toLowerCase();
  if (["false", "0", "off", "no", "disabled"].includes(normalized)) return false;
  if (["true", "1", "on", "yes", "enabled"].includes(normalized)) return true;
  return fallback;
}

export async function isPlatformFeatureEnabled(
  admin: { from: (table: string) => { select: (cols: string) => { eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: { value?: unknown } | null }> } } } },
  key: string,
): Promise<boolean> {
  const { data } = await admin
    .from("platform_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return coerceSettingBoolean(data?.value, true);
}
