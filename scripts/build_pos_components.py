import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print(f'Wrote {path}')

# src/components/pos/CustomerHeader.jsx
write_file('src/components/pos/CustomerHeader.jsx', """
import React from 'react';
import { User, AlertCircle, CheckCircle2, ShieldAlert, History } from 'lucide-react';
import { formatCurrency } from '../../lib/formatters';

export default function CustomerHeader({
  customers = [],
  selectedCustomerId,
  onSelectCustomer,
  onOpenPriceHistory
}) {
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const isCreditBlocked = selectedCustomer && (
    !selectedCustomer.credit_allowed || 
    (selectedCustomer.credit_limit > 0 && selectedCustomer.current_receivable >= selectedCustomer.credit_limit)
  );

  const availableCredit = selectedCustomer 
    ? Math.max(0, (selectedCustomer.credit_limit || 0) - (selectedCustomer.current_receivable || 0))
    : 0;

  return (
    <div style={{
      background: 'var(--bg-subtle)',
      borderBottom: '1px solid var(--border)',
      padding: '12px 20px',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16
    }}>
      {/* Customer Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 320, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
          <User size={18} color="var(--primary)" />
          <span>Customer:</span>
        </div>
        <select
          className="form-select"
          value={selectedCustomerId || ''}
          onChange={(e) => onSelectCustomer(e.target.value)}
          style={{ fontWeight: 600, fontSize: 13.5 }}
        >
          <option value="">-- Cash / Walk-in Customer --</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>
              {c.customer_code} - {c.business_name} ({c.price_tier || 'Standard'})
            </option>
          ))}
        </select>
      </div>

      {/* Customer Financial Profile Badges */}
      {selectedCustomer ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* Price Tier */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 10.5, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Tier</span>
            <span className="badge badge-purple" style={{ fontSize: 12 }}>{selectedCustomer.price_tier || 'Standard'}</span>
          </div>

          {/* Current Receivable */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 10.5, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Outstanding</span>
            <span className="mono" style={{ fontSize: 13, fontWeight: 800, color: selectedCustomer.current_receivable > 0 ? '#f87171' : 'var(--text)' }}>
              {formatCurrency(selectedCustomer.current_receivable)}
            </span>
          </div>

          {/* Credit Limit & Available */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 10.5, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Available Credit</span>
            <span className="mono" style={{ fontSize: 13, fontWeight: 800, color: availableCredit > 0 ? '#34d399' : '#f87171' }}>
              {formatCurrency(availableCredit)}
            </span>
          </div>

          {/* Credit Terms */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 10.5, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Terms</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
              {selectedCustomer.credit_days || 30} Days
            </span>
          </div>

          {/* Credit Warning / Status */}
          {isCreditBlocked && (
            <div className="badge badge-danger" style={{ padding: '4px 8px' }}>
              <ShieldAlert size={14} />
              <span>Limit Exceeded</span>
            </div>
          )}

          {/* Price History Button */}
          {onOpenPriceHistory && (
            <button
              onClick={onOpenPriceHistory}
              className="btn btn-secondary btn-sm"
              style={{ gap: 4 }}
              title="View Customer Previous Prices"
            >
              <History size={14} />
              <span>Price History</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic' }}>
          * Select customer to apply tiered wholesale pricing and enable credit invoicing.
        </div>
      )}
    </div>
  );
}
""")

