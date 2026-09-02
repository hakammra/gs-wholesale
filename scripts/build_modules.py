import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print(f'Wrote {path}')

# src/lib/constants.js
write_file('src/lib/constants.js', """
export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { id: 'pos', label: 'Wholesale POS', icon: 'ShoppingCart' },
  { id: 'sales-documents', label: 'Sales Documents', icon: 'FileText' },
  { id: 'customers', label: 'Customers', icon: 'Users' },
  { id: 'suppliers', label: 'Suppliers', icon: 'Truck' },
  { id: 'supplier-orders', label: 'Supplier Orders', icon: 'ClipboardList' },
  { id: 'stock-in-transit', label: 'Stock in Transit', icon: 'Ship' },
  { id: 'purchases', label: 'Purchases / Receiving', icon: 'PackageCheck' },
  { id: 'products', label: 'Products', icon: 'Boxes' },
  { id: 'inventory', label: 'Inventory', icon: 'Layers' },
  { id: 'cheques', label: 'Cheques', icon: 'CreditCard' },
  { id: 'cashflow-bank', label: 'Cashflow & Bank', icon: 'Landmark' },
  { id: 'reporting', label: 'Reporting', icon: 'BarChart3' },
  { id: 'settings', label: 'Settings', icon: 'Settings' }
];

export const DOCUMENT_TYPES = {
  QUOTATION: 'quotation',
  SALES_ORDER: 'sales_order',
  SALES_INVOICE: 'sales_invoice',
  CREDIT_NOTE: 'credit_note',
  EXCHANGE: 'exchange'
};

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'bank', label: 'Bank Transfer' },
  { id: 'card', label: 'Card' },
  { id: 'cheque', label: 'Cheque' },
  { id: 'customer_credit', label: 'Credit / On Account' }
];

export const CHEQUE_STATUSES = {
  RECEIVED: 'received',
  HELD: 'held',
  DEPOSITED: 'deposited',
  CLEARED: 'cleared',
  RETURNED: 'returned',
  REPLACED: 'replaced',
  CANCELLED: 'cancelled'
};

export const TRANSIT_STATUSES = {
  PREPARING: 'preparing',
  IN_TRANSIT: 'in_transit',
  PARTIALLY_RECEIVED: 'partially_received',
  RECEIVED: 'received',
  CANCELLED: 'cancelled'
};

export const SUPPLIER_ORDER_STATUSES = {
  DRAFT: 'draft',
  ORDERED: 'ordered',
  PARTIALLY_SHIPPED: 'partially_shipped',
  SHIPPED: 'shipped',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

export const LANDED_COST_TYPES = [
  { id: 'freight', label: 'Sea / Air Freight' },
  { id: 'customs_duty', label: 'Customs Duty / PAL / Cess' },
  { id: 'clearing', label: 'Clearing & Handling Charges' },
  { id: 'insurance', label: 'Marine / Cargo Insurance' },
  { id: 'bank_charges', label: 'LC / TT Bank Charges' },
  { id: 'local_delivery', label: 'Port to Warehouse Transport' },
  { id: 'other', label: 'Other Import Expense' }
];

export const ALLOCATION_METHODS = [
  { id: 'value', label: 'By Item Foreign Value (Default)' },
  { id: 'quantity', label: 'By Item Quantity' },
  { id: 'weight', label: 'By Weight (kg)' },
  { id: 'volume', label: 'By Volume (CBM)' },
  { id: 'manual', label: 'Manual Line Allocation' }
];
""")

# src/lib/formatters.js
write_file('src/lib/formatters.js', """
export function formatCurrency(amount, currency = 'LKR') {
  const num = Number(amount) || 0;
  if (currency === 'LKR') {
    return 'Rs. ' + num.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (currency === 'USD') {
    return '$ ' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (currency === 'CNY') {
    return '¥ ' + num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return `${currency} ${num.toFixed(2)}`;
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
""")

# src/lib/supabaseClient.js
write_file('src/lib/supabaseClient.js', """
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-gs-wholesale.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'gs_wholesale_auth_session'
  }
});
""")

# src/lib/exportUtils.js
write_file('src/lib/exportUtils.js', """
import * as XLSX from 'xlsx';

export function exportToExcel(data, fileName = 'export') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

export function generateWhatsAppInvoiceLink(customerPhone, doc) {
  if (!customerPhone) return null;
  const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
  const lines = [
    `*GS WHOLESALE COMPUTER PRODUCTS*`,
    `Invoice: ${doc.doc_no}`,
    `Date: ${doc.doc_date}`,
    `Customer: ${doc.customer_name || 'Valued Customer'}`,
    `--------------------------------`,
    `Total: Rs. ${(doc.grand_total || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`,
    `Paid: Rs. ${(doc.paid_amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`,
    `Balance Due: Rs. ${(doc.balance_due || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`,
    doc.due_date ? `Due Date: ${doc.due_date}` : '',
    `--------------------------------`,
    `Thank you for your business!`
  ].filter(Boolean).join('%0A');

  return `https://wa.me/${cleanPhone}?text=${lines}`;
}
""")

