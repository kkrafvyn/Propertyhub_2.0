import { clientIntegrations, getPayangelsPublicKey } from "./integrations";

function getSupabaseAnonKey() {
  return (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );
}

export type ProductionEnvironmentInput = {
  mode?: string;
  viteSupabaseUrl?: string;
  viteSupabaseAnonKey?: string;
  viteSupabasePublishableKey?: string;
  vitePayangelsPublicKey?: string;
  aiProvider?: string;
  payangelsSecretKey?: string;
  resendApiKey?: string;
  openAiApiKey?: string;
  qwenApiKey?: string;
};

export function evaluateProductionEnvironment(input: ProductionEnvironmentInput) {
  const mode = input.mode || "production";
  const errors: string[] = [];
  const warnings: string[] = [];

  const supabaseUrl =
    input.viteSupabaseUrl !== undefined ? input.viteSupabaseUrl : import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey =
    input.viteSupabasePublishableKey !== undefined
      ? input.viteSupabasePublishableKey
      : input.viteSupabaseAnonKey !== undefined
        ? input.viteSupabaseAnonKey
        : getSupabaseAnonKey();

  if (mode === "production" || import.meta.env.PROD || mode === "staging") {
    if (!supabaseUrl || !supabaseKey) {
      errors.push(
        "Production requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY."
      );
    }

    if (!input.vitePayangelsPublicKey && !import.meta.env.VITE_PAYANGELS_PUBLIC_KEY) {
      warnings.push("Production is missing a PayAngels public key; live checkout may be disabled.");
    }

    if (input.aiProvider && !["openai", "qwen"].includes(input.aiProvider.toLowerCase())) {
      warnings.push("AI provider value is not recognized; use openai or qwen.");
    }

    const hasServerSecretExposure = Boolean(
      input.payangelsSecretKey ||
      input.resendApiKey ||
      input.openAiApiKey ||
      input.qwenApiKey ||
      import.meta.env.PAYANGELS_SECRET_KEY ||
      import.meta.env.RESEND_API_KEY ||
      import.meta.env.OPENAI_API_KEY ||
      import.meta.env.QWEN_API_KEY
    );

    if (hasServerSecretExposure) {
      warnings.push(
        "Server-only secrets must stay in Supabase Edge Function secrets or a backend-only environment; do not place them in client-facing Vite variables."
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function validateClientEnv() {
  const missing: string[] = [];
  if (!import.meta.env.VITE_SUPABASE_URL) missing.push("VITE_SUPABASE_URL");
  if (!getSupabaseAnonKey()) {
    missing.push("VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY");
  }
  if (missing.length > 0 && import.meta.env.PROD) {
    console.error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const productionCheck = evaluateProductionEnvironment({
    mode: import.meta.env.MODE,
    viteSupabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    viteSupabaseAnonKey: getSupabaseAnonKey(),
    vitePayangelsPublicKey: import.meta.env.VITE_PAYANGELS_PUBLIC_KEY,
    aiProvider: import.meta.env.VITE_AI_PROVIDER,
  });

  if (!productionCheck.ok) {
    console.error(`Production environment validation failed: ${productionCheck.errors.join(" | ")}`);
  }

  return missing;
}

export function getClientEnv() {
  return {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
    supabaseAnonKey: getSupabaseAnonKey() as string,
    appVersion: import.meta.env.VITE_APP_VERSION as string | undefined,
    appUrl: clientIntegrations.appUrl.value,
    payangelsPublicKey: getPayangelsPublicKey() || undefined,
    integrations: clientIntegrations,
  };
}

export { clientIntegrations, getPayangelsPublicKey };
