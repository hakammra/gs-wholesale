-- ==============================================================================
-- Migration: 001_wholesale_initial_schema.sql
-- Description: Core Schema for GS-Wholesale Computer Products POS
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Company Settings
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT NOT NULL DEFAULT 'GS Wholesale Computer Products',
    tagline TEXT DEFAULT 'Direct Importers & Computer Components Wholesalers',
    tax_number TEXT,
    phone TEXT DEFAULT '+94 77 123 4567',
    whatsapp TEXT DEFAULT '+94 77 123 4567',
    email TEXT DEFAULT 'wholesale@gstechnologies.lk',
    address TEXT DEFAULT '123 Tech Wholesale Plaza, Colombo, Sri Lanka',
    base_currency TEXT NOT NULL DEFAULT 'LKR',
    default_credit_days INT NOT NULL DEFAULT 30,
    min_profit_pct NUMERIC(5,2) NOT NULL DEFAULT 5.00,
    is_tax_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    default_tax_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    default_landed_cost_allocation TEXT NOT NULL DEFAULT 'value' CHECK (default_landed_cost_allocation IN ('value', 'quantity', 'weight', 'volume', 'manual')),
    default_invoice_paper_size TEXT NOT NULL DEFAULT 'A4' CHECK (default_invoice_paper_size IN ('A4', 'A5', '80mm')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Currencies
CREATE TABLE IF NOT EXISTS currencies (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    exchange_rate_to_lkr NUMERIC(12,4) NOT NULL DEFAULT 1.0000,
    is_base BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Categories & Brands
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    country TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Price Tiers
CREATE TABLE IF NOT EXISTS price_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    default_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Products
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_code TEXT NOT NULL UNIQUE,
    barcode TEXT,
    name TEXT NOT NULL,
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    model TEXT,
    description TEXT,
    unit_name TEXT NOT NULL DEFAULT 'Unit',
    pack_size NUMERIC(10,2) NOT NULL DEFAULT 1.00,
    carton_units NUMERIC(10,2) NOT NULL DEFAULT 1.00,
    weight_kg NUMERIC(10,3) DEFAULT 0.000,
    volume_cbm NUMERIC(10,5) DEFAULT 0.00000,
    retail_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    wholesale_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    dealer_price NUMERIC(12,2) DEFAULT 0.00,
    min_order_qty NUMERIC(10,2) NOT NULL DEFAULT 1.00,
    min_profit_pct NUMERIC(5,2) NOT NULL DEFAULT 5.00,
    weighted_cost_lkr NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
    last_landed_cost_lkr NUMERIC(12,4) DEFAULT 0.0000,
    last_purchase_cost_foreign NUMERIC(12,4) DEFAULT 0.0000,
    last_foreign_currency TEXT DEFAULT 'USD',
    low_stock_threshold NUMERIC(10,2) DEFAULT 5.00,
    is_wholesale_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT
);

-- 6. Product Quantity Breaks
CREATE TABLE IF NOT EXISTS product_quantity_breaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    tier_code TEXT DEFAULT 'Standard',
    min_qty NUMERIC(10,2) NOT NULL,
    max_qty NUMERIC(10,2),
    unit_type TEXT NOT NULL DEFAULT 'unit' CHECK (unit_type IN ('unit', 'pack', 'carton')),
    unit_price NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Customers
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code TEXT NOT NULL UNIQUE,
    business_name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    whatsapp TEXT,
    email TEXT,
    billing_address TEXT,
    delivery_address TEXT,
    tax_number TEXT,
    price_tier TEXT NOT NULL DEFAULT 'Standard',
    credit_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    credit_limit NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    credit_days INT NOT NULL DEFAULT 30,
    current_receivable NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    unallocated_credit NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT
);

-- 8. Customer Specific Product Pricing
CREATE TABLE IF NOT EXISTS customer_product_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    custom_price NUMERIC(12,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(customer_id, product_id)
);

-- 9. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'China',
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    default_currency TEXT NOT NULL DEFAULT 'USD',
    default_lead_days INT DEFAULT 14,
    bank_details TEXT,
    current_advance_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    current_payable NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    products_supplied TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT
);

