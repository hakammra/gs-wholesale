-- ==============================================================================
-- Migration: 002_wholesale_functions_rpcs.sql
-- Description: Transactional Functions & RPCs for GS-Wholesale POS
-- ==============================================================================

-- 1. Helper Function: Generate Document Number
CREATE OR REPLACE FUNCTION generate_document_number(p_prefix TEXT)
RETURNS TEXT AS $$
DECLARE
    v_year_month TEXT;
    v_seq INT;
    v_doc_no TEXT;
BEGIN
    v_year_month := TO_CHAR(CURRENT_DATE, 'YYYYMM');
    SELECT COALESCE(MAX(SUBSTRING(doc_no FROM LENGTH(p_prefix) + 8)::INT), 0) + 1
    INTO v_seq
    FROM sales_documents
    WHERE doc_no LIKE p_prefix || '-' || v_year_month || '-%';

    IF v_seq IS NULL THEN
        v_seq := 1;
    END IF;

    v_doc_no := p_prefix || '-' || v_year_month || '-' || LPAD(v_seq::TEXT, 4, '0');
    RETURN v_doc_no;
END;
$$ LANGUAGE plpgsql;

-- 2. RPC: Post Sales Document
CREATE OR REPLACE FUNCTION rpc_post_sales_document(
    p_doc_type TEXT,
    p_customer_id UUID,
    p_doc_date DATE,
    p_due_date DATE,
    p_credit_days INT,
    p_subtotal NUMERIC,
    p_line_discount_total NUMERIC,
    p_doc_discount_type TEXT,
    p_doc_discount_value NUMERIC,
    p_doc_discount_total NUMERIC,
    p_tax_pct NUMERIC,
    p_tax_total NUMERIC,
    p_grand_total NUMERIC,
    p_margin_override BOOLEAN,
    p_margin_override_reason TEXT,
    p_credit_limit_override BOOLEAN,
    p_credit_limit_override_reason TEXT,
    p_notes TEXT,
    p_items JSONB,
    p_payments JSONB,
    p_created_by TEXT DEFAULT 'Owner'
)
RETURNS JSONB AS $$
DECLARE
    v_doc_id UUID;
    v_doc_prefix TEXT;
    v_doc_no TEXT;
    v_item RECORD;
    v_payment RECORD;
    v_total_paid NUMERIC := 0.00;
    v_balance_due NUMERIC := 0.00;
    v_total_cost NUMERIC := 0.00;
    v_gross_profit NUMERIC := 0.00;
    v_gross_profit_pct NUMERIC := 0.00;
    v_current_stock stock_balances%ROWTYPE;
    v_product products%ROWTYPE;
    v_cust customers%ROWTYPE;
    v_status TEXT := 'completed';
    v_payment_status TEXT := 'unpaid';
    v_cheque_id UUID;
    v_pay_id UUID;
    v_pay_no TEXT;
    v_wac NUMERIC;
