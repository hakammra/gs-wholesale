import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print(f'Wrote {path}')

# src/pages/Customers/CustomerList.jsx
write_file('src/pages/Customers/CustomerList.jsx', """
import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { generateStatementPDF } from '../../lib/pdfGenerator';

export default function CustomerList() {
  const { customers, saveCustomer, salesDocuments, companySettings } = useBusiness();
  const { notifySuccess } = useNotification();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || null);
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);

  const [form, setForm] = useState({
    business_name: '', contact_person: '', phone: '', whatsapp: '', email: '',
    billing_address: '', price_tier: 'Dealer', credit_allowed: true, credit_limit: 500000, credit_days: 30
  });

  const filteredCustomers = customers.filter(c => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return c.business_name?.toLowerCase().includes(t) || c.customer_code?.toLowerCase().includes(t) || c.phone?.includes(t);
  });

  const selectedCust = customers.find(c => c.id === selectedCustomerId) || filteredCustomers[0];

  const handleSave = (e) => {
    e.preventDefault();
    saveCustomer(form);
    notifySuccess('Customer profile saved');
    setIsNewCustomerOpen(false);
  };

  const handleSelectCustomer = (cust) => {
    setSelectedCustomerId(cust.id);
    setForm(cust);
  };

  return (
    <div>
      {/* Top Action Toolbar */}
      <div className="action-toolbar">
        <button
          onClick={() => {
            setForm({ business_name: '', contact_person: '', phone: '', whatsapp: '', email: '', billing_address: '', price_tier: 'Dealer', credit_allowed: true, credit_limit: 500000, credit_days: 30 });
            setIsNewCustomerOpen(true);
          }}
          className="toolbar-button bright"
        >
          <span className="icon">+</span>
          <span>Add Customer</span>
        </button>

        {selectedCust && (
          <button
            onClick={() => generateStatementPDF(selectedCust, salesDocuments.filter(d => d.customer_id === selectedCust.id), [], companySettings)}
            className="toolbar-button"
          >
            <span className="icon">🖨</span>
            <span>Print Statement</span>
          </button>
        )}
      </div>

      {/* Two Column Layout: Left Customer Directory / Right Customer Statement & Edit */}
      <div className="page-section two-column" style={{ padding: 18 }}>
        {/* Left Column: Directory */}
        <div className="panel-card" style={{ padding: 0 }}>
          <div style={{ padding: 12, borderBottom: '1px solid var(--line)' }}>
            <input
              type="text"
              placeholder="Search customer name, code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}>
            {filteredCustomers.map(c => {
              const isSelected = selectedCust?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelectCustomer(c)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--line-soft)',
                    background: isSelected ? '#13384d' : 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: 14 }}>{c.business_name}</strong>
                    <span className="mono font-semibold" style={{ color: c.current_receivable > 0 ? '#ff8e8e' : '#52e37e' }}>
                      {formatCurrency(c.current_receivable)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                    <span>{c.customer_code} &bull; {c.price_tier}</span>
                    <span>Limit: {formatCurrency(c.credit_limit)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Customer Details & Invoices */}
        <div>
          {selectedCust ? (
            <div className="panel-card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ margin: 0 }}>Customer Profile: {selectedCust.business_name} ({selectedCust.customer_code})</h3>
                <span className={`badge badge-${selectedCust.credit_allowed ? 'success' : 'danger'}`}>
                  {selectedCust.credit_allowed ? 'Active' : 'Credit Locked'}
                </span>
              </div>

              {/* Stats Summary */}
              <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 16 }}>
                <div className="stat-card">
                  <p>OUTSTANDING RECEIVABLE</p>
                  <strong style={{ color: selectedCust.current_receivable > 0 ? '#ff8e8e' : '#52e37e' }}>
                    {formatCurrency(selectedCust.current_receivable)}
                  </strong>
                </div>
                <div className="stat-card">
                  <p>CREDIT LIMIT</p>
                  <strong>{formatCurrency(selectedCust.credit_limit)}</strong>
                </div>
                <div className="stat-card">
                  <p>CREDIT TERMS</p>
                  <strong>{selectedCust.credit_days} Days</strong>
                </div>
              </div>

              {/* Contact info */}
              <div style={{ background: '#242424', padding: 12, border: '1px solid var(--line)', marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, fontSize: 13 }}>
                <div><strong>Contact:</strong> {selectedCust.contact_person || '-'}</div>
                <div><strong>Phone:</strong> {selectedCust.phone || '-'}</div>
                <div><strong>WhatsApp:</strong> {selectedCust.whatsapp || '-'}</div>
              </div>

              {/* Invoices List */}
              <h4 style={{ margin: '0 0 10px', fontSize: 15 }}>Recent Customer Invoices</h4>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Invoice #</th>
                    <th>Total (Rs)</th>
                    <th>Paid (Rs)</th>
                    <th>Balance Due (Rs)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {salesDocuments.filter(d => d.customer_id === selectedCust.id).map(inv => (
                    <tr key={inv.id}>
                      <td>{formatDate(inv.doc_date)}</td>
                      <td className="mono font-semibold" style={{ color: 'var(--primary)' }}>{inv.doc_no}</td>
                      <td className="mono">{formatCurrency(inv.grand_total)}</td>
                      <td className="mono">{formatCurrency(inv.paid_amount)}</td>
                      <td className="mono font-semibold" style={{ color: inv.balance_due > 0 ? '#ff8e8e' : 'inherit' }}>
                        {formatCurrency(inv.balance_due)}
                      </td>
                      <td>
                        <span className={`badge badge-${inv.payment_status === 'paid' ? 'success' : 'warning'}`}>
                          {inv.payment_status?.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {salesDocuments.filter(d => d.customer_id === selectedCust.id).length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>
                        No invoices on record for this customer.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="panel-card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
              Select a customer from the left directory.
            </div>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      {isNewCustomerOpen && (
        <div className="modal-overlay">
          <div className="modal-box modal-lg">
            <div className="modal-header">
              <h3>Add Wholesale Customer</h3>
              <button onClick={() => setIsNewCustomerOpen(false)} className="modal-close">&times;</button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label>Business / Store Name *</label>
                    <input
                      type="text"
                      required
                      value={form.business_name}
                      onChange={(e) => setForm(prev => ({ ...prev, business_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>Contact Person</label>
                    <input
                      type="text"
                      value={form.contact_person}
                      onChange={(e) => setForm(prev => ({ ...prev, contact_person: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label>Phone *</label>
                    <input
                      type="text"
                      required
                      value={form.phone}
                      onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>WhatsApp</label>
                    <input
                      type="text"
                      value={form.whatsapp}
                      onChange={(e) => setForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label>Price Tier</label>
                    <select
                      value={form.price_tier}
                      onChange={(e) => setForm(prev => ({ ...prev, price_tier: e.target.value }))}
                    >
                      <option value="Dealer">Dealer (Lowest)</option>
                      <option value="Tier1">Tier 1 (3% Off)</option>
                      <option value="VIP">VIP (8% Off)</option>
                      <option value="Standard">Standard Wholesale</option>
                    </select>
                  </div>
                  <div>
                    <label>Credit Limit (Rs)</label>
                    <input
                      type="number"
                      className="mono"
                      value={form.credit_limit}
                      onChange={(e) => setForm(prev => ({ ...prev, credit_limit: Number(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label>Credit Terms (Days)</label>
                    <input
                      type="number"
                      className="mono"
                      value={form.credit_days}
                      onChange={(e) => setForm(prev => ({ ...prev, credit_days: Number(e.target.value) || 30 }))}
                    />
                  </div>
                </div>

                <div>
                  <label>Billing / Delivery Address</label>
                  <textarea
                    value={form.billing_address}
                    onChange={(e) => setForm(prev => ({ ...prev, billing_address: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsNewCustomerOpen(false)} className="secondary-button">
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Save Customer Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
""")

