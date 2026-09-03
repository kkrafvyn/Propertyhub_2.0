export type GroupBotResponse = {
  replyMessage: string;
  actionRequired?: "NONE" | "TRIGGER_MOMO" | "DISPATCH_GATE_PIN" | "ALERT_MANAGER" | "LEASE_SIGN";
  quickReplies?: string[];
};

export type GroupBotTicket = {
  id: string;
  title: string;
  status: string;
  priority?: string;
};

export type GroupBotContext = {
  pendingLeaseSignUrl?: string | null;
  pendingLeaseDocumentName?: string | null;
  jurisdictionLabel?: string | null;
  tenantUserId?: string | null;
  tenantName?: string | null;
  unitLabel?: string | null;
  estateName?: string | null;
  currency?: string | null;
  outstandingMinor?: number | null;
  rentMinor?: number | null;
  nextDueDate?: string | null;
  paymentPath?: string | null;
  paymentUrl?: string | null;
  openTickets?: GroupBotTicket[];
  lastGatePass?: {
    pinCode: string;
    validUntil: string;
    estateName: string;
    unitLabel: string;
    visitorName: string;
  } | null;
  lastMaintenanceTicket?: {
    ticketId: string;
    title: string;
    status: string;
  } | null;
  managerEscalated?: boolean;
};

export const DEFAULT_GROUP_BOT_ALIASES = ["baytmiftah", "bm", "/bm", "@baytmiftah"];

export function normalizeGroupBotAliases(aliases?: string[] | null): string[] {
  return (aliases?.length ? aliases : DEFAULT_GROUP_BOT_ALIASES).map((alias) => alias.trim().toLowerCase());
}

export function shouldRespondInGroup(text: string, aliases: string[], respondWithoutMention = false): boolean {
  if (respondWithoutMention) return true;
  const lower = text.trim().toLowerCase();
  if (lower.startsWith("/")) return true;
  return aliases.some((alias) => lower.includes(alias.toLowerCase()));
}

export function stripGroupBotPrefix(text: string, aliases: string[]): string {
  let cleaned = text.trim();
  for (const alias of aliases) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    cleaned = cleaned.replace(new RegExp(`^${escaped}\\s*`, "i"), "").trim();
  }
  return cleaned.replace(/^@\S+\s*/, "").trim() || text.trim();
}

