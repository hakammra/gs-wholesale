-- =============================================================================
-- Migration: 006_transaction_integrity.sql
-- Description: Make payments idempotent and link cheque records to every
--              supported source document.
-- Run after 005_sync_reliability.sql.
-- =============================================================================

BEGIN;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS source_key TEXT,
  ADD COLUMN IF NOT EXISTS supplier_advance_id UUID REFERENCES public.supplier_advances(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS landed_cost_id UUID REFERENCES public.landed_costs(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.payments'::regclass
      AND conname = 'payments_source_key_key'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_source_key_key UNIQUE (source_key);
  END IF;
END $$;

ALTER TABLE public.cheque_register
  ADD COLUMN IF NOT EXISTS purchase_receipt_id UUID REFERENCES public.purchase_receipts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transit_shipment_id UUID REFERENCES public.transit_shipments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supplier_advance_id UUID REFERENCES public.supplier_advances(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS landed_cost_id UUID REFERENCES public.landed_costs(id) ON DELETE SET NULL;

ALTER TABLE public.supplier_advances
  DROP CONSTRAINT IF EXISTS supplier_advances_payment_method_check;
ALTER TABLE public.supplier_advances
  ADD CONSTRAINT supplier_advances_payment_method_check
  CHECK (payment_method IN ('cash', 'bank', 'cheque', 'other'));

CREATE INDEX IF NOT EXISTS idx_payments_supplier_advance_id ON public.payments (supplier_advance_id);
CREATE INDEX IF NOT EXISTS idx_payments_landed_cost_id ON public.payments (landed_cost_id);
CREATE INDEX IF NOT EXISTS idx_cheques_payment_id ON public.cheque_register (payment_id);
CREATE INDEX IF NOT EXISTS idx_cheques_purchase_receipt_id ON public.cheque_register (purchase_receipt_id);
CREATE INDEX IF NOT EXISTS idx_cheques_transit_shipment_id ON public.cheque_register (transit_shipment_id);
CREATE INDEX IF NOT EXISTS idx_cheques_supplier_advance_id ON public.cheque_register (supplier_advance_id);
CREATE INDEX IF NOT EXISTS idx_cheques_landed_cost_id ON public.cheque_register (landed_cost_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_purchase_receipts_transit_shipment_id
  ON public.purchase_receipts (transit_shipment_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cheque_register_payment_id
  ON public.cheque_register (payment_id)
  WHERE payment_id IS NOT NULL;

COMMENT ON COLUMN public.payments.source_key IS
  'Stable client-generated source key used to make payment creation idempotent.';

-- Atomic balance changes prevent two devices from overwriting each other's
-- bank update after both read the same earlier balance.
CREATE OR REPLACE FUNCTION public.rpc_adjust_bank_balance(
  p_bank_account_id UUID,
  p_delta NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  UPDATE public.bank_accounts
  SET current_balance = current_balance + p_delta,
      updated_at = NOW()
  WHERE id = p_bank_account_id
  RETURNING current_balance INTO v_balance;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Bank account % was not found', p_bank_account_id;
  END IF;

  RETURN v_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_adjust_bank_balance(UUID, NUMERIC) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.rpc_adjust_stock_balance(
  p_product_id UUID,
  p_qty_on_hand_delta NUMERIC DEFAULT 0,
  p_qty_reserved_delta NUMERIC DEFAULT 0,
  p_qty_in_transit_delta NUMERIC DEFAULT 0,
  p_qty_damaged_delta NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_row public.stock_balances%ROWTYPE;
  v_on_hand NUMERIC;
  v_reserved NUMERIC;
  v_in_transit NUMERIC;
  v_damaged NUMERIC;
BEGIN
  INSERT INTO public.stock_balances (product_id)
  VALUES (p_product_id)
  ON CONFLICT (product_id) DO NOTHING;

  SELECT * INTO v_row
  FROM public.stock_balances
  WHERE product_id = p_product_id
  FOR UPDATE;

  v_on_hand := v_row.qty_on_hand + COALESCE(p_qty_on_hand_delta, 0);
  v_reserved := v_row.qty_reserved + COALESCE(p_qty_reserved_delta, 0);
  v_in_transit := v_row.qty_in_transit + COALESCE(p_qty_in_transit_delta, 0);
  v_damaged := v_row.qty_damaged + COALESCE(p_qty_damaged_delta, 0);

  IF v_on_hand < 0 OR v_reserved < 0 OR v_in_transit < 0 OR v_damaged < 0 THEN
    RAISE EXCEPTION 'Stock update would create a negative balance for product %', p_product_id;
  END IF;

  UPDATE public.stock_balances
  SET qty_on_hand = v_on_hand,
      qty_reserved = v_reserved,
      qty_available = GREATEST(0, v_on_hand - v_reserved),
      qty_in_transit = v_in_transit,
      qty_damaged = v_damaged,
      updated_at = NOW()
  WHERE product_id = p_product_id;

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'qty_on_hand', v_on_hand,
    'qty_reserved', v_reserved,
    'qty_available', GREATEST(0, v_on_hand - v_reserved),
    'qty_in_transit', v_in_transit,
    'qty_damaged', v_damaged
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_adjust_stock_balance(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.rpc_adjust_customer_balance(
  p_customer_id UUID,
  p_receivable_delta NUMERIC DEFAULT 0,
  p_credit_delta NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE v_customer public.customers%ROWTYPE;
BEGIN
  UPDATE public.customers
  SET current_receivable = GREATEST(0, current_receivable + COALESCE(p_receivable_delta, 0)),
      unallocated_credit = GREATEST(0, unallocated_credit + COALESCE(p_credit_delta, 0)),
      updated_at = NOW()
  WHERE id = p_customer_id
  RETURNING * INTO v_customer;
  IF v_customer.id IS NULL THEN RAISE EXCEPTION 'Customer % was not found', p_customer_id; END IF;
  RETURN jsonb_build_object('current_receivable', v_customer.current_receivable, 'unallocated_credit', v_customer.unallocated_credit);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_adjust_supplier_balance(
  p_supplier_id UUID,
  p_payable_delta NUMERIC DEFAULT 0,
  p_advance_delta NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE v_supplier public.suppliers%ROWTYPE;
BEGIN
  UPDATE public.suppliers
  SET current_payable = GREATEST(0, current_payable + COALESCE(p_payable_delta, 0)),
      current_advance_balance = GREATEST(0, current_advance_balance + COALESCE(p_advance_delta, 0)),
      updated_at = NOW()
  WHERE id = p_supplier_id
  RETURNING * INTO v_supplier;
  IF v_supplier.id IS NULL THEN RAISE EXCEPTION 'Supplier % was not found', p_supplier_id; END IF;
  RETURN jsonb_build_object('current_payable', v_supplier.current_payable, 'current_advance_balance', v_supplier.current_advance_balance);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_adjust_customer_balance(UUID, NUMERIC, NUMERIC) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_adjust_supplier_balance(UUID, NUMERIC, NUMERIC) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
