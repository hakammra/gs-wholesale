import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print(f'Wrote {path}')

# src/pages/Auth/Login.jsx
write_file('src/pages/Auth/Login.jsx', """
import React, { useState } from 'react';
import { Computer, Lock, Mail, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export default function Login() {
  const { login, loading } = useAuth();
  const { notifyError } = useNotification();
  const [email, setEmail] = useState('owner@gstechnologies.lk');
  const [password, setPassword] = useState('wholesale2026');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await login(email, password);
    if (!res.success) {
      notifyError(res.error || 'Login failed. Please verify owner credentials.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 20%, #0369a122 0%, #0b0f19 80%)',
      padding: 20
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 440, padding: 32, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 12, background: 'linear-gradient(135deg, #0284c7, #0369a1)',
            display: 'grid', placeItems: 'center', color: '#fff', margin: '0 auto 16px'
          }}>
            <Computer size={32} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
            GS Wholesale POS
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Wholesale Computer Components & Import Management
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Owner Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="email"
                required
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: 36 }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="password"
                required
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: 36 }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 8, fontWeight: 800, gap: 8 }}
          >
            <ShieldCheck size={18} />
            <span>{loading ? 'Authenticating...' : 'Sign In as Owner'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-dim)', borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
          Dedicated Wholesale Instance &bull; Standalone Business Database
        </div>
      </div>
    </div>
  );
}
""")

