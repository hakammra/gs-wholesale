-- =============================================================================
-- Migration: 013_secure_authenticated_data_access.sql
-- Description: Replace the temporary anonymous-access compatibility rules with
--              database-enforced email + staff PIN authorization.
-- Run after 012_backfill_sales_cost_snapshots.sql.
-- =============================================================================

BEGIN;

-- A signed-in email is only useful after a valid staff PIN has unlocked the
-- current Supabase Auth session. These helpers are SECURITY DEFINER so they can
-- inspect the three private access-control tables, which remain inaccessible
-- through the Data API.
CREATE OR REPLACE FUNCTION public.is_wholesale_staff()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.wholesale_security_owner AS owner
      WHERE owner.id = TRUE
        AND owner.auth_user_id = auth.uid()
    )
    AND public.current_wholesale_staff_id() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.is_wholesale_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    public.is_wholesale_staff()
    AND EXISTS (
      SELECT 1
      FROM public.wholesale_staff AS staff
      WHERE staff.id = public.current_wholesale_staff_id()
        AND staff.role = 'admin'
        AND staff.is_active
    );
$$;

-- Remove the broad grants introduced by 004_wholesale_allow_anon_access.sql.
-- Authenticated users receive table privileges below, while RLS decides which
-- operations their active staff PIN is allowed to perform.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- Existing and future server-side service-role work remains unrestricted.
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Business tables: an unlocked viewer or admin may read; only an unlocked
-- administrator may insert, update, or delete. The access-control tables are
-- deliberately absent from this list and keep their direct-access revocations.
-- First enable RLS on every current public table so an older or manually added
-- table cannot remain exposed merely because it is not used by this app build.
DO $enable_rls$
DECLARE
  table_name TEXT;
BEGIN
  FOR table_name IN
    SELECT tables.tablename
    FROM pg_catalog.pg_tables AS tables
    WHERE tables.schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END;
$enable_rls$;

DO $policies$
DECLARE
  table_name TEXT;
  business_tables CONSTANT TEXT[] := ARRAY[
    'company_settings',
    'currencies',
    'categories',
    'brands',
    'price_tiers',
    'products',
    'product_quantity_breaks',
    'customers',
    'customer_product_prices',
    'suppliers',
    'supplier_orders',
    'supplier_order_items',
    'supplier_advances',
    'transit_shipments',
    'transit_shipment_items',
    'transit_product_groups',
    'landed_costs',
    'landed_cost_allocations',
    'purchase_receipts',
    'purchase_receipt_items',
    'stock_balances',
    'stock_movements',
    'bank_accounts',
    'cheque_register',
    'payments',
    'payment_allocations',
    'sales_documents',
    'sales_document_items',
    'returns_exchanges',
    'return_exchange_items',
    'accounting_accounts',
    'accounting_journal_entries',
    'accounting_journal_lines',
    'audit_log'
  ];
BEGIN
  FOREACH table_name IN ARRAY business_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NULL THEN
      RAISE NOTICE 'Optional business table public.% is not installed; skipping', table_name;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated',
      table_name
    );

    EXECUTE format('DROP POLICY IF EXISTS wholesale_staff_read ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS wholesale_admin_insert ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS wholesale_admin_update ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS wholesale_admin_delete ON public.%I', table_name);

    EXECUTE format(
      'CREATE POLICY wholesale_staff_read ON public.%I FOR SELECT TO authenticated USING ((SELECT public.is_wholesale_staff()))',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY wholesale_admin_insert ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_wholesale_admin()))',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY wholesale_admin_update ON public.%I FOR UPDATE TO authenticated USING ((SELECT public.is_wholesale_admin())) WITH CHECK ((SELECT public.is_wholesale_admin()))',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY wholesale_admin_delete ON public.%I FOR DELETE TO authenticated USING ((SELECT public.is_wholesale_admin()))',
      table_name
    );
  END LOOP;
END;
$policies$;

-- UUID defaults do not currently need sequences, but retaining authenticated
-- sequence usage makes this migration safe if a business table later gains an
-- identity column. RLS still controls the corresponding table operation.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Only the public application API is executable from a signed-in client.
-- Private helpers stay callable by the SECURITY DEFINER functions and policies,
-- but cannot be invoked directly over PostgREST.
GRANT EXECUTE ON FUNCTION public.is_wholesale_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_wholesale_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_wholesale_security_state() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_wholesale_staff_for_unlock() TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_wholesale_staff(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lock_wholesale_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_wholesale_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_wholesale_staff(UUID, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

-- Transaction/inventory RPCs intentionally run as the caller. This makes their
-- writes pass through the same admin-only RLS policies as direct table changes.
ALTER FUNCTION public.rpc_adjust_bank_balance(UUID, NUMERIC) SECURITY INVOKER;
ALTER FUNCTION public.rpc_adjust_stock_balance(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC) SECURITY INVOKER;
ALTER FUNCTION public.rpc_adjust_customer_balance(UUID, NUMERIC, NUMERIC) SECURITY INVOKER;
ALTER FUNCTION public.rpc_adjust_supplier_balance(UUID, NUMERIC, NUMERIC) SECURITY INVOKER;
ALTER FUNCTION public.rpc_mark_stock_damaged(UUID, NUMERIC, TEXT, TEXT, TEXT, DATE) SECURITY INVOKER;
ALTER FUNCTION public.rpc_adjust_stock_reservation(UUID, NUMERIC, NUMERIC) SECURITY INVOKER;
ALTER FUNCTION public.rpc_receive_product_and_allocate_reservations(UUID, NUMERIC, NUMERIC, NUMERIC) SECURITY INVOKER;
ALTER FUNCTION public.rpc_receive_group_product_and_allocate_reservations(UUID, UUID, NUMERIC, NUMERIC, NUMERIC) SECURITY INVOKER;

GRANT EXECUTE ON FUNCTION public.rpc_adjust_bank_balance(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_adjust_stock_balance(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_adjust_customer_balance(UUID, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_adjust_supplier_balance(UUID, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_mark_stock_damaged(UUID, NUMERIC, TEXT, TEXT, TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_adjust_stock_reservation(UUID, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_receive_product_and_allocate_reservations(UUID, NUMERIC, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_receive_group_product_and_allocate_reservations(UUID, UUID, NUMERIC, NUMERIC, NUMERIC) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