# src/lib/pdfGenerator.js
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
  const taxNo = companySettings.tax_number || '';

  // Header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(businessName, 14, 18);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(tagline, 14, 23);
  pdf.text(`${address} | Tel: ${phone} ${taxNo ? '| Tax No: ' + taxNo : ''}`, 14, 28);

  // Document Badge
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  const docTitle = doc.doc_type ? doc.doc_type.toUpperCase().replace('_', ' ') : 'SALES INVOICE';
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
  pdf.text(`${doc.customer?.business_name || 'Cash Customer'}`, 14, 50);
  if (doc.customer?.contact_person) pdf.text(`Attn: ${doc.customer.contact_person}`, 14, 55);
  if (doc.customer?.phone) pdf.text(`Phone: ${doc.customer.phone}`, 14, 60);
  if (doc.customer?.billing_address) pdf.text(`Address: ${doc.customer.billing_address}`, 14, 65);

  // Table
  const tableData = (doc.items || []).map((item, idx) => [
    idx + 1,
    item.product?.name || item.item_code || 'Product',
    `${item.qty} ${item.unit_type || 'Unit'}`,
    formatCurrency(item.unit_price),
    item.line_discount > 0 ? formatCurrency(item.line_discount) : '-',
    formatCurrency(item.line_total)
  ]);

  autoTable(pdf, {
    startY: 72,
    head: [['#', 'Item Description', 'Qty', 'Unit Price', 'Discount', 'Line Total']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [2, 132, 199], textColor: [255, 255, 255], fontStyle: 'bold' },
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
  pdf.text(formatCurrency(doc.subtotal || doc.grand_total), rightX, finalY, { align: 'right' });

  let nextY = finalY + 5;
  if (doc.doc_discount_total > 0) {
    pdf.text(`Discount:`, rightX - 50, nextY);
    pdf.text(`- ${formatCurrency(doc.doc_discount_total)}`, rightX, nextY, { align: 'right' });
    nextY += 5;
  }

  if (doc.tax_total > 0) {
    pdf.text(`Tax:`, rightX - 50, nextY);
    pdf.text(formatCurrency(doc.tax_total), rightX, nextY, { align: 'right' });
    nextY += 5;
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(`Grand Total:`, rightX - 50, nextY + 2);
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
  pdf.text('Goods received in good condition. 1 Year Warranty against manufacturer defects where applicable.', 14, nextY + 16);
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
    headStyles: { fillColor: [2, 132, 199] },
    styles: { fontSize: 8.5 }
  });

  pdf.save(`Statement_${customer.customer_code}.pdf`);
}
""")

# src/context/NotificationContext.jsx
write_file('src/context/NotificationContext.jsx', """
import React, { createContext, useContext, useState } from 'react';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  };

  const notifySuccess = (msg) => addToast(msg, 'success');
  const notifyError = (msg) => addToast(msg, 'danger', 5000);
  const notifyWarning = (msg) => addToast(msg, 'warning');
  const notifyInfo = (msg) => addToast(msg, 'info');

  return (
    <NotificationContext.Provider value={{ addToast, notifySuccess, notifyError, notifyWarning, notifyInfo }}>
      {children}
      <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {toasts.map(t => (
          <div
            key={t.id}
            className={`card badge-${t.type}`}
            style={{
              padding: '12px 18px',
              minWidth: 260,
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              animation: 'modalIn 0.2s ease-out'
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600 }}>{t.message}</span>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export const useNotification = () => useContext(NotificationContext);
""")

# src/context/AuthContext.jsx
write_file('src/context/AuthContext.jsx', """
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_user');
    return saved ? JSON.parse(saved) : { email: 'owner@gstechnologies.lk', role: 'owner', name: 'Business Owner' };
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check supabase session if connected
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = { email: session.user.email, role: 'owner', id: session.user.id };
        setUser(u);
        localStorage.setItem('gs_wholesale_user', JSON.stringify(u));
      }
    }).catch(() => {});

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = { email: session.user.email, role: 'owner', id: session.user.id };
        setUser(u);
        localStorage.setItem('gs_wholesale_user', JSON.stringify(u));
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Fallback for standalone/local offline owner login
        if (email && password.length >= 6) {
          const mockUser = { email, role: 'owner', name: 'Wholesale Owner' };
          setUser(mockUser);
          localStorage.setItem('gs_wholesale_user', JSON.stringify(mockUser));
          setLoading(false);
          return { success: true };
        }
        setLoading(false);
        return { success: false, error: error.message };
      }
      if (data?.user) {
        const u = { email: data.user.email, role: 'owner', id: data.user.id };
        setUser(u);
        localStorage.setItem('gs_wholesale_user', JSON.stringify(u));
      }
      setLoading(false);
      return { success: true };
    } catch (err) {
      // Local fallback
      const mockUser = { email, role: 'owner', name: 'Wholesale Owner' };
      setUser(mockUser);
      localStorage.setItem('gs_wholesale_user', JSON.stringify(mockUser));
      setLoading(false);
      return { success: true };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    localStorage.removeItem('gs_wholesale_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
""")

print("Modules part 1 written.")