# src/pages/Dashboard/Dashboard.jsx
write_file('src/pages/Dashboard/Dashboard.jsx', """
import React from 'react';
import { 
  DollarSign, TrendingUp, AlertTriangle, Ship, CreditCard, 
  Landmark, Package, Users, ArrowUpRight, ArrowDownRight, Clock
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency, formatDate } from '../../lib/formatters';

export default function Dashboard({ onNavigateTab }) {
  const { 
    salesDocuments, customers, products, stockBalances, 
    transitShipments, cheques, bankAccounts 
  } = useBusiness();

  // Metrics calculation
  const todayStr = new Date().toISOString().slice(0, 10);
  const completedInvoices = salesDocuments.filter(d => d.doc_type === 'sales_invoice');

  const todaySales = completedInvoices
    .filter(d => d.doc_date === todayStr)
    .reduce((sum, d) => sum + (d.grand_total || 0), 0);

  const todayProfit = completedInvoices
    .filter(d => d.doc_date === todayStr)
    .reduce((sum, d) => sum + (d.gross_profit || 0), 0);

  const totalReceivables = customers.reduce((sum, c) => sum + (c.current_receivable || 0), 0);

  const totalBankBalance = bankAccounts.reduce((sum, b) => sum + (b.current_balance || 0), 0);

  const pendingCheques = cheques.filter(c => c.status === 'received' || c.status === 'held');
  const pendingChequesAmount = pendingCheques.reduce((sum, c) => sum + (c.amount || 0), 0);

  const inTransitShipments = transitShipments.filter(s => s.status === 'in_transit' || s.status === 'preparing');
  const inTransitValue = inTransitShipments.reduce((sum, s) => sum + (s.total_estimated_cost_lkr || 0), 0);

  // Low stock products
  const lowStockList = products.filter(p => {
    const stock = stockBalances[p.id] || { qty_available: 0 };
    return stock.qty_available <= (p.low_stock_threshold || 10);
  });

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Stat Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <StatCard
          title="Today's Wholesale Sales"
          value={formatCurrency(todaySales)}
          icon={DollarSign}
          color="primary"
          subtext={`Gross Profit: ${formatCurrency(todayProfit)}`}
        />
        <StatCard
          title="Accounts Receivable (Credit)"
          value={formatCurrency(totalReceivables)}
          icon={TrendingUp}
          color={totalReceivables > 1000000 ? 'danger' : 'warning'}
          subtext={`${customers.filter(c => c.current_receivable > 0).length} Customers with dues`}
        />
        <StatCard
          title="Pending Cheques Register"
          value={formatCurrency(pendingChequesAmount)}
          icon={CreditCard}
          color="purple"
          subtext={`${pendingCheques.length} Cheques awaiting clearance`}
        />
        <StatCard
          title="Stock in Transit"
          value={formatCurrency(inTransitValue)}
          icon={Ship}
          color="primary"
          subtext={`${inTransitShipments.length} Active import shipments`}
        />
        <StatCard
          title="Total Bank & Cash Liquidity"
          value={formatCurrency(totalBankBalance)}
          icon={Landmark}
          color="success"
          subtext={`${bankAccounts.length} Verified Bank Accounts`}
        />
      </div>

      {/* Main Split Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        {/* Recent Invoices & Sales Activity */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Recent Wholesale Transactions</h3>
            <button onClick={() => onNavigateTab('sales-documents')} className="btn btn-secondary btn-sm">
              View All Docs
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Doc #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {salesDocuments.slice(0, 6).map(doc => (
                  <tr key={doc.id}>
                    <td className="mono font-semibold" style={{ color: '#38bdf8' }}>{doc.doc_no}</td>
                    <td>{doc.customer?.business_name || 'Cash Customer'}</td>
                    <td>{formatDate(doc.doc_date)}</td>
                    <td className="mono font-semibold">{formatCurrency(doc.grand_total)}</td>
                    <td>
                      <span className={`badge badge-${doc.payment_status === 'paid' ? 'success' : doc.payment_status === 'credit' ? 'warning' : 'neutral'}`}>
                        {doc.payment_status?.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
                {salesDocuments.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 30 }}>
                      No sales recorded yet. Click POS to create first invoice.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock & Action Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Low Stock Alert */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={18} color="#f59e0b" />
                <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Reorder Alerts ({lowStockList.length})</h3>
              </div>
              <button onClick={() => onNavigateTab('inventory')} className="btn btn-secondary btn-sm">
                Stock List
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {lowStockList.slice(0, 4).map(p => {
                const stock = stockBalances[p.id] || { qty_available: 0, qty_in_transit: 0 };
                return (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Code: {p.item_code} | In Transit: {stock.qty_in_transit}</div>
                    </div>
                    <span className="badge badge-danger mono" style={{ fontSize: 12 }}>
                      {stock.qty_available} left
                    </span>
                  </div>
                );
              })}
              {lowStockList.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', padding: 20 }}>
                  All inventory levels are healthy!
                </div>
              )}
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="card" style={{ padding: 18 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 12 }}>Quick Workflows</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => onNavigateTab('pos')} className="btn btn-primary" style={{ justifyContent: 'center' }}>
                Open POS
              </button>
              <button onClick={() => onNavigateTab('purchases')} className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                Receive GRN
              </button>
              <button onClick={() => onNavigateTab('stock-in-transit')} className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                Track Shipments
              </button>
              <button onClick={() => onNavigateTab('cheques')} className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                Cheque Register
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
""")

