import { supabase } from "./supabase";

export function calculateDepositSettlement(amountMinor: number, deductionsMinor: number) {
	if (amountMinor < 0 || deductionsMinor < 0 || deductionsMinor > amountMinor) {
		throw new Error("Deposit deductions must be between zero and the deposit amount");
	}
	return { amountMinor, deductionsMinor, refundedMinor: amountMinor - deductionsMinor };
}

export const leaseDepositService={async getByLeaseIds(leaseIds:string[]){if(!leaseIds.length)return[];const{data,error}=await supabase.from("lease_deposits").select("*").in("lease_id",leaseIds);if(error)throw error;return data||[]},async upsert(input:{leaseId:string;amountMinor:number;deductionsMinor:number;refundedMinor:number;currency:string;reason?:string;recordedBy:string}){const status=input.refundedMinor>=input.amountMinor?"refunded":input.refundedMinor>0?"partially_refunded":"held";const{data,error}=await supabase.from("lease_deposits").upsert({lease_id:input.leaseId,amount_minor:input.amountMinor,deductions_minor:input.deductionsMinor,refunded_minor:input.refundedMinor,currency:input.currency,status,deduction_reason:input.reason||null,recorded_by:input.recordedBy,updated_at:new Date().toISOString()},{onConflict:"lease_id"}).select("*").single();if(error)throw error;return data}};