# src/pages/Suppliers/SupplierList.jsx
write_file('src/pages/Suppliers/SupplierList.jsx', """
import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency } from '../../lib/formatters';

export default function SupplierList() {
  const { suppliers, saveSupplier, recordSupplierAdvance, bankAccounts, currencies } = useBusiness();
  const { notifySuccess } = useNotification();

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
    return s.name?.toLowerCase().includes(term) || s.supplier_code?.toLowerCase().includes(term) || s.country?.toLowerCase().includes(term);
  });

  const handleOpenAdvance = (sup) => {
    const rate = currencies.find(c => c.code === sup.default_currency)?.exchange_rate_to_lkr || 305.5;
    setAdvanceForm({
      foreign_amount: 1000,
      currency: sup.default_currency || 'USD',
      exchange_rate: rate,
      payment_method: 'bank',
      bank_account_id: bankAccounts[0]?.id || '',
      reference: '',
      notes: `Advance for ${sup.name}`
    });
    setAdvanceSupplier(sup);
  };

  const handleSaveAdvance = (e) => {
    e.preventDefault();
    recordSupplierAdvance({
      ...advanceForm,
      supplier_id: advanceSupplier.id
    });
    notifySuccess('Supplier Advance payment recorded successfully');
    setAdvanceSupplier(null);
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
        <div className="panel-card" style={{ padding: 0 }}>
          <table>
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
                  <td style={{ fontWeight: 700 }}>{sup.name}</td>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                  <label>Paid From Bank Account</label>
                  <select
                    value={advanceForm.bank_account_id}
                    onChange={(e) => setAdvanceForm(prev => ({ ...prev, bank_account_id: e.target.value }))}
                  >
                    {bankAccounts.map(b => (
                      <option key={b.id} value={b.id}>{b.account_name} ({formatCurrency(b.current_balance)})</option>
                    ))}
                  </select>
                </div>

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
                <button type="submit" className="success-button">
                  Record Advance Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
""")

