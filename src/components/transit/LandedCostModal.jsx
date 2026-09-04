import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency } from '../../lib/formatters';

export default function LandedCostModal({ isOpen, onClose, shipmentId }) {
  const { transitShipments, currencies, addLandedCostExpense, bankAccounts } = useBusiness();

  const shipment = transitShipments.find(s => s.id === shipmentId);

  const [form, setForm] = useState({
    expense_type: 'customs_duty',
    payee: 'Sri Lanka Customs',
    currency: 'LKR',
    amount: 125000,
    exchange_rate: 1.0,
    paid_by: 'bank',
    bank_account_id: bankAccounts[0]?.id || '',
    reference: '',
    notes: 'Import tariff & PAL charge'
  });

  if (!isOpen || !shipment) return null;

  const handleCurrencyChange = (currCode) => {
    const rate = currencies.find(c => c.code === currCode)?.exchange_rate_to_lkr || 1.0;
    setForm(prev => ({
      ...prev,
      currency: currCode,
      exchange_rate: rate
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addLandedCostExpense(shipmentId, form);
      onClose();
    } catch {
      // The shared sync layer keeps the dialog open and displays the cloud error.
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box modal-lg">
        <div className="modal-header">
          <h3>Record Landed Expense for Shipment: {shipment.shipment_no}</h3>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ background: '#242424', padding: 12, border: '1px solid var(--line)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>BILL OF LADING</span>
                <div className="mono font-semibold">{shipment.bill_of_lading_no || 'Pending B/L'}</div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>CARRIER</span>
                <div style={{ fontWeight: 600 }}>{shipment.shipping_line_carrier || '-'}</div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>TOTAL EXPENSES SO FAR</span>
                <div className="mono font-semibold" style={{ color: '#ffca58' }}>
                  {formatCurrency(shipment.total_landed_expenses_lkr || 0)}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label>Expense Category *</label>
                <select
                  value={form.expense_type}
                  onChange={(e) => setForm(prev => ({ ...prev, expense_type: e.target.value }))}
                >
                  <option value="sea_freight">Sea Freight</option>
                  <option value="air_freight">Air Freight</option>
                  <option value="customs_duty">Customs Duty & Tariff</option>
                  <option value="port_demurrage">Port Demurrage / Wharfage</option>
                  <option value="clearing_agent">Clearing Agent Fees</option>
                  <option value="local_transport">Local Transportation / Delivery</option>
                  <option value="insurance">Marine Cargo Insurance</option>
                  <option value="other_landed">Other Landed Expense</option>
                </select>
              </div>

              <div>
                <label>Payee / Vendor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sri Lanka Customs, Maersk, C&F Agent"
                  value={form.payee}
                  onChange={(e) => setForm(prev => ({ ...prev, payee: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 140px', gap: 12 }}>
              <div>
                <label>Currency</label>
                <select
                  value={form.currency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                >
                  {currencies.map(c => (
                    <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="mono"
                  value={form.amount}
                  onChange={(e) => setForm(prev => ({ ...prev, amount: Number(e.target.value) || 0 }))}
                />
              </div>

              <div>
                <label>Exchange Rate</label>
                <input
                  type="number"
                  step="0.0001"
                  className="mono"
                  value={form.exchange_rate}
                  onChange={(e) => setForm(prev => ({ ...prev, exchange_rate: Number(e.target.value) || 1 }))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label>Payment Method</label>
                <select
                  value={form.paid_by || 'bank'}
                  onChange={(e) => setForm(prev => ({ ...prev, paid_by: e.target.value }))}
                >
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              <div>
                <label>Invoice / Receipt Reference</label>
                <input
                  type="text"
                  placeholder="e.g. CUS-INV-998811"
                  value={form.reference}
                  onChange={(e) => setForm(prev => ({ ...prev, reference: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="secondary-button">
              Cancel
            </button>
            <button type="submit" className="primary-button">
              Post Landed Expense & Allocate Cost
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
