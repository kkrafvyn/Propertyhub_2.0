import { supabase } from "./supabase";

export type DocuSignEnvelopeDraft = {
  provider: "docusign";
  emailSubject: string;
  documents: Array<{ name: string; fileExtension: string; documentBase64?: string; textContent?: string }>;
  signers: Array<{ name: string; email: string; recipientId: string; routingOrder: string }>;
  customFields: Record<string, string>;
};

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function isDocuSignConfigured(): boolean {
  return Boolean(
    typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_DOCUSIGN_INTEGRATION_KEY
  );
}

export function buildDocuSignEnvelope(input: {
  documentName: string;
  documentBody: string;
  signerName: string;
  signerEmail: string;
  metadata?: Record<string, unknown>;
}): DocuSignEnvelopeDraft {
  return {
    provider: "docusign",
    emailSubject: `Please sign: ${input.documentName}`,
    documents: [
      {
        name: input.documentName.replace(/[^\w\s-]/g, "").slice(0, 80) || "LeaseAgreement",
        fileExtension: "txt",
        textContent: input.documentBody,
        documentBase64: toBase64(input.documentBody),
      },
    ],
    signers: [
      {
        name: input.signerName,
        email: input.signerEmail,
        recipientId: "1",
        routingOrder: "1",
      },
    ],
    customFields: {
      jurisdictionLabel: String(input.metadata?.jurisdictionLabel || ""),
      subdivisionLabel: String(input.metadata?.subdivisionLabel || ""),
      auditScore: String(input.metadata?.auditScore || ""),
      source: "baytmiftah_lease_generator",
    },
  };
}

export type DocuSignSubmitResult = {
  envelopeId: string;
  status: string;
  simulated?: boolean;
  signingUrl?: string | null;
};

export const docuSignEnvelopeService = {
  isDocuSignConfigured,
  buildDocuSignEnvelope,

  async submitEnvelope(input: {
    esignatureRequestId: string;
    envelope: DocuSignEnvelopeDraft;
  }): Promise<DocuSignSubmitResult | null> {
    if (!isDocuSignConfigured()) return null;

    try {
      const { data, error } = await supabase.functions.invoke("create-docusign-envelope", {
        body: {
          esignatureRequestId: input.esignatureRequestId,
          envelope: input.envelope,
        },
      });

      if (error) throw error;
      return data as DocuSignSubmitResult;
    } catch (err) {
      const isTestOrDemo =
        typeof import.meta !== "undefined" &&
        ((import.meta as any).env?.MODE === "test" || (import.meta as any).env?.VITE_ENABLE_DEMO_DATA === "true");
      if (!isTestOrDemo) throw err;
      return {
        envelopeId: `ds_sim_${input.esignatureRequestId.slice(0, 8)}`,
        status: "sent",
        simulated: true,
      };
    }
  },
};