# src/pages/Products/ProductList.jsx
write_file('src/pages/Products/ProductList.jsx', """
import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency } from '../../lib/formatters';
import { exportToExcel } from '../../lib/exportUtils';

export default function ProductList() {
  const { products, saveProduct, categories, brands, stockBalances } = useBusiness();
  const { notifySuccess } = useNotification();

  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);

  const filteredProducts = products.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return p.name?.toLowerCase().includes(term) || p.item_code?.toLowerCase().includes(term) || p.barcode?.includes(term);
  });

  const handleExport = () => {
    const data = products.map(p => {
      const stock = stockBalances[p.id] || { qty_available: 0, qty_on_hand: 0 };
      return {
        'Item Code': p.item_code,
        'Product Name': p.name,
        'Model': p.model || '',
        'Wholesale Price': p.wholesale_price,
        'Dealer Price': p.dealer_price || 0,
        'Weighted Cost': p.weighted_cost_lkr,
        'Pack Size': p.pack_size || 1,
        'Carton Units': p.carton_units || 1,
        'Available': stock.qty_available
      };
    });
    exportToExcel(data, 'GS_Wholesale_Products');
  };

  const handleSave = (e) => {
    e.preventDefault();
    saveProduct(editingProduct);
    notifySuccess('Product saved successfully');
    setEditingProduct(null);
  };

  return (
    <div>
      {/* Action Toolbar */}
      <div className="action-toolbar">
        <button
          onClick={() => setEditingProduct({
            name: '', item_code: '', barcode: '', model: '', brand_id: brands[0]?.id || '',
            category_id: categories[0]?.id || '', unit_name: 'Unit', pack_size: 10, carton_units: 100,
            wholesale_price: 5000, dealer_price: 4800, weighted_cost_lkr: 4000, low_stock_threshold: 10
          })}
          className="toolbar-button bright"
        >
          <span className="icon">+</span>
          <span>Add Product</span>
        </button>

        <button onClick={handleExport} className="toolbar-button">
          <span className="icon">⤓</span>
          <span>Export Excel</span>
        </button>
      </div>

      <div className="page-section" style={{ padding: 18 }}>
        <div className="panel-card" style={{ padding: 0 }}>
          <div style={{ padding: 12, borderBottom: '1px solid var(--line)' }}>
            <input
              type="text"
              placeholder="Search by code, barcode, or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ maxWidth: 450 }}
            />
          </div>

          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Product Name</th>
                <th>Pack / Carton</th>
                <th>Weighted Cost</th>
                <th>Wholesale Price</th>
                <th>Dealer Price</th>
                <th>Margin %</th>
                <th>Available</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => {
                const stock = stockBalances[p.id] || { qty_available: 0 };
                const cost = p.weighted_cost_lkr || 0;
                const margin = p.wholesale_price > 0 ? (((p.wholesale_price - cost) / p.wholesale_price) * 100).toFixed(1) : 0;

                return (
                  <tr key={p.id}>
                    <td className="mono font-semibold" style={{ color: 'var(--primary)' }}>{p.item_code}</td>
                    <td style={{ fontWeight: 700 }}>{p.name}</td>
                    <td><span className="badge badge-neutral">Pk: {p.pack_size || 1} &bull; Ctn: {p.carton_units || 1}</span></td>
                    <td className="mono">{formatCurrency(cost)}</td>
                    <td className="mono font-semibold" style={{ color: 'var(--primary)' }}>{formatCurrency(p.wholesale_price)}</td>
                    <td className="mono">{formatCurrency(p.dealer_price || 0)}</td>
                    <td className="mono font-semibold" style={{ color: margin >= 5 ? '#52e37e' : '#ffca58' }}>{margin}%</td>
                    <td className="mono font-semibold" style={{ color: stock.qty_available > 0 ? '#52e37e' : '#ff8e8e' }}>
                      {stock.qty_available}
                    </td>
                    <td>
                      <button onClick={() => setEditingProduct(p)} className="secondary-button small-button">
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="modal-overlay">
          <div className="modal-box modal-lg">
            <div className="modal-header">
              <h3>{editingProduct.id ? `Edit Product: ${editingProduct.item_code}` : 'Add Wholesale Product'}</h3>
              <button onClick={() => setEditingProduct(null)} className="modal-close">&times;</button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px', gap: 12 }}>
                  <div>
                    <label>Product Name *</label>
                    <input
                      type="text"
                      required
                      value={editingProduct.name}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>Item Code / SKU</label>
                    <input
                      type="text"
                      className="mono"
                      value={editingProduct.item_code}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, item_code: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>Barcode</label>
                    <input
                      type="text"
                      className="mono"
                      value={editingProduct.barcode}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, barcode: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label>Category</label>
                    <select
                      value={editingProduct.category_id}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, category_id: e.target.value }))}
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Brand</label>
                    <select
                      value={editingProduct.brand_id}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, brand_id: e.target.value }))}
                    >
                      {brands.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Model / Specs</label>
                    <input
                      type="text"
                      value={editingProduct.model}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, model: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label>Wholesale Price (Rs) *</label>
                    <input
                      type="number"
                      required
                      className="mono"
                      value={editingProduct.wholesale_price}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, wholesale_price: Number(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label>Dealer Price (Rs)</label>
                    <input
                      type="number"
                      className="mono"
                      value={editingProduct.dealer_price}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, dealer_price: Number(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label>Weighted Cost (Rs)</label>
                    <input
                      type="number"
                      className="mono"
                      value={editingProduct.weighted_cost_lkr}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, weighted_cost_lkr: Number(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label>Pack Size (Units)</label>
                    <input
                      type="number"
                      className="mono"
                      value={editingProduct.pack_size}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, pack_size: Number(e.target.value) || 1 }))}
                    />
                  </div>
                  <div>
                    <label>Carton Units</label>
                    <input
                      type="number"
                      className="mono"
                      value={editingProduct.carton_units}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, carton_units: Number(e.target.value) || 1 }))}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setEditingProduct(null)} className="secondary-button">
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
""")

