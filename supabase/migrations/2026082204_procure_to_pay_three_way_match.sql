-- Line-level procure-to-pay records make quote/PO/receipt/invoice comparison
-- auditable instead of treating a purchase order as one opaque amount.
ALTER TABLE public.estate_purchase_orders ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
CREATE TABLE public.estate_purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), purchase_order_id UUID NOT NULL REFERENCES public.estate_purchase_orders(id) ON DELETE CASCADE,
  description TEXT NOT NULL, quantity NUMERIC(14,3) NOT NULL CHECK(quantity>0), unit_price_minor BIGINT NOT NULL CHECK(unit_price_minor>=0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.estate_goods_receipt_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), goods_receipt_id UUID NOT NULL REFERENCES public.estate_goods_receipts(id) ON DELETE CASCADE,
  purchase_order_line_id UUID NOT NULL REFERENCES public.estate_purchase_order_lines(id) ON DELETE RESTRICT,
  quantity_received NUMERIC(14,3) NOT NULL CHECK(quantity_received>0), accepted BOOLEAN NOT NULL DEFAULT TRUE, notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.estate_vendor_bill_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), vendor_bill_id UUID NOT NULL REFERENCES public.estate_vendor_bills(id) ON DELETE CASCADE,
  purchase_order_line_id UUID REFERENCES public.estate_purchase_order_lines(id) ON DELETE SET NULL,
  description TEXT NOT NULL, quantity NUMERIC(14,3) NOT NULL DEFAULT 1 CHECK(quantity>0), unit_price_minor BIGINT NOT NULL CHECK(unit_price_minor>=0), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.estate_procurement_invoice_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), vendor_bill_id UUID NOT NULL UNIQUE REFERENCES public.estate_vendor_bills(id) ON DELETE CASCADE,
  purchase_order_id UUID NOT NULL REFERENCES public.estate_purchase_orders(id) ON DELETE RESTRICT,
  po_total_minor BIGINT NOT NULL, received_total_minor BIGINT NOT NULL, invoice_total_minor BIGINT NOT NULL,
  variance_minor BIGINT NOT NULL, tolerance_minor BIGINT NOT NULL DEFAULT 0, status TEXT NOT NULL CHECK(status IN ('matched','variance','blocked')),
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL, reviewed_at TIMESTAMPTZ, resolution_note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX po_lines_order_idx ON public.estate_purchase_order_lines(purchase_order_id);
CREATE INDEX receipt_lines_receipt_idx ON public.estate_goods_receipt_lines(goods_receipt_id);
CREATE INDEX bill_lines_bill_idx ON public.estate_vendor_bill_lines(vendor_bill_id);
ALTER TABLE public.estate_purchase_order_lines ENABLE ROW LEVEL SECURITY; ALTER TABLE public.estate_goods_receipt_lines ENABLE ROW LEVEL SECURITY; ALTER TABLE public.estate_vendor_bill_lines ENABLE ROW LEVEL SECURITY; ALTER TABLE public.estate_procurement_invoice_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage PO lines" ON public.estate_purchase_order_lines FOR ALL USING(EXISTS(SELECT 1 FROM public.estate_purchase_orders p WHERE p.id=purchase_order_id AND private.is_estate_staff(p.estate_id))) WITH CHECK(EXISTS(SELECT 1 FROM public.estate_purchase_orders p WHERE p.id=purchase_order_id AND private.is_estate_staff(p.estate_id)));
CREATE POLICY "Staff manage receipt lines" ON public.estate_goods_receipt_lines FOR ALL USING(EXISTS(SELECT 1 FROM public.estate_goods_receipts r JOIN public.estate_purchase_orders p ON p.id=r.purchase_order_id WHERE r.id=goods_receipt_id AND private.is_estate_staff(p.estate_id))) WITH CHECK(EXISTS(SELECT 1 FROM public.estate_goods_receipts r JOIN public.estate_purchase_orders p ON p.id=r.purchase_order_id WHERE r.id=goods_receipt_id AND private.is_estate_staff(p.estate_id)));
CREATE POLICY "Finance manages bill lines" ON public.estate_vendor_bill_lines FOR ALL USING(EXISTS(SELECT 1 FROM public.estate_vendor_bills b WHERE b.id=vendor_bill_id AND private.can_manage_estate_finance(b.estate_id))) WITH CHECK(EXISTS(SELECT 1 FROM public.estate_vendor_bills b WHERE b.id=vendor_bill_id AND private.can_manage_estate_finance(b.estate_id)));
CREATE POLICY "Finance manages invoice matches" ON public.estate_procurement_invoice_matches FOR ALL USING(EXISTS(SELECT 1 FROM public.estate_vendor_bills b WHERE b.id=vendor_bill_id AND private.can_manage_estate_finance(b.estate_id))) WITH CHECK(EXISTS(SELECT 1 FROM public.estate_vendor_bills b WHERE b.id=vendor_bill_id AND private.can_manage_estate_finance(b.estate_id)));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.estate_purchase_order_lines,public.estate_goods_receipt_lines,public.estate_vendor_bill_lines,public.estate_procurement_invoice_matches TO authenticated;

