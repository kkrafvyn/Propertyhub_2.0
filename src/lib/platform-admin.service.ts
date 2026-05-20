import { supabase } from "./supabase";
import type { OrganizationSubscription, SubscriptionTier } from "./subscription.service";
import { attachEscrowMilestones } from "./escrow-milestones";

export interface PlatformAdmin {
  user_id: string;
  role: "admin" | "support" | "viewer" | string;
  status: "active" | "disabled" | string;
}

export interface AdminOrganizationRow {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  business_address?: string | null;
  license_number?: string | null;
  ghana_business_registration_number?: string | null;
  property_types_handled?: string[] | null;
  owner_id: string;
  verified: boolean | null;
  suspended: boolean | null;
  verification_status: string;
  verification_submitted_at: string | null;
  created_at: string | null;
  subscription: OrganizationSubscription | null;
  tier: SubscriptionTier | null;
}

export interface AdminListingRow {
  id: string;
  organization_id: string;
  property_id: string;
  listing_type: string;
  price: number;
  currency: string | null;
  status: string | null;
  visibility: string | null;
  verification_status: string;
  verification_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  published_at: string | null;
  property?: {
    address?: string | null;
    city?: string | null;
    region?: string | null;
    category?: string | null;
  } | null;
  organization?: {
    name?: string | null;
    slug?: string | null;
    verified?: boolean | null;
    suspended?: boolean | null;
  } | null;
}

export interface AdminUserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  verified: boolean | null;
  banned: boolean | null;
  preferred_contact_channel?: string | null;
  phone_verified_at?: string | null;
  created_at: string | null;
  updated_at: string | null;
  organizationCount: number;
  roles: string[];
  isPlatformAdmin: boolean;
}

export interface AdminEscrowRow {
  id: string;
  transaction_id: string;
  listing_id: string;
  property_id: string;
  organization_id: string;
  payer_user_id: string;
  amount_minor: number;
  currency: string;
  status: string;
  dispute_reason: string | null;
  disputed_at: string | null;
  cancellation_deadline_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  organization?: {
    name?: string | null;
    slug?: string | null;
    paystack_transfer_recipient_code?: string | null;
  } | null;
  payer?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
  listing?: {
    property?: {
      address?: string | null;
      city?: string | null;
      region?: string | null;
    } | null;
  } | null;
  documents?: any[];
  events?: any[];
  condition_reports?: any[];
  milestones?: any[];
}

export interface PlatformAdminRosterRow extends PlatformAdmin {
  user?: {
    email?: string | null;
    full_name?: string | null;
  } | null;
}

const db = supabase as any;