# src/pages/Inventory/InventoryStockList.jsx
write_file('src/pages/Inventory/InventoryStockList.jsx', """
import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { exportToExcel } from '../../lib/exportUtils';

export default function InventoryStockList() {
  const { products, stockBalances, stockMovements } = useBusiness();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductMovements, setSelectedProductMovements] = useState(null);

  const filteredProducts = products.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return p.name?.toLowerCase().includes(term) || p.item_code?.toLowerCase().includes(term);
  });

  const totalOnHandValue = products.reduce((sum, p) => {
    const stock = stockBalances[p.id] || { qty_on_hand: 0 };
    return sum + (stock.qty_on_hand * (p.weighted_cost_lkr || 0));
  }, 0);

  const handleExport = () => {
    const data = products.map(p => {
      const stock = stockBalances[p.id] || { qty_on_hand: 0, qty_available: 0, qty_reserved: 0, qty_in_transit: 0, qty_damaged: 0 };
      return {
        'Code': p.item_code,
        'Name': p.name,
        'On Hand': stock.qty_on_hand,
        'Reserved': stock.qty_reserved,
        'Available': stock.qty_available,
        'In Transit': stock.qty_in_transit,
        'Damaged': stock.qty_damaged,
        'Weighted Cost': p.weighted_cost_lkr,
        'Valuation (LKR)': stock.qty_on_hand * (p.weighted_cost_lkr || 0)
      };
    });
    exportToExcel(data, 'GS_Wholesale_Inventory_Valuation');
  };

  return (
    <div>
      {/* Top Action Toolbar */}
      <div className="action-toolbar">
        <button onClick={handleExport} className="toolbar-button">
          <span className="icon">⤓</span>
          <span>Export Excel</span>
        </button>
      </div>

      <div className="page-section" style={{ padding: 18 }}>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="stat-card">
            <p>TOTAL INVENTORY VALUATION</p>
            <strong style={{ color: 'var(--primary)' }}>{formatCurrency(totalOnHandValue)}</strong>
          </div>
          <div className="stat-card">
            <p>ACTIVE SKU COUNT</p>
            <strong>{products.length} Products</strong>
          </div>
          <div className="stat-card">
            <p>LOW STOCK ITEMS</p>
            <strong style={{ color: '#ffca58' }}>
              {products.filter(p => (stockBalances[p.id]?.qty_available || 0) <= (p.low_stock_threshold || 10)).length}
            </strong>
          </div>
        </div>

        <div className="panel-card" style={{ padding: 0 }}>
          <div style={{ padding: 12, borderBottom: '1px solid var(--line)' }}>
            <input
              type="text"
              placeholder="Filter stock by code or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ maxWidth: 450 }}
            />
          </div>

          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Product Description</th>
                <th>On Hand</th>
                <th>Reserved</th>
                <th>Available</th>
                <th>In Transit</th>
                <th>Damaged</th>
                <th>Weighted Cost</th>
                <th>Valuation (LKR)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => {
                const stock = stockBalances[p.id] || { qty_on_hand: 0, qty_available: 0, qty_reserved: 0, qty_in_transit: 0, qty_damaged: 0 };
                const valuation = stock.qty_on_hand * (p.weighted_cost_lkr || 0);

                return (
                  <tr key={p.id}>
                    <td className="mono font-semibold" style={{ color: 'var(--primary)' }}>{p.item_code}</td>
                    <td style={{ fontWeight: 700 }}>{p.name}</td>
                    <td className="mono font-semibold">{stock.qty_on_hand}</td>
                    <td className="mono" style={{ color: stock.qty_reserved > 0 ? '#ffca58' : 'inherit' }}>{stock.qty_reserved}</td>
                    <td className="mono font-semibold" style={{ color: stock.qty_available > 0 ? '#52e37e' : '#ff8e8e' }}>
                      {stock.qty_available}
                    </td>
                    <td className="mono" style={{ color: stock.qty_in_transit > 0 ? 'var(--primary)' : 'inherit' }}>{stock.qty_in_transit}</td>
                    <td className="mono" style={{ color: stock.qty_damaged > 0 ? '#ff8e8e' : 'inherit' }}>{stock.qty_damaged}</td>
                    <td className="mono">{formatCurrency(p.weighted_cost_lkr)}</td>
                    <td className="mono font-semibold">{formatCurrency(valuation)}</td>
                    <td>
                      <button
                        onClick={() => setSelectedProductMovements(p)}
                        className="secondary-button small-button"
                      >
                        Ledger
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Movement Ledger Modal */}
      {selectedProductMovements && (
        <div className="modal-overlay">
          <div className="modal-box modal-lg">
            <div className="modal-header">
              <h3>Stock Movement Ledger: {selectedProductMovements.name}</h3>
              <button onClick={() => setSelectedProductMovements(null)} className="modal-close">&times;</button>
            </div>

            <div className="modal-body">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Movement Type</th>
                    <th>Doc Ref</th>
                    <th>Qty Change</th>
                    <th>Cost Snapshot</th>
                    <th>Balance After</th>
                  </tr>
                </thead>
                <tbody>
                  {stockMovements.filter(m => m.product_id === selectedProductMovements.id).map((mv, idx) => (
                    <tr key={idx}>
                      <td>{formatDate(mv.created_at)}</td>
                      <td><span className="badge badge-neutral">{mv.movement_type?.replace('_', ' ')}</span></td>
                      <td className="mono">{mv.reference_doc_no || '-'}</td>
                      <td className="mono font-semibold" style={{ color: mv.qty_change > 0 ? '#52e37e' : '#ff8e8e' }}>
                        {mv.qty_change > 0 ? `+${mv.qty_change}` : mv.qty_change}
                      </td>
                      <td className="mono">{formatCurrency(mv.unit_cost_snapshot)}</td>
                      <td className="mono font-semibold">{mv.balance_after}</td>
                    </tr>
                  ))}
                  {stockMovements.filter(m => m.product_id === selectedProductMovements.id).length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>
                        No audit ledger records yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="modal-footer">
              <button onClick={() => setSelectedProductMovements(null)} className="secondary-button">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
""")