# src/pages/POS/WholesalePOS.jsx
write_file('src/pages/POS/WholesalePOS.jsx', """
import React, { useState } from 'react';
import CustomerHeader from '../../components/pos/CustomerHeader';
import ProductSearchGrid from '../../components/pos/ProductSearchGrid';
import PosCart from '../../components/pos/PosCart';
import PaymentModal from '../../components/pos/PaymentModal';
import MarginOverrideModal from '../../components/pos/MarginOverrideModal';
import Modal from '../../components/common/Modal';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { calculateBestWholesalePrice, formatCurrency, formatDate } from '../../lib/formatters';
import { generateInvoicePDF } from '../../lib/pdfGenerator';
import { generateWhatsAppInvoiceLink } from '../../lib/exportUtils';
import { Printer, MessageCircle, CheckCircle2 } from 'lucide-react';

export default function WholesalePOS() {
  const { 
    customers, products, stockBalances, categories, bankAccounts, 
    companySettings, postSalesDocument, salesDocuments 
  } = useBusiness();
  const { notifySuccess, notifyError, notifyWarning } = useNotification();

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [docType, setDocType] = useState('sales_invoice');
  const [docDiscountType, setDocDiscountType] = useState('amount');
  const [docDiscountValue, setDocDiscountValue] = useState(0);

  // Modals
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isMarginOverrideOpen, setIsMarginOverrideOpen] = useState(false);
  const [isPriceHistoryOpen, setIsPriceHistoryOpen] = useState(false);
  const [completedDoc, setCompletedDoc] = useState(null);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // Add product to cart
  const handleAddToCart = (product, unitType = 'unit', qtyToAdd = 1) => {
    const baseQty = unitType === 'carton' ? (product.carton_units || 1) : unitType === 'pack' ? (product.pack_size || 1) : 1;
    const stock = stockBalances[product.id] || { qty_available: 0 };

    const existingIndex = cartItems.findIndex(i => i.product_id === product.id && i.unit_type === unitType);

    let nextQty = qtyToAdd;
    if (existingIndex > -1) {
      nextQty = cartItems[existingIndex].qty + qtyToAdd;
    }

    const totalBaseUnitsNeeded = nextQty * baseQty;
    if (totalBaseUnitsNeeded > stock.qty_available) {
      notifyError(`Cannot add ${nextQty} ${unitType}(s). Only ${stock.qty_available} units available in stock! Negative stock is disabled.`);
      return;
    }

    const bestPrice = calculateBestWholesalePrice(product, selectedCustomer, nextQty, unitType);

    if (existingIndex > -1) {
      setCartItems(prev => prev.map((item, idx) => idx === existingIndex ? {
        ...item,
        qty: nextQty,
        base_qty: totalBaseUnitsNeeded,
        unit_price: bestPrice
      } : item));
    } else {
      setCartItems(prev => [...prev, {
        product_id: product.id,
        product,
        item_code: product.item_code,
        unit_type: unitType,
        qty: qtyToAdd,
        base_qty: totalBaseUnitsNeeded,
        unit_price: bestPrice,
        line_discount: 0
      }]);
    }
  };

  const handleUpdateItemQty = (index, qty) => {
    const item = cartItems[index];
    const baseMultiplier = item.unit_type === 'carton' ? (item.product?.carton_units || 1) : item.unit_type === 'pack' ? (item.product?.pack_size || 1) : 1;
    const needed = qty * baseMultiplier;
    const stock = stockBalances[item.product_id] || { qty_available: 0 };

    if (needed > stock.qty_available) {
      notifyError(`Available stock limit is ${stock.qty_available} units.`);
      return;
    }

    const newPrice = calculateBestWholesalePrice(item.product, selectedCustomer, qty, item.unit_type);
    setCartItems(prev => prev.map((it, idx) => idx === index ? {
      ...it,
      qty,
      base_qty: needed,
      unit_price: newPrice
    } : it));
  };

  const handleUpdateItemPrice = (index, unit_price) => {
    setCartItems(prev => prev.map((it, idx) => idx === index ? { ...it, unit_price } : it));
  };

  const handleUpdateItemDiscount = (index, line_discount) => {
    setCartItems(prev => prev.map((it, idx) => idx === index ? { ...it, line_discount } : it));
  };

  const handleRemoveItem = (index) => {
    setCartItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleClearCart = () => {
    setCartItems([]);
    setDocDiscountValue(0);
  };

  // Checkout flow
  const subtotal = cartItems.reduce((sum, it) => sum + (it.unit_price * it.qty), 0);
  const lineDiscountTotal = cartItems.reduce((sum, it) => sum + (Number(it.line_discount) || 0), 0);
  const docDiscountTotal = docDiscountType === 'percentage' ? ((subtotal - lineDiscountTotal) * Number(docDiscountValue)) / 100 : Number(docDiscountValue);
  const grandTotal = Math.max(0, subtotal - lineDiscountTotal - docDiscountTotal);

  const totalCost = cartItems.reduce((sum, it) => sum + ((it.product?.weighted_cost_lkr || 0) * (it.base_qty || it.qty)), 0);
  const grossProfit = grandTotal - totalCost;
  const grossProfitPct = grandTotal > 0 ? ((grossProfit / grandTotal) * 100) : 0;
  const minProfitPct = companySettings.min_profit_pct || 5.0;

  const handleInitiateCheckout = () => {
    if (cartItems.length === 0) return;

    // Check margin
    if (grossProfitPct < minProfitPct) {
      setIsMarginOverrideOpen(true);
      return;
    }

    if (docType === 'sales_invoice') {
      setIsPaymentOpen(true);
    } else {
      // Direct post quotation or sales order
      executePostDocument([], '');
    }
  };

  const handleConfirmMarginOverride = (reason) => {
    if (docType === 'sales_invoice') {
      setIsPaymentOpen(true);
    } else {
      executePostDocument([], reason);
    }
  };

  const executePostDocument = (payments = [], overrideReason = '') => {
    const docData = {
      doc_type: docType,
      customer_id: selectedCustomerId || null,
      doc_discount_total: docDiscountTotal,
      items: cartItems,
      payments,
      margin_override_reason: overrideReason
    };

    const created = postSalesDocument(docData);
    if (created) {
      setCompletedDoc(created);
      handleClearCart();
    }
  };

  return (
    <div className="pos-layout">
      {/* Left Pane: Customer Header + Product Search Grid */}
      <div className="pos-catalog-pane">
        <CustomerHeader
          customers={customers}
          selectedCustomerId={selectedCustomerId}
          onSelectCustomer={setSelectedCustomerId}
          onOpenPriceHistory={() => setIsPriceHistoryOpen(true)}
        />

        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ProductSearchGrid
            products={products}
            stockBalances={stockBalances}
            categories={categories}
            selectedCustomer={selectedCustomer}
            onAddToCart={handleAddToCart}
          />
        </div>
      </div>

      {/* Right Pane: Cart, Totals, Actions */}
      <PosCart
        cartItems={cartItems}
        docType={docType}
        onChangeDocType={setDocType}
        docDiscountType={docDiscountType}
        docDiscountValue={docDiscountValue}
        onChangeDocDiscount={(type, val) => { setDocDiscountType(type); setDocDiscountValue(val); }}
        onUpdateItemQty={handleUpdateItemQty}
        onUpdateItemPrice={handleUpdateItemPrice}
        onUpdateItemDiscount={handleUpdateItemDiscount}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onCheckout={handleInitiateCheckout}
        minProfitPct={minProfitPct}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        grandTotal={grandTotal}
        customer={selectedCustomer}
        bankAccounts={bankAccounts}
        onConfirmPayment={(payments) => executePostDocument(payments, '')}
      />

      {/* Margin Override Modal */}
      <MarginOverrideModal
        isOpen={isMarginOverrideOpen}
        onClose={() => setIsMarginOverrideOpen(false)}
        marginPct={grossProfitPct}
        minProfitPct={minProfitPct}
        onConfirmOverride={handleConfirmMarginOverride}
      />

      {/* Price History Modal */}
      <Modal
        isOpen={isPriceHistoryOpen}
        onClose={() => setIsPriceHistoryOpen(false)}
        title={`Purchase Price History: ${selectedCustomer?.business_name || ''}`}
        size="lg"
      >
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Doc #</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit Price</th>
              </tr>
            </thead>
            <tbody>
              {salesDocuments
                .filter(d => d.customer_id === selectedCustomerId)
                .flatMap(d => (d.items || []).map(it => ({ ...it, doc_no: d.doc_no, doc_date: d.doc_date })))
                .slice(0, 15)
                .map((row, idx) => (
                  <tr key={idx}>
                    <td>{formatDate(row.doc_date)}</td>
                    <td className="mono">{row.doc_no}</td>
                    <td>{row.product?.name || row.item_code}</td>
                    <td>{row.qty} {row.unit_type}</td>
                    <td className="mono font-semibold" style={{ color: '#38bdf8' }}>{formatCurrency(row.unit_price)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* Document Success Receipt Modal */}
      {completedDoc && (
        <Modal
          isOpen={true}
          onClose={() => setCompletedDoc(null)}
          title="Document Successfully Generated!"
          footer={
            <>
              <button onClick={() => setCompletedDoc(null)} className="btn btn-secondary">
                Close
              </button>
              <button
                onClick={() => generateInvoicePDF(completedDoc, companySettings, 'A4')}
                className="btn btn-primary"
                style={{ gap: 6 }}
              >
                <Printer size={16} />
                <span>Print PDF (A4)</span>
              </button>
            </>
          }
        >
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <CheckCircle2 size={48} color="#34d399" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
              {completedDoc.doc_no}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
              Total: <strong>{formatCurrency(completedDoc.grand_total)}</strong> &bull; Balance: <strong>{formatCurrency(completedDoc.balance_due)}</strong>
            </p>

            {selectedCustomer?.whatsapp && (
              <a
                href={generateWhatsAppInvoiceLink(selectedCustomer.whatsapp, completedDoc)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-success"
                style={{ display: 'inline-flex', gap: 6, margin: '8px auto' }}
              >
                <MessageCircle size={16} />
                <span>Send via WhatsApp</span>
              </a>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
""")

