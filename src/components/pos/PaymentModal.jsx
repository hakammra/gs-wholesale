import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency } from '../../lib/formatters';

export default function PaymentModal({
  totals = { grand_total: 0 },
  customer,
  docType = 'sales_invoice',
  onClose,
  onConfirmPayment
}) {
  const { bankAccounts = [], customers = [] } = useBusiness();
  const grandTotal = totals.grand_total || 0;

  const liveCustomer = customer
    ? (customers.find(c => String(c.id) === String(customer.id)) || customer)
    : null;

  const [paymentLines, setPaymentLines] = useState([
    {
      method: customer ? 'credit' : 'cash',
      amount: grandTotal,
      bank_account_id: (customer ? 'credit' : 'cash') === 'bank' ? (bankAccounts[0]?.id || '') : '',
      reference: ''
    }
  ]);

  const [chequeDetails, setChequeDetails] = useState({
    cheque_no: '',
    bank_name: '',
    branch: '',
    cheque_date: new Date().toISOString().slice(0, 10)
  });

  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalPaid = paymentLines.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remaining = grandTotal - totalPaid;

  const creditOrCodAmount = paymentLines.filter(p => p.method === 'credit' || p.method === 'cod').reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const currentReceivable = Number(liveCustomer?.current_receivable) || 0;
  const newTotalOutstanding = currentReceivable + creditOrCodAmount;

  const handleAddPaymentLine = (method) => {
    if (method === 'cheque' && paymentLines.some(line => line.method === 'cheque')) return;
    // If only 1 line exists and its amount is full or 0, switch the payment method cleanly
    if (paymentLines.length === 1 && (paymentLines[0].amount === grandTotal || paymentLines[0].amount === 0)) {
      setPaymentLines([{
        method,
        amount: grandTotal,
        bank_account_id: method === 'bank' ? (bankAccounts[0]?.id || '') : '',
        reference: ''
      }]);
      return;
    }
    setPaymentLines(prev => [...prev, {
      method,
      amount: remaining > 0 ? remaining : 0,
      bank_account_id: method === 'bank' ? (bankAccounts[0]?.id || '') : '',
      reference: ''
    }]);
  };

  const handleUpdateLine = (index, field, value) => {
    setPaymentLines(prev => prev.map((line, idx) => {
      if (idx !== index) return line;
      return { ...line, [field]: value };
    }));
  };

  const handleRemoveLine = (index) => {
    if (paymentLines.length === 1) return;
    setPaymentLines(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (docType === 'sales_invoice') {
      if (Math.abs(remaining) > 0.01) {
        alert(`Payment must equal grand total. Remaining balance: ${remaining.toFixed(2)} LKR`);
        return;
      }
    }

    const activeLines = paymentLines.filter(p => (Number(p.amount) || 0) > 0 || paymentLines.length === 1);
    setIsSubmitting(true);
    try {
      await onConfirmPayment({
        payment_lines: activeLines,
        cheque_details: activeLines.some(p => p.method === 'cheque') ? chequeDetails : null,
        notes
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box modal-lg" style={{ maxWidth: 780 }}>
        <div className="modal-header">
          <h3>
            {docType === 'reserved_order' || docType === 'sales_order' ? '📌 Process Customer Reservation & Advance' : '💳 Settle & Finalize Wholesale Invoice'}
          </h3>
          <button type="button" onClick={onClose} className="modal-close">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Top Total Banner */}
            <div
              style={{
                background: '#242424',
                padding: 14,
                border: '1px solid var(--line)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderRadius: 4
              }}
            >
              <div>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>BILL TOTAL</span>
                <div className="mono font-semibold" style={{ fontSize: 22, color: '#fff' }}>
                  {formatCurrency(grandTotal)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>ALLOCATED</span>
                <div className="mono font-semibold" style={{ fontSize: 22, color: '#52e37e' }}>
                  {formatCurrency(totalPaid)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>REMAINING</span>
                <div className="mono" style={{ fontSize: 22, fontWeight: 800, color: remaining > 0 ? '#ff8e8e' : 'var(--muted)' }}>
                  {formatCurrency(remaining)}
                </div>
              </div>
            </div>

            {/* Live Customer Account & Outstanding Balance Banner */}
            {liveCustomer && (
              <div style={{
                background: '#182438',
                border: '1px solid #3b82f6',
                borderRadius: 6,
                padding: '10px 14px',
                marginTop: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12
              }}>
                <div>
                  <div style={{ fontSize: 11, color: '#93c5fd', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>
                    CUSTOMER ACCOUNT: {liveCustomer.business_name}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                    Current Due Receivable: <strong className="mono" style={{ color: currentReceivable > 0 ? '#ff8e8e' : '#52e37e' }}>{formatCurrency(currentReceivable)}</strong>
                    {Number(liveCustomer.credit_limit || 0) > 0 && (
                      <span> &bull; Credit Limit: <span className="mono">{formatCurrency(liveCustomer.credit_limit)}</span></span>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#93c5fd', fontWeight: 700 }}>
                    NEW TOTAL OUTSTANDING BALANCE
                  </div>
                  <div className="mono font-semibold" style={{ fontSize: 20, color: newTotalOutstanding > 0 ? '#ff8e8e' : '#52e37e' }}>
                    {formatCurrency(newTotalOutstanding)}
                  </div>
                  {creditOrCodAmount > 0 && (
                    <div style={{ fontSize: 11.5, color: '#ffca58', fontWeight: 600 }}>
                      (+{formatCurrency(creditOrCodAmount)} added to credit / COD)
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Tender Buttons */}
            <div style={{ marginTop: 14 }}>
              <label style={{ marginBottom: 6, display: 'block' }}>ADD PAYMENT TENDER</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => handleAddPaymentLine('cash')} className="secondary-button">
                  + Cash
                </button>
                <button type="button" onClick={() => handleAddPaymentLine('bank')} className="secondary-button">
                  + Bank Transfer
                </button>
                <button type="button" onClick={() => handleAddPaymentLine('cheque')} className="secondary-button">
                  + Cheque
                </button>
                <button type="button" onClick={() => handleAddPaymentLine('credit')} className="secondary-button">
                  + Account Credit
                </button>
                <button
                  type="button"
                  onClick={() => handleAddPaymentLine('cod')}
                  className="secondary-button"
                  style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)', fontWeight: 700 }}
                >
                  📦 + COD (Cash on Delivery)
                </button>
              </div>
            </div>

            {/* Tender Lines Table */}
            <div style={{ marginTop: 14 }}>
              <table>
                <thead>
                  <tr>
                    <th>Method</th>
                    <th style={{ width: 140 }}>Amount (Rs)</th>
                    <th>Account / Details</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {paymentLines.map((line, idx) => (
                    <tr key={idx}>
                      <td>
                        <select
                          value={line.method}
                          onChange={(e) => handleUpdateLine(idx, 'method', e.target.value)}
                          style={{ fontWeight: 600 }}
                        >
                          <option value="cash">Cash</option>
                          <option value="bank">Bank Transfer</option>
                          <option value="cheque">Cheque</option>
                          <option value="credit">Customer Credit</option>
                          <option value="cod">📦 COD (Cash on Delivery)</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          required
                          className="mono font-semibold"
                          value={line.amount}
                          onChange={(e) => handleUpdateLine(idx, 'amount', Number(e.target.value) || 0)}
                        />
                      </td>
                      <td>
                        {line.method === 'bank' && (
                          <select
                            value={line.bank_account_id || ''}
                            onChange={(e) => handleUpdateLine(idx, 'bank_account_id', e.target.value)}
                            required
                            aria-label="Deposit bank account"
                          >
                            <option value="">Select bank account</option>
                            {bankAccounts.map(account => (
                              <option key={account.id} value={account.id}>{account.account_name} ({account.bank_name})</option>
                            ))}
                          </select>
                        )}
                        {line.method === 'cheque' && (
                          <span style={{ color: 'var(--primary)', fontSize: 12 }}>Details configured below</span>
                        )}
                        {line.method === 'credit' && (
                          <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                            Assigned to {customer?.business_name || 'Customer Account'}
                          </span>
                        )}
                        {line.method === 'cod' && (
                          <span style={{ color: '#f59e0b', fontSize: 12, fontWeight: 600 }}>
                            COD (Unpaid credit until delivered)
                          </span>
                        )}
                        {line.method === 'cash' && (
                          <span style={{ color: 'var(--muted)', fontSize: 12 }}>Cash Drawer</span>
                        )}
                      </td>
                      <td>
                        {paymentLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="secondary-button small-button"
                            style={{ color: '#ff8e8e' }}
                          >
                            &times;
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Post-dated Cheque Details if Cheque selected */}
            {paymentLines.some(p => p.method === 'cheque') && (
              <div style={{ background: '#242424', padding: 12, border: '1px solid var(--line)', marginTop: 14, borderRadius: 4 }}>
                <h4 style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--primary)' }}>Cheque Information</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <label>Cheque No *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 102948"
                      value={chequeDetails.cheque_no}
                      onChange={(e) => setChequeDetails(prev => ({ ...prev, cheque_no: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>Bank Name *</label>
                    <input
                      type="text"
                      required
                      value={chequeDetails.bank_name}
                      onChange={(e) => setChequeDetails(prev => ({ ...prev, bank_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>Branch</label>
                    <input
                      type="text"
                      value={chequeDetails.branch}
                      onChange={(e) => setChequeDetails(prev => ({ ...prev, branch: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>Cheque Date *</label>
                    <input
                      type="date"
                      required
                      value={chequeDetails.cheque_date}
                      onChange={(e) => setChequeDetails(prev => ({ ...prev, cheque_date: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <label>Invoice Notes / Reference</label>
              <input
                type="text"
                placeholder="Optional billing note..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="secondary-button">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (docType === 'sales_invoice' && Math.abs(remaining) > 0.01)}
              className="primary-button"
              style={{ fontWeight: 800 }}
            >
              {isSubmitting ? 'Saving securely…' : 'Confirm & Post Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
