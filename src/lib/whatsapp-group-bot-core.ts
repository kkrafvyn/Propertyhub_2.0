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

export function shouldRespondInGroup(
  text: string,
  aliases: string[],
  respondWithoutMention = false
): boolean {
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
    if (alias.startsWith("@")) {
      cleaned = cleaned.replace(new RegExp(`${escaped}\\s*`, "gi"), " ").trim();
    }
  }
  cleaned = cleaned.replace(/@\S+\s*/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || text.trim();
}

export function isMenuResetCommand(text: string): boolean {
  const clean = text.trim().toLowerCase();
  return clean === "menu" || clean === "start" || clean === "hi" || clean === "hello";
}

/** Follow-up message after user chose maintenance option 3. */
export function shouldOpenMaintenanceFromSession(
  sessionState: string | null | undefined,
  commandText: string
): boolean {
  return (
    sessionState === "awaiting_maintenance" &&
    !isMenuResetCommand(commandText) &&
    commandText.trim().length > 0
  );
}

export function resolveNextBotSessionState(commandText: string, priorState?: string | null): string {
  if (shouldOpenMaintenanceFromSession(priorState, commandText)) {
    return "idle";
  }
  const clean = commandText.trim().toLowerCase();
  if (clean === "3") {
    return "awaiting_maintenance";
  }
  return "idle";
}

export const WHATSAPP_GROUP_RESIDENT_COMMANDS = [
  { example: "menu", summary: "Show concierge menu (rent, gate, maintenance, manager)" },
  { example: "/bm 3", summary: "Start maintenance report (then describe issue in next message)" },
  { example: "/bm kitchen sink leak", summary: "Open maintenance ticket in one message" },
  { example: "/bm 2", summary: "Visitor gate pass (phone must match tenant on file)" },
  { example: "/bm 5", summary: "Escalate to estate manager (in-app alert for owners/managers)" },
  { example: "@BaytMiftah 1", summary: "Rent balance and PayAngels payment link" },
] as const;

export function formatMinorAmount(minor: number, currency = "GHS"): string {
  return `${currency} ${(minor / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function resolvePaymentUrl(context?: GroupBotContext): string {
  if (context?.paymentUrl) return context.paymentUrl;
  const path = context?.paymentPath || "/app/payments";
  if (path.startsWith("http")) return path;
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : import.meta.env?.VITE_PUBLIC_APP_URL || "https://app.baytmiftah.com";
  return `${String(base).replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
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
        quickReplies: ["menu"],
      };
    }
    return {
      replyMessage: `No pending lease signature found for ${senderPhone.slice(-4)}. Ask your property manager to send the envelope, then try again.`,
      actionRequired: "NONE",
      quickReplies: ["menu", "5"],
    };
  }

  if (cleanText === "1" || cleanText.includes("rent") || cleanText.includes("balance") || cleanText.includes("pay")) {
    if (!context?.tenantUserId) {
      return {
        replyMessage: `We couldn't match ${senderPhone.slice(-4)} to a tenant account. Contact your property manager to update your phone number on file.`,
        actionRequired: "NONE",
        quickReplies: ["menu", "5"],
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
    if (context.nextDueDate) {
      lines.push(`• Next due: ${context.nextDueDate}`);
    }
    lines.push("", `Pay online: ${paymentUrl}`);
    return {
      replyMessage: lines.join("\n"),
      actionRequired: "TRIGGER_MOMO",
      quickReplies: ["menu", "2", "3"],
    };
  }

  if (cleanText === "2" || cleanText.includes("gate") || cleanText.includes("pass") || cleanText.includes("visitor")) {
    if (context?.lastGatePass) {
      const validUntil = new Date(context.lastGatePass.validUntil);
      const validLabel = Number.isNaN(validUntil.getTime())
        ? context.lastGatePass.validUntil
        : validUntil.toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" });
      return {
        replyMessage: [
          `🛡️ *Gate pass issued*`,
          `• Estate: ${context.lastGatePass.estateName}`,
          `• Unit: ${context.lastGatePass.unitLabel}`,
          `• Visitor: ${context.lastGatePass.visitorName}`,
          `• PIN: *${context.lastGatePass.pinCode}*`,
          `• Valid until: ${validLabel}`,
          ``,
          `Share the PIN with your visitor for kiosk entry.`,
        ].join("\n"),
        actionRequired: "DISPATCH_GATE_PIN",
        quickReplies: ["menu", "1"],
      };
    }
    if (!context?.tenantUserId) {
      return {
        replyMessage: `No tenant record found for this number. Ask your manager to link your phone before issuing gate passes.`,
        quickReplies: ["menu", "5"],
      };
    }
    return {
      replyMessage: `Unable to create a gate pass — no active unit occupancy found. Contact your estate manager.`,
      actionRequired: "NONE",
      quickReplies: ["menu", "5"],
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
        replyMessage: [
          `🛠️ *Maintenance ticket opened*`,
          `• Ticket: #${context.lastMaintenanceTicket.ticketId.slice(0, 8)}`,
          `• ${context.lastMaintenanceTicket.title}`,
          `• Status: ${context.lastMaintenanceTicket.status}`,
          ``,
          `A manager or artisan will follow up shortly. Reply with photos or more detail here.`,
        ].join("\n"),
        actionRequired: "ALERT_MANAGER",
        quickReplies: ["menu", "4"],
      };
    }
    if (cleanText === "3") {
      return {
        replyMessage: `🛠️ *Maintenance desk*\nDescribe the issue in your next message (e.g. "kitchen sink leak") or send a photo.`,
        actionRequired: "NONE",
        quickReplies: ["menu"],
      };
    }
    if (!context?.tenantUserId) {
      return {
        replyMessage: `We couldn't match your phone to a tenant account. Call your estate manager for urgent repairs.`,
        quickReplies: ["menu", "5"],
      };
    }
    return {
      replyMessage: `Describe the maintenance issue clearly so we can open a ticket (e.g. "AC not cooling in bedroom").`,
      actionRequired: "NONE",
    };
  }

  if (cleanText === "4" || cleanText.includes("ticket") || cleanText.includes("status")) {
    const tickets = context?.openTickets || [];
    if (tickets.length === 0) {
      return {
        replyMessage: context?.tenantUserId
          ? `📋 No open maintenance tickets for ${context.unitLabel || "your unit"}.`
          : `📋 No tenant record found for ${senderPhone.slice(-4)}.`,
        actionRequired: "NONE",
        quickReplies: ["menu", "3"],
      };
    }
    const lines = [`📋 *Open work orders*`];
    for (const ticket of tickets.slice(0, 5)) {
      lines.push(`• #${ticket.id.slice(0, 8)} — ${ticket.title} (*${ticket.status}*)`);
    }
    return {
      replyMessage: lines.join("\n"),
      actionRequired: "NONE",
      quickReplies: ["menu", "3"],
    };
  }

  if (cleanText === "5" || cleanText.includes("manager") || cleanText.includes("help") || cleanText.includes("agent")) {
    return {
      replyMessage: context?.managerEscalated
        ? `📞 *Estate manager notified.* Your request is in the queue — expect a reply within 15 minutes.`
        : `📞 Request forwarded to the estate manager on duty. For emergencies, use your estate hotline.`,
      actionRequired: "ALERT_MANAGER",
      quickReplies: ["menu"],
    };
  }

  if (cleanText === "link" || cleanText.includes("link group")) {
    return {
      replyMessage: `✅ This group is connected to BaytMiftah. Managers can rename/link it in Workspace → WhatsApp Hub → Group Bot.`,
      actionRequired: "NONE",
    };
  }

  return {
    replyMessage: isGroup
      ? `Type *menu* or tag *@BaytMiftah*. Commands: 1 Rent · 2 Gate · 3 Maintenance · 6 Sign lease · 5 Help`
      : `Type *menu* for options, *6* to sign your lease, or *5* for manager support.`,
    quickReplies: ["menu", "1", "2", "6"],
    actionRequired: "NONE",
  };
}

