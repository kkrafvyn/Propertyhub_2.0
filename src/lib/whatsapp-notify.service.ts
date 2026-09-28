import { whatsappBusinessBotService } from "./whatsapp-business-bot.service";
import { whatsappOutboundService } from "./whatsapp-outbound.service";

export const whatsappNotifyService = {
  async sendLeaseSigningMessage(input: {
    to: string;
    recipientName: string;
    documentName: string;
    signingUrl: string;
    jurisdictionLabel?: string;
    isCosignReminder?: boolean;
    organizationId: string;
  }) {
    const message = whatsappBusinessBotService.formatLeaseSigningMessage({
      recipientName: input.recipientName,
      documentName: input.documentName,
      signingUrl: input.signingUrl,
      jurisdictionLabel: input.jurisdictionLabel,
      isCosignReminder: input.isCosignReminder,
    });
    return whatsappOutboundService.sendMessage({
      to: input.to,
      message,
      organizationId: input.organizationId,
    });
  },

  async sendPlainMessage(input: { to: string; message: string; organizationId: string }) {
    return whatsappOutboundService.sendMessage(input);
  },
};