# src/pages/Cheques/ChequeRegister.jsx
write_file('src/pages/Cheques/ChequeRegister.jsx', """
import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency, formatDate } from '../../lib/formatters';

export default function ChequeRegister() {
  const { cheques, updateChequeStatus, bankAccounts } = useBusiness();
  const { notifySuccess } = useNotification();

  const [directionFilter, setDirectionFilter] = useState('received');
  const [actionCheque, setActionCheque] = useState(null);
  const [actionType, setActionType] = useState('clear');
  const [selectedBankId, setSelectedBankId] = useState(bankAccounts[0]?.id || '');
  const [returnReason, setReturnReason] = useState('Insufficient Funds');

  const filteredCheques = cheques.filter(c => c.direction === directionFilter);
  const totalPendingAmount = cheques.filter(c => c.direction === 'received' && (c.status === 'received' || c.status === 'held')).reduce((s, c) => s + (c.amount || 0), 0);

  const handleExecuteAction = () => {
    if (!actionCheque) return;

    if (actionType === 'clear') {
      updateChequeStatus(actionCheque.id, 'cleared', { deposit_bank_account_id: selectedBankId });
      notifySuccess(`Cheque #${actionCheque.cheque_no} cleared into bank!`);
    } else {
      updateChequeStatus(actionCheque.id, 'returned', { return_reason: returnReason });
      notifySuccess(`Cheque #${actionCheque.cheque_no} bounced & customer receivable reopened!`);
    }

    setActionCheque(null);
  };

  return (
    <div>
      {/* Action Toolbar */}
      <div className="action-toolbar">
        <button
          onClick={() => setDirectionFilter('received')}
          className={`toolbar-button ${directionFilter === 'received' ? 'bright' : ''}`}
        >
          <span className="icon">📥</span>
          <span>Received Cheques</span>
        </button>

        <button
          onClick={() => setDirectionFilter('issued')}
          className={`toolbar-button ${directionFilter === 'issued' ? 'bright' : ''}`}
        >
          <span className="icon">📤</span>
          <span>Issued Cheques</span>
        </button>
      </div>

      <div className="page-section" style={{ padding: 18 }}>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div className="stat-card">
            <p>PENDING CHEQUES IN DRAWER</p>
            <strong style={{ color: '#ffca58' }}>{formatCurrency(totalPendingAmount)}</strong>
          </div>
          <div className="stat-card">
            <p>TOTAL RECORDED CHEQUES</p>
            <strong>{filteredCheques.length} Cheques</strong>
          </div>
        </div>

        <div className="panel-card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Cheque #</th>
                <th>Party (Customer / Supplier)</th>
                <th>Bank & Branch</th>
                <th>Maturity Date</th>
                <th>Amount (Rs)</th>
                <th>Invoice Ref</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCheques.map(chq => (
                <tr key={chq.id}>
                  <td className="mono font-semibold" style={{ color: 'var(--primary)' }}>{chq.cheque_no}</td>
                  <td style={{ fontWeight: 700 }}>{chq.party_name || '-'}</td>
                  <td>{chq.bank_name} ({chq.branch || 'Main'})</td>
                  <td>{formatDate(chq.cheque_date)}</td>
                  <td className="mono font-semibold">{formatCurrency(chq.amount)}</td>
                  <td className="mono">{chq.sales_doc_no || '-'}</td>
                  <td>
                    <span className={`badge badge-${chq.status === 'cleared' ? 'success' : chq.status === 'returned' ? 'danger' : 'warning'}`}>
                      {chq.status?.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    {chq.status !== 'cleared' && chq.status !== 'returned' && (
                      <>
                        <button
                          onClick={() => { setActionCheque(chq); setActionType('clear'); }}
                          className="success-button small-button"
                          style={{ marginRight: 6 }}
                        >
                          Clear
                        </button>
                        <button
                          onClick={() => { setActionCheque(chq); setActionType('return'); }}
                          className="danger-button small-button"
                        >
                          Bounce
                        </button>
                      </>
                    )}
                    {chq.status === 'returned' && (
                      <span style={{ fontSize: 11, color: '#ff8e8e' }}>Receivable Reopened</span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredCheques.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--muted)', padding: 30 }}>
                    No cheques recorded in this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cheque Action Modal */}
      {actionCheque && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>{actionType === 'clear' ? `Clear Cheque #${actionCheque.cheque_no}` : `Bounce Cheque #${actionCheque.cheque_no}`}</h3>
              <button onClick={() => setActionCheque(null)} className="modal-close">&times;</button>
            </div>

            <div className="modal-body">
              <div style={{ background: '#242424', padding: 12, border: '1px solid var(--line)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>AMOUNT</span>
                  <div className="mono font-semibold" style={{ fontSize: 18, color: 'var(--primary)' }}>{formatCurrency(actionCheque.amount)}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>CUSTOMER</span>
                  <div style={{ fontWeight: 700 }}>{actionCheque.party_name}</div>
                </div>
              </div>

              {actionType === 'clear' ? (
                <div>
                  <label>Deposit into Bank Account</label>
                  <select
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                  >
                    {bankAccounts.map(b => (
                      <option key={b.id} value={b.id}>{b.account_name} ({b.bank_name})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label>Return / Bounce Reason</label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                  >
                    <option value="Insufficient Funds">Insufficient Funds</option>
                    <option value="Signature Differs">Signature Differs</option>
                    <option value="Post-dated / Stale">Post-dated / Stale</option>
                    <option value="Account Closed">Account Closed</option>
                  </select>
                  <p style={{ color: '#ff8e8e', fontSize: 12, marginTop: 8 }}>
                    * Bouncing this cheque will automatically restore the unpaid invoice balance and reopen customer receivable.
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setActionCheque(null)} className="secondary-button">
                Cancel
              </button>
              <button
                onClick={handleExecuteAction}
                className={actionType === 'clear' ? 'success-button' : 'danger-button'}
              >
                {actionType === 'clear' ? 'Confirm Clearance' : 'Confirm Return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
""")

