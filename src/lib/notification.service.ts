import { supabase } from "./supabase";
import { communicationService } from "./communication.service";
import { organizationService } from "./organization.service";
import { pushNotificationService } from "./push-notification.service";
import { WORKSPACE_ENTRY_PATH } from "./workspace";

export type NotificationCategory =
  | "Messages"
  | "Transactions"
  | "Bookings"
  | "Maintenance"
  | "Offers"
  | "System"
  | "Marketing"
  | "Security";

export interface NotifyUserInput {
  userId: string;
  notificationType: string;
  subject: string;
  content: string;
  category?: NotificationCategory;
  actionUrl?: string | null;
  actorUserId?: string;
  conversationId?: string;
  metadata?: Record<string, unknown> | null;
  respectPreferences?: boolean;
  showBrowserAlert?: boolean;
}

function categoryForType(notificationType: string): NotificationCategory {
  const type = notificationType.toLowerCase();

  if (type.includes("message")) return "Messages";
  if (type.includes("payment") || type.includes("transaction") || type.includes("rent")) {
    return "Transactions";
  }
  if (type.includes("booking") || type.includes("reservation") || type.includes("stay")) {
    return "Bookings";
  }
  if (type.includes("maintenance")) return "Maintenance";
  if (
    type.includes("offer") ||
    type.includes("deal") ||
    type.includes("counter") ||
    type.includes("closing")
  ) {
    return "Offers";
  }
  if (type.includes("security")) return "Security";
  if (type.includes("marketing")) return "Marketing";
  return "System";
}

function workspacePath(organizationSlug?: string | null, next?: string) {
  if (organizationSlug) {
    return next ? `/workspace/${organizationSlug}/${next}` : `/workspace/${organizationSlug}`;
  }
  return next ? `${WORKSPACE_ENTRY_PATH}?next=${next}` : WORKSPACE_ENTRY_PATH;
}

async function safeNotify(input: NotifyUserInput) {
  try {
    return await notificationService.notifyUser(input);
  } catch (error) {
    console.error("Failed to deliver notification:", error);
    return null;
  }
}

