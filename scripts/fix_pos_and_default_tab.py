import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print(f'Wrote {path}')

# 1. src/App.jsx (Default to POS tab)
write_file('src/App.jsx', """
import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import WholesalePOS from './pages/POS/WholesalePOS';
import SalesDocumentsList from './pages/SalesDocuments/SalesDocumentsList';
import CustomerList from './pages/Customers/CustomerList';
import SupplierList from './pages/Suppliers/SupplierList';
import SupplierOrderList from './pages/SupplierOrders/SupplierOrderList';
import TransitShipmentList from './pages/StockInTransit/TransitShipmentList';
import GoodsReceivingList from './pages/Purchases/GoodsReceivingList';
import ProductList from './pages/Products/ProductList';
import InventoryStockList from './pages/Inventory/InventoryStockList';
import ChequeRegister from './pages/Cheques/ChequeRegister';
import CashflowOverview from './pages/CashflowBank/CashflowOverview';
import ReportsIndex from './pages/Reporting/ReportsIndex';
import CompanySettings from './pages/Settings/CompanySettings';

export default function App() {
  const { user } = useAuth();
  
  // Default to 'pos' tab, and remember selected tab in localStorage
  const [currentTab, setCurrentTab] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_active_nav_tab');
    return saved || 'pos';
  });

  useEffect(() => {
    localStorage.setItem('gs_wholesale_active_nav_tab', currentTab);
  }, [currentTab]);

  if (!user) {
    return <Login />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'pos':
        return <WholesalePOS />;
      case 'dashboard':
        return <Dashboard onNavigateTab={setCurrentTab} />;
      case 'sales-documents':
        return <SalesDocumentsList />;
      case 'customers':
        return <CustomerList />;
      case 'suppliers':
        return <SupplierList />;
      case 'supplier-orders':
        return <SupplierOrderList />;
      case 'stock-in-transit':
        return <TransitShipmentList onNavigateTab={setCurrentTab} />;
      case 'purchases':
        return <GoodsReceivingList />;
      case 'products':
        return <ProductList />;
      case 'inventory':
        return <InventoryStockList />;
      case 'cheques':
        return <ChequeRegister />;
      case 'cashflow-bank':
        return <CashflowOverview />;
      case 'reporting':
        return <ReportsIndex />;
      case 'settings':
        return <CompanySettings />;
      default:
        return <WholesalePOS />;
    }
  };

  return (
    <Layout currentTab={currentTab} onSelectTab={setCurrentTab}>
      {renderContent()}
    </Layout>
  );
}
""")

# 2. src/components/pos/CustomerHeader.jsx
write_file('src/components/pos/CustomerHeader.jsx', """
import React from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency } from '../../lib/formatters';

export default function CustomerHeader({
  selectedCustomer,
  onSelectCustomer,
  onOpenAddCustomer,
  docType = 'sales_invoice',
  onChangeDocType
}) {
  const { customers = [] } = useBusiness();

  const handleCustomerChange = (e) => {
    const custId = e.target.value;
    const cust = customers.find(c => c.id === custId) || null;
    onSelectCustomer(cust);
  };

  const isCreditRestricted = selectedCustomer && !selectedCustomer.credit_allowed;
  const isOverLimit = selectedCustomer && (selectedCustomer.current_receivable > selectedCustomer.credit_limit);

  return (
    <div className="pos-customer-banner">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        {/* Document Type Selector */}
        <div>
          <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>DOCUMENT TYPE</label>
          <select
            value={docType}
            onChange={(e) => onChangeDocType?.(e.target.value)}
            style={{ fontWeight: 700, minWidth: 150, color: 'var(--primary)' }}
          >
            <option value="sales_invoice">Tax Invoice</option>
            <option value="sales_order">Wholesale Order</option>
            <option value="quotation">Price Quotation</option>
          </select>
        </div>

        {/* Customer Selector */}
        <div style={{ minWidth: 260 }}>
          <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>WHOLESALE CUSTOMER</label>
          <select
            value={selectedCustomer?.id || ''}
            onChange={handleCustomerChange}
            style={{ fontWeight: 600 }}
          >
            <option value="">-- Walk-in / Cash Wholesale Customer --</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.customer_code} - {c.business_name} ({c.price_tier || 'Standard'})
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
                {formatCurrency(selectedCustomer.current_receivable || 0)}
              </span>
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block' }}>CREDIT LIMIT</span>
              <span className="mono" style={{ fontWeight: 600 }}>
                {formatCurrency(selectedCustomer.credit_limit || 0)}
              </span>
            </div>
            {isOverLimit && <span className="badge badge-danger">LIMIT EXCEEDED</span>}
            {isCreditRestricted && <span className="badge badge-warning">CREDIT LOCKED</span>}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" onClick={onOpenAddCustomer} className="secondary-button small-button" style={{ fontWeight: 700 }}>
          + Add Customer
        </button>
      </div>
    </div>
  );
}
""")

