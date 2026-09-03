/**
 * BaytMiftah REOS — WhatsApp Business Gateway & Automated Tenant Bot Service
 * 
 * Provides automated WhatsApp conversational bots, webhook processors,
 * interactive message templates (Gate passes, MoMo payment links, Maintenance dispatches),
 * and 1-click dispatch deep links for property managers in Ghana.
 */

import { ghanaMarketService } from './ghana-market.service';
import {
  processGroupBotMessage,
  shouldRespondInGroup,
  stripGroupBotPrefix,
  normalizeGroupBotAliases,
  type GroupBotContext,
} from './whatsapp-group-bot-core';

export type WhatsAppMessageType =
  | 'gate_pass'
  | 'rent_invoice_momo'
  | 'maintenance_dispatch'
  | 'general_notice'
  | 'rent_receipt';

export interface WhatsAppGatePassParams {
  recipientPhone: string;
  recipientName: string;
  visitorName: string;
  visitorPhone?: string;
  pinCode: string;
  validUntil: string;
  estateName: string;
  unitNumber: string;
  qrCodeUrl?: string;
}

export interface WhatsAppRentInvoiceParams {
  recipientPhone: string;
  tenantName: string;
  unitName: string;
  amountGHS: number;
  dueDate: string;
  momoPaymentUrl: string;
  ussdShortcode?: string;
  estateName: string;
}

export interface WhatsAppMaintenanceDispatchParams {
  recipientPhone: string;
  tenantName: string;
  ticketId: string;
  category: string;
  artisanName: string;
  artisanPhone: string;
  scheduledTime: string;
  estateName: string;
}

export interface WhatsAppBotResponse {
  replyMessage: string;
  actionRequired?: 'NONE' | 'TRIGGER_MOMO' | 'DISPATCH_GATE_PIN' | 'ALERT_MANAGER' | 'LEASE_SIGN';
  quickReplies?: string[];
}

export const whatsappBusinessBotService = {
  /**
   * Normalize phone number to international WhatsApp format (e.g. 233244123456)
   */
  formatWhatsAppNumber(phone: string | null | undefined): string {
    if (!phone) return '';
    const normalized = ghanaMarketService.normalizeGhanaPhoneNumber(phone);
    return normalized.replace(/\D/g, '');
  },

  /**
   * Generate direct WhatsApp click-to-chat URL with pre-populated message
   */
  buildDirectChatUrl(phone: string, text: string): string {
    const formatted = this.formatWhatsAppNumber(phone);
    if (!formatted) return '';
    return `https://wa.me/${formatted}?text=${encodeURIComponent(text)}`;
  },

  /**
   * Build Visitor Gate Pass WhatsApp Notification Text
   */
  formatGatePassMessage(params: WhatsAppGatePassParams): string {
    return [
      `🛡️ *BAYTMIFTAH ESTATE ACCESS PASS*`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `Hello *${params.recipientName}*, your visitor access pass has been approved.`,
      ``,
      `📍 *Location:* ${params.estateName} (Unit ${params.unitNumber})`,
      `👤 *Visitor:* ${params.visitorName}`,
      `🔑 *Access PIN:* \`${params.pinCode}\``,
      `⏳ *Valid Until:* ${params.validUntil}`,
      ``,
      params.qrCodeUrl ? `📱 *Digital QR Pass:* ${params.qrCodeUrl}\n` : '',
      `Present this PIN or QR code to the gate security personnel upon arrival. Safe travels! 🇬🇭`,
    ].filter(Boolean).join('\n');
  },

  /**
   * Build Rent Invoice & Mobile Money Payment WhatsApp Notification
   */
  formatRentInvoiceMessage(params: WhatsAppRentInvoiceParams): string {
    const formattedAmount = `GHS ${params.amountGHS.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    return [
      `💳 *RENT INVOICE & PAYMENT NOTICE*`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `Dear *${params.tenantName}*,`,
      `Your rent invoice for *${params.unitName}* at *${params.estateName}* is ready.`,
      ``,
      `💰 *Amount Due:* *${formattedAmount}*`,
      `📅 *Due Date:* ${params.dueDate}`,
      ``,
      `📲 *Pay Instantly via Mobile Money:*`,
      `${params.momoPaymentUrl}`,
      ``,
      params.ussdShortcode ? `⚡ *Dial USSD:* \`${params.ussdShortcode}\`\n` : '',
      `Upon payment, your official receipt and ledger update will be issued automatically. Thank you for choosing BaytMiftah! ✨`,
    ].filter(Boolean).join('\n');
  },

  /**
   * Build Maintenance Artisan Dispatch Notification
   */
  formatMaintenanceDispatchMessage(params: WhatsAppMaintenanceDispatchParams): string {
    return [
      `🔧 *MAINTENANCE DISPATCH UPDATE*`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `Hello *${params.tenantName}*, a certified artisan has been assigned to your work order.`,
      ``,
      `📋 *Ticket ID:* #${params.ticketId}`,
      `🛠️ *Service:* ${params.category}`,
      `👷 *Assigned Artisan:* ${params.artisanName}`,
      `📞 *Contact Phone:* ${params.artisanPhone}`,
      `⏰ *Scheduled Window:* ${params.scheduledTime}`,
      `📍 *Estate:* ${params.estateName}`,
      ``,
      `Please ensure someone is available at the unit during this time. Reply *DONE* once repairs are satisfactorily completed.`,
    ].join('\n');
  },

  formatLeaseSigningMessage(params: {
    recipientName: string;
    documentName: string;
    signingUrl: string;
    jurisdictionLabel?: string;
    isCosignReminder?: boolean;
  }): string {
    const heading = params.isCosignReminder
      ? '📝 *LEASE COUNTERSIGNATURE REQUIRED*'
      : '📝 *LEASE READY FOR SIGNATURE*';
    return [
      heading,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `Hello *${params.recipientName}*,`,
      params.isCosignReminder
        ? `The tenant has signed *${params.documentName}*. Your countersignature is required to execute the agreement.`
        : `Your tenancy agreement *${params.documentName}* is ready for electronic signature.`,
      params.jurisdictionLabel ? `📍 *Jurisdiction:* ${params.jurisdictionLabel}` : '',
      ``,
      `✍️ *Sign securely:*`,
      params.signingUrl,
      ``,
      `Review all jurisdiction-specific clauses before signing. Powered by BaytMiftah.`,
    ].filter(Boolean).join('\n');
  },

  buildLeaseSigningUrl(phone: string | null | undefined, message: string): string {
    return this.buildDirectChatUrl(phone || '', message);
  },

  /** Group chat: only respond when mentioned or prefixed (unless respondWithoutMention). */
  shouldRespondInGroup,
  stripGroupPrefix: stripGroupBotPrefix,
  normalizeGroupAliases: normalizeGroupBotAliases,

  processGroupMessage(
    senderPhone: string,
    messageText: string,
    options?: { aliases?: string[]; respondWithoutMention?: boolean; context?: GroupBotContext }
  ): WhatsAppBotResponse | null {
    const aliases = normalizeGroupBotAliases(options?.aliases);
    if (!shouldRespondInGroup(messageText, aliases, options?.respondWithoutMention)) {
      return null;
    }
    const command = stripGroupBotPrefix(messageText, aliases);
    return processGroupBotMessage(senderPhone, command, true, options?.context);
  },

  /** Direct-message bot with optional live tenant context. */
  processIncomingMessage(senderPhone: string, messageText: string, context?: GroupBotContext): WhatsAppBotResponse {
    return processGroupBotMessage(senderPhone, messageText, false, context);
  },
};
