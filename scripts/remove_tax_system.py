import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print(f'Wrote {path}')

# 1. src/components/pos/CustomerHeader.jsx
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
        {/* Document Type Selector (Wholesale Invoice / Order / Quotation) */}
        <div>
          <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>DOCUMENT TYPE</label>
          <select
            value={docType}
            onChange={(e) => onChangeDocType?.(e.target.value)}
            style={{ fontWeight: 700, minWidth: 150, color: 'var(--primary)' }}
          >
            <option value="sales_invoice">Wholesale Invoice</option>
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

# 2. src/pages/Settings/CompanySettings.jsx
write_file('src/pages/Settings/CompanySettings.jsx', """
import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export default function CompanySettings() {
  const { companySettings, setCompanySettings } = useBusiness();
  const { user, trustedDevice, setupDevicePin, removeDevicePin } = useAuth();
  const { notifySuccess, notifyError, notifyWarning } = useNotification();

  const [form, setForm] = useState(companySettings);

  // PIN settings state
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isEditingPin, setIsEditingPin] = useState(false);

  const hasPinSet = Boolean(trustedDevice?.isTrusted && trustedDevice?.pinHash);

  const handleSaveCompany = (e) => {
    e.preventDefault();
    setCompanySettings(form);
    notifySuccess('Company settings updated');
  };

  const handleSavePin = (e) => {
    e.preventDefault();
    if (!pin || pin.length !== 4 || !/^[0-9]{4}$/.test(pin)) {
      notifyWarning('PIN must be exactly 4 numeric digits (0-9)');
      return;
    }
    if (pin !== confirmPin) {
      notifyError('PIN and Confirmation PIN do not match');
      return;
    }

    const res = setupDevicePin(pin);
    if (res.success) {
      notifySuccess('4-Digit Quick PIN saved for this trusted device!');
      setPin('');
      setConfirmPin('');
      setIsEditingPin(false);
    } else {
      notifyError(res.error || 'Failed to set PIN');
    }
  };

  const handleRemovePin = () => {
    removeDevicePin();
    notifySuccess('Quick PIN removed for this device');
    setIsEditingPin(false);
  };

  return (
    <div className="page-section" style={{ padding: 18, maxWidth: 900 }}>
      {/* Trusted Device Quick PIN Card */}
      <div className="panel-card" style={{ marginBottom: 20, borderLeft: '4px solid var(--primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16 }}>🔐 Trusted Device & 4-Digit Quick PIN Access</h3>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 12.5 }}>
              Enable instant 4-digit PIN unlock for this authorized device without re-entering email & password every time.
            </p>
          </div>
          <span className={`badge badge-${hasPinSet ? 'success' : 'neutral'}`}>
            {hasPinSet ? 'PIN ACTIVE' : 'NO PIN SET'}
          </span>
        </div>

        <div style={{ background: '#242424', padding: 14, border: '1px solid var(--line)', marginBottom: 14, borderRadius: 4 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <small style={{ color: 'var(--muted)' }}>Device Status</small>
              <div style={{ fontWeight: 700, color: '#52e37e' }}>✓ Trusted POS Terminal</div>
            </div>
            <div>
              <small style={{ color: 'var(--muted)' }}>Authenticated Owner</small>
              <div style={{ fontWeight: 700 }}>{user?.email || trustedDevice?.email || 'Owner'}</div>
            </div>
            <div>
              <small style={{ color: 'var(--muted)' }}>Quick Access Method</small>
              <div style={{ fontWeight: 700, color: hasPinSet ? 'var(--primary)' : 'var(--muted)' }}>
                {hasPinSet ? '4-Digit PIN Enabled' : 'Password Only'}
              </div>
            </div>
          </div>
        </div>

        {hasPinSet && !isEditingPin ? (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setIsEditingPin(true)}
              className="primary-button small-button"
            >
              Change 4-Digit PIN
            </button>
            <button
              onClick={handleRemovePin}
              className="secondary-button small-button"
              style={{ color: '#ff8e8e' }}
            >
              Disable Quick PIN
            </button>
          </div>
        ) : (
          <form onSubmit={handleSavePin}>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 140px 1fr', gap: 12, alignItems: 'flex-end' }}>
              <div>
                <label>4-Digit PIN *</label>
                <input
                  type="password"
                  maxLength="4"
                  required
                  placeholder="••••"
                  className="mono"
                  style={{ fontSize: 18, letterSpacing: 4, textAlign: 'center' }}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                />
              </div>
              <div>
                <label>Confirm PIN *</label>
                <input
                  type="password"
                  maxLength="4"
                  required
                  placeholder="••••"
                  className="mono"
                  style={{ fontSize: 18, letterSpacing: 4, textAlign: 'center' }}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="primary-button" style={{ height: 38 }}>
                  Save Quick PIN
                </button>
                {isEditingPin && (
                  <button type="button" onClick={() => setIsEditingPin(false)} className="secondary-button" style={{ height: 38 }}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Company Profile & Invoicing Details */}
      <div className="panel-card" style={{ marginBottom: 20 }}>
        <h3>Company Profile & Invoicing Details</h3>
        <form onSubmit={handleSaveCompany}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label>Business Name *</label>
              <input
                type="text"
                required
                value={form.business_name || ''}
                onChange={(e) => setForm(prev => ({ ...prev, business_name: e.target.value }))}
              />
            </div>
            <div>
              <label>Tagline</label>
              <input
                type="text"
                value={form.tagline || ''}
                onChange={(e) => setForm(prev => ({ ...prev, tagline: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <label>Phone / Landline</label>
              <input
                type="text"
                value={form.phone || ''}
                onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <label>WhatsApp / Mobile</label>
              <input
                type="text"
                value={form.whatsapp || ''}
                onChange={(e) => setForm(prev => ({ ...prev, whatsapp: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label>Address</label>
            <textarea
              value={form.address || ''}
              onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <label>Operating Currency</label>
              <input
                type="text"
                disabled
                className="mono font-semibold"
                value="LKR (Sri Lankan Rupee - Rs.)"
              />
            </div>
            <div>
              <label>Minimum Profit Protection Margin (%)</label>
              <input
                type="number"
                step="0.1"
                className="mono"
                value={form.min_profit_pct || 5.0}
                onChange={(e) => setForm(prev => ({ ...prev, min_profit_pct: Number(e.target.value) || 5 }))}
              />
            </div>
            <div>
              <label>Default Invoice Paper Size</label>
              <select
                value={form.default_invoice_paper_size || 'A4'}
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
    </div>
  );
}
""")

