-- ==============================================================================
-- Migration: 004_wholesale_allow_anon_access.sql
-- Description: Grant full access permissions and disable RLS restrictions
--              for GS-Wholesale standalone POS operations
-- ==============================================================================

-- Disable RLS or grant permissive policies on all GS-Wholesale tables
ALTER TABLE IF EXISTS company_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS currencies DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS brands DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS price_tiers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS product_quantity_breaks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customer_product_prices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS supplier_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS supplier_order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS supplier_advances DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transit_shipments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transit_shipment_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS landed_costs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS landed_cost_allocations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS purchase_receipts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS purchase_receipt_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stock_balances DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stock_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bank_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cheque_register DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sales_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sales_document_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS returns_exchanges DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS return_exchange_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS accounting_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS accounting_journal_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS accounting_journal_lines DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_log DISABLE ROW LEVEL SECURITY;

-- Grant standard permissions to anon and authenticated roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
