import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Auth/Login';
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
  const { user } = useAuth();
  
  // Default to 'pos' tab, and remember selected tab in localStorage
  const [currentTab, setCurrentTab] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_active_nav_tab');
    return saved || 'pos';
  });

  useEffect(() => {
    localStorage.setItem('gs_wholesale_active_nav_tab', currentTab);
  }, [currentTab]);

  if (!user) {
    return <Login />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'pos':
        return <WholesalePOS />;
      case 'dashboard':
        return <Dashboard onNavigateTab={setCurrentTab} />;
      case 'stock-in-transit':
      case 'supplier-orders':
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

  return (
    <Layout currentTab={currentTab} onSelectTab={setCurrentTab}>
      {renderContent()}
    </Layout>
  );
}