# 3. src/lib/pdfGenerator.js
write_file('src/lib/pdfGenerator.js', """
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate } from './formatters';

export function generateInvoicePDF(doc, companySettings = {}, paperSize = 'A4') {
  const docConfig = paperSize === 'A5' ? { orientation: 'landscape', format: 'a5' } : { orientation: 'portrait', format: 'a4' };
  const pdf = new jsPDF(docConfig);

  const businessName = companySettings.business_name || 'GS WHOLESALE COMPUTER PRODUCTS';
  const tagline = companySettings.tagline || 'Direct Importers & Wholesale Distribution';
  const phone = companySettings.phone || '+94 77 123 4567';
  const address = companySettings.address || 'Colombo, Sri Lanka';

  // Header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(businessName, 14, 18);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(tagline, 14, 23);
  pdf.text(`${address} | Tel: ${phone}`, 14, 28);

  // Document Badge
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  const docTitle = doc.doc_type === 'sales_invoice' ? 'WHOLESALE INVOICE' : doc.doc_type === 'sales_order' ? 'WHOLESALE ORDER' : 'PRICE QUOTATION';
  pdf.text(docTitle, pdf.internal.pageSize.getWidth() - 14, 18, { align: 'right' });

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Doc No: ${doc.doc_no || '-'}`, pdf.internal.pageSize.getWidth() - 14, 24, { align: 'right' });
  pdf.text(`Date: ${formatDate(doc.doc_date)}`, pdf.internal.pageSize.getWidth() - 14, 29, { align: 'right' });
  if (doc.due_date) {
    pdf.text(`Due Date: ${formatDate(doc.due_date)}`, pdf.internal.pageSize.getWidth() - 14, 34, { align: 'right' });
  }

  // Divider
  pdf.setLineWidth(0.5);
  pdf.setDrawColor(200, 200, 200);
  pdf.line(14, 38, pdf.internal.pageSize.getWidth() - 14, 38);

  // Customer Block
  pdf.setFont('helvetica', 'bold');
  pdf.text('BILL TO / CUSTOMER:', 14, 45);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${doc.customer?.business_name || doc.customer_name || 'Cash Customer'}`, 14, 50);
  if (doc.customer?.contact_person) pdf.text(`Attn: ${doc.customer.contact_person}`, 14, 55);
  if (doc.customer?.phone || doc.customer_phone) pdf.text(`Phone: ${doc.customer?.phone || doc.customer_phone}`, 14, 60);
  if (doc.customer?.billing_address) pdf.text(`Address: ${doc.customer.billing_address}`, 14, 65);

  // Table
  const tableData = (doc.items || []).map((item, idx) => [
    idx + 1,
    item.product?.name || item.item_code || 'Product',
    `${item.qty} ${item.unit_type || 'Unit'}`,
    formatCurrency(item.unit_price),
    item.discount_amount > 0 ? formatCurrency(item.discount_amount) : '-',
    formatCurrency((item.qty * item.unit_price) - (item.discount_amount || 0))
  ]);

  autoTable(pdf, {
    startY: 72,
    head: [['#', 'Item Description', 'Qty', 'Unit Price', 'Discount', 'Line Total']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [40, 169, 230], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 34, halign: 'right' }
    }
  });

  const finalY = pdf.lastAutoTable.finalY + 8;

  // Summary Totals
  const rightX = pdf.internal.pageSize.getWidth() - 14;
  pdf.setFontSize(9);
  pdf.text(`Subtotal:`, rightX - 50, finalY);
  pdf.text(formatCurrency(doc.items_subtotal || doc.grand_total), rightX, finalY, { align: 'right' });

  let nextY = finalY + 5;
  if (doc.discount_amount > 0) {
    pdf.text(`Discount:`, rightX - 50, nextY);
    pdf.text(`- ${formatCurrency(doc.discount_amount)}`, rightX, nextY, { align: 'right' });
    nextY += 5;
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(`Grand Total (LKR):`, rightX - 55, nextY + 2);
  pdf.text(formatCurrency(doc.grand_total), rightX, nextY + 2, { align: 'right' });

  nextY += 8;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Amount Paid:`, rightX - 50, nextY);
  pdf.text(formatCurrency(doc.paid_amount || 0), rightX, nextY, { align: 'right' });

  nextY += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Balance Due:`, rightX - 50, nextY);
  pdf.text(formatCurrency(doc.balance_due || 0), rightX, nextY, { align: 'right' });

  // Footer notes & signature
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8);
  pdf.text('Goods received in good condition. Warranty against manufacturer defects where applicable.', 14, nextY + 16);
  pdf.text('Authorized Signature: _______________________', rightX - 70, nextY + 16);

  pdf.save(`${doc.doc_no || 'Document'}.pdf`);
}

export function generateStatementPDF(customer, invoices, payments, companySettings = {}) {
  const pdf = new jsPDF({ orientation: 'portrait', format: 'a4' });
  const businessName = companySettings.business_name || 'GS WHOLESALE COMPUTER PRODUCTS';

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(businessName, 14, 18);
  pdf.setFontSize(10);
  pdf.text('CUSTOMER STATEMENT OF ACCOUNT', pdf.internal.pageSize.getWidth() - 14, 18, { align: 'right' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Customer: ${customer.business_name} (${customer.customer_code})`, 14, 28);
  pdf.text(`Credit Limit: ${formatCurrency(customer.credit_limit)} | Credit Days: ${customer.credit_days} Days`, 14, 33);
  pdf.text(`Outstanding Balance: ${formatCurrency(customer.current_receivable)}`, 14, 38);

  const tableData = (invoices || []).map(inv => [
    formatDate(inv.doc_date),
    inv.doc_no,
    inv.due_date ? formatDate(inv.due_date) : '-',
    formatCurrency(inv.grand_total),
    formatCurrency(inv.paid_amount),
    formatCurrency(inv.balance_due),
    inv.status?.toUpperCase()
  ]);

  autoTable(pdf, {
    startY: 45,
    head: [['Date', 'Invoice #', 'Due Date', 'Total', 'Paid', 'Balance', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [40, 169, 230] },
    styles: { fontSize: 8.5 }
  });

  pdf.save(`Statement_${customer.customer_code}.pdf`);
}
""")

