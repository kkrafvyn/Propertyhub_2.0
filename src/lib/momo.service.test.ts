import { describe, it, expect } from 'vitest';
import {
  normaliseGhanaPhone,
  requestMomoPayment,
  releaseArtisanEscrowMomo,
} from './momo-payment.service';

describe('MTN MoMo Ghana Client Service', () => {
  describe('normaliseGhanaPhone', () => {
    it('normalises 10-digit local format (0244123456)', () => {
      expect(normaliseGhanaPhone('0244123456')).toBe('233244123456');
    });

    it('keeps existing 233 format intact', () => {
      expect(normaliseGhanaPhone('233244123456')).toBe('233244123456');
    });

    it('strips international plus symbol (+233244123456)', () => {
      expect(normaliseGhanaPhone('+233244123456')).toBe('233244123456');
    });

    it('strips spaces and hyphens', () => {
      expect(normaliseGhanaPhone('024-412 3456')).toBe('233244123456');
    });
  });

  describe('requestMomoPayment', () => {
    it('initiates a MoMo collection request and returns reference', async () => {
      const response = await requestMomoPayment({
        type: 'collection',
        amount: 250.5,
        phone: '0244123456',
        note: 'Unit 402 Utility Bill',
      });

      expect(response.success).toBe(true);
      expect(response.type).toBe('collection');
      expect(response.amount).toBe('250.50');
      expect(response.status).toBe('PENDING');
      expect(response.payer).toBe('233244123456');
      expect(response.referenceId).toBeDefined();
    });
  });

  describe('releaseArtisanEscrowMomo', () => {
    it('initiates a MoMo disbursement payout for an artisan work order', async () => {
      const response = await releaseArtisanEscrowMomo(
        'wo_test_12345678',
        '0551234567',
        480
      );

      expect(response.success).toBe(true);
      expect(response.type).toBe('disbursement');
      expect(response.amount).toBe('480.00');
      expect(response.status).toBe('PENDING');
    });
  });
});