-- 10. Supplier Orders
CREATE TABLE IF NOT EXISTS supplier_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no TEXT NOT NULL UNIQUE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    supplier_pi_no TEXT,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    currency TEXT NOT NULL DEFAULT 'USD',
    exchange_rate_estimate NUMERIC(12,4) NOT NULL DEFAULT 300.0000,
    incoterm TEXT DEFAULT 'FOB',
    expected_shipment_date DATE,
    expected_arrival_date DATE,
    total_foreign_amount NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
    estimated_lkr_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ordered', 'partially_shipped', 'shipped', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT
);

CREATE TABLE IF NOT EXISTS supplier_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_order_id UUID NOT NULL REFERENCES supplier_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    ordered_qty NUMERIC(10,2) NOT NULL CHECK (ordered_qty > 0),
    shipped_qty NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (shipped_qty >= 0),
    foreign_unit_cost NUMERIC(12,4) NOT NULL CHECK (foreign_unit_cost >= 0),
    foreign_total NUMERIC(12,4) NOT NULL CHECK (foreign_total >= 0),
    notes TEXT
);

-- 11. Supplier Advances
CREATE TABLE IF NOT EXISTS supplier_advances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advance_no TEXT NOT NULL UNIQUE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    supplier_order_id UUID REFERENCES supplier_orders(id) ON DELETE SET NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    currency TEXT NOT NULL DEFAULT 'USD',
    foreign_amount NUMERIC(12,4) NOT NULL CHECK (foreign_amount > 0),
    exchange_rate NUMERIC(12,4) NOT NULL CHECK (exchange_rate > 0),
    lkr_amount NUMERIC(12,2) NOT NULL CHECK (lkr_amount > 0),
    payment_method TEXT NOT NULL DEFAULT 'bank' CHECK (payment_method IN ('cash', 'bank', 'other')),
    bank_account_id UUID,
    bank_ref TEXT,
    allocated_lkr_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    unallocated_lkr_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT
);

-- 12. Transit Shipments
CREATE TABLE IF NOT EXISTS transit_shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_no TEXT NOT NULL UNIQUE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    supplier_order_id UUID REFERENCES supplier_orders(id) ON DELETE SET NULL,
    supplier_invoice_ref TEXT,
    shipment_ref TEXT,
    tracking_or_bl_no TEXT,
    courier_freight_company TEXT,
    origin_country TEXT DEFAULT 'China',
    shipping_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_arrival_date DATE,
    currency TEXT NOT NULL DEFAULT 'USD',
    exchange_rate_snapshot NUMERIC(12,4) NOT NULL DEFAULT 300.0000,
    foreign_items_subtotal NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
    total_landed_expenses_lkr NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_estimated_cost_lkr NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'in_transit' CHECK (status IN ('preparing', 'in_transit', 'partially_received', 'received', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT
);

CREATE TABLE IF NOT EXISTS transit_shipment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transit_shipment_id UUID NOT NULL REFERENCES transit_shipments(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    supplier_order_item_id UUID REFERENCES supplier_order_items(id) ON DELETE SET NULL,
    shipped_qty NUMERIC(10,2) NOT NULL CHECK (shipped_qty > 0),
    received_qty NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (received_qty >= 0),
    damaged_qty NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (damaged_qty >= 0),
    foreign_unit_cost NUMERIC(12,4) NOT NULL CHECK (foreign_unit_cost >= 0),
    allocated_landed_lkr_per_unit NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
    final_landed_unit_cost_lkr NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
    weight_kg NUMERIC(10,3) DEFAULT 0.000,
    volume_cbm NUMERIC(10,5) DEFAULT 0.00000,
    notes TEXT
);

-- 13. Landed Costs & Allocations
CREATE TABLE IF NOT EXISTS landed_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cost_no TEXT NOT NULL UNIQUE,
    transit_shipment_id UUID NOT NULL REFERENCES transit_shipments(id) ON DELETE CASCADE,
    expense_type TEXT NOT NULL CHECK (expense_type IN ('freight', 'customs_duty', 'clearing', 'insurance', 'bank_charges', 'local_delivery', 'other')),
    payee TEXT,
    currency TEXT NOT NULL DEFAULT 'LKR',
    foreign_amount NUMERIC(12,4) DEFAULT 0.0000,
    exchange_rate NUMERIC(12,4) NOT NULL DEFAULT 1.0000,
    lkr_amount NUMERIC(12,2) NOT NULL CHECK (lkr_amount >= 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL DEFAULT 'bank',
    bank_account_id UUID,
    reference TEXT,
    allocation_method TEXT NOT NULL DEFAULT 'value' CHECK (allocation_method IN ('value', 'quantity', 'weight', 'volume', 'manual')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS landed_cost_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landed_cost_id UUID NOT NULL REFERENCES landed_costs(id) ON DELETE CASCADE,
    transit_shipment_item_id UUID NOT NULL REFERENCES transit_shipment_items(id) ON DELETE CASCADE,
    allocated_lkr_amount NUMERIC(12,2) NOT NULL,
    allocated_lkr_per_unit NUMERIC(12,4) NOT NULL
);

-- 14. Purchase / Goods Received Notes
CREATE TABLE IF NOT EXISTS purchase_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_no TEXT NOT NULL UNIQUE,
    transit_shipment_id UUID NOT NULL REFERENCES transit_shipments(id) ON DELETE RESTRICT,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    currency TEXT NOT NULL DEFAULT 'USD',
    exchange_rate_snapshot NUMERIC(12,4) NOT NULL,
    foreign_subtotal NUMERIC(12,4) NOT NULL,
    items_lkr_total NUMERIC(12,2) NOT NULL,
    landed_expenses_lkr_total NUMERIC(12,2) NOT NULL,
    total_landed_lkr NUMERIC(12,2) NOT NULL,
    supplier_goods_payable_lkr NUMERIC(12,2) NOT NULL,
    advance_applied_lkr NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    remaining_payable_lkr NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    is_fully_received BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT
);

CREATE TABLE IF NOT EXISTS purchase_receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_receipt_id UUID NOT NULL REFERENCES purchase_receipts(id) ON DELETE CASCADE,
    transit_shipment_item_id UUID REFERENCES transit_shipment_items(id),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    received_sellable_qty NUMERIC(10,2) NOT NULL CHECK (received_sellable_qty >= 0),
    damaged_qty NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (damaged_qty >= 0),
    missing_qty NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (missing_qty >= 0),
    foreign_unit_cost NUMERIC(12,4) NOT NULL,
    allocated_landed_lkr_per_unit NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
    final_landed_unit_cost_lkr NUMERIC(12,4) NOT NULL,
    notes TEXT
);

