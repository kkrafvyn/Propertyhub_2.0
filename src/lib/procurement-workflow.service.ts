import { supabase } from "./supabase";

const procurementDb = supabase as any;

export type ProcurementRequestStatus = "requested" | "approved" | "rejected" | "ordered" | "closed";
export type PurchaseOrderStatus = "draft" | "issued" | "part_received" | "received" | "invoiced" | "closed" | "cancelled";

export interface ProcurementRequest {
  id: string;
  estate_id: string;
  title: string;
  description: string | null;
  amount_minor: number | null;
  currency: string;
  status: ProcurementRequestStatus;
  requested_by: string;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  estate_id: string;
  procurement_request_id: string | null;
  selected_quote_id: string | null;
  po_number: string;
  vendor_id: string | null;
  vendor_name: string;
  amount_minor: number;
  currency: string;
  status: PurchaseOrderStatus;
  issued_by: string | null;
  issued_at: string | null;
  created_at: string;
}

export const procurementWorkflowService = {
  async listRequests(estateIds: string[]): Promise<ProcurementRequest[]> {
    if (estateIds.length === 0) return [];
    const { data, error } = await procurementDb
      .from("estate_procurement_requests")
      .select("*")
      .in("estate_id", estateIds)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createRequest(input: {
    estateId: string;
    title: string;
    description?: string;
    amountMinor?: number;
    currency: string;
    requestedBy: string;
    assetId?: string;
  }): Promise<ProcurementRequest> {
    if (!input.title.trim() || (input.amountMinor != null && input.amountMinor <= 0)) {
      throw new Error("A title and positive amount are required");
    }
    const { data, error } = await procurementDb
      .from("estate_procurement_requests")
      .insert({
        estate_id: input.estateId,
        asset_id: input.assetId || null,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        amount_minor: input.amountMinor || null,
        currency: input.currency,
        requested_by: input.requestedBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async updateRequestStatus(input: {
    requestId: string;
    status: ProcurementRequestStatus;
    approvedBy?: string;
  }): Promise<ProcurementRequest> {
    const { data, error } = await procurementDb
      .from("estate_procurement_requests")
      .update({
        status: input.status,
        approved_by: input.status === "approved" ? input.approvedBy || null : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.requestId)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async listPurchaseOrders(estateIds: string[]): Promise<PurchaseOrder[]> {
    if (estateIds.length === 0) return [];
    const { data, error } = await procurementDb
      .from("estate_purchase_orders")
      .select("*")
      .in("estate_id", estateIds)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createPurchaseOrder(input: {
    estateId: string;
    procurementRequestId?: string;
    selectedQuoteId?: string;
    poNumber: string;
    vendorId?: string;
    vendorName: string;
    amountMinor: number;
    currency: string;
    createdBy: string;
  }): Promise<PurchaseOrder> {
    if (!input.poNumber.trim() || !input.vendorName.trim() || input.amountMinor <= 0) {
      throw new Error("PO number, vendor, and positive amount are required");
    }
    const { data, error } = await procurementDb
      .from("estate_purchase_orders")
      .insert({
        estate_id: input.estateId,
        procurement_request_id: input.procurementRequestId || null,
        selected_quote_id: input.selectedQuoteId || null,
        po_number: input.poNumber.trim(),
        vendor_id: input.vendorId || null,
        vendor_name: input.vendorName.trim(),
        amount_minor: input.amountMinor,
        currency: input.currency,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async updatePurchaseOrderStatus(orderId: string, status: PurchaseOrderStatus, issuedBy?: string): Promise<PurchaseOrder> {
    const { data, error } = await procurementDb
      .from("estate_purchase_orders")
      .update({
        status,
        issued_by: status === "issued" ? issuedBy || null : undefined,
        issued_at: status === "issued" ? new Date().toISOString() : undefined,
      })
      .eq("id", orderId)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async recordGoodsReceipt(input: {
    purchaseOrderId: string;
    receiptReference?: string;
    receivedBy: string;
    notes?: string;
  }) {
    const { data, error } = await procurementDb
      .from("estate_goods_receipts")
      .insert({
        purchase_order_id: input.purchaseOrderId,
        receipt_reference: input.receiptReference?.trim() || null,
        received_by: input.receivedBy,
        notes: input.notes?.trim() || null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async addPurchaseOrderLine(input: { purchaseOrderId: string; description: string; quantity: number; unitPriceMinor: number }) {
    const { data, error } = await procurementDb.from("estate_purchase_order_lines").insert({ purchase_order_id: input.purchaseOrderId, description: input.description.trim(), quantity: input.quantity, unit_price_minor: input.unitPriceMinor }).select("*").single();
    if (error) throw error; return data;
  },

  async addGoodsReceiptLine(input: { goodsReceiptId: string; purchaseOrderLineId: string; quantityReceived: number; accepted?: boolean; notes?: string }) {
    const { data, error } = await procurementDb.from("estate_goods_receipt_lines").insert({ goods_receipt_id: input.goodsReceiptId, purchase_order_line_id: input.purchaseOrderLineId, quantity_received: input.quantityReceived, accepted: input.accepted ?? true, notes: input.notes?.trim() || null }).select("*").single();
    if (error) throw error; return data;
  },

  async evaluateInvoiceMatch(vendorBillId: string, toleranceMinor = 0) {
    const { data, error } = await procurementDb.rpc("evaluate_procurement_invoice_match", { p_vendor_bill_id: vendorBillId, p_tolerance_minor: toleranceMinor });
    if (error) throw error; return data;
  },
};
