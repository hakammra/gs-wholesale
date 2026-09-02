import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print(f'Wrote {path}')

# src/components/layout/Sidebar.jsx
write_file('src/components/layout/Sidebar.jsx', """
import React from 'react';
import { 
  LayoutDashboard, ShoppingCart, FileText, Users, Truck, 
  ClipboardList, Ship, PackageCheck, Boxes, Layers, CreditCard, 
  Landmark, BarChart3, Settings, LogOut, Computer
} from 'lucide-react';
import { NAV_ITEMS } from '../../lib/constants';
import { useAuth } from '../../context/AuthContext';
import { useBusiness } from '../../context/BusinessContext';

const iconMap = {
  LayoutDashboard, ShoppingCart, FileText, Users, Truck, 
  ClipboardList, Ship, PackageCheck, Boxes, Layers, CreditCard, 
  Landmark, BarChart3, Settings
};

export default function Sidebar({ currentTab, onSelectTab, isMobileOpen, onCloseMobile }) {
  const { user, logout } = useAuth();
  const { companySettings, cheques, transitShipments, customers } = useBusiness();

  const pendingChequesCount = cheques.filter(c => c.status === 'received' || c.status === 'held').length;
  const transitCount = transitShipments.filter(s => s.status === 'in_transit' || s.status === 'preparing').length;
  const overdueCount = customers.filter(c => c.current_receivable > 0).length;

  return (
    <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
      {/* Brand Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 8, background: 'linear-gradient(135deg, #0284c7, #0369a1)',
          display: 'grid', placeItems: 'center', color: '#fff'
        }}>
          <Computer size={22} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {companySettings.business_name || 'GS Wholesale'}
          </h1>
          <p style={{ fontSize: 11, color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Wholesale POS
          </p>
        </div>
      </div>

      {/* Nav List */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV_ITEMS.map(item => {
            const Icon = iconMap[item.icon] || FileText;
            const isActive = currentTab === item.id;
            let badge = null;

            if (item.id === 'cheques' && pendingChequesCount > 0) {
              badge = <span className="badge badge-warning" style={{ fontSize: 10, padding: '1px 6px' }}>{pendingChequesCount}</span>;
            } else if (item.id === 'stock-in-transit' && transitCount > 0) {
              badge = <span className="badge badge-primary" style={{ fontSize: 10, padding: '1px 6px' }}>{transitCount}</span>;
            }

            return (
              <li key={item.id}>
                <button
                  onClick={() => {
                    onSelectTab(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: isActive ? 'var(--primary)' : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--text-muted)',
                    fontWeight: isActive ? 700 : 600,
                    fontSize: 13.5,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'var(--panel-hover)';
                      e.currentTarget.style.color = 'var(--text)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </div>
                  {badge}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer User Block */}
      <div style={{ padding: 16, borderTop: '1px solid var(--border-subtle)', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'Owner'}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email || 'owner@gs.lk'}
            </p>
          </div>
          <button
            onClick={logout}
            className="btn btn-secondary btn-icon"
            title="Sign Out"
            style={{ padding: 6 }}
          >
            <LogOut size={16} color="#ef4444" />
          </button>
        </div>
      </div>
    </aside>
  );
}
""")

# src/components/layout/Header.jsx
write_file('src/components/layout/Header.jsx', """
import React from 'react';
import { Menu, DollarSign, Calendar, ShieldCheck } from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency } from '../../lib/formatters';

export default function Header({ onOpenMobile, currentTabTitle }) {
  const { currencies } = useBusiness();
  const usd = currencies.find(c => c.code === 'USD')?.exchange_rate_to_lkr || 305.5;
  const cny = currencies.find(c => c.code === 'CNY')?.exchange_rate_to_lkr || 42.8;

  const todayStr = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={onOpenMobile}
          className="btn btn-secondary btn-icon"
          style={{ display: 'none' }} // Visible on mobile via CSS media query
        >
          <Menu size={20} />
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
          {currentTabTitle}
        </h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* Live Currency Snapshot Ticker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--panel)', padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}>
            <span style={{ color: '#38bdf8' }}>USD:</span>
            <span className="mono" style={{ color: 'var(--text)' }}>Rs. {usd.toFixed(2)}</span>
          </div>
          <div style={{ width: 1, height: 14, background: 'var(--border)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}>
            <span style={{ color: '#fbbf24' }}>CNY:</span>
            <span className="mono" style={{ color: 'var(--text)' }}>Rs. {cny.toFixed(2)}</span>
          </div>
        </div>

        {/* Date Display */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>
          <Calendar size={15} />
          <span>{todayStr}</span>
        </div>

        {/* Owner Session Indicator */}
        <div className="badge badge-success" style={{ padding: '4px 10px', fontSize: 11.5 }}>
          <ShieldCheck size={14} />
          <span>Owner Session</span>
        </div>
      </div>
    </header>
  );
}
""")

