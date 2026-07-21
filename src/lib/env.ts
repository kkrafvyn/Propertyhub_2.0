const requiredEnv = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"] as const;

export function validateClientEnv() {
  const missing = requiredEnv.filter((key) => !import.meta.env[key]);
  if (missing.length > 0 && import.meta.env.PROD) {
    console.error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  return missing;
}

export function getClientEnv() {
  return {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    appVersion: import.meta.env.VITE_APP_VERSION as string | undefined,
  };
}
