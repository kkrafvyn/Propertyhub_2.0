/**
 * PayAngels disbursement client — collections and payouts (MoMo, bank) via PayAngels only.
 */

import { supabase } from './supabase';

export interface PayAngelsDisbursementParams {
  amount: number;
  phone: string;
  organizationId: string;
  approvalId?: string;
  workOrderId?: string;
  note?: string;
  message?: string;
}

export interface PayAngelsDisbursementResponse {
  success: boolean;
  type: 'disbursement';
  referenceId: string;
  externalId: string;
  amount: string;
  recipient?: string;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  message?: string;
}

/** @deprecated Use PayAngelsDisbursementParams */
export type MomoInitiateParams =
  | {
      type: 'collection';
      amount: number;
      phone: string;
      invoiceId?: string;
      estateId?: string;
      unitId?: string;
    }
  | (PayAngelsDisbursementParams & {
      type?: 'disbursement';
      invoiceId?: string;
      estateId?: string;
      unitId?: string;
    });

/** @deprecated Use PayAngelsDisbursementResponse */
export type MomoInitiateResponse = PayAngelsDisbursementResponse & {
  payer?: string;
};

export function normaliseGhanaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('233')) return digits;
  if (digits.startsWith('0')) return `233${digits.slice(1)}`;
  return digits;
}

export async function requestPayAngelsDisbursement(
  params: PayAngelsDisbursementParams,
): Promise<PayAngelsDisbursementResponse> {
  if (!params.organizationId?.trim()) {
    throw new Error('organizationId is required for PayAngels disbursements');
  }
  if (!params.approvalId && !params.workOrderId) {
    throw new Error('approvalId or workOrderId is required for PayAngels disbursements');
  }
  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    throw new Error('Disbursement amount must be greater than zero');
  }

  const invocation = supabase.functions.invoke('initiate-payangels-disbursement', {
    body: {
      amount: params.amount,
      organizationId: params.organizationId.trim(),
      approvalId: params.approvalId,
      workOrderId: params.workOrderId,
      note: params.note || 'BaytMiftah disbursement',
      message: params.message || 'BaytMiftah payout',
    },
  });
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('PayAngels disbursement timed out')), 15000);
  });
  const { data, error } = await Promise.race([invocation, timeout]);

  if (error) {
    throw new Error(error.message || 'PayAngels disbursement failed');
  }

  return data as PayAngelsDisbursementResponse;
}

/** @deprecated Use requestPayAngelsDisbursement */
export async function requestMomoPayment(params: MomoInitiateParams): Promise<MomoInitiateResponse> {
  if (params.type === 'collection') {
    throw new Error('Collections must use paymentService.initializePropertyPayment (PayAngels checkout)');
  }
  return requestPayAngelsDisbursement(params as PayAngelsDisbursementParams);
}

export async function releaseArtisanEscrowPayAngels(input: {
  organizationId: string;
  workOrderId: string;
  artisanPhone: string;
  amountGhs: number;
}): Promise<PayAngelsDisbursementResponse> {
  return requestPayAngelsDisbursement({
    organizationId: input.organizationId,
    workOrderId: input.workOrderId,
    amount: input.amountGhs,
    phone: input.artisanPhone,
    note: `Work order escrow release #${input.workOrderId.slice(0, 8)}`,
    message: 'BaytMiftah artisan payout',
  });
}

/** @deprecated Use releaseArtisanEscrowPayAngels */
export const releaseArtisanEscrowMomo = releaseArtisanEscrowPayAngels;