# src/components/pos/ProductSearchGrid.jsx
write_file('src/components/pos/ProductSearchGrid.jsx', """
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Plus, Layers, Package, AlertTriangle, Sparkles } from 'lucide-react';
import { formatCurrency, calculateBestWholesalePrice } from '../../lib/formatters';

export default function ProductSearchGrid({
  products = [],
  stockBalances = {},
  categories = [],
  selectedCustomer,
  onAddToCart,
  onInspectPriceHistory
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const searchInputRef = useRef(null);

  // Keyboard shortcut: Focus search on Ctrl+F or '/'
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === '/' || (e.ctrlKey && e.key === 'f')) && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return products.filter(p => {
      if (!p.is_active || !p.is_wholesale_active) return false;
      if (selectedCategory !== 'ALL' && p.category_id !== selectedCategory) return false;
      if (!term) return true;

      return (
        p.name?.toLowerCase().includes(term) ||
        p.item_code?.toLowerCase().includes(term) ||
        p.barcode?.toLowerCase().includes(term) ||
        p.model?.toLowerCase().includes(term) ||
        p.brand_name?.toLowerCase().includes(term)
      );
    });
  }, [products, searchTerm, selectedCategory]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Search & Category Filter Bar */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--panel)', display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input
            ref={searchInputRef}
            type="text"
            className="form-input"
            placeholder="Search code, barcode, name, model, brand... (Press '/' to focus)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: 38, fontSize: 14, height: 42 }}
          />
        </div>

        <select
          className="form-select"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ width: 220, height: 42, fontWeight: 600 }}
        >
          <option value="ALL">All Categories ({products.length})</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Product List Table / Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
            <Package size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ fontSize: 16, fontWeight: 600 }}>No wholesale products found</p>
            <p style={{ fontSize: 13 }}>Try adjusting your search query or category filter</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {filteredProducts.map(product => {
              const stock = stockBalances[product.id] || { qty_on_hand: 0, qty_available: 0, qty_reserved: 0, qty_in_transit: 0 };
              const available = stock.qty_available || 0;
              const isOutOfStock = available <= 0;
              const unitPrice = calculateBestWholesalePrice(product, selectedCustomer, 1, 'unit');
              const packPrice = calculateBestWholesalePrice(product, selectedCustomer, 1, 'pack');
              const cartonPrice = calculateBestWholesalePrice(product, selectedCustomer, 1, 'carton');

              return (
                <div
                  key={product.id}
                  className="card"
                  style={{
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: isOutOfStock ? '1px solid #ef444455' : '1px solid var(--border)',
                    background: isOutOfStock ? 'rgba(239, 68, 68, 0.03)' : 'var(--panel)',
                    position: 'relative'
                  }}
                >
                  {/* Top Product Header */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <span className="badge badge-neutral mono" style={{ fontSize: 11 }}>{product.item_code}</span>
                      <span className={`badge ${available > 10 ? 'badge-success' : available > 0 ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: 11 }}>
                        Avail: {available} {product.unit_name || 'Units'}
                      </span>
                    </div>

                    <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4, lineHeight: 1.3 }}>
                      {product.name}
                    </h4>
                    {product.model && (
                      <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>Model: {product.model}</p>
                    )}
                  </div>

                  {/* Price & Add Quick Buttons */}
                  <div style={{ marginTop: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Wholesale Price:</span>
                      <span className="mono" style={{ fontSize: 16, fontWeight: 800, color: '#38bdf8' }}>
                        {formatCurrency(unitPrice)}
                      </span>
                    </div>

                    {/* Unit / Pack / Carton Add Actions */}
                    <div style={{ display: 'grid', gridTemplateColumns: product.carton_units > 1 ? '1fr 1fr 1fr' : product.pack_size > 1 ? '1fr 1fr' : '1fr', gap: 6 }}>
                      <button
                        onClick={() => onAddToCart(product, 'unit', 1)}
                        disabled={isOutOfStock}
                        className="btn btn-primary btn-sm"
                        style={{ opacity: isOutOfStock ? 0.5 : 1 }}
                        title="Add 1 Unit"
                      >
                        <Plus size={13} /> Unit
                      </button>

                      {product.pack_size > 1 && (
                        <button
                          onClick={() => onAddToCart(product, 'pack', 1)}
                          disabled={available < product.pack_size}
                          className="btn btn-secondary btn-sm"
                          style={{ opacity: available < product.pack_size ? 0.5 : 1, fontSize: 11.5 }}
                          title={`Add Pack of ${product.pack_size}`}
                        >
                          Pack ({product.pack_size})
                        </button>
                      )}

                      {product.carton_units > 1 && (
                        <button
                          onClick={() => onAddToCart(product, 'carton', 1)}
                          disabled={available < product.carton_units}
                          className="btn btn-secondary btn-sm"
                          style={{ opacity: available < product.carton_units ? 0.5 : 1, fontSize: 11.5 }}
                          title={`Add Carton of ${product.carton_units}`}
                        >
                          Carton ({product.carton_units})
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
import { Trash2, ShoppingCart, Percent, Tag, ShieldAlert, ArrowRight, FileCheck, Layers } from 'lucide-react';
import { formatCurrency, calculateMargin } from '../../lib/formatters';

export default function PosCart({
  cartItems = [],
  docType = 'sales_invoice',
  onChangeDocType,
  docDiscountType = 'amount',
  docDiscountValue = 0,
  onChangeDocDiscount,
  onUpdateItemQty,
  onUpdateItemPrice,
  onUpdateItemDiscount,
  onRemoveItem,
  onClearCart,
  onCheckout,
  minProfitPct = 5.0
}) {
  // Calculate Totals
  const subtotal = cartItems.reduce((sum, it) => sum + (Number(it.unit_price) * Number(it.qty)), 0);
  const lineDiscountTotal = cartItems.reduce((sum, it) => sum + (Number(it.line_discount) || 0), 0);
  
  const docDiscountTotal = docDiscountType === 'percentage' 
    ? ((subtotal - lineDiscountTotal) * (Number(docDiscountValue) || 0)) / 100 
    : (Number(docDiscountValue) || 0);

  const grandTotal = Math.max(0, subtotal - lineDiscountTotal - docDiscountTotal);

  // Profit & Margin Check
  const totalCost = cartItems.reduce((sum, it) => sum + ((it.product?.weighted_cost_lkr || 0) * (it.base_qty || it.qty)), 0);
  const grossProfit = grandTotal - totalCost;
  const grossProfitPct = grandTotal > 0 ? ((grossProfit / grandTotal) * 100) : 0;
  const isBelowMinMargin = cartItems.length > 0 && grossProfitPct < minProfitPct;

  return (
    <div className="pos-cart-pane">
      {/* Top Cart Header & Document Mode Selector */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingCart size={18} color="var(--primary)" />
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Sales Cart ({cartItems.length})</h3>
          </div>
          {cartItems.length > 0 && (
            <button onClick={onClearCart} className="btn btn-secondary btn-sm" style={{ color: '#ef4444', padding: '3px 8px' }}>
              Clear
            </button>
          )}
        </div>

        {/* Doc Type Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {[
            { id: 'sales_invoice', label: 'Invoice' },
            { id: 'sales_order', label: 'Sales Order' },
            { id: 'quotation', label: 'Quotation' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => onChangeDocType(t.id)}
              style={{
                padding: '6px 4px',
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: docType === t.id ? 'var(--primary)' : 'var(--border)',
                background: docType === t.id ? 'var(--primary)' : 'var(--panel)',
                color: docType === t.id ? '#ffffff' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cart Scrollable Items List */}
      <div className="pos-cart-items">
        {cartItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 10px', color: 'var(--text-dim)' }}>
            <ShoppingCart size={40} style={{ opacity: 0.3, marginBottom: 10 }} />
            <p style={{ fontSize: 14, fontWeight: 600 }}>Cart is empty</p>
            <p style={{ fontSize: 12 }}>Select products from the left to add items</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cartItems.map((item, idx) => {
              const lineCost = (item.product?.weighted_cost_lkr || 0) * (item.base_qty || item.qty);
              const lineTotal = (item.unit_price * item.qty) - (item.line_discount || 0);
              const lineMargin = lineTotal > 0 ? calculateMargin(lineCost / item.qty, item.unit_price) : 0;
              const isLowMargin = lineMargin < minProfitPct;

              return (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-subtle)',
                    border: isLowMargin ? '1px solid #f59e0b55' : '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 12
                  }}
                >
                  {/* Item Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                        {item.product?.name || item.item_code}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                        {item.product?.item_code} | {item.unit_type?.toUpperCase()} (Base: {item.base_qty} units)
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveItem(idx)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Quantity & Unit Price Inputs */}
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px', gap: 8, alignItems: 'center' }}>
                    {/* Qty Input */}
                    <div>
                      <label style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700 }}>QTY</label>
                      <input
                        type="number"
                        min="1"
                        className="form-input mono"
                        value={item.qty}
                        onChange={(e) => onUpdateItemQty(idx, Math.max(1, Number(e.target.value) || 1))}
                        style={{ padding: '5px 8px', fontSize: 13, fontWeight: 700 }}
                      />
                    </div>

                    {/* Unit Price Input */}
                    <div>
                      <label style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700 }}>UNIT PRICE</label>
                      <input
                        type="number"
                        className="form-input mono"
                        value={item.unit_price}
                        onChange={(e) => onUpdateItemPrice(idx, Math.max(0, Number(e.target.value) || 0))}
                        style={{ padding: '5px 8px', fontSize: 13, fontWeight: 700, color: '#38bdf8' }}
                      />
                    </div>

                    {/* Line Total Display */}
                    <div style={{ textAlign: 'right' }}>
                      <label style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700 }}>TOTAL</label>
                      <div className="mono" style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)', paddingTop: 5 }}>
                        {formatCurrency(lineTotal)}
                      </div>
                    </div>
                  </div>

                  {/* Line Discount & Profit Margin Snapshot */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTop: '1px dashed var(--border-subtle)', fontSize: 11.5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ color: 'var(--text-dim)' }}>Disc:</span>
                      <input
                        type="number"
                        placeholder="0"
                        className="form-input mono"
                        value={item.line_discount || ''}
                        onChange={(e) => onUpdateItemDiscount(idx, Number(e.target.value) || 0)}
                        style={{ width: 65, padding: '2px 4px', fontSize: 11 }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--text-dim)' }}>Margin:</span>
                      <span className="mono" style={{ fontWeight: 700, color: isLowMargin ? '#fbbf24' : '#34d399' }}>
                        {lineMargin}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fixed Cart Footer Summary */}
      <div className="pos-cart-summary">
        {/* Margin Threshold Alert */}
        {isBelowMinMargin && (
          <div style={{
            background: 'var(--warning-subtle)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            color: '#fbbf24'
          }}>
            <ShieldAlert size={16} />
            <span>Profit margin ({grossProfitPct.toFixed(1)}%) is below minimum {minProfitPct}%. Margin override required.</span>
          </div>
        )}

        {/* Totals Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)' }}>
            <span>Subtotal:</span>
            <span className="mono">{formatCurrency(subtotal)}</span>
          </div>

          {lineDiscountTotal > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#f87171' }}>
              <span>Line Discounts:</span>
              <span className="mono">- {formatCurrency(lineDiscountTotal)}</span>
            </div>
          )}

          {/* Document Discount Field */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
              <Tag size={13} />
              <span>Doc Discount:</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <select
                className="form-select"
                value={docDiscountType}
                onChange={(e) => onChangeDocDiscount(e.target.value, docDiscountValue)}
                style={{ width: 60, padding: '2px 4px', fontSize: 11 }}
              >
                <option value="amount">Rs.</option>
                <option value="percentage">%</option>
              </select>
              <input
                type="number"
                className="form-input mono"
                placeholder="0"
                value={docDiscountValue || ''}
                onChange={(e) => onChangeDocDiscount(docDiscountType, Number(e.target.value) || 0)}
                style={{ width: 75, padding: '3px 6px', fontSize: 12, textAlign: 'right' }}
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Grand Total:</span>
            <span className="mono" style={{ fontSize: 20, fontWeight: 900, color: '#38bdf8' }}>
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>

        {/* Checkout Button */}
        <button
          onClick={onCheckout}
          disabled={cartItems.length === 0}
          className="btn btn-primary btn-lg"
          style={{ width: '100%', gap: 10, fontWeight: 800 }}
        >
          <span>{docType === 'quotation' ? 'Save Quotation' : docType === 'sales_order' ? 'Confirm Sales Order' : 'Proceed to Payment'}</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
""")