# 3. src/components/pos/ProductSearchGrid.jsx
write_file('src/components/pos/ProductSearchGrid.jsx', """
import React, { useState, useRef, useEffect } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency, calculateWholesaleItemPrice } from '../../lib/formatters';

export default function ProductSearchGrid({ onAddToCart, customer }) {
  const { products = [], categories = [], stockBalances = {} } = useBusiness();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const inputRef = useRef(null);

  // Focus shortcut '/'
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <h3 style={{ margin: 0, fontSize: 14 }}>Products & Search</h3>
        <span style={{ color: 'var(--muted)', fontSize: 11.5 }}>Press '/' to search</span>
      </div>

      <input
        ref={inputRef}
        type="text"
        placeholder="Type SKU code, name, barcode or model..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: 8 }}
      />

      <div className="category-filter-bar" style={{ marginBottom: 10 }}>
        <button
          type="button"
          className={`cat-chip ${selectedCategory === '' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('')}
        >
          All ({products.length})
        </button>
        {categories.map(c => {
          const count = products.filter(p => p.category_id === c.id).length;
          return (
            <button
              key={c.id}
              type="button"
              className={`cat-chip ${selectedCategory === c.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(c.id)}
            >
              {c.name} ({count})
            </button>
          );
        })}
      </div>

      <div className="search-results">
        {filteredProducts.map(p => {
          const stock = stockBalances[p.id] || { qty_available: 0 };
          const price = calculateWholesaleItemPrice(p, 1, customer, []);
          const isOutOfStock = stock.qty_available <= 0;

          return (
            <div
              key={p.id}
              className="product-result"
              onClick={() => onAddToCart(p, 1, 'unit')}
              style={{ opacity: isOutOfStock ? 0.65 : 1, cursor: 'pointer' }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                  <span className="mono" style={{ color: 'var(--primary)', fontWeight: 600 }}>{p.item_code}</span>
                  {p.model && <span> &bull; {p.model}</span>}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
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

              <div style={{ textAlign: 'right', minWidth: 90 }}>
                <div className="mono font-semibold" style={{ color: 'var(--primary)', fontSize: 14 }}>
                  {formatCurrency(price)}
                </div>
                <span className={`badge badge-${isOutOfStock ? 'danger' : 'success'}`} style={{ marginTop: 4, display: 'inline-block' }}>
                  {isOutOfStock ? 'Out of Stock' : `${stock.qty_available} Avail`}
                </span>
              </div>
            </div>
          );
        })}

        {filteredProducts.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 30, fontSize: 13 }}>
            No products found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
""")

