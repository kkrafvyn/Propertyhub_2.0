/**
 * Arkesel Ghana SMS Gateway Client Service
 * Bridges client alerts, gate pass deliveries, and utility bills with Arkesel SMS / OTP Edge Function.
 */

import { supabase } from './supabase';

export interface SendSmsPayload {
  to: string | string[];
  message: string;
  organizationId?: string;
  passId?: string;
  invoiceId?: string;
}

export interface SendSmsResult {
  success: boolean;
  action: string;
  reference: string;
  recipients?: number;
  status?: string;
}

export interface SendOtpResult {
  success: boolean;
  action: string;
  reference: string;
}

export interface VerifyOtpResult {
  action: string;
  valid: boolean;
  message: string;
}

export function normaliseGhanaPhoneForSms(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('233')) return `+${digits}`;
  if (digits.startsWith('0')) return `+233${digits.slice(1)}`;
  return `+${digits}`;
}

export async function sendEstateSms(payload: SendSmsPayload): Promise<SendSmsResult> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const invocation = supabase.functions.invoke('send-sms', {
      body: {
        action: 'send_sms',
        to: payload.to,
        message: payload.message,
        organizationId: payload.organizationId,
        passId: payload.passId,
        invoiceId: payload.invoiceId,
      },
    });
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('SMS dispatch timed out')), 5000);
    });
    const { data, error } = await Promise.race([invocation, timeout]);

    if (error) {
      throw new Error(error.message || 'SMS dispatch failed');
    }

    return data as SendSmsResult;
  } catch (err: unknown) {
    const isTestOrDemo = import.meta.env.MODE === 'test' || import.meta.env.VITE_ENABLE_DEMO_DATA === 'true';
    if (!isTestOrDemo) throw err;
    console.warn('Falling back to local SMS simulation:', err);
    return {
      success: true,
      action: 'send_sms',
      reference: `sms_sim_${Date.now()}`,
      recipients: Array.isArray(payload.to) ? payload.to.length : 1,
      status: 'success',
    };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function sendGatePassSms(
  visitorPhone: string,
  pinCode: string,
  estateName: string,
  passId?: string,
  organizationId?: string,
): Promise<SendSmsResult> {
  const message = `BaytMiftah Access: Your clearance PIN for ${estateName} is ${pinCode}. Show this at the gate.`;
  return sendEstateSms({
    to: visitorPhone,
    message,
    passId,
    organizationId,
  });
}

export async function sendUtilityBillSms(
  tenantPhone: string,
  amountGhs: number,
  period: string,
  invoiceId?: string,
  organizationId?: string,
): Promise<SendSmsResult> {
  const message = `BaytMiftah Utility Bill: Your ECG/Water bill for ${period} is GHS ${amountGhs.toFixed(2)}. Pay seamlessly via MoMo on your resident portal.`;
  return sendEstateSms({
    to: tenantPhone,
    message,
    invoiceId,
    organizationId,
  });
}

export async function sendVerificationOtp(
  phone: string,
  purpose = 'gate clearance'
): Promise<SendOtpResult> {
  try {
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: {
        action: 'send_otp',
        to: phone,
        message: `Your BaytMiftah ${purpose} code is %otp_code%. Valid for 5 minutes.`,
      },
    });

    if (error) throw new Error(error.message);
    return data as SendOtpResult;
  } catch (err: unknown) {
    const isTestOrDemo = import.meta.env.MODE === 'test' || import.meta.env.VITE_ENABLE_DEMO_DATA === 'true';
    if (!isTestOrDemo) throw err;
    return {
      success: true,
      action: 'send_otp',
      reference: `otp_sim_${Date.now()}`,
    };
  }
}

export async function verifyVerificationOtp(
  phone: string,
  code: string
): Promise<VerifyOtpResult> {
  try {
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: {
        action: 'verify_otp',
        to: phone,
        code,
      },
    });

    if (error) throw new Error(error.message);
    return data as VerifyOtpResult;
  } catch (err: unknown) {
    const isTestOrDemo = import.meta.env.MODE === 'test' || import.meta.env.VITE_ENABLE_DEMO_DATA === 'true';
    if (!isTestOrDemo) throw err;
    return {
      action: 'verify_otp',
      valid: code.length === 6,
      message: code.length === 6 ? 'Code verified' : 'Invalid code format',
    };
  }
}
