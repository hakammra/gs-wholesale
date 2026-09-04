import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency } from '../../lib/formatters';

export default function SupplierList() {
  const { suppliers, saveSupplier, deleteSupplier, recordSupplierAdvance, bankAccounts, currencies } = useBusiness();
  const { notifySuccess } = useNotification();

  const [searchTerm, setSearchTerm] = useState('');
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [advanceSupplier, setAdvanceSupplier] = useState(null);
  const [isSavingAdvance, setIsSavingAdvance] = useState(false);

  const [advanceForm, setAdvanceForm] = useState({
    foreign_amount: '',
    currency: 'USD',
    exchange_rate: 305.5,
    payment_method: 'bank',
    bank_account_id: bankAccounts[0]?.id || '',
    cheque_no: '',
    cheque_date: new Date().toISOString().slice(0, 10),
    cheque_bank: '',
    reference: '',
    notes: ''
  });

  const filteredSuppliers = suppliers.filter(s => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return s.name?.toLowerCase().includes(term) || s.supplier_code?.toLowerCase().includes(term) || s.country?.toLowerCase().includes(term);
  });

  const handleOpenAdvance = (sup) => {
    const rate = currencies.find(c => c.code === sup.default_currency)?.exchange_rate_to_lkr || 305.5;
    setAdvanceForm({
      foreign_amount: '',
      currency: sup.default_currency || 'USD',
      exchange_rate: rate,
      payment_method: 'bank',
      bank_account_id: bankAccounts[0]?.id || '',
      cheque_no: '',
      cheque_date: new Date().toISOString().slice(0, 10),
      cheque_bank: '',
      reference: '',
      notes: `Advance for ${sup.name}`
    });
    setAdvanceSupplier(sup);
  };

  const handleSaveAdvance = async (e) => {
    e.preventDefault();
    if (isSavingAdvance) return;
    if ((Number(advanceForm.foreign_amount) || 0) <= 0) return;
    setIsSavingAdvance(true);
    try {
      await recordSupplierAdvance({
        ...advanceForm,
        supplier_id: advanceSupplier.id
      });
      notifySuccess('Supplier Advance payment recorded successfully');
      setAdvanceSupplier(null);
    } catch {
      // Keep the dialog open; the shared sync layer displays the cloud error.
    } finally {
      setIsSavingAdvance(false);
    }
  };

  return (
    <div>
      {/* Top Action Toolbar */}
      <div className="action-toolbar">
        <button
          onClick={() => setEditingSupplier({ name: '', country: 'China', contact_person: '', phone: '', email: '', default_currency: 'USD', default_lead_days: 10, bank_details: '' })}
          className="toolbar-button bright"
        >
          <span className="icon">+</span>
          <span>Add Supplier</span>
        </button>
      </div>

      <div className="page-section" style={{ padding: 18 }}>
        <div className="panel-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive" style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 850 }}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Supplier / Factory</th>
                  <th>Country</th>
                  <th>Currency</th>
                  <th>Advance Balance</th>
                  <th>Open Payables</th>
                  <th>Lead Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map(sup => (
                  <tr key={sup.id}>
                    <td className="mono font-semibold" style={{ color: 'var(--primary)' }}>{sup.supplier_code}</td>
                    <td style={{ fontWeight: 700, whiteSpace: 'normal', minWidth: 160 }}>{sup.name}</td>
                    <td><span className="badge badge-neutral">{sup.country || 'Foreign'}</span></td>
                    <td><strong>{sup.default_currency || 'USD'}</strong></td>
                    <td className="mono font-semibold" style={{ color: '#52e37e' }}>
                      {formatCurrency(sup.current_advance_balance)}
                    </td>
                    <td className="mono font-semibold" style={{ color: sup.current_payable > 0 ? '#ff8e8e' : 'inherit' }}>
                      {formatCurrency(sup.current_payable)}
                    </td>
                    <td>{sup.default_lead_days || 10} Days</td>
                    <td>
                      <button
                        onClick={() => handleOpenAdvance(sup)}
                        className="success-button small-button"
                        style={{ marginRight: 6 }}
                      >
                        +$ Record Advance
                      </button>
                      <button
                        onClick={() => setEditingSupplier(sup)}
                        className="secondary-button small-button"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete supplier "${sup.name}"?`)) {
                            deleteSupplier(sup.id);
                          }
                        }}
                        className="secondary-button small-button"
                        style={{ color: '#ff8e8e', borderColor: 'rgba(255, 142, 142, 0.4)', marginLeft: 6, padding: '4px 8px' }}
                        title="Delete Supplier"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Record Advance Modal */}
      {advanceSupplier && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>Record Advance Payment to {advanceSupplier.name}</h3>
              <button onClick={() => setAdvanceSupplier(null)} className="modal-close">&times;</button>
            </div>

            <form onSubmit={handleSaveAdvance}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 140px', gap: 12 }}>
                  <div>
                    <label>Currency</label>
                    <select
                      value={advanceForm.currency}
                      onChange={(e) => {
                        const c = e.target.value;
                        const r = currencies.find(x => x.code === c)?.exchange_rate_to_lkr || 1;
                        setAdvanceForm(prev => ({ ...prev, currency: c, exchange_rate: r }));
                      }}
                    >
                      {currencies.map(c => (
                        <option key={c.code} value={c.code}>{c.code}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Foreign Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      className="mono"
                      value={advanceForm.foreign_amount}
                      onChange={(e) => setAdvanceForm(prev => ({ ...prev, foreign_amount: Number(e.target.value) || 0 }))}
                    />
                  </div>

                  <div>
                    <label>Exchange Rate</label>
                    <input
                      type="number"
                      step="0.01"
                      className="mono"
                      value={advanceForm.exchange_rate}
                      onChange={(e) => setAdvanceForm(prev => ({ ...prev, exchange_rate: Number(e.target.value) || 1 }))}
                    />
                  </div>
                </div>

                <div style={{ background: '#242424', padding: 12, border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>Total Advance in LKR:</span>
                  <span className="mono" style={{ fontSize: 18, fontWeight: 800, color: '#52e37e' }}>
                    {formatCurrency(advanceForm.foreign_amount * advanceForm.exchange_rate)}
                  </span>
                </div>

                <div>
                  <label>Payment Method</label>
                  <select value={advanceForm.payment_method} onChange={(e) => setAdvanceForm(prev => ({ ...prev, payment_method: e.target.value }))}>
                    <option value="bank">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                {advanceForm.payment_method === 'bank' && (
                  <div>
                    <label>Paid From Bank Account *</label>
                    <select value={advanceForm.bank_account_id} onChange={(e) => setAdvanceForm(prev => ({ ...prev, bank_account_id: e.target.value }))} required>
                      <option value="">Select bank account</option>
                      {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.account_name} ({formatCurrency(b.current_balance)})</option>)}
                    </select>
                  </div>
                )}

                {advanceForm.payment_method === 'cheque' && (
                  <div className="payment-detail-grid cheque-detail-grid">
                    <div><label>Cheque number *</label><input value={advanceForm.cheque_no} onChange={(e) => setAdvanceForm(prev => ({ ...prev, cheque_no: e.target.value }))} required /></div>
                    <div><label>Cheque date *</label><input type="date" value={advanceForm.cheque_date} onChange={(e) => setAdvanceForm(prev => ({ ...prev, cheque_date: e.target.value }))} required /></div>
                    <div><label>Cheque bank *</label><input value={advanceForm.cheque_bank} onChange={(e) => setAdvanceForm(prev => ({ ...prev, cheque_bank: e.target.value }))} required /></div>
                  </div>
                )}

                <div>
                  <label>TT Reference / Wire Ref</label>
                  <input
                    type="text"
                    placeholder="e.g. TT-REF-998811"
                    value={advanceForm.reference}
                    onChange={(e) => setAdvanceForm(prev => ({ ...prev, reference: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setAdvanceSupplier(null)} className="secondary-button">
                  Cancel
                </button>
                <button type="submit" className="success-button" disabled={isSavingAdvance}>
                  {isSavingAdvance ? 'Saving…' : 'Record Advance Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