CREATE OR REPLACE FUNCTION public.evaluate_procurement_invoice_match(p_vendor_bill_id UUID,p_tolerance_minor BIGINT DEFAULT 0)
RETURNS public.estate_procurement_invoice_matches LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE b public.estate_vendor_bills%ROWTYPE; v_po_total BIGINT; v_received BIGINT; v_invoice BIGINT; v_match public.estate_procurement_invoice_matches%ROWTYPE;
BEGIN
  SELECT * INTO b FROM public.estate_vendor_bills WHERE id=p_vendor_bill_id;
  IF NOT FOUND OR b.purchase_order_id IS NULL THEN RAISE EXCEPTION 'Vendor bill must be linked to a purchase order before matching'; END IF;
  IF NOT private.can_manage_estate_finance(b.estate_id) THEN RAISE EXCEPTION 'Not authorised to match vendor invoices'; END IF;
  SELECT COALESCE(SUM(quantity*unit_price_minor),0)::BIGINT INTO v_po_total FROM public.estate_purchase_order_lines WHERE purchase_order_id=b.purchase_order_id;
  IF v_po_total=0 THEN SELECT amount_minor INTO v_po_total FROM public.estate_purchase_orders WHERE id=b.purchase_order_id; END IF;
  SELECT COALESCE(SUM(grl.quantity_received*pol.unit_price_minor) FILTER (WHERE grl.accepted),0)::BIGINT INTO v_received FROM public.estate_goods_receipt_lines grl JOIN public.estate_goods_receipts gr ON gr.id=grl.goods_receipt_id JOIN public.estate_purchase_order_lines pol ON pol.id=grl.purchase_order_line_id WHERE gr.purchase_order_id=b.purchase_order_id;
  SELECT COALESCE(SUM(quantity*unit_price_minor),b.amount_minor)::BIGINT INTO v_invoice FROM public.estate_vendor_bill_lines WHERE vendor_bill_id=b.id;
  INSERT INTO public.estate_procurement_invoice_matches(vendor_bill_id,purchase_order_id,po_total_minor,received_total_minor,invoice_total_minor,variance_minor,tolerance_minor,status,reviewed_by,reviewed_at)
  VALUES(b.id,b.purchase_order_id,v_po_total,v_received,v_invoice,GREATEST(v_invoice-v_po_total,v_invoice-v_received),p_tolerance_minor,CASE WHEN v_received=0 THEN 'blocked' WHEN v_invoice<=v_po_total+p_tolerance_minor AND v_invoice<=v_received+p_tolerance_minor THEN 'matched' ELSE 'variance' END,auth.uid(),NOW())
  ON CONFLICT(vendor_bill_id) DO UPDATE SET po_total_minor=EXCLUDED.po_total_minor,received_total_minor=EXCLUDED.received_total_minor,invoice_total_minor=EXCLUDED.invoice_total_minor,variance_minor=EXCLUDED.variance_minor,tolerance_minor=EXCLUDED.tolerance_minor,status=EXCLUDED.status,reviewed_by=EXCLUDED.reviewed_by,reviewed_at=EXCLUDED.reviewed_at,updated_at=NOW() RETURNING * INTO v_match;
  RETURN v_match;
END; $$;
REVOKE ALL ON FUNCTION public.evaluate_procurement_invoice_match(UUID,BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluate_procurement_invoice_match(UUID,BIGINT) TO authenticated;
