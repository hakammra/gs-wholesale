import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print(f'Wrote {path}')

# src/components/pos/CustomerHeader.jsx
write_file('src/components/pos/CustomerHeader.jsx', """
import React from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency } from '../../lib/formatters';

export default function CustomerHeader({ selectedCustomer, onSelectCustomer, onOpenAddCustomer }) {
  const { customers } = useBusiness();

  const handleCustomerChange = (e) => {
    const custId = e.target.value;
    const cust = customers.find(c => c.id === custId) || null;
    onSelectCustomer(cust);
  };

  const isCreditRestricted = selectedCustomer && !selectedCustomer.credit_allowed;
  const isOverLimit = selectedCustomer && (selectedCustomer.current_receivable > selectedCustomer.credit_limit);

  return (
    <div className="pos-customer-banner">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ minWidth: 260 }}>
          <label style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>SELECT WHOLESALE CUSTOMER</label>
          <select
            value={selectedCustomer?.id || ''}
            onChange={handleCustomerChange}
            style={{ fontWeight: 600 }}
          >
            <option value="">-- Walk-in / Cash Wholesale Customer --</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.customer_code} - {c.business_name} ({c.price_tier})
              </option>
            ))}
          </select>
        </div>

        {selectedCustomer && (
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', borderLeft: '1px solid var(--line)', paddingLeft: 14 }}>
            <div>
              <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block' }}>TIER</span>
              <span className="badge badge-primary">{selectedCustomer.price_tier || 'Standard'}</span>
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block' }}>DUE RECEIVABLE</span>
              <span className="mono" style={{ color: selectedCustomer.current_receivable > 0 ? '#ff8e8e' : '#52e37e', fontWeight: 700 }}>
                {formatCurrency(selectedCustomer.current_receivable)}
              </span>
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block' }}>CREDIT LIMIT</span>
              <span className="mono" style={{ fontWeight: 600 }}>
                {formatCurrency(selectedCustomer.credit_limit)}
              </span>
            </div>
            {isOverLimit && (
              <span className="badge badge-danger">LIMIT EXCEEDED</span>
            )}
            {isCreditRestricted && (
              <span className="badge badge-warning">CREDIT LOCKED</span>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onOpenAddCustomer} className="secondary-button small-button">
          + Add Customer
        </button>
      </div>
    </div>
  );
}
""")

# src/components/pos/ProductSearchGrid.jsx
write_file('src/components/pos/ProductSearchGrid.jsx', """
import React, { useState, useRef, useEffect } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency, calculateWholesaleItemPrice } from '../../lib/formatters';

export default function ProductSearchGrid({ onAddToCart, selectedCustomer }) {
  const { products, categories, stockBalances } = useBusiness();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const inputRef = useRef(null);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredProducts = products.filter(p => {
    if (selectedCategory && p.category_id !== selectedCategory) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.name?.toLowerCase().includes(term) ||
      p.item_code?.toLowerCase().includes(term) ||
      p.barcode?.includes(term) ||
      p.model?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="product-search-panel">
      <h3>Search Products <span style={{ color: 'var(--muted)', fontSize: 12 }}>(Press '/' to focus)</span></h3>

      <input
        ref={inputRef}
        type="text"
        placeholder="Type item code, barcode or name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        autoFocus
      />

      <div className="category-filter-bar">
        <button
          className={`cat-chip ${selectedCategory === '' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('')}
        >
          All
        </button>
        {categories.map(c => (
          <button
            key={c.id}
            className={`cat-chip ${selectedCategory === c.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="search-results">
        {filteredProducts.map(p => {
          const stock = stockBalances[p.id] || { qty_available: 0 };
          const price = calculateWholesaleItemPrice(p, 1, selectedCustomer, []);
          const isOutOfStock = stock.qty_available <= 0;

          return (
            <div
              key={p.id}
              className="product-result"
              onClick={() => onAddToCart(p, 1, 'unit')}
              style={{ opacity: isOutOfStock ? 0.6 : 1 }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.name}
                </div>
                <small>
                  Code: <strong style={{ color: 'var(--primary)' }}>{p.item_code}</strong> | Model: {p.model || '-'}
                </small>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  {p.pack_size > 1 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onAddToCart(p, p.pack_size, 'pack'); }}
                      className="secondary-button small-button"
                      style={{ padding: '2px 6px', fontSize: 11 }}
                    >
                      + Pack ({p.pack_size})
                    </button>
                  )}
                  {p.carton_units > 1 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onAddToCart(p, p.carton_units, 'carton'); }}
                      className="secondary-button small-button"
                      style={{ padding: '2px 6px', fontSize: 11 }}
                    >
                      + Carton ({p.carton_units})
                    </button>
                  )}
                </div>
              </div>

              <div className="product-price">
                <div className="mono" style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 15 }}>
                  {formatCurrency(price)}
                </div>
                <small style={{ color: isOutOfStock ? '#ff8e8e' : '#52e37e', fontWeight: 600 }}>
                  {isOutOfStock ? 'Out of Stock' : `${stock.qty_available} Available`}
                </small>
              </div>
            </div>
          );
        })}

        {filteredProducts.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 30 }}>
            No products match search criteria.
          </div>
        )}
      </div>
    </div>
  );
}
""")