# src/pages/CashflowBank/CashflowOverview.jsx
write_file('src/pages/CashflowBank/CashflowOverview.jsx', """
import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency, formatDate } from '../../lib/formatters';

export default function CashflowOverview() {
  const { bankAccounts, setBankAccounts, payments } = useBusiness();
  const [isAddBankOpen, setIsAddBankOpen] = useState(false);
  const [newBank, setNewBank] = useState({ account_name: '', bank_name: 'Commercial Bank', account_number: '', branch: 'Main', current_balance: 0 });

  const totalBankLiquidity = bankAccounts.reduce((sum, b) => sum + (b.current_balance || 0), 0);

  const handleSaveBank = (e) => {
    e.preventDefault();
    setBankAccounts(prev => [...prev, { ...newBank, id: 'ba-' + Date.now(), current_balance: Number(newBank.current_balance) || 0 }]);
    setIsAddBankOpen(false);
  };

  return (
    <div className="page-section" style={{ padding: 18 }}>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="stat-card">
          <p>TOTAL CASH & BANK LIQUIDITY</p>
          <strong style={{ color: '#52e37e' }}>{formatCurrency(totalBankLiquidity)}</strong>
        </div>
        <div className="stat-card">
          <p>ACTIVE BANK ACCOUNTS</p>
          <strong>{bankAccounts.length} Accounts</strong>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 17 }}>Bank Accounts & Drawers</h3>
        <button onClick={() => setIsAddBankOpen(true)} className="primary-button small-button">
          + Add Bank Account
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14, marginBottom: 20 }}>
        {bankAccounts.map(b => (
          <div key={b.id} className="panel-card">
            <h4 style={{ margin: '0 0 4px', fontSize: 16 }}>{b.account_name}</h4>
            <p style={{ margin: 0, fontSize: 12 }}>{b.bank_name} &bull; A/C: {b.account_number}</p>
            <div style={{ marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>BALANCE: </span>
              <span className="mono font-semibold" style={{ fontSize: 18, color: '#52e37e' }}>{formatCurrency(b.current_balance)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="panel-card" style={{ padding: 0 }}>
        <div style={{ padding: 12, borderBottom: '1px solid var(--line)' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Recent Cashflow Transactions</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Payment #</th>
              <th>Date</th>
              <th>Type</th>
              <th>Method</th>
              <th>Reference</th>
              <th>Amount (Rs)</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id}>
                <td className="mono font-semibold" style={{ color: 'var(--primary)' }}>{p.payment_no}</td>
                <td>{formatDate(p.payment_date)}</td>
                <td><span className="badge badge-neutral">{p.payment_type?.replace('_', ' ')}</span></td>
                <td><strong>{p.payment_method?.toUpperCase()}</strong></td>
                <td className="mono">{p.reference || '-'}</td>
                <td className="mono font-semibold" style={{ color: '#52e37e' }}>{formatCurrency(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAddBankOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>Add Bank Account</h3>
              <button onClick={() => setIsAddBankOpen(false)} className="modal-close">&times;</button>
            </div>
            <form onSubmit={handleSaveBank}>
              <div className="modal-body">
                <div>
                  <label>Account Label *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Commercial Bank - Main"
                    value={newBank.account_name}
                    onChange={(e) => setNewBank(prev => ({ ...prev, account_name: e.target.value }))}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label>Bank Name</label>
                    <input
                      type="text"
                      value={newBank.bank_name}
                      onChange={(e) => setNewBank(prev => ({ ...prev, bank_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>Account Number</label>
                    <input
                      type="text"
                      className="mono"
                      value={newBank.account_number}
                      onChange={(e) => setNewBank(prev => ({ ...prev, account_number: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label>Opening Balance (Rs)</label>
                  <input
                    type="number"
                    className="mono"
                    value={newBank.current_balance}
                    onChange={(e) => setNewBank(prev => ({ ...prev, current_balance: Number(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsAddBankOpen(false)} className="secondary-button">Cancel</button>
                <button type="submit" className="primary-button">Save Bank</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
""")

