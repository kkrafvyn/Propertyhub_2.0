import { clientIntegrations, getPaystackPublicKey } from "./integrations";

function getSupabaseAnonKey() {
  return (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );
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
  return missing;
}

export function getClientEnv() {
  return {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
    supabaseAnonKey: getSupabaseAnonKey() as string,
    appVersion: import.meta.env.VITE_APP_VERSION as string | undefined,
    appUrl: clientIntegrations.appUrl.value,
    paystackPublicKey: getPaystackPublicKey() || undefined,
    integrations: clientIntegrations,
  };
}

export { clientIntegrations, getPaystackPublicKey };
