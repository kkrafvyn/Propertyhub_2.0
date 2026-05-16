import { ghanaMarketService } from "./ghana-market.service";

export type LeadWhatsappTemplate =
  | "first_response"
  | "viewing_confirmation"
  | "documents_needed"
  | "payment_followup";

function encodeMessage(message: string) {
  return encodeURIComponent(message);
}

export const ghanaWhatsappService = {
  buildUrl(phone: string | null | undefined, message: string) {
    const normalized = ghanaMarketService.normalizeGhanaPhoneNumber(phone);
    const digits = normalized.replace(/\D/g, "");
    if (!digits) return "";
    return `https://wa.me/${digits}?text=${encodeMessage(message)}`;
  },

  getLeadTemplate(
    template: LeadWhatsappTemplate,
    params: {
      leadName?: string | null;
      agentName?: string | null;
      organizationName?: string | null;
      propertyAddress?: string | null;
      viewingTime?: string | null;
      paymentPurpose?: string | null;
    }
  ) {
    const leadName = params.leadName || "there";
    const agentName = params.agentName || "the BaytMiftah team";
    const organizationName = params.organizationName || "BaytMiftah";
    const address = params.propertyAddress || "the property";

    switch (template) {
      case "viewing_confirmation":
        return `Hi ${leadName}, this is ${agentName} from ${organizationName}. Your viewing for ${address} is confirmed${params.viewingTime ? ` for ${params.viewingTime}` : ""}. Please share your GhanaPostGPS location if you need directions.`;
      case "documents_needed":
        return `Hi ${leadName}, this is ${agentName} from ${organizationName}. To continue with ${address}, please share your ID/verification details and any required documents through BaytMiftah so we can keep the process secure.`;
      case "payment_followup":
        return `Hi ${leadName}, this is ${agentName} from ${organizationName}. Your ${params.paymentPurpose || "payment"} for ${address} can be completed securely through BaytMiftah using Mobile Money, card, or bank transfer.`;
      case "first_response":
      default:
        return `Hi ${leadName}, this is ${agentName} from ${organizationName}. Thanks for your interest in ${address}. Are you available for a quick call or WhatsApp chat today?`;
    }
  },
};
