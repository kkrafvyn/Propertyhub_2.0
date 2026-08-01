import { supabase } from "./supabase";
import { TRUST_LABELS } from "./legal-disclaimers";

export const trustCenterService = {
  async getListingTrustSnapshot(listingId: string, organizationId: string) {
    const [documentsResult, organizationsResult] = await Promise.allSettled([
      supabase
        .from("organization_documents")
        .select("id, title, document_type, signed_at, status", { count: "exact" })
        .eq("listing_id", listingId)
        .eq("public_visibility", true)
        .in("status", ["sent", "partially_signed", "signed"])
        .order("updated_at", { ascending: false })
        .limit(4),
      supabase
        .from("organizations")
        .select("verified, name")
        .eq("id", organizationId)
        .maybeSingle(),
    ]);

    const documents =
      documentsResult.status === "fulfilled" ? documentsResult.value.data || [] : [];
    const publicDocumentCount =
      documentsResult.status === "fulfilled" ? documentsResult.value.count || 0 : 0;
    const organization =
      organizationsResult.status === "fulfilled" ? organizationsResult.value.data : null;
    const signedDocumentCount = documents.filter((document) => document.signed_at).length;
    const trustHighlights = [
      organization?.verified
        ? TRUST_LABELS.platform_reviewed_agency.short
        : "Organization review pending",
      publicDocumentCount > 0
        ? `${publicDocumentCount} public document${publicDocumentCount === 1 ? "" : "s"} shared by host`
        : "No public documents shared yet",
      TRUST_LABELS.licensed_payment_partner.short,
      "Completed payments may generate downloadable receipts",
    ];

    return {
      organizationVerified: Boolean(organization?.verified),
      publicDocumentCount,
      publicDocuments: documents,
      signedDocumentCount,
      securePaymentsEnabled: true,
      blockchainProofEnabled: false,
      trustHighlights,
    };
  },

  async getConsumerTrustBadges(input: {
    listingId: string;
    organizationId: string;
    organizationVerified?: boolean;
    qualityScore?: number | null;
  }) {
    const snapshot = await this.getListingTrustSnapshot(
      input.listingId,
      input.organizationId
    );

    return [
      {
        id: "agency",
        label: snapshot.organizationVerified
          ? TRUST_LABELS.platform_reviewed_agency.short
          : "Agency review pending",
        disclaimer: TRUST_LABELS.platform_reviewed_agency.disclaimer,
        active: snapshot.organizationVerified,
      },
      {
        id: "documents",
        label:
          snapshot.publicDocumentCount > 0
            ? `${snapshot.publicDocumentCount} shared document${snapshot.publicDocumentCount === 1 ? "" : "s"}`
            : "No shared documents",
        disclaimer:
          "Documents are uploaded by the listing party. BaytMiftah does not certify title, ownership, or legal validity.",
        active: snapshot.publicDocumentCount > 0,
      },
      {
        id: "payments",
        label: TRUST_LABELS.licensed_payment_partner.short,
        disclaimer: TRUST_LABELS.licensed_payment_partner.disclaimer,
        active: snapshot.securePaymentsEnabled,
      },
      {
        id: "listing",
        label:
          (input.qualityScore || 0) >= 75
            ? `${TRUST_LABELS.listing_quality_score.short}: ${input.qualityScore}`
            : "Listing review in progress",
        disclaimer: TRUST_LABELS.listing_quality_score.disclaimer,
        active: (input.qualityScore || 0) >= 75,
      },
    ];
  },
};
