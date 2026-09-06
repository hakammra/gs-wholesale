-- Mixed known-product and unconfirmed-group transit workflow.
-- Run after 008_in_transit_reservations.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS public.transit_product_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS transit_group_id UUID
  REFERENCES public.transit_product_groups(id) ON DELETE SET NULL;

ALTER TABLE public.transit_shipments
  ADD COLUMN IF NOT EXISTS goods_amount_paid_lkr NUMERIC(12,2) NOT NULL DEFAULT 0
  CHECK (goods_amount_paid_lkr >= 0);

UPDATE public.transit_shipments
SET goods_amount_paid_lkr = ROUND(foreign_items_subtotal * exchange_rate_snapshot, 2)
WHERE goods_amount_paid_lkr = 0
  AND foreign_items_subtotal > 0;

ALTER TABLE public.transit_shipment_items
  ALTER COLUMN product_id DROP NOT NULL,
  ALTER COLUMN foreign_unit_cost SET DEFAULT 0;

ALTER TABLE public.transit_shipment_items
  ADD COLUMN IF NOT EXISTS transit_group_id UUID
  REFERENCES public.transit_product_groups(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS line_type TEXT NOT NULL DEFAULT 'known_product';

UPDATE public.transit_shipment_items
SET line_type = CASE WHEN transit_group_id IS NOT NULL THEN 'group' ELSE 'known_product' END;

ALTER TABLE public.transit_shipment_items
  DROP CONSTRAINT IF EXISTS transit_shipment_items_line_type_check;
ALTER TABLE public.transit_shipment_items
  ADD CONSTRAINT transit_shipment_items_line_type_check
  CHECK (line_type IN ('known_product', 'group'));

ALTER TABLE public.transit_shipment_items
  DROP CONSTRAINT IF EXISTS transit_shipment_items_target_check;
ALTER TABLE public.transit_shipment_items
  ADD CONSTRAINT transit_shipment_items_target_check CHECK (
    (line_type = 'known_product' AND product_id IS NOT NULL AND transit_group_id IS NULL)
    OR
    (line_type = 'group' AND transit_group_id IS NOT NULL AND product_id IS NULL)
  );

CREATE INDEX IF NOT EXISTS idx_products_transit_group_id
  ON public.products(transit_group_id);
CREATE INDEX IF NOT EXISTS idx_transit_items_group_id
  ON public.transit_shipment_items(transit_group_id)
  WHERE transit_group_id IS NOT NULL;

ALTER TABLE public.sales_document_items
  ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE public.sales_document_items
  ADD COLUMN IF NOT EXISTS transit_group_id UUID
  REFERENCES public.transit_product_groups(id) ON DELETE RESTRICT;
ALTER TABLE public.sales_document_items
  DROP CONSTRAINT IF EXISTS sales_document_items_target_check;
ALTER TABLE public.sales_document_items
  ADD CONSTRAINT sales_document_items_target_check CHECK (
    (product_id IS NOT NULL AND transit_group_id IS NULL)
    OR
    (product_id IS NULL AND transit_group_id IS NOT NULL)
  );
CREATE INDEX IF NOT EXISTS idx_sales_items_transit_group_id
  ON public.sales_document_items(transit_group_id)
  WHERE transit_group_id IS NOT NULL;

-- Receive one classified product from an unconfirmed group and move the oldest
-- flexible group reservations to that actual product.
CREATE OR REPLACE FUNCTION public.rpc_receive_group_product_and_allocate_reservations(
  p_transit_group_id UUID,
  p_product_id UUID,
  p_sellable_qty NUMERIC,
  p_damaged_qty NUMERIC DEFAULT 0,
  p_unit_cost_lkr NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_stock public.stock_balances%ROWTYPE;
  v_item public.sales_document_items%ROWTYPE;
  v_remaining NUMERIC := GREATEST(0, COALESCE(p_sellable_qty, 0));
  v_allocate NUMERIC;
  v_ratio NUMERIC;
  v_allocated NUMERIC := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.products
    WHERE id = p_product_id AND transit_group_id = p_transit_group_id
  ) THEN
    RAISE EXCEPTION 'Product % does not belong to transit group %', p_product_id, p_transit_group_id;
  END IF;

  INSERT INTO public.stock_balances(product_id)
  VALUES (p_product_id)
  ON CONFLICT (product_id) DO NOTHING;

  SELECT * INTO v_stock
  FROM public.stock_balances
  WHERE product_id = p_product_id
  FOR UPDATE;

  FOR v_item IN
    SELECT item.*
    FROM public.sales_document_items item
    JOIN public.sales_documents document ON document.id = item.sales_document_id
    WHERE item.transit_group_id = p_transit_group_id
      AND item.reserved_in_transit_qty > 0
      AND document.doc_type = 'sales_order'
      AND document.status = 'confirmed'
    ORDER BY document.created_at, item.id
    FOR UPDATE OF item
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_allocate := LEAST(v_item.reserved_in_transit_qty, v_remaining);

    IF v_allocate >= v_item.base_qty THEN
      UPDATE public.sales_document_items
      SET product_id = p_product_id,
          transit_group_id = NULL,
          unit_cost_snapshot = COALESCE(p_unit_cost_lkr, 0),
          line_profit = line_total - (v_allocate * COALESCE(p_unit_cost_lkr, 0)),
          reserved_on_hand_qty = reserved_on_hand_qty + v_allocate,
          reserved_in_transit_qty = GREATEST(0, reserved_in_transit_qty - v_allocate)
      WHERE id = v_item.id;
    ELSE
      v_ratio := v_allocate / v_item.base_qty;
      UPDATE public.sales_document_items
      SET qty = qty - v_allocate,
          base_qty = base_qty - v_allocate,
          reserved_in_transit_qty = reserved_in_transit_qty - v_allocate,
          discount_value = discount_value * (1 - v_ratio),
          line_discount = line_discount * (1 - v_ratio),
          line_total = line_total * (1 - v_ratio),
          line_profit = line_profit * (1 - v_ratio)
      WHERE id = v_item.id;

      INSERT INTO public.sales_document_items(
        sales_document_id, original_item_id, product_id, transit_group_id,
        qty, unit_type, conversion_factor, base_qty, unit_price,
        discount_type, discount_value, line_discount, line_total,
        unit_cost_snapshot, line_profit, line_profit_pct,
        is_exchange_item, reserved_on_hand_qty, reserved_in_transit_qty, notes
      ) VALUES (
        v_item.sales_document_id, v_item.original_item_id, p_product_id, NULL,
        v_allocate, v_item.unit_type, v_item.conversion_factor, v_allocate, v_item.unit_price,
        v_item.discount_type, v_item.discount_value * v_ratio, v_item.line_discount * v_ratio, v_item.line_total * v_ratio,
        COALESCE(p_unit_cost_lkr, 0), (v_item.line_total * v_ratio) - (v_allocate * COALESCE(p_unit_cost_lkr, 0)), v_item.line_profit_pct,
        v_item.is_exchange_item, v_allocate, 0, v_item.notes
      );
    END IF;

    v_remaining := v_remaining - v_allocate;
    v_allocated := v_allocated + v_allocate;
  END LOOP;

  UPDATE public.stock_balances
  SET qty_on_hand = qty_on_hand + COALESCE(p_sellable_qty, 0),
      qty_reserved = qty_reserved + v_allocated,
      qty_available = GREATEST(0, qty_on_hand + COALESCE(p_sellable_qty, 0) - (qty_reserved + v_allocated)),
      qty_damaged = qty_damaged + COALESCE(p_damaged_qty, 0),
      updated_at = NOW()
  WHERE product_id = p_product_id;

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'transit_group_id', p_transit_group_id,
    'allocated_to_reservations', v_allocated,
    'qty_on_hand', v_stock.qty_on_hand + COALESCE(p_sellable_qty, 0),
    'qty_reserved', v_stock.qty_reserved + v_allocated,
    'qty_available', GREATEST(0, v_stock.qty_on_hand + COALESCE(p_sellable_qty, 0) - (v_stock.qty_reserved + v_allocated)),
    'qty_damaged', v_stock.qty_damaged + COALESCE(p_damaged_qty, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_receive_group_product_and_allocate_reservations(UUID, UUID, NUMERIC, NUMERIC, NUMERIC) TO anon, authenticated;

ALTER TABLE public.transit_product_groups DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.transit_product_groups TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'transit_product_groups'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transit_product_groups;
  END IF;
END $$;

ALTER TABLE public.transit_product_groups REPLICA IDENTITY FULL;

NOTIFY pgrst, 'reload schema';

COMMIT;