# src/components/pos/PaymentModal.jsx
write_file('src/components/pos/PaymentModal.jsx', """
import React, { useState } from 'react';
import Modal from '../common/Modal';
import { CreditCard, Landmark, DollarSign, FileCheck, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../lib/formatters';

export default function PaymentModal({
  isOpen,
  onClose,
  grandTotal = 0,
  customer,
  bankAccounts = [],
  onConfirmPayment
}) {
  const [payments, setPayments] = useState([
    { method: 'cash', amount: grandTotal, bank_account_id: bankAccounts[0]?.id || '', cheque_no: '', cheque_bank: '', cheque_branch: '', cheque_date: new Date().toISOString().slice(0, 10), notes: '' }
  ]);

  const totalAllocated = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingBalance = Math.max(0, grandTotal - totalAllocated);

  const handleAddSplit = () => {
    if (remainingBalance <= 0) return;
    setPayments(prev => [
      ...prev,
      { method: 'bank', amount: remainingBalance, bank_account_id: bankAccounts[0]?.id || '', cheque_no: '', cheque_bank: '', cheque_branch: '', cheque_date: new Date().toISOString().slice(0, 10), notes: '' }
    ]);
  };

  const handleUpdatePayment = (index, field, value) => {
    setPayments(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const handleRemoveSplit = (index) => {
    setPayments(prev => prev.filter((_, i) => i !== index));
  };

  const handleComplete = () => {
    onConfirmPayment(payments);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Wholesale Payment"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button
            onClick={handleComplete}
            className="btn btn-success btn-lg"
            style={{ fontWeight: 800, gap: 8 }}
          >
            <CheckCircle2 size={18} />
            <span>Complete & Post Invoice</span>
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, background: 'var(--bg-subtle)', padding: 16, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 700 }}>INVOICE TOTAL</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>{formatCurrency(grandTotal)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL PAID</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 900, color: '#34d399' }}>{formatCurrency(totalAllocated)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 700 }}>CREDIT / BALANCE DUE</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 900, color: remainingBalance > 0 ? '#f87171' : '#9ca3af' }}>
              {formatCurrency(remainingBalance)}
            </div>
          </div>
        </div>

        {/* Payment Lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Split Payment Entries</h4>
            {remainingBalance > 0 && (
              <button onClick={handleAddSplit} className="btn btn-secondary btn-sm" style={{ gap: 4 }}>
                <Plus size={14} /> Add Split Method
              </button>
            )}
          </div>

          {payments.map((p, idx) => (
            <div key={idx} className="card" style={{ padding: 14, background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 140px 1fr auto', gap: 10, alignItems: 'center' }}>
                {/* Method */}
                <div>
                  <label className="form-label">Method</label>
                  <select
                    className="form-select"
                    value={p.method}
                    onChange={(e) => handleUpdatePayment(idx, 'method', e.target.value)}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="card">Credit/Debit Card</option>
                    <option value="cheque">Cheque (Register)</option>
                    <option value="customer_credit">Credit / On Account</option>
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="form-label">Amount (Rs.)</label>
                  <input
                    type="number"
                    className="form-input mono"
                    value={p.amount}
                    onChange={(e) => handleUpdatePayment(idx, 'amount', Number(e.target.value) || 0)}
                    style={{ fontWeight: 700 }}
                  />
                </div>

                {/* Details based on method */}
                <div>
                  {['bank', 'card'].includes(p.method) && (
                    <div>
                      <label className="form-label">Deposit Bank Account</label>
                      <select
                        className="form-select"
                        value={p.bank_account_id}
                        onChange={(e) => handleUpdatePayment(idx, 'bank_account_id', e.target.value)}
                      >
                        {bankAccounts.map(b => (
                          <option key={b.id} value={b.id}>{b.account_name} ({b.bank_name})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {p.method === 'cheque' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 6 }}>
                      <div>
                        <label className="form-label">Cheque #</label>
                        <input
                          type="text"
                          placeholder="e.g. 104598"
                          className="form-input mono"
                          value={p.cheque_no}
                          onChange={(e) => handleUpdatePayment(idx, 'cheque_no', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="form-label">Cheque Bank</label>
                        <input
                          type="text"
                          placeholder="e.g. Commercial Bank"
                          className="form-input"
                          value={p.cheque_bank}
                          onChange={(e) => handleUpdatePayment(idx, 'cheque_bank', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="form-label">Maturity Date</label>
                        <input
                          type="date"
                          className="form-input mono"
                          value={p.cheque_date}
                          onChange={(e) => handleUpdatePayment(idx, 'cheque_date', e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {p.method === 'customer_credit' && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', paddingTop: 20 }}>
                      Remaining balance will be added to Customer Receivable ledger (Terms: {customer?.credit_days || 30} Days).
                    </div>
                  )}
                </div>

                {/* Remove */}
                {payments.length > 1 && (
                  <button
                    onClick={() => handleRemoveSplit(idx)}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', paddingTop: 20 }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
""")