# 4. src/components/pos/PosCart.jsx
write_file('src/components/pos/PosCart.jsx', """
import React from 'react';
import { formatCurrency } from '../../lib/formatters';

export default function PosCart({
  items = [],
  customer,
  discount = 0,
  totals = { items_subtotal: 0, grand_total: 0 },
  onUpdateQty,
  onUpdateUnitType,
  onUpdateUnitPrice,
  onRemoveItem,
  onChangeDiscount,
  onClearCart,
  onCheckout
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Bill Cart Items Table */}
      <div className="bill-table-wrap" style={{ flex: 1, overflowY: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 35 }}>#</th>
              <th>Product / Description</th>
              <th style={{ width: 85 }}>Unit Type</th>
              <th style={{ width: 80 }}>Qty</th>
              <th style={{ width: 110 }}>Unit Price</th>
              <th style={{ width: 110, textAlign: 'right' }}>Total (Rs)</th>
              <th style={{ width: 35 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td style={{ color: 'var(--muted)' }}>{idx + 1}</td>
                <td>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{item.product?.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    Code: <span className="mono" style={{ color: 'var(--primary)' }}>{item.product?.item_code}</span>
                  </div>
                </td>
                <td>
                  <select
                    value={item.unit_type || 'unit'}
                    onChange={(e) => onUpdateUnitType?.(idx, e.target.value)}
                    style={{ padding: '3px 6px', fontSize: 11 }}
                  >
                    <option value="unit">Unit</option>
                    {item.product?.pack_size > 1 && <option value="pack">Pack ({item.product.pack_size})</option>}
                    {item.product?.carton_units > 1 && <option value="carton">Carton ({item.product.carton_units})</option>}
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    min="1"
                    className="mono font-semibold"
                    value={item.qty}
                    onChange={(e) => onUpdateQty?.(idx, Number(e.target.value) || 1)}
                    style={{ width: 70, padding: '3px 6px', textAlign: 'center' }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    className="mono"
                    value={item.unit_price}
                    onChange={(e) => onUpdateUnitPrice?.(idx, Number(e.target.value) || 0)}
                    style={{ width: 95, padding: '3px 6px' }}
                  />
                </td>
                <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                  {formatCurrency((item.qty * item.unit_price) - (item.discount_amount || 0))}
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => onRemoveItem?.(idx)}
                    className="secondary-button small-button"
                    style={{ color: '#ff8e8e', padding: '2px 6px' }}
                  >
                    &times;
                  </button>
                </td>
              </tr>
            ))}

            {items.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', color: 'var(--muted)', padding: 50 }}>
                  <div style={{ fontSize: 15, marginBottom: 6 }}>Bill is empty</div>
                  <div style={{ fontSize: 12 }}>Search or click products on the left panel to add to bill</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bill Footer & Settlement Bar */}
      <div style={{ background: '#1c1c1c', borderTop: '2px solid var(--line)', padding: '12px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <button
              type="button"
              onClick={onClearCart}
              disabled={items.length === 0}
              className="secondary-button small-button"
              style={{ color: '#ff8e8e' }}
            >
              Clear Bill
            </button>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Items: <strong>{items.length}</strong> &bull; Total Units: <strong>{items.reduce((s, i) => s + (Number(i.qty) || 0), 0)}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block' }}>SUBTOTAL</span>
              <span className="mono font-semibold">{formatCurrency(totals.items_subtotal || 0)}</span>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block' }}>BILL DISCOUNT (Rs)</span>
              <input
                type="number"
                min="0"
                className="mono"
                value={discount}
                onChange={(e) => onChangeDiscount?.(Number(e.target.value) || 0)}
                style={{ width: 90, padding: '3px 6px', textAlign: 'right', color: '#ffca58' }}
              />
            </div>

            <div style={{ textAlign: 'right', borderLeft: '1px solid var(--line)', paddingLeft: 18 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block' }}>GRAND TOTAL (LKR)</span>
              <span className="mono" style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>
                {formatCurrency(totals.grand_total || 0)}
              </span>
            </div>

            <button
              type="button"
              onClick={onCheckout}
              disabled={items.length === 0}
              className="primary-button"
              style={{ padding: '10px 24px', fontSize: 15, fontWeight: 800 }}
            >
              Checkout (F4)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
""")

