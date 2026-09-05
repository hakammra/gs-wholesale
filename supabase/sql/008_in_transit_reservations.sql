-- Reserve customer orders against either current stock or incoming stock.
-- Run after 007_inventory_damage_workflow.sql.

BEGIN;

ALTER TABLE public.stock_balances
  ADD COLUMN IF NOT EXISTS qty_in_transit_reserved NUMERIC(10,2) NOT NULL DEFAULT 0.00
  CHECK (qty_in_transit_reserved >= 0);

ALTER TABLE public.sales_documents
  ADD COLUMN IF NOT EXISTS reservation_source TEXT
  CHECK (reservation_source IS NULL OR reservation_source IN ('on_hand', 'incoming'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sales_documents'
      AND column_name = 'receivable_posted'
  ) THEN
    ALTER TABLE public.sales_documents
      ADD COLUMN receivable_posted BOOLEAN NOT NULL DEFAULT FALSE;

    -- Earlier app versions posted the unpaid balance of both invoices and
    -- active reservations to the customer account. Track those rows so
    -- cancellation or conversion can reverse them exactly once.
    UPDATE public.sales_documents
    SET receivable_posted = TRUE
    WHERE balance_due > 0
      AND (
        (doc_type = 'sales_invoice' AND status <> 'cancelled')
        OR (doc_type = 'sales_order' AND status = 'confirmed')
      );
  END IF;
END $$;

ALTER TABLE public.sales_document_items
  ADD COLUMN IF NOT EXISTS reserved_on_hand_qty NUMERIC(10,2) NOT NULL DEFAULT 0.00
  CHECK (reserved_on_hand_qty >= 0),
  ADD COLUMN IF NOT EXISTS reserved_in_transit_qty NUMERIC(10,2) NOT NULL DEFAULT 0.00
  CHECK (reserved_in_transit_qty >= 0);

-- Existing confirmed sales orders were reserved from on-hand stock by the old app.
UPDATE public.sales_documents
SET reservation_source = 'on_hand'
WHERE doc_type = 'sales_order'
  AND status = 'confirmed'
  AND reservation_source IS NULL;

UPDATE public.sales_document_items item
SET reserved_on_hand_qty = item.base_qty,
    reserved_in_transit_qty = 0
FROM public.sales_documents document
WHERE item.sales_document_id = document.id
  AND document.doc_type = 'sales_order'
  AND document.status = 'confirmed'
  AND item.reserved_on_hand_qty = 0
  AND item.reserved_in_transit_qty = 0;

CREATE INDEX IF NOT EXISTS idx_sales_document_items_incoming_reservation
  ON public.sales_document_items (product_id, sales_document_id)
  WHERE reserved_in_transit_qty > 0;

CREATE OR REPLACE FUNCTION public.rpc_adjust_stock_reservation(
  p_product_id UUID,
  p_on_hand_reserved_delta NUMERIC DEFAULT 0,
  p_in_transit_reserved_delta NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_row public.stock_balances%ROWTYPE;
  v_on_hand_reserved NUMERIC;
  v_in_transit_reserved NUMERIC;
BEGIN
  INSERT INTO public.stock_balances (product_id)
  VALUES (p_product_id)
  ON CONFLICT (product_id) DO NOTHING;

  SELECT * INTO v_row
  FROM public.stock_balances
  WHERE product_id = p_product_id
  FOR UPDATE;

  v_on_hand_reserved := v_row.qty_reserved + COALESCE(p_on_hand_reserved_delta, 0);
  v_in_transit_reserved := v_row.qty_in_transit_reserved + COALESCE(p_in_transit_reserved_delta, 0);

  IF v_on_hand_reserved < 0 OR v_on_hand_reserved > v_row.qty_on_hand THEN
    RAISE EXCEPTION 'On-hand reservation exceeds available stock for product %', p_product_id;
  END IF;

  IF v_in_transit_reserved < 0 OR v_in_transit_reserved > v_row.qty_in_transit THEN
    RAISE EXCEPTION 'Incoming reservation exceeds unreserved in-transit stock for product %', p_product_id;
  END IF;

  UPDATE public.stock_balances
  SET qty_reserved = v_on_hand_reserved,
      qty_in_transit_reserved = v_in_transit_reserved,
      qty_available = GREATEST(0, qty_on_hand - v_on_hand_reserved),
      updated_at = NOW()
  WHERE product_id = p_product_id;

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'qty_on_hand', v_row.qty_on_hand,
    'qty_reserved', v_on_hand_reserved,
    'qty_available', GREATEST(0, v_row.qty_on_hand - v_on_hand_reserved),
    'qty_in_transit', v_row.qty_in_transit,
    'qty_in_transit_reserved', v_in_transit_reserved,
    'qty_damaged', v_row.qty_damaged
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_adjust_stock_reservation(UUID, NUMERIC, NUMERIC) TO anon, authenticated;

-- Receive one product and transfer the arrived part of the oldest incoming
-- reservations into normal on-hand reservations in the same transaction.
CREATE OR REPLACE FUNCTION public.rpc_receive_product_and_allocate_reservations(
  p_product_id UUID,
  p_sellable_qty NUMERIC,
  p_shipped_qty NUMERIC,
  p_damaged_qty NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_row public.stock_balances%ROWTYPE;
  v_item RECORD;
  v_new_on_hand NUMERIC;
  v_new_in_transit NUMERIC;
  v_new_damaged NUMERIC;
  v_to_allocate NUMERIC;
  v_line_allocate NUMERIC;
  v_allocated NUMERIC := 0;
BEGIN
  INSERT INTO public.stock_balances (product_id)
  VALUES (p_product_id)
  ON CONFLICT (product_id) DO NOTHING;

  SELECT * INTO v_row
  FROM public.stock_balances
  WHERE product_id = p_product_id
  FOR UPDATE;

  v_new_on_hand := v_row.qty_on_hand + COALESCE(p_sellable_qty, 0);
  v_new_in_transit := v_row.qty_in_transit - COALESCE(p_shipped_qty, 0);
  v_new_damaged := v_row.qty_damaged + COALESCE(p_damaged_qty, 0);

  IF v_new_in_transit < 0 THEN
    RAISE EXCEPTION 'Receiving would create negative in-transit stock for product %', p_product_id;
  END IF;

  v_to_allocate := LEAST(
    COALESCE(p_sellable_qty, 0),
    v_row.qty_in_transit_reserved,
    GREATEST(0, v_new_on_hand - v_row.qty_reserved)
  );

  FOR v_item IN
    SELECT item.id, item.reserved_in_transit_qty
    FROM public.sales_document_items item
    JOIN public.sales_documents document ON document.id = item.sales_document_id
    WHERE item.product_id = p_product_id
      AND item.reserved_in_transit_qty > 0
      AND document.doc_type = 'sales_order'
      AND document.status = 'confirmed'
    ORDER BY document.created_at, item.id
    FOR UPDATE OF item
  LOOP
    EXIT WHEN v_to_allocate <= 0;
    v_line_allocate := LEAST(v_item.reserved_in_transit_qty, v_to_allocate);

    UPDATE public.sales_document_items
    SET reserved_in_transit_qty = reserved_in_transit_qty - v_line_allocate,
        reserved_on_hand_qty = reserved_on_hand_qty + v_line_allocate
    WHERE id = v_item.id;

    v_to_allocate := v_to_allocate - v_line_allocate;
    v_allocated := v_allocated + v_line_allocate;
  END LOOP;

  UPDATE public.stock_balances
  SET qty_on_hand = v_new_on_hand,
      qty_reserved = qty_reserved + v_allocated,
      qty_available = GREATEST(0, v_new_on_hand - (qty_reserved + v_allocated)),
      qty_in_transit = v_new_in_transit,
      qty_in_transit_reserved = GREATEST(0, qty_in_transit_reserved - v_allocated),
      qty_damaged = v_new_damaged,
      updated_at = NOW()
  WHERE product_id = p_product_id;

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'allocated_to_reservations', v_allocated,
    'qty_on_hand', v_new_on_hand,
    'qty_reserved', v_row.qty_reserved + v_allocated,
    'qty_available', GREATEST(0, v_new_on_hand - (v_row.qty_reserved + v_allocated)),
    'qty_in_transit', v_new_in_transit,
    'qty_in_transit_reserved', GREATEST(0, v_row.qty_in_transit_reserved - v_allocated),
    'qty_damaged', v_new_damaged
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_receive_product_and_allocate_reservations(UUID, NUMERIC, NUMERIC, NUMERIC) TO anon, authenticated;

-- Keep generic stock changes from consuming stock already promised to customers.
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

  IF v_reserved > v_on_hand THEN
    RAISE EXCEPTION 'Stock update would consume on-hand stock reserved for product %', p_product_id;
  END IF;

  IF v_in_transit < v_row.qty_in_transit_reserved THEN
    RAISE EXCEPTION 'Stock update would consume incoming stock reserved for product %', p_product_id;
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
    'qty_in_transit_reserved', v_row.qty_in_transit_reserved,
    'qty_damaged', v_damaged
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_adjust_stock_balance(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