BEGIN
    CASE p_doc_type
        WHEN 'quotation' THEN v_doc_prefix := 'QT'; v_status := 'draft';
        WHEN 'sales_order' THEN v_doc_prefix := 'SO'; v_status := 'confirmed';
        WHEN 'sales_invoice' THEN v_doc_prefix := 'INV'; v_status := 'completed';
        WHEN 'credit_note' THEN v_doc_prefix := 'CN'; v_status := 'completed';
        WHEN 'exchange' THEN v_doc_prefix := 'EX'; v_status := 'completed';
        ELSE RAISE EXCEPTION 'Invalid document type: %', p_doc_type;
    END CASE;

    v_doc_no := generate_document_number(v_doc_prefix);

    IF p_customer_id IS NOT NULL THEN
        SELECT * INTO v_cust FROM customers WHERE id = p_customer_id FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Customer not found';
        END IF;

        IF p_doc_type = 'sales_invoice' AND NOT p_credit_limit_override THEN
            IF (v_cust.current_receivable + p_grand_total) > v_cust.credit_limit AND v_cust.credit_limit > 0 THEN
                RAISE EXCEPTION 'Customer credit limit exceeded (Limit: %, Current: %, Invoice: %). Override required.',
                    v_cust.credit_limit, v_cust.current_receivable, p_grand_total;
            END IF;
        END IF;
    END IF;

    IF p_payments IS NOT NULL AND jsonb_array_length(p_payments) > 0 THEN
        FOR v_payment IN SELECT * FROM jsonb_to_recordset(p_payments) AS x(
            amount NUMERIC, payment_method TEXT, bank_account_id UUID,
            cheque_no TEXT, cheque_bank TEXT, cheque_branch TEXT, cheque_date DATE, notes TEXT
        ) LOOP
            v_total_paid := v_total_paid + COALESCE(v_payment.amount, 0);
        END LOOP;
    END IF;

    v_balance_due := p_grand_total - v_total_paid;
    IF v_balance_due < 0 THEN
        v_balance_due := 0;
    END IF;

    IF v_total_paid >= p_grand_total THEN
        v_payment_status := 'paid';
    ELSIF v_total_paid > 0 THEN
        v_payment_status := 'partially_paid';
    ELSE
        IF p_doc_type = 'sales_invoice' THEN
            v_payment_status := 'credit';
        ELSE
            v_payment_status := 'unpaid';
        END IF;
    END IF;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        product_id UUID, qty NUMERIC, unit_type TEXT, conversion_factor NUMERIC,
        base_qty NUMERIC, unit_price NUMERIC, discount_type TEXT, discount_value NUMERIC,
        line_discount NUMERIC, line_total NUMERIC, notes TEXT
    ) LOOP
        SELECT * INTO v_product FROM products WHERE id = v_item.product_id;
        v_wac := COALESCE(v_product.weighted_cost_lkr, 0);
        v_total_cost := v_total_cost + (v_wac * v_item.base_qty);
    END LOOP;

    v_gross_profit := p_grand_total - p_tax_total - v_total_cost;
    IF (p_grand_total - p_tax_total) > 0 THEN
        v_gross_profit_pct := ROUND((v_gross_profit / (p_grand_total - p_tax_total)) * 100, 2);
    END IF;

    INSERT INTO sales_documents (
        doc_type, doc_no, customer_id, doc_date, due_date, credit_days,
        subtotal, line_discount_total, doc_discount_type, doc_discount_value, doc_discount_total,
        tax_pct, tax_total, grand_total, paid_amount, balance_due,
        total_cost_snapshot, gross_profit, gross_profit_pct, status, payment_status,
        margin_override, margin_override_reason, credit_limit_override, credit_limit_override_reason,
        notes, created_by
    ) VALUES (
        p_doc_type, v_doc_no, p_customer_id, p_doc_date, p_due_date, p_credit_days,
        p_subtotal, p_line_discount_total, p_doc_discount_type, p_doc_discount_value, p_doc_discount_total,
        p_tax_pct, p_tax_total, p_grand_total, v_total_paid, v_balance_due,
        v_total_cost, v_gross_profit, v_gross_profit_pct, v_status, v_payment_status,
        p_margin_override, p_margin_override_reason, p_credit_limit_override, p_credit_limit_override_reason,
        p_notes, p_created_by
    ) RETURNING id INTO v_doc_id;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        product_id UUID, qty NUMERIC, unit_type TEXT, conversion_factor NUMERIC,
        base_qty NUMERIC, unit_price NUMERIC, discount_type TEXT, discount_value NUMERIC,
        line_discount NUMERIC, line_total NUMERIC, notes TEXT
    ) LOOP
        SELECT * INTO v_product FROM products WHERE id = v_item.product_id;
        v_wac := COALESCE(v_product.weighted_cost_lkr, 0);

        INSERT INTO sales_document_items (
            sales_document_id, product_id, qty, unit_type, conversion_factor,
            base_qty, unit_price, discount_type, discount_value, line_discount,
            line_total, unit_cost_snapshot, line_profit, line_profit_pct, notes
        ) VALUES (
            v_doc_id, v_item.product_id, v_item.qty, COALESCE(v_item.unit_type, 'unit'), COALESCE(v_item.conversion_factor, 1),
            v_item.base_qty, v_item.unit_price, COALESCE(v_item.discount_type, 'amount'), COALESCE(v_item.discount_value, 0),
            COALESCE(v_item.line_discount, 0), v_item.line_total, v_wac,
            (v_item.line_total - (v_wac * v_item.base_qty)),
            CASE WHEN v_item.line_total > 0 THEN ROUND(((v_item.line_total - (v_wac * v_item.base_qty)) / v_item.line_total) * 100, 2) ELSE 0 END,
            v_item.notes
        );

        INSERT INTO stock_balances (product_id, qty_on_hand, qty_reserved, qty_available)
        VALUES (v_item.product_id, 0, 0, 0)
        ON CONFLICT (product_id) DO NOTHING;

        SELECT * INTO v_current_stock FROM stock_balances WHERE product_id = v_item.product_id FOR UPDATE;

        IF p_doc_type = 'sales_invoice' THEN
            IF v_current_stock.qty_available < v_item.base_qty THEN
                RAISE EXCEPTION 'Insufficient stock for product % (Available: %, Requested: %)',
                    v_product.name, v_current_stock.qty_available, v_item.base_qty;
            END IF;

            UPDATE stock_balances
            SET qty_on_hand = qty_on_hand - v_item.base_qty,
                qty_available = (qty_on_hand - v_item.base_qty) - qty_reserved,
                updated_at = NOW()
            WHERE product_id = v_item.product_id;

            INSERT INTO stock_movements (
                product_id, movement_type, reference_doc_type, reference_doc_id, reference_doc_no,
                qty_change, unit_cost_snapshot, balance_after, created_by
            ) VALUES (
                v_item.product_id, 'sales_invoice', 'sales_invoice', v_doc_id, v_doc_no,
                -v_item.base_qty, v_wac, (v_current_stock.qty_on_hand - v_item.base_qty), p_created_by
            );

        ELSIF p_doc_type = 'sales_order' THEN
            IF v_current_stock.qty_available < v_item.base_qty THEN
                RAISE EXCEPTION 'Insufficient stock to reserve for product % (Available: %, Requested: %)',
                    v_product.name, v_current_stock.qty_available, v_item.base_qty;
            END IF;

            UPDATE stock_balances
            SET qty_reserved = qty_reserved + v_item.base_qty,
                qty_available = qty_on_hand - (qty_reserved + v_item.base_qty),
                updated_at = NOW()
            WHERE product_id = v_item.product_id;

            INSERT INTO stock_movements (
                product_id, movement_type, reference_doc_type, reference_doc_id, reference_doc_no,
                qty_change, unit_cost_snapshot, balance_after, created_by
            ) VALUES (
                v_item.product_id, 'sales_reservation', 'sales_order', v_doc_id, v_doc_no,
                0, v_wac, v_current_stock.qty_on_hand, p_created_by
            );
        END IF;
    END LOOP;

    IF p_doc_type = 'sales_invoice' AND p_customer_id IS NOT NULL THEN
        UPDATE customers
        SET current_receivable = current_receivable + v_balance_due,
            updated_at = NOW()
        WHERE id = p_customer_id;
    END IF;

    IF p_payments IS NOT NULL AND jsonb_array_length(p_payments) > 0 THEN
        FOR v_payment IN SELECT * FROM jsonb_to_recordset(p_payments) AS x(
            amount NUMERIC, payment_method TEXT, bank_account_id UUID,
            cheque_no TEXT, cheque_bank TEXT, cheque_branch TEXT, cheque_date DATE, notes TEXT
        ) LOOP
            IF v_payment.amount > 0 THEN
                v_pay_no := 'PAY-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');

                IF v_payment.payment_method = 'cheque' THEN
                    INSERT INTO cheque_register (
                        cheque_no, direction, party_type, party_id, sales_document_id,
                        bank_name, branch, cheque_date, amount, status, notes, created_by
                    ) VALUES (
                        v_payment.cheque_no, 'received', 'customer', p_customer_id, v_doc_id,
                        v_payment.cheque_bank, v_payment.cheque_branch, v_payment.cheque_date,
                        v_payment.amount, 'received', v_payment.notes, p_created_by
                    ) RETURNING id INTO v_cheque_id;
                ELSE
                    v_cheque_id := NULL;
                END IF;

                INSERT INTO payments (
                    payment_no, payment_type, party_type, party_id, payment_date,
                    amount, payment_method, bank_account_id, cheque_id, reference, notes, created_by
                ) VALUES (
                    v_pay_no, 'customer_payment', 'customer', p_customer_id, p_doc_date,
                    v_payment.amount, v_payment.payment_method, v_payment.bank_account_id, v_cheque_id,
                    v_doc_no, v_payment.notes, p_created_by
                ) RETURNING id INTO v_pay_id;

                INSERT INTO payment_allocations (
                    payment_id, sales_document_id, allocated_amount
                ) VALUES (
                    v_pay_id, v_doc_id, v_payment.amount
                );

                IF v_payment.payment_method IN ('bank', 'card') AND v_payment.bank_account_id IS NOT NULL THEN
                    UPDATE bank_accounts
                    SET current_balance = current_balance + v_payment.amount,
                        updated_at = NOW()
                    WHERE id = v_payment.bank_account_id;
                END IF;
            END IF;
        END LOOP;
    END IF;

    INSERT INTO audit_log (action, entity_type, entity_id, details, created_by)
    VALUES ('create_' || p_doc_type, 'sales_documents', v_doc_id, jsonb_build_object('doc_no', v_doc_no, 'grand_total', p_grand_total, 'customer_id', p_customer_id), p_created_by);

    RETURN jsonb_build_object(
        'success', TRUE,
        'doc_id', v_doc_id,
        'doc_no', v_doc_no,
        'grand_total', p_grand_total,
        'paid_amount', v_total_paid,
        'balance_due', v_balance_due,
        'status', v_status
    );