# src/pages/SalesDocuments/SalesDocumentsList.jsx
write_file('src/pages/SalesDocuments/SalesDocumentsList.jsx', """
import React, { useState } from 'react';
import { FileText, Printer, MessageCircle, Filter, Search, Eye, ArrowRight } from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { generateInvoicePDF } from '../../lib/pdfGenerator';
import { generateWhatsAppInvoiceLink } from '../../lib/exportUtils';
import SearchInput from '../../components/common/SearchInput';
import Modal from '../../components/common/Modal';

export default function SalesDocumentsList() {
  const { salesDocuments, companySettings, postSalesDocument } = useBusiness();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [viewDoc, setViewDoc] = useState(null);

  const filteredDocs = salesDocuments.filter(d => {
    if (filterType !== 'ALL' && d.doc_type !== filterType) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      d.doc_no?.toLowerCase().includes(term) ||
      d.customer?.business_name?.toLowerCase().includes(term) ||
      d.notes?.toLowerCase().includes(term)
    );
  });

  // Convert Quotation -> Sales Order -> Sales Invoice
  const handleConvert = (doc, targetType) => {
    postSalesDocument({
      ...doc,
      doc_type: targetType,
      doc_no: undefined, // generates new doc no
      created_at: undefined
    });
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Filter Bar */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ maxWidth: 360, flex: 1 }}>
          <SearchInput
            placeholder="Search doc number, customer..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { id: 'ALL', label: 'All Documents' },
            { id: 'sales_invoice', label: 'Invoices' },
            { id: 'sales_order', label: 'Sales Orders' },
            { id: 'quotation', label: 'Quotations' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`btn btn-sm ${filterType === f.id ? 'btn-primary' : 'btn-secondary'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Doc #</th>
                <th>Type</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Grand Total</th>
                <th>Paid</th>
                <th>Balance Due</th>
                <th>Profit Margin</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map(doc => (
                <tr key={doc.id}>
                  <td className="mono font-semibold" style={{ color: '#38bdf8' }}>{doc.doc_no}</td>
                  <td>
                    <span className="badge badge-neutral" style={{ textTransform: 'uppercase', fontSize: 11 }}>
                      {doc.doc_type?.replace('_', ' ')}
                    </span>
                  </td>
                  <td>{formatDate(doc.doc_date)}</td>
                  <td style={{ fontWeight: 600 }}>{doc.customer?.business_name || 'Cash Customer'}</td>
                  <td className="mono font-semibold">{formatCurrency(doc.grand_total)}</td>
                  <td className="mono" style={{ color: '#34d399' }}>{formatCurrency(doc.paid_amount)}</td>
                  <td className="mono" style={{ color: doc.balance_due > 0 ? '#f87171' : 'var(--text-dim)' }}>
                    {formatCurrency(doc.balance_due)}
                  </td>
                  <td className="mono" style={{ color: doc.gross_profit_pct > 10 ? '#34d399' : '#fbbf24' }}>
                    {doc.gross_profit_pct?.toFixed(1)}%
                  </td>
                  <td>
                    <span className={`badge badge-${doc.payment_status === 'paid' ? 'success' : doc.payment_status === 'credit' ? 'warning' : 'neutral'}`}>
                      {doc.payment_status?.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => setViewDoc(doc)}
                        className="btn btn-secondary btn-icon"
                        title="View Details"
                        style={{ padding: 5 }}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => generateInvoicePDF(doc, companySettings, 'A4')}
                        className="btn btn-secondary btn-icon"
                        title="Download PDF"
                        style={{ padding: 5 }}
                      >
                        <Printer size={15} />
                      </button>
                      {doc.customer?.whatsapp && (
                        <a
                          href={generateWhatsAppInvoiceLink(doc.customer.whatsapp, doc)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary btn-icon"
                          title="WhatsApp Invoice"
                          style={{ padding: 5, color: '#34d399' }}
                        >
                          <MessageCircle size={15} />
                        </a>
                      )}
                      {doc.doc_type === 'quotation' && (
                        <button
                          onClick={() => handleConvert(doc, 'sales_order')}
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: 11, padding: '2px 6px' }}
                        >
                          To Order
                        </button>
                      )}
                      {doc.doc_type === 'sales_order' && (
                        <button
                          onClick={() => handleConvert(doc, 'sales_invoice')}
                          className="btn btn-success btn-sm"
                          style={{ fontSize: 11, padding: '2px 6px' }}
                        >
                          To Invoice
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 40 }}>
                    No sales documents found matching the filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Detail Modal */}
      {viewDoc && (
        <Modal
          isOpen={true}
          onClose={() => setViewDoc(null)}
          title={`Document Details: ${viewDoc.doc_no}`}
          size="lg"
          footer={
            <button onClick={() => generateInvoicePDF(viewDoc, companySettings, 'A4')} className="btn btn-primary">
              <Printer size={16} /> Print Document
            </button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, background: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-sm)' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>CUSTOMER</div>
                <div style={{ fontWeight: 700 }}>{viewDoc.customer?.business_name || 'Walk-in'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>DATE</div>
                <div style={{ fontWeight: 700 }}>{formatDate(viewDoc.doc_date)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>TOTAL</div>
                <div className="mono" style={{ fontWeight: 800, color: '#38bdf8' }}>{formatCurrency(viewDoc.grand_total)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>BALANCE</div>
                <div className="mono" style={{ fontWeight: 800, color: viewDoc.balance_due > 0 ? '#f87171' : '#34d399' }}>{formatCurrency(viewDoc.balance_due)}</div>
              </div>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Discount</th>
                  <th>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {(viewDoc.items || []).map((it, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{it.product?.name || it.item_code}</td>
                    <td>{it.qty} {it.unit_type}</td>
                    <td className="mono">{formatCurrency(it.unit_price)}</td>
                    <td className="mono">{it.line_discount > 0 ? formatCurrency(it.line_discount) : '-'}</td>
                    <td className="mono font-semibold">{formatCurrency(it.line_total)}</td>
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
import { Truck, Plus, DollarSign, Globe, Building2 } from 'lucide-react';
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

print("Pages part 1 written.")
""")