# src/components/pos/MarginOverrideModal.jsx
write_file('src/components/pos/MarginOverrideModal.jsx', """
import React, { useState } from 'react';
import Modal from '../common/Modal';
import { AlertTriangle, Lock } from 'lucide-react';

export default function MarginOverrideModal({
  isOpen,
  onClose,
  marginPct = 0,
  minProfitPct = 5.0,
  onConfirmOverride
}) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirmOverride(reason);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Minimum-Profit Margin Protection Alert"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">Cancel Sale</button>
          <button
            onClick={handleConfirm}
            disabled={!reason.trim()}
            className="btn btn-warning"
            style={{ fontWeight: 800 }}
          >
            Confirm Owner Override
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{
          background: 'var(--warning-subtle)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          borderRadius: 'var(--radius-sm)',
          padding: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <AlertTriangle size={28} color="#fbbf24" style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24' }}>Margin Below Allowed Threshold</h4>
            <p style={{ fontSize: 12.5, color: 'var(--text)' }}>
              The gross margin on this invoice is <strong>{marginPct.toFixed(2)}%</strong>, which is below the configured minimum threshold of <strong>{minProfitPct}%</strong>.
            </p>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            Owner Override Reason <span style={{ color: '#ef4444' }}>*</span> (Will be recorded in Audit Log)
          </label>
          <textarea
            className="form-textarea"
            rows="3"
            placeholder="e.g. Clearance sale / Volume discount approved by Owner / Price match with competitor"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
        </div>
      </div>
    </Modal>
  );
}
""")

