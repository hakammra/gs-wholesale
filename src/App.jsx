import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useNotification } from './context/NotificationContext';
import Layout from './components/layout/Layout';
import Login from './pages/Auth/Login';
import StaffPinLogin from './pages/Auth/StaffPinLogin';
import Dashboard from './pages/Dashboard/Dashboard';
import WholesalePOS from './pages/POS/WholesalePOS';
import SalesDocumentsList from './pages/SalesDocuments/SalesDocumentsList';
import CustomerList from './pages/Customers/CustomerList';
import SupplierList from './pages/Suppliers/SupplierList';
import TransitShipmentList from './pages/StockInTransit/TransitShipmentList';
import PurchaseDocumentsList from './pages/Purchases/PurchaseDocumentsList';
import ProductList from './pages/Products/ProductList';
import InventoryStockList from './pages/Inventory/InventoryStockList';
import ChequeRegister from './pages/Cheques/ChequeRegister';
import CashflowOverview from './pages/CashflowBank/CashflowOverview';
import ReportsIndex from './pages/Reporting/ReportsIndex';
import CompanySettings from './pages/Settings/CompanySettings';

export default function App() {
  const { user, activeStaff, loading, staffLoading, isReadOnly } = useAuth();
  const { notifyWarning } = useNotification();
  
  // Default to 'pos' tab, and remember selected tab in localStorage
  const [currentTab, setCurrentTab] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_active_nav_tab');
    return saved === 'supplier-orders' ? 'stock-in-transit' : (saved || 'pos');
  });

  useEffect(() => {
    localStorage.setItem('gs_wholesale_active_nav_tab', currentTab);
  }, [currentTab]);

  if (loading) return <div className="auth-screen"><div className="panel-card">Checking email session…</div></div>;
  if (!user) {
    return <Login />;
  }
  if (staffLoading) return <div className="auth-screen"><div className="panel-card">Checking staff access…</div></div>;
  if (!activeStaff) return <StaffPinLogin />;

  const renderContent = () => {
    switch (currentTab) {
      case 'pos':
        return <WholesalePOS />;
      case 'dashboard':
        return <Dashboard onNavigateTab={setCurrentTab} />;
      case 'stock-in-transit':
        return <TransitShipmentList onNavigateTab={setCurrentTab} />;
      case 'purchase-documents':
      case 'purchases':
        return <PurchaseDocumentsList onNavigateTab={setCurrentTab} />;
      case 'suppliers':
        return <SupplierList />;
      case 'sales-documents':
        return <SalesDocumentsList />;
      case 'customers':
        return <CustomerList />;
      case 'products':
        return <ProductList />;
      case 'inventory':
        return <InventoryStockList />;
      case 'cheques':
        return <ChequeRegister />;
      case 'cashflow-bank':
        return <CashflowOverview />;
      case 'reporting':
        return <ReportsIndex />;
      case 'settings':
        return <CompanySettings />;
      default:
        return <WholesalePOS />;
    }
  };

  const blockReadOnlyAction = (event) => {
    if (!isReadOnly) return;
    const control = event.target.closest('button, [role="button"], .product-tile');
    if (!control) return;
    const intent = `${control.textContent || ''} ${control.getAttribute('title') || ''} ${control.getAttribute('aria-label') || ''}`.toLowerCase();
    const mutation = /\b(add|new|create|save|edit|delete|remove|record|settle|clear cheque|wipe|reset|restore|sync local|arrive|convert|dispatch|reserve|checkout|pay|payment|return|damage|adjust|update|upload|change|disable|enable)\b/.test(intent)
      || control.matches('.product-tile');
    if (mutation) {
      event.preventDefault();
      event.stopPropagation();
      notifyWarning('This staff account has view-only access.');
    }
  };

  return (
    <Layout currentTab={currentTab} onSelectTab={setCurrentTab}>
      {isReadOnly && <div className="readonly-banner">View-only account · You can inspect every page, but changes are disabled.</div>}
      <div className={isReadOnly ? 'readonly-workspace' : ''} onClickCapture={blockReadOnlyAction} onSubmitCapture={event => { if (isReadOnly) { event.preventDefault(); event.stopPropagation(); notifyWarning('This staff account has view-only access.'); } }}>
        {renderContent()}
      </div>
    </Layout>
  );
}