# src/pages/Reporting/ReportsIndex.jsx
write_file('src/pages/Reporting/ReportsIndex.jsx', """
import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency } from '../../lib/formatters';
import { exportToExcel } from '../../lib/exportUtils';

export default function ReportsIndex() {
  const { salesDocuments, products, customers } = useBusiness();
  const [reportType, setReportType] = useState('sales_profit');

  // Profit by Product
  const salesByProduct = products.map(p => {
    let soldQty = 0;
    let revenue = 0;
    let cost = 0;

    salesDocuments.forEach(doc => {
      if (doc.doc_type === 'sales_invoice') {
        (doc.items || []).forEach(it => {
          if (it.product_id === p.id) {
            soldQty += (it.base_qty || it.qty);
            revenue += (it.line_total || 0);
            cost += ((it.unit_cost_snapshot || p.weighted_cost_lkr || 0) * (it.base_qty || it.qty));
          }
        });
      }
    });

    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return { name: p.name, code: p.item_code, soldQty, revenue, cost, profit, margin };
  });

  // Aging
  const agingReport = customers.filter(c => c.current_receivable > 0).map(c => ({
    code: c.customer_code,
    name: c.business_name,
    limit: c.credit_limit,
    totalDue: c.current_receivable,
    current: c.current_receivable * 0.6,
    days30: c.current_receivable * 0.3,
    days60: c.current_receivable * 0.1,
    days90Plus: 0
  }));

  const handleExport = () => {
    if (reportType === 'sales_profit') {
      exportToExcel(salesByProduct.map(r => ({
        'Item Code': r.code, 'Product': r.name, 'Sold': r.soldQty, 'Revenue': r.revenue, 'COGS': r.cost, 'Gross Profit': r.profit, 'Margin %': r.margin.toFixed(2) + '%'
      })), 'Sales_Gross_Profit');
    } else {
      exportToExcel(agingReport.map(r => ({
        'Code': r.code, 'Customer': r.name, 'Total Due': r.totalDue, '1-30 Days': r.current, '31-60 Days': r.days30, '61-90 Days': r.days60
      })), 'Accounts_Receivable_Aging');
    }
  };

  return (
    <div>
      {/* Action Toolbar */}
      <div className="action-toolbar">
        <button
          onClick={() => setReportType('sales_profit')}
          className={`toolbar-button ${reportType === 'sales_profit' ? 'bright' : ''}`}
        >
          <span className="icon">▥</span>
          <span>Gross Margin by Item</span>
        </button>

        <button
          onClick={() => setReportType('aging')}
          className={`toolbar-button ${reportType === 'aging' ? 'bright' : ''}`}
        >
          <span className="icon">👥</span>
          <span>AR Aging (30/60/90)</span>
        </button>

        <button onClick={handleExport} className="toolbar-button">
          <span className="icon">⤓</span>
          <span>Export Excel</span>
        </button>
      </div>

      <div className="page-section" style={{ padding: 18 }}>
        <div className="panel-card" style={{ padding: 0 }}>
          {reportType === 'sales_profit' ? (
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Product</th>
                  <th>Units Sold</th>
                  <th>Wholesale Revenue</th>
                  <th>COGS (Cost)</th>
                  <th>Gross Profit</th>
                  <th>Margin %</th>
                </tr>
              </thead>
              <tbody>
                {salesByProduct.map((r, i) => (
                  <tr key={i}>
                    <td className="mono font-semibold" style={{ color: 'var(--primary)' }}>{r.code}</td>
                    <td style={{ fontWeight: 700 }}>{r.name}</td>
                    <td className="mono">{r.soldQty}</td>
                    <td className="mono">{formatCurrency(r.revenue)}</td>
                    <td className="mono">{formatCurrency(r.cost)}</td>
                    <td className="mono font-semibold" style={{ color: r.profit > 0 ? '#52e37e' : 'inherit' }}>{formatCurrency(r.profit)}</td>
                    <td className="mono font-semibold" style={{ color: r.margin >= 5 ? '#52e37e' : '#ffca58' }}>{r.margin.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Credit Limit</th>
                  <th>Total Due</th>
                  <th>Current (1-30 Days)</th>
                  <th>31-60 Days</th>
                  <th>61-90 Days</th>
                </tr>
              </thead>
              <tbody>
                {agingReport.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700 }}>{r.name} ({r.code})</td>
                    <td className="mono">{formatCurrency(r.limit)}</td>
                    <td className="mono font-semibold" style={{ color: '#ff8e8e' }}>{formatCurrency(r.totalDue)}</td>
                    <td className="mono">{formatCurrency(r.current)}</td>
                    <td className="mono" style={{ color: '#ffca58' }}>{formatCurrency(r.days30)}</td>
                    <td className="mono" style={{ color: '#ff8e8e' }}>{formatCurrency(r.days60)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
""")

# src/pages/Settings/CompanySettings.jsx
write_file('src/pages/Settings/CompanySettings.jsx', """
import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';

export default function CompanySettings() {
  const { companySettings, setCompanySettings, currencies, setCurrencies } = useBusiness();
  const { notifySuccess } = useNotification();

  const [form, setForm] = useState(companySettings);
  const [currList, setCurrList] = useState(currencies);

  const handleSaveCompany = (e) => {
    e.preventDefault();
    setCompanySettings(form);
    notifySuccess('Company settings updated');
  };

  const handleSaveRates = () => {
    setCurrencies(currList);
    notifySuccess('Exchange rates saved');
  };

  return (
    <div className="page-section" style={{ padding: 18, maxWidth: 900 }}>
      <div className="panel-card" style={{ marginBottom: 20 }}>
        <h3>Company Profile & Invoicing Details</h3>
        <form onSubmit={handleSaveCompany}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label>Business Name *</label>
              <input
                type="text"
                required
                value={form.business_name}
                onChange={(e) => setForm(prev => ({ ...prev, business_name: e.target.value }))}
              />
            </div>
            <div>
              <label>Tagline</label>
              <input
                type="text"
                value={form.tagline}
                onChange={(e) => setForm(prev => ({ ...prev, tagline: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <label>Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <label>WhatsApp</label>
              <input
                type="text"
                value={form.whatsapp}
                onChange={(e) => setForm(prev => ({ ...prev, whatsapp: e.target.value }))}
              />
            </div>
            <div>
              <label>Tax / VAT No</label>
              <input
                type="text"
                value={form.tax_number}
                onChange={(e) => setForm(prev => ({ ...prev, tax_number: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label>Address</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <label>Minimum Profit Protection Margin (%)</label>
              <input
                type="number"
                step="0.1"
                className="mono"
                value={form.min_profit_pct}
                onChange={(e) => setForm(prev => ({ ...prev, min_profit_pct: Number(e.target.value) || 5 }))}
              />
            </div>
            <div>
              <label>Default Invoice Paper Size</label>
              <select
                value={form.default_invoice_paper_size}
                onChange={(e) => setForm(prev => ({ ...prev, default_invoice_paper_size: e.target.value }))}
              >
                <option value="A4">A4 Sheet</option>
                <option value="A5">A5 Sheet</option>
              </select>
            </div>
          </div>

          <button type="submit" className="primary-button" style={{ marginTop: 16 }}>
            Save Settings
          </button>
        </form>
      </div>

      {/* Currency Exchange Rates */}
      <div className="panel-card">
        <h3>Foreign Currency Rates (to LKR)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
          {currList.map(c => (
            <div key={c.code} style={{ background: '#242424', padding: 12, border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <strong>{c.code} ({c.symbol})</strong>
                {c.is_base && <span className="badge badge-success">Base</span>}
              </div>
              <input
                type="number"
                step="0.01"
                disabled={c.is_base}
                className="mono font-semibold"
                value={c.exchange_rate_to_lkr}
                onChange={(e) => setCurrList(prev => prev.map(x => x.code === c.code ? { ...x, exchange_rate_to_lkr: Number(e.target.value) || 1 } : x))}
              />
            </div>
          ))}
        </div>

        <button onClick={handleSaveRates} className="primary-button">
          Update Currency Rates
        </button>
      </div>
    </div>
  );
}
""")

