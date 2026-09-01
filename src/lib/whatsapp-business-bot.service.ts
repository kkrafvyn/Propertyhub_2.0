/**
 * BaytMiftah REOS — WhatsApp Business Gateway & Automated Tenant Bot Service
 * 
 * Provides automated WhatsApp conversational bots, webhook processors,
 * interactive message templates (Gate passes, MoMo payment links, Maintenance dispatches),
 * and 1-click dispatch deep links for property managers in Ghana.
 */

import { ghanaMarketService } from './ghana-market.service';

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
  actionRequired?: 'NONE' | 'TRIGGER_MOMO' | 'DISPATCH_GATE_PIN' | 'ALERT_MANAGER';
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

  /**
   * Process Incoming WhatsApp Webhook message via conversational state machine
   */
  processIncomingMessage(senderPhone: string, messageText: string): WhatsAppBotResponse {
    const cleanText = messageText.trim().toLowerCase();

    // Menu / Greeting
    if (cleanText === 'hi' || cleanText === 'hello' || cleanText === 'menu' || cleanText === 'start') {
      return {
        replyMessage: [
          `🏢 *Welcome to BaytMiftah Estate Concierge!*`,
          `How can we assist you today? Reply with a number:`,
          ``,
          `1️⃣ *Check Rent Balance & Pay (MoMo)*`,
          `2️⃣ *Generate Visitor Gate Pass*`,
          `3️⃣ *Report Maintenance Defect*`,
          `4️⃣ *Check Active Ticket Status*`,
          `5️⃣ *Speak with Estate Manager*`,
        ].join('\n'),
        quickReplies: ['1. Rent Balance', '2. Gate Pass', '3. Maintenance', '5. Support'],
        actionRequired: 'NONE',
      };
    }

    // 1. Rent Balance & Payment
    if (cleanText === '1' || cleanText.includes('rent') || cleanText.includes('balance') || cleanText.includes('pay')) {
      return {
        replyMessage: [
          `💳 *Your BaytMiftah Rent Status:*`,
          `• Unit: Cantonments Luxury Suites - Unit 4B`,
          `• Current Balance: GHS 0.00 (Paid in Full)`,
          `• Next Billing Date: 1st of Next Month`,
          ``,
          `To make an advance or utility payment, tap below:`,
          `👉 https://baytmiftah.com/pay/rent?ref=TENANT-${senderPhone.slice(-4)}`,
        ].join('\n'),
        actionRequired: 'TRIGGER_MOMO',
        quickReplies: ['Menu', 'Get Gate Pass', 'Report Issue'],
      };
    }

    // 2. Generate Visitor Gate Pass
    if (cleanText === '2' || cleanText.includes('gate') || cleanText.includes('pass') || cleanText.includes('visitor')) {
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      return {
        replyMessage: [
          `🛡️ *Gate Pass Generated Successfully!*`,
          `• Visitor Access PIN: *${pin}*`,
          `• Validity: 6 Hours from now`,
          `• Estate: Cantonments Luxury Suites`,
          ``,
          `Forward this PIN to your visitor for entry clearance at the security kiosk.`,
        ].join('\n'),
        actionRequired: 'DISPATCH_GATE_PIN',
        quickReplies: ['Menu', 'Check Balance'],
      };
    }

    // 3. Report Maintenance Defect
    if (cleanText === '3' || cleanText.includes('plumb') || cleanText.includes('leak') || cleanText.includes('ac') || cleanText.includes('light')) {
      return {
        replyMessage: [
          `🛠️ *Maintenance Desk:*`,
          `We have opened an emergency request for your unit.`,
          `Please reply with a brief description or send a photo of the defect here.`,
          `An estate artisan will be dispatched shortly.`,
        ].join('\n'),
        actionRequired: 'ALERT_MANAGER',
        quickReplies: ['Menu', 'View Tickets'],
      };
    }

    // 4. Ticket Status
    if (cleanText === '4' || cleanText.includes('ticket') || cleanText.includes('status')) {
      return {
        replyMessage: [
          `📋 *Active Work Orders:*`,
          `• Ticket #WO-8921 (AC Servicing) — *In Progress (Artisan Dispatched)*`,
          `• Scheduled Arrival: Today at 2:30 PM`,
          `• Artisan: Master Kwabena (+233 24 555 1234)`,
        ].join('\n'),
        actionRequired: 'NONE',
        quickReplies: ['Menu', 'Support'],
      };
    }

    // 5. Human Agent Handoff
    if (cleanText === '5' || cleanText.includes('agent') || cleanText.includes('manager') || cleanText.includes('help')) {
      return {
        replyMessage: [
          `📞 *Estate Manager Connected:*`,
          `Your request has been forwarded to the resident property manager on duty.`,
          `They will respond in this chat within 15 minutes. For immediate emergencies, call +233 30 200 1234.`,
        ].join('\n'),
        actionRequired: 'ALERT_MANAGER',
        quickReplies: ['Menu'],
      };
    }

    // Fallback response
    return {
      replyMessage: [
        `I didn't quite understand that. Please reply *MENU* to see available options or *5* to chat with an estate manager.`,
      ].join('\n'),
      quickReplies: ['Menu', '1. Pay Rent', '2. Gate Pass'],
      actionRequired: 'NONE',
    };
  },
};
