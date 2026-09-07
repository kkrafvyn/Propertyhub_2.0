import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normaliseGhanaPhoneForSms,
  sendEstateSms,
  sendGatePassSms,
  sendUtilityBillSms,
  sendVerificationOtp,
  verifyVerificationOtp,
} from './sms-gateway.service';

const invokeMock = vi.fn();

vi.mock('./supabase', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  },
}));

describe('Arkesel Ghana SMS Gateway Client Service', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

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
      invokeMock.mockResolvedValue({
        data: {
          success: true,
          action: 'send_sms',
          reference: 'sms_ref_1',
          recipients: 1,
        },
        error: null,
      });

      const res = await sendEstateSms({
        to: '0244123456',
        message: 'Test alert from BaytMiftah Estate Management',
        organizationId: 'org_test_fixture',
      });

      expect(invokeMock).toHaveBeenCalledWith('send-sms', expect.any(Object));
      expect(res.success).toBe(true);
      expect(res.action).toBe('send_sms');
      expect(res.reference).toBe('sms_ref_1');
      expect(res.recipients).toBe(1);
    });
  });

  describe('sendGatePassSms', () => {
    it('formats and sends gate pass SMS with PIN code', async () => {
      invokeMock.mockResolvedValue({
        data: { success: true, action: 'send_sms', reference: 'sms_ref_2', recipients: 1 },
        error: null,
      });

      const res = await sendGatePassSms(
        '0501234567',
        '849201',
        'Villaggio Vista Estate',
        'pass_999',
        'org_test_fixture',
      );

      expect(res.success).toBe(true);
      expect(res.reference).toBe('sms_ref_2');
    });
  });

  describe('sendUtilityBillSms', () => {
    it('formats and sends utility invoice notification', async () => {
      invokeMock.mockResolvedValue({
        data: { success: true, action: 'send_sms', reference: 'sms_ref_3', recipients: 1 },
        error: null,
      });

      const res = await sendUtilityBillSms(
        '0244123456',
        340.75,
        'August 2026',
        'inv_888',
        'org_test_fixture',
      );

      expect(res.success).toBe(true);
      expect(res.reference).toBe('sms_ref_3');
    });
  });

  describe('OTP functions', () => {
    it('generates and sends OTP', async () => {
      invokeMock.mockResolvedValue({
        data: { success: true, action: 'send_otp', reference: 'otp_ref_1' },
        error: null,
      });

      const otpRes = await sendVerificationOtp('0244123456', 'gate access');
      expect(otpRes.success).toBe(true);
      expect(otpRes.reference).toBe('otp_ref_1');
    });

    it('verifies OTP through the edge function', async () => {
      invokeMock.mockResolvedValue({
        data: { action: 'verify_otp', valid: true, message: 'Code verified' },
        error: null,
      });

      const verifyRes = await verifyVerificationOtp('0244123456', '123456');
      expect(verifyRes.valid).toBe(true);
    });
  });
});
