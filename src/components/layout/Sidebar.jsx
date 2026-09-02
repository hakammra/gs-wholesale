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
    group: 'Purchases & Stock',
    items: [
      { key: 'stock-in-transit', label: 'Stock in Transit', icon: '🚢', showTransitBadge: true },
      { key: 'purchase-documents', label: 'Purchase Documents', icon: '📄', showPurchaseBadge: true },
      { key: 'suppliers', label: 'Suppliers & Advances', icon: '♟' },
      { key: 'inventory', label: 'Inventory Stock', icon: '▣' },
      { key: 'products', label: 'Products & Tiers', icon: '◇' },
    ]
  },
  {
    group: 'Sales & Invoicing',
    items: [
      { key: 'sales-documents', label: 'Sales Documents', icon: '▰' },
      { key: 'customers', label: 'Customers', icon: '👥' },
    ]
  },
  {
    group: 'Finance & System',
    items: [
      { key: 'cheques', label: 'Cheque Register', icon: '💳', showChequeBadge: true },
      { key: 'cashflow-bank', label: 'Cash Flow', icon: '💵' },
      { key: 'reporting', label: 'Reporting & P&L', icon: '▥' },
      { key: 'settings', label: 'Settings', icon: '⚙' },
    ]
  }
];

export default function Sidebar({ currentTab, onSelectTab, isMobileOpen, onCloseMobile }) {
  const { cheques = [], transitShipments = [], purchases = [] } = useBusiness();

  const pendingChequesCount = cheques.filter(c => c.direction === 'received' && (c.status === 'received' || c.status === 'held')).length;
  const inTransitCount = transitShipments.filter(s => s.status === 'in_transit').length;
  const purchasesCount = purchases.length;

  return (
    <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
      {/* Brand Block */}
      <div className="brand-block">
        <div className="brand-logo">GS</div>
        <div>
          <h1>GS WHOLESALE</h1>
          <p>Direct Importers & POS</p>
        </div>
        {onCloseMobile && (
          <button
            type="button"
            className="mobile-drawer-close"
            onClick={onCloseMobile}
            aria-label="Close menu"
          >
            &times;
          </button>
        )}
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
                  onClick={() => {
                    onSelectTab(item.key);
                    if (onCloseMobile) onCloseMobile();
                  }}
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
                  {item.showPurchaseBadge && purchasesCount > 0 && (
                    <span className="nav-badge" style={{ background: '#52e37e', color: '#000' }}>{purchasesCount}</span>
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
