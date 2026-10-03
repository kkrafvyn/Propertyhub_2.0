import type { GroupBotResponse } from "./whatsapp-group-bot-core";

export type SensitiveBotAction = GroupBotResponse["actionRequired"];

export function isSensitiveBotResponse(
  action?: SensitiveBotAction,
): boolean {
  return (
    action === "LEASE_SIGN" ||
    action === "DISPATCH_GATE_PIN" ||
    action === "TRIGGER_MOMO"
  );
}

export function groupAcknowledgementForSensitiveCommand(): string {
  return "I've sent the private details directly to you. Check your direct chat with BaytMiftah.";
}

export function safeGroupMessageWhenDmFails(): string {
  return "I couldn't deliver that privately. Please message BaytMiftah directly (not in this group) for rent, gate passes, and lease signing.";
}

/** Persist safe summary — never store signing URLs, PINs, or payment links in bot_reply_text. */
export function redactBotReplyForStorage(
  replyMessage: string,
  action?: SensitiveBotAction,
): string {
  if (action === "LEASE_SIGN" && /https?:\/\//i.test(replyMessage)) {
    return "Lease signing link sent privately";
  }
  if (action === "DISPATCH_GATE_PIN" && /\bPIN\b/i.test(replyMessage)) {
    return "Visitor pass issued privately";
  }
  if (action === "TRIGGER_MOMO" && /https?:\/\//i.test(replyMessage)) {
    return "Payment details sent privately";
  }
  if (action === "TRIGGER_MOMO" && /balance/i.test(replyMessage)) {
    return "Rent balance sent privately";
  }
  return replyMessage.length > 500 ? `${replyMessage.slice(0, 497)}…` : replyMessage;
}
