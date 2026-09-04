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
    cheques = [],
    suppliers = [],
    customers = []
  } = useBusiness();

  const { notifySuccess, notifyError } = useNotification();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'inflow' | 'outflow' | 'capital' | 'cash' | 'bank' | 'cheque'
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isSavingEntry, setIsSavingEntry] = useState(false);

  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    expense_category: 'General Expense',
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: 'cash',
    bank_account_id: bankAccounts[0]?.id || '',
    cheque_no: '',
    cheque_date: new Date().toISOString().slice(0, 10),
    cheque_bank: '',
    cheque_branch: '',
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
    payer_name: '',
    reference: '',
    notes: ''
  });

  // Cash flow is built from actual payment rows only. Sales, purchase and
  // transit documents are commitments/source documents, not a second cash
  // movement. This keeps every real-world payment represented exactly once.
  const allTransactions = useMemo(() => {
    const list = payments.map(p => {
      const isOutflow = p.payment_type === 'transit_purchase_payment' ||
                        p.payment_type === 'purchase_payment' ||
                        p.payment_type === 'operational_expense' ||
                        p.payment_type === 'supplier_advance' ||
                        p.payment_type === 'expense' ||
                        p.payment_type === 'customer_refund';

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

      const categoryLabels = {
        sales_receipt: 'Sales Receipt',
        customer_payment: 'Customer Payment',
        customer_settlement: 'Customer Settlement',
        customer_advance: 'Customer Advance',
        customer_refund: 'Customer Refund',
        purchase_payment: 'Purchase Payment',
        transit_purchase_payment: 'Transit Purchase Payment',
        supplier_payment: 'Supplier Payment',
        supplier_advance: 'Supplier Advance',
        supplier_refund: 'Supplier Refund',
        operational_expense: 'Operating Expense',
        expense: 'Expense',
        direct_income: 'Capital / Other Inflow',
        other_income: 'Other Income'
      };
      const categoryLabel = p.income_category || p.expense_category || categoryLabels[p.payment_type] || 'Payment';

      const linkedCheque = p.cheque_id
        ? cheques.find(cheque => String(cheque.id) === String(p.cheque_id))
        : cheques.find(cheque => String(cheque.payment_id) === String(p.id));
      const chequeStatus = linkedCheque?.status || (p.payment_method === 'cheque' ? 'pending' : null);
      const isPendingCheque = p.payment_method === 'cheque' && chequeStatus !== 'cleared';

      // An entry is ONLY a direct cashflow expense/income if it was recorded inside Cash Flow without a document
      const isDirectCashflow = (
        p.payment_type === 'operational_expense' ||
        p.payment_type === 'expense' ||
        p.payment_type === 'direct_income' ||
        String(p.id).startsWith('pay-exp-') ||
        String(p.id).startsWith('pay-inc-') ||
        p.payment_no?.startsWith('EXP-') ||
        p.payment_no?.startsWith('CAP-')
      ) && !p.sales_doc_id && !p.purchase_doc_id && !p.purchase_id && !p.transit_shipment_id && !p.order_id;

      return {
        id: p.id,
        voucher_no: p.payment_no || `PAY-${p.id?.slice(-4)}`,
        date: p.payment_date || p.created_at,
        category: categoryLabel,
        party: partyName || 'General Account',
        method: p.payment_method || 'cash',
        reference: [p.reference || p.notes || '-', linkedCheque ? `Cheque #${linkedCheque.cheque_no} (${chequeStatus})` : ''].filter(Boolean).join(' · '),
        is_outflow: isOutflow,
        amount: Number(p.amount) || 0,
        cheque_status: chequeStatus,
        is_pending_cheque: isPendingCheque,
        is_direct_cashflow: isDirectCashflow,
        is_document_entry: !isDirectCashflow
      };
    });

    // Sort descending by date
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [payments, cheques, suppliers, customers]);

  // Financial Calculations (Realized Inflow)
  const totalInflow = allTransactions
    .filter(t => !t.is_outflow && !t.is_pending_cheque)
    .reduce((s, t) => s + t.amount, 0);

  const totalOutflow = allTransactions.filter(t => t.is_outflow && !t.is_pending_cheque).reduce((s, t) => s + t.amount, 0);
  const netCashflow = totalInflow - totalOutflow;
  const pendingChequesTotal = cheques.filter(c => c.status === 'received' || c.status === 'held' || c.status === 'deposited').reduce((s, c) => s + (Number(c.amount) || 0), 0);
  
  const capitalInflowsTotal = allTransactions
    .filter(t => !t.is_outflow && !t.is_pending_cheque && (
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

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (isSavingEntry) return;
    const amt = Number(expenseForm.amount);
    if (amt <= 0) {
      notifyError('Please enter a valid expense amount');
      return;
    }

    setIsSavingEntry(true);
    try {
      await recordDirectExpense({
        amount: amt,
        expense_category: expenseForm.expense_category,
        payment_date: expenseForm.payment_date,
        payment_method: expenseForm.payment_method,
        bank_account_id: expenseForm.payment_method === 'bank' ? expenseForm.bank_account_id : null,
        cheque_no: expenseForm.cheque_no,
        cheque_date: expenseForm.cheque_date,
        cheque_bank: expenseForm.cheque_bank,
        cheque_branch: expenseForm.cheque_branch,
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
        cheque_no: '',
        cheque_date: new Date().toISOString().slice(0, 10),
        cheque_bank: '',
        cheque_branch: '',
        payee_name: '',
        reference: '',
        notes: ''
      });
    } catch (err) {
      notifyError(err.message);
    } finally {
      setIsSavingEntry(false);
    }
  };

  const handleSaveIncome = async (e) => {
    e.preventDefault();
    if (isSavingEntry) return;
    const amt = Number(incomeForm.amount);
    if (amt <= 0) {
      notifyError('Please enter a valid inflow amount');
      return;
    }

    setIsSavingEntry(true);
    try {
      await recordDirectIncome({
        amount: amt,
        income_category: incomeForm.income_category,
        payment_date: incomeForm.payment_date,
        payment_method: incomeForm.payment_method,
        bank_account_id: incomeForm.payment_method === 'bank' ? incomeForm.bank_account_id : null,
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
        payer_name: '',
        reference: '',
        notes: ''
      });
    } catch (err) {
      notifyError(err.message);
    } finally {
      setIsSavingEntry(false);
    }
  };

  const handleDeleteTransaction = async (t) => {
    if (!t.is_direct_cashflow) {
      notifyError('Document-linked transactions cannot be deleted directly from Cash Flow. Please delete the source document in Sales Documents, Purchase Documents, or Stock in Transit.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete this recorded cashflow entry (${t.voucher_no} - Rs. ${Number(t.amount || 0).toLocaleString()})?`)) {
      return;
    }

    try {
      // 1. Delete direct payment if found by id
      const foundPayment = payments.find(p => p.id === t.id);
      if (foundPayment) {
        await deletePayment(t.id);
        notifySuccess('Cashflow entry removed');
        return;
      }

      // 2. Fallback: match payment by voucher_no or reference
      const byVoucher = payments.find(p => p.payment_no === t.voucher_no || (p.reference && t.reference && p.reference === t.reference));
      if (byVoucher) {
        await deletePayment(byVoucher.id);
        notifySuccess('Cashflow entry removed');
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
                    disabled={!t.is_direct_cashflow}
                    onClick={() => {
                      if (t.is_direct_cashflow) {
                        handleDeleteTransaction(t);
                      }
                    }}
                    className="secondary-button small-button"
                    style={{
                      color: t.is_direct_cashflow ? '#ff8e8e' : '#666666',
                      opacity: t.is_direct_cashflow ? 1 : 0.3,
                      cursor: t.is_direct_cashflow ? 'pointer' : 'not-allowed',
                      padding: '3px 8px',
                      fontSize: 12,
                      border: t.is_direct_cashflow ? '1px solid rgba(255,142,142,0.4)' : '1px solid rgba(255,255,255,0.06)'
                    }}
                    title={
                      t.is_direct_cashflow
                        ? "Delete this recorded expense/income entry"
                        : "Document-linked entry. To remove, delete the source document in Sales, Purchases, or Transit."
                    }
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

                {expenseForm.payment_method === 'bank' && (
                  <div style={{ marginTop: 12 }}>
                    <label>Bank Account *</label>
                    <select
                      required
                      value={expenseForm.bank_account_id}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, bank_account_id: e.target.value }))}
                    >
                      <option value="">Select bank account</option>
                      {bankAccounts.map(account => <option key={account.id} value={account.id}>{account.account_name} ({account.bank_name})</option>)}
                    </select>
                  </div>
                )}

                {expenseForm.payment_method === 'cheque' && (
                  <div className="transaction-details-grid" style={{ marginTop: 12 }}>
                    <div><label>Cheque Number *</label><input required value={expenseForm.cheque_no} onChange={(e) => setExpenseForm(prev => ({ ...prev, cheque_no: e.target.value }))} /></div>
                    <div><label>Cheque Date *</label><input type="date" required value={expenseForm.cheque_date} onChange={(e) => setExpenseForm(prev => ({ ...prev, cheque_date: e.target.value }))} /></div>
                    <div><label>Cheque Bank *</label><input required value={expenseForm.cheque_bank} onChange={(e) => setExpenseForm(prev => ({ ...prev, cheque_bank: e.target.value }))} /></div>
                    <div><label>Branch</label><input value={expenseForm.cheque_branch} onChange={(e) => setExpenseForm(prev => ({ ...prev, cheque_branch: e.target.value }))} /></div>
                  </div>
                )}

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
                <button type="submit" className="primary-button" style={{ fontWeight: 800 }} disabled={isSavingEntry}>
                  {isSavingEntry ? 'Saving…' : 'Save Expense Outflow'}
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

                {incomeForm.payment_method === 'bank' && (
                  <div style={{ marginTop: 12 }}>
                    <label>Receiving Bank Account *</label>
                    <select
                      required
                      value={incomeForm.bank_account_id}
                      onChange={(e) => setIncomeForm(prev => ({ ...prev, bank_account_id: e.target.value }))}
                    >
                      <option value="">Select bank account</option>
                      {bankAccounts.map(account => <option key={account.id} value={account.id}>{account.account_name} ({account.bank_name})</option>)}
                    </select>
                  </div>
                )}

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
                <button type="submit" className="primary-button" style={{ background: '#1d733a', borderColor: '#28a745', fontWeight: 800 }} disabled={isSavingEntry}>
                  {isSavingEntry ? 'Saving…' : 'Save Capital Inflow'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
