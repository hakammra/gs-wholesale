export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { id: 'pos', label: 'Wholesale POS', icon: 'ShoppingCart' },
  { id: 'sales-documents', label: 'Sales Documents', icon: 'FileText' },
  { id: 'customers', label: 'Customers', icon: 'Users' },
  { id: 'suppliers', label: 'Suppliers', icon: 'Truck' },
  { id: 'supplier-orders', label: 'Supplier Orders', icon: 'ClipboardList' },
  { id: 'stock-in-transit', label: 'Stock in Transit', icon: 'Ship' },
  { id: 'purchases', label: 'Purchases / Receiving', icon: 'PackageCheck' },
  { id: 'products', label: 'Products', icon: 'Boxes' },
  { id: 'inventory', label: 'Inventory', icon: 'Layers' },
  { id: 'cheques', label: 'Cheques', icon: 'CreditCard' },
  { id: 'cashflow-bank', label: 'Cashflow & Bank', icon: 'Landmark' },
  { id: 'reporting', label: 'Reporting', icon: 'BarChart3' },
  { id: 'settings', label: 'Settings', icon: 'Settings' }
];

export const DOCUMENT_TYPES = {
  QUOTATION: 'quotation',
  SALES_ORDER: 'sales_order',
  SALES_INVOICE: 'sales_invoice',
  CREDIT_NOTE: 'credit_note',
  EXCHANGE: 'exchange'
};

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'bank', label: 'Bank Transfer' },
  { id: 'card', label: 'Card' },
  { id: 'cheque', label: 'Cheque' },
  { id: 'customer_credit', label: 'Credit / On Account' }
];

export const CHEQUE_STATUSES = {
  RECEIVED: 'received',
  HELD: 'held',
  DEPOSITED: 'deposited',
  CLEARED: 'cleared',
  RETURNED: 'returned',
  REPLACED: 'replaced',
  CANCELLED: 'cancelled'
};

export const TRANSIT_STATUSES = {
  PREPARING: 'preparing',
  IN_TRANSIT: 'in_transit',
  PARTIALLY_RECEIVED: 'partially_received',
  RECEIVED: 'received',
  CANCELLED: 'cancelled'
};

export const SUPPLIER_ORDER_STATUSES = {
  DRAFT: 'draft',
  ORDERED: 'ordered',
  PARTIALLY_SHIPPED: 'partially_shipped',
  SHIPPED: 'shipped',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

export const LANDED_COST_TYPES = [
  { id: 'freight', label: 'Sea / Air Freight' },
  { id: 'customs_duty', label: 'Customs Duty / PAL / Cess' },
  { id: 'clearing', label: 'Clearing & Handling Charges' },
  { id: 'insurance', label: 'Marine / Cargo Insurance' },
  { id: 'bank_charges', label: 'LC / TT Bank Charges' },
  { id: 'local_delivery', label: 'Port to Warehouse Transport' },
  { id: 'other', label: 'Other Import Expense' }
];

export const ALLOCATION_METHODS = [
  { id: 'value', label: 'By Item Foreign Value (Default)' },
  { id: 'quantity', label: 'By Item Quantity' },
  { id: 'weight', label: 'By Weight (kg)' },
  { id: 'volume', label: 'By Volume (CBM)' },
  { id: 'manual', label: 'Manual Line Allocation' }
];
