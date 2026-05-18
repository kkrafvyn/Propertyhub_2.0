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
      "Approved gateways handle Mobile Money, cards, and bank transfers",
      "Successful receipts receive internal SHA-256 integrity hashes",
    ];

    return {
      organizationVerified: Boolean(organization?.verified),
      publicDocumentCount,
      publicDocuments: documents,
      signedDocumentCount,
      securePaymentsEnabled: true,
      receiptIntegrityEnabled: true,
      trustHighlights,
    };
  },
};
