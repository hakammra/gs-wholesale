-- Move sellable inventory into damaged inventory and write its audit record
-- in one database transaction. Run this migration after 006_transaction_integrity.sql.

CREATE OR REPLACE FUNCTION public.rpc_mark_stock_damaged(
  p_product_id UUID,
  p_quantity NUMERIC,
  p_reference_no TEXT,
  p_reason TEXT DEFAULT 'Physical damage',
  p_notes TEXT DEFAULT NULL,
  p_movement_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_stock public.stock_balances%ROWTYPE;
  v_product public.products%ROWTYPE;
  v_quantity NUMERIC := COALESCE(p_quantity, 0);
  v_available NUMERIC;
  v_new_on_hand NUMERIC;
  v_new_damaged NUMERIC;
BEGIN
  IF v_quantity <= 0 THEN
    RAISE EXCEPTION 'Damaged quantity must be greater than zero';
  END IF;

  IF p_reference_no IS NULL OR BTRIM(p_reference_no) = '' THEN
    RAISE EXCEPTION 'A damage reference number is required';
  END IF;

  INSERT INTO public.stock_balances (product_id)
  VALUES (p_product_id)
  ON CONFLICT (product_id) DO NOTHING;

  SELECT * INTO v_stock
  FROM public.stock_balances
  WHERE product_id = p_product_id
  FOR UPDATE;

  SELECT * INTO v_product
  FROM public.products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product % was not found', p_product_id;
  END IF;

  v_available := GREATEST(0, v_stock.qty_on_hand - v_stock.qty_reserved);
  IF v_quantity > v_available THEN
    RAISE EXCEPTION 'Only % sellable units are available to mark as damaged', v_available;
  END IF;

  v_new_on_hand := v_stock.qty_on_hand - v_quantity;
  v_new_damaged := v_stock.qty_damaged + v_quantity;

  UPDATE public.stock_balances
  SET qty_on_hand = v_new_on_hand,
      qty_available = GREATEST(0, v_new_on_hand - qty_reserved),
      qty_damaged = v_new_damaged,
      updated_at = NOW()
  WHERE product_id = p_product_id;

  INSERT INTO public.stock_movements (
    product_id,
    movement_type,
    reference_doc_type,
    reference_doc_no,
    qty_change,
    unit_cost_snapshot,
    balance_after,
    notes,
    created_at
  ) VALUES (
    p_product_id,
    'stock_adjustment',
    'inventory_damage',
    p_reference_no,
    -v_quantity,
    COALESCE(v_product.weighted_cost_lkr, 0),
    v_new_on_hand,
    CONCAT_WS(' | ', 'Moved to damaged stock', NULLIF(BTRIM(COALESCE(p_reason, '')), ''), NULLIF(BTRIM(COALESCE(p_notes, '')), '')),
    COALESCE(p_movement_date, CURRENT_DATE)::TIMESTAMPTZ
  );

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'reference_no', p_reference_no,
    'quantity', v_quantity,
    'qty_on_hand', v_new_on_hand,
    'qty_reserved', v_stock.qty_reserved,
    'qty_available', GREATEST(0, v_new_on_hand - v_stock.qty_reserved),
    'qty_in_transit', v_stock.qty_in_transit,
    'qty_damaged', v_new_damaged,
    'unit_cost_snapshot', COALESCE(v_product.weighted_cost_lkr, 0),
    'notes', CONCAT_WS(' | ', 'Moved to damaged stock', NULLIF(BTRIM(COALESCE(p_reason, '')), ''), NULLIF(BTRIM(COALESCE(p_notes, '')), '')),
    'created_at', COALESCE(p_movement_date, CURRENT_DATE)::TIMESTAMPTZ
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_mark_stock_damaged(UUID, NUMERIC, TEXT, TEXT, TEXT, DATE) TO anon, authenticated;