# src/components/pos/PosCart.jsx
write_file('src/components/pos/PosCart.jsx', """
import React from 'react';
import { formatCurrency } from '../../lib/formatters';

export default function PosCart({
  cartItems,
  onUpdateQty,
  onUpdatePrice,
  onUpdateDiscount,
  onRemoveItem,
  onClearCart,
  selectedCustomer,
  docType,
  setDocType
}) {
  return (
    <div>
      {/* Bill Table */}
      <div className="bill-table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Product / Description</th>
              <th style={{ width: 90 }}>Qty</th>
              <th style={{ width: 110 }}>Unit Price</th>
              <th style={{ width: 90 }}>Disc. (Rs)</th>
              <th style={{ width: 110, textAlign: 'right' }}>Total (Rs)</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {cartItems.map((item, idx) => (
              <tr key={idx}>
                <td style={{ color: 'var(--muted)' }}>{idx + 1}</td>
                <td>
                  <div style={{ fontWeight: 700 }}>{item.product.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                    Code: <span className="mono" style={{ color: 'var(--primary)' }}>{item.product.item_code}</span> | Unit: {item.unit_type?.toUpperCase()}
                  </div>
                </td>
                <td>
                  <input
                    type="number"
                    min="1"
                    className="mono"
                    value={item.qty}
                    onChange={(e) => onUpdateQty(idx, Number(e.target.value) || 1)}
                    style={{ width: 75, padding: '4px 6px', fontWeight: 700 }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    className="mono"
                    value={item.unit_price}
                    onChange={(e) => onUpdatePrice(idx, Number(e.target.value) || 0)}
                    style={{ width: 100, padding: '4px 6px' }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    className="mono"
                    value={item.discount_amount || 0}
                    onChange={(e) => onUpdateDiscount(idx, Number(e.target.value) || 0)}
                    style={{ width: 80, padding: '4px 6px', color: '#ffca58' }}
                  />
                </td>
                <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                  {formatCurrency((item.qty * item.unit_price) - (item.discount_amount || 0))}
                </td>
                <td>
                  <button
                    onClick={() => onRemoveItem(idx)}
                    className="secondary-button small-button danger"
                    style={{ padding: '3px 7px' }}
                  >
                    &times;
                  </button>
                </td>
              </tr>
            ))}

            {cartItems.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
                  Bill is empty. Click items from the product search panel to add.
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

# src/components/pos/PaymentModal.jsx
write_file('src/components/pos/PaymentModal.jsx', """
import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency } from '../../lib/formatters';