END;
$$ LANGUAGE plpgsql;

-- 3. RPC: Receive Purchase Shipment
CREATE OR REPLACE FUNCTION rpc_receive_purchase_shipment(
    p_transit_shipment_id UUID,
    p_receipt_date DATE,
    p_items JSONB,
    p_advance_ids_to_apply JSONB,
    p_notes TEXT,
    p_created_by TEXT DEFAULT 'Owner'
)
RETURNS JSONB AS $$
DECLARE
    v_shipment transit_shipments%ROWTYPE;
    v_supplier suppliers%ROWTYPE;
    v_grn_id UUID;
    v_grn_no TEXT;
    v_item RECORD;
    v_adv_id UUID;
    v_advance supplier_advances%ROWTYPE;
    v_product products%ROWTYPE;
    v_current_stock stock_balances%ROWTYPE;
    v_foreign_subtotal NUMERIC := 0.00;
    v_items_lkr_total NUMERIC := 0.00;
    v_landed_expenses_total NUMERIC := 0.00;
    v_total_landed_lkr NUMERIC := 0.00;
    v_supplier_payable_lkr NUMERIC := 0.00;
    v_adv_applied_total NUMERIC := 0.00;
    v_remaining_payable NUMERIC := 0.00;
    v_new_wac NUMERIC;
    v_old_on_hand NUMERIC;
    v_old_wac NUMERIC;
