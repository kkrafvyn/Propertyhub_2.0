import { communicationService } from "./communication.service";
import { dealCaseService } from "./dealcase.service";
import { documentCenterService } from "./document-center.service";
import { messageService } from "./message.service";
import { mobileMediaService, type MobileCapturedPhoto } from "./mobile-media.service";
import {
  mobileOfflineQueueService,
  type MobileOfflineQueueItem,
  type MobileOfflineSyncResult,
} from "./mobile-offline-queue.service";
import { propertyMediaService } from "./property-media.service";
import { propertyViewingService } from "./property-viewing.service";

interface FieldNotePayload {
  note?: string;
  location?: unknown;
  createdAt?: string;
}

interface ListingPhotoPayload {
  photo?: MobileCapturedPhoto;
  organizationId?: string;
  propertyId?: string;
  createdBy?: string;
  location?: unknown;
  capturedAt?: string;
}

interface FreeformQueuePayload {
  note?: string;
  message?: string;
  summary?: string;
  location?: unknown;
  createdAt?: string;
  [key: string]: unknown;
}

interface MessageDraftPayload {
  conversationId?: string;
  senderId?: string;
  content?: string;
}

interface OfferDraftPayload {
  listingId?: string;
  organizationId?: string;
  userId?: string;
  caseType?: string;
  message?: string;
  priority?: string;
}

interface DealDocumentPayload {
  title?: string;
  organizationId?: string;
  dealCaseId?: string | null;
  listingId?: string | null;
  createdBy?: string;
  scan?: {
    id?: string;
    title?: string;
    scannedAt?: string;
    photo?: MobileCapturedPhoto;
  };
}

interface ViewingRequestPayload {
  userId?: string;
  listingId?: string;
  propertyId?: string;
  organizationId?: string;
  requestedDateTime?: string;
  durationMinutes?: number;
  requesterNote?: string;
  contactPhone?: string;
  contactEmail?: string;
  listingType?: string;
}

export interface MobileOfflineQueueSyncResult extends MobileOfflineSyncResult {
  offline: boolean;
}

