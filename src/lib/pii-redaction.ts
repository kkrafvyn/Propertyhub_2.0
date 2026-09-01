const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE = /\b(?:\+?233|0)[\s-]?(?:\d[\s-]?){8,9}\d\b/g;
const GHANA_CARD = /\bGHA-\d{9}-\d\b/gi;
const ACCOUNT = /\b(?:acc(?:ount)?(?:\s*(?:no|number|#))?[:\s-]*)\d{8,16}\b/gi;
const MOMO = /\b(?:momo|mobile money)[:\s-]*\d{10}\b/gi;

export function redactPii(text: string): string {
  if (!text) return text;
  return text
    .replace(EMAIL, "[redacted-email]")
    .replace(GHANA_CARD, "[redacted-ghana-card]")
    .replace(MOMO, "[redacted-momo]")
    .replace(ACCOUNT, "[redacted-account]")
    .replace(PHONE, "[redacted-phone]");
}

export function containsPii(text: string): boolean {
  return redactPii(text) !== text;
}
