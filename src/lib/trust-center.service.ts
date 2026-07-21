import { supabase } from "./supabase";

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
      organization?.verified ? "Organization identity reviewed" : "Organization verification pending",
      publicDocumentCount > 0
        ? `${publicDocumentCount} public verification document${publicDocumentCount === 1 ? "" : "s"} available`
        : "No public verification documents published yet",
      "Paystack handles Mobile Money, cards, and bank transfers",
      "Successful payments generate downloadable receipts with SHA-256 verification",
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
        label: snapshot.organizationVerified ? "Verified agency" : "Agency pending verification",
        active: snapshot.organizationVerified,
      },
      {
        id: "documents",
        label:
          snapshot.publicDocumentCount > 0
            ? `${snapshot.publicDocumentCount} public trust document${snapshot.publicDocumentCount === 1 ? "" : "s"}`
            : "Documents not published",
        active: snapshot.publicDocumentCount > 0,
      },
      {
        id: "payments",
        label: "Secure Paystack payments",
        active: snapshot.securePaymentsEnabled,
      },
      {
        id: "listing",
        label:
          (input.qualityScore || 0) >= 75
            ? `Listing quality ${input.qualityScore}`
            : "Listing under review",
        active: (input.qualityScore || 0) >= 75,
      },
    ];
  },
};
