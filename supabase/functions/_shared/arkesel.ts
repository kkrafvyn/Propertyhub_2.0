/**
 * Arkesel SMS Gateway — Shared helper for transactional SMS and OTP.
 *
 * API: https://sms.arkesel.com/api/v2/sms/send
 * OTP: https://sms.arkesel.com/api/otp/generate
 *
 * Required env vars:
 *   ARKESEL_API_KEY    — API key from Arkesel dashboard
 *   ARKESEL_SENDER_ID  — Approved sender ID e.g. "BAYTMIFTAH"
 */

const ARKESEL_BASE = "https://sms.arkesel.com";
const SENDER_ID    = Deno.env.get("ARKESEL_SENDER_ID") ?? "BAYTMIFTAH";

// ─────────────────────────────────────────────────────────────
// Normalise Ghana phone number
// Input:  0241234567 | +233241234567 | 233241234567
// Output: +233241234567  (Arkesel requires + prefix)
// ─────────────────────────────────────────────────────────────
export function normaliseGhanaPhoneForSms(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("233")) return `+${digits}`;
  if (digits.startsWith("0"))   return `+233${digits.slice(1)}`;
  return `+${digits}`;
}

// ─────────────────────────────────────────────────────────────
// Normalise a list of recipients
// ─────────────────────────────────────────────────────────────
export function normaliseRecipients(phones: string | string[]): string {
  const list = Array.isArray(phones) ? phones : [phones];
  return list.map(normaliseGhanaPhoneForSms).join(",");
}

// ─────────────────────────────────────────────────────────────
// Send Transactional SMS
// ─────────────────────────────────────────────────────────────
export interface SendSmsParams {
  to:      string | string[];  // Single or bulk Ghana numbers
  message: string;
  type?:   "transactional" | "promotional"; // defaults to transactional
}

export interface SendSmsResult {
  sent:      boolean;
  reference: string;
  status:    string;
  recipients: number;
  simulated?: boolean;
}

export async function sendSms(params: SendSmsParams): Promise<SendSmsResult> {
  const apiKey = Deno.env.get("ARKESEL_API_KEY");
  const recipients = normaliseRecipients(params.to);
  const recipientList = recipients.split(",");

  if (!apiKey) {
    return {
      sent: true,
      reference: `sms_sim_${crypto.randomUUID().slice(0, 8)}`,
      status: "simulated",
      recipients: recipientList.length,
      simulated: true,
    };
  }

  const payload = {
    sender:    SENDER_ID,
    message:   params.message,
    recipients: recipientList,
  };

  const response = await fetch(`${ARKESEL_BASE}/api/v2/sms/send`, {
    method:  "POST",
    headers: {
      "api-key":      apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json() as {
    status:  string;
    code?:   string;
    data?:   { reference?: string }[];
    message?: string;
  };

  if (!response.ok || data.status === "error") {
    throw new Error(`Arkesel SMS failed: ${data.message ?? JSON.stringify(data)}`);
  }

  return {
    sent:       true,
    reference:  data.data?.[0]?.reference ?? crypto.randomUUID(),
    status:     data.status,
    recipients: recipientList.length,
  };
}

// ─────────────────────────────────────────────────────────────
// OTP — Generate and send a one-time PIN
// ─────────────────────────────────────────────────────────────
export interface SendOtpParams {
  to:          string;   // Ghana phone number
  length?:     number;   // OTP length (default 6)
  medium?:     "sms";    // Arkesel supports sms
  type?:       "numeric" | "alphanumeric";
  expiry?:     number;   // Minutes until expiry (default 5)
  placeholder?: string;  // Custom message placeholder — use {otp}
}

export interface SendOtpResult {
  sent:      boolean;
  reference: string;
}

export async function sendOtp(params: SendOtpParams): Promise<SendOtpResult> {
  const apiKey = Deno.env.get("ARKESEL_API_KEY");
  if (!apiKey) {
    return {
      sent: true,
      reference: `otp_sim_${crypto.randomUUID().slice(0, 8)}`,
    };
  }

  const payload = {
    expiry:      params.expiry    ?? 5,
    length:      params.length    ?? 6,
    medium:      params.medium    ?? "sms",
    number:      normaliseGhanaPhoneForSms(params.to),
    sender_id:   SENDER_ID,
    type:        params.type      ?? "numeric",
    message:     params.placeholder ?? `Your BaytMiftah gate PIN is %otp_code%. Valid for ${params.expiry ?? 5} minutes.`,
  };

  const response = await fetch(`${ARKESEL_BASE}/api/otp/generate`, {
    method:  "POST",
    headers: {
      "api-key":      apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json() as {
    status:  string;
    code?:   string;
    message?: string;
  };

  if (!response.ok || data.status !== "success") {
    throw new Error(`Arkesel OTP send failed: ${data.message ?? JSON.stringify(data)}`);
  }

  return {
    sent:      true,
    reference: crypto.randomUUID(),
  };
}

// ─────────────────────────────────────────────────────────────
// OTP — Verify a code
// ─────────────────────────────────────────────────────────────
export interface VerifyOtpParams {
  to:   string;
  code: string;
}

export interface VerifyOtpResult {
  valid:   boolean;
  message: string;
}

export async function verifyOtp(params: VerifyOtpParams): Promise<VerifyOtpResult> {
  const apiKey = Deno.env.get("ARKESEL_API_KEY");
  if (!apiKey) {
    const code = String(params.code || "").trim();
    return {
      valid: /^\d{4,8}$/.test(code),
      message: code ? "Simulated OTP accepted" : "OTP code required",
    };
  }

  const payload = {
    number:  normaliseGhanaPhoneForSms(params.to),
    code:    params.code,
  };

  const response = await fetch(`${ARKESEL_BASE}/api/otp/verify`, {
    method:  "POST",
    headers: {
      "api-key":      apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json() as { status: string; message?: string };

  return {
    valid:   data.status === "success",
    message: data.message ?? data.status,
  };
}