export const notificationService = {
  categoryForType,

  areExternalProvidersConfigured() {
    return {
      webPush: !!import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY,
    };
  },

  async notifyUser(input: NotifyUserInput) {
    const notification = await communicationService.createInAppNotification({
      userId: input.userId,
      actorUserId: input.actorUserId,
      conversationId: input.conversationId,
      notificationType: input.notificationType,
      subject: input.subject,
      content: input.content,
      actionUrl: input.actionUrl,
      metadata: input.metadata,
      notificationCategory: input.category || categoryForType(input.notificationType),
      respectPreferences: input.respectPreferences,
    });

    if (input.showBrowserAlert !== false && notification) {
      pushNotificationService.showLocalNotification({
        title: input.subject,
        body: input.content,
        url: input.actionUrl || undefined,
      });
    }

    return notification;
  },

  async notifyOrganizationTeam(input: {
    organizationId: string;
    organizationSlug?: string | null;
    excludeUserId?: string;
    roles?: Array<"owner" | "manager" | "agent" | "analyst">;
    notificationType: string;
    subject: string;
    content: string;
    category?: NotificationCategory;
    actionUrl?: string | null;
    actorUserId?: string;
    metadata?: Record<string, unknown> | null;
  }) {
    const members = await organizationService.getOrganizationMembers(input.organizationId);
    const targets = (members || []).filter((member) => {
      if (input.excludeUserId && member.user_id === input.excludeUserId) return false;
      if (input.roles && !input.roles.includes(member.role as "owner" | "manager" | "agent" | "analyst")) {
        return false;
      }
      return true;
    });

    await Promise.all(
      targets.map((member) =>
        safeNotify({
          userId: member.user_id,
          actorUserId: input.actorUserId,
          notificationType: input.notificationType,
          subject: input.subject,
          content: input.content,
          category: input.category,
          actionUrl:
            input.actionUrl ||
            workspacePath(input.organizationSlug, input.notificationType.includes("booking") ? "host" : "leads"),
          metadata: input.metadata,
        })
      )
    );
  },

  async notifyBookingEvent(
    bookingId: string,
    event:
      | "requested"
      | "confirmed"
      | "cancelled"
      | "checked_in"
      | "checked_out"
      | "review_received",
    options: { actorUserId?: string; extraContent?: string } = {}
  ) {
    const { data: booking, error } = await supabase
      .from("short_stay_bookings")
      .select(`
        *,
        listing:listings(property:properties(address, city)),
        organization:organizations(name, slug)
      `)
      .eq("id", bookingId)
      .single();

    if (error || !booking) return;

    const address =
      booking.listing?.property?.address ||
      booking.listing?.property?.city ||
      "your stay";
    const guestActionUrl = "/app/trips";
    const hostActionUrl = workspacePath(booking.organization?.slug, "host");

    const copy = {
      requested: {
        guestSubject: "Booking request sent",
        guestContent: `Your request for ${address} (${booking.check_in} to ${booking.check_out}) is pending host approval.`,
        hostSubject: "New booking request",
        hostContent: `A guest requested ${address} from ${booking.check_in} to ${booking.check_out}.`,
      },
      confirmed: {
        guestSubject: "Booking confirmed",
        guestContent: `Your stay at ${address} is confirmed for ${booking.check_in} to ${booking.check_out}.`,
        hostSubject: "Booking confirmed",
        hostContent: `Booking for ${address} (${booking.check_in} to ${booking.check_out}) is confirmed.`,
      },
      cancelled: {
        guestSubject: "Booking cancelled",
        guestContent: `Your booking for ${address} was cancelled.${options.extraContent ? ` ${options.extraContent}` : ""}`,
        hostSubject: "Booking cancelled",
        hostContent: `The booking for ${address} was cancelled.${options.extraContent ? ` ${options.extraContent}` : ""}`,
      },
      checked_in: {
        guestSubject: "Checked in",
        guestContent: `You're checked in at ${address}. Enjoy your stay.`,
        hostSubject: "Guest checked in",
        hostContent: `The guest checked in at ${address}.`,
      },
      checked_out: {
        guestSubject: "Checked out",
        guestContent: `Thanks for staying at ${address}. Leave a review when you have a moment.`,
        hostSubject: "Guest checked out",
        hostContent: `The guest checked out from ${address}.`,
      },
      review_received: {
        guestSubject: "New review on your stay",
        guestContent: options.extraContent || `You received a new review for ${address}.`,
        hostSubject: "New guest review",
        hostContent: options.extraContent || `A guest left a review for ${address}.`,
      },
    }[event];

    if (booking.guest_user_id) {
      await safeNotify({
        userId: booking.guest_user_id,
        actorUserId: options.actorUserId,
        notificationType: `booking_${event}`,
        subject: copy.guestSubject,
        content: copy.guestContent,
        category: "Bookings",
        actionUrl: guestActionUrl,
        metadata: { bookingId, event },
      });
    }

    if (event !== "review_received" || options.actorUserId !== booking.guest_user_id) {
      await notificationService.notifyOrganizationTeam({
        organizationId: booking.organization_id,
        organizationSlug: booking.organization?.slug,
        excludeUserId: options.actorUserId,
        notificationType: `booking_${event}`,
        subject: copy.hostSubject,
        content: copy.hostContent,
        category: "Bookings",
        actionUrl: hostActionUrl,
        actorUserId: options.actorUserId,
        metadata: { bookingId, event },
      });
    }
  },

  async notifyMaintenanceEvent(
    requestId: string,
    event: "created" | "status_updated",
    options: { actorUserId?: string; status?: string } = {}
  ) {
    const { data: request, error } = await supabase
      .from("maintenance_requests")
      .select(`
        *,
        lease:leases(
          listing:listings(property:properties(address, city))
        )
      `)
      .eq("id", requestId)
      .single();

    if (error || !request) return;

    const address =
      request.lease?.listing?.property?.address ||
      request.lease?.listing?.property?.city ||
      "your property";

    if (event === "created") {
      await notificationService.notifyOrganizationTeam({
        organizationId: request.organization_id,
        excludeUserId: options.actorUserId,
        notificationType: "maintenance_request_created",
        subject: "New maintenance request",
        content: `${request.title} was submitted for ${address}.`,
        category: "Maintenance",
        actionUrl: workspacePath(null, "maintenance"),
        actorUserId: options.actorUserId,
        metadata: { requestId, priority: request.priority },
      });
      return;
    }

    if (request.tenant_user_id) {
      const statusLabel = options.status || request.status;
      await safeNotify({
        userId: request.tenant_user_id,
        actorUserId: options.actorUserId,
        notificationType: "maintenance_status_updated",
        subject: "Maintenance update",
        content: `${request.title} is now ${statusLabel.replace(/_/g, " ")}.`,
        category: "Maintenance",
        actionUrl: "/app/maintenance",
        metadata: { requestId, status: statusLabel },
      });
    }
  },

  async notifyLeaseEvent(
    leaseId: string,
    event: "renewal_requested" | "renewal_responded" | "signed",
    options: { actorUserId?: string; renewalStatus?: string } = {}
  ) {
    const { data: lease, error } = await supabase
      .from("leases")
      .select(`
        *,
        listing:listings(property:properties(address, city)),
        organization:organizations(name, slug)
      `)
      .eq("id", leaseId)
      .single();

    if (error || !lease) return;

    const address =
      lease.listing?.property?.address ||
      lease.listing?.property?.city ||
      "your lease";

    if (event === "renewal_requested") {
      await notificationService.notifyOrganizationTeam({
        organizationId: lease.organization_id,
        organizationSlug: lease.organization?.slug,
        excludeUserId: options.actorUserId,
        notificationType: "lease_renewal_requested",
        subject: "Lease renewal requested",
        content: `A tenant requested renewal for ${address}.`,
        category: "Offers",
        actionUrl: workspacePath(lease.organization?.slug, "leases"),
        actorUserId: options.actorUserId,
        metadata: { leaseId },
      });
      return;
    }

    if (event === "renewal_responded" && lease.tenant_user_id) {
      const status = options.renewalStatus || lease.renewal_status || "updated";
      await safeNotify({
        userId: lease.tenant_user_id,
        actorUserId: options.actorUserId,
        notificationType: "lease_renewal_responded",
        subject: "Lease renewal update",
        content: `Your renewal request for ${address} was ${status}.`,
        category: "Offers",
        actionUrl: "/app/leases",
        metadata: { leaseId, renewalStatus: status },
      });
      return;
    }

    if (event === "signed" && lease.tenant_user_id) {
      await safeNotify({
        userId: lease.tenant_user_id,
        actorUserId: options.actorUserId,
        notificationType: "lease_signed",
        subject: "Lease signed",
        content: `Your lease for ${address} is marked as signed.`,
        category: "Offers",
        actionUrl: "/app/leases",
        metadata: { leaseId },
      });
    }
  },

  async notifyCounterOfferEvent(
    dealCaseId: string,
    event: "submitted" | "responded",
    options: {
      actorUserId?: string;
      amountMinor?: number;
      currency?: string;
      status?: string;
      offeredByRole?: string;
    } = {}
  ) {
    const { data: dealCase, error } = await supabase
      .from("deal_cases")
      .select(`
        id,
        user_id,
        organization_id,
        assigned_to,
        listing:listings(property:properties(address, city)),
        organization:organizations(slug)
      `)
      .eq("id", dealCaseId)
      .single();

    if (error || !dealCase) return;

    const address =
      dealCase.listing?.property?.address ||
      dealCase.listing?.property?.city ||
      "the property";
    const amountLabel =
      options.amountMinor != null
        ? `${(options.amountMinor / 100).toLocaleString()} ${options.currency || "GHS"}`
        : "a new amount";

    if (event === "submitted") {
      await notificationService.notifyOrganizationTeam({
        organizationId: dealCase.organization_id,
        organizationSlug: dealCase.organization?.slug,
        excludeUserId: options.actorUserId,
        notificationType: "counter_offer_submitted",
        subject: "New counter-offer",
        content: `${options.offeredByRole || "Buyer"} submitted ${amountLabel} for ${address}.`,
        category: "Offers",
        actionUrl: workspacePath(dealCase.organization?.slug, "leads"),
        actorUserId: options.actorUserId,
        metadata: { dealCaseId, amountMinor: options.amountMinor },
      });

      if (dealCase.assigned_to && dealCase.assigned_to !== options.actorUserId) {
        await safeNotify({
          userId: dealCase.assigned_to,
          actorUserId: options.actorUserId,
          notificationType: "counter_offer_submitted",
          subject: "Counter-offer needs review",
          content: `${amountLabel} was submitted for ${address}.`,
          category: "Offers",
          actionUrl: workspacePath(dealCase.organization?.slug, "leads"),
          metadata: { dealCaseId },
        });
      }
      return;
    }

    if (dealCase.user_id) {
      await safeNotify({
        userId: dealCase.user_id,
        actorUserId: options.actorUserId,
        notificationType: "counter_offer_responded",
        subject: "Counter-offer update",
        content: `Your counter-offer for ${address} was ${options.status || "updated"}.`,
        category: "Offers",
        actionUrl: "/app/applications",
        metadata: { dealCaseId, status: options.status },
      });
    }
  },

  async notifyRentDue(leaseId: string, dueDate: string, amountMinor: number, currency = "GHS") {
    const { data: lease, error } = await supabase
      .from("leases")
      .select("tenant_user_id, listing:listings(property:properties(address, city))")
      .eq("id", leaseId)
      .single();

    if (error || !lease?.tenant_user_id) return;

    const address =
      lease.listing?.property?.address ||
      lease.listing?.property?.city ||
      "your rental";

    await safeNotify({
      userId: lease.tenant_user_id,
      notificationType: "rent_due",
      subject: "Rent payment due",
      content: `Rent of ${(amountMinor / 100).toLocaleString()} ${currency} for ${address} is due on ${dueDate}.`,
      category: "Transactions",
      actionUrl: "/app/leases",
      metadata: { leaseId, dueDate, amountMinor },
    });
  },
};