# 4. src/lib/formatters.js
write_file('src/lib/formatters.js', """
export function formatCurrency(amount, currency = 'LKR') {
  const num = Number(amount) || 0;
  return 'Rs. ' + num.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatNumber(num, decimals = 2) {
  const n = Number(num) || 0;
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function calculateMargin(cost, price) {
  const c = Number(cost) || 0;
  const p = Number(price) || 0;
  if (p <= 0) return 0;
  return Number((((p - c) / p) * 100).toFixed(2));
}

export function calculateBestWholesalePrice(product, customer, qty = 1, unitType = 'unit') {
  if (!product) return 0;
  const baseQty = unitType === 'carton' ? qty * (product.carton_units || 1) : unitType === 'pack' ? qty * (product.pack_size || 1) : qty;
  
  // 1. Check custom customer price
  if (customer && customer.custom_prices && customer.custom_prices[product.id]) {
    const custom = customer.custom_prices[product.id];
    return unitType === 'carton' ? custom * (product.carton_units || 1) : unitType === 'pack' ? custom * (product.pack_size || 1) : custom;
  }

  // 2. Check quantity breaks
  if (product.quantity_breaks && product.quantity_breaks.length > 0) {
    const matchedBreak = product.quantity_breaks.find(qb => baseQty >= qb.min_qty && (!qb.max_qty || baseQty <= qb.max_qty));
    if (matchedBreak) {
      return matchedBreak.unit_price * (unitType === 'carton' ? (product.carton_units || 1) : unitType === 'pack' ? (product.pack_size || 1) : 1);
    }
  }

  // 3. Check customer price tier
  let unitPrice = product.wholesale_price || 0;
  if (customer && customer.price_tier === 'Dealer' && product.dealer_price > 0) {
    unitPrice = product.dealer_price;
  } else if (customer && customer.price_tier === 'Tier1') {
    unitPrice = unitPrice * 0.97; // 3% tier discount
  } else if (customer && customer.price_tier === 'VIP') {
    unitPrice = unitPrice * 0.92; // 8% tier discount
  }

  return unitType === 'carton' ? unitPrice * (product.carton_units || 1) : unitType === 'pack' ? unitPrice * (product.pack_size || 1) : unitPrice;
}

export function calculateWholesaleItemPrice(product, qty = 1, customer = null, quantityBreaks = []) {
  return calculateBestWholesalePrice(product, customer, qty, 'unit');
}

export function calculateDocumentTotals(items = [], discountAmount = 0) {
  let subtotal = 0;
  let totalCost = 0;

  items.forEach(it => {
    const qty = Number(it.qty) || 0;
    const price = Number(it.unit_price) || 0;
    const lineDisc = Number(it.discount_amount) || 0;
    const cost = Number(it.unit_cost_snapshot || it.product?.weighted_cost_lkr) || 0;

    subtotal += (qty * price) - lineDisc;
    totalCost += qty * cost;
  });

  const grandTotal = Math.max(0, subtotal - Number(discountAmount || 0));
  const grossProfit = grandTotal - totalCost;
  const marginPct = grandTotal > 0 ? (grossProfit / grandTotal) * 100 : 0;

  return {
    items_subtotal: subtotal,
    subtotal,
    discount_amount: Number(discountAmount) || 0,
    grand_total: grandTotal,
    totalCost,
    grossProfit,
    marginPct
  };
}
""")

print("Tax references removed across POS, settings, PDFs, and formatters.")
