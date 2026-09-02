import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print(f'Wrote {path}')

# src/pages/Customers/CustomerList.jsx
write_file('src/pages/Customers/CustomerList.jsx', """
import React, { useState } from 'react';
import { Users, Plus, FileText, Phone, Mail, MapPin, Search } from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { generateStatementPDF } from '../../lib/pdfGenerator';
import SearchInput from '../../components/common/SearchInput';
import Modal from '../../components/common/Modal';

export default function CustomerList() {
  const { customers, saveCustomer, salesDocuments, companySettings } = useBusiness();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [statementCustomer, setStatementCustomer] = useState(null);

  const filteredCustomers = customers.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.business_name?.toLowerCase().includes(term) ||
      c.customer_code?.toLowerCase().includes(term) ||
      c.contact_person?.toLowerCase().includes(term) ||
      c.phone?.includes(term)
    );
  });

  const handleOpenNew = () => {
    setEditingCustomer({
      business_name: '',
      contact_person: '',
      phone: '',
      whatsapp: '',
      email: '',
      billing_address: '',
      price_tier: 'Dealer',
      credit_allowed: true,
      credit_limit: 500000,
      credit_days: 30
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    saveCustomer(editingCustomer);
    setEditingCustomer(null);
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ maxWidth: 360, flex: 1 }}>
          <SearchInput
            placeholder="Search customer name, code, phone..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>
        <button onClick={handleOpenNew} className="btn btn-primary" style={{ gap: 6 }}>
          <Plus size={16} />
          <span>Add Wholesale Customer</span>
        </button>
      </div>

      {/* Customer Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Business Name</th>
                <th>Contact</th>
                <th>Tier</th>
                <th>Credit Limit</th>
                <th>Credit Days</th>
                <th>Receivable Due</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(cust => (
                <tr key={cust.id}>
                  <td className="mono font-semibold" style={{ color: '#38bdf8' }}>{cust.customer_code}</td>
                  <td style={{ fontWeight: 700 }}>{cust.business_name}</td>
                  <td>
                    <div>{cust.contact_person || '-'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{cust.phone}</div>
                  </td>
                  <td>
                    <span className="badge badge-purple">{cust.price_tier || 'Standard'}</span>
                  </td>
                  <td className="mono">{formatCurrency(cust.credit_limit)}</td>
                  <td>{cust.credit_days} Days</td>
                  <td className="mono font-semibold" style={{ color: cust.current_receivable > 0 ? '#f87171' : '#34d399' }}>
                    {formatCurrency(cust.current_receivable)}
                  </td>
                  <td>
                    <span className={`badge badge-${cust.credit_allowed ? 'success' : 'danger'}`}>
                      {cust.credit_allowed ? 'Active' : 'Credit Locked'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => setEditingCustomer(cust)}
                        className="btn btn-secondary btn-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setStatementCustomer(cust)}
                        className="btn btn-secondary btn-sm"
                      >
                        Statement
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <Modal
          isOpen={true}
          onClose={() => setEditingCustomer(null)}
          title={editingCustomer.id ? `Edit Customer: ${editingCustomer.customer_code}` : 'Add Wholesale Customer'}
          size="lg"
          footer={
            <>
              <button onClick={() => setEditingCustomer(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn btn-primary">Save Customer</button>
            </>
          }
        >
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Business / Store Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={editingCustomer.business_name}
                  onChange={(e) => setEditingCustomer(prev => ({ ...prev, business_name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Person</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingCustomer.contact_person}
                  onChange={(e) => setEditingCustomer(prev => ({ ...prev, contact_person: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingCustomer.phone}
                  onChange={(e) => setEditingCustomer(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">WhatsApp</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingCustomer.whatsapp}
                  onChange={(e) => setEditingCustomer(prev => ({ ...prev, whatsapp: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={editingCustomer.email}
                  onChange={(e) => setEditingCustomer(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Billing / Delivery Address</label>
              <textarea
                className="form-textarea"
                rows="2"
                value={editingCustomer.billing_address}
                onChange={(e) => setEditingCustomer(prev => ({ ...prev, billing_address: e.target.value }))}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Price Tier</label>
                <select
                  className="form-select"
                  value={editingCustomer.price_tier}
                  onChange={(e) => setEditingCustomer(prev => ({ ...prev, price_tier: e.target.value }))}
                >
                  <option value="Dealer">Dealer (Lowest)</option>
                  <option value="Tier1">Tier 1 (3% Off)</option>
                  <option value="VIP">VIP (8% Off)</option>
                  <option value="Standard">Standard Wholesale</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Credit Limit (Rs.)</label>
                <input
                  type="number"
                  className="form-input mono"
                  value={editingCustomer.credit_limit}
                  onChange={(e) => setEditingCustomer(prev => ({ ...prev, credit_limit: Number(e.target.value) || 0 }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Credit Terms (Days)</label>
                <input
                  type="number"
                  className="form-input mono"
                  value={editingCustomer.credit_days}
                  onChange={(e) => setEditingCustomer(prev => ({ ...prev, credit_days: Number(e.target.value) || 30 }))}
                />
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Statement Modal */}
      {statementCustomer && (
        <Modal
          isOpen={true}
          onClose={() => setStatementCustomer(null)}
          title={`Statement: ${statementCustomer.business_name}`}
          size="lg"
          footer={
            <button
              onClick={() => generateStatementPDF(statementCustomer, salesDocuments.filter(d => d.customer_id === statementCustomer.id), [], companySettings)}
              className="btn btn-primary"
            >
              Download Statement PDF
            </button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, background: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-sm)' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>CREDIT LIMIT</div>
                <div className="mono font-semibold">{formatCurrency(statementCustomer.credit_limit)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>TERMS</div>
                <div style={{ fontWeight: 700 }}>{statementCustomer.credit_days} Days</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>OUTSTANDING BALANCE</div>
                <div className="mono font-semibold" style={{ color: '#f87171' }}>{formatCurrency(statementCustomer.current_receivable)}</div>
              </div>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice #</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Balance Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {salesDocuments.filter(d => d.customer_id === statementCustomer.id).map(inv => (
                  <tr key={inv.id}>
                    <td>{formatDate(inv.doc_date)}</td>
                    <td className="mono">{inv.doc_no}</td>
                    <td className="mono">{formatCurrency(inv.grand_total)}</td>
                    <td className="mono">{formatCurrency(inv.paid_amount)}</td>
                    <td className="mono font-semibold" style={{ color: inv.balance_due > 0 ? '#f87171' : 'inherit' }}>
                      {formatCurrency(inv.balance_due)}
                    </td>
                    <td>
                      <span className={`badge badge-${inv.payment_status === 'paid' ? 'success' : 'warning'}`}>
                        {inv.payment_status?.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}
""")

