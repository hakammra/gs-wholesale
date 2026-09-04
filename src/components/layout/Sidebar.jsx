import React, { useState, useEffect } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { ChevronDown, ChevronRight } from 'lucide-react';

const NAV_GROUPS = [
  {
    key: 'checkout',
    group: 'Checkout',
    icon: '▦',
    items: [
      { key: 'pos', label: 'Wholesale POS', icon: '▦' },
      { key: 'dashboard', label: 'Dashboard', icon: '▤' },
    ]
  },
  {
    key: 'purchases',
    group: 'Purchases & Stock',
    icon: '📦',
    items: [
      { key: 'stock-in-transit', label: 'Stock in Transit', icon: '🚢', showTransitBadge: true },
      { key: 'purchase-documents', label: 'Purchase Documents', icon: '📄', showPurchaseBadge: true },
      { key: 'suppliers', label: 'Suppliers & Advances', icon: '♟' },
      { key: 'inventory', label: 'Inventory Stock', icon: '▣' },
      { key: 'products', label: 'Products & Tiers', icon: '◇' },
    ]
  },
  {
    key: 'sales',
    group: 'Sales & Invoicing',
    icon: '▰',
    items: [
      { key: 'sales-documents', label: 'Sales Documents', icon: '▰' },
      { key: 'customers', label: 'Customers', icon: '👥' },
    ]
  },
  {
    key: 'finance',
    group: 'Finance & System',
    icon: '⚙',
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

  const activeGroup = NAV_GROUPS.find(g => g.items.some(it => it.key === currentTab));
  const activeGroupKey = activeGroup ? activeGroup.key : 'checkout';

  const [openGroups, setOpenGroups] = useState(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    if (isMobile) {
      return { [activeGroupKey]: true };
    }
    return { checkout: true, purchases: true, sales: true, finance: true };
  });

  // Ensure active group is expanded when tab changes or mobile drawer opens
  useEffect(() => {
    if (activeGroupKey) {
      setOpenGroups(prev => ({ ...prev, [activeGroupKey]: true }));
    }
  }, [activeGroupKey, isMobileOpen]);

  const toggleGroup = (grpKey) => {
    setOpenGroups(prev => ({
      ...prev,
      [grpKey]: !prev[grpKey]
    }));
  };

  const getGroupBadges = (grp) => {
    const badges = [];
    if (grp.key === 'purchases') {
      if (inTransitCount > 0) badges.push({ count: inTransitCount, bg: '#0284c7' });
      if (purchasesCount > 0) badges.push({ count: purchasesCount, bg: '#52e37e', color: '#000' });
    } else if (grp.key === 'finance') {
      if (pendingChequesCount > 0) badges.push({ count: pendingChequesCount, bg: '#ef4444' });
    }
    return badges;
  };

  return (
    <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
      {/* Brand Block */}
      <div className="brand-block">
        <div className="brand-logo">GS</div>
        <div style={{ flex: 1, minWidth: 0 }}>
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

      {/* Grouped Nav List (Accordion) */}
      <div className="nav-list">
        {NAV_GROUPS.map((grp) => {
          const isOpen = !!openGroups[grp.key];
          const groupBadges = getGroupBadges(grp);
          const hasActiveItem = grp.items.some(it => it.key === currentTab);

          return (
            <div key={grp.key} className="nav-group-section">
              <button
                type="button"
                className={`nav-group-btn ${hasActiveItem ? 'has-active' : ''}`}
                onClick={() => toggleGroup(grp.key)}
                aria-expanded={isOpen}
              >
                <div className="nav-group-btn-title">
                  <span className="nav-group-icon">{grp.icon}</span>
                  <span>{grp.group}</span>
                </div>
                <div className="nav-group-btn-right">
                  {!isOpen && groupBadges.map((b, i) => (
                    <span
                      key={i}
                      className="nav-badge"
                      style={{ background: b.bg, color: b.color || '#fff', fontSize: 10, padding: '1px 6px' }}
                    >
                      {b.count}
                    </span>
                  ))}
                  <span className="nav-group-chevron">
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="nav-group-content">
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
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
