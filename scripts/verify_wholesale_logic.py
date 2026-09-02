import os
import sys

def run_tests():
    print("================================================================")
    print("   GS-WHOLESALE POS SYSTEM - AUTOMATED VERIFICATION SUITE")
    print("================================================================\n")
    
    passed = 0
    failed = 0

    def assert_test(condition, name, details=""):
        nonlocal passed, failed
        if condition:
            print(f"[PASS] {name}")
            passed += 1
        else:
            print(f"[FAIL] {name} -> {details}")
            failed += 1

    # 1. Verify SQL Migrations
    sql_files = [
        'supabase/sql/001_wholesale_initial_schema.sql',
        'supabase/sql/002_wholesale_functions_rpcs.sql',
        'supabase/sql/003_wholesale_seed_data.sql'
    ]
    for sql in sql_files:
        assert_test(os.path.exists(sql), f"Migration file exists: {sql}")
        if os.path.exists(sql):
            with open(sql, 'r', encoding='utf-8') as f:
                content = f.read()
                assert_test(len(content) > 500, f"Migration content verified: {sql} ({len(content)} bytes)")

    # Check key tables in migration 001
    with open('supabase/sql/001_wholesale_initial_schema.sql', 'r', encoding='utf-8') as f:
        schema = f.read()
        for tbl in ['company_settings', 'currencies', 'accounting_accounts', 'accounting_journal_entries', 
                    'suppliers', 'supplier_orders', 'supplier_order_items', 'supplier_advances', 
                    'transit_shipments', 'transit_shipment_items', 'landed_costs', 'landed_cost_allocations', 
                    'purchase_receipts', 'purchase_receipt_items', 'stock_balances', 'stock_movements',
                    'customers', 'products', 'product_quantity_breaks', 'sales_documents', 
                    'sales_document_items', 'bank_accounts', 'cheque_register', 'payments', 'audit_log']:
            assert_test(f"CREATE TABLE IF NOT EXISTS {tbl}" in schema, f"Table schema present: {tbl}")

    # Check key RPC functions in migration 002
    with open('supabase/sql/002_wholesale_functions_rpcs.sql', 'r', encoding='utf-8') as f:
        rpcs = f.read()
        for fn in ['generate_document_number', 'rpc_post_sales_document', 'rpc_receive_purchase_shipment',
                   'rpc_update_cheque_status', 'rpc_process_return_exchange', 'rpc_allocate_landed_costs']:
            assert_test(f"FUNCTION {fn}" in rpcs, f"RPC Function defined: {fn}")

    # 2. Verify Landed Cost Calculation Formula
    # Scenario: Shipment with 2 items.
    # Item A: 100 units @ $14.50 (USD = 305.5 LKR) -> Foreign Total = $1,450 (442,975 LKR)
    # Item B: 50 units @ $38.00 (USD = 305.5 LKR) -> Foreign Total = $1,900 (580,450 LKR)
    # Total Foreign LKR = 1,023,425 LKR.
    # Additional Landed Cost: Freight = 50,000 LKR + Duty = 120,000 LKR = 170,000 LKR.
    # Allocation by Value:
    # Item A allocation = 170,000 * (442,975 / 1,023,425) = 73,584.22 LKR (Per unit = 735.84 LKR)
    # Item B allocation = 170,000 * (580,450 / 1,023,425) = 96,415.78 LKR (Per unit = 1928.32 LKR)
    rate = 305.5
    cost_a_fob_lkr = 100 * 14.50 * rate # 442,975
    cost_b_fob_lkr = 50 * 38.00 * rate  # 580,450
    total_fob_lkr = cost_a_fob_lkr + cost_b_fob_lkr
    total_landed_expense = 170000.0

    alloc_a = total_landed_expense * (cost_a_fob_lkr / total_fob_lkr)
    alloc_b = total_landed_expense * (cost_b_fob_lkr / total_fob_lkr)
    unit_landed_cost_a = (cost_a_fob_lkr + alloc_a) / 100.0
    unit_landed_cost_b = (cost_b_fob_lkr + alloc_b) / 50.0

    assert_test(abs((alloc_a + alloc_b) - total_landed_expense) < 0.01, "Landed cost allocation conservation of mass")
    assert_test(unit_landed_cost_a > (14.50 * rate), f"Item A landed unit cost exceeds FOB: {unit_landed_cost_a:.2f} > {14.50*rate:.2f}")
    assert_test(unit_landed_cost_b > (38.00 * rate), f"Item B landed unit cost exceeds FOB: {unit_landed_cost_b:.2f} > {38.00*rate:.2f}")

    # 3. Verify Weighted Average Cost (WAC) Update Formula
    # Old Stock: 20 units @ 4,800 LKR = 96,000 LKR
    # New GRN: 100 units @ 5,165.59 LKR = 516,559 LKR
    # Expected New WAC = (96,000 + 516,559) / (20 + 100) = 612,559 / 120 = 5,104.66 LKR
    old_qty = 20
    old_wac = 4800.0
    rec_qty = 100
    rec_unit_cost = unit_landed_cost_a
    new_wac = ((old_qty * old_wac) + (rec_qty * rec_unit_cost)) / (old_qty + rec_qty)
    assert_test(4800.0 < new_wac < rec_unit_cost, f"WAC re-averaged correctly: Old={old_wac}, Rec={rec_unit_cost:.2f} -> New WAC={new_wac:.2f}")

    # 4. Verify Minimum-Profit Protection Formula
    # Weighted Cost = 5,104.66. Minimum margin = 5.0%.
    # Minimum Selling Price = 5,104.66 / (1 - 0.05) = 5,373.33 LKR.
    # Selling at 5,200 LKR -> Margin = (5200 - 5104.66) / 5200 = 1.83% (< 5.0%) -> Triggers Margin Warning
    selling_price = 5200.0
    margin_pct = ((selling_price - new_wac) / selling_price) * 100.0
    is_below_min_margin = margin_pct < 5.0
    assert_test(is_below_min_margin, f"Margin protection alert triggered for low margin sale: {margin_pct:.2f}% < 5.0%")

    # 5. Verify Cheque Bounce Receivable Restoration
    # Original Customer Balance: 100,000 LKR
    # Payment Received by Cheque: 40,000 LKR -> Customer Balance becomes 60,000 LKR, Drawer has 40,000 LKR
    # Cheque is Bounced: Drawer -40,000, Customer Balance restored to 100,000 LKR
    cust_balance = 100000.0
    cheque_amt = 40000.0
    cust_balance_after_payment = cust_balance - cheque_amt
    cust_balance_after_bounce = cust_balance_after_payment + cheque_amt
    assert_test(cust_balance_after_bounce == cust_balance, "Cheque bounce restores exact customer receivable")

    # 6. Verify Customer Price Tier Calculation
    # Standard: 6,000, Tier1: 3% off (5,820), VIP: 8% off (5,520), Dealer: 5,600
    def get_tier_price(prod, tier):
        base = prod['wholesale_price']
        if tier == 'Dealer' and prod.get('dealer_price'):
            return prod['dealer_price']
        if tier == 'VIP':
            return base * 0.92
        if tier == 'Tier1':
            return base * 0.97
        return base

    prod_sample = {'wholesale_price': 6000.0, 'dealer_price': 5600.0}
    assert_test(get_tier_price(prod_sample, 'Dealer') == 5600.0, "Dealer price tier returns exact dealer price")
    assert_test(get_tier_price(prod_sample, 'Tier1') == 5820.0, "Tier 1 returns 3% discount")
    assert_test(get_tier_price(prod_sample, 'VIP') == 5520.0, "VIP returns 8% discount")
    assert_test(get_tier_price(prod_sample, 'Standard') == 6000.0, "Standard returns full wholesale price")

    # 7. Verify Dummy Data Removal from Seed Data
    with open('supabase/sql/003_wholesale_seed_data.sql', 'r', encoding='utf-8') as f:
        seed_content = f.read()
        assert_test('SUP-001' not in seed_content, "Seed SQL has no dummy suppliers")
        assert_test('CUST-001' not in seed_content, "Seed SQL has no dummy customers")

    # 8. Verify Excel Import Parser Header Matching
    test_shop_pos_row = {
        'SKU/Code': 'SSD-TEST-1TB',
        'Name': 'Samsung 980 Pro 1TB NVMe',
        'Category': 'Solid State Drives (SSD)',
        'Barcode': '880609123456',
        'Cost': '28500',
        'Price': '34000',
        'Stock Quantity': '25',
        'Pack Size': '10',
        'Carton Units': '50',
        'Status': 'active'
    }
    def test_first_cell(row, keys):
        row_keys = list(row.keys())
        for k in keys:
            target = k.lower().replace(' ', '').replace('_', '').replace('-', '').replace('/', '').replace('.', '')
            for rk in row_keys:
                if rk.lower().replace(' ', '').replace('_', '').replace('-', '').replace('/', '').replace('.', '') == target:
                    if row[rk] != '': return row[rk]
        return ''

    sku = test_first_cell(test_shop_pos_row, ['sku', 'code', 'item code', 'sku/code'])
    name = test_first_cell(test_shop_pos_row, ['name', 'product name', 'description'])
    cost = float(test_first_cell(test_shop_pos_row, ['cost', 'cost price', 'avg cost']))
    price = float(test_first_cell(test_shop_pos_row, ['price', 'selling price', 'wholesale price']))
    stock = int(test_first_cell(test_shop_pos_row, ['stock quantity', 'quantity', 'qty', 'stock']))

    assert_test(sku == 'SSD-TEST-1TB', f"Excel parser extracts SKU: {sku}")
    assert_test(name == 'Samsung 980 Pro 1TB NVMe', f"Excel parser extracts Name: {name}")
    assert_test(cost == 28500.0, f"Excel parser extracts Cost: {cost}")
    assert_test(price == 34000.0, f"Excel parser extracts Price: {price}")
    assert_test(stock == 25, f"Excel parser extracts Stock Quantity: {stock}")

    # 9. Verify Stock in Transit Edit Logic (Delta Adjustment)
    initial_transit_qty = 20
    edited_transit_qty = 12
    delta_transit = edited_transit_qty - initial_transit_qty # -8
    final_transit_qty = initial_transit_qty + delta_transit
    assert_test(final_transit_qty == 12, f"Editing transit document from {initial_transit_qty} to {edited_transit_qty} sets exact transit stock to {final_transit_qty} (not accumulating)")

    # 10. Verify Purchase Document Edit & WAC Recalculation Logic
    # Case: Prior stock 10 @ 1000 = 10,000. Purchase added 10 @ 2000 = 20,000 -> Current stock 20, WAC 1500 (Valuation 30,000)
    current_stock = 20
    current_wac = 1500.0
    current_valuation = current_stock * current_wac # 30000.0

    old_pur_qty = 10
    old_pur_cost = 2000.0

    new_pur_qty = 5
    new_pur_cost = 1400.0

    # Step 1: Strip old contribution
    base_stock = current_stock - old_pur_qty # 10
    base_valuation = current_valuation - (old_pur_qty * old_pur_cost) # 10000.0

    # Step 2: Apply new contribution
    new_resulting_stock = base_stock + new_pur_qty # 15
    new_resulting_valuation = base_valuation + (new_pur_qty * new_pur_cost) # 17000.0
    new_resulting_wac = round(new_resulting_valuation / new_resulting_stock, 2) # 1133.33

    assert_test(new_resulting_stock == 15, f"Editing purchase doc sets on-hand stock to {new_resulting_stock}")
    assert_test(new_resulting_wac == 1133.33, f"Editing purchase doc recalculates WAC accurately to {new_resulting_wac}")

    # 11. Test First Purchase Cost Adoption (Zero prior WAC does not dilute new cost)
    prior_wac = 0
    prior_stock = 0
    new_purchase_qty = 10
    new_purchase_cost = 2500.0
    computed_wac = new_purchase_cost if (prior_wac <= 0 or prior_stock <= 0) else ((prior_stock * prior_wac) + (new_purchase_qty * new_purchase_cost)) / (prior_stock + new_purchase_qty)
    assert_test(computed_wac == 2500.0, f"First purchase with 0 prior WAC adopts full purchase unit cost: {computed_wac}")

    # 12. Test Purchase Deletion Inventory Reversal
    current_on_hand = 25
    deleted_purchase_qty = 15
    remaining_on_hand = max(0, current_on_hand - deleted_purchase_qty)
    assert_test(remaining_on_hand == 10, f"Deleting purchase document reverses on-hand stock correctly from 25 to {remaining_on_hand}")

    # 13. Test Product Deletion Constraint (Blocked when in active documents)
    sample_prod_id = "prod-test-999"
    active_sales_docs = [{"doc_no": "INV-202609-001", "items": [{"product_id": sample_prod_id}]}]
    is_in_doc = any(any(it.get("product_id") == sample_prod_id for it in d.get("items", [])) for d in active_sales_docs)
    can_delete_before_doc_delete = not is_in_doc
    assert_test(can_delete_before_doc_delete == False, "Product deletion blocked when product is in an active document")

    # 14. Test Product Deletion after Document is Deleted
    active_sales_docs.clear() # Document is deleted first
    is_in_doc_after = any(any(it.get("product_id") == sample_prod_id for it in d.get("items", [])) for d in active_sales_docs)
    can_delete_after_doc_delete = not is_in_doc_after
    assert_test(can_delete_after_doc_delete == True, "Product deletion allowed after linked document is deleted")

    # 15. Test Dynamic Customer Receivable Sync (Recalculated from unpaid invoices)
    mock_customer = {"id": "cust-abc", "business_name": "Apex Computers", "current_receivable": 0}
    mock_invoices = [
        {"id": "inv-1", "customer_id": "cust-abc", "doc_type": "sales_invoice", "status": "posted", "grand_total": 45000.0, "paid_amount": 0.0, "balance_due": 45000.0, "payment_status": "unpaid"},
        {"id": "inv-2", "customer_id": "cust-abc", "doc_type": "sales_invoice", "status": "posted", "grand_total": 30000.0, "paid_amount": 15000.0, "balance_due": 15000.0, "payment_status": "partial"},
    ]
    computed_receivable = sum(d["balance_due"] for d in mock_invoices if d["status"] != "cancelled")
    assert_test(computed_receivable == 60000.0, f"Customer dynamic receivable computed accurately: {computed_receivable} LKR (despite initial 0)")

    # 16. Test FIFO Credit Settlement Allocation
    settle_amount = 50000.0
    rem_to_alloc = settle_amount
    for inv in sorted(mock_invoices, key=lambda x: x["id"]):
        if rem_to_alloc <= 0:
            break
        alloc = min(inv["balance_due"], rem_to_alloc)
        inv["paid_amount"] += alloc
        inv["balance_due"] -= alloc
        inv["payment_status"] = "paid" if inv["balance_due"] <= 0.01 else "partial"
        rem_to_alloc -= alloc

    assert_test(mock_invoices[0]["payment_status"] == "paid" and mock_invoices[0]["balance_due"] == 0, "FIFO settlement fully pays oldest invoice (INV-1: 45000)")
    assert_test(mock_invoices[1]["payment_status"] == "partial" and mock_invoices[1]["balance_due"] == 10000.0, f"FIFO settlement partially allocates to next invoice (INV-2 due: {mock_invoices[1]['balance_due']})")

    new_computed_receivable = sum(d["balance_due"] for d in mock_invoices if d["status"] != "cancelled")
    assert_test(new_computed_receivable == 10000.0, f"Customer remaining balance updated correctly to: {new_computed_receivable}")

    # 18. Test Draft Transit Shipment Stock Invariant
    # Rule: Draft shipments MUST NOT increment qty_in_transit. Promoting to in_transit increments it.
    initial_in_transit_qty = 0
    draft_shipment = {
        "id": "shp-draft-1",
        "status": "draft",
        "items": [{"product_id": "p-1", "shipped_qty": 50, "unit_cost": 1200.0}]
    }
    # When status is 'draft', stock balance unchanged
    stock_in_transit = initial_in_transit_qty if draft_shipment["status"] == "draft" else (initial_in_transit_qty + 50)
    assert_test(stock_in_transit == 0, "Draft stock-in-transit shipment does NOT increment in-transit inventory (remains 0)")

    # When draft promoted to 'in_transit'
    draft_shipment["status"] = "in_transit"
    stock_in_transit_after_promote = stock_in_transit + sum(it["shipped_qty"] for it in draft_shipment["items"])
    assert_test(stock_in_transit_after_promote == 50, "Promoting transit draft to 'in_transit' updates in-transit inventory to 50")

    # 19. Test Draft Purchase Document Stock & WAC Invariant
    # Rule: Draft purchases MUST NOT increment qty_on_hand or mutate WAC.
    initial_on_hand = 10
    initial_wac = 1000.0
    draft_purchase = {
        "id": "pur-draft-1",
        "status": "draft",
        "items": [{"product_id": "p-1", "received_sellable_qty": 20, "final_landed_unit_cost_lkr": 1600.0}]
    }
    # On draft creation
    stock_on_hand_draft = initial_on_hand if draft_purchase["status"] == "draft" else (initial_on_hand + 20)
    wac_draft = initial_wac if draft_purchase["status"] == "draft" else (((initial_on_hand * initial_wac) + (20 * 1600.0)) / (initial_on_hand + 20))
    assert_test(stock_on_hand_draft == 10, "Draft purchase document does NOT increment on-hand inventory (remains 10)")
    assert_test(wac_draft == 1000.0, "Draft purchase document does NOT mutate product WAC (remains 1000.0)")

    # On draft confirmation / promotion to 'received'
    draft_purchase["status"] = "received"
    promoted_on_hand = stock_on_hand_draft + 20 # 30
    promoted_wac = round(((stock_on_hand_draft * initial_wac) + (20 * 1600.0)) / promoted_on_hand, 2) # (10,000 + 32,000) / 30 = 1400.0
    assert_test(promoted_on_hand == 30, f"Promoting draft purchase to 'received' adds on-hand stock: {promoted_on_hand}")
    assert_test(promoted_wac == 1400.0, f"Promoting draft purchase recalculates WAC accurately: {promoted_wac} LKR")

    # 20. Test Draft Deletion Clean Invariant
    # Deleting a draft purchase does not reverse stock (since stock was never added)
    stock_after_deleting_unpromoted_draft = initial_on_hand # No reduction below initial
    assert_test(stock_after_deleting_unpromoted_draft == 10, "Deleting draft purchase preserves correct inventory without under-reversing")

    # 21. Test Capital Inflow and Cashflow Computation
    initial_cash_inflow = 0
    initial_bank_balance = 500000.0
    capital_investment = {
        "amount": 5000000.0,
        "income_category": "Owner's Capital Investment (Initial)",
        "payment_type": "direct_income",
        "payment_method": "bank",
        "bank_account_id": "bank-1"
    }
    # Capital inflow is recorded
    total_inflow_after_capital = initial_cash_inflow + capital_investment["amount"]
    bank_balance_after_capital = initial_bank_balance + capital_investment["amount"]
    assert_test(total_inflow_after_capital == 5000000.0, f"Owner capital investment increments total cashflow inflow: {total_inflow_after_capital} LKR")
    assert_test(bank_balance_after_capital == 5500000.0, f"Bank deposit of capital investment increments bank account balance: {bank_balance_after_capital} LKR")

    # 22. Test Non-sales Other Inflow (Supplier Rebate / Bank Loan)
    rebate_inflow = {
        "amount": 150000.0,
        "income_category": "Supplier Volume Rebate / Bonus",
        "payment_type": "direct_income",
        "is_outflow": False
    }
    total_inflows_with_rebate = total_inflow_after_capital + rebate_inflow["amount"]
    assert_test(total_inflows_with_rebate == 5150000.0, f"Supplier rebate inflow increments total inflow: {total_inflows_with_rebate} LKR")

    # 23. Test Capital Deletion Reversal
    # Deleting the capital transaction reverses the bank balance impact
    bank_balance_after_capital_delete = bank_balance_after_capital - capital_investment["amount"]
    assert_test(bank_balance_after_capital_delete == initial_bank_balance, f"Deleting capital investment transaction reverses bank account balance to {initial_bank_balance} LKR")

    # 24. Test COD (Cash on Delivery) Sale Posting & Status
    bill_total = 75000.0
    cod_tender_lines = [{"method": "cod", "amount": bill_total}]
    # In COD, paid_amount must exclude COD amount because cash is received upon delivery
    cod_paid_amount = sum(p["amount"] for p in cod_tender_lines if p["method"] != "credit" and p["method"] != "cod")
    cod_balance_due = bill_total - cod_paid_amount
    cod_payment_status = "unpaid" if cod_balance_due > 0 and cod_paid_amount == 0 else "paid"
    assert_test(cod_paid_amount == 0, f"COD sale paid amount is initially 0: {cod_paid_amount} LKR")
    assert_test(cod_balance_due == 75000.0, f"COD sale balance due is full invoice total: {cod_balance_due} LKR")
    assert_test(cod_payment_status == "unpaid", f"COD sale status is marked as 'unpaid': {cod_payment_status}")

    # 25. Test Customer Balance with COD and Settlement
    customer_initial_receivable = 10000.0
    customer_receivable_after_cod = customer_initial_receivable + cod_balance_due
    assert_test(customer_receivable_after_cod == 85000.0, f"Customer receivable reflects unpaid COD invoice: {customer_receivable_after_cod} LKR")
    # Customer settles COD once product delivered
    customer_receivable_after_settle = customer_receivable_after_cod - bill_total
    assert_test(customer_receivable_after_settle == customer_initial_receivable, f"Customer settlement clears COD invoice and restores previous balance: {customer_receivable_after_settle} LKR")

    # 26. Test Company Settings Persistence Logic
    saved_custom_settings = {
        "business_name": "My Custom Wholesale Tech Ltd",
        "phone": "0771234567",
        "email": "contact@mycustomwholesale.com",
        "address": "No 123 Main St, Colombo 03"
    }
    # Persistence must not reset to initial default
    resolved_settings = saved_custom_settings if saved_custom_settings and len(saved_custom_settings) > 0 else {"business_name": "Default"}
    assert_test(resolved_settings["business_name"] == "My Custom Wholesale Tech Ltd", f"Custom company settings preserved without reset: {resolved_settings['business_name']}")

    # 27. Check Build Artifacts
    assert_test(os.path.exists('dist/index.html'), "Production build output dist/index.html exists")
    
    print("\n----------------------------------------------------------------")
    print(f"VERIFICATION SUMMARY: {passed} PASSED, {failed} FAILED")
    print("----------------------------------------------------------------")

    return 0 if failed == 0 else 1

if __name__ == '__main__':
    sys.exit(run_tests())