export default function PaymentModal({
  isOpen,
  onClose,
  grandTotal,
  selectedCustomer,
  onConfirmPayment,
  docType
}) {
  const { bankAccounts } = useBusiness();

  const [paymentLines, setPaymentLines] = useState([
    { method: selectedCustomer ? 'credit' : 'cash', amount: grandTotal, bank_account_id: bankAccounts[0]?.id || '', reference: '' }
  ]);

  const [chequeDetails, setChequeDetails] = useState({
    cheque_no: '',
    bank_name: 'Commercial Bank',
    branch: 'Colombo',
    cheque_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  });

  if (!isOpen) return null;

  const totalPaid = paymentLines.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remaining = grandTotal - totalPaid;

  const handleAddPaymentLine = (method) => {
    setPaymentLines(prev => [...prev, {
      method,
      amount: remaining > 0 ? remaining : 0,
      bank_account_id: bankAccounts[0]?.id || '',
      reference: ''
    }]);
  };

  const handleUpdateLine = (index, field, value) => {
    setPaymentLines(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const handleRemoveLine = (index) => {
    setPaymentLines(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (docType === 'sales_invoice' && Math.abs(remaining) > 0.01) {
      alert(`Payment allocations must match grand total exact. Remaining: ${formatCurrency(remaining)}`);
      return;
    }

    onConfirmPayment({
      paymentLines,
      chequeDetails: paymentLines.some(p => p.method === 'cheque') ? chequeDetails : null
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box modal-lg">
        <div className="modal-header">
          <h3>Settle & Complete {docType === 'sales_invoice' ? 'Invoice' : docType === 'sales_order' ? 'Sales Order' : 'Quotation'}</h3>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Total Banner */}
            <div style={{ background: '#242424', padding: 14, border: '1px solid var(--line)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>BILL TOTAL</span>
                <div className="mono" style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>
                  {formatCurrency(grandTotal)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>ALLOCATED</span>
                <div className="mono" style={{ fontSize: 22, fontWeight: 800, color: '#52e37e' }}>
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

            {/* Quick Tender Buttons */}
            <div>
              <label style={{ marginBottom: 6 }}>ADD PAYMENT TENDER</label>
              <div className="button-row">
                <button type="button" onClick={() => handleAddPaymentLine('cash')} className="secondary-button">
                  + Cash
                </button>
                <button type="button" onClick={() => handleAddPaymentLine('bank')} className="secondary-button">
                  + Bank Transfer
                </button>
                <button type="button" onClick={() => handleAddPaymentLine('cheque')} className="secondary-button">
                  + Post-Dated Cheque
                </button>
                {selectedCustomer && (
                  <button type="button" onClick={() => handleAddPaymentLine('credit')} className="secondary-button">
                    + Customer Credit
                  </button>
                )}
              </div>
            </div>

            {/* Payment Lines Table */}
            <table>
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Amount (Rs)</th>
                  <th>Bank / Account</th>
                  <th>Ref #</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paymentLines.map((line, idx) => (
                  <tr key={idx}>
                    <td>
                      <select
                        value={line.method}
                        onChange={(e) => handleUpdateLine(idx, 'method', e.target.value)}
                        style={{ padding: '6px 8px' }}
                      >
                        <option value="cash">Cash</option>
                        <option value="bank">Bank Transfer</option>
                        <option value="cheque">Cheque</option>
                        <option value="credit">Customer Credit</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="mono"
                        value={line.amount}
                        onChange={(e) => handleUpdateLine(idx, 'amount', Number(e.target.value) || 0)}
                        style={{ width: 130, padding: '6px 8px', fontWeight: 700 }}
                      />
                    </td>
                    <td>
                      {line.method === 'bank' ? (
                        <select
                          value={line.bank_account_id}
                          onChange={(e) => handleUpdateLine(idx, 'bank_account_id', e.target.value)}
                          style={{ padding: '6px 8px' }}
                        >
                          {bankAccounts.map(b => (
                            <option key={b.id} value={b.id}>{b.account_name}</option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: 12 }}>-</span>
                      )}
                    </td>
                    <td>
                      <input
                        type="text"
                        placeholder="Tx / Slip #"
                        value={line.reference || ''}
                        onChange={(e) => handleUpdateLine(idx, 'reference', e.target.value)}
                        style={{ padding: '6px 8px' }}
                      />
                    </td>
                    <td>
                      {paymentLines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="secondary-button small-button danger"
                        >
                          &times;
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Cheque details sub-form if cheque tender present */}
            {paymentLines.some(p => p.method === 'cheque') && (
              <div style={{ background: '#242424', padding: 14, border: '1px solid var(--line)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label>Cheque No *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 009876"
                    value={chequeDetails.cheque_no}
                    onChange={(e) => setChequeDetails(prev => ({ ...prev, cheque_no: e.target.value }))}
                  />
                </div>
                <div>
                  <label>Bank Name</label>
                  <input
                    type="text"
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
                  <label>Cheque Date (Maturity)</label>
                  <input
                    type="date"
                    value={chequeDetails.cheque_date}
                    onChange={(e) => setChequeDetails(prev => ({ ...prev, cheque_date: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="secondary-button">
              Cancel
            </button>
            <button type="submit" className="primary-button" style={{ minWidth: 160, fontSize: 15 }}>
              Confirm & Print [F4]
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
""")

# src/components/pos/MarginOverrideModal.jsx
write_file('src/components/pos/MarginOverrideModal.jsx', """
import React, { useState } from 'react';
import { formatCurrency } from '../../lib/formatters';

export default function MarginOverrideModal({
  isOpen,
  onClose,
  lowMarginItems,
  onConfirmOverride
}) {
  const [overrideReason, setOverrideReason] = useState('Bulk Clearance Discount Approved by Owner');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!overrideReason.trim()) return;
    onConfirmOverride(overrideReason);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h3 style={{ color: '#ff8e8e' }}>⚠️ Minimum Profit Margin Protection Alert</h3>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p style={{ color: 'var(--muted)', margin: 0 }}>
              The following item(s) are priced below the minimum threshold margin (5.0%) based on Weighted Average Landed Cost:
            </p>

            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Weighted Cost</th>
                  <th>Selling Price</th>
                  <th>Margin %</th>
                </tr>
              </thead>
              <tbody>
                {lowMarginItems.map((it, idx) => (
                  <tr key={idx}>
                    <td>{it.product.name}</td>
                    <td className="mono">{formatCurrency(it.cost)}</td>
                    <td className="mono font-semibold">{formatCurrency(it.unit_price)}</td>
                    <td className="mono" style={{ color: '#ff8e8e', fontWeight: 700 }}>
                      {it.marginPct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div>
              <label>Owner Override Reason (Mandatory for Audit Log) *</label>
              <input
                type="text"
                required
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="secondary-button">
              Adjust Prices
            </button>
            <button type="submit" className="danger-button">
              Authorize Override & Proceed
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
""")

# src/pages/POS/WholesalePOS.jsx
write_file('src/pages/POS/WholesalePOS.jsx', """
import React, { useState, useEffect } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency, calculateWholesaleItemPrice, calculateDocumentTotals } from '../../lib/formatters';
import { generateInvoicePDF } from '../../lib/pdfGenerator';
import { generateWhatsAppInvoiceLink } from '../../lib/exportUtils';
import CustomerHeader from '../../components/pos/CustomerHeader';
import ProductSearchGrid from '../../components/pos/ProductSearchGrid';
import PosCart from '../../components/pos/PosCart';
import PaymentModal from '../../components/pos/PaymentModal';
import MarginOverrideModal from '../../components/pos/MarginOverrideModal';

export default function WholesalePOS() {
  const { postSalesDocument, saveCustomer, companySettings } = useBusiness();
  const { notifySuccess, notifyError, notifyWarning } = useNotification();

  // Multi-tab Bills state
  const [tabs, setTabs] = useState([
    { id: 1, label: 'Bill 1', items: [], customer: null, docType: 'sales_invoice', discount: 0 },
    { id: 2, label: 'Bill 2', items: [], customer: null, docType: 'sales_invoice', discount: 0 }
  ]);
  const [activeTabId, setActiveTabId] = useState(1);

  const currentTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  // Modals
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isMarginOverrideOpen, setIsMarginOverrideOpen] = useState(false);
  const [pendingLowMarginItems, setPendingLowMarginItems] = useState([]);
  const [pendingPaymentData, setPendingPaymentData] = useState(null);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    business_name: '', contact_person: '', phone: '', price_tier: 'Dealer', credit_limit: 500000, credit_days: 30
  });

  const totals = calculateDocumentTotals(currentTab.items, currentTab.discount, 0);

  // Keyboard shortcut F4 for Checkout
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F4') {
        e.preventDefault();
        handleTriggerCheckout();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleUpdateCurrentTab = (updater) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? updater(t) : t));
  };

  const handleAddTab = () => {
    const nextId = (tabs[tabs.length - 1]?.id || 0) + 1;
    setTabs(prev => [...prev, { id: nextId, label: `Bill ${nextId}`, items: [], customer: null, docType: 'sales_invoice', discount: 0 }]);
    setActiveTabId(nextId);
  };

  const handleCloseTab = (id) => {
    if (tabs.length === 1) return;
    setTabs(prev => prev.filter(t => t.id !== id));
    if (activeTabId === id) {
      setActiveTabId(tabs.find(t => t.id !== id)?.id || 1);
    }
  };

  const handleAddToCart = (product, qty = 1, unitType = 'unit') => {
    const unitPrice = calculateWholesaleItemPrice(product, qty, currentTab.customer, []);

    handleUpdateCurrentTab(tab => {
      const existingIdx = tab.items.findIndex(it => it.product.id === product.id && it.unit_type === unitType);
      if (existingIdx >= 0) {
        const updated = [...tab.items];
        updated[existingIdx].qty += qty;
        return { ...tab, items: updated };
      } else {
        return {
          ...tab,
          items: [...tab.items, {
            product,
            qty,
            unit_type: unitType,
            unit_price: unitPrice,
            discount_amount: 0,
            unit_cost_snapshot: product.weighted_cost_lkr || 0
          }]
        };
      }
    });
  };

  const handleTriggerCheckout = () => {
    if (currentTab.items.length === 0) {
      notifyWarning('Cannot checkout an empty bill');
      return;
    }

    // Check minimum profit margin protection (5.0%)
    const lowMarginItems = [];
    currentTab.items.forEach(it => {
      const cost = it.product.weighted_cost_lkr || 0;
      if (cost > 0 && it.unit_price > 0) {
        const marginPct = ((it.unit_price - cost) / it.unit_price) * 100;
        if (marginPct < (companySettings.min_profit_pct || 5.0)) {
          lowMarginItems.push({ ...it, cost, marginPct });
        }
      }
    });

    if (lowMarginItems.length > 0) {
      setPendingLowMarginItems(lowMarginItems);
      setIsMarginOverrideOpen(true);
      return;
    }

    setIsPaymentOpen(true);
  };

  const handleMarginOverrideAuthorized = (reason) => {
    setIsMarginOverrideOpen(false);
    setIsPaymentOpen(true);
  };

  const handleConfirmPayment = (paymentData) => {
    const doc = postSalesDocument({
      doc_type: currentTab.docType,
      customer_id: currentTab.customer?.id || null,
      customer_name: currentTab.customer?.business_name || 'Cash Customer',
      customer_phone: currentTab.customer?.phone || '',
      items: currentTab.items,
      discount_amount: currentTab.discount,
      payment_lines: paymentData.paymentLines,
      cheque_details: paymentData.chequeDetails
    });

    notifySuccess(`${currentTab.docType === 'sales_invoice' ? 'Invoice' : 'Order'} ${doc.doc_no} generated successfully!`);
    setIsPaymentOpen(false);

    // Auto generate PDF & Offer WhatsApp
    generateInvoicePDF(doc, companySettings);

    // Reset current tab
    handleUpdateCurrentTab(tab => ({ ...tab, items: [], discount: 0 }));
  };

  return (
    <div>
      {/* Bill Tabs & Document Type Switcher */}
      <div className="pos-toolbar">
        <div className="bill-tabs">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTabId(t.id)}
              className={`tab ${activeTabId === t.id ? 'active' : ''}`}
            >
              {t.label} ({t.items.length})
              {tabs.length > 1 && (
                <span onClick={(e) => { e.stopPropagation(); handleCloseTab(t.id); }} style={{ marginLeft: 8, opacity: 0.7 }}>&times;</span>
              )}
            </button>
          ))}
          <button onClick={handleAddTab} className="tab add-tab">
            + Add Tab
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { id: 'sales_invoice', label: 'Sales Invoice' },
            { id: 'sales_order', label: 'Sales Order' },
            { id: 'quotation', label: 'Quotation' }
          ].map(d => (
            <button
              key={d.id}
              onClick={() => handleUpdateCurrentTab(t => ({ ...t, docType: d.id }))}
              className={`tab ${currentTab.docType === d.id ? 'active' : ''}`}
              style={{ fontSize: 12.5 }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* POS Grid */}
      <div className="pos-grid">
        {/* Left: Product Search */}
        <ProductSearchGrid
          onAddToCart={handleAddToCart}
          selectedCustomer={currentTab.customer}
        />

        {/* Right: Customer Header + Cart + Checkout Box */}
        <div>
          <CustomerHeader
            selectedCustomer={currentTab.customer}
            onSelectCustomer={(c) => handleUpdateCurrentTab(t => ({ ...t, customer: c }))}
            onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
          />

          <PosCart
            cartItems={currentTab.items}
            onUpdateQty={(idx, q) => handleUpdateCurrentTab(t => ({ ...t, items: t.items.map((it, i) => i === idx ? { ...it, qty: q } : it) }))}
            onUpdatePrice={(idx, p) => handleUpdateCurrentTab(t => ({ ...t, items: t.items.map((it, i) => i === idx ? { ...it, unit_price: p } : it) }))}
            onUpdateDiscount={(idx, d) => handleUpdateCurrentTab(t => ({ ...t, items: t.items.map((it, i) => i === idx ? { ...it, discount_amount: d } : it) }))}
            onRemoveItem={(idx) => handleUpdateCurrentTab(t => ({ ...t, items: t.items.filter((_, i) => i !== idx) }))}
            onClearCart={() => handleUpdateCurrentTab(t => ({ ...t, items: [] }))}
            selectedCustomer={currentTab.customer}
            docType={currentTab.docType}
            setDocType={(dt) => handleUpdateCurrentTab(t => ({ ...t, docType: dt }))}
          />

          {/* Checkout Box */}
          <div className="checkout-box">
            <div className="discount-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                <span>Bill Discount (Rs):</span>
                <input
                  type="number"
                  className="mono"
                  value={currentTab.discount}
                  onChange={(e) => handleUpdateCurrentTab(t => ({ ...t, discount: Number(e.target.value) || 0 }))}
                  style={{ width: 140 }}
                />
              </label>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Subtotal: </span>
                <span className="mono" style={{ fontWeight: 700 }}>{formatCurrency(totals.subtotal)}</span>
              </div>
            </div>

            <div className="summary-line strong">
              <span>NET PAYABLE:</span>
              <span className="mono">{formatCurrency(totals.grandTotal)}</span>
            </div>

            <div className="button-row" style={{ marginTop: 14 }}>
              <button
                type="button"
                onClick={() => handleUpdateCurrentTab(t => ({ ...t, items: [], discount: 0 }))}
                className="secondary-button"
              >
                Clear Bill
              </button>
              <button
                type="button"
                onClick={handleTriggerCheckout}
                className="primary-button"
                style={{ flex: 1, fontSize: 16 }}
              >
                Checkout & Settle [F4]
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Settlement Modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        grandTotal={totals.grandTotal}
        selectedCustomer={currentTab.customer}
        docType={currentTab.docType}
        onConfirmPayment={handleConfirmPayment}
      />

      {/* Minimum Profit Protection Override Modal */}
      <MarginOverrideModal
        isOpen={isMarginOverrideOpen}
        onClose={() => setIsMarginOverrideOpen(false)}
        lowMarginItems={pendingLowMarginItems}
        onConfirmOverride={handleMarginOverrideAuthorized}
      />
    </div>
  );
}
""")

# src/pages/SalesDocuments/SalesDocumentsList.jsx
write_file('src/pages/SalesDocuments/SalesDocumentsList.jsx', """
import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { generateInvoicePDF } from '../../lib/pdfGenerator';
import { exportToExcel, generateWhatsAppInvoiceLink } from '../../lib/exportUtils';

export default function SalesDocumentsList() {
  const { salesDocuments, customers, convertDocument, companySettings } = useBusiness();
  const { notifySuccess } = useNotification();

  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocId, setSelectedDocId] = useState(salesDocuments[0]?.id || null);

  const filteredDocs = salesDocuments.filter(d => {
    if (filterType && d.doc_type !== filterType) return false;
    if (filterStatus && d.payment_status !== filterStatus) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      d.doc_no?.toLowerCase().includes(term) ||
      d.customer_name?.toLowerCase().includes(term)
    );
  });

  const selectedDoc = salesDocuments.find(d => d.id === selectedDocId) || filteredDocs[0];

  const handleExport = () => {
    const data = filteredDocs.map(d => ({
      'Doc Number': d.doc_no,
      'Type': d.doc_type,
      'Date': d.doc_date,
      'Customer': d.customer_name,
      'Grand Total (LKR)': d.grand_total,
      'Paid Amount (LKR)': d.paid_amount,
      'Balance Due (LKR)': d.balance_due,
      'Status': d.payment_status
    }));
    exportToExcel(data, 'Sales_Documents_Export');
  };

  return (
    <div>
      {/* Top Action Toolbar */}
      <div className="action-toolbar">
        <button onClick={handleExport} className="toolbar-button">
          <span className="icon">⤓</span>
          <span>Export Excel</span>
        </button>

        {selectedDoc && (
          <>
            <button
              onClick={() => generateInvoicePDF(selectedDoc, companySettings)}
              className="toolbar-button bright"
            >
              <span className="icon">🖨</span>
              <span>Print PDF</span>
            </button>

            {selectedDoc.customer_phone && (
              <a
                href={generateWhatsAppInvoiceLink(selectedDoc, selectedDoc.customer_phone, companySettings.business_name)}
                target="_blank"
                rel="noreferrer"
                className="toolbar-button"
                style={{ textDecoration: 'none' }}
              >
                <span className="icon">💬</span>
                <span>WhatsApp</span>
              </a>
            )}

            {selectedDoc.doc_type === 'quotation' && (
              <button
                onClick={() => { convertDocument(selectedDoc.id, 'sales_order'); notifySuccess('Converted to Sales Order'); }}
                className="toolbar-button bright"
              >
                <span className="icon">➔</span>
                <span>To Order</span>
              </button>
            )}

            {selectedDoc.doc_type === 'sales_order' && (
              <button
                onClick={() => { convertDocument(selectedDoc.id, 'sales_invoice'); notifySuccess('Converted to Sales Invoice'); }}
                className="toolbar-button bright"
              >
                <span className="icon">➔</span>
                <span>To Invoice</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Filter Row */}
      <div className="document-filters">
        <div>
          <label style={{ fontSize: 12, color: 'var(--muted)' }}>SEARCH</label>
          <input
            type="text"
            placeholder="Doc number, customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, color: 'var(--muted)' }}>DOCUMENT TYPE</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="sales_invoice">Sales Invoices</option>
            <option value="sales_order">Sales Orders</option>
            <option value="quotation">Quotations</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: 12, color: 'var(--muted)' }}>PAYMENT STATUS</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="unpaid">Unpaid / Due</option>
          </select>
        </div>
      </div>

      {/* Split Panels: Top Table (Documents) / Bottom Table (Items Breakdown) */}
      <div className="split-panel">
        <div className="large-table">
          <table>
            <thead>
              <tr>
                <th>Doc #</th>
                <th>Type</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Balance Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map(d => {
                const isSelected = selectedDoc?.id === d.id;
                return (
                  <tr
                    key={d.id}
                    onClick={() => setSelectedDocId(d.id)}
                    className={isSelected ? 'selected-row' : ''}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="mono font-semibold" style={{ color: 'var(--primary)' }}>{d.doc_no}</td>
                    <td><span className="badge badge-neutral">{d.doc_type?.replace('_', ' ')}</span></td>
                    <td>{formatDate(d.doc_date)}</td>
                    <td style={{ fontWeight: 700 }}>{d.customer_name}</td>
                    <td className="mono">{formatCurrency(d.grand_total)}</td>
                    <td className="mono">{formatCurrency(d.paid_amount)}</td>
                    <td className="mono" style={{ color: d.balance_due > 0 ? '#ff8e8e' : 'inherit', fontWeight: 700 }}>
                      {formatCurrency(d.balance_due)}
                    </td>
                    <td>
                      <span className={`badge badge-${d.payment_status === 'paid' ? 'success' : d.payment_status === 'partial' ? 'warning' : 'danger'}`}>
                        {d.payment_status?.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--muted)', padding: 30 }}>
                    No sales documents found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Split Divider */}
        <div className="split-divider">
          {selectedDoc ? `Document Items Breakdown: ${selectedDoc.doc_no} (${selectedDoc.customer_name})` : 'Document Details'}
        </div>

        {/* Selected Document Line Items */}
        <div className="item-table">
          {selectedDoc ? (
            <table>
              <thead>
                <tr>
                  <th>Product Item</th>
                  <th>Unit Type</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Line Discount</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {(selectedDoc.items || []).map((it, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700 }}>{it.product_name || it.product?.name || 'Item'}</td>
                    <td>{it.unit_type?.toUpperCase()}</td>
                    <td className="mono">{it.qty}</td>
                    <td className="mono">{formatCurrency(it.unit_price)}</td>
                    <td className="mono" style={{ color: '#ffca58' }}>{formatCurrency(it.discount_amount || 0)}</td>
                    <td className="mono font-semibold">{formatCurrency(it.line_total || ((it.qty * it.unit_price) - (it.discount_amount || 0)))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>
              Select a document from above to view its itemized breakdown.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
""")

print("POS and Documents restyled in Shop-POS format.")