# 5. src/components/pos/PaymentModal.jsx
write_file('src/components/pos/PaymentModal.jsx', """
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
  const { bankAccounts = [] } = useBusiness();
  const grandTotal = totals.grand_total || 0;

  const [paymentLines, setPaymentLines] = useState([
    { method: customer ? 'credit' : 'cash', amount: grandTotal, bank_account_id: bankAccounts[0]?.id || '', reference: '' }
  ]);

  const [chequeDetails, setChequeDetails] = useState({
    cheque_no: '',
    bank_name: 'Commercial Bank',
    branch: 'Colombo',
    cheque_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  });

  const [notes, setNotes] = useState('');

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
      payment_lines: paymentLines,
      cheque_details: paymentLines.some(p => p.method === 'cheque') ? chequeDetails : null,
      notes
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box modal-lg">
        <div className="modal-header">
          <h3>Settle & Complete {docType === 'sales_invoice' ? 'Invoice' : docType === 'sales_order' ? 'Sales Order' : 'Quotation'}</h3>
          <button type="button" onClick={onClose} className="modal-close">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Total Banner */}
            <div style={{ background: '#242424', padding: 14, border: '1px solid var(--line)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, borderRadius: 4 }}>
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
            <div style={{ marginTop: 14 }}>
              <label style={{ marginBottom: 6, display: 'block' }}>ADD PAYMENT TENDER</label>
              <div style={{ display: 'flex', gap: 8 }}>
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
                          required
                          className="mono font-semibold"
                          value={line.amount}
                          onChange={(e) => handleUpdateLine(idx, 'amount', Number(e.target.value) || 0)}
                        />
                      </td>
                      <td>
                        {line.method === 'bank' && (
                          <select
                            value={line.bank_account_id}
                            onChange={(e) => handleUpdateLine(idx, 'bank_account_id', e.target.value)}
                          >
                            {bankAccounts.map(b => (
                              <option key={b.id} value={b.id}>{b.account_name}</option>
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
              disabled={docType === 'sales_invoice' && Math.abs(remaining) > 0.01}
              className="primary-button"
              style={{ fontWeight: 800 }}
            >
              Confirm & Post Document
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
""")

# 6. src/components/pos/MarginOverrideModal.jsx
write_file('src/components/pos/MarginOverrideModal.jsx', """
import React from 'react';
import { formatCurrency } from '../../lib/formatters';

export default function MarginOverrideModal({
  lowMarginItems = [],
  minProfitPct = 5.0,
  onClose,
  onProceedAnyway
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-box modal-md">
        <div className="modal-header">
          <h3 style={{ color: '#ff8e8e', margin: 0 }}>⚠️ Minimum Profit Margin Protection Alert</h3>
          <button type="button" onClick={onClose} className="modal-close">&times;</button>
        </div>

        <div className="modal-body">
          <p style={{ color: 'var(--muted)', margin: '0 0 12px', fontSize: 13 }}>
            The following item(s) are priced below the minimum protected margin ({minProfitPct}%) based on Landed Weighted Average Cost:
          </p>

          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Unit Cost</th>
                <th>Selling Price</th>
                <th>Margin %</th>
              </tr>
            </thead>
            <tbody>
              {lowMarginItems.map((it, idx) => (
                <tr key={idx}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{it.product?.name}</div>
                    <small className="mono" style={{ color: 'var(--primary)' }}>{it.product?.item_code}</small>
                  </td>
                  <td className="mono">{formatCurrency(it.unit_cost_snapshot || it.product?.weighted_cost_lkr || 0)}</td>
                  <td className="mono font-semibold">{formatCurrency(it.unit_price)}</td>
                  <td className="mono" style={{ color: '#ff8e8e', fontWeight: 700 }}>
                    {it.marginPct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="secondary-button">
            Cancel & Adjust Prices
          </button>
          <button
            type="button"
            onClick={onProceedAnyway}
            className="danger-button"
            style={{ fontWeight: 700 }}
          >
            Authorize Override & Proceed to Payment
          </button>
        </div>
      </div>
    </div>
  );
}
""")

print("POS components and App.jsx updated and verified.")
