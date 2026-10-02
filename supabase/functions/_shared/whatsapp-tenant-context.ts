type AdminClient = ReturnType<typeof import("./supabase.ts").createAdminClient>;

export type WhatsAppBotTicket = {
  id: string;
  title: string;
  status: string;
  priority: string;
};

export type WhatsAppBotContextData = {
  tenantUserId?: string;
  tenantName?: string;
  unitLabel?: string;
  estateName?: string;
  estateId?: string;
  leaseId?: string;
  listingId?: string;
  currency?: string;
  outstandingMinor?: number;
  rentMinor?: number;
  nextDueDate?: string | null;
  paymentPath?: string;
  openTickets?: WhatsAppBotTicket[];
  pendingLeaseSignUrl?: string | null;
  pendingLeaseDocumentName?: string | null;
  jurisdictionLabel?: string | null;
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
};

function parseBotContextRow(row: Record<string, unknown> | null | undefined): WhatsAppBotContextData {
  if (!row) return {};
  return {
    tenantUserId: row.tenantUserId ? String(row.tenantUserId) : undefined,
    tenantName: row.tenantName ? String(row.tenantName) : undefined,
    unitLabel: row.unitLabel ? String(row.unitLabel) : undefined,
    estateName: row.estateName ? String(row.estateName) : undefined,
    estateId: row.estateId ? String(row.estateId) : undefined,
    leaseId: row.leaseId ? String(row.leaseId) : undefined,
    listingId: row.listingId ? String(row.listingId) : undefined,
    currency: row.currency ? String(row.currency) : undefined,
    outstandingMinor: row.outstandingMinor != null ? Number(row.outstandingMinor) : undefined,
    rentMinor: row.rentMinor != null ? Number(row.rentMinor) : undefined,
    nextDueDate: row.nextDueDate ? String(row.nextDueDate) : null,
    paymentPath: row.paymentPath ? String(row.paymentPath) : undefined,
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

export async function loadWhatsAppBotContext(
  admin: AdminClient,
  organizationId: string,
  phone: string,
  leaseSign?: {
    signingUrl: string;
    documentName: string;
    jurisdictionLabel: string | null;
  } | null
): Promise<WhatsAppBotContextData> {
  const { data, error } = await admin.rpc("get_whatsapp_bot_context", {
    p_organization_id: organizationId,
    p_phone: phone,
  });
  if (error) {
    console.error("get_whatsapp_bot_context:", error);
  }

  const context = parseBotContextRow(data as Record<string, unknown> | null);
  if (leaseSign) {
    context.pendingLeaseSignUrl = leaseSign.signingUrl;
    context.pendingLeaseDocumentName = leaseSign.documentName;
    context.jurisdictionLabel = leaseSign.jurisdictionLabel;
  }
  return context;
}

function isGateCommand(text: string) {
  const clean = text.trim().toLowerCase();
  return clean === "2" || clean.includes("gate") || clean.includes("visitor") || clean.includes("pass");
}

function isMaintenanceCreateCommand(text: string) {
  const clean = text.trim().toLowerCase();
  if (clean === "3") return false;
  return (
    clean.includes("maintenance") ||
    clean.includes("leak") ||
    clean.includes("plumb") ||
    clean.includes("repair") ||
    clean.includes("defect") ||
    clean.includes("issue")
  );
}

function isManagerCommand(text: string) {
  const clean = text.trim().toLowerCase();
  return clean === "5" || clean.includes("manager") || clean.includes("help") || clean.includes("agent");
}

export async function applyWhatsAppBotMutations(
  admin: AdminClient,
  organizationId: string,
  phone: string,
  commandText: string,
  context: WhatsAppBotContextData,
  options?: { forceMaintenanceDescription?: boolean }
): Promise<WhatsAppBotContextData> {
  const next = { ...context };

  if (isGateCommand(commandText)) {
    const visitorName = commandText.match(/visitor[:\s]+(.+)/i)?.[1]?.trim() || "Guest";
    const { data, error } = await admin.rpc("bot_create_whatsapp_visitor_pass", {
      p_organization_id: organizationId,
      p_phone: phone,
      p_visitor_name: visitorName,
    });
    if (!error && data && (data as Record<string, unknown>).success) {
      const row = data as Record<string, unknown>;
      next.lastGatePass = {
        pinCode: String(row.pinCode || ""),
        validUntil: String(row.validUntil || ""),
        estateName: String(row.estateName || context.estateName || "Estate"),
        unitLabel: String(row.unitLabel || context.unitLabel || "Unit"),
        visitorName: String(row.visitorName || visitorName),
      };
    }
  }

  if (options?.forceMaintenanceDescription || isMaintenanceCreateCommand(commandText)) {
    const description =
      commandText.replace(/^(3|maintenance|report)\s*/i, "").trim() || commandText.trim();
    const { data, error } = await admin.rpc("bot_create_whatsapp_maintenance", {
      p_organization_id: organizationId,
      p_phone: phone,
      p_description: description,
    });
    const row = data as Record<string, unknown> | null;
    const maintenanceOk = !error && row?.success;

    if (maintenanceOk) {
      next.lastMaintenanceTicket = {
        ticketId: String(row.ticketId || ""),
        title: String(row.title || "Maintenance request"),
        status: String(row.status || "open"),
      };
      next.openTickets = [
        {
          id: String(row.ticketId || ""),
          title: String(row.title || "Maintenance request"),
          status: String(row.status || "open"),
          priority: "normal",
        },
        ...(context.openTickets || []),
      ];
    } else if (options?.forceMaintenanceDescription || isMaintenanceCreateCommand(commandText)) {
      const escalateMessage = `WhatsApp group maintenance: ${description} (from ${phone.slice(-4)})`;
      const { data: escData } = await admin.rpc("bot_escalate_whatsapp_to_manager", {
        p_organization_id: organizationId,
        p_phone: phone,
        p_message: escalateMessage,
      });
      if (escData && (escData as Record<string, unknown>).success) {
        next.managerEscalated = true;
        next.lastMaintenanceTicket = {
          ticketId: "manager-escalation",
          title: description.slice(0, 80),
          status: "escalated",
        };
      }
    }
  }

  if (isManagerCommand(commandText)) {
    const { data } = await admin.rpc("bot_escalate_whatsapp_to_manager", {
      p_organization_id: organizationId,
      p_phone: phone,
      p_message: commandText,
    });
    if (data && (data as Record<string, unknown>).success) {
      next.managerEscalated = true;
    }
  }

  return next;
}