# src/pages/Suppliers/SupplierList.jsx
write_file('src/pages/Suppliers/SupplierList.jsx', """
import React, { useState } from 'react';
import { Truck, Plus, DollarSign } from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency } from '../../lib/formatters';
import SearchInput from '../../components/common/SearchInput';
import Modal from '../../components/common/Modal';

export default function SupplierList() {
  const { suppliers, saveSupplier, recordSupplierAdvance, bankAccounts, currencies } = useBusiness();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [advanceSupplier, setAdvanceSupplier] = useState(null);

  const [advanceForm, setAdvanceForm] = useState({
    foreign_amount: 1000,
    currency: 'USD',
    exchange_rate: 305.5,
    payment_method: 'bank',
    bank_account_id: bankAccounts[0]?.id || '',
    reference: '',
    notes: ''
  });

  const filteredSuppliers = suppliers.filter(s => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.name?.toLowerCase().includes(term) ||
      s.supplier_code?.toLowerCase().includes(term) ||
      s.country?.toLowerCase().includes(term) ||
      s.contact_person?.toLowerCase().includes(term)
    );
  });

  const handleOpenAdvance = (supplier) => {
    const rate = currencies.find(c => c.code === supplier.default_currency)?.exchange_rate_to_lkr || 305.5;
    setAdvanceForm({
      foreign_amount: 1000,
      currency: supplier.default_currency || 'USD',
      exchange_rate: rate,
      payment_method: 'bank',
      bank_account_id: bankAccounts[0]?.id || '',
      reference: '',
      notes: `Advance for ${supplier.name}`
    });
    setAdvanceSupplier(supplier);
  };

  const handleSaveAdvance = (e) => {
    e.preventDefault();
    recordSupplierAdvance({
      ...advanceForm,
      supplier_id: advanceSupplier.id
    });
    setAdvanceSupplier(null);
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ maxWidth: 360, flex: 1 }}>
          <SearchInput
            placeholder="Search supplier name, code, country..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>
        <button
          onClick={() => setEditingSupplier({
            name: '', country: 'China', contact_person: '', phone: '', email: '',
            address: '', default_currency: 'USD', default_lead_days: 10, bank_details: '', products_supplied: ''
          })}
          className="btn btn-primary"
          style={{ gap: 6 }}
        >
          <Plus size={16} />
          <span>Add Foreign Supplier</span>
        </button>
      </div>

      {/* Supplier Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
        {filteredSuppliers.map(sup => (
          <div key={sup.id} className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span className="badge badge-neutral mono">{sup.supplier_code}</span>
                <span className="badge badge-primary">{sup.country || 'Foreign'}</span>
              </div>

              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>{sup.name}</h3>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>{sup.products_supplied || 'Computer hardware'}</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-dim)', fontWeight: 700 }}>ADVANCE BALANCE</div>
                  <div className="mono" style={{ fontSize: 14, fontWeight: 800, color: '#34d399' }}>
                    {formatCurrency(sup.current_advance_balance)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-dim)', fontWeight: 700 }}>OPEN PAYABLES</div>
                  <div className="mono" style={{ fontSize: 14, fontWeight: 800, color: sup.current_payable > 0 ? '#f87171' : 'var(--text)' }}>
                    {formatCurrency(sup.current_payable)}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div><strong>Contact:</strong> {sup.contact_person || '-'} ({sup.phone || '-'})</div>
                <div><strong>Lead Time:</strong> {sup.default_lead_days || 10} Days &bull; <strong>Currency:</strong> {sup.default_currency || 'USD'}</div>
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 8, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
              <button
                onClick={() => handleOpenAdvance(sup)}
                className="btn btn-success btn-sm"
                style={{ flex: 1, gap: 4 }}
              >
                <DollarSign size={14} /> Record Advance
              </button>
              <button
                onClick={() => setEditingSupplier(sup)}
                className="btn btn-secondary btn-sm"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Record Advance Modal */}
      {advanceSupplier && (
        <Modal
          isOpen={true}
          onClose={() => setAdvanceSupplier(null)}
          title={`Record Supplier Advance: ${advanceSupplier.name}`}
          footer={
            <>
              <button onClick={() => setAdvanceSupplier(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSaveAdvance} className="btn btn-success" style={{ fontWeight: 800 }}>
                Record Advance Payment
              </button>
            </>
          }
        >
          <form onSubmit={handleSaveAdvance} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Currency</label>
                <select
                  className="form-select"
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

              <div className="form-group">
                <label className="form-label">Foreign Amount</label>
                <input
                  type="number"
                  className="form-input mono"
                  value={advanceForm.foreign_amount}
                  onChange={(e) => setAdvanceForm(prev => ({ ...prev, foreign_amount: Number(e.target.value) || 0 }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Exchange Rate to LKR</label>
                <input
                  type="number"
                  className="form-input mono"
                  value={advanceForm.exchange_rate}
                  onChange={(e) => setAdvanceForm(prev => ({ ...prev, exchange_rate: Number(e.target.value) || 1 }))}
                />
              </div>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total Advance in LKR:</span>
              <span className="mono" style={{ fontSize: 16, fontWeight: 800, color: '#34d399' }}>
                {formatCurrency(advanceForm.foreign_amount * advanceForm.exchange_rate)}
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Paid From Bank Account</label>
              <select
                className="form-select"
                value={advanceForm.bank_account_id}
                onChange={(e) => setAdvanceForm(prev => ({ ...prev, bank_account_id: e.target.value }))}
              >
                {bankAccounts.map(b => (
                  <option key={b.id} value={b.id}>{b.account_name} ({formatCurrency(b.current_balance)})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">TT / Bank Reference</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. TT-REF-998877"
                value={advanceForm.reference}
                onChange={(e) => setAdvanceForm(prev => ({ ...prev, reference: e.target.value }))}
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <Modal
          isOpen={true}
          onClose={() => setEditingSupplier(null)}
          title={editingSupplier.id ? `Edit Supplier: ${editingSupplier.name}` : 'Add Foreign Supplier'}
          size="lg"
          footer={
            <>
              <button onClick={() => setEditingSupplier(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={() => { saveSupplier(editingSupplier); setEditingSupplier(null); }} className="btn btn-primary">
                Save Supplier
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Supplier / Factory Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={editingSupplier.name}
                  onChange={(e) => setEditingSupplier(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Country</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingSupplier.country}
                  onChange={(e) => setEditingSupplier(prev => ({ ...prev, country: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Contact Person</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingSupplier.contact_person}
                  onChange={(e) => setEditingSupplier(prev => ({ ...prev, contact_person: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone / WeChat</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingSupplier.phone}
                  onChange={(e) => setEditingSupplier(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Default Currency</label>
                <select
                  className="form-select"
                  value={editingSupplier.default_currency}
                  onChange={(e) => setEditingSupplier(prev => ({ ...prev, default_currency: e.target.value }))}
                >
                  <option value="USD">USD ($)</option>
                  <option value="CNY">CNY (¥)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="LKR">LKR (Rs.)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Production & Shipping Lead Days</label>
                <input
                  type="number"
                  className="form-input mono"
                  value={editingSupplier.default_lead_days}
                  onChange={(e) => setEditingSupplier(prev => ({ ...prev, default_lead_days: Number(e.target.value) || 10 }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Bank / Wire Details (SWIFT / Account)</label>
              <textarea
                className="form-textarea"
                rows="2"
                value={editingSupplier.bank_details}
                onChange={(e) => setEditingSupplier(prev => ({ ...prev, bank_details: e.target.value }))}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
""")