export function getWebhookUrlHint(supabaseUrl?: string): string {
  const base = (supabaseUrl || import.meta.env.VITE_SUPABASE_URL || "https://your-project.supabase.co").replace(/\/+$/, "");
  return `${base}/functions/v1/whatsapp-webhook`;
}

export function mapBotContextFromRpc(row: Record<string, unknown> | null | undefined): GroupBotContext {
  if (!row) return {};
  const appBase =
    typeof window !== "undefined"
      ? window.location.origin
      : import.meta.env?.VITE_PUBLIC_APP_URL || "https://app.baytmiftah.com";
  const paymentPath = row.paymentPath ? String(row.paymentPath) : "/app/payments";
  const paymentUrl = paymentPath.startsWith("http")
    ? paymentPath
    : `${String(appBase).replace(/\/+$/, "")}${paymentPath.startsWith("/") ? paymentPath : `/${paymentPath}`}`;

  return {
    tenantUserId: row.tenantUserId ? String(row.tenantUserId) : undefined,
    tenantName: row.tenantName ? String(row.tenantName) : undefined,
    unitLabel: row.unitLabel ? String(row.unitLabel) : undefined,
    estateName: row.estateName ? String(row.estateName) : undefined,
    currency: row.currency ? String(row.currency) : undefined,
    outstandingMinor: row.outstandingMinor != null ? Number(row.outstandingMinor) : undefined,
    rentMinor: row.rentMinor != null ? Number(row.rentMinor) : undefined,
    nextDueDate: row.nextDueDate ? String(row.nextDueDate) : null,
    paymentPath,
    paymentUrl,
    openTickets: Array.isArray(row.openTickets)
      ? row.openTickets.map((ticket) => ({
          id: String((ticket as Record<string, unknown>).id || ""),
          title: String((ticket as Record<string, unknown>).title || "Ticket"),
          status: String((ticket as Record<string, unknown>).status || "open"),
          priority: String((ticket as Record<string, unknown>).priority || "normal"),
        }))
      : [],
  };
}
