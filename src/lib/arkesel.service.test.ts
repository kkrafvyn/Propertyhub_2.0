import { describe, it, expect } from 'vitest';
import {
  normaliseGhanaPhoneForSms,
  sendEstateSms,
  sendGatePassSms,
  sendUtilityBillSms,
  sendVerificationOtp,
  verifyVerificationOtp,
} from './sms-gateway.service';

describe('Arkesel Ghana SMS Gateway Client Service', () => {
  describe('normaliseGhanaPhoneForSms', () => {
    it('prepends +233 to 0XX numbers', () => {
      expect(normaliseGhanaPhoneForSms('0244123456')).toBe('+233244123456');
    });

    it('adds leading + to 233 numbers', () => {
      expect(normaliseGhanaPhoneForSms('233244123456')).toBe('+233244123456');
    });

    it('keeps +233 prefix intact', () => {
      expect(normaliseGhanaPhoneForSms('+233244123456')).toBe('+233244123456');
    });
  });

  describe('sendEstateSms', () => {
    it('dispatches transactional SMS and returns reference', async () => {
      const res = await sendEstateSms({
        to: '0244123456',
        message: 'Test alert from BaytMiftah Estate Management',
        organizationId: 'org_test_fixture',
      });

      expect(res.success).toBe(true);
      expect(res.action).toBe('send_sms');
      expect(res.reference).toBeDefined();
      expect(res.recipients).toBe(1);
    });
  });

  describe('sendGatePassSms', () => {
    it('formats and sends gate pass SMS with PIN code', async () => {
      const res = await sendGatePassSms(
        '0501234567',
        '849201',
        'Villaggio Vista Estate',
        'pass_999',
        'org_test_fixture',
      );

      expect(res.success).toBe(true);
      expect(res.reference).toBeDefined();
    });
  });

  describe('sendUtilityBillSms', () => {
    it('formats and sends utility invoice notification', async () => {
      const res = await sendUtilityBillSms(
        '0244123456',
        340.75,
        'August 2026',
        'inv_888',
        'org_test_fixture',
      );

      expect(res.success).toBe(true);
      expect(res.reference).toBeDefined();
    });
  });

  describe('OTP functions', () => {
    it('generates and sends OTP', async () => {
      const otpRes = await sendVerificationOtp('0244123456', 'gate access');
      expect(otpRes.success).toBe(true);
      expect(otpRes.reference).toBeDefined();
    });

    it('verifies standard 6-digit OTP code', async () => {
      const verifyRes = await verifyVerificationOtp('0244123456', '123456');
      expect(verifyRes.valid).toBe(true);

      const invalidRes = await verifyVerificationOtp('0244123456', '12');
      expect(invalidRes.valid).toBe(false);
    });
  });
});