BEGIN
    SELECT * INTO v_shipment FROM transit_shipments WHERE id = p_transit_shipment_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transit shipment not found';
    END IF;

    SELECT * INTO v_supplier FROM suppliers WHERE id = v_shipment.supplier_id FOR UPDATE;

    v_grn_no := 'GRN-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        transit_shipment_item_id UUID, product_id UUID, received_sellable_qty NUMERIC,
        damaged_qty NUMERIC, missing_qty NUMERIC, foreign_unit_cost NUMERIC,
        allocated_landed_lkr_per_unit NUMERIC, final_landed_unit_cost_lkr NUMERIC
    ) LOOP
        v_foreign_subtotal := v_foreign_subtotal + (v_item.foreign_unit_cost * (v_item.received_sellable_qty + v_item.damaged_qty));
        v_items_lkr_total := v_items_lkr_total + ((v_item.foreign_unit_cost * v_shipment.exchange_rate_snapshot) * (v_item.received_sellable_qty + v_item.damaged_qty));
        v_landed_expenses_total := v_landed_expenses_total + (v_item.allocated_landed_lkr_per_unit * (v_item.received_sellable_qty + v_item.damaged_qty));
    END LOOP;

    v_total_landed_lkr := v_items_lkr_total + v_landed_expenses_total;
    v_supplier_payable_lkr := v_items_lkr_total;

    IF p_advance_ids_to_apply IS NOT NULL AND jsonb_array_length(p_advance_ids_to_apply) > 0 THEN
        FOR v_adv_id IN SELECT value::UUID FROM jsonb_array_elements_text(p_advance_ids_to_apply) LOOP
            SELECT * INTO v_advance FROM supplier_advances WHERE id = v_adv_id FOR UPDATE;
            IF FOUND AND v_advance.unallocated_lkr_amount > 0 THEN
                DECLARE
                    v_apply_amt NUMERIC;
                BEGIN
                    v_apply_amt := LEAST(v_advance.unallocated_lkr_amount, (v_supplier_payable_lkr - v_adv_applied_total));
                    IF v_apply_amt > 0 THEN
                        v_adv_applied_total := v_adv_applied_total + v_apply_amt;
                        UPDATE supplier_advances
                        SET allocated_lkr_amount = allocated_lkr_amount + v_apply_amt,
                            unallocated_lkr_amount = unallocated_lkr_amount - v_apply_amt,
                            updated_at = NOW()
                        WHERE id = v_adv_id;
                    END IF;
                END;
            END IF;
        END LOOP;
    END IF;

    v_remaining_payable := v_supplier_payable_lkr - v_adv_applied_total;

    INSERT INTO purchase_receipts (
        grn_no, transit_shipment_id, supplier_id, receipt_date, currency, exchange_rate_snapshot,
        foreign_subtotal, items_lkr_total, landed_expenses_lkr_total, total_landed_lkr,
        supplier_goods_payable_lkr, advance_applied_lkr, remaining_payable_lkr, is_fully_received,
        notes, created_by
    ) VALUES (
        v_grn_no, p_transit_shipment_id, v_shipment.supplier_id, p_receipt_date, v_shipment.currency, v_shipment.exchange_rate_snapshot,
        v_foreign_subtotal, v_items_lkr_total, v_landed_expenses_total, v_total_landed_lkr,
        v_supplier_payable_lkr, v_adv_applied_total, v_remaining_payable, FALSE,
        p_notes, p_created_by
    ) RETURNING id INTO v_grn_id;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        transit_shipment_item_id UUID, product_id UUID, received_sellable_qty NUMERIC,
        damaged_qty NUMERIC, missing_qty NUMERIC, foreign_unit_cost NUMERIC,
        allocated_landed_lkr_per_unit NUMERIC, final_landed_unit_cost_lkr NUMERIC, notes TEXT
    ) LOOP
        INSERT INTO purchase_receipt_items (
            purchase_receipt_id, transit_shipment_item_id, product_id,
            received_sellable_qty, damaged_qty, missing_qty, foreign_unit_cost,
            allocated_landed_lkr_per_unit, final_landed_unit_cost_lkr, notes
        ) VALUES (
            v_grn_id, v_item.transit_shipment_item_id, v_item.product_id,
            v_item.received_sellable_qty, COALESCE(v_item.damaged_qty, 0), COALESCE(v_item.missing_qty, 0),
            v_item.foreign_unit_cost, COALESCE(v_item.allocated_landed_lkr_per_unit, 0), v_item.final_landed_unit_cost_lkr, v_item.notes
        );

        UPDATE transit_shipment_items
        SET received_qty = received_qty + v_item.received_sellable_qty,
            damaged_qty = damaged_qty + COALESCE(v_item.damaged_qty, 0),
            allocated_landed_lkr_per_unit = v_item.allocated_landed_lkr_per_unit,
            final_landed_unit_cost_lkr = v_item.final_landed_unit_cost_lkr
        WHERE id = v_item.transit_shipment_item_id;

        INSERT INTO stock_balances (product_id, qty_on_hand, qty_reserved, qty_available, qty_in_transit, qty_damaged)
        VALUES (v_item.product_id, 0, 0, 0, 0, 0)
        ON CONFLICT (product_id) DO NOTHING;

        SELECT * INTO v_current_stock FROM stock_balances WHERE product_id = v_item.product_id FOR UPDATE;
        SELECT * INTO v_product FROM products WHERE id = v_item.product_id FOR UPDATE;

        v_old_on_hand := v_current_stock.qty_on_hand;
        v_old_wac := COALESCE(v_product.weighted_cost_lkr, 0);

        IF (v_old_on_hand + v_item.received_sellable_qty) > 0 THEN
            v_new_wac := ((v_old_on_hand * v_old_wac) + (v_item.received_sellable_qty * v_item.final_landed_unit_cost_lkr)) / (v_old_on_hand + v_item.received_sellable_qty);
        ELSE
            v_new_wac := v_item.final_landed_unit_cost_lkr;
        END IF;

        UPDATE products
        SET weighted_cost_lkr = ROUND(v_new_wac, 4),
            last_landed_cost_lkr = ROUND(v_item.final_landed_unit_cost_lkr, 4),
            last_purchase_cost_foreign = v_item.foreign_unit_cost,
            last_foreign_currency = v_shipment.currency,
            updated_at = NOW()
        WHERE id = v_item.product_id;

        UPDATE stock_balances
        SET qty_on_hand = qty_on_hand + v_item.received_sellable_qty,
            qty_available = (qty_on_hand + v_item.received_sellable_qty) - qty_reserved,
            qty_damaged = qty_damaged + COALESCE(v_item.damaged_qty, 0),
            qty_in_transit = GREATEST(0, qty_in_transit - (v_item.received_sellable_qty + COALESCE(v_item.damaged_qty, 0) + COALESCE(v_item.missing_qty, 0))),
            updated_at = NOW()
        WHERE product_id = v_item.product_id;

        IF v_item.received_sellable_qty > 0 THEN
            INSERT INTO stock_movements (
                product_id, movement_type, reference_doc_type, reference_doc_id, reference_doc_no,
                qty_change, unit_cost_snapshot, balance_after, created_by
            ) VALUES (
                v_item.product_id, 'purchase_receipt', 'purchase_receipts', v_grn_id, v_grn_no,
                v_item.received_sellable_qty, v_item.final_landed_unit_cost_lkr, (v_old_on_hand + v_item.received_sellable_qty), p_created_by
            );
        END IF;

        IF COALESCE(v_item.damaged_qty, 0) > 0 THEN
            INSERT INTO stock_movements (
                product_id, movement_type, reference_doc_type, reference_doc_id, reference_doc_no,
                qty_change, unit_cost_snapshot, balance_after, created_by
            ) VALUES (
                v_item.product_id, 'damaged_receipt', 'purchase_receipts', v_grn_id, v_grn_no,
                v_item.damaged_qty, v_item.final_landed_unit_cost_lkr, v_current_stock.qty_damaged + v_item.damaged_qty, p_created_by
            );
        END IF;
    END LOOP;

    UPDATE suppliers
    SET current_advance_balance = GREATEST(0, current_advance_balance - v_adv_applied_total),
        current_payable = current_payable + v_remaining_payable,
        updated_at = NOW()
    WHERE id = v_shipment.supplier_id;

    IF EXISTS (
        SELECT 1 FROM transit_shipment_items
        WHERE transit_shipment_id = p_transit_shipment_id
          AND (shipped_qty - (received_qty + damaged_qty)) > 0
    ) THEN
        UPDATE transit_shipments SET status = 'partially_received', updated_at = NOW() WHERE id = p_transit_shipment_id;
    ELSE
        UPDATE transit_shipments SET status = 'received', updated_at = NOW() WHERE id = p_transit_shipment_id;
        UPDATE purchase_receipts SET is_fully_received = TRUE WHERE id = v_grn_id;
    END IF;

    INSERT INTO audit_log (action, entity_type, entity_id, details, created_by)
    VALUES ('receive_purchase_shipment', 'purchase_receipts', v_grn_id, jsonb_build_object('grn_no', v_grn_no, 'shipment_id', p_transit_shipment_id, 'total_landed_lkr', v_total_landed_lkr), p_created_by);

    RETURN jsonb_build_object(
        'success', TRUE,
        'grn_id', v_grn_id,
        'grn_no', v_grn_no,
        'total_landed_lkr', v_total_landed_lkr,
        'advance_applied_lkr', v_adv_applied_total,
        'remaining_payable_lkr', v_remaining_payable
    );
