-- =============================================================================
-- Migration: 016_retail_store_bridge.sql
-- Description: Secure wholesale-side contract used by the separate Retail POS.
--
-- Retail selling prices are deliberately NOT stored or synchronized here.
-- The wholesale transfer price is current WAC + configured markup, always
-- rounded upward to the configured increment (default: next LKR 50).
-- Retail transfers are credit invoices: no cash/bank payment is manufactured.
-- Run after 015_repair_identified_sales_product_lines.sql.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.retail_bridge_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  markup_percent NUMERIC(7,4) NOT NULL DEFAULT 10.0000 CHECK (markup_percent >= 0),
  round_up_increment NUMERIC(12,2) NOT NULL DEFAULT 50.00 CHECK (round_up_increment > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.retail_bridge_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE CHECK (length(trim(idempotency_key)) >= 8),
  retail_sale_reference TEXT NOT NULL,
  wholesale_document_id UUID UNIQUE REFERENCES public.sales_documents(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed')),
  request_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  response_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_retail_bridge_transactions_reference
  ON public.retail_bridge_transactions (retail_sale_reference);

ALTER TABLE public.retail_bridge_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retail_bridge_transactions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.retail_bridge_settings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.retail_bridge_transactions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.retail_bridge_settings TO service_role;
GRANT ALL ON TABLE public.retail_bridge_transactions TO service_role;

-- Reuse an existing customer if it already has the requested code or business
-- name. Otherwise create the permanent inter-business credit customer.
DO $customer$
DECLARE
  v_customer_id UUID;
BEGIN
  SELECT customer.id
  INTO v_customer_id
  FROM public.customers AS customer
  WHERE customer.customer_code = 'RTL-STORE'
     OR lower(trim(customer.business_name)) = lower('Gatronix Store - Retail')
  ORDER BY (customer.customer_code = 'RTL-STORE') DESC
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (
      customer_code,
      business_name,
      contact_person,
      price_tier,
      credit_allowed,
      credit_limit,
      credit_days,
      notes,
      is_active,
      created_by
    ) VALUES (
      'RTL-STORE',
      'Gatronix Store - Retail',
      'Retail Store',
      'Dealer',
      TRUE,
      999999999.00,
      0,
      'Automatic inter-business customer used by the Retail POS bridge.',
      TRUE,
      'Retail Bridge Setup'
    )
    RETURNING id INTO v_customer_id;
  ELSE
    UPDATE public.customers
    SET business_name = 'Gatronix Store - Retail',
        credit_allowed = TRUE,
        credit_limit = GREATEST(credit_limit, 999999999.00),
        is_active = TRUE,
        updated_at = NOW()
    WHERE id = v_customer_id;
  END IF;

  INSERT INTO public.retail_bridge_settings (
    id,
    enabled,
    customer_id,
    markup_percent,
    round_up_increment
  ) VALUES (
    TRUE,
    TRUE,
    v_customer_id,
    10.0000,
    50.00
  )
  ON CONFLICT (id) DO UPDATE
  SET customer_id = EXCLUDED.customer_id,
      updated_at = NOW();
END;
$customer$;

-- Server-only catalog. WAC is never returned; Retail receives only the current
-- transfer price and availability. Retail keeps and edits its own selling price.
CREATE OR REPLACE FUNCTION public.retail_bridge_catalog()
RETURNS TABLE (
  wholesale_product_id UUID,
  item_code TEXT,
  barcode TEXT,
  product_name TEXT,
  model TEXT,
  description TEXT,
  category_id UUID,
  category_name TEXT,
  unit_name TEXT,
  available_qty NUMERIC,
  transfer_unit_price NUMERIC,
  updated_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    product.id,
    product.item_code,
    product.barcode,
    product.name,
    product.model,
    product.description,
    product.category_id,
    category.name,
    product.unit_name,
    GREATEST(COALESCE(stock.qty_on_hand, 0) - COALESCE(stock.qty_reserved, 0), 0),
    CASE
      WHEN product.weighted_cost_lkr <= 0 THEN 0
      ELSE CEIL(
        (product.weighted_cost_lkr * (1 + settings.markup_percent / 100.0))
        / settings.round_up_increment
      ) * settings.round_up_increment
    END,
    product.updated_at
  FROM public.products AS product
  CROSS JOIN public.retail_bridge_settings AS settings
  LEFT JOIN public.stock_balances AS stock ON stock.product_id = product.id
  LEFT JOIN public.categories AS category ON category.id = product.category_id
  WHERE settings.id = TRUE
    AND settings.enabled
    AND product.is_active
    AND product.is_wholesale_active
  ORDER BY category.sort_order NULLS LAST, category.name NULLS LAST, product.name;
$$;

-- One call creates one complete credit invoice, its cost snapshots and stock
-- movements, and the matching receivable. The idempotency key makes retries
-- return the first result instead of creating duplicate documents.
CREATE OR REPLACE FUNCTION public.retail_bridge_post_sale(
  p_idempotency_key TEXT,
  p_retail_sale_reference TEXT,
  p_items JSONB,
  p_sale_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
-- rpc_post_sales_document predates the hardened migrations and resolves its
-- table names through public, so retain a fixed non-user-controlled path here.
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.retail_bridge_settings%ROWTYPE;
  v_transaction public.retail_bridge_transactions%ROWTYPE;
  v_request_line RECORD;
  v_product public.products%ROWTYPE;
  v_stock public.stock_balances%ROWTYPE;
  v_transfer_price NUMERIC(12,2);
  v_line_total NUMERIC(12,2);
  v_subtotal NUMERIC(12,2) := 0;
  v_items_for_invoice JSONB := '[]'::JSONB;
  v_response_lines JSONB := '[]'::JSONB;
  v_post_result JSONB;
  v_response JSONB;
  v_document_id UUID;
BEGIN
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) < 8 THEN
    RAISE EXCEPTION 'A stable idempotency key of at least 8 characters is required';
  END IF;
  IF p_retail_sale_reference IS NULL OR trim(p_retail_sale_reference) = '' THEN
    RAISE EXCEPTION 'Retail sale reference is required';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one wholesale item is required';
  END IF;

  SELECT * INTO v_settings
  FROM public.retail_bridge_settings
  WHERE id = TRUE
  FOR UPDATE;

  IF NOT FOUND OR NOT v_settings.enabled THEN
    RAISE EXCEPTION 'The Retail POS bridge is disabled';
  END IF;

  INSERT INTO public.retail_bridge_transactions (
    idempotency_key,
    retail_sale_reference,
    request_payload
  ) VALUES (
    trim(p_idempotency_key),
    trim(p_retail_sale_reference),
    jsonb_build_object('sale_date', COALESCE(p_sale_date, CURRENT_DATE), 'items', p_items)
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  SELECT * INTO v_transaction
  FROM public.retail_bridge_transactions
  WHERE idempotency_key = trim(p_idempotency_key)
  FOR UPDATE;

  IF v_transaction.retail_sale_reference <> trim(p_retail_sale_reference) THEN
    RAISE EXCEPTION 'This idempotency key is already assigned to another retail sale';
  END IF;

  IF v_transaction.status = 'completed' AND v_transaction.response_payload IS NOT NULL THEN
    RETURN v_transaction.response_payload;
  END IF;

  -- Product rows are processed in a stable order to avoid deadlocks when two
  -- retail counters sell overlapping products concurrently.
  FOR v_request_line IN
    SELECT line.product_id, SUM(line.qty) AS qty
    FROM jsonb_to_recordset(p_items) AS line(product_id UUID, qty NUMERIC)
    GROUP BY line.product_id
    ORDER BY line.product_id
  LOOP
    IF v_request_line.product_id IS NULL OR v_request_line.qty IS NULL OR v_request_line.qty <= 0 THEN
      RAISE EXCEPTION 'Every retail bridge line requires a product and quantity greater than zero';
    END IF;

    SELECT * INTO v_product
    FROM public.products
    WHERE id = v_request_line.product_id
      AND is_active
      AND is_wholesale_active
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Wholesale product % is unavailable', v_request_line.product_id;
    END IF;
    IF COALESCE(v_product.weighted_cost_lkr, 0) <= 0 THEN
      RAISE EXCEPTION 'Wholesale cost is not set for %', v_product.name;
    END IF;

    INSERT INTO public.stock_balances (product_id)
    VALUES (v_product.id)
    ON CONFLICT (product_id) DO NOTHING;

    SELECT * INTO v_stock
    FROM public.stock_balances
    WHERE product_id = v_product.id
    FOR UPDATE;

    IF GREATEST(v_stock.qty_on_hand - v_stock.qty_reserved, 0) < v_request_line.qty THEN
      RAISE EXCEPTION 'Not enough available wholesale stock for % (available %, requested %)',
        v_product.name,
        GREATEST(v_stock.qty_on_hand - v_stock.qty_reserved, 0),
        v_request_line.qty;
    END IF;

    v_transfer_price := CEIL(
      (v_product.weighted_cost_lkr * (1 + v_settings.markup_percent / 100.0))
      / v_settings.round_up_increment
    ) * v_settings.round_up_increment;
    v_line_total := ROUND(v_request_line.qty * v_transfer_price, 2);
    v_subtotal := v_subtotal + v_line_total;

    v_items_for_invoice := v_items_for_invoice || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'qty', v_request_line.qty,
      'unit_type', 'unit',
      'conversion_factor', 1,
      'base_qty', v_request_line.qty,
      'unit_price', v_transfer_price,
      'discount_type', 'amount',
      'discount_value', 0,
      'line_discount', 0,
      'line_total', v_line_total,
      'notes', 'Automatic transfer to Retail POS sale ' || trim(p_retail_sale_reference)
    ));

    v_response_lines := v_response_lines || jsonb_build_array(jsonb_build_object(
      'wholesale_product_id', v_product.id,
      'item_code', v_product.item_code,
      'product_name', v_product.name,
      'qty', v_request_line.qty,
      'transfer_unit_price', v_transfer_price,
      'line_total', v_line_total
    ));
  END LOOP;

  SELECT public.rpc_post_sales_document(
    p_doc_type => 'sales_invoice',
    p_customer_id => v_settings.customer_id,
    p_doc_date => COALESCE(p_sale_date, CURRENT_DATE),
    p_due_date => COALESCE(p_sale_date, CURRENT_DATE),
    p_credit_days => 0,
    p_subtotal => v_subtotal,
    p_line_discount_total => 0,
    p_doc_discount_type => 'amount',
    p_doc_discount_value => 0,
    p_doc_discount_total => 0,
    p_tax_pct => 0,
    p_tax_total => 0,
    p_grand_total => v_subtotal,
    p_margin_override => FALSE,
    p_margin_override_reason => NULL,
    p_credit_limit_override => TRUE,
    p_credit_limit_override_reason => 'Approved Retail POS inter-business transfer',
    p_notes => 'Automatic credit transfer for Retail POS sale ' || trim(p_retail_sale_reference),
    p_items => v_items_for_invoice,
    p_payments => '[]'::JSONB,
    p_created_by => 'Retail POS Bridge'
  ) INTO v_post_result;

  v_document_id := (v_post_result ->> 'doc_id')::UUID;

  -- Migration 008 uses this marker when reversing or editing receivables.
  UPDATE public.sales_documents
  SET receivable_posted = TRUE,
      updated_at = NOW()
  WHERE id = v_document_id;

  v_response := jsonb_build_object(
    'success', TRUE,
    'idempotency_key', trim(p_idempotency_key),
    'retail_sale_reference', trim(p_retail_sale_reference),
    'wholesale_document_id', v_document_id,
    'wholesale_document_no', v_post_result ->> 'doc_no',
    'wholesale_customer_id', v_settings.customer_id,
    'wholesale_customer_name', 'Gatronix Store - Retail',
    'payment_status', 'credit',
    'currency', 'LKR',
    'transfer_total', v_subtotal,
    'lines', v_response_lines
  );

  UPDATE public.retail_bridge_transactions
  SET wholesale_document_id = v_document_id,
      status = 'completed',
      response_payload = v_response,
      completed_at = NOW()
  WHERE id = v_transaction.id;

  RETURN v_response;
END;
$$;

-- Preserve the app's existing administrator-only reset tools without making
-- the server-only bridge tables generally writable from browser clients.
CREATE OR REPLACE FUNCTION public.admin_reset_retail_bridge(
  p_remove_configuration BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_wholesale_admin() THEN
    RAISE EXCEPTION 'Wholesale administrator access is required';
  END IF;

  DELETE FROM public.retail_bridge_transactions;
  IF COALESCE(p_remove_configuration, FALSE) THEN
    DELETE FROM public.retail_bridge_settings;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.retail_bridge_catalog() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.retail_bridge_post_sale(TEXT, TEXT, JSONB, DATE) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_reset_retail_bridge(BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.retail_bridge_catalog() TO service_role;
GRANT EXECUTE ON FUNCTION public.retail_bridge_post_sale(TEXT, TEXT, JSONB, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_reset_retail_bridge(BOOLEAN) TO authenticated, service_role;

COMMENT ON TABLE public.retail_bridge_settings IS
  'Server-only transfer pricing and Retail POS integration configuration.';
COMMENT ON TABLE public.retail_bridge_transactions IS
  'Idempotency ledger linking Retail POS sales to their wholesale credit invoices.';
COMMENT ON FUNCTION public.retail_bridge_catalog() IS
  'Server-only Retail POS catalog. Returns transfer prices but never exposes wholesale WAC.';
COMMENT ON FUNCTION public.retail_bridge_post_sale(TEXT, TEXT, JSONB, DATE) IS
  'Atomically creates one idempotent wholesale credit sale for a Retail POS transaction.';

NOTIFY pgrst, 'reload schema';

COMMIT;
