-- ==============================================================================
-- Migration: 003_wholesale_seed_data.sql
-- Description: Default Seed Data for GS-Wholesale POS
-- ==============================================================================

-- 1. Company Settings
INSERT INTO company_settings (
    business_name, tagline, tax_number, phone, whatsapp, email, address,
    base_currency, default_credit_days, min_profit_pct, is_tax_enabled, default_tax_pct,
    default_landed_cost_allocation, default_invoice_paper_size
) VALUES (
    'GS Wholesale Computer Products',
    'Direct Importers & Wholesale Computer Components',
    'VAT-987654321',
    '+94 77 123 4567',
    '+94 77 123 4567',
    'wholesale@gstechnologies.lk',
    'No. 45 First Cross Street, Colombo 11, Sri Lanka',
    'LKR',
    30,
    5.00,
    FALSE,
    0.00,
    'value',
    'A4'
) ON CONFLICT DO NOTHING;

-- 2. Currencies
INSERT INTO currencies (code, name, symbol, exchange_rate_to_lkr, is_base, is_active)
VALUES 
    ('LKR', 'Sri Lankan Rupee', 'Rs.', 1.0000, TRUE, TRUE),
    ('USD', 'US Dollar', '$', 305.5000, FALSE, TRUE),
    ('CNY', 'Chinese Yuan', '¥', 42.8000, FALSE, TRUE),
    ('EUR', 'Euro', '€', 332.0000, FALSE, TRUE),
    ('SGD', 'Singapore Dollar', 'S$', 230.0000, FALSE, TRUE)
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name, symbol = EXCLUDED.symbol, exchange_rate_to_lkr = EXCLUDED.exchange_rate_to_lkr;

-- 3. Price Tiers
INSERT INTO price_tiers (code, name, default_discount_pct, is_active)
VALUES 
    ('Standard', 'Standard Wholesale', 0.00, TRUE),
    ('Tier1', 'Wholesale Tier 1 (Volume)', 3.00, TRUE),
    ('Dealer', 'Authorized Dealer', 5.00, TRUE),
    ('VIP', 'VIP Wholesaler', 8.00, TRUE)
ON CONFLICT (code) DO NOTHING;

-- 4. Chart of Accounts
INSERT INTO accounting_accounts (code, name, type, subtype, is_system)
VALUES
    ('1010', 'Cash on Hand', 'asset', 'cash', TRUE),
    ('1020', 'Bank Accounts (Primary)', 'asset', 'bank', TRUE),
    ('1030', 'Pending Cheques Received', 'asset', 'pending_cheques', TRUE),
    ('1040', 'Accounts Receivable (Wholesale Customers)', 'asset', 'receivable', TRUE),
    ('1050', 'Inventory on Hand (Sellable)', 'asset', 'inventory', TRUE),
    ('1055', 'Damaged / Non-sellable Inventory', 'asset', 'inventory', TRUE),
    ('1060', 'Stock in Transit (Overseas Shipments)', 'asset', 'transit', TRUE),
    ('1070', 'Supplier Advances (Pre-shipment Deposits)', 'asset', 'advances', TRUE),
    ('2010', 'Accounts Payable (Suppliers)', 'liability', 'payable', TRUE),
    ('2020', 'Pending Cheques Issued', 'liability', 'pending_cheques', TRUE),
    ('2030', 'Customer Advances / Unallocated Credit', 'liability', 'customer_credit', TRUE),
    ('2040', 'Taxes Payable', 'liability', 'tax', TRUE),
    ('3010', 'Owner Equity / Capital', 'equity', 'equity', TRUE),
    ('3020', 'Retained Earnings', 'equity', 'equity', TRUE),
    ('4010', 'Wholesale Sales Revenue', 'income', 'sales', TRUE),
    ('4020', 'Other Income / Exchange Gain', 'income', 'other', TRUE),
    ('5010', 'Cost of Goods Sold (COGS)', 'expense', 'cogs', TRUE),
    ('5020', 'Freight & Clearance Expense (Unallocated)', 'expense', 'shipping', TRUE),
    ('5030', 'Damaged & Lost Inventory Expense', 'expense', 'loss', TRUE),
    ('5040', 'Bank Fees & Charges', 'expense', 'operating', TRUE),
    ('5050', 'General & Operating Expenses', 'expense', 'operating', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 5. Bank Accounts (Zero opening balance)
INSERT INTO bank_accounts (account_name, account_number, bank_name, branch, currency, opening_balance, current_balance)
VALUES
    ('Cash on Hand - Main Drawer', 'CASH-001', 'Cash In Hand', 'Head Office', 'LKR', 0.00, 0.00),
    ('Commercial Bank - Wholesale Current', '1000123456', 'Commercial Bank of Ceylon', 'Pettah Branch', 'LKR', 0.00, 0.00),
    ('Sampath Bank - Corporate', '002910004567', 'Sampath Bank PLC', 'City Branch', 'LKR', 0.00, 0.00)
ON CONFLICT DO NOTHING;

-- Clean database ready for custom folder creation, Excel imports, and live wholesale entries.