# src/components/transit/LandedCostModal.jsx
write_file('src/components/transit/LandedCostModal.jsx', """
import React, { useState } from 'react';
import Modal from '../common/Modal';
import { LANDED_COST_TYPES, ALLOCATION_METHODS } from '../../lib/constants';
import { useBusiness } from '../../context/BusinessContext';

export default function LandedCostModal({ isOpen, onClose, shipmentId }) {
  const { addLandedCostToShipment, bankAccounts, currencies } = useBusiness();

  const [formData, setFormData] = useState({
    expense_type: 'freight',
    payee: '',
    currency: 'LKR',
    foreign_amount: 0,
    exchange_rate: 1,
    lkr_amount: 0,
    payment_method: 'bank',
    bank_account_id: bankAccounts[0]?.id || '',
    reference: '',
    allocation_method: 'value',
    notes: ''
  });

  const handleCurrencyChange = (curr) => {
    const rate = currencies.find(c => c.code === curr)?.exchange_rate_to_lkr || 1;
    setFormData(prev => ({
      ...prev,
      currency: curr,
      exchange_rate: rate,
      lkr_amount: (Number(prev.foreign_amount) || 0) * rate
    }));
  };

  const handleForeignAmountChange = (amt) => {
    setFormData(prev => ({
      ...prev,
      foreign_amount: amt,
      lkr_amount: (Number(amt) || 0) * (Number(prev.exchange_rate) || 1)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.lkr_amount || formData.lkr_amount <= 0) return;

    addLandedCostToShipment(shipmentId, formData, formData.allocation_method);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Landed Cost / Import Expense"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button onClick={handleSubmit} className="btn btn-primary" style={{ fontWeight: 700 }}>
            Allocate & Save Expense
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Expense Type */}
          <div className="form-group">
            <label className="form-label">Expense Category</label>
            <select
              className="form-select"
              value={formData.expense_type}
              onChange={(e) => setFormData(prev => ({ ...prev, expense_type: e.target.value }))}
            >
              {LANDED_COST_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Payee / Vendor */}
          <div className="form-group">
            <label className="form-label">Payee / Freight Agent / Customs</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. DHL Global Forwarding / Sri Lanka Customs"
              value={formData.payee}
              onChange={(e) => setFormData(prev => ({ ...prev, payee: e.target.value }))}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '120px 140px 1fr', gap: 14 }}>
          {/* Currency */}
          <div className="form-group">
            <label className="form-label">Currency</label>
            <select
              className="form-select"
              value={formData.currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
            >
              {currencies.map(c => (
                <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
              ))}
            </select>
          </div>

          {/* Foreign Amount */}
          <div className="form-group">
            <label className="form-label">Amount</label>
            <input
              type="number"
              className="form-input mono"
              value={formData.foreign_amount}
              onChange={(e) => handleForeignAmountChange(e.target.value)}
            />
          </div>

          {/* Total LKR */}
          <div className="form-group">
            <label className="form-label">Total in LKR (Calculated)</label>
            <input
              type="number"
              className="form-input mono"
              value={formData.lkr_amount}
              onChange={(e) => setFormData(prev => ({ ...prev, lkr_amount: Number(e.target.value) || 0 }))}
              style={{ fontWeight: 800, color: '#38bdf8' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Allocation Method */}
          <div className="form-group">
            <label className="form-label">Cost Allocation Method</label>
            <select
              className="form-select"
              value={formData.allocation_method}
              onChange={(e) => setFormData(prev => ({ ...prev, allocation_method: e.target.value }))}
            >
              {ALLOCATION_METHODS.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Bank Account */}
          <div className="form-group">
            <label className="form-label">Payment Account</label>
            <select
              className="form-select"
              value={formData.bank_account_id}
              onChange={(e) => setFormData(prev => ({ ...prev, bank_account_id: e.target.value }))}
            >
              {bankAccounts.map(b => (
                <option key={b.id} value={b.id}>{b.account_name} ({b.bank_name})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Reference / Bill / Receipt No</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. BL-987654 / Customs CUSDEC-12345"
            value={formData.reference}
            onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
          />
        </div>
      </form>
    </Modal>
  );
}
""")

print("POS and Transit components created.")
