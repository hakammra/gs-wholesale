import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print(f'Wrote {path}')

# 1. src/components/layout/Header.jsx
write_file('src/components/layout/Header.jsx', """
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBusiness } from '../../context/BusinessContext';

const TAB_INFO = {
  'pos': { title: 'Wholesale POS & Fast Invoicing', desc: 'Direct wholesale billing, tiered pricing & multi-tender settlement' },
  'dashboard': { title: 'Wholesale Executive Dashboard', desc: 'Real-time sales, imports in transit, receivables & liquidity' },
  'supplier-orders': { title: 'Import Purchase Orders', desc: 'Factory purchase orders & supplier dispatch tracking' },
  'stock-in-transit': { title: 'Stock in Transit & Landed Costs', desc: 'Sea / Air shipments, Bill of Lading & customs cost allocation' },
  'purchases': { title: 'Goods Received Notes (GRN)', desc: 'Arrival inspection, sellable stock entry & weighted average cost' },
  'suppliers': { title: 'Suppliers & Advances', desc: 'Supplier ledgers, lead times & advance deposit management' },
  'sales-documents': { title: 'Sales Documents & Invoices', desc: 'Sales invoices, orders, quotations & customer returns' },
  'customers': { title: 'Wholesale Customers & Credit Terms', desc: 'Customer price tiers, credit limits & aging statements' },
  'products': { title: 'Products & Wholesale Tiers', desc: 'Multi-tiered pricing, packs, cartons & quantity breaks' },
  'inventory': { title: 'Stock Ledger & Valuation', desc: 'On-hand, reserved, available and transit inventory balances' },
  'cheques': { title: 'Cheque Register & Drawer', desc: 'Cheque collection, bank deposit, clearance & return handling' },
  'cashflow-bank': { title: 'Cash & Bank Accounts', desc: 'Liquid working capital & payment ledger' },
  'reporting': { title: 'Reports & Profit Analysis', desc: 'Gross margin by product, customer aging & P&L statements' },
  'settings': { title: 'Company Profile & Settings', desc: 'Business profile, minimum profit protection & rules' }
};

export default function Header({ currentTab }) {
  const { user, logout } = useAuth();
  const { refreshData, dataLoading } = useBusiness();

  const info = TAB_INFO[currentTab] || { title: 'GS Wholesale POS', desc: 'Wholesale Computer Products Management' };

  return (
    <header className="topbar">
      <div>
        <h2>{info.title}</h2>
        <p>{info.desc}</p>
      </div>

      <div className="topbar-right">
        <div className="topbar-ticker" style={{ background: '#252525', border: '1px solid var(--line)', padding: '5px 12px', borderRadius: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>LKR (Rs.)</span>
        </div>

        <button
          onClick={refreshData}
          disabled={dataLoading}
          className="secondary-button small-button"
          title="Fetch latest updates from Supabase"
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <span>🔄</span>
          <span>{dataLoading ? 'Syncing...' : 'Sync Supabase'}</span>
        </button>

        <button onClick={logout} className="secondary-button small-button" style={{ fontWeight: 700 }}>
          Logout ({user?.email?.split('@')[0] || 'Owner'})
        </button>
      </div>
    </header>
  );
}
""")

# 2. src/pages/POS/WholesalePOS.jsx
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

const DEFAULT_BILL = { id: 1, label: 'Bill 1', items: [], customer: null, docType: 'sales_invoice', discount: 0 };