END;
$$ LANGUAGE plpgsql;

-- 4. RPC: Update Cheque Status
CREATE OR REPLACE FUNCTION rpc_update_cheque_status(
    p_cheque_id UUID,
    p_new_status TEXT,
    p_deposit_bank_account_id UUID DEFAULT NULL,
    p_cleared_date DATE DEFAULT NULL,
    p_return_reason TEXT DEFAULT NULL,
    p_replacement_cheque_no TEXT DEFAULT NULL,
    p_replacement_bank TEXT DEFAULT NULL,
    p_replacement_date DATE DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_created_by TEXT DEFAULT 'Owner'
)
RETURNS JSONB AS $$
DECLARE
    v_cheque cheque_register%ROWTYPE;
    v_rep_id UUID := NULL;
BEGIN
    SELECT * INTO v_cheque FROM cheque_register WHERE id = p_cheque_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cheque not found';
    END IF;

    IF v_cheque.status = p_new_status THEN
        RETURN jsonb_build_object('success', TRUE, 'message', 'Status unchanged');
    END IF;

    IF v_cheque.direction = 'received' THEN
        IF p_new_status = 'cleared' THEN
            IF p_deposit_bank_account_id IS NULL AND v_cheque.deposit_bank_account_id IS NULL THEN
                RAISE EXCEPTION 'Bank account must be selected to clear cheque';
            END IF;

            UPDATE bank_accounts
            SET current_balance = current_balance + v_cheque.amount,
                updated_at = NOW()
            WHERE id = COALESCE(p_deposit_bank_account_id, v_cheque.deposit_bank_account_id);

            UPDATE cheque_register
            SET status = 'cleared',
                deposit_bank_account_id = COALESCE(p_deposit_bank_account_id, v_cheque.deposit_bank_account_id),
                cleared_date = COALESCE(p_cleared_date, CURRENT_DATE),
                notes = COALESCE(p_notes, notes),
                updated_at = NOW()
            WHERE id = p_cheque_id;

        ELSIF p_new_status = 'returned' THEN
            IF v_cheque.status = 'cleared' AND v_cheque.deposit_bank_account_id IS NOT NULL THEN
                UPDATE bank_accounts
                SET current_balance = current_balance - v_cheque.amount,
                    updated_at = NOW()
                WHERE id = v_cheque.deposit_bank_account_id;
            END IF;

            IF v_cheque.party_id IS NOT NULL THEN
                UPDATE customers
                SET current_receivable = current_receivable + v_cheque.amount,
                    updated_at = NOW()
                WHERE id = v_cheque.party_id;
            END IF;

            IF v_cheque.sales_document_id IS NOT NULL THEN
                UPDATE sales_documents
                SET balance_due = balance_due + v_cheque.amount,
                    paid_amount = GREATEST(0, paid_amount - v_cheque.amount),
                    payment_status = 'credit',
                    updated_at = NOW()
                WHERE id = v_cheque.sales_document_id;
            END IF;

            UPDATE cheque_register
            SET status = 'returned',
                return_date = CURRENT_DATE,
                return_reason = p_return_reason,
                notes = COALESCE(p_notes, notes),
                updated_at = NOW()
            WHERE id = p_cheque_id;

        ELSIF p_new_status = 'deposited' THEN
            UPDATE cheque_register
            SET status = 'deposited',
                deposit_bank_account_id = p_deposit_bank_account_id,
                notes = COALESCE(p_notes, notes),
                updated_at = NOW()
            WHERE id = p_cheque_id;

        ELSIF p_new_status = 'replaced' THEN
            IF p_replacement_cheque_no IS NULL THEN
                RAISE EXCEPTION 'Replacement cheque number is required';
            END IF;

            INSERT INTO cheque_register (
                cheque_no, direction, party_type, party_id, sales_document_id,
                bank_name, branch, cheque_date, amount, status, notes, created_by
            ) VALUES (
                p_replacement_cheque_no, 'received', 'customer', v_cheque.party_id, v_cheque.sales_document_id,
                COALESCE(p_replacement_bank, v_cheque.bank_name), v_cheque.branch,
                COALESCE(p_replacement_date, CURRENT_DATE), v_cheque.amount, 'received',
                'Replacement for cheque #' || v_cheque.cheque_no, p_created_by
            ) RETURNING id INTO v_rep_id;

            UPDATE cheque_register
            SET status = 'replaced',
                replacement_cheque_id = v_rep_id,
                notes = COALESCE(p_notes, notes),
                updated_at = NOW()
            WHERE id = p_cheque_id;
        ELSE
            UPDATE cheque_register
            SET status = p_new_status,
                notes = COALESCE(p_notes, notes),
                updated_at = NOW()
            WHERE id = p_cheque_id;
        END IF;

    ELSIF v_cheque.direction = 'issued' THEN
        IF p_new_status = 'cleared' THEN
            IF p_deposit_bank_account_id IS NOT NULL THEN
                UPDATE bank_accounts
                SET current_balance = current_balance - v_cheque.amount,
                    updated_at = NOW()
                WHERE id = p_deposit_bank_account_id;
            END IF;

            UPDATE cheque_register
            SET status = 'cleared',
                cleared_date = COALESCE(p_cleared_date, CURRENT_DATE),
                updated_at = NOW()
            WHERE id = p_cheque_id;

        ELSIF p_new_status = 'returned' THEN
            IF v_cheque.party_id IS NOT NULL THEN
                UPDATE suppliers
                SET current_payable = current_payable + v_cheque.amount,
                    updated_at = NOW()
                WHERE id = v_cheque.party_id;
            END IF;

            UPDATE cheque_register
            SET status = 'returned',
                return_date = CURRENT_DATE,
                return_reason = p_return_reason,
                updated_at = NOW()
            WHERE id = p_cheque_id;
        ELSE
            UPDATE cheque_register
            SET status = p_new_status,
                updated_at = NOW()
            WHERE id = p_cheque_id;
        END IF;
    END IF;

    INSERT INTO audit_log (action, entity_type, entity_id, details, created_by)
    VALUES ('cheque_status_update', 'cheque_register', p_cheque_id, jsonb_build_object('old_status', v_cheque.status, 'new_status', p_new_status, 'amount', v_cheque.amount), p_created_by);

    RETURN jsonb_build_object('success', TRUE, 'cheque_id', p_cheque_id, 'new_status', p_new_status, 'replacement_id', v_rep_id);
