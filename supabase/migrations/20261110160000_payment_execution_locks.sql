BEGIN;
CREATE FUNCTION public.admin_require_payment_access() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN PERFORM private.require_admin_upgrade_access('payments'); END; $$;
REVOKE ALL ON FUNCTION public.admin_require_payment_access() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_require_payment_access() TO authenticated;
CREATE TABLE public.property_refund_execution_locks (
 transaction_id uuid PRIMARY KEY REFERENCES public.property_transactions(id),amount_minor bigint NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.property_refund_execution_locks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.property_refund_execution_locks FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.property_refund_execution_locks TO authenticated;
CREATE POLICY refund_execution_read ON public.property_refund_execution_locks FOR SELECT TO authenticated USING(public.has_platform_console_grant('payments') AND coalesce(auth.jwt()->>'aal','')='aal2');
CREATE FUNCTION public.claim_property_refund_execution(p_reference text,p_amount bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_tx public.property_transactions%ROWTYPE;v_refunded bigint;v_amount bigint;
BEGIN
 SELECT * INTO v_tx FROM public.property_transactions WHERE provider_reference=p_reference FOR UPDATE;
 IF NOT FOUND OR v_tx.status NOT IN ('success','reversal_pending') THEN RAISE EXCEPTION 'Successful property payment required'; END IF;
 IF EXISTS(SELECT 1 FROM public.property_refunds WHERE transaction_id=v_tx.id AND status IN ('pending','processing','needs_attention')) THEN RAISE EXCEPTION 'Refund already in progress'; END IF;
 SELECT coalesce(sum(amount_minor),0) INTO v_refunded FROM public.property_refunds WHERE transaction_id=v_tx.id AND status='processed';
 v_amount:=coalesce(p_amount,v_tx.amount_minor-v_refunded);
 IF v_amount<=0 OR v_amount>v_tx.amount_minor-v_refunded THEN RAISE EXCEPTION 'Refund exceeds the refundable balance'; END IF;
 INSERT INTO public.property_refund_execution_locks(transaction_id,amount_minor) VALUES(v_tx.id,v_amount);
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'A refund has started or its outcome needs reconciliation. Do not retry until the provider outcome is confirmed.';
END; $$;
CREATE FUNCTION public.finish_property_refund_execution(p_transaction uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.property_refunds WHERE transaction_id=p_transaction) THEN RAISE EXCEPTION 'Refund ledger entry required before releasing execution lock'; END IF;
 DELETE FROM public.property_refund_execution_locks WHERE transaction_id=p_transaction;
END; $$;
REVOKE ALL ON FUNCTION public.claim_property_refund_execution(text,bigint),public.finish_property_refund_execution(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_property_refund_execution(text,bigint),public.finish_property_refund_execution(uuid) TO service_role;
COMMIT;