function isOnline() {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

function describePayload(payload: FreeformQueuePayload, fallback: string) {
  return payload.note || payload.message || payload.summary || fallback;
}

function compactMetadata(payload: unknown) {
  if (!payload || typeof payload !== "object") return { payload };

  return Object.fromEntries(
    Object.entries(payload as Record<string, unknown>).filter(([, value]) => {
      if (value === undefined) return false;
      if (typeof value === "function") return false;
      return true;
    })
  );
}

async function createQueueNotification(params: {
  userId: string;
  notificationType: string;
  subject: string;
  content: string;
  actionUrl: string;
  item: MobileOfflineQueueItem;
}) {
  await communicationService.createInAppNotification({
    userId: params.userId,
    notificationType: params.notificationType,
    subject: params.subject,
    content: params.content,
    actionUrl: params.actionUrl,
    respectPreferences: false,
    metadata: {
      source: "mobile_offline_queue",
      queuedAt: params.item.createdAt,
      queueType: params.item.type,
      payload: compactMetadata(params.item.payload),
    },
  });
}

async function syncFieldNote(userId: string, item: MobileOfflineQueueItem) {
  const payload = item.payload as FieldNotePayload;

  await createQueueNotification({
    userId,
    notificationType: "mobile_field_note",
    subject: "Offline field note synced",
    content: payload.note || "A field note was saved from the mobile app.",
    actionUrl: "/app/support",
    item,
  });
}

async function syncListingPhoto(userId: string, item: MobileOfflineQueueItem) {
  const payload = item.payload as ListingPhotoPayload;

  if (payload.photo && payload.organizationId && payload.propertyId) {
    const file = await mobileMediaService.photoToFile(
      payload.photo,
      `property-photo-${payload.photo.id}.jpg`
    );

    await propertyMediaService.uploadPropertyMedia({
      organizationId: payload.organizationId,
      propertyId: payload.propertyId,
      createdBy: payload.createdBy || userId,
      files: [file],
      altText: "Captured from the mobile app",
    });
    return;
  }

  await createQueueNotification({
    userId,
    notificationType: "mobile_listing_photo",
    subject: "Mobile photo synced",
    content:
      "A mobile property photo was saved without listing context. Open this note to attach it to the right property.",
    actionUrl: "/app/support",
    item,
  });
}

async function syncFreeformItem(
  userId: string,
  item: MobileOfflineQueueItem,
  params: {
    notificationType: string;
    subject: string;
    fallbackContent: string;
    actionUrl: string;
  }
) {
  const payload = item.payload as FreeformQueuePayload;

  await createQueueNotification({
    userId,
    notificationType: params.notificationType,
    subject: params.subject,
    content: describePayload(payload, params.fallbackContent),
    actionUrl: params.actionUrl,
    item,
  });
}

async function syncMessageDraft(userId: string, item: MobileOfflineQueueItem) {
  const payload = item.payload as MessageDraftPayload;
  const content = payload.content?.trim();

  if (!payload.conversationId || !content) {
    await createQueueNotification({
      userId,
      notificationType: "mobile_message_draft",
      subject: "Message draft synced",
      content: content || "A message draft was saved from the mobile app.",
      actionUrl: "/app/messages",
      item,
    });
    return;
  }

  await messageService.sendMessage(payload.conversationId, payload.senderId || userId, content);
}

async function syncOfferDraft(userId: string, item: MobileOfflineQueueItem) {
  const payload = item.payload as OfferDraftPayload;

  if (!payload.listingId || !payload.organizationId) {
    await createQueueNotification({
      userId,
      notificationType: "mobile_offer_draft",
      subject: "Offer draft synced",
      content: payload.message || "An offer draft was saved from the mobile app.",
      actionUrl: "/app/deals",
      item,
    });
    return;
  }

  await dealCaseService.createDealCase({
    listing_id: payload.listingId,
    organization_id: payload.organizationId,
    user_id: payload.userId || userId,
    case_type: payload.caseType || "purchase_offer",
    status: "pending",
    priority: payload.priority || "medium",
    pipeline_stage: "offer_received",
    message: payload.message || "Offer draft synced from the mobile app.",
    last_stage_updated_at: new Date().toISOString(),
  });
}

async function syncDealDocument(userId: string, item: MobileOfflineQueueItem) {
  const payload = item.payload as DealDocumentPayload;
  const title = payload.title || payload.scan?.title || "Scanned deal document";

  if (!payload.organizationId) {
    await createQueueNotification({
      userId,
      notificationType: "mobile_deal_document",
      subject: "Scanned document synced",
      content: `${title} was saved from the mobile document scanner.`,
      actionUrl: "/app/deals",
      item,
    });
    return;
  }

  await documentCenterService.createDocument({
    organizationId: payload.organizationId,
    createdBy: payload.createdBy || userId,
    title,
    documentType: "scanned_document",
    dealCaseId: payload.dealCaseId || null,
    listingId: payload.listingId || null,
    contentMarkdown: [
      `# ${title}`,
      "",
      "Captured from the Property Hub mobile document scanner.",
      payload.scan?.scannedAt ? `Scanned at: ${payload.scan.scannedAt}` : null,
      payload.scan?.photo?.webPath ? `Preview: ${payload.scan.photo.webPath}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    publicVisibility: false,
    signatureRequired: false,
    publicSummary: "Scanned from the mobile app.",
  });
}

async function syncViewingRequest(userId: string, item: MobileOfflineQueueItem) {
  const payload = item.payload as ViewingRequestPayload;

  if (
    !payload.listingId ||
    !payload.propertyId ||
    !payload.organizationId ||
    !payload.requestedDateTime
  ) {
    await createQueueNotification({
      userId,
      notificationType: "mobile_viewing_request",
      subject: "Viewing request draft synced",
      content: payload.requesterNote || "A viewing request draft was saved from the mobile app.",
      actionUrl: "/app/viewings",
      item,
    });
    return;
  }

  await propertyViewingService.requestViewing({
    userId: payload.userId || userId,
    listingId: payload.listingId,
    propertyId: payload.propertyId,
    organizationId: payload.organizationId,
    requestedDateTime: payload.requestedDateTime,
    durationMinutes: payload.durationMinutes,
    requesterNote: payload.requesterNote,
    contactPhone: payload.contactPhone,
    contactEmail: payload.contactEmail,
    listingType: payload.listingType,
  });
}

export const mobileOfflineSyncService = {
  async syncQueuedItems(userId: string): Promise<MobileOfflineQueueSyncResult> {
    const queuedCount = await mobileOfflineQueueService.count();

    if (!isOnline()) {
      return {
        synced: 0,
        failed: 0,
        skipped: queuedCount,
        remaining: queuedCount,
        offline: true,
      };
    }

    const result = await mobileOfflineQueueService.sync({
      "field-note": (item) => syncFieldNote(userId, item),
      "listing-photo": (item) => syncListingPhoto(userId, item),
      "viewing-note": (item) =>
        syncFreeformItem(userId, item, {
          notificationType: "mobile_viewing_note",
          subject: "Viewing note synced",
          fallbackContent: "A viewing note was saved from the mobile app.",
          actionUrl: "/app/viewings",
        }),
      "viewing-request": (item) => syncViewingRequest(userId, item),
      "buyer-request": (item) =>
        syncFreeformItem(userId, item, {
          notificationType: "mobile_buyer_request",
          subject: "Buyer request synced",
          fallbackContent: "A buyer request was saved from the mobile app.",
          actionUrl: "/app/buyer-request",
        }),
      "maintenance-report": (item) =>
        syncFreeformItem(userId, item, {
          notificationType: "mobile_maintenance_report",
          subject: "Maintenance report synced",
          fallbackContent: "A maintenance report was saved from the mobile app.",
          actionUrl: "/app/support",
        }),
      "message-draft": (item) => syncMessageDraft(userId, item),
      "offer-draft": (item) => syncOfferDraft(userId, item),
      "deal-document": (item) => syncDealDocument(userId, item),
    });

    return {
      ...result,
      offline: false,
    };
  },
};