END;
$$ LANGUAGE plpgsql;

-- 5. RPC: Process Return & Exchange
CREATE OR REPLACE FUNCTION rpc_process_return_exchange(
    p_original_invoice_id UUID,
    p_return_type TEXT,
    p_returned_items JSONB,
    p_exchange_items JSONB,
    p_refund_method TEXT DEFAULT 'cash',
    p_bank_account_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_created_by TEXT DEFAULT 'Owner'
)
RETURNS JSONB AS $$
DECLARE
    v_orig_inv sales_documents%ROWTYPE;
    v_doc_no TEXT;
    v_doc_id UUID;
    v_ret_item RECORD;
    v_exch_item RECORD;
    v_return_total NUMERIC := 0.00;
    v_exchange_total NUMERIC := 0.00;
    v_net_difference NUMERIC := 0.00;
    v_product products%ROWTYPE;
    v_wac NUMERIC;
    v_pay_no TEXT;
BEGIN
    SELECT * INTO v_orig_inv FROM sales_documents WHERE id = p_original_invoice_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Original sales invoice not found';
    END IF;

    IF p_return_type = 'exchange' THEN
        v_doc_no := generate_document_number('EX');
    ELSE
        v_doc_no := generate_document_number('CN');
    END IF;

    FOR v_ret_item IN SELECT * FROM jsonb_to_recordset(p_returned_items) AS x(
        original_item_id UUID, product_id UUID, qty NUMERIC, unit_price NUMERIC,
        condition TEXT, line_total NUMERIC, notes TEXT
    ) LOOP
        v_return_total := v_return_total + v_ret_item.line_total;
    END LOOP;

    IF p_return_type = 'exchange' AND p_exchange_items IS NOT NULL THEN
        FOR v_exch_item IN SELECT * FROM jsonb_to_recordset(p_exchange_items) AS x(
            product_id UUID, qty NUMERIC, unit_type TEXT, unit_price NUMERIC, line_total NUMERIC, notes TEXT
        ) LOOP
            v_exchange_total := v_exchange_total + v_exch_item.line_total;
        END LOOP;
    END IF;

    v_net_difference := v_exchange_total - v_return_total;

    INSERT INTO sales_documents (
        doc_type, doc_no, original_invoice_id, customer_id, doc_date,
        subtotal, grand_total, balance_due, status, payment_status, notes, created_by
    ) VALUES (
        CASE WHEN p_return_type = 'exchange' THEN 'exchange' ELSE 'credit_note' END,
        v_doc_no, p_original_invoice_id, v_orig_inv.customer_id, CURRENT_DATE,
        v_return_total, v_net_difference, 0, 'completed', 'completed', p_notes, p_created_by
    ) RETURNING id INTO v_doc_id;

    FOR v_ret_item IN SELECT * FROM jsonb_to_recordset(p_returned_items) AS x(
        original_item_id UUID, product_id UUID, qty NUMERIC, unit_price NUMERIC,
        condition TEXT, line_total NUMERIC, notes TEXT
    ) LOOP
        SELECT * INTO v_product FROM products WHERE id = v_ret_item.product_id;
        v_wac := COALESCE(v_product.weighted_cost_lkr, 0);

        INSERT INTO sales_document_items (
            sales_document_id, original_item_id, product_id, qty, base_qty,
            unit_price, line_total, unit_cost_snapshot, notes
        ) VALUES (
            v_doc_id, v_ret_item.original_item_id, v_ret_item.product_id, v_ret_item.qty, v_ret_item.qty,
            v_ret_item.unit_price, -v_ret_item.line_total, v_wac, 'Returned (' || COALESCE(v_ret_item.condition, 'sellable') || ')'
        );

        IF COALESCE(v_ret_item.condition, 'sellable') = 'sellable' THEN
            UPDATE stock_balances
            SET qty_on_hand = qty_on_hand + v_ret_item.qty,
                qty_available = (qty_on_hand + v_ret_item.qty) - qty_reserved,
                updated_at = NOW()
            WHERE product_id = v_ret_item.product_id;

            INSERT INTO stock_movements (
                product_id, movement_type, reference_doc_type, reference_doc_id, reference_doc_no,
                qty_change, unit_cost_snapshot, balance_after, created_by
            ) VALUES (
                v_ret_item.product_id, 'sales_return_sellable', 'sales_documents', v_doc_id, v_doc_no,
                v_ret_item.qty, v_wac, (SELECT qty_on_hand FROM stock_balances WHERE product_id = v_ret_item.product_id), p_created_by
            );
        ELSE
            UPDATE stock_balances
            SET qty_damaged = qty_damaged + v_ret_item.qty,
                updated_at = NOW()
            WHERE product_id = v_ret_item.product_id;

            INSERT INTO stock_movements (
                product_id, movement_type, reference_doc_type, reference_doc_id, reference_doc_no,
                qty_change, unit_cost_snapshot, balance_after, created_by
            ) VALUES (
                v_ret_item.product_id, 'sales_return_damaged', 'sales_documents', v_doc_id, v_doc_no,
                v_ret_item.qty, v_wac, (SELECT qty_damaged FROM stock_balances WHERE product_id = v_ret_item.product_id), p_created_by
            );
        END IF;
    END LOOP;

    IF p_return_type = 'exchange' AND p_exchange_items IS NOT NULL THEN
        FOR v_exch_item IN SELECT * FROM jsonb_to_recordset(p_exchange_items) AS x(
            product_id UUID, qty NUMERIC, unit_type TEXT, unit_price NUMERIC, line_total NUMERIC, notes TEXT
        ) LOOP
            SELECT * INTO v_product FROM products WHERE id = v_exch_item.product_id;
            v_wac := COALESCE(v_product.weighted_cost_lkr, 0);

            UPDATE stock_balances
            SET qty_on_hand = qty_on_hand - v_exch_item.qty,
                qty_available = (qty_on_hand - v_exch_item.qty) - qty_reserved,
                updated_at = NOW()
            WHERE product_id = v_exch_item.product_id;

            INSERT INTO sales_document_items (
                sales_document_id, product_id, qty, base_qty, unit_type,
                unit_price, line_total, unit_cost_snapshot, is_exchange_item, notes
            ) VALUES (
                v_doc_id, v_exch_item.product_id, v_exch_item.qty, v_exch_item.qty, COALESCE(v_exch_item.unit_type, 'unit'),
                v_exch_item.unit_price, v_exch_item.line_total, v_wac, TRUE, 'Exchange outgoing'
            );

            INSERT INTO stock_movements (
                product_id, movement_type, reference_doc_type, reference_doc_id, reference_doc_no,
                qty_change, unit_cost_snapshot, balance_after, created_by
            ) VALUES (
                v_exch_item.product_id, 'sales_invoice', 'sales_documents', v_doc_id, v_doc_no,
                -v_exch_item.qty, v_wac, (SELECT qty_on_hand FROM stock_balances WHERE product_id = v_exch_item.product_id), p_created_by
            );
        END LOOP;
    END IF;

    IF v_orig_inv.customer_id IS NOT NULL THEN
        IF p_return_type = 'credit_note' THEN
            UPDATE customers
            SET unallocated_credit = unallocated_credit + v_return_total,
                updated_at = NOW()
            WHERE id = v_orig_inv.customer_id;

        ELSIF p_return_type = 'refund' THEN
            v_pay_no := 'REF-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
            INSERT INTO payments (
                payment_no, payment_type, party_type, party_id, payment_date,
                amount, payment_method, bank_account_id, reference, notes, created_by
            ) VALUES (
                v_pay_no, 'customer_refund', 'customer', v_orig_inv.customer_id, CURRENT_DATE,
                v_return_total, p_refund_method, p_bank_account_id, v_doc_no, p_notes, p_created_by
            );

            IF p_refund_method = 'bank' AND p_bank_account_id IS NOT NULL THEN
                UPDATE bank_accounts
                SET current_balance = current_balance - v_return_total,
                    updated_at = NOW()
                WHERE id = p_bank_account_id;
            END IF;

        ELSIF p_return_type = 'exchange' THEN
            IF v_net_difference > 0 THEN
                UPDATE customers
                SET current_receivable = current_receivable + v_net_difference,
                    updated_at = NOW()
                WHERE id = v_orig_inv.customer_id;
            ELSIF v_net_difference < 0 THEN
                UPDATE customers
                SET unallocated_credit = unallocated_credit + ABS(v_net_difference),
                    updated_at = NOW()
                WHERE id = v_orig_inv.customer_id;
            END IF;
        END IF;
    END IF;

    INSERT INTO audit_log (action, entity_type, entity_id, details, created_by)
    VALUES ('process_' || p_return_type, 'sales_documents', v_doc_id, jsonb_build_object('doc_no', v_doc_no, 'original_invoice_id', p_original_invoice_id, 'net_diff', v_net_difference), p_created_by);

    RETURN jsonb_build_object(
        'success', TRUE,
        'doc_id', v_doc_id,
        'doc_no', v_doc_no,
        'return_total', v_return_total,
        'exchange_total', v_exchange_total,
        'net_difference', v_net_difference
    );
