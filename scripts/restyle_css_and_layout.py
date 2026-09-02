import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print(f'Wrote {path}')

# src/index.css
write_file('src/index.css', """
:root {
  --bg: #1f1f1f;
  --panel: #2b2b2b;
  --panel-2: #333333;
  --panel-3: #242424;
  --text: #ffffff;
  --muted: #a8a8a8;
  --line: #555555;
  --line-soft: #3d3d3d;
  --primary: #28a9e6;
  --primary-dark: #1688bf;
  --danger: #ef4444;
  --warning: #f59e0b;
  --success: #22c55e;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: Arial, Helvetica, sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}

.mono {
  font-family: 'JetBrains Mono', Consolas, monospace;
}

button, input, select, textarea { font: inherit; }
button { cursor: pointer; }
input, select, textarea {
  width: 100%;
  border: 1px solid var(--line);
  background: var(--panel-2);
  color: var(--text);
  padding: 9px 10px;
  outline: none;
}
textarea { min-height: 80px; resize: vertical; }
input:focus, select:focus, textarea:focus { border-color: var(--primary); }
label { display: block; color: var(--text); font-weight: 600; font-size: 13.5px; }
label input, label select, label textarea { margin-top: 6px; }

.app-shell {
  display: grid;
  grid-template-columns: 318px 1fr;
  min-height: 100vh;
}

.sidebar {
  background: #242424;
  border-right: 1px solid #595959;
  color: #fff;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  border-bottom: 1px solid #444;
}

.brand-logo {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: 2px;
  border: 1px solid rgba(118, 225, 244, .45);
  background: #000;
  color: var(--primary);
  font-weight: 900;
  font-size: 18px;
  letter-spacing: 1px;
}

.brand-block h1 { margin: 0; font-size: 19px; font-weight: 800; color: #fff; letter-spacing: 0.5px; }
.brand-block p { margin: 3px 0 0; color: #cfcfcf; font-size: 12px; }

.nav-group-title {
  padding: 14px 24px 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--muted);
  letter-spacing: 1px;
}

.nav-list { padding-top: 4px; flex: 1; overflow-y: auto; }
.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #ffffff;
  text-align: left;
  padding: 12px 24px;
  font-size: 17px;
  font-weight: 500;
  transition: background 0.1s ease;
}
.nav-item:hover { background: #303030; }
.nav-item.active { background: var(--primary); color: #fff; font-weight: 700; }
.nav-icon {
  display: inline-grid;
  place-items: center;
  width: 26px;
  flex: 0 0 26px;
  font-size: 20px;
  font-weight: 700;
}
.nav-badge {
  margin-left: auto;
  background: #ef4444;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 10px;
}

.main-panel { min-width: 0; background: var(--bg); display: flex; flex-direction: column; }
.topbar {
  height: 70px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  background: #2d2d2d;
  border-top: 5px solid var(--primary);
  border-bottom: 1px solid var(--line);
  padding: 12px 20px;
  flex-shrink: 0;
}
.topbar h2 { margin: 0; font-size: 24px; font-weight: 700; }
.topbar p { margin: 2px 0 0; color: var(--muted); font-size: 13px; }
.topbar-right { display: flex; align-items: center; gap: 14px; }
.topbar-ticker {
  display: flex;
  gap: 10px;
  background: #1f1f1f;
  border: 1px solid var(--line);
  padding: 6px 12px;
  font-size: 13px;
}

.page-section { padding: 18px; flex: 1; overflow-y: auto; }
.documents-screen { padding: 0; }

.panel-card, .auth-card, .stat-card, .split-panel {
  background: var(--panel);
  border: 1px solid var(--line);
}
.panel-card { padding: 16px; }
.panel-card h3, .split-panel h3 { margin: 0 0 10px; font-size: 17px; }
.panel-card p { color: var(--muted); }

.primary-button, .secondary-button, .danger-button, .success-button, .small-button, .toolbar-button, .tab {
  border: 1px solid var(--line);
  background: var(--panel-2);
  color: var(--text);
  padding: 9px 14px;
  cursor: pointer;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13.5px;
}
.primary-button {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
  font-weight: 700;
}
.primary-button:hover { background: var(--primary-dark); }
.secondary-button:hover, .small-button:hover, .toolbar-button:hover, .tab:hover { border-color: var(--primary); }
.success-button {
  background: #1e7e45;
  border-color: #28a745;
  color: #fff;
}
.success-button:hover { background: #218838; }
.danger-button {
  background: #9f3434;
  border-color: #c34b4b;
  color: #fff;
  font-weight: 700;
}
.danger-button:hover { background: #b43d3d; border-color: #dc6262; }
.primary-button:disabled, .secondary-button:disabled, .danger-button:disabled, .success-button:disabled {
  opacity: .55;
  cursor: not-allowed;
}
.small-button { padding: 5px 9px; font-size: 12px; }
.small-button.danger { color: #ffd5d5; border-color: #884545; background: #5a2525; }
.full-width { width: 100%; margin-top: 14px; }
.button-row { display: flex; gap: 8px; flex-wrap: wrap; }
.button-row.right { justify-content: flex-end; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}
.stat-card { padding: 16px; }
.stat-card p { color: var(--muted); margin: 0 0 8px; font-size: 13px; text-transform: uppercase; font-weight: 700; }
.stat-card strong { font-size: 24px; font-family: 'JetBrains Mono', monospace; font-weight: 700; }

/* POS Specific Styling */
.pos-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.bill-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tab {
  padding: 8px 16px;
  background: #2b2b2b;
  color: #fff;
  border: 1px solid var(--line);
}
.tab.active { background: var(--primary); border-color: var(--primary); font-weight: 700; }
.add-tab { border-style: dashed; }

.pos-grid {
  display: grid;
  grid-template-columns: 390px 1fr;
  gap: 14px;
  align-items: start;
}
.product-search-panel {
  background: var(--panel);
  border: 1px solid var(--line);
  padding: 14px;
}
.product-search-panel h3 { margin: 0 0 10px; font-size: 16px; }
.category-filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}
.cat-chip {
  padding: 4px 8px;
  font-size: 11.5px;
  background: #242424;
  border: 1px solid var(--line-soft);
  color: var(--muted);
  cursor: pointer;
}
.cat-chip.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
  font-weight: 700;
}
.search-results {
  margin-top: 12px;
  display: grid;
  gap: 8px;
  max-height: calc(100vh - 270px);
  overflow-y: auto;
}
.product-result {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  text-align: left;
  border: 1px solid var(--line-soft);
  background: #242424;
  color: var(--text);
  padding: 10px;
  cursor: pointer;
}
.product-result:hover { border-color: var(--primary); background: #2c2c2c; }
.product-result small { display: block; color: var(--muted); margin-top: 3px; font-size: 11.5px; }
.product-price { text-align: right; white-space: nowrap; }

.pos-customer-banner {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
  background: #242424;
  border: 1px solid var(--line);
  padding: 10px 14px;
  margin-bottom: 12px;
}

.bill-table-wrap {
  max-height: calc(100vh - 360px);
  overflow-y: auto;
  background: var(--panel);
  border: 1px solid var(--line);
}
.checkout-box {
  background: var(--panel);
  border: 1px solid var(--line);
  padding: 14px 18px;
  margin-top: 12px;
}
.discount-row { display: grid; grid-template-columns: 1fr 140px; gap: 8px; margin-bottom: 10px; }
.summary-line {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid var(--line-soft);
  font-size: 14px;
}
.summary-line.strong { font-weight: 800; font-size: 22px; color: var(--primary); border-bottom: 0; padding-top: 10px; }

/* Documents Action Toolbar & Split Panels */
.action-toolbar {
  display: flex;
  gap: 20px;
  align-items: stretch;
  padding: 16px 20px;
  background: #2d2d2d;
  border-bottom: 1px solid var(--line);
  overflow-x: auto;
}
.toolbar-button {
  min-width: 75px;
  border: 0;
  background: transparent;
  color: #b8b8b8;
  display: grid;
  gap: 4px;
  place-items: center;
  font-size: 13px;
  padding: 6px 10px;
}
.toolbar-button span.icon { color: #e5e5e5; font-size: 24px; line-height: 1; }
.toolbar-button:hover, .toolbar-button.bright { color: white; background: #383838; }

.document-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)) auto;
  gap: 10px 14px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--line);
  background: #252525;
  align-items: end;
}

.split-panel { border-left: 0; border-right: 0; border-top: 0; }
.split-panel h3 {
  font-size: 18px;
  font-weight: 600;
  padding: 10px 16px;
  background: #242424;
  margin: 0;
  border-bottom: 1px solid var(--line);
}
.split-divider {
  text-align: center;
  color: var(--muted);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  background: #2d2d2d;
  padding: 4px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}
.large-table { min-height: 240px; max-height: 300px; overflow: auto; }
.item-table { min-height: 200px; max-height: 250px; overflow: auto; }

/* Tables */
table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
th, td {
  text-align: left;
  padding: 9px 12px;
  border-bottom: 1px solid var(--line-soft);
  white-space: nowrap;
}
th {
  background: #2a2a2a;
  color: white;
  font-weight: 600;
  border-bottom: 2px solid var(--primary);
}
tr:hover td { background: #303030; }
.selected-row td { background: #13384d !important; }

/* Badges */
.badge {
  display: inline-block;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 2px;
  text-transform: uppercase;
}
.badge-success { background: #1b4728; color: #52e37e; border: 1px solid #28a745; }
.badge-primary { background: #143e54; color: #62c9ff; border: 1px solid #1f7fa8; }
.badge-warning { background: #4a3811; color: #ffca58; border: 1px solid #946f1e; }
.badge-danger { background: #4d1818; color: #ff8e8e; border: 1px solid #9e2a2a; }
.badge-neutral { background: #333333; color: #cccccc; border: 1px solid #555555; }

/* Modals */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: grid;
  place-items: center;
  z-index: 100;
  padding: 16px;
}
.modal-box {
  background: var(--panel);
  border: 1px solid var(--line);
  width: min(650px, 100%);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}
.modal-box.modal-lg { width: min(920px, 100%); }
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid var(--line);
  background: #242424;
}
.modal-header h3 { margin: 0; font-size: 18px; font-weight: 700; }
.modal-close {
  background: transparent;
  border: 0;
  color: var(--muted);
  font-size: 20px;
  line-height: 1;
}
.modal-close:hover { color: #fff; }
.modal-body {
  padding: 18px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px;
  border-top: 1px solid var(--line);
  background: #242424;
}

/* Two column layout */
.two-column {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 16px;
  align-items: start;
}

/* Auth screen */
.auth-screen {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #1f1f1f;
  padding: 18px;
}
.auth-card {
  width: min(420px, 100%);
  padding: 24px;
}
.auth-logo {
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  margin: 0 auto 16px;
  border: 1px solid rgba(118, 225, 244, .45);
  background: #000;
  color: var(--primary);
  font-size: 28px;
  font-weight: 900;
}
""")

