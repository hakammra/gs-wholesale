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
    group: 'Finance',
    items: [
      { key: 'cheques', label: 'Cheque Register', icon: '💳', showChequeBadge: true },
      { key: 'cashflow-bank', label: 'Cash Flow', icon: '💵' },
      { key: 'reporting', label: 'Reporting & P&L', icon: '▥' },
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
        <div className="brand-info">
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

      {/* Grouped Nav List (Evenly distributed middle area) */}
      <div className="nav-list">
        {NAV_GROUPS.map((grp, gIdx) => (
          <div key={gIdx} className="nav-group">
            <div className="nav-group-title">{grp.group}</div>
            <div className="nav-group-items">
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
          </div>
        ))}
      </div>

      {/* Pinned Bottom Section: Settings */}
      <div className="sidebar-footer">
        <button
          type="button"
          onClick={() => {
            onSelectTab('settings');
            if (onCloseMobile) onCloseMobile();
          }}
          className={`nav-item settings-item ${currentTab === 'settings' ? 'active' : ''}`}
        >
          <span className="nav-icon">⚙</span>
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