-- 15. Stock Balances & Movements
CREATE TABLE IF NOT EXISTS stock_balances (
    product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    qty_on_hand NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (qty_on_hand >= 0),
    qty_reserved NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (qty_reserved >= 0),
    qty_available NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (qty_available >= 0),
    qty_in_transit NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (qty_in_transit >= 0),
    qty_damaged NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (qty_damaged >= 0),
    qty_incoming_ordered NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (qty_incoming_ordered >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    movement_type TEXT NOT NULL CHECK (movement_type IN (
        'initial_stock', 'purchase_receipt', 'damaged_receipt', 'sales_invoice',
        'sales_reservation', 'reservation_release', 'sales_return_sellable',
        'sales_return_damaged', 'stock_adjustment', 'stock_transfer'
    )),
    reference_doc_type TEXT NOT NULL,
    reference_doc_id UUID,
    reference_doc_no TEXT,
    qty_change NUMERIC(10,2) NOT NULL,
    unit_cost_snapshot NUMERIC(12,4) DEFAULT 0.0000,
    balance_after NUMERIC(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT
);

-- 16. Sales Documents
CREATE TABLE IF NOT EXISTS sales_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_type TEXT NOT NULL CHECK (doc_type IN ('quotation', 'sales_order', 'sales_invoice', 'credit_note', 'exchange')),
    doc_no TEXT NOT NULL UNIQUE,
    original_invoice_id UUID REFERENCES sales_documents(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
    doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    credit_days INT DEFAULT 0,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    line_discount_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    doc_discount_type TEXT DEFAULT 'amount' CHECK (doc_discount_type IN ('amount', 'percentage')),
    doc_discount_value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    doc_discount_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    tax_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_cost_snapshot NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    gross_profit NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    gross_profit_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('draft', 'confirmed', 'completed', 'partially_paid', 'paid', 'cancelled', 'returned')),
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid', 'credit')),
    margin_override BOOLEAN NOT NULL DEFAULT FALSE,
    margin_override_reason TEXT,
    credit_limit_override BOOLEAN NOT NULL DEFAULT FALSE,
    credit_limit_override_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT
);

CREATE TABLE IF NOT EXISTS sales_document_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_document_id UUID NOT NULL REFERENCES sales_documents(id) ON DELETE CASCADE,
    original_item_id UUID REFERENCES sales_document_items(id),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    qty NUMERIC(10,2) NOT NULL CHECK (qty > 0),
    unit_type TEXT NOT NULL DEFAULT 'unit' CHECK (unit_type IN ('unit', 'pack', 'carton')),
    conversion_factor NUMERIC(10,2) NOT NULL DEFAULT 1.00,
    base_qty NUMERIC(10,2) NOT NULL CHECK (base_qty > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    discount_type TEXT DEFAULT 'amount' CHECK (discount_type IN ('amount', 'percentage')),
    discount_value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    line_discount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    line_total NUMERIC(12,2) NOT NULL CHECK (line_total >= 0),
    unit_cost_snapshot NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
    line_profit NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    line_profit_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    is_exchange_item BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT
);

-- 17. Bank Accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    branch TEXT,
    currency TEXT NOT NULL DEFAULT 'LKR',
    opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    current_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. Cheque Register
CREATE TABLE IF NOT EXISTS cheque_register (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cheque_no TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('received', 'issued')),
    party_type TEXT NOT NULL CHECK (party_type IN ('customer', 'supplier', 'other')),
    party_id UUID,
    payment_id UUID,
    sales_document_id UUID REFERENCES sales_documents(id) ON DELETE SET NULL,
    bank_name TEXT NOT NULL,
    branch TEXT,
    cheque_date DATE NOT NULL,
    received_or_issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'held', 'deposited', 'cleared', 'returned', 'replaced', 'cancelled')),
    deposit_bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
    cleared_date DATE,
    return_date DATE,
    return_reason TEXT,
    replacement_cheque_id UUID REFERENCES cheque_register(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT
);

