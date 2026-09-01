import { supabase } from "./supabase";
const db=supabase as any;

export type VendorBillStatus = "draft" | "approved" | "paid" | "void";

export function calculateWithholdingTax(amountMinor: number, ratePercent: number) {
	if (amountMinor < 0 || ratePercent < 0 || ratePercent > 100) throw new Error("Invalid taxable amount or tax rate");
	return Math.round(amountMinor * ratePercent / 100);
}

export function getInvoiceAging(dueDate: string | null | undefined, asOf = new Date()) {
	if (!dueDate) return 0;
	return Math.max(0, Math.floor((asOf.getTime() - new Date(`${dueDate}T00:00:00`).getTime()) / 86400000));
}

function assertBillTransition(current: VendorBillStatus, next: VendorBillStatus) {
	const allowed: Record<VendorBillStatus, VendorBillStatus[]> = { draft: ["approved", "void"], approved: ["paid", "void"], paid: [], void: [] };
	if (!allowed[current].includes(next)) throw new Error(`Cannot move vendor bill from ${current} to ${next}`);
}

export const estatePayablesService={
	async getBills(estateIds:string[]){if(!estateIds.length)return[];const{data,error}=await db.from("estate_vendor_bills").select("*").in("estate_id",estateIds).order("created_at",{ascending:false});if(error)throw error;return data||[]},
	async createBill(input:any){if(!input.billNumber?.trim()||!Number.isFinite(input.amountMinor)||input.amountMinor<=0)throw new Error("Bill number and positive amount are required");const{data,error}=await db.from("estate_vendor_bills").insert({estate_id:input.estateId,vendor_id:input.vendorId||null,work_order_id:input.workOrderId||null,purchase_order_id:input.purchaseOrderId||null,bill_number:input.billNumber.trim(),description:input.description?.trim()||null,amount_minor:input.amountMinor,currency:input.currency,due_date:input.dueDate||null,created_by:input.createdBy}).select("*").single();if(error)throw error;return data},
	async updateStatus(id:string,status:"approved"|"paid"|"void",userId:string){const{data:current,error:currentError}=await db.from("estate_vendor_bills").select("status").eq("id",id).single();if(currentError)throw currentError;assertBillTransition(current.status,status);const{data,error}=await db.from("estate_vendor_bills").update({status,approved_by:status==="approved"?userId:undefined,paid_at:status==="paid"?new Date().toISOString():undefined}).eq("id",id).eq("status",current.status).select("*").single();if(error)throw error;return data},
};