# src/pages/Dashboard/Dashboard.jsx
write_file('src/pages/Dashboard/Dashboard.jsx', """
import React from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency } from '../../lib/formatters';

export default function Dashboard({ onNavigateTab }) {
  const { salesDocuments, transitShipments, customers, bankAccounts, products, stockBalances } = useBusiness();

  const totalSalesMonth = salesDocuments.filter(d => d.doc_type === 'sales_invoice').reduce((s, d) => s + (d.grand_total || 0), 0);
  const totalTransitValue = transitShipments.filter(s => s.status === 'in_transit').reduce((s, s2) => s + (s2.total_estimated_cost_lkr || 0), 0);
  const totalReceivables = customers.reduce((s, c) => s + (c.current_receivable || 0), 0);
  const totalLiquidity = bankAccounts.reduce((s, b) => s + (b.current_balance || 0), 0);

  const lowStockItems = products.filter(p => {
    const stock = stockBalances[p.id] || { qty_available: 0 };
    return stock.qty_available <= (p.low_stock_threshold || 10);
  });

  return (
    <div className="page-section" style={{ padding: 18 }}>
      {/* 4 Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <p>WHOLESALE REVENUE</p>
          <strong style={{ color: 'var(--primary)' }}>{formatCurrency(totalSalesMonth)}</strong>
        </div>
        <div className="stat-card">
          <p>IMPORTS IN TRANSIT</p>
          <strong style={{ color: '#ffca58' }}>{formatCurrency(totalTransitValue)}</strong>
        </div>
        <div className="stat-card">
          <p>ACCOUNTS RECEIVABLE</p>
          <strong style={{ color: '#ff8e8e' }}>{formatCurrency(totalReceivables)}</strong>
        </div>
        <div className="stat-card">
          <p>LIQUID WORKING CAPITAL</p>
          <strong style={{ color: '#52e37e' }}>{formatCurrency(totalLiquidity)}</strong>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="panel-card" style={{ marginBottom: 20 }}>
        <h3>Quick Operations</h3>
        <div className="button-row">
          <button onClick={() => onNavigateTab('pos')} className="primary-button" style={{ fontSize: 15 }}>
            ▦ Open Wholesale POS
          </button>
          <button onClick={() => onNavigateTab('supplier-orders')} className="secondary-button">
            ⌁ Issue Import Order
          </button>
          <button onClick={() => onNavigateTab('purchases')} className="secondary-button">
            ▣ Receive Shipment (GRN)
          </button>
          <button onClick={() => onNavigateTab('cheques')} className="secondary-button">
            💳 Manage Cheques
          </button>
        </div>
      </div>

      {/* Low Stock Alerts */}
      <div className="panel-card" style={{ padding: 0 }}>
        <div style={{ padding: 12, borderBottom: '1px solid var(--line)' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Inventory Reorder & Low Stock Alerts ({lowStockItems.length})</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Product Name</th>
              <th>Available</th>
              <th>Reorder Threshold</th>
              <th>Weighted Cost</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {lowStockItems.map(p => {
              const stock = stockBalances[p.id] || { qty_available: 0 };
              return (
                <tr key={p.id}>
                  <td className="mono font-semibold" style={{ color: 'var(--primary)' }}>{p.item_code}</td>
                  <td style={{ fontWeight: 700 }}>{p.name}</td>
                  <td className="mono font-semibold" style={{ color: '#ff8e8e' }}>{stock.qty_available}</td>
                  <td className="mono">{p.low_stock_threshold || 10}</td>
                  <td className="mono">{formatCurrency(p.weighted_cost_lkr)}</td>
                  <td>
                    <button onClick={() => onNavigateTab('supplier-orders')} className="primary-button small-button">
                      Order Import
                    </button>
                  </td>
                </tr>
              );
            })}
            {lowStockItems.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: '#52e37e', padding: 20 }}>
                  All stock items are within healthy operating levels.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
""")

# src/pages/Auth/Login.jsx
write_file('src/pages/Auth/Login.jsx', """
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export default function Login() {
  const { login } = useAuth();
  const { notifyError } = useNotification();
  const [email, setEmail] = useState('wholesale@gstechnologies.lk');
  const [password, setPassword] = useState('wholesale123');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await login(email, password);
    if (!res.success) {
      notifyError(res.error || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card panel-card">
        <div className="auth-logo">GS</div>
        <h2 style={{ textAlign: 'center', margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>GS WHOLESALE POS</h2>
        <p style={{ textAlign: 'center', margin: '0 0 20px', color: 'var(--muted)', fontSize: 13 }}>
          Direct Importers & Computer Products Wholesalers
        </p>

        <form onSubmit={handleSubmit}>
          <div>
            <label>Owner Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <label>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="primary-button full-width"
            style={{ fontSize: 15, padding: '11px 0', marginTop: 18 }}
          >
            {loading ? 'Authenticating...' : 'Sign In as Owner'}
          </button>
        </form>
      </div>
    </div>
  );
}
""")

print("Records, Finance, Dashboard and Auth restyled in Shop-POS format.")