export function formatMinorAmount(minor: number, currency = "GHS"): string {
  return `${currency} ${(minor / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function resolvePaymentUrl(context?: GroupBotContext): string {
  if (context?.paymentUrl) return context.paymentUrl;
  const path = context?.paymentPath || "/app/payments";
  if (path.startsWith("http")) return path;
  const base = (Deno.env.get("PUBLIC_APP_URL") || "https://app.baytmiftah.com").replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function processGroupBotMessage(
  senderPhone: string,
  messageText: string,
  isGroup = false,
  context?: GroupBotContext
): GroupBotResponse {
  const cleanText = messageText.trim().toLowerCase();

  if (cleanText === "hi" || cleanText === "hello" || cleanText === "menu" || cleanText === "start") {
    const prefix = isGroup ? "👋 *Group concierge*\n" : "";
    const tenantLine = context?.tenantName ? `\nSigned in as *${context.tenantName}*` : "";
    return {
      replyMessage: [
        `${prefix}🏢 *Welcome to BaytMiftah Estate Concierge!*${tenantLine}`,
        `Reply with a number:`,
        ``,
        `1️⃣ Rent balance & MoMo pay`,
        `2️⃣ Visitor gate pass`,
        `3️⃣ Report maintenance`,
        `4️⃣ Ticket status`,
        `5️⃣ Speak with estate manager`,
        `6️⃣ Sign pending lease`,
        isGroup ? `\n_Tag @BaytMiftah or type /bm before commands in this group._` : "",
      ].filter(Boolean).join("\n"),
      quickReplies: ["1", "2", "3", "6"],
      actionRequired: "NONE",
    };
  }

  if (
    cleanText === "6" ||
    cleanText === "sign" ||
    cleanText.includes("sign lease") ||
    cleanText.includes("esign") ||
    cleanText.includes("e-sign")
  ) {
    if (context?.pendingLeaseSignUrl) {
      return {
        replyMessage: [
          "📝 *LEASE READY FOR SIGNATURE*",
          "━━━━━━━━━━━━━━━━━━━━━━",
          context.pendingLeaseDocumentName
            ? `Your agreement *${context.pendingLeaseDocumentName}* is ready.`
            : "Your lease agreement is ready.",
          context.jurisdictionLabel ? `📍 ${context.jurisdictionLabel}` : "",
          "",
          "✍️ Sign securely:",
          context.pendingLeaseSignUrl,
        ]
          .filter(Boolean)
          .join("\n"),
        actionRequired: "LEASE_SIGN",
      };
    }
    return {
      replyMessage: `No pending lease signature found for ${senderPhone.slice(-4)}. Ask your property manager to send the envelope.`,
      actionRequired: "NONE",
    };
  }

  if (cleanText === "1" || cleanText.includes("rent") || cleanText.includes("balance") || cleanText.includes("pay")) {
    if (!context?.tenantUserId) {
      return {
        replyMessage: `We couldn't match ${senderPhone.slice(-4)} to a tenant account. Contact your property manager to update your phone number on file.`,
        actionRequired: "NONE",
      };
    }
    const currency = context.currency || "GHS";
    const outstanding = context.outstandingMinor ?? 0;
    const paymentUrl = resolvePaymentUrl(context);
    const lines = [
      `💳 *Rent status*`,
      `• ${context.estateName || "Property"} — ${context.unitLabel || "Unit"}`,
      `• Balance: *${formatMinorAmount(outstanding, currency)}*${outstanding <= 0 ? " (Paid in full)" : ""}`,
    ];
    if (context.rentMinor && context.rentMinor > 0) {
      lines.push(`• Monthly rent: ${formatMinorAmount(context.rentMinor, currency)}`);
    }
    if (context.nextDueDate) lines.push(`• Next due: ${context.nextDueDate}`);
    lines.push("", `Pay online: ${paymentUrl}`);
    return { replyMessage: lines.join("\n"), actionRequired: "TRIGGER_MOMO" };
  }

  if (cleanText === "2" || cleanText.includes("gate") || cleanText.includes("pass") || cleanText.includes("visitor")) {
    if (context?.lastGatePass) {
      return {
        replyMessage: [
          `🛡️ *Gate pass issued*`,
          `• PIN: *${context.lastGatePass.pinCode}*`,
          `• Visitor: ${context.lastGatePass.visitorName}`,
          `• ${context.lastGatePass.estateName} — ${context.lastGatePass.unitLabel}`,
          `• Valid until: ${context.lastGatePass.validUntil}`,
        ].join("\n"),
        actionRequired: "DISPATCH_GATE_PIN",
      };
    }
    return {
      replyMessage: context?.tenantUserId
        ? `Unable to create a gate pass — no active unit occupancy found.`
        : `No tenant record found for this number.`,
      actionRequired: "NONE",
    };
  }

  if (
    cleanText === "3" ||
    cleanText.includes("maintenance") ||
    cleanText.includes("leak") ||
    cleanText.includes("plumb") ||
    cleanText.includes("repair")
  ) {
    if (context?.lastMaintenanceTicket) {
      return {
        replyMessage: `🛠️ Ticket #${context.lastMaintenanceTicket.ticketId.slice(0, 8)} opened: ${context.lastMaintenanceTicket.title}`,
        actionRequired: "ALERT_MANAGER",
      };
    }
    if (cleanText === "3") {
      return {
        replyMessage: `🛠️ Describe the issue in your next message (e.g. "kitchen sink leak").`,
        actionRequired: "NONE",
      };
    }
    return { replyMessage: `Describe the maintenance issue clearly to open a ticket.`, actionRequired: "NONE" };
  }

  if (cleanText === "4" || cleanText.includes("ticket") || cleanText.includes("status")) {
    const tickets = context?.openTickets || [];
    if (!tickets.length) {
      return { replyMessage: `📋 No open tickets for ${senderPhone.slice(-4)}.` };
    }
    return {
      replyMessage: tickets
        .slice(0, 5)
        .map((ticket) => `• #${ticket.id.slice(0, 8)} — ${ticket.title} (${ticket.status})`)
        .join("\n"),
    };
  }

  if (cleanText === "5" || cleanText.includes("manager") || cleanText.includes("help")) {
    return {
      replyMessage: context?.managerEscalated
        ? `📞 Estate manager notified — expect a reply within 15 minutes.`
        : `📞 Request forwarded to the estate manager.`,
      actionRequired: "ALERT_MANAGER",
    };
  }

  if (cleanText === "link" || cleanText.includes("link group")) {
    return { replyMessage: `✅ Group connected to BaytMiftah.` };
  }

  return {
    replyMessage: isGroup
      ? `Type *menu* or tag *@BaytMiftah*. Commands: 1 Rent · 2 Gate · 3 Maintenance · 6 Sign · 5 Help`
      : `Type *menu*, *6* to sign lease, or *5* for help.`,
    quickReplies: ["menu", "6"],
  };
}
