import { describe, it, expect } from 'vitest';
import { whatsappBusinessBotService } from './whatsapp-business-bot.service';

describe('whatsappBusinessBotService', () => {
  describe('formatWhatsAppNumber', () => {
    it('normalizes Ghanaian local phone numbers to international format without plus', () => {
      expect(whatsappBusinessBotService.formatWhatsAppNumber('0244123456')).toBe('233244123456');
      expect(whatsappBusinessBotService.formatWhatsAppNumber('+233 24 412 3456')).toBe('233244123456');
      expect(whatsappBusinessBotService.formatWhatsAppNumber('233244123456')).toBe('233244123456');
    });

    it('handles empty or invalid inputs gracefully', () => {
      expect(whatsappBusinessBotService.formatWhatsAppNumber(null)).toBe('');
      expect(whatsappBusinessBotService.formatWhatsAppNumber(undefined)).toBe('');
    });
  });

  describe('buildDirectChatUrl', () => {
    it('creates a valid wa.me link with URL-encoded text', () => {
      const url = whatsappBusinessBotService.buildDirectChatUrl('0244123456', 'Hello BaytMiftah!');
      expect(url).toContain('https://wa.me/233244123456');
      expect(url).toContain('text=Hello%20BaytMiftah!');
    });
  });

  describe('Template Formatters', () => {
    it('formats Gate Pass template with PIN, Estate and QR link', () => {
      const msg = whatsappBusinessBotService.formatGatePassMessage({
        recipientName: 'Kofi Mensah',
        recipientPhone: '0244123456',
        visitorName: 'Kwesi Appiah',
        pinCode: '891042',
        validUntil: 'Today at 6:00 PM',
        estateName: 'Cantonments Luxury Suites',
        unitNumber: '4B',
        qrCodeUrl: 'https://baytmiftah.com/qr/891042',
      });

      expect(msg).toContain('BAYTMIFTAH ESTATE ACCESS PASS');
      expect(msg).toContain('Kofi Mensah');
      expect(msg).toContain('Kwesi Appiah');
      expect(msg).toContain('891042');
      expect(msg).toContain('Cantonments Luxury Suites (Unit 4B)');
      expect(msg).toContain('https://baytmiftah.com/qr/891042');
    });

    it('formats Rent Invoice & MoMo payment notification', () => {
      const msg = whatsappBusinessBotService.formatRentInvoiceMessage({
        recipientPhone: '0244123456',
        tenantName: 'Ama Ampomah',
        unitName: 'Penthouse A',
        estateName: 'Airport Residential Courts',
        amountGHS: 4500,
        dueDate: '31st August 2026',
        momoPaymentUrl: 'https://baytmiftah.com/pay/inv-102',
        ussdShortcode: '*711*89#',
      });

      expect(msg).toContain('RENT INVOICE & PAYMENT NOTICE');
      expect(msg).toContain('Ama Ampomah');
      expect(msg).toContain('GHS 4,500.00');
      expect(msg).toContain('https://baytmiftah.com/pay/inv-102');
      expect(msg).toContain('*711*89#');
    });

    it('formats Maintenance Dispatch message', () => {
      const msg = whatsappBusinessBotService.formatMaintenanceDispatchMessage({
        recipientPhone: '0244123456',
        tenantName: 'David Osei',
        ticketId: 'WO-4401',
        category: 'Plumbing & Water Heater',
        artisanName: 'Master Kwaku',
        artisanPhone: '+233 24 555 7788',
        scheduledTime: 'Tomorrow at 10:00 AM',
        estateName: 'East Legon Hills Villas',
      });

      expect(msg).toContain('MAINTENANCE DISPATCH UPDATE');
      expect(msg).toContain('#WO-4401');
      expect(msg).toContain('Master Kwaku');
      expect(msg).toContain('+233 24 555 7788');
    });
  });

  describe('processIncomingMessage (Conversational State Machine)', () => {
    it('returns main menu on greeting', () => {
      const res = whatsappBusinessBotService.processIncomingMessage('233244123456', 'Hello');
      expect(res.replyMessage).toContain('Welcome to BaytMiftah Estate Concierge');
      expect(res.quickReplies).toContain('1. Rent Balance');
    });

    it('handles rent balance inquiry and triggers MoMo link action', () => {
      const res = whatsappBusinessBotService.processIncomingMessage('233244123456', '1');
      expect(res.replyMessage).toContain('Your BaytMiftah Rent Status');
      expect(res.actionRequired).toBe('TRIGGER_MOMO');
    });

    it('generates a 6-digit gate access PIN on option 2', () => {
      const res = whatsappBusinessBotService.processIncomingMessage('233244123456', 'gate pass please');
      expect(res.replyMessage).toContain('Gate Pass Generated Successfully');
      expect(res.actionRequired).toBe('DISPATCH_GATE_PIN');
    });

    it('alerts property manager when tenant reports maintenance or asks for agent', () => {
      const res = whatsappBusinessBotService.processIncomingMessage('233244123456', 'there is a water leak');
      expect(res.replyMessage).toContain('Maintenance Desk');
      expect(res.actionRequired).toBe('ALERT_MANAGER');
    });
  });
});
