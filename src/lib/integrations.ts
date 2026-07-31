/**
 * Client-side integration status derived from Vite environment variables.
 * Server-only secrets (Paystack secret, Resend, Twilio, VAPID private) live in
 * Supabase Edge Function secrets — see root `.env.example` (server section).
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
      return clientIntegrations.supabase.configured;
    },
    get available() {
      return clientIntegrations.supabase.configured;
    },
    label: "Exchange rates",
    hint: "EXCHANGE_RATE_API_KEY in Supabase secrets (optional — free API fallback)",
  },

  openAi: {
    get configured() {
      return clientIntegrations.ai.configured;
    },
    get enhanced() {
      return clientIntegrations.ai.enhanced;
    },
    get available() {
      return clientIntegrations.ai.available;
    },
    label: "BaytMiftah AI",
    hint: "Works offline with guided help; set AI_PROVIDER + API key for smart mode",
  },

  ai: {
    get configured() {
      return clientIntegrations.supabase.configured;
    },
    get enhanced() {
      return (
        envFlag(import.meta.env.VITE_AI_ENABLED) ||
        envFlag(import.meta.env.VITE_OPENAI_ENABLED)
      );
    },
    get available() {
      return clientIntegrations.supabase.configured;
    },
    get provider(): "openai" | "qwen" | null {
      const value = firstEnv("VITE_AI_PROVIDER");
      if (value === "openai" || value === "qwen") return value;
      return null;
    },
    get label() {
      if (this.provider === "qwen") return "BaytMiftah AI (Qwen)";
      if (this.provider === "openai") return "BaytMiftah AI (OpenAI)";
      return "BaytMiftah AI";
    },
    get hint() {
      if (this.provider === "qwen") {
        return "Set AI_PROVIDER=qwen + QWEN_API_KEY in Supabase secrets for smart mode";
      }
      return "Set AI_PROVIDER=openai + OPENAI_API_KEY in Supabase secrets for smart mode";
    },
  },

  resend: {
    get configured() {
      return envFlag(import.meta.env.VITE_RESEND_CONFIGURED);
    },
    label: "Email (Resend)",
    hint: "RESEND_API_KEY + NOTIFICATION_EMAIL_FROM in Supabase secrets",
  },

  stripe: {
    get configured() {
      return !!firstEnv("VITE_STRIPE_PUBLIC_KEY");
    },
    label: "Stripe",
    hint: "VITE_STRIPE_PUBLIC_KEY + STRIPE_SECRET_KEY",
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
      configured: clientIntegrations.ai.enhanced,
      label: clientIntegrations.ai.label,
      hint: clientIntegrations.ai.hint,
    },
    {
      configured: clientIntegrations.resend.configured,
      label: clientIntegrations.resend.label,
      hint: clientIntegrations.resend.hint,
    },
    {
      configured: clientIntegrations.stripe.configured,
      label: clientIntegrations.stripe.label,
      hint: clientIntegrations.stripe.hint,
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
]);