END;
$$ LANGUAGE plpgsql;

-- 6. RPC: Allocate Landed Costs
CREATE OR REPLACE FUNCTION rpc_allocate_landed_costs(
    p_transit_shipment_id UUID,
    p_landed_cost_id UUID,
    p_allocation_method TEXT,
    p_custom_allocations JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_shipment transit_shipments%ROWTYPE;
    v_cost landed_costs%ROWTYPE;
    v_item RECORD;
    v_total_base NUMERIC := 0.00;
    v_allocated_item_amt NUMERIC;
    v_allocated_unit_amt NUMERIC;
    v_total_allocated NUMERIC := 0.00;
BEGIN
    SELECT * INTO v_shipment FROM transit_shipments WHERE id = p_transit_shipment_id FOR UPDATE;
    SELECT * INTO v_cost FROM landed_costs WHERE id = p_landed_cost_id FOR UPDATE;

    DELETE FROM landed_cost_allocations WHERE landed_cost_id = p_landed_cost_id;

    IF p_allocation_method = 'value' THEN
        SELECT COALESCE(SUM(foreign_unit_cost * shipped_qty), 0) INTO v_total_base
        FROM transit_shipment_items WHERE transit_shipment_id = p_transit_shipment_id;
    ELSIF p_allocation_method = 'quantity' THEN
        SELECT COALESCE(SUM(shipped_qty), 0) INTO v_total_base
        FROM transit_shipment_items WHERE transit_shipment_id = p_transit_shipment_id;
    ELSIF p_allocation_method = 'weight' THEN
        SELECT COALESCE(SUM(COALESCE(weight_kg, 0) * shipped_qty), 0) INTO v_total_base
        FROM transit_shipment_items WHERE transit_shipment_id = p_transit_shipment_id;
    ELSIF p_allocation_method = 'volume' THEN
        SELECT COALESCE(SUM(COALESCE(volume_cbm, 0) * shipped_qty), 0) INTO v_total_base
        FROM transit_shipment_items WHERE transit_shipment_id = p_transit_shipment_id;
    END IF;

    IF p_allocation_method != 'manual' AND v_total_base <= 0 THEN
        v_total_base := 1;
    END IF;

    FOR v_item IN SELECT * FROM transit_shipment_items WHERE transit_shipment_id = p_transit_shipment_id LOOP
        IF p_allocation_method = 'value' THEN
            v_allocated_item_amt := ROUND(v_cost.lkr_amount * ((v_item.foreign_unit_cost * v_item.shipped_qty) / v_total_base), 2);
        ELSIF p_allocation_method = 'quantity' THEN
            v_allocated_item_amt := ROUND(v_cost.lkr_amount * (v_item.shipped_qty / v_total_base), 2);
        ELSIF p_allocation_method = 'weight' THEN
            v_allocated_item_amt := ROUND(v_cost.lkr_amount * ((COALESCE(v_item.weight_kg, 0) * v_item.shipped_qty) / v_total_base), 2);
        ELSIF p_allocation_method = 'volume' THEN
            v_allocated_item_amt := ROUND(v_cost.lkr_amount * ((COALESCE(v_item.volume_cbm, 0) * v_item.shipped_qty) / v_total_base), 2);
        ELSIF p_allocation_method = 'manual' AND p_custom_allocations IS NOT NULL THEN
            SELECT COALESCE((value->>'allocated_lkr_amount')::NUMERIC, 0) INTO v_allocated_item_amt
            FROM jsonb_array_elements(p_custom_allocations)
            WHERE (value->>'transit_shipment_item_id')::UUID = v_item.id;
        ELSE
            v_allocated_item_amt := 0;
        END IF;

        v_allocated_unit_amt := ROUND(v_allocated_item_amt / v_item.shipped_qty, 4);
        v_total_allocated := v_total_allocated + v_allocated_item_amt;

        INSERT INTO landed_cost_allocations (
            landed_cost_id, transit_shipment_item_id, allocated_lkr_amount, allocated_lkr_per_unit
        ) VALUES (
            p_landed_cost_id, v_item.id, v_allocated_item_amt, v_allocated_unit_amt
        );
    END LOOP;

    UPDATE transit_shipment_items ti
    SET allocated_landed_lkr_per_unit = (
            SELECT COALESCE(SUM(allocated_lkr_per_unit), 0)
            FROM landed_cost_allocations WHERE transit_shipment_item_id = ti.id
        ),
        final_landed_unit_cost_lkr = (ti.foreign_unit_cost * v_shipment.exchange_rate_snapshot) + (
            SELECT COALESCE(SUM(allocated_lkr_per_unit), 0)
            FROM landed_cost_allocations WHERE transit_shipment_item_id = ti.id
        )
    WHERE transit_shipment_id = p_transit_shipment_id;

    UPDATE transit_shipments
    SET total_landed_expenses_lkr = (
            SELECT COALESCE(SUM(lkr_amount), 0) FROM landed_costs WHERE transit_shipment_id = p_transit_shipment_id
        ),
        total_estimated_cost_lkr = (foreign_items_subtotal * exchange_rate_snapshot) + (
            SELECT COALESCE(SUM(lkr_amount), 0) FROM landed_costs WHERE transit_shipment_id = p_transit_shipment_id
        ),
        updated_at = NOW()
    WHERE id = p_transit_shipment_id;

    RETURN jsonb_build_object('success', TRUE, 'total_allocated', v_total_allocated);
END;
$$ LANGUAGE plpgsql;
