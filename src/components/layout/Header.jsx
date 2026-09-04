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
  'customers': { title: 'Customers', desc: 'Customer directory, credit profiles, transaction ledger & statements' },
  'products': { title: 'Products & Wholesale Tiers', desc: 'Multi-tiered pricing, packs, cartons & quantity breaks' },
  'inventory': { title: 'Stock Ledger & Valuation', desc: 'On-hand, reserved, available and transit inventory balances' },
  'cheques': { title: 'Cheque Register & Drawer', desc: 'Cheque collection, bank deposit, clearance & return handling' },
  'cashflow-bank': { title: 'Cash Flow', desc: 'Operating cash flow, sales collections, supplier payments & disbursements' },
  'reporting': { title: 'Reports & Profit Analysis', desc: 'Gross margin by product, customer aging & P&L statements' },
  'settings': { title: 'Company Profile & Settings', desc: 'Business profile, minimum profit protection & rules' }
};

export default function Header({ currentTab, onToggleMobileNav }) {
  const { user, logout } = useAuth();
  const { refreshData, dataLoading, syncState } = useBusiness();

  const info = TAB_INFO[currentTab] || { title: 'GS Wholesale POS', desc: 'Wholesale Computer Products Management' };
  const syncLabel = {
    connecting: 'Connecting',
    reconnecting: 'Reconnecting',
    syncing: syncState?.pendingWrites ? `Saving ${syncState.pendingWrites}` : 'Syncing',
    synced: 'Cloud synced',
    offline: 'Offline',
    error: 'Sync issue'
  }[syncState?.status] || 'Cloud status';
  const lastSyncLabel = syncState?.lastSyncedAt
    ? `Last synced ${new Date(syncState.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Waiting for first sync';

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Mobile Hamburger (hidden on desktop, only visible on mobile <= 768px) */}
        <button
          type="button"
          className="mobile-hamburger-btn"
          onClick={onToggleMobileNav}
          aria-label="Open navigation menu"
          title="Open navigation menu"
        >
          <span className="hamburger-bar"></span>
          <span className="hamburger-bar"></span>
          <span className="hamburger-bar"></span>
        </button>

        <div>
          <h2>{info.title}</h2>
          <p>{info.desc}</p>
        </div>
      </div>

      <div className="topbar-right">
        <div
          className={`sync-health sync-health-${syncState?.status || 'connecting'}`}
          title={syncState?.error || lastSyncLabel}
          role="status"
          aria-live="polite"
        >
          <span className="sync-health-dot" aria-hidden="true" />
          <span className="sync-health-copy">
            <strong>{syncLabel}</strong>
            <small>{syncState?.status === 'error' ? 'Tap refresh for details' : lastSyncLabel}</small>
          </span>
        </div>

        <button
          onClick={refreshData}
          disabled={dataLoading}
          className="secondary-button small-button sync-refresh-button"
          title={syncState?.error || 'Fetch the latest updates from Supabase'}
        >
          <span className={dataLoading ? 'sync-spin' : ''}>↻</span>
          <span>{dataLoading ? 'Refreshing' : 'Refresh'}</span>
        </button>

        <button onClick={logout} className="secondary-button small-button logout-button" style={{ fontWeight: 700 }}>
          <span>Sign out</span>
          <small>{user?.email?.split('@')[0] || 'Owner'}</small>
        </button>
      </div>
    </header>
  );
}