export default function WholesalePOS() {
  const { postSalesDocument, saveCustomer, companySettings } = useBusiness();
  const { notifySuccess, notifyError, notifyWarning } = useNotification();

  // Multi-tab Bills state persisted in localStorage
  const [tabs, setTabs] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_pos_tabs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [DEFAULT_BILL];
  });

  const [activeTabId, setActiveTabId] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_pos_active_tab_id');
    return saved ? Number(saved) : 1;
  });

  // Persist bills whenever tabs change
  useEffect(() => {
    localStorage.setItem('gs_wholesale_pos_tabs', JSON.stringify(tabs));
  }, [tabs]);

  useEffect(() => {
    localStorage.setItem('gs_wholesale_pos_active_tab_id', String(activeTabId));
  }, [activeTabId]);

  const currentTab = tabs.find(t => t.id === activeTabId) || tabs[0] || DEFAULT_BILL;

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
    const newTab = { id: nextId, label: `Bill ${nextId}`, items: [], customer: null, docType: 'sales_invoice', discount: 0 };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(nextId);
  };

  const handleCloseTab = (id) => {
    if (tabs.length <= 1) {
      // If only 1 bill left, clear it instead of deleting
      setTabs([DEFAULT_BILL]);
      setActiveTabId(1);
      return;
    }
    const remaining = tabs.filter(t => t.id !== id);
    setTabs(remaining);
    if (activeTabId === id) {
      setActiveTabId(remaining[0]?.id || 1);
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
    const minMarginPct = companySettings?.min_profit_pct || 5.0;

    currentTab.items.forEach(it => {
      const cost = it.unit_cost_snapshot || it.product.weighted_cost_lkr || 0;
      if (cost > 0 && it.unit_price > 0) {
        const marginPct = ((it.unit_price - cost) / it.unit_price) * 100;
        if (marginPct < minMarginPct) {
          lowMarginItems.push({
            ...it,
            marginPct: marginPct.toFixed(1),
            minAllowedPrice: (cost / (1 - (minMarginPct / 100))).toFixed(2)
          });
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

  const handleCompleteSale = async (paymentData) => {
    try {
      const docPayload = {
        doc_type: currentTab.docType,
        customer_id: currentTab.customer?.id || null,
        customer_name: currentTab.customer?.business_name || 'Counter Sale / Cash',
        customer_phone: currentTab.customer?.phone || null,
        items: currentTab.items,
        discount_amount: currentTab.discount,
        payment_lines: paymentData.payment_lines,
        cheque_details: paymentData.cheque_details,
        notes: paymentData.notes
      };

      const postedDoc = await postSalesDocument(docPayload);
      notifySuccess(`Invoice ${postedDoc.doc_no} posted successfully!`);

      // Reset the current bill tab cleanly
      handleUpdateCurrentTab(tab => ({
        ...tab,
        items: [],
        customer: null,
        discount: 0
      }));

      setIsPaymentOpen(false);
    } catch (err) {
      notifyError('Failed to post sales document: ' + err.message);
    }
  };

  const handleCreateCustomerSubmit = (e) => {
    e.preventDefault();
    saveCustomer(newCustomerForm);
    setIsAddCustomerOpen(false);
    setNewCustomerForm({ business_name: '', contact_person: '', phone: '', price_tier: 'Dealer', credit_limit: 500000, credit_days: 30 });
  };

  return (
    <div className="pos-workspace">
      {/* Top Multi-Bill Tabs */}
      <div className="bill-tabs-bar">
        {tabs.map(t => (
          <div
            key={t.id}
            onClick={() => setActiveTabId(t.id)}
            className={`bill-tab ${t.id === activeTabId ? 'active' : ''}`}
          >
            <span>{t.label} ({t.items.length})</span>
            {tabs.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseTab(t.id);
                }}
                className="bill-tab-close"
              >
                &times;
              </button>
            )}
          </div>
        ))}
        <button onClick={handleAddTab} className="bill-tab add-btn">
          + New Bill
        </button>
      </div>

      {/* POS Top Customer Header */}
      <CustomerHeader
        selectedCustomer={currentTab.customer}
        onSelectCustomer={(cust) => handleUpdateCurrentTab(t => ({ ...t, customer: cust }))}
        onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
        docType={currentTab.docType}
        onChangeDocType={(dt) => handleUpdateCurrentTab(t => ({ ...t, docType: dt }))}
      />

      {/* Main Split Body: Left 390px Search Grid | Right Dynamic Cart */}
      <div className="pos-main-split">
        {/* Left: Product Search Grid */}
        <div className="pos-left-pane">
          <ProductSearchGrid
            customer={currentTab.customer}
            onAddToCart={handleAddToCart}
          />
        </div>

        {/* Right: Cart & Settlement */}
        <div className="pos-right-pane">
          <PosCart
            items={currentTab.items}
            customer={currentTab.customer}
            discount={currentTab.discount}
            totals={totals}
            onUpdateQty={(idx, newQty) => handleUpdateCurrentTab(tab => {
              const updated = [...tab.items];
              if (newQty <= 0) {
                updated.splice(idx, 1);
              } else {
                updated[idx].qty = newQty;
              }
              return { ...tab, items: updated };
            })}
            onUpdateUnitType={(idx, unitType) => handleUpdateCurrentTab(tab => {
              const updated = [...tab.items];
              updated[idx].unit_type = unitType;
              return { ...tab, items: updated };
            })}
            onUpdateUnitPrice={(idx, newPrice) => handleUpdateCurrentTab(tab => {
              const updated = [...tab.items];
              updated[idx].unit_price = Number(newPrice) || 0;
              return { ...tab, items: updated };
            })}
            onRemoveItem={(idx) => handleUpdateCurrentTab(tab => {
              const updated = [...tab.items];
              updated.splice(idx, 1);
              return { ...tab, items: updated };
            })}
            onChangeDiscount={(d) => handleUpdateCurrentTab(tab => ({ ...tab, discount: Number(d) || 0 }))}
            onClearCart={() => handleUpdateCurrentTab(tab => ({ ...tab, items: [], discount: 0 }))}
            onCheckout={handleTriggerCheckout}
          />
        </div>
      </div>

      {/* Payment & Multi-Tender Modal */}
      {isPaymentOpen && (
        <PaymentModal
          totals={totals}
          customer={currentTab.customer}
          onClose={() => setIsPaymentOpen(false)}
          onConfirmPayment={handleCompleteSale}
        />
      )}

      {/* Minimum Margin Override Protection Modal */}
      {isMarginOverrideOpen && (
        <MarginOverrideModal
          lowMarginItems={pendingLowMarginItems}
          minProfitPct={companySettings?.min_profit_pct || 5.0}
          onClose={() => setIsMarginOverrideOpen(false)}
          onProceedAnyway={() => {
            setIsMarginOverrideOpen(false);
            setIsPaymentOpen(true);
          }}
        />
      )}

      {/* Quick Add Customer Modal */}
      {isAddCustomerOpen && (
        <div className="modal-overlay">
          <div className="modal-box modal-md">
            <div className="modal-header">
              <h3>Quick Add Wholesale Customer</h3>
              <button onClick={() => setIsAddCustomerOpen(false)} className="modal-close">&times;</button>
            </div>
            <form onSubmit={handleCreateCustomerSubmit}>
              <div className="modal-body">
                <div style={{ marginBottom: 12 }}>
                  <label>Business / Shop Name *</label>
                  <input
                    type="text"
                    required
                    value={newCustomerForm.business_name}
                    onChange={(e) => setNewCustomerForm(prev => ({ ...prev, business_name: e.target.value }))}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label>Contact Person</label>
                    <input
                      type="text"
                      value={newCustomerForm.contact_person}
                      onChange={(e) => setNewCustomerForm(prev => ({ ...prev, contact_person: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>Phone / WhatsApp *</label>
                    <input
                      type="text"
                      required
                      value={newCustomerForm.phone}
                      onChange={(e) => setNewCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                  <div>
                    <label>Assigned Price Tier</label>
                    <select
                      value={newCustomerForm.price_tier}
                      onChange={(e) => setNewCustomerForm(prev => ({ ...prev, price_tier: e.target.value }))}
                    >
                      <option value="Standard">Standard Wholesale</option>
                      <option value="Tier1">Tier 1 Volume (3% Off)</option>
                      <option value="VIP">VIP Direct (8% Off)</option>
                      <option value="Dealer">Authorized Dealer Price</option>
                    </select>
                  </div>
                  <div>
                    <label>Credit Limit (Rs)</label>
                    <input
                      type="number"
                      className="mono"
                      value={newCustomerForm.credit_limit}
                      onChange={(e) => setNewCustomerForm(prev => ({ ...prev, credit_limit: Number(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsAddCustomerOpen(false)} className="secondary-button">
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Create Customer
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

# 3. src/pages/Settings/CompanySettings.jsx
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
    </div>
  );
}
""")

print("Header, POS bill tabs persistence, and LKR currency locked successfully.")
