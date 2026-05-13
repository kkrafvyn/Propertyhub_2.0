import { supabase } from "./supabase";
import { communicationService } from "./communication.service";
import { organizationService } from "./organization.service";

type ViewingStatus =
  | "requested"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "rescheduled"
  | "no_show";

function getCaseTypeFromListingType(listingType?: string) {
  switch (listingType) {
    case "sale":
      return "purchase_offer";
    case "lease":
      return "lease_application";
    default:
      return "rental_application";
  }
}

const VIEWING_SELECT = `
  *,
  listing:listings(
    *,
    property:properties(*)
  ),
  user:users(id, full_name, email, phone),
  assigned_member:users!property_viewings_assigned_to_fkey(id, full_name, email),
  deal_case:deal_cases(*)
`;

export const propertyViewingService = {
  async requestViewing(input: {
    userId: string;
    listingId: string;
    propertyId: string;
    organizationId: string;
    requestedDateTime: string;
    durationMinutes?: number;
    requesterNote?: string;
    contactPhone?: string;
    contactEmail?: string;
    listingType?: string;
  }) {
    const openStatuses = ["pending", "approved"];
    const { data: existingDealCase, error: existingDealCaseError } = await supabase
      .from("deal_cases")
      .select("id, assigned_to")
      .eq("listing_id", input.listingId)
      .eq("organization_id", input.organizationId)
      .eq("user_id", input.userId)
      .in("status", openStatuses)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingDealCaseError) throw existingDealCaseError;

    let dealCaseId = existingDealCase?.id || null;
    let assignedTo = existingDealCase?.assigned_to || null;

    if (!dealCaseId) {
      const { data: createdDealCase, error: createDealCaseError } = await supabase
        .from("deal_cases")
        .insert({
          listing_id: input.listingId,
          user_id: input.userId,
          organization_id: input.organizationId,
          case_type: getCaseTypeFromListingType(input.listingType),
          status: "pending",
          message: input.requesterNote || "Viewing request submitted from the property page.",
          pipeline_stage: "viewing_scheduled",
          priority: "medium",
          next_follow_up_at: input.requestedDateTime,
          last_stage_updated_at: new Date().toISOString(),
        })
        .select("id, assigned_to")
        .single();

      if (createDealCaseError) throw createDealCaseError;

      dealCaseId = createdDealCase.id;
      assignedTo = createdDealCase.assigned_to || null;
    } else {
      await supabase
        .from("deal_cases")
        .update({
          pipeline_stage: "viewing_scheduled",
          next_follow_up_at: input.requestedDateTime,
          last_stage_updated_at: new Date().toISOString(),
        })
        .eq("id", dealCaseId);
    }

    const { data, error } = await supabase
      .from("property_viewings")
      .insert({
        listing_id: input.listingId,
        property_id: input.propertyId,
        organization_id: input.organizationId,
        user_id: input.userId,
        deal_case_id: dealCaseId,
        assigned_to: assignedTo,
        requested_datetime: input.requestedDateTime,
        duration_minutes: input.durationMinutes || 45,
        requester_note: input.requesterNote || null,
        contact_phone: input.contactPhone || null,
        contact_email: input.contactEmail || null,
        status: "requested",
      })
      .select(VIEWING_SELECT)
      .single();

    if (error) throw error;

    try {
      const organization = await organizationService.getOrganizationById(input.organizationId);
      const recipients = Array.from(
        new Set([assignedTo, organization.owner_id].filter(Boolean))
      ) as string[];

      await Promise.all(
        recipients.map((recipientId) =>
          communicationService.createInAppNotification({
            userId: recipientId,
            actorUserId: input.userId,
            notificationType: "viewing_requested",
            subject: "New viewing request",
            content:
              data.listing?.property?.address
                ? `A viewing was requested for ${data.listing.property.address}.`
                : "A new property viewing was requested.",
            actionUrl: organization.slug ? `/workspace/${organization.slug}/leads` : "/workspace",
          })
        )
      );
    } catch (notificationError) {
      console.error("Failed to notify workspace about viewing request:", notificationError);
    }

    return data;
  },

  async getUserViewings(userId: string) {
    const { data, error } = await supabase
      .from("property_viewings")
      .select(
        `
        *,
        listing:listings(
          *,
          property:properties(*)
        ),
        organization:organizations(name, slug, verified),
        deal_case:deal_cases(id, status, pipeline_stage)
      `
      )
      .eq("user_id", userId)
      .order("requested_datetime", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getOrganizationViewings(organizationId: string) {
    const { data, error } = await supabase
      .from("property_viewings")
      .select(VIEWING_SELECT)
      .eq("organization_id", organizationId)
      .order("requested_datetime", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async updateViewingStatus(
    id: string,
    updates: {
      status?: ViewingStatus;
      confirmedDateTime?: string | null;
      assignedTo?: string | null;
      internalNote?: string | null;
      outcomeNote?: string | null;
    }
  ) {
    const payload = {
      status: updates.status,
      confirmed_datetime: updates.confirmedDateTime,
      assigned_to: updates.assignedTo,
      internal_note: updates.internalNote,
      outcome_note: updates.outcomeNote,
    };

    const { data, error } = await supabase
      .from("property_viewings")
      .update(payload)
      .eq("id", id)
      .select(VIEWING_SELECT)
      .single();

    if (error) throw error;

    if (data.deal_case_id) {
      const nextPipelineStage =
        updates.status === "completed"
          ? "qualified"
          : updates.status === "confirmed" || updates.status === "rescheduled"
            ? "viewing_scheduled"
            : updates.status === "cancelled" || updates.status === "no_show"
              ? "contacted"
              : null;

      if (nextPipelineStage) {
        await supabase
          .from("deal_cases")
          .update({
            pipeline_stage: nextPipelineStage,
            next_follow_up_at: updates.confirmedDateTime || null,
            last_stage_updated_at: new Date().toISOString(),
            last_contacted_at: new Date().toISOString(),
          })
          .eq("id", data.deal_case_id);
      }
    }

    try {
      const organization = await organizationService.getOrganizationById(data.organization_id);
      const actionUrl = organization.slug ? `/workspace/${organization.slug}/leads` : "/app/viewings";
      const prospectActionUrl = "/app/viewings";
      const notifications: Array<Promise<unknown>> = [];

      if (updates.assignedTo && updates.assignedTo !== data.user_id) {
        notifications.push(
          communicationService.createInAppNotification({
            userId: updates.assignedTo,
            actorUserId: data.user_id,
            notificationType: "viewing_assignment",
            subject: "Viewing assigned to you",
            content:
              data.listing?.property?.address
                ? `You're now assigned to a viewing for ${data.listing.property.address}.`
                : "A property viewing was assigned to you.",
            actionUrl,
          })
        );
      }

      if (updates.status === "confirmed" || updates.status === "rescheduled") {
        notifications.push(
          communicationService.createInAppNotification({
            userId: data.user_id,
            notificationType: updates.status === "confirmed" ? "viewing_confirmed" : "viewing_rescheduled",
            subject:
              updates.status === "confirmed" ? "Viewing confirmed" : "Viewing rescheduled",
            content:
              data.listing?.property?.address
                ? `Your viewing for ${data.listing.property.address} is set for ${new Intl.DateTimeFormat(
                    "en-GH",
                    {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }
                  ).format(new Date(data.confirmed_datetime || data.requested_datetime))}.`
                : "Your property viewing has been updated.",
            actionUrl: prospectActionUrl,
          })
        );
      }

      if (updates.status === "cancelled") {
        notifications.push(
          communicationService.createInAppNotification({
            userId: data.user_id,
            notificationType: "viewing_cancelled",
            subject: "Viewing cancelled",
            content:
              data.listing?.property?.address
                ? `Your viewing for ${data.listing.property.address} has been cancelled.`
                : "Your property viewing has been cancelled.",
            actionUrl: prospectActionUrl,
          })
        );
      }

      if (updates.status === "completed" && data.user_id !== updates.assignedTo) {
        notifications.push(
          communicationService.createInAppNotification({
            userId: data.user_id,
            notificationType: "viewing_completed",
            subject: "Viewing completed",
            content:
              data.listing?.property?.address
                ? `Thanks for attending the viewing for ${data.listing.property.address}.`
                : "Your property viewing has been marked complete.",
            actionUrl: prospectActionUrl,
          })
        );
      }

      await Promise.all(notifications);
    } catch (notificationError) {
      console.error("Failed to notify viewing participants:", notificationError);
    }

    return data;
  },
};