# src/components/layout/Sidebar.jsx
write_file('src/components/layout/Sidebar.jsx', """
import React from 'react';
import { useBusiness } from '../../context/BusinessContext';

const NAV_GROUPS = [
  {
    group: 'Checkout',
    items: [
      { key: 'pos', label: 'Wholesale POS', icon: '▦' },
      { key: 'dashboard', label: 'Dashboard', icon: '▤' },
    ]
  },
  {
    group: 'Imports & Purchases',
    items: [
      { key: 'supplier-orders', label: 'Supplier Orders', icon: '⌁' },
      { key: 'stock-in-transit', label: 'Stock in Transit', icon: '🚢', showTransitBadge: true },
      { key: 'purchases', label: 'Purchases (GRN)', icon: '▣' },
      { key: 'suppliers', label: 'Suppliers & Advances', icon: '♟' },
    ]
  },
  {
    group: 'Records & Inventory',
    items: [
      { key: 'sales-documents', label: 'Sales Documents', icon: '▰' },
      { key: 'customers', label: 'Customers & Aging', icon: '👥' },
      { key: 'products', label: 'Products & Tiers', icon: '◇' },
      { key: 'inventory', label: 'Inventory Stock', icon: '▣' },
    ]
  },
  {
    group: 'Finance & System',
    items: [
      { key: 'cheques', label: 'Cheque Register', icon: '💳', showChequeBadge: true },
      { key: 'cashflow-bank', label: 'Cash & Banking', icon: '↕' },
      { key: 'reporting', label: 'Reporting & P&L', icon: '▥' },
      { key: 'settings', label: 'Settings', icon: '⚙' },
    ]
  }
];

export default function Sidebar({ currentTab, onSelectTab }) {
  const { cheques, transitShipments } = useBusiness();

  const pendingChequesCount = (cheques || []).filter(c => c.direction === 'received' && (c.status === 'received' || c.status === 'held')).length;
  const inTransitCount = (transitShipments || []).filter(s => s.status === 'in_transit').length;

  return (
    <aside className="sidebar">
      {/* Brand Block */}
      <div className="brand-block">
        <div className="brand-logo">GS</div>
        <div>
          <h1>GS WHOLESALE</h1>
          <p>Direct Importers & POS</p>
        </div>
      </div>

      {/* Grouped Nav List */}
      <div className="nav-list">
        {NAV_GROUPS.map((grp, gIdx) => (
          <div key={gIdx}>
            <div className="nav-group-title">{grp.group}</div>
            {grp.items.map((item) => {
              const isActive = currentTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => onSelectTab(item.key)}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.showChequeBadge && pendingChequesCount > 0 && (
                    <span className="nav-badge">{pendingChequesCount}</span>
                  )}
                  {item.showTransitBadge && inTransitCount > 0 && (
                    <span className="nav-badge" style={{ background: '#0284c7' }}>{inTransitCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}
""")

