export const KYC_PROVIDER_ENGINES = [
  { slug: "internal-kyc", label: "Internal (AI + human review)" },
  { slug: "smile-identity", label: "Smile Identity (Africa / Ghana Card)" },
  { slug: "prembly", label: "Prembly (international / Ghana)" },
  { slug: "ghana-trust", label: "Ghana Trust Center (legacy internal)" },
  { slug: "transunion-smartmove", label: "TransUnion SmartMove (US tenant screening)" },
] as const;

export type KycProviderEngineSlug = (typeof KYC_PROVIDER_ENGINES)[number]["slug"];

export function getKycProviderLabel(slug: string | null | undefined) {
  return KYC_PROVIDER_ENGINES.find((entry) => entry.slug === slug)?.label || slug || "Unknown";
}

export async function resolveKycProviderEngine(jurisdictionId: string) {
  try {
    const { platformKycService } = await import("./platform-kyc.service");
    const policy = await platformKycService.getPolicy(jurisdictionId);
    if (policy?.provider_engine) return policy.provider_engine;
  } catch {
    // Fall back below.
  }

  const { resolveKycEngine } = await import("./kyc-gate.service");
  return resolveKycEngine(jurisdictionId);
}
