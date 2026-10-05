import type { PlatformFeatureFlags } from "./platform-feature-flags";

const AI_WORKSPACE_SLUGS = new Set([
  "ai-assistant",
  "ai-operations",
  "ai-lease-analyzer",
  "company-knowledge",
  "ai-rent-yield",
  "predictive-analytics",
  "recommendations",
  "advanced-search",
]);

export function isWorkspaceSlugEnabledByPlatformFeatures(
  slug: string,
  flags: PlatformFeatureFlags,
): boolean {
  if (slug === "whatsapp-hub") return flags.whatsapp;
  if (AI_WORKSPACE_SLUGS.has(slug)) return flags.aiAssistant;
  return true;
}