# src/components/layout/Header.jsx
write_file('src/components/layout/Header.jsx', """
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBusiness } from '../../context/BusinessContext';

const TAB_INFO = {
  'pos': { title: 'Wholesale POS & Fast Invoicing', desc: 'Direct wholesale billing, tiered pricing & multi-tender settlement' },
  'dashboard': { title: 'Wholesale Executive Dashboard', desc: 'Real-time sales, imports in transit, receivables & liquidity' },
  'supplier-orders': { title: 'Import Purchase Orders', desc: 'Factory orders in USD / CNY & supplier dispatch tracking' },
  'stock-in-transit': { title: 'Stock in Transit & Landed Costs', desc: 'Sea / Air shipments, Bill of Lading & customs cost allocation' },
  'purchases': { title: 'Goods Received Notes (GRN)', desc: 'Arrival inspection, sellable stock entry & weighted average cost' },
  'suppliers': { title: 'Foreign Suppliers & TT Advances', desc: 'Supplier ledgers, lead times & advance deposit management' },
  'sales-documents': { title: 'Sales Documents & Invoices', desc: 'Sales invoices, orders, quotations & customer returns' },
  'customers': { title: 'Wholesale Customers & Credit Terms', desc: 'Customer price tiers, credit limits & aging statements' },
  'products': { title: 'Products & Wholesale Tiers', desc: 'Multi-tiered pricing, packs, cartons & quantity breaks' },
  'inventory': { title: 'Stock Ledger & Valuation', desc: 'On-hand, reserved, available and transit inventory balances' },
  'cheques': { title: 'Cheque Register & Drawer', desc: 'Cheque collection, bank deposit, clearance & return handling' },
  'cashflow-bank': { title: 'Cash & Bank Accounts', desc: 'Liquid working capital & payment ledger' },
  'reporting': { title: 'Reports & Profit Analysis', desc: 'Gross margin by product, customer aging & P&L statements' },
  'settings': { title: 'Company Profile & Settings', desc: 'Currency exchange rates, minimum profit protection & rules' }
};

export default function Header({ currentTab }) {
  const { user, logout } = useAuth();
  const { currencies } = useBusiness();

  const info = TAB_INFO[currentTab] || { title: 'GS Wholesale POS', desc: 'Wholesale Computer Products Management' };
  const usdRate = currencies.find(c => c.code === 'USD')?.exchange_rate_to_lkr || 305.5;
  const cnyRate = currencies.find(c => c.code === 'CNY')?.exchange_rate_to_lkr || 42.8;

  return (
    <header className="topbar">
      <div>
        <h2>{info.title}</h2>
        <p>{info.desc}</p>
      </div>

      <div className="topbar-right">
        <div className="topbar-ticker">
          <span>USD: <strong>Rs. {usdRate.toFixed(2)}</strong></span>
          <span style={{ color: '#555' }}>|</span>
          <span>CNY: <strong>Rs. {cnyRate.toFixed(2)}</strong></span>
        </div>

        <button onClick={logout} className="secondary-button small-button" style={{ fontWeight: 700 }}>
          Logout ({user?.email?.split('@')[0] || 'Owner'})
        </button>
      </div>
    </header>
  );
}
""")

# src/components/layout/Layout.jsx
write_file('src/components/layout/Layout.jsx', """
import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ currentTab, onSelectTab, children }) {
  return (
    <div className="app-shell">
      <Sidebar currentTab={currentTab} onSelectTab={onSelectTab} />
      <div className="main-panel">
        <Header currentTab={currentTab} />
        <main className={currentTab === 'sales-documents' || currentTab === 'stock-in-transit' ? 'page-section documents-screen' : 'page-section'}>
          {children}
        </main>
      </div>
    </div>
  );
}
""")

print("Restyled CSS and Layout written.")
