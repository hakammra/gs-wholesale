-- ==============================================================================
-- Migration: 005_sync_reliability.sql
-- Description: Align the database contract with the application and enable
--              reliable cross-device realtime refreshes.
-- ==============================================================================

BEGIN;

-- These fields are used by the purchase and transit screens to distinguish
-- cash/bank/cheque purchases from supplier credit. Earlier schemas did not
-- contain them, causing the entire insert/update to be rejected by PostgREST.
ALTER TABLE public.transit_shipments
  ADD COLUMN IF NOT EXISTS payment_type TEXT NOT NULL DEFAULT 'credit';
ALTER TABLE public.transit_shipments
  ADD COLUMN IF NOT EXISTS actual_arrival_date DATE;

ALTER TABLE public.purchase_receipts
  ADD COLUMN IF NOT EXISTS payment_type TEXT NOT NULL DEFAULT 'credit';

-- Link cash-flow entries back to their source documents. The client already
-- uses these links for safe reversal/deletion, but the original table omitted
-- them and PostgREST rejected filters against the missing columns.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS sales_doc_id UUID REFERENCES public.sales_documents(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS purchase_id UUID REFERENCES public.purchase_receipts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS transit_shipment_id UUID REFERENCES public.transit_shipments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_payments_sales_doc_id ON public.payments (sales_doc_id);
CREATE INDEX IF NOT EXISTS idx_payments_purchase_id ON public.payments (purchase_id);
CREATE INDEX IF NOT EXISTS idx_payments_transit_shipment_id ON public.payments (transit_shipment_id);

ALTER TABLE public.transit_shipments
  DROP CONSTRAINT IF EXISTS transit_shipments_payment_type_check;
ALTER TABLE public.transit_shipments
  ADD CONSTRAINT transit_shipments_payment_type_check
  CHECK (payment_type IN ('credit', 'cash', 'bank', 'card', 'cheque'));

ALTER TABLE public.purchase_receipts
  DROP CONSTRAINT IF EXISTS purchase_receipts_payment_type_check;
ALTER TABLE public.purchase_receipts
  ADD CONSTRAINT purchase_receipts_payment_type_check
  CHECK (payment_type IN ('credit', 'cash', 'bank', 'card', 'cheque'));

-- The UI keeps richer transaction categories than the original six-value
-- constraint. Preserve those categories so cash-flow records survive reloads.
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_payment_type_check CHECK (payment_type IN (
    'customer_payment', 'customer_settlement', 'customer_advance',
    'sales_receipt', 'customer_refund',
    'supplier_payment', 'supplier_advance', 'purchase_payment',
    'transit_purchase_payment', 'supplier_refund',
    'expense', 'operational_expense', 'other_income', 'direct_income'
  ));

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_party_type_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_party_type_check
  CHECK (party_type IS NULL OR party_type IN ('customer', 'supplier', 'other', 'payee', 'payer'));

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_payment_method_check CHECK (payment_method IN (
    'cash', 'bank', 'card', 'cheque', 'customer_credit', 'credit', 'cod', 'other'
  ));

-- All frequently refreshed tables get stable ordering/filter performance.
CREATE INDEX IF NOT EXISTS idx_sales_documents_updated_at
  ON public.sales_documents (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_updated_at
  ON public.purchase_receipts (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_transit_shipments_updated_at
  ON public.transit_shipments (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_updated_at
  ON public.customers (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_suppliers_updated_at
  ON public.suppliers (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_updated_at
  ON public.products (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_created_at
  ON public.payments (created_at DESC);

-- Supabase Realtime only emits changes for tables in its publication. The
-- guarded block makes this migration safe to rerun.
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'company_settings', 'currencies', 'categories', 'brands', 'products',
    'customers', 'suppliers', 'supplier_orders', 'supplier_order_items',
    'supplier_advances', 'transit_shipments', 'transit_shipment_items',
    'landed_costs', 'purchase_receipts', 'purchase_receipt_items',
    'stock_balances', 'stock_movements', 'sales_documents',
    'sales_document_items', 'bank_accounts', 'cheque_register', 'payments'
  ]
  LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
         FROM pg_publication_tables
         WHERE pubname = 'supabase_realtime'
           AND schemaname = 'public'
           AND tablename = table_name
       ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
    END IF;
  END LOOP;
END $$;

-- Primary keys identify updates/deletes; FULL also gives subscribers the old
-- row for dependable cache invalidation.
ALTER TABLE public.categories REPLICA IDENTITY FULL;
ALTER TABLE public.brands REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.customers REPLICA IDENTITY FULL;
ALTER TABLE public.suppliers REPLICA IDENTITY FULL;
ALTER TABLE public.supplier_orders REPLICA IDENTITY FULL;
ALTER TABLE public.supplier_advances REPLICA IDENTITY FULL;
ALTER TABLE public.transit_shipments REPLICA IDENTITY FULL;
ALTER TABLE public.purchase_receipts REPLICA IDENTITY FULL;
ALTER TABLE public.stock_balances REPLICA IDENTITY FULL;
ALTER TABLE public.sales_documents REPLICA IDENTITY FULL;
ALTER TABLE public.bank_accounts REPLICA IDENTITY FULL;
ALTER TABLE public.cheque_register REPLICA IDENTITY FULL;
ALTER TABLE public.payments REPLICA IDENTITY FULL;

NOTIFY pgrst, 'reload schema';

COMMIT;
