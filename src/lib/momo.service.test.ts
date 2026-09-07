import { describe, it, expect, vi, beforeEach } from 'vitest';

import {

  normaliseGhanaPhone,

  requestMomoPayment,

  releaseArtisanEscrowMomo,
  type MomoInitiateParams,
} from './momo-payment.service';



const invokeMock = vi.fn();



vi.mock('./supabase', () => ({

  supabase: {

    functions: {

      invoke: (...args: unknown[]) => invokeMock(...args),

    },

  },

}));



describe('PayAngels disbursement client', () => {

  beforeEach(() => {

    invokeMock.mockReset();

  });



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

    it('rejects collection requests without PayAngels checkout', async () => {

      await expect(

        requestMomoPayment({

          type: 'collection',

          amount: 250.5,

          phone: '0244123456',

        }),

      ).rejects.toThrow(/PayAngels checkout/i);

    });



    it('requires organization and approval context for owner disbursements', async () => {

      await expect(

        requestMomoPayment({
          amount: 250.5,
          phone: '0244123456',
        } as MomoInitiateParams),

      ).rejects.toThrow(/organizationId/i);

    });



    it('invokes the PayAngels disbursement edge function for owner payouts', async () => {

      invokeMock.mockResolvedValue({

        data: {

          success: true,

          type: 'disbursement',

          referenceId: 'ref-123',

          externalId: 'ext-123',

          amount: '480.00',

          recipient: '233551234567',

          status: 'PENDING',

        },

        error: null,

      });



      const response = await requestMomoPayment({

        type: 'disbursement',

        amount: 480,

        phone: '0551234567',

        organizationId: 'org-1',

        approvalId: 'approval-1',

      });



      expect(invokeMock).toHaveBeenCalledWith('initiate-payangels-disbursement', expect.any(Object));

      expect(response.success).toBe(true);

      expect(response.type).toBe('disbursement');

      expect(response.amount).toBe('480.00');

      expect(response.status).toBe('PENDING');

    });



    it('invokes PayAngels disbursement for work-order payouts', async () => {

      invokeMock.mockResolvedValue({

        data: {

          success: true,

          type: 'disbursement',

          referenceId: 'ref-wo',

          externalId: 'ext-wo',

          amount: '480.00',

          recipient: '233551234567',

          status: 'PENDING',

        },

        error: null,

      });



      const response = await requestMomoPayment({

        type: 'disbursement',

        amount: 480,

        phone: '0551234567',

        organizationId: 'org-1',

        workOrderId: 'wo-1',

      });



      expect(invokeMock).toHaveBeenCalledWith('initiate-payangels-disbursement', expect.any(Object));

      expect(response.referenceId).toBe('ref-wo');

    });

  });



  describe('releaseArtisanEscrowMomo', () => {

    it('initiates a PayAngels payout for an artisan work order', async () => {

      invokeMock.mockResolvedValue({

        data: {

          success: true,

          type: 'disbursement',

          referenceId: 'ref-456',

          externalId: 'ext-456',

          amount: '480.00',

          recipient: '233551234567',

          status: 'PENDING',

        },

        error: null,

      });



      const response = await releaseArtisanEscrowMomo({

        organizationId: 'org-1',

        workOrderId: 'wo_test_12345678',

        artisanPhone: '0551234567',

        amountGhs: 480,

      });



      expect(invokeMock).toHaveBeenCalledWith('initiate-payangels-disbursement', expect.any(Object));

      expect(response.success).toBe(true);

      expect(response.type).toBe('disbursement');

      expect(response.amount).toBe('480.00');

      expect(response.status).toBe('PENDING');

    });

  });

});

