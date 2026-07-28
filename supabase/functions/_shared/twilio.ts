export function getTwilioSmsFrom() {
  return (
    Deno.env.get("TWILIO_SMS_FROM") ||
    Deno.env.get("TWILIO_PHONE_NUMBER") ||
    ""
  );
}

export function getTwilioWhatsAppFrom() {
  const configured = Deno.env.get("TWILIO_WHATSAPP_FROM");
  if (configured) return configured;

  const phone = Deno.env.get("TWILIO_PHONE_NUMBER");
  if (!phone) return "";

  return phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
}