export const platformAdminService = {
  async getCurrentAdmin() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) return null;

    const { data, error } = await db
      .from("platform_admins")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (error) throw error;
    return data as PlatformAdmin | null;
  },

  async getOrganizationQueue() {
    const [organizationsResult, subscriptionsResult, tiersResult] = await Promise.all([
      db
        .from("organizations")
        .select("*")
        .order("verification_submitted_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),
      db.from("organization_subscriptions").select("*"),
      db.from("subscription_tiers").select("*"),
    ]);

    if (organizationsResult.error) throw organizationsResult.error;
    if (subscriptionsResult.error) throw subscriptionsResult.error;
    if (tiersResult.error) throw tiersResult.error;

    const subscriptionsByOrg = new Map<string, OrganizationSubscription>(
      (subscriptionsResult.data || []).map((subscription: OrganizationSubscription) => [
        subscription.organization_id,
        subscription,
      ])
    );
    const tiersById = new Map<string, SubscriptionTier>(
      (tiersResult.data || []).map((tier: SubscriptionTier) => [tier.id, tier])
    );

    const organizations = (organizationsResult.data || []).map((organization: any) => {
      const subscription = subscriptionsByOrg.get(organization.id) || null;

      return {
        ...organization,
        subscription,
        tier: subscription ? tiersById.get(subscription.tier_id) || null : null,
      } as AdminOrganizationRow;
    });

    const metrics = {
      totalOrganizations: organizations.length,
      pendingVerification: organizations.filter((org) =>
        ["submitted", "in_review", "needs_changes", "unverified"].includes(
          org.verification_status
        )
      ).length,
      suspendedOrganizations: organizations.filter((org) => Boolean(org.suspended)).length,
      activeSubscriptions: organizations.filter(
        (org) => org.subscription?.status === "active"
      ).length,
      monthlyRecurringRevenueMinor: organizations.reduce((sum, org) => {
        if (org.subscription?.status !== "active") return sum;
        return sum + (org.tier?.price_minor || 0);
      }, 0),
    };

    return { organizations, metrics };
  },

  async getListingQueue() {
    const { data, error } = await db
      .from("listings")
      .select(
        `
        *,
        property:properties(address, city, region, category),
        organization:organizations(name, slug, verified, suspended)
      `
      )
      .in("status", ["pending_review", "listed", "suspended"])
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(80);

    if (error) throw error;

    const listings = (data || []) as AdminListingRow[];
    const metrics = {
      totalListings: listings.length,
      pendingReview: listings.filter((listing) => listing.status === "pending_review").length,
      listed: listings.filter((listing) => listing.status === "listed").length,
      suspended: listings.filter((listing) => listing.status === "suspended").length,
    };

    return { listings, metrics };
  },

  async getEscrowQueue() {
    const { data, error } = await db
      .from("property_escrows")
      .select(
        `
        *,
        organization:organizations(name, slug, paystack_transfer_recipient_code),
        payer:users(full_name, email),
        listing:listings(property:properties(address, city, region)),
        documents:property_escrow_documents(*),
        events:property_escrow_events(*),
        condition_reports:property_condition_reports(*)
      `
      )
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const escrows = (await attachEscrowMilestones((data || []) as AdminEscrowRow[])) as AdminEscrowRow[];
    const metrics = {
      totalEscrows: escrows.length,
      held: escrows.filter((escrow) =>
        ["held", "docs_pending", "docs_approved"].includes(escrow.status)
      ).length,
      disputed: escrows.filter((escrow) => escrow.status === "disputed").length,
      released: escrows.filter((escrow) => escrow.status === "released").length,
      refunded: escrows.filter((escrow) =>
        ["refunded", "cancelled"].includes(escrow.status)
      ).length,
      heldValueMinor: escrows
        .filter((escrow) =>
          ["held", "docs_pending", "docs_approved", "disputed"].includes(escrow.status)
        )
        .reduce((sum, escrow) => sum + Number(escrow.amount_minor || 0), 0),
    };

    return { escrows, metrics };
  },

  async getUserQueue() {
    const [usersResult, membershipsResult, adminsResult] = await Promise.all([
      db
        .from("users")
        .select(
          "id,email,full_name,phone,verified,banned,preferred_contact_channel,phone_verified_at,created_at,updated_at"
        )
        .order("created_at", { ascending: false, nullsFirst: false })
        .limit(120),
      db.from("organization_members").select("user_id, role, organization_id"),
      db.from("platform_admins").select("user_id, role, status"),
    ]);

    if (usersResult.error) throw usersResult.error;
    if (membershipsResult.error) throw membershipsResult.error;
    if (adminsResult.error) throw adminsResult.error;

    const membershipsByUser = new Map<string, Array<{ role: string; organization_id: string }>>();
    for (const membership of membershipsResult.data || []) {
      const current = membershipsByUser.get(membership.user_id) || [];
      current.push({
        role: membership.role,
        organization_id: membership.organization_id,
      });
      membershipsByUser.set(membership.user_id, current);
    }

    const activeAdminIds = new Set(
      (adminsResult.data || [])
        .filter((admin: PlatformAdmin) => admin.status === "active")
        .map((admin: PlatformAdmin) => admin.user_id)
    );

    const users = (usersResult.data || []).map((profile: any) => {
      const memberships = membershipsByUser.get(profile.id) || [];
      return {
        ...profile,
        organizationCount: new Set(memberships.map((membership) => membership.organization_id)).size,
        roles: Array.from(new Set(memberships.map((membership) => membership.role))),
        isPlatformAdmin: activeAdminIds.has(profile.id),
      } as AdminUserRow;
    });

    const metrics = {
      totalUsers: users.length,
      verifiedUsers: users.filter((profile) => Boolean(profile.verified)).length,
      bannedUsers: users.filter((profile) => Boolean(profile.banned)).length,
      organizationMembers: users.filter((profile) => profile.organizationCount > 0).length,
      platformAdmins: users.filter((profile) => profile.isPlatformAdmin).length,
    };

    return { users, metrics };
  },

  async getAdminSettings() {
    const [adminsResult, billingEventsResult] = await Promise.all([
      db
        .from("platform_admins")
        .select("*, user:users(email, full_name)")
        .order("created_at", { ascending: false, nullsFirst: false }),
      db
        .from("organization_billing_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    if (adminsResult.error) throw adminsResult.error;
    if (billingEventsResult.error) throw billingEventsResult.error;

    return {
      admins: (adminsResult.data || []) as PlatformAdminRosterRow[],
      billingEvents: billingEventsResult.data || [],
    };
  },

  async updateOrganizationStatus(input: {
    organizationId: string;
    actorUserId: string;
    action: "approve" | "reject" | "request_changes" | "suspend" | "unsuspend";
    reason?: string;
  }) {
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {};
    let eventType = "organization_admin_action";
    let message = "Organization status updated.";

    switch (input.action) {
      case "approve":
        Object.assign(updates, {
          verified: true,
          suspended: false,
          verification_status: "verified",
          verified_at: now,
          verified_by: input.actorUserId,
        });
        eventType = "organization_verified";
        message = "Organization verification approved by platform admin.";
        break;
      case "reject":
        Object.assign(updates, {
          verified: false,
          verification_status: "rejected",
        });
        eventType = "organization_verification_rejected";
        message = "Organization verification rejected by platform admin.";
        break;
      case "request_changes":
        Object.assign(updates, {
          verified: false,
          verification_status: "needs_changes",
        });
        eventType = "organization_verification_needs_changes";
        message = "Platform admin requested changes for organization verification.";
        break;
      case "suspend":
        Object.assign(updates, {
          suspended: true,
          verified: false,
        });
        eventType = "organization_suspended";
        message = "Organization suspended by platform admin.";
        break;
      case "unsuspend":
        Object.assign(updates, {
          suspended: false,
        });
        eventType = "organization_unsuspended";
        message = "Organization unsuspended by platform admin.";
        break;
    }

    const { data: organization, error } = await db
      .from("organizations")
      .update(updates)
      .eq("id", input.organizationId)
      .select("*")
      .single();

    if (error) throw error;

    const metadata = {
      reason: input.reason || null,
      action: input.action,
      updates,
    };

    await db.from("audit_logs").insert({
      admin_id: input.actorUserId,
      action: eventType,
      target_type: "organization",
      target_id: input.organizationId,
      details: metadata,
    });

    await db.from("organization_billing_events").insert({
      organization_id: input.organizationId,
      actor_user_id: input.actorUserId,
      event_type: eventType,
      message,
      metadata,
    });

    return organization;
  },

  async updateListingModerationStatus(input: {
    listingId: string;
    organizationId: string;
    actorUserId: string;
    action: "approve" | "reject" | "suspend" | "unsuspend";
    reason?: string;
  }) {
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {};
    let eventType = "listing_admin_action";
    let message = "Listing moderation status updated.";

    switch (input.action) {
      case "approve":
        Object.assign(updates, {
          status: "listed",
          visibility: "public",
          verification_status: "in_review",
          verification_notes: input.reason || null,
          published_at: now,
        });
        eventType = "listing_approved";
        message = "Listing approved for marketplace visibility by platform admin.";
        break;
      case "reject":
        Object.assign(updates, {
          status: "draft",
          visibility: "hidden",
          verification_status: "rejected",
          verification_notes: input.reason || "Rejected by platform admin.",
        });
        eventType = "listing_rejected";
        message = "Listing rejected by platform admin.";
        break;
      case "suspend":
        Object.assign(updates, {
          status: "suspended",
          visibility: "hidden",
          verification_notes: input.reason || "Suspended by platform admin.",
        });
        eventType = "listing_suspended";
        message = "Listing suspended by platform admin.";
        break;
      case "unsuspend":
        Object.assign(updates, {
          status: "listed",
          visibility: "public",
          verification_notes: input.reason || null,
          published_at: now,
        });
        eventType = "listing_unsuspended";
        message = "Listing restored to marketplace visibility by platform admin.";
        break;
    }

    const { data: listing, error } = await db
      .from("listings")
      .update(updates)
      .eq("id", input.listingId)
      .select("*")
      .single();

    if (error) throw error;

    const metadata = {
      reason: input.reason || null,
      action: input.action,
      updates,
    };

    await db.from("audit_logs").insert({
      admin_id: input.actorUserId,
      action: eventType,
      target_type: "listing",
      target_id: input.listingId,
      details: metadata,
    });

    await db.from("organization_billing_events").insert({
      organization_id: input.organizationId,
      actor_user_id: input.actorUserId,
      event_type: eventType,
      message,
      metadata,
    });

    return listing;
  },

  async reviewEscrowDocument(input: {
    escrowId: string;
    escrowDocumentId: string;
    approved: boolean;
    reason?: string;
  }) {
    const { data, error } = await supabase.functions.invoke("manage-property-escrow", {
      body: {
        action: "review_document",
        escrowId: input.escrowId,
        escrowDocumentId: input.escrowDocumentId,
        approved: input.approved,
        reason: input.reason || null,
      },
    });

    if (error) throw error;
    return data;
  },

  async resolveEscrowDispute(input: {
    escrowId: string;
    resolution: "release_to_organization" | "refund_to_payer";
    note: string;
  }) {
    const { data, error } = await supabase.functions.invoke("manage-property-escrow", {
      body: {
        action: "resolve_dispute",
        escrowId: input.escrowId,
        resolution: input.resolution,
        note: input.note,
      },
    });

    if (error) throw error;
    return data;
  },

  async updateUserAccessStatus(input: {
    targetUserId: string;
    actorUserId: string;
    action: "verify" | "unverify" | "suspend" | "restore";
    reason?: string;
  }) {
    const updates: Record<string, unknown> = {};
    let eventType = "user_admin_action";

    switch (input.action) {
      case "verify":
        updates.verified = true;
        eventType = "user_verified";
        break;
      case "unverify":
        updates.verified = false;
        eventType = "user_unverified";
        break;
      case "suspend":
        updates.banned = true;
        eventType = "user_suspended";
        break;
      case "restore":
        updates.banned = false;
        eventType = "user_restored";
        break;
    }

    const { data: profile, error } = await db
      .from("users")
      .update(updates)
      .eq("id", input.targetUserId)
      .select(
        "id,email,full_name,phone,verified,banned,preferred_contact_channel,phone_verified_at,created_at,updated_at"
      )
      .single();

    if (error) throw error;

    await db.from("audit_logs").insert({
      admin_id: input.actorUserId,
      action: eventType,
      target_type: "user",
      target_id: input.targetUserId,
      details: {
        reason: input.reason || null,
        action: input.action,
        updates,
      },
    });

    return profile;
  },
};
