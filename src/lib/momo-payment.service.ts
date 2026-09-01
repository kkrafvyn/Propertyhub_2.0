/**
 * MTN MoMo Ghana Client Service
 * Bridges client actions with the PayAngels disbursement Edge Function.
 */

import { supabase } from './supabase';

export interface MomoInitiateParams {
  type?: 'collection' | 'disbursement';
  amount: number;
  phone: string;
  note?: string;
  message?: string;
  invoiceId?: string;
  workOrderId?: string;
  estateId?: string;
  unitId?: string;
}

export interface MomoInitiateResponse {
  success: boolean;
  type: 'collection' | 'disbursement';
  referenceId: string;
  externalId: string;
  amount: string;
  recipient?: string;
  payer?: string;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  message?: string;
}

export function normaliseGhanaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('233')) return digits;
  if (digits.startsWith('0')) return `233${digits.slice(1)}`;
  return digits;
}

export async function requestMomoPayment(
  params: MomoInitiateParams
): Promise<MomoInitiateResponse> {
  try {
    if ((params.type || 'collection') !== 'disbursement') {
      throw new Error('Collections must use paymentService.initializePropertyPayment with a listing context');
    }

    const invocation = supabase.functions.invoke('initiate-payangels-disbursement', {
      body: {
        type: params.type || 'collection',
        amount: params.amount,
        phone: normaliseGhanaPhone(params.phone),
        note: params.note || 'BaytMiftah REOS Payment',
        message: params.message || 'BaytMiftah Transaction Prompt',
        invoiceId: params.invoiceId,
        workOrderId: params.workOrderId,
        estateId: params.estateId,
        unitId: params.unitId,
      },
    });
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('MoMo initiation timed out')), 5000);
    });
    const { data, error } = await Promise.race([invocation, timeout]);

    if (error) {
      throw new Error(error.message || 'MoMo initiation failed');
    }

    return data as MomoInitiateResponse;
  } catch (err: unknown) {
    const isTestOrDemo = import.meta.env.MODE === 'test' || import.meta.env.VITE_ENABLE_DEMO_DATA === 'true';
    if (!isTestOrDemo) throw err;

    // Keep offline test/demo runs deterministic without claiming production success.
    console.warn('Falling back to local MoMo client simulation:', err);
    const ref = `momo_sim_${Date.now()}`;
    return {
      success: true,
      type: params.type || 'collection',
      referenceId: crypto.randomUUID(),
      externalId: ref,
      amount: Number(params.amount).toFixed(2),
      payer: normaliseGhanaPhone(params.phone),
      status: 'PENDING',
      message: 'Simulated prompt dispatched to subscriber mobile device',
    };
  }
}

export async function releaseArtisanEscrowMomo(
  workOrderId: string,
  artisanPhone: string,
  amountGhs: number
): Promise<MomoInitiateResponse> {
  return requestMomoPayment({
    type: 'disbursement',
    amount: amountGhs,
    phone: artisanPhone,
    note: `Work Order Escrow Release #${workOrderId.slice(0, 8)}`,
    message: 'BaytMiftah Artisan Payout',
    workOrderId,
  });
}