# src/components/layout/Layout.jsx
write_file('src/components/layout/Layout.jsx', """
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { NAV_ITEMS } from '../../lib/constants';

export default function Layout({ currentTab, onSelectTab, children }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const currentItem = NAV_ITEMS.find(i => i.id === currentTab) || NAV_ITEMS[0];

  return (
    <div className="app-layout">
      <Sidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      <div className="main-content">
        <Header
          onOpenMobile={() => setIsMobileOpen(true)}
          currentTabTitle={currentItem.label}
        />

        <main style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
""")

# src/components/common/Modal.jsx
write_file('src/components/common/Modal.jsx', """
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, size = 'default', children, footer }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClass = size === 'lg' ? 'modal-lg' : size === 'xl' ? 'modal-xl' : '';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content ${sizeClass}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{title}</h3>
          <button onClick={onClose} className="btn btn-secondary btn-icon" style={{ padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {children}
        </div>

        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
""")

# src/components/common/StatCard.jsx
write_file('src/components/common/StatCard.jsx', """
import React from 'react';

export default function StatCard({ title, value, icon: Icon, color = 'primary', subtext }) {
  const bgMap = {
    primary: 'var(--primary-subtle)',
    success: 'var(--success-subtle)',
    warning: 'var(--warning-subtle)',
    danger: 'var(--danger-subtle)',
    purple: 'var(--purple-subtle)'
  };
  const colorMap = {
    primary: '#38bdf8',
    success: '#34d399',
    warning: '#fbbf24',
    danger: '#f87171',
    purple: '#a78bfa'
  };

  return (
    <div className="stat-card">
      {Icon && (
        <div className="stat-icon" style={{ background: bgMap[color] || bgMap.primary, color: colorMap[color] || colorMap.primary }}>
          <Icon size={24} />
        </div>
      )}
      <div>
        <div className="stat-title">{title}</div>
        <div className="stat-value">{value}</div>
        {subtext && <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2 }}>{subtext}</div>}
      </div>
    </div>
  );
}
""")

# src/components/common/Badge.jsx
write_file('src/components/common/Badge.jsx', """
import React from 'react';

export default function Badge({ type = 'neutral', children, style = {} }) {
  return (
    <span className={`badge badge-${type}`} style={style}>
      {children}
    </span>
  );
}
""")

# src/components/common/SearchInput.jsx
write_file('src/components/common/SearchInput.jsx', """
import React from 'react';
import { Search, X } from 'lucide-react';

export default function SearchInput({ value, onChange, placeholder = 'Search...', autoFocus = false }) {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
      <input
        type="text"
        className="form-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        style={{ paddingLeft: 36, paddingRight: value ? 32 : 12 }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
""")

# src/components/common/ConfirmDialog.jsx
write_file('src/components/common/ConfirmDialog.jsx', """
import React from 'react';
import Modal from './Modal';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title = 'Confirm Action', message, confirmText = 'Confirm', confirmType = 'danger' }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }} className={`btn btn-${confirmType}`}>{confirmText}</button>
        </>
      }
    >
      <p style={{ color: 'var(--text)', fontSize: 14 }}>{message}</p>
    </Modal>
  );
}
""")

print("Layout and common UI components written.")