# src/pages/SupplierOrders/SupplierOrderList.jsx
write_file('src/pages/SupplierOrders/SupplierOrderList.jsx', """
import React, { useState } from 'react';
import { ClipboardList, Plus, Ship, Eye, CheckCircle2 } from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency, formatDate } from '../../lib/formatters';
import SearchInput from '../../components/common/SearchInput';
import Modal from '../../components/common/Modal';

export default function SupplierOrderList() {
  const { supplierOrders, suppliers, products, currencies, createSupplierOrder, createTransitShipment } = useBusiness();
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [dispatchOrder, setDispatchOrder] = useState(null);

  // New Order Form
  const [orderForm, setOrderForm] = useState({
    supplier_id: suppliers[0]?.id || '',
    currency: 'USD',
    exchange_rate_snapshot: 305.5,
    incoterm: 'FOB',
    port_of_loading: 'Shenzhen, China',
    destination_port: 'Colombo, Sri Lanka',
    notes: '',
    items: [
      { product_id: products[0]?.id || '', ordered_qty: 100, foreign_unit_cost: 14.5 }
    ]
  });

  // Dispatch Form
  const [dispatchForm, setDispatchForm] = useState({
    bill_of_lading_no: '',
    shipping_line_carrier: 'Maersk Line',
    vessel_name: '',
    origin_country: 'China',
    departure_port: 'Shenzhen',
    destination_port: 'Colombo Port',
    departure_date: new Date().toISOString().slice(0, 10),
    estimated_arrival_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    customs_clearing_agent: 'Lanka Logistics (Pvt) Ltd'
  });

  const handleAddItem = () => {
    setOrderForm(prev => ({
      ...prev,
      items: [...prev.items, { product_id: products[0]?.id || '', ordered_qty: 50, foreign_unit_cost: 10 }]
    }));
  };

  const handleUpdateItem = (index, field, value) => {
    setOrderForm(prev => ({
      ...prev,
      items: prev.items.map((it, i) => i === index ? { ...it, [field]: value } : it)
    }));
  };

  const handleRemoveItem = (index) => {
    setOrderForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSaveOrder = (e) => {
    e.preventDefault();
    createSupplierOrder(orderForm);
    setIsNewOrderOpen(false);
  };

  const handleDispatchToTransit = (e) => {
    e.preventDefault();
    if (!dispatchOrder) return;

    createTransitShipment({
      ...dispatchForm,
      supplier_order_id: dispatchOrder.id,
      supplier_id: dispatchOrder.supplier_id,
      currency: dispatchOrder.currency,
      exchange_rate_snapshot: dispatchOrder.exchange_rate_snapshot,
      items: dispatchOrder.items.map(it => ({
        product_id: it.product_id,
        shipped_qty: it.ordered_qty,
        foreign_unit_cost: it.foreign_unit_cost,
        weight_kg: 0.15,
        volume_cbm: 0.001
      }))
    });

    setDispatchOrder(null);
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ maxWidth: 360, flex: 1 }}>
          <SearchInput
            placeholder="Search order number, supplier..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>
        <button onClick={() => setIsNewOrderOpen(true)} className="btn btn-primary" style={{ gap: 6 }}>
          <Plus size={16} />
          <span>Create Import Supplier Order</span>
        </button>
      </div>

      {/* Orders Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Supplier</th>
                <th>Order Date</th>
                <th>Incoterm</th>
                <th>Foreign Total</th>
                <th>Est. LKR Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {supplierOrders.map(order => {
                const sup = suppliers.find(s => s.id === order.supplier_id);
                const foreignTotal = (order.items || []).reduce((sum, it) => sum + (it.ordered_qty * it.foreign_unit_cost), 0);
                const lkrTotal = foreignTotal * (order.exchange_rate_snapshot || 305.5);

                return (
                  <tr key={order.id}>
                    <td className="mono font-semibold" style={{ color: '#38bdf8' }}>{order.order_no}</td>
                    <td style={{ fontWeight: 700 }}>{sup?.name || 'Supplier'}</td>
                    <td>{formatDate(order.order_date)}</td>
                    <td><span className="badge badge-neutral">{order.incoterm || 'FOB'}</span></td>
                    <td className="mono font-semibold">{order.currency} {foreignTotal.toLocaleString()}</td>
                    <td className="mono">{formatCurrency(lkrTotal)}</td>
                    <td>
                      <span className={`badge badge-${order.status === 'completed' ? 'success' : order.status === 'ordered' ? 'primary' : 'warning'}`}>
                        {order.status?.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setViewOrder(order)} className="btn btn-secondary btn-sm">
                          <Eye size={14} /> View
                        </button>
                        {order.status === 'ordered' && (
                          <button
                            onClick={() => setDispatchOrder(order)}
                            className="btn btn-primary btn-sm"
                            style={{ gap: 4 }}
                          >
                            <Ship size={14} /> Dispatch to Transit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {supplierOrders.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 40 }}>
                    No supplier orders placed yet. Click above to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Order Modal */}
      {isNewOrderOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsNewOrderOpen(false)}
          title="Create Import Supplier Purchase Order"
          size="lg"
          footer={
            <>
              <button onClick={() => setIsNewOrderOpen(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSaveOrder} className="btn btn-primary" style={{ fontWeight: 800 }}>
                Issue Supplier Order
              </button>
            </>
          }
        >
          <form onSubmit={handleSaveOrder} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 140px', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Foreign Supplier</label>
                <select
                  className="form-select"
                  value={orderForm.supplier_id}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, supplier_id: e.target.value }))}
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.country})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Currency</label>
                <select
                  className="form-select"
                  value={orderForm.currency}
                  onChange={(e) => {
                    const c = e.target.value;
                    const r = currencies.find(x => x.code === c)?.exchange_rate_to_lkr || 1;
                    setOrderForm(prev => ({ ...prev, currency: c, exchange_rate_snapshot: r }));
                  }}
                >
                  {currencies.map(c => (
                    <option key={c.code} value={c.code}>{c.code}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Exchange Rate (LKR)</label>
                <input
                  type="number"
                  className="form-input mono"
                  value={orderForm.exchange_rate_snapshot}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, exchange_rate_snapshot: Number(e.target.value) || 1 }))}
                />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Order Items</h4>
                <button type="button" onClick={handleAddItem} className="btn btn-secondary btn-sm" style={{ gap: 4 }}>
                  <Plus size={14} /> Add Line Item
                </button>
              </div>

              {orderForm.items.map((item, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 100px auto', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <select
                    className="form-select"
                    value={item.product_id}
                    onChange={(e) => handleUpdateItem(idx, 'product_id', e.target.value)}
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.item_code} - {p.name}</option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    className="form-input mono"
                    value={item.ordered_qty}
                    onChange={(e) => handleUpdateItem(idx, 'ordered_qty', Number(e.target.value) || 1)}
                  />

                  <input
                    type="number"
                    step="0.01"
                    placeholder="Unit Cost"
                    className="form-input mono"
                    value={item.foreign_unit_cost}
                    onChange={(e) => handleUpdateItem(idx, 'foreign_unit_cost', Number(e.target.value) || 0)}
                  />

                  <div className="mono font-semibold" style={{ color: '#38bdf8', textAlign: 'right' }}>
                    {orderForm.currency} {(item.ordered_qty * item.foreign_unit_cost).toFixed(2)}
                  </div>

                  {orderForm.items.length > 1 && (
                    <button type="button" onClick={() => handleRemoveItem(idx)} className="btn btn-secondary btn-icon" style={{ padding: 4, color: '#ef4444' }}>
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
          </form>
        </Modal>
      )}

      {/* Dispatch to Transit Modal */}
      {dispatchOrder && (
        <Modal
          isOpen={true}
          onClose={() => setDispatchOrder(null)}
          title={`Dispatch Order ${dispatchOrder.order_no} into Stock in Transit`}
          size="lg"
          footer={
            <>
              <button onClick={() => setDispatchOrder(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleDispatchToTransit} className="btn btn-primary" style={{ fontWeight: 800 }}>
                Confirm Dispatch into Transit
              </button>
            </>
          }
        >
          <form onSubmit={handleDispatchToTransit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Bill of Lading / Airway Bill No *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MAEU-987654321"
                  className="form-input mono"
                  value={dispatchForm.bill_of_lading_no}
                  onChange={(e) => setDispatchForm(prev => ({ ...prev, bill_of_lading_no: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Carrier / Shipping Line</label>
                <input
                  type="text"
                  className="form-input"
                  value={dispatchForm.shipping_line_carrier}
                  onChange={(e) => setDispatchForm(prev => ({ ...prev, shipping_line_carrier: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Departure Date</label>
                <input
                  type="date"
                  className="form-input mono"
                  value={dispatchForm.departure_date}
                  onChange={(e) => setDispatchForm(prev => ({ ...prev, departure_date: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Estimated Arrival Date (ETA)</label>
                <input
                  type="date"
                  className="form-input mono"
                  value={dispatchForm.estimated_arrival_date}
                  onChange={(e) => setDispatchForm(prev => ({ ...prev, estimated_arrival_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Clearing & Forwarding Agent</label>
              <input
                type="text"
                className="form-input"
                value={dispatchForm.customs_clearing_agent}
                onChange={(e) => setDispatchForm(prev => ({ ...prev, customs_clearing_agent: e.target.value }))}
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
""")

print("Pages part B written.")