-- 19. Payments & Allocations
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_no TEXT NOT NULL UNIQUE,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('customer_payment', 'customer_refund', 'supplier_payment', 'supplier_refund', 'expense', 'other_income')),
    party_type TEXT CHECK (party_type IN ('customer', 'supplier', 'other')),
    party_id UUID,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank', 'card', 'cheque', 'customer_credit')),
    bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
    cheque_id UUID REFERENCES cheque_register(id) ON DELETE SET NULL,
    reference TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT
);

ALTER TABLE cheque_register DROP CONSTRAINT IF EXISTS fk_cheque_payment;
ALTER TABLE cheque_register ADD CONSTRAINT fk_cheque_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    sales_document_id UUID REFERENCES sales_documents(id) ON DELETE RESTRICT,
    purchase_receipt_id UUID REFERENCES purchase_receipts(id) ON DELETE RESTRICT,
    allocated_amount NUMERIC(12,2) NOT NULL CHECK (allocated_amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. Double-entry Chart of Accounts & Journals
CREATE TABLE IF NOT EXISTS accounting_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'income', 'expense')),
    subtype TEXT NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounting_journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_no TEXT NOT NULL UNIQUE,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    memo TEXT NOT NULL,
    reference_type TEXT,
    reference_id UUID,
    reference_no TEXT,
    total_debit NUMERIC(12,2) NOT NULL,
    total_credit NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT
);

CREATE TABLE IF NOT EXISTS accounting_journal_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES accounting_journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounting_accounts(id) ON DELETE RESTRICT,
    debit NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    credit NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    description TEXT
);

-- 21. Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_item_code ON products(item_code);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(supplier_code);
CREATE INDEX IF NOT EXISTS idx_sales_docs_doc_no ON sales_documents(doc_no);
CREATE INDEX IF NOT EXISTS idx_sales_docs_customer ON sales_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_docs_date ON sales_documents(doc_date);
CREATE INDEX IF NOT EXISTS idx_cheque_status ON cheque_register(status);
CREATE INDEX IF NOT EXISTS idx_cheque_date ON cheque_register(cheque_date);
CREATE INDEX IF NOT EXISTS idx_transit_status ON transit_shipments(status);
CREATE INDEX IF NOT EXISTS idx_stock_movements_prod ON stock_movements(product_id);
