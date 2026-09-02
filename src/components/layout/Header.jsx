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
  const { refreshData, dataLoading } = useBusiness();

  const info = TAB_INFO[currentTab] || { title: 'GS Wholesale POS', desc: 'Wholesale Computer Products Management' };

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
