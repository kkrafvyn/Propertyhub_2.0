/**
 * Client-side integration status derived from Vite environment variables.
 * Server-only secrets (Paystack secret, Resend, Twilio, VAPID private) live in
 * Supabase Edge Function secrets — see supabase/.env.payments.example.
 */

function envFlag(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function firstEnv(...keys: string[]) {
  for (const key of keys) {
    const value = import.meta.env[key as keyof ImportMetaEnv] as string | undefined;
    if (envFlag(value)) return value!.trim();
  }
  return "";
}

export type IntegrationStatus = {
  configured: boolean;
  label: string;
  hint?: string;
};

export const clientIntegrations = {
  supabase: {
    get configured() {
      return envFlag(import.meta.env.VITE_SUPABASE_URL) && !!firstEnv(
        "VITE_SUPABASE_ANON_KEY",
        "VITE_SUPABASE_PUBLISHABLE_KEY"
      );
    },
    label: "Supabase",
    hint: "VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY",
  },

  paystack: {
    get clientConfigured() {
      return !!firstEnv("VITE_PAYSTACK_PUBLIC_KEY", "Live_Public_Key");
    },
    get checkoutReady() {
      return (
        clientIntegrations.supabase.configured && clientIntegrations.paystack.clientConfigured
      );
    },
    label: "Paystack",
    hint: "PAYSTACK_SECRET_KEY + PAYSTACK_WEBHOOK_SECRET in Supabase secrets",
  },

  webPush: {
    get configured() {
      return envFlag(import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY);
    },
    label: "Web Push",
    hint: "VITE_WEB_PUSH_PUBLIC_KEY + WEB_PUSH_* secrets on Supabase",
  },

  exchangeRates: {
    get configured() {
      return envFlag(import.meta.env.VITE_EXCHANGE_RATE_API_KEY);
    },
    get available() {
      return true;
    },
    label: "Exchange rates",
    hint: "VITE_EXCHANGE_RATE_API_KEY (optional — free API fallback)",
  },

  openAi: {
    get configured() {
      return clientIntegrations.supabase.configured;
    },
    get enhanced() {
      return envFlag(import.meta.env.VITE_OPENAI_ENABLED);
    },
    label: "AI search",
    hint: "Local parser by default; set OPENAI_API_KEY in Supabase for GPT parsing",
  },

  stripe: {
    get configured() {
      return !!firstEnv("VITE_STRIPE_PUBLIC_KEY");
    },
    label: "Stripe",
    hint: "VITE_STRIPE_PUBLIC_KEY + STRIPE_SECRET_KEY",
  },

  flutterwave: {
    get configured() {
      return !!firstEnv("VITE_FLUTTERWAVE_PUBLIC_KEY");
    },
    label: "Flutterwave",
    hint: "VITE_FLUTTERWAVE_PUBLIC_KEY + FLUTTERWAVE_SECRET_KEY",
  },

  blockchain: {
    get configured() {
      return !!firstEnv(
        "VITE_PROPERTY_TOKEN_ADDRESS",
        "VITE_PROPERTY_ESCROW_ADDRESS",
        "VITE_VERIFICATION_REGISTRY_ADDRESS"
      );
    },
    label: "Blockchain",
    hint: "Deploy contracts + set VITE_PROPERTY_*_ADDRESS",
  },

  appUrl: {
    get value() {
      return (
        firstEnv("VITE_PUBLIC_APP_URL", "VITE_SITE_URL") ||
        (typeof window !== "undefined" ? window.location.origin : "")
      );
    },
    label: "App URL",
    hint: "VITE_PUBLIC_APP_URL",
  },
} as const;

export function getPaystackPublicKey() {
  return firstEnv("VITE_PAYSTACK_PUBLIC_KEY", "Live_Public_Key");
}

export function getIntegrationSummary(): IntegrationStatus[] {
  return [
    {
      configured: clientIntegrations.supabase.configured,
      label: clientIntegrations.supabase.label,
      hint: clientIntegrations.supabase.hint,
    },
    {
      configured: clientIntegrations.paystack.checkoutReady,
      label: clientIntegrations.paystack.label,
      hint: clientIntegrations.paystack.hint,
    },
    {
      configured: clientIntegrations.webPush.configured,
      label: clientIntegrations.webPush.label,
      hint: clientIntegrations.webPush.hint,
    },
    {
      configured: clientIntegrations.exchangeRates.configured,
      label: clientIntegrations.exchangeRates.label,
      hint: clientIntegrations.exchangeRates.hint,
    },
    {
      configured: clientIntegrations.openAi.configured,
      label: clientIntegrations.openAi.label,
      hint: clientIntegrations.openAi.hint,
    },
    {
      configured: clientIntegrations.blockchain.configured,
      label: clientIntegrations.blockchain.label,
      hint: clientIntegrations.blockchain.hint,
    },
  ];
}

/** Providers routed through the live Paystack edge-function checkout. */
export const PAYSTACK_CHECKOUT_PROVIDER_IDS = new Set([
  "paystack",
  "mtn_momo",
  "airtel_money",
  "mpesa",
  "flutterwave",
]);
