import React, { useState, useMemo } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency, formatDate } from '../../lib/formatters';

export default function CashflowOverview() {
  const {
    payments = [],
    bankAccounts = [],
    recordDirectExpense,
    recordDirectIncome,
    deletePayment,
    deleteSalesDocument,
    deletePurchaseDocument,
    deleteTransitShipment,
    resetTransactionsOnly,
    transitShipments = [],
    purchases = [],
    salesDocuments = [],
    cheques = [],
    suppliers = [],
    customers = []
  } = useBusiness();

  const { notifySuccess, notifyError } = useNotification();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'inflow' | 'outflow' | 'capital' | 'cash' | 'bank' | 'cheque'
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);

  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    expense_category: 'General Expense',
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: 'cash',
    bank_account_id: bankAccounts[0]?.id || '',
    payee_name: '',
    reference: '',
    notes: ''
  });

  const [incomeForm, setIncomeForm] = useState({
    amount: '',
    income_category: "Owner's Capital Investment (Initial)",
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: 'cash',
    bank_account_id: bankAccounts[0]?.id || '',
    payer_name: 'Managing Director / Owner',
    reference: '',
    notes: ''
  });

  // Aggregate All Cashflow Transactions into a unified ledger
  const allTransactions = useMemo(() => {
    const list = [];
    const seenSalesDocIds = new Set();
    const seenPurchaseDocIds = new Set();
    const seenPaymentIds = new Set();

    // 1. Sales Documents (Wholesale Sales Invoices & Customer Reservations)
    // Every active sales document is a business sales inflow transaction!
    salesDocuments.forEach(doc => {
      if (doc.status !== 'cancelled' && doc.doc_type !== 'quotation') {
        seenSalesDocIds.add(String(doc.id));
        if (doc.doc_no) seenSalesDocIds.add(doc.doc_no);

        const total = Number(doc.grand_total) || 0;
        const paid = Number(doc.paid_amount) || 0;
        const balDue = Number(doc.balance_due) || 0;
        const isPureCredit = doc.payment_status === 'credit' ||
                             (doc.notes || '').toLowerCase().includes('credit') ||
                             (balDue >= total && paid === 0) ||
                             (doc.payment_status === 'unpaid' && paid === 0);
        const isPartial = paid > 0 && balDue > 0;
        const isFullyPaid = balDue <= 0.01 && paid > 0;

        // Determine payment method accurately
        let method = 'credit';
        if (isPureCredit) {
          method = 'credit';
        } else if (doc.is_cod || (doc.notes || '').toLowerCase().includes('cod')) {
          method = 'cod';
        } else if (isPartial) {
          const activeLines = (doc.payment_lines || []).filter(p => p.method !== 'credit' && (Number(p.amount) || 0) > 0);
          if (activeLines.length > 0) {
            method = `${activeLines.map(p => p.method).join(', ')} + credit`;
          } else {
            method = 'partial (credit)';
          }
        } else if (doc.payment_lines && doc.payment_lines.length > 0) {
          const activeLines = doc.payment_lines.filter(p => (Number(p.amount) || 0) > 0);
          method = activeLines.length > 0 ? activeLines.map(p => p.method).join(', ') : (isFullyPaid ? 'cash' : 'credit');
        } else if (paid > 0) {
          const linkedPay = payments.find(p => p.sales_doc_id === doc.id || (doc.doc_no && p.reference?.includes(doc.doc_no)));
          method = linkedPay?.payment_method || 'cash';
        } else {
          method = 'credit';
        }

        const statusLabel = doc.status === 'reserved'
          ? 'Reserved'
          : isPureCredit
            ? 'Credit / Unpaid'
            : isPartial
              ? `Partial (Paid Rs. ${paid.toLocaleString()})`
              : 'Fully Paid';

        list.push({
          id: `sales-doc-${doc.id}`,
          doc_id: doc.id,
          doc_type: 'sales',
          voucher_no: `REC-${doc.doc_no}`,
          date: doc.doc_date || doc.created_at,
          category: doc.doc_type === 'reserved_order' ? 'Reservation Sales' : 'Wholesale Sales Invoice',
          party: doc.customer_name || 'Walk-in Customer',
          method: method,
          reference: `${doc.doc_no} [${statusLabel}]`,
          is_outflow: false,
          amount: total,
          paid_amount: paid,
          balance_due: balDue,
          payment_status: isPureCredit ? 'credit' : doc.payment_status
        });
      }
    });

    // 2. Purchase Documents (Goods Receipts / Direct Purchases)
    // Every active purchase document represents an inventory purchase outflow!
    purchases.forEach(pur => {
      if (pur.status !== 'cancelled') {
        seenPurchaseDocIds.add(String(pur.id));
        const docNo = pur.doc_no || pur.grn_no;
        if (docNo) seenPurchaseDocIds.add(docNo);

        const total = Number(pur.total_amount_lkr || pur.total_landed_lkr) || 0;
        const payType = pur.payment_type || (pur.notes?.toLowerCase().includes('cash') ? 'cash' : pur.notes?.toLowerCase().includes('bank') ? 'bank' : 'credit');

        list.push({
          id: `pur-doc-${pur.id}`,
          doc_id: pur.id,
          doc_type: 'purchase',
          voucher_no: `PAY-${docNo}`,
          date: pur.receipt_date || pur.created_at,
          category: 'Purchase Document (Inventory)',
          party: pur.supplier_name || 'Supplier',
          method: payType,
          reference: `${docNo}${pur.shipment_no && pur.shipment_no !== 'DIRECT' ? ` (Transit: ${pur.shipment_no})` : ''}`,
          is_outflow: true,
          amount: total,
          status: pur.status
        });
      }
    });

    // 3. Stock in Transit Shipments (Only active shipments that have NOT arrived / converted to purchases yet)
    transitShipments.forEach(shp => {
      // Exclude companion shipments, cancelled, arrived/received
      if (
        shp.status !== 'cancelled' &&
        shp.status !== 'arrived' &&
        shp.status !== 'received' &&
        !shp.shipment_no?.startsWith('DIR-TRN-') &&
        !shp.notes?.includes('Direct purchase companion')
      ) {
        // Also check if already covered by an arrived purchase
        if (shp.purchase_doc_id || (shp.shipment_no && seenPurchaseDocIds.has(shp.shipment_no))) return;

        const total = Number(shp.total_estimated_cost_lkr || shp.foreign_items_subtotal) || 0;
        const sup = suppliers.find(s => s.id === shp.supplier_id);
        const refNo = shp.shipment_no || shp.bill_of_lading_no;
        const payType = shp.payment_type || (shp.notes?.toLowerCase().includes('cash') ? 'cash' : shp.notes?.toLowerCase().includes('bank') ? 'bank' : 'credit');

        list.push({
          id: `trn-shp-${shp.id}`,
          doc_id: shp.id,
          doc_type: 'transit',
          voucher_no: `TRN-${shp.shipment_no}`,
          date: shp.departure_date || shp.shipping_date || shp.created_at,
          category: 'Stock in Transit Order',
          party: shp.supplier_name || sup?.name || 'Import Supplier',
          method: payType,
          reference: `${refNo} (${shp.status === 'in_transit' ? 'In Transit' : 'Draft'})`,
          is_outflow: true,
          amount: total
        });
      }
    });

    // 4. Standalone Payments (Capital Inflows, Owner Investments, Direct Expenses, Customer Account Settlements)
    payments.forEach(p => {
      // Skip if this payment is already represented by a sales document or purchase document in the list
      const matchesSalesDoc = (p.sales_doc_id && seenSalesDocIds.has(String(p.sales_doc_id))) ||
                              (p.reference && seenSalesDocIds.has(p.reference)) ||
                              (p.payment_no && (seenSalesDocIds.has(p.payment_no) || p.payment_no.includes('INV-')));

      const matchesPurDoc = (p.purchase_doc_id && seenPurchaseDocIds.has(String(p.purchase_doc_id))) ||
                            (p.reference && seenPurchaseDocIds.has(p.reference)) ||
                            (p.payment_no && (seenPurchaseDocIds.has(p.payment_no) || p.payment_no.includes('PUR-')));

      if (matchesSalesDoc || matchesPurDoc) {
        return; // Already represented cleanly by the sales/purchase document above
      }

      seenPaymentIds.add(p.id);

      const isOutflow = p.payment_type === 'transit_purchase_payment' ||
                        p.payment_type === 'purchase_payment' ||
                        p.payment_type === 'operational_expense' ||
                        p.payment_type === 'supplier_advance' ||
                        p.payment_type === 'expense';

      let partyName = p.customer_name || p.payee_name || p.payer_name || p.supplier_name;
      if (!partyName && p.party_type === 'supplier') {
        const s = suppliers.find(x => x.id === p.party_id);
        partyName = s?.name || 'Supplier';
      } else if (!partyName && p.party_type === 'customer') {
        const c = customers.find(x => x.id === p.party_id);
        partyName = c?.business_name || 'Customer';
      } else if (!partyName && p.payment_type === 'direct_income') {
        partyName = 'Owner / Investor';
      }

      const categoryLabel = p.income_category ||
                            p.expense_category ||
                            p.payment_type?.replace(/_/g, ' ') ||
                            'Payment';

      list.push({
        id: p.id,
        voucher_no: p.payment_no || `PAY-${p.id?.slice(-4)}`,
        date: p.payment_date || p.created_at,
        category: categoryLabel,
        party: partyName || 'General Account',
        method: p.payment_method || 'cash',
        reference: p.reference || p.notes || '-',
        is_outflow: isOutflow,
        amount: Number(p.amount) || 0
      });
    });

    // Sort descending by date
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [salesDocuments, purchases, transitShipments, payments, suppliers, customers]);

  // Financial Calculations (Realized Inflow)
  const totalInflow = allTransactions
    .filter(t => !t.is_outflow)
    .reduce((s, t) => {
      // If sales document, only real cash/bank/cheque paid amount counts towards realized cashflow!
      if (t.doc_type === 'sales') {
        return s + (Number(t.paid_amount) || 0);
      }
      return s + t.amount;
    }, 0);

  const totalOutflow = allTransactions.filter(t => t.is_outflow).reduce((s, t) => s + t.amount, 0);
  const netCashflow = totalInflow - totalOutflow;
  const pendingChequesTotal = cheques.filter(c => c.direction === 'received' && (c.status === 'received' || c.status === 'held' || c.status === 'deposited')).reduce((s, c) => s + (Number(c.amount) || 0), 0);
  
  const capitalInflowsTotal = allTransactions
    .filter(t => !t.is_outflow && (
      (t.category || '').toLowerCase().includes('capital') ||
      (t.category || '').toLowerCase().includes('equity') ||
      (t.category || '').toLowerCase().includes('loan') ||
      (t.category || '').toLowerCase().includes('rebate') ||
      (t.category || '').toLowerCase().includes('inflow') ||
      (t.category || '').toLowerCase().includes('investment')
    ))
    .reduce((s, t) => s + t.amount, 0);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(t => {
      if (filterType === 'inflow' && t.is_outflow) return false;
      if (filterType === 'outflow' && !t.is_outflow) return false;
      if (filterType === 'capital') {
        const cat = (t.category || '').toLowerCase();
        const isCapital = !t.is_outflow && (
          cat.includes('capital') ||
          cat.includes('equity') ||
          cat.includes('loan') ||
          cat.includes('rebate') ||
          cat.includes('inflow') ||
          cat.includes('investment')
        );
        if (!isCapital) return false;
      }
      if (filterType === 'cash') {
        if (!String(t.method || '').toLowerCase().includes('cash')) return false;
        if (t.payment_status === 'credit' || (String(t.method || '').toLowerCase().includes('credit') && (Number(t.paid_amount) || 0) === 0)) return false;
      }
      if (filterType === 'bank') {
        if (!String(t.method || '').toLowerCase().includes('bank')) return false;
        if (t.payment_status === 'credit' || (String(t.method || '').toLowerCase().includes('credit') && (Number(t.paid_amount) || 0) === 0)) return false;
      }
      if (filterType === 'cheque' && !String(t.method || '').toLowerCase().includes('cheque')) return false;
      if (filterType === 'credit') {
        const isCred = String(t.method || '').toLowerCase().includes('credit') ||
                       String(t.reference || '').toLowerCase().includes('credit') ||
                       t.payment_status === 'credit';
        if (!isCred) return false;
      }
      if (filterType === 'cod' && !String(t.method || '').toLowerCase().includes('cod')) return false;

      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        t.voucher_no?.toLowerCase().includes(term) ||
        t.party?.toLowerCase().includes(term) ||
        t.category?.toLowerCase().includes(term) ||
        t.reference?.toLowerCase().includes(term) ||
        t.method?.toLowerCase().includes(term)
      );
    });
  }, [allTransactions, filterType, searchTerm]);

  const handleSaveExpense = (e) => {
    e.preventDefault();
    const amt = Number(expenseForm.amount);
    if (amt <= 0) {
      notifyError('Please enter a valid expense amount');
      return;
    }

    try {
      recordDirectExpense({
        amount: amt,
        expense_category: expenseForm.expense_category,
        payment_date: expenseForm.payment_date,
        payment_method: expenseForm.payment_method,
        bank_account_id: expenseForm.payment_method === 'bank' ? (expenseForm.bank_account_id || bankAccounts[0]?.id || 'bank-default') : null,
        payee_name: expenseForm.payee_name,
        reference: expenseForm.reference,
        notes: expenseForm.notes
      });
      setIsExpenseModalOpen(false);
      setExpenseForm({
        amount: '',
        expense_category: 'General Expense',
        payment_date: new Date().toISOString().slice(0, 10),
        payment_method: 'cash',
        bank_account_id: bankAccounts[0]?.id || '',
        payee_name: '',
        reference: '',
        notes: ''
      });
    } catch (err) {
      notifyError(err.message);
    }
  };

  const handleSaveIncome = (e) => {
    e.preventDefault();
    const amt = Number(incomeForm.amount);
    if (amt <= 0) {
      notifyError('Please enter a valid inflow amount');
      return;
    }

    try {
      recordDirectIncome({
        amount: amt,
        income_category: incomeForm.income_category,
        payment_date: incomeForm.payment_date,
        payment_method: incomeForm.payment_method,
        bank_account_id: incomeForm.payment_method === 'bank' ? (incomeForm.bank_account_id || bankAccounts[0]?.id || 'bank-default') : null,
        payer_name: incomeForm.payer_name,
        reference: incomeForm.reference,
        notes: incomeForm.notes
      });
      setIsIncomeModalOpen(false);
      setIncomeForm({
        amount: '',
        income_category: "Owner's Capital Investment (Initial)",
        payment_date: new Date().toISOString().slice(0, 10),
        payment_method: 'cash',
        bank_account_id: bankAccounts[0]?.id || '',
        payer_name: 'Managing Director / Owner',
        reference: '',
        notes: ''
      });
    } catch (err) {
      notifyError(err.message);
    }
  };

  const handleDeleteTransaction = async (t) => {
    if (!window.confirm(`Are you sure you want to delete this cashflow entry (${t.voucher_no} - Rs. ${Number(t.amount || 0).toLocaleString()})?`)) {
      return;
    }

    try {
      // 1. If it's linked to a sales document
      if (t.doc_type === 'sales' || (t.id && String(t.id).startsWith('sales-doc-'))) {
        const docId = t.doc_id || String(t.id).replace('sales-doc-', '');
        if (docId) {
          await deleteSalesDocument(docId);
          notifySuccess(`Sales document ${t.voucher_no} and cashflow entry removed`);
          return;
        }
      }

      // 2. If it's linked to a purchase document
      if (t.doc_type === 'purchase' || (t.id && String(t.id).startsWith('pur-doc-'))) {
        const docId = t.doc_id || String(t.id).replace('pur-doc-', '');
        if (docId) {
          await deletePurchaseDocument(docId);
          notifySuccess(`Purchase document ${t.voucher_no} and cashflow entry removed`);
          return;
        }
      }

      // 3. If it's linked to a transit shipment
      if (t.doc_type === 'transit' || (t.id && String(t.id).startsWith('trn-shp-'))) {
        const docId = t.doc_id || String(t.id).replace('trn-shp-', '');
        if (docId) {
          await deleteTransitShipment(docId);
          notifySuccess(`Transit shipment ${t.voucher_no} removed`);
          return;
        }
      }

      // 4. If it exists in payments list, delete it
      const foundPayment = payments.find(p => p.id === t.id);
      if (foundPayment) {
        await deletePayment(t.id);
        notifySuccess('Payment transaction removed');
        return;
      }

      // 5. Fallback: match payment by voucher_no or reference
      const byVoucher = payments.find(p => p.payment_no === t.voucher_no || (p.reference && t.reference && p.reference === t.reference));
      if (byVoucher) {
        await deletePayment(byVoucher.id);
        notifySuccess('Payment transaction removed');
        return;
      }

      notifySuccess('Transaction removed');
    } catch (err) {
      notifyError('Failed to delete transaction: ' + err.message);
    }
  };

  return (
    <div className="page-section" style={{ padding: 18 }}>
      {/* Top Stat Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
        <div className="panel-card" style={{ borderLeft: '4px solid #52e37e' }}>
          <small style={{ color: 'var(--muted)', fontWeight: 600 }}>TOTAL CASH & BANK INFLOW</small>
          <div className="mono font-semibold" style={{ fontSize: 24, marginTop: 4, color: '#52e37e' }}>
            +{formatCurrency(totalInflow)}
          </div>
          <small style={{ color: '#888', display: 'block', marginTop: 4 }}>Capital, sales & settlements</small>
        </div>

        <div className="panel-card" style={{ borderLeft: '4px solid #38bdf8' }}>
          <small style={{ color: 'var(--muted)', fontWeight: 600 }}>INVESTED CAPITAL & OTHER INFLOW</small>
          <div className="mono font-semibold" style={{ fontSize: 24, marginTop: 4, color: '#38bdf8' }}>
            +{formatCurrency(capitalInflowsTotal)}
          </div>
          <small style={{ color: '#888', display: 'block', marginTop: 4 }}>Owner equity, loans & rebates</small>
        </div>

        <div className="panel-card" style={{ borderLeft: '4px solid #ff8e8e' }}>
          <small style={{ color: 'var(--muted)', fontWeight: 600 }}>TOTAL PAYMENTS / OUTFLOW</small>
          <div className="mono font-semibold" style={{ fontSize: 24, marginTop: 4, color: '#ff8e8e' }}>
            -{formatCurrency(totalOutflow)}
          </div>
          <small style={{ color: '#888', display: 'block', marginTop: 4 }}>Imports, purchases & expenses</small>
        </div>

        <div className="panel-card" style={{ borderLeft: `4px solid ${netCashflow >= 0 ? '#0284c7' : '#ffca58'}` }}>
          <small style={{ color: 'var(--muted)', fontWeight: 600 }}>NET OPERATING CASHFLOW</small>
          <div className="mono font-semibold" style={{ fontSize: 24, marginTop: 4, color: netCashflow >= 0 ? '#0284c7' : '#ffca58' }}>
            {formatCurrency(netCashflow)}
          </div>
          <small style={{ color: '#888', display: 'block', marginTop: 4 }}>Inflow minus Outflow</small>
        </div>

        <div className="panel-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <small style={{ color: 'var(--muted)', fontWeight: 600 }}>PENDING CHEQUES CLEARING</small>
          <div className="mono font-semibold" style={{ fontSize: 24, marginTop: 4, color: 'var(--primary)' }}>
            {formatCurrency(pendingChequesTotal)}
          </div>
          <small style={{ color: '#888', display: 'block', marginTop: 4 }}>Awaiting bank clearance</small>
        </div>
      </div>

      {/* Control Bar */}
      <div className="action-bar" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 10, flex: 1 }}>
          <input
            type="text"
            placeholder="Search by voucher #, payee, note, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: 360 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="primary-button"
            onClick={() => setIsIncomeModalOpen(true)}
            style={{ background: '#1d733a', borderColor: '#28a745', fontWeight: 700 }}
          >
            + Record Capital / Inflow
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setIsExpenseModalOpen(true)}
            style={{ borderColor: 'rgba(255,142,142,0.4)', color: '#ff8e8e', fontWeight: 700 }}
          >
            + Record Expense / Outflow
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={async () => {
              if (window.confirm("WARNING: Are you sure you want to delete all transactions and documents across all devices?\n\nThis will permanently wipe all sales invoices, purchases, in-transit shipments, and payments from Supabase Cloud and local cache, resetting stock to 0 while keeping your products and customer list.")) {
                await resetTransactionsOnly();
              }
            }}
            style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444', fontWeight: 600 }}
            title="Reset and clear all transactions and documents across all devices"
          >
            🗑️ Wipe Transactions
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`secondary-button small-button ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All Ledger ({allTransactions.length})
          </button>
          <button
            type="button"
            className={`secondary-button small-button ${filterType === 'inflow' ? 'active' : ''}`}
            onClick={() => setFilterType('inflow')}
            style={{ color: '#52e37e' }}
          >
            + All Inflows
          </button>
          <button
            type="button"
            className={`secondary-button small-button ${filterType === 'capital' ? 'active' : ''}`}
            onClick={() => setFilterType('capital')}
            style={{ color: '#38bdf8' }}
          >
            💰 Capital & Non-Sales
          </button>
          <button
            type="button"
            className={`secondary-button small-button ${filterType === 'outflow' ? 'active' : ''}`}
            onClick={() => setFilterType('outflow')}
            style={{ color: '#ff8e8e' }}
          >
            - Outflows
          </button>
          <button
            type="button"
            className={`secondary-button small-button ${filterType === 'cash' ? 'active' : ''}`}
            onClick={() => setFilterType('cash')}
          >
            💵 Cash
          </button>
          <button
            type="button"
            className={`secondary-button small-button ${filterType === 'bank' ? 'active' : ''}`}
            onClick={() => setFilterType('bank')}
          >
            🏦 Bank
          </button>
          <button
            type="button"
            className={`secondary-button small-button ${filterType === 'cheque' ? 'active' : ''}`}
            onClick={() => setFilterType('cheque')}
          >
            📝 Cheques
          </button>
          <button
            type="button"
            className={`secondary-button small-button ${filterType === 'credit' ? 'active' : ''}`}
            onClick={() => setFilterType('credit')}
            style={{ color: '#ffca58' }}
          >
            ⏳ Credit / Due
          </button>
          <button
            type="button"
            className={`secondary-button small-button ${filterType === 'cod' ? 'active' : ''}`}
            onClick={() => setFilterType('cod')}
            style={{ color: '#f59e0b' }}
          >
            📦 COD
          </button>
        </div>
      </div>

      {/* Cashflow Ledger Table */}
      <div className="large-table" style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 6 }}>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Voucher / Ref #</th>
              <th>Category</th>
              <th>Party / Payee</th>
              <th>Method</th>
              <th>Reference / Notes</th>
              <th style={{ textAlign: 'right' }}>Amount (LKR)</th>
              <th style={{ width: 60, textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map(t => (
              <tr key={t.id}>
                <td>{formatDate(t.date)}</td>
                <td className="mono font-semibold" style={{ color: 'var(--primary)' }}>
                  {t.voucher_no}
                </td>
                <td>
                  <span
                    className={`badge ${
                      t.is_outflow
                        ? 'badge-danger'
                        : (t.category?.toLowerCase().includes('capital') || t.category?.toLowerCase().includes('equity') || t.category?.toLowerCase().includes('loan') || t.category?.toLowerCase().includes('rebate') || t.category?.toLowerCase().includes('inflow'))
                          ? 'badge-primary'
                          : 'badge-success'
                    }`}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {t.category}
                  </span>
                </td>
                <td style={{ fontWeight: 700 }}>{t.party}</td>
                <td>
                  <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {String(t.method || '').toLowerCase().includes('credit') || t.payment_status === 'credit'
                      ? '⏳ Credit / Due'
                      : String(t.method || '').toLowerCase().includes('cod')
                        ? '📦 COD'
                        : String(t.method || '').toLowerCase().includes('cheque')
                          ? '📝 Cheque'
                          : String(t.method || '').toLowerCase().includes('bank')
                            ? '🏦 Bank'
                            : String(t.method || '').toLowerCase().includes('cash')
                              ? '💵 Cash'
                              : `💳 ${t.method || 'Standard'}`}
                  </span>
                </td>
                <td style={{ color: 'var(--muted)', fontSize: 12 }}>{t.reference}</td>
                <td className="mono font-semibold" style={{ textAlign: 'right', fontSize: 14, color: t.is_outflow ? '#ff8e8e' : '#52e37e' }}>
                  {t.is_outflow ? '-' : '+'}{formatCurrency(t.amount)}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleDeleteTransaction(t)}
                    className="secondary-button small-button"
                    style={{ color: '#ff8e8e', padding: '3px 8px', fontSize: 12 }}
                    title="Delete this transaction from Cash Flow"
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}

            {filteredTransactions.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                  No cashflow transactions found matching your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Record Direct Expense / Outflow */}
      {isExpenseModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box modal-md">
            <div className="modal-header">
              <h3>+ Record Operational Expense / Cash Outflow</h3>
              <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="modal-close">&times;</button>
            </div>

            <form onSubmit={handleSaveExpense}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label>Expense Amount (Rs) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      autoFocus
                      className="mono font-semibold"
                      placeholder="e.g. 15000"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>Payment Date *</label>
                    <input
                      type="date"
                      required
                      value={expenseForm.payment_date}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, payment_date: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                  <div>
                    <label>Expense Category</label>
                    <select
                      value={expenseForm.expense_category}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, expense_category: e.target.value }))}
                    >
                      <option value="General Expense">General Operational Expense</option>
                      <option value="Shop Rent">Shop / Warehouse Rent</option>
                      <option value="Electricity & Utilities">Electricity & Utilities</option>
                      <option value="Transport & Delivery">Transport & Local Delivery</option>
                      <option value="Staff Salaries">Staff Salaries / Allowance</option>
                      <option value="Petty Cash">Petty Cash Top-up</option>
                      <option value="Packaging & Printing">Packaging & Bill Printing</option>
                      <option value="Maintenance">Equipment / Repair Maintenance</option>
                    </select>
                  </div>
                  <div>
                    <label>Payee / Paid To</label>
                    <input
                      type="text"
                      placeholder="e.g. Landlord, CEB, Driver, Staff"
                      value={expenseForm.payee_name}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, payee_name: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <label>Payment Method *</label>
                  <div className="payment-method-selector">
                    <button
                      type="button"
                      className={`payment-method-btn cash ${expenseForm.payment_method === 'cash' ? 'active' : ''}`}
                      onClick={() => setExpenseForm(prev => ({ ...prev, payment_method: 'cash' }))}
                    >
                      <span>💵</span> Cash
                    </button>
                    <button
                      type="button"
                      className={`payment-method-btn bank ${expenseForm.payment_method === 'bank' ? 'active' : ''}`}
                      onClick={() => setExpenseForm(prev => ({ ...prev, payment_method: 'bank' }))}
                    >
                      <span>🏦</span> Bank Transfer
                    </button>
                    <button
                      type="button"
                      className={`payment-method-btn cheque ${expenseForm.payment_method === 'cheque' ? 'active' : ''}`}
                      onClick={() => setExpenseForm(prev => ({ ...prev, payment_method: 'cheque' }))}
                    >
                      <span>📝</span> Cheque
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                  <div>
                    <label>Bill / Voucher Reference</label>
                    <input
                      type="text"
                      placeholder="e.g. Receipt #, Bank Slip #, Bill #"
                      value={expenseForm.reference}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, reference: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>Notes</label>
                    <input
                      type="text"
                      placeholder="Additional notes"
                      value={expenseForm.notes}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="secondary-button">
                  Cancel
                </button>
                <button type="submit" className="primary-button" style={{ fontWeight: 800 }}>
                  Save Expense Outflow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Capital Investment / Direct Inflow */}
      {isIncomeModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box modal-md" style={{ maxWidth: 540 }}>
            <div className="modal-header" style={{ background: '#12251a', borderBottom: '1px solid #10b981' }}>
              <h3 style={{ color: '#52e37e', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <span>💰</span> Record Capital / Cash Inflow
              </h3>
              <button
                type="button"
                onClick={() => setIsIncomeModalOpen(false)}
                className="modal-close"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveIncome}>
              <div className="modal-body" style={{ padding: 20 }}>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 0, marginBottom: 14 }}>
                  Record initial starting capital, partner equity, bank loan, rebates, or non-sales cash injections to maintain accurate cashflow.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label>Inflow Amount (LKR) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      autoFocus
                      className="mono font-semibold"
                      placeholder="e.g. 5000000"
                      value={incomeForm.amount}
                      onChange={(e) => setIncomeForm(prev => ({ ...prev, amount: e.target.value }))}
                      style={{ fontSize: 16, color: '#52e37e' }}
                    />
                  </div>
                  <div>
                    <label>Received Date *</label>
                    <input
                      type="date"
                      required
                      value={incomeForm.payment_date}
                      onChange={(e) => setIncomeForm(prev => ({ ...prev, payment_date: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <label>Inflow / Capital Category *</label>
                  <select
                    value={incomeForm.income_category}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, income_category: e.target.value }))}
                    style={{ fontWeight: 600 }}
                  >
                    <optgroup label="Owner & Equity Capital">
                      <option value="Owner's Capital Investment (Initial)">Owner's Initial Capital Investment</option>
                      <option value="Additional Owner Equity / Capital Injection">Additional Owner Equity / Capital Injection</option>
                      <option value="Partner / Shareholder Contribution">Partner / Shareholder Contribution</option>
                      <option value="Director / Owner Personal Loan to Business">Director / Owner Personal Loan to Business</option>
                    </optgroup>
                    <optgroup label="Financing & Loans">
                      <option value="Bank Business Loan / Financing Facility">Bank Business Loan / Financing Facility</option>
                      <option value="Short-term Working Capital Loan">Short-term Working Capital Loan</option>
                    </optgroup>
                    <optgroup label="Rebates & Supplier Incentives">
                      <option value="Supplier Volume Rebate / Bonus">Supplier Volume Rebate / Bonus</option>
                      <option value="Supplier Warranty Claim / Compensation">Supplier Warranty Claim / Compensation</option>
                    </optgroup>
                    <optgroup label="Assets & Other Inflows">
                      <option value="Disposal / Sale of Used Equipment or Assets">Disposal / Sale of Used Equipment or Assets</option>
                      <option value="Packaging Scrap / Recycling Income">Packaging Scrap / Recycling Income</option>
                      <option value="Bank Interest & Financial Income">Bank Interest & Financial Income</option>
                      <option value="Other Non-Sales Inflow">Other Non-Sales Inflow</option>
                    </optgroup>
                  </select>
                </div>

                <div style={{ marginTop: 12 }}>
                  <label>Investor / Payer / Source</label>
                  <input
                    type="text"
                    placeholder="e.g. Managing Director, Commercial Bank, Partner Name"
                    value={incomeForm.payer_name}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, payer_name: e.target.value }))}
                  />
                </div>

                <div style={{ marginTop: 12 }}>
                  <label>Deposit / Inflow Method *</label>
                  <div className="payment-method-selector">
                    <button
                      type="button"
                      className={`payment-method-btn cash ${incomeForm.payment_method === 'cash' ? 'active' : ''}`}
                      onClick={() => setIncomeForm(prev => ({ ...prev, payment_method: 'cash' }))}
                    >
                      <span>💵</span> Cash Drawer
                    </button>
                    <button
                      type="button"
                      className={`payment-method-btn bank ${incomeForm.payment_method === 'bank' ? 'active' : ''}`}
                      onClick={() => setIncomeForm(prev => ({ ...prev, payment_method: 'bank' }))}
                    >
                      <span>🏦</span> Bank Deposit
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                  <div>
                    <label>Deposit Slip / Reference #</label>
                    <input
                      type="text"
                      placeholder="e.g. Slip #8812, Transfer Ref, Cheque #"
                      value={incomeForm.reference}
                      onChange={(e) => setIncomeForm(prev => ({ ...prev, reference: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>Description / Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Initial capital to purchase wholesale stock"
                      value={incomeForm.notes}
                      onChange={(e) => setIncomeForm(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsIncomeModalOpen(false)} className="secondary-button">
                  Cancel
                </button>
                <button type="submit" className="primary-button" style={{ background: '#1d733a', borderColor: '#28a745', fontWeight: 800 }}>
                  Save Capital Inflow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
