import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print(f'Wrote {path}')

# src/context/BusinessContext.jsx
write_file('src/context/BusinessContext.jsx', """
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNotification } from './NotificationContext';

const BusinessContext = createContext();

// Default initial state matching 003 seed data for seamless local & live operation
const INITIAL_COMPANY = {
  business_name: 'GS Wholesale Computer Products',
  tagline: 'Direct Importers & Wholesale Computer Components',
  phone: '+94 77 123 4567',
  whatsapp: '+94 77 123 4567',
  email: 'wholesale@gstechnologies.lk',
  address: 'No. 45 First Cross Street, Colombo 11, Sri Lanka',
  tax_number: 'VAT-987654321',
  base_currency: 'LKR',
  default_credit_days: 30,
  min_profit_pct: 5.0,
  is_tax_enabled: false,
  default_tax_pct: 0.0,
  default_landed_cost_allocation: 'value',
  default_invoice_paper_size: 'A4'
};

const INITIAL_CURRENCIES = [
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs.', exchange_rate_to_lkr: 1.0, is_base: true },
  { code: 'USD', name: 'US Dollar', symbol: '$', exchange_rate_to_lkr: 305.5, is_base: false },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', exchange_rate_to_lkr: 42.8, is_base: false },
  { code: 'EUR', name: 'Euro', symbol: '€', exchange_rate_to_lkr: 332.0, is_base: false }
];

const INITIAL_CATEGORIES = [
  { id: 'cat-1', name: 'Solid State Drives (SSD)', code: 'SSD' },
  { id: 'cat-2', name: 'Random Access Memory (RAM)', code: 'RAM' },
  { id: 'cat-3', name: 'Graphics Cards (GPU)', code: 'GPU' },
  { id: 'cat-4', name: 'Processors (CPU)', code: 'CPU' },
  { id: 'cat-5', name: 'Motherboards', code: 'MB' },
  { id: 'cat-6', name: 'Power Supply Units (PSU)', code: 'PSU' },
  { id: 'cat-7', name: 'Monitors & Displays', code: 'MON' },
  { id: 'cat-8', name: 'PC Cases & Cooling', code: 'CASE' }
];

const INITIAL_BRANDS = [
  { id: 'b-1', name: 'Kingston', country: 'USA' },
  { id: 'b-2', name: 'Samsung', country: 'South Korea' },
  { id: 'b-3', name: 'Crucial', country: 'USA' },
  { id: 'b-4', name: 'Lexar', country: 'China' },
  { id: 'b-5', name: 'Hikvision', country: 'China' },
  { id: 'b-6', name: 'ASUS', country: 'Taiwan' },
  { id: 'b-7', name: 'MSI', country: 'Taiwan' }
];

const INITIAL_CUSTOMERS = [
  {
    id: 'c-1',
    customer_code: 'CUST-001',
    business_name: 'TechZone Solutions (Pvt) Ltd',
    contact_person: 'Rizwan Mohamed',
    phone: '+94 77 456 7890',
    whatsapp: '+94 77 456 7890',
    email: 'orders@techzone.lk',
    billing_address: '220 Galle Road, Colombo 03',
    price_tier: 'Dealer',
    credit_allowed: true,
    credit_limit: 1500000.0,
    credit_days: 30,
    current_receivable: 0.0,
    unallocated_credit: 0.0,
    is_active: true
  },
  {
    id: 'c-2',
    customer_code: 'CUST-002',
    business_name: 'Apex Computer World',
    contact_person: 'Chaminda Perera',
    phone: '+94 71 234 5678',
    whatsapp: '+94 71 234 5678',
    email: 'apexcomp@gmail.com',
    billing_address: '15 Kandy Road, Kurunegala',
    price_tier: 'Tier1',
    credit_allowed: true,
    credit_limit: 750000.0,
    credit_days: 14,
    current_receivable: 0.0,
    unallocated_credit: 0.0,
    is_active: true
  },
  {
    id: 'c-3',
    customer_code: 'CUST-003',
    business_name: 'NextGen IT Systems',
    contact_person: 'Kavinda Silva',
    phone: '+94 76 890 1234',
    whatsapp: '+94 76 890 1234',
    email: 'info@nextgenit.lk',
    billing_address: '88 Main Street, Kandy',
    price_tier: 'Standard',
    credit_allowed: true,
    credit_limit: 500000.0,
    credit_days: 30,
    current_receivable: 0.0,
    unallocated_credit: 0.0,
    is_active: true
  }
];

const INITIAL_SUPPLIERS = [
  {
    id: 's-1',
    supplier_code: 'SUP-001',
    name: 'Shenzhen KingFast Storage Co., Ltd.',
    country: 'China',
    contact_person: 'David Chen',
    phone: '+86 755 8899 1122',
    email: 'david@kingfast-storage.cn',
    address: 'Bldg 4, High-Tech Industrial Park, Nanshan, Shenzhen',
    default_currency: 'USD',
    default_lead_days: 10,
    bank_details: 'Bank of China Shenzhen / SWIFT: BKCHCNBJ400 / A/C: 456789012345',
    current_advance_balance: 0.0,
    current_payable: 0.0,
    products_supplied: 'SATA SSD, NVMe SSD, DDR4/DDR5 RAM',
    is_active: true
  },
  {
    id: 's-2',
    supplier_code: 'SUP-002',
    name: 'Guangzhou Redbox Electronics Ltd.',
    country: 'China',
    contact_person: 'Mark Liu',
    phone: '+86 20 8334 5566',
    email: 'mark@redbox-tech.com',
    address: 'Tianhe Computer City, Guangzhou, Guangdong',
    default_currency: 'USD',
    default_lead_days: 14,
    bank_details: 'ICBC Guangzhou Branch / SWIFT: ICBCCNBSCAN / A/C: 887766554433',
    current_advance_balance: 0.0,
    current_payable: 0.0,
    products_supplied: 'Motherboards, Graphics Cards, Power Supplies',
    is_active: true
  }
];

const INITIAL_PRODUCTS = [
  {
    id: 'p-1',
    item_code: 'SSD-KF-256G',
    barcode: '697123456001',
    name: 'KingFast 2.5" SATA III SSD 256GB',
    brand_id: 'b-1',
    category_id: 'cat-1',
    model: 'KF-SATA-256',
    unit_name: 'Unit',
    pack_size: 10,
    carton_units: 100,
    retail_price: 6500.0,
    wholesale_price: 5200.0,
    dealer_price: 4950.0,
    min_order_qty: 1,
    min_profit_pct: 5.0,
    weighted_cost_lkr: 4400.0,
    last_landed_cost_lkr: 4400.0,
    last_purchase_cost_foreign: 14.4,
    last_foreign_currency: 'USD',
    low_stock_threshold: 10,
    is_wholesale_active: true,
    is_active: true,
    quantity_breaks: [
      { min_qty: 1, max_qty: 9, unit_price: 5200.0 },
      { min_qty: 10, max_qty: 49, unit_price: 5050.0 },
      { min_qty: 50, max_qty: null, unit_price: 4900.0 }
    ]
  },
  {
    id: 'p-2',
    item_code: 'SSD-KF-512G',
    barcode: '697123456002',
    name: 'KingFast 2.5" SATA III SSD 512GB',
    brand_id: 'b-1',
    category_id: 'cat-1',
    model: 'KF-SATA-512',
    unit_name: 'Unit',
    pack_size: 10,
    carton_units: 100,
    retail_price: 10500.0,
    wholesale_price: 8800.0,
    dealer_price: 8400.0,
    min_order_qty: 1,
    min_profit_pct: 5.0,
    weighted_cost_lkr: 7600.0,
    last_landed_cost_lkr: 7600.0,
    last_purchase_cost_foreign: 24.8,
    last_foreign_currency: 'USD',
    low_stock_threshold: 10,
    is_wholesale_active: true,
    is_active: true,
    quantity_breaks: [
      { min_qty: 1, max_qty: 9, unit_price: 8800.0 },
      { min_qty: 10, max_qty: 49, unit_price: 8550.0 },
      { min_qty: 50, max_qty: null, unit_price: 8300.0 }
    ]
  },
  {
    id: 'p-3',
    item_code: 'RAM-DDR4-8G-3200',
    barcode: '697123456003',
    name: 'KingFast DDR4 8GB 3200MHz Desktop RAM',
    brand_id: 'b-1',
    category_id: 'cat-2',
    model: 'KF-D4-8G-32',
    unit_name: 'Unit',
    pack_size: 20,
    carton_units: 200,
    retail_price: 6800.0,
    wholesale_price: 5500.0,
    dealer_price: 5200.0,
    min_order_qty: 1,
    min_profit_pct: 5.0,
    weighted_cost_lkr: 4600.0,
    last_landed_cost_lkr: 4600.0,
    last_purchase_cost_foreign: 15.0,
    last_foreign_currency: 'USD',
    low_stock_threshold: 15,
    is_wholesale_active: true,
    is_active: true,
    quantity_breaks: [
      { min_qty: 1, max_qty: 9, unit_price: 5500.0 },
      { min_qty: 10, max_qty: 49, unit_price: 5350.0 },
      { min_qty: 50, max_qty: null, unit_price: 5150.0 }
    ]
  },
  {
    id: 'p-4',
    item_code: 'RAM-DDR4-16G-3200',
    barcode: '697123456004',
    name: 'KingFast DDR4 16GB 3200MHz Desktop RAM',
    brand_id: 'b-1',
    category_id: 'cat-2',
    model: 'KF-D4-16G-32',
    unit_name: 'Unit',
    pack_size: 20,
    carton_units: 200,
    retail_price: 12500.0,
    wholesale_price: 10200.0,
    dealer_price: 9750.0,
    min_order_qty: 1,
    min_profit_pct: 5.0,
    weighted_cost_lkr: 8900.0,
    last_landed_cost_lkr: 8900.0,
    last_purchase_cost_foreign: 29.0,
    last_foreign_currency: 'USD',
    low_stock_threshold: 15,
    is_wholesale_active: true,
    is_active: true,
    quantity_breaks: [
      { min_qty: 1, max_qty: 9, unit_price: 10200.0 },
      { min_qty: 10, max_qty: 49, unit_price: 9900.0 },
      { min_qty: 50, max_qty: null, unit_price: 9600.0 }
    ]
  },
  {
    id: 'p-5',
    item_code: 'MB-H510M-K',
    barcode: '697123456005',
    name: 'ASUS Prime H510M-K LGA1200 Motherboard',
    brand_id: 'b-6',
    category_id: 'cat-5',
    model: 'H510M-K',
    unit_name: 'Unit',
    pack_size: 1,
    carton_units: 10,
    retail_price: 24500.0,
    wholesale_price: 21500.0,
    dealer_price: 20800.0,
    min_order_qty: 1,
    min_profit_pct: 5.0,
    weighted_cost_lkr: 19500.0,
    last_landed_cost_lkr: 19500.0,
    last_purchase_cost_foreign: 63.8,
    last_foreign_currency: 'USD',
    low_stock_threshold: 5,
    is_wholesale_active: true,
    is_active: true,
    quantity_breaks: [
      { min_qty: 1, max_qty: 4, unit_price: 21500.0 },
      { min_qty: 5, max_qty: null, unit_price: 20900.0 }
    ]
  }
];

const INITIAL_STOCK_BALANCES = {
  'p-1': { qty_on_hand: 120, qty_reserved: 0, qty_available: 120, qty_in_transit: 50, qty_damaged: 0 },
  'p-2': { qty_on_hand: 85, qty_reserved: 0, qty_available: 85, qty_in_transit: 30, qty_damaged: 0 },
  'p-3': { qty_on_hand: 150, qty_reserved: 0, qty_available: 150, qty_in_transit: 100, qty_damaged: 0 },
  'p-4': { qty_on_hand: 90, qty_reserved: 0, qty_available: 90, qty_in_transit: 40, qty_damaged: 0 },
  'p-5': { qty_on_hand: 25, qty_reserved: 0, qty_available: 25, qty_in_transit: 15, qty_damaged: 0 }
};

const INITIAL_BANK_ACCOUNTS = [
  { id: 'ba-1', account_name: 'Commercial Bank - Wholesale Current', account_number: '1000123456', bank_name: 'Commercial Bank', current_balance: 500000.0 },
  { id: 'ba-2', account_name: 'Sampath Bank - Corporate', account_number: '002910004567', bank_name: 'Sampath Bank', current_balance: 250000.0 }
];

export function BusinessProvider({ children }) {
  const { notifySuccess, notifyError } = useNotification();

  const [companySettings, setCompanySettings] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_settings');
    return saved ? JSON.parse(saved) : INITIAL_COMPANY;
  });

  const [currencies, setCurrencies] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_currencies');
    return saved ? JSON.parse(saved) : INITIAL_CURRENCIES;
  });

  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_categories');
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  const [brands, setBrands] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_brands');
    return saved ? JSON.parse(saved) : INITIAL_BRANDS;
  });

  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [stockBalances, setStockBalances] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_stock');
    return saved ? JSON.parse(saved) : INITIAL_STOCK_BALANCES;
  });

  const [customers, setCustomers] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_customers');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [suppliers, setSuppliers] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_suppliers');
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  });

  const [bankAccounts, setBankAccounts] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_bank_accounts');
    return saved ? JSON.parse(saved) : INITIAL_BANK_ACCOUNTS;
  });

  const [supplierOrders, setSupplierOrders] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_supplier_orders');
    return saved ? JSON.parse(saved) : [];
  });

  const [supplierAdvances, setSupplierAdvances] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_advances');
    return saved ? JSON.parse(saved) : [];
  });

  const [transitShipments, setTransitShipments] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_transit');
    return saved ? JSON.parse(saved) : [];
  });

  const [purchases, setPurchases] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_purchases');
    return saved ? JSON.parse(saved) : [];
  });

  const [salesDocuments, setSalesDocuments] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_sales_docs');
    return saved ? JSON.parse(saved) : [];
  });

  const [cheques, setCheques] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_cheques');
    return saved ? JSON.parse(saved) : [];
  });

  const [payments, setPayments] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_payments');
    return saved ? JSON.parse(saved) : [];
  });

  const [stockMovements, setStockMovements] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_stock_movements');
    return saved ? JSON.parse(saved) : [];
  });

  // Persist local store
  useEffect(() => {
    localStorage.setItem('gs_wholesale_settings', JSON.stringify(companySettings));
  }, [companySettings]);

  useEffect(() => {
    localStorage.setItem('gs_wholesale_currencies', JSON.stringify(currencies));
  }, [currencies]);

  useEffect(() => {
    localStorage.setItem('gs_wholesale_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('gs_wholesale_stock', JSON.stringify(stockBalances));
  }, [stockBalances]);

  useEffect(() => {
    localStorage.setItem('gs_wholesale_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('gs_wholesale_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem('gs_wholesale_bank_accounts', JSON.stringify(bankAccounts));
  }, [bankAccounts]);

  useEffect(() => {
    localStorage.setItem('gs_wholesale_supplier_orders', JSON.stringify(supplierOrders));
  }, [supplierOrders]);

  useEffect(() => {
    localStorage.setItem('gs_wholesale_advances', JSON.stringify(supplierAdvances));
  }, [supplierAdvances]);

  useEffect(() => {
    localStorage.setItem('gs_wholesale_transit', JSON.stringify(transitShipments));
  }, [transitShipments]);

  useEffect(() => {
    localStorage.setItem('gs_wholesale_purchases', JSON.stringify(purchases));
  }, [purchases]);

  useEffect(() => {
    localStorage.setItem('gs_wholesale_sales_docs', JSON.stringify(salesDocuments));
  }, [salesDocuments]);

  useEffect(() => {
    localStorage.setItem('gs_wholesale_cheques', JSON.stringify(cheques));
  }, [cheques]);

  useEffect(() => {
    localStorage.setItem('gs_wholesale_payments', JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem('gs_wholesale_stock_movements', JSON.stringify(stockMovements));
  }, [stockMovements]);

  // Product CRUD
  const saveProduct = (productData) => {
    if (productData.id) {
      setProducts(prev => prev.map(p => p.id === productData.id ? { ...p, ...productData, updated_at: new Date().toISOString() } : p));
      notifySuccess('Product updated successfully');
    } else {
      const newProd = {
        ...productData,
        id: 'p-' + Date.now(),
        item_code: productData.item_code || `PRD-${Date.now().toString().slice(-4)}`,
        weighted_cost_lkr: Number(productData.weighted_cost_lkr) || 0,
        last_landed_cost_lkr: Number(productData.last_landed_cost_lkr) || 0,
        is_wholesale_active: true,
        is_active: true,
        created_at: new Date().toISOString()
      };
      setProducts(prev => [newProd, ...prev]);
      setStockBalances(prev => ({
        ...prev,
        [newProd.id]: { qty_on_hand: 0, qty_reserved: 0, qty_available: 0, qty_in_transit: 0, qty_damaged: 0 }
      }));
      notifySuccess('New product created successfully');
    }
  };

  // Customer CRUD
  const saveCustomer = (customerData) => {
    if (customerData.id) {
      setCustomers(prev => prev.map(c => c.id === customerData.id ? { ...c, ...customerData, updated_at: new Date().toISOString() } : c));
      notifySuccess('Customer profile updated');
    } else {
      const newCust = {
        ...customerData,
        id: 'c-' + Date.now(),
        customer_code: customerData.customer_code || `CUST-${(customers.length + 1).toString().padStart(3, '0')}`,
        current_receivable: 0,
        unallocated_credit: 0,
        is_active: true,
        created_at: new Date().toISOString()
      };
      setCustomers(prev => [newCust, ...prev]);
      notifySuccess('New customer created');
    }
  };

  // Supplier CRUD
  const saveSupplier = (supplierData) => {
    if (supplierData.id) {
      setSuppliers(prev => prev.map(s => s.id === supplierData.id ? { ...s, ...supplierData, updated_at: new Date().toISOString() } : s));
      notifySuccess('Supplier profile updated');
    } else {
      const newSupp = {
        ...supplierData,
        id: 's-' + Date.now(),
        supplier_code: supplierData.supplier_code || `SUP-${(suppliers.length + 1).toString().padStart(3, '0')}`,
        current_advance_balance: 0,
        current_payable: 0,
        is_active: true,
        created_at: new Date().toISOString()
      };
      setSuppliers(prev => [newSupp, ...prev]);
      notifySuccess('New supplier created');
    }
  };

  // Create Supplier Order
  const createSupplierOrder = (orderData) => {
    const orderNo = `SO-IMP-${new Date().toISOString().slice(0,7).replace('-','')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder = {
      ...orderData,
      id: 'so-' + Date.now(),
      order_no: orderNo,
      order_date: orderData.order_date || new Date().toISOString().slice(0, 10),
      status: 'ordered',
      created_at: new Date().toISOString()
    };
    setSupplierOrders(prev => [newOrder, ...prev]);
    notifySuccess(`Supplier Order ${orderNo} created`);
    return newOrder;
  };

  // Record Supplier Advance Payment
  const recordSupplierAdvance = (advanceData) => {
    const advanceNo = `ADV-${new Date().toISOString().slice(0,7).replace('-','')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const lkrAmount = Number(advanceData.foreign_amount) * Number(advanceData.exchange_rate);
    const newAdv = {
      ...advanceData,
      id: 'adv-' + Date.now(),
      advance_no: advanceNo,
      lkr_amount: lkrAmount,
      allocated_lkr_amount: 0,
      unallocated_lkr_amount: lkrAmount,
      created_at: new Date().toISOString()
    };

    setSupplierAdvances(prev => [newAdv, ...prev]);

    // Update Supplier advance balance
    setSuppliers(prev => prev.map(s => {
      if (s.id === advanceData.supplier_id) {
        return { ...s, current_advance_balance: (s.current_advance_balance || 0) + lkrAmount };
      }
      return s;
    }));

    // Deduct from bank account if specified
    if (advanceData.bank_account_id) {
      setBankAccounts(prev => prev.map(b => {
        if (b.id === advanceData.bank_account_id) {
          return { ...b, current_balance: (b.current_balance || 0) - lkrAmount };
        }
        return b;
      }));
    }

    notifySuccess(`Supplier advance ${advanceNo} recorded for Rs. ${lkrAmount.toLocaleString()}`);
    return newAdv;
  };

  // Create Stock in Transit Shipment
  const createTransitShipment = (shipmentData) => {
    const shipmentNo = `SHP-${new Date().toISOString().slice(0,7).replace('-','')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const exchangeRate = Number(shipmentData.exchange_rate_snapshot) || 305.5;
    
    // Calculate items foreign subtotal
    let foreignSubtotal = 0;
    const items = (shipmentData.items || []).map(item => {
      const foreignCost = Number(item.foreign_unit_cost) || 0;
      const shippedQty = Number(item.shipped_qty) || 0;
      foreignSubtotal += (foreignCost * shippedQty);
      return {
        ...item,
        id: 'ti-' + Math.random().toString(36).substr(2, 9),
        shipped_qty: shippedQty,
        received_qty: 0,
        damaged_qty: 0,
        allocated_landed_lkr_per_unit: 0,
        final_landed_unit_cost_lkr: foreignCost * exchangeRate
      };
    });

    const newShipment = {
      ...shipmentData,
      id: 'shp-' + Date.now(),
      shipment_no: shipmentNo,
      foreign_items_subtotal: foreignSubtotal,
      total_landed_expenses_lkr: 0,
      total_estimated_cost_lkr: foreignSubtotal * exchangeRate,
      status: 'in_transit',
      items,
      landed_costs: [],
      created_at: new Date().toISOString()
    };

    // Update in-transit quantities on stock balances
    setStockBalances(prev => {
      const updated = { ...prev };
      items.forEach(it => {
        if (!updated[it.product_id]) {
          updated[it.product_id] = { qty_on_hand: 0, qty_reserved: 0, qty_available: 0, qty_in_transit: 0, qty_damaged: 0 };
        }
        updated[it.product_id] = {
          ...updated[it.product_id],
          qty_in_transit: (updated[it.product_id].qty_in_transit || 0) + it.shipped_qty
        };
      });
      return updated;
    });

    setTransitShipments(prev => [newShipment, ...prev]);
    notifySuccess(`Shipment ${shipmentNo} dispatched into Transit`);
    return newShipment;
  };

  // Add Landed Cost to Shipment and Allocate
  const addLandedCostToShipment = (shipmentId, costData, allocationMethod = 'value') => {
    const costNo = `LC-${Math.floor(1000 + Math.random() * 9000)}`;
    const lkrAmount = Number(costData.lkr_amount) || (Number(costData.foreign_amount || 0) * Number(costData.exchange_rate || 1));

    setTransitShipments(prev => prev.map(shp => {
      if (shp.id !== shipmentId) return shp;

      const newCost = {
        ...costData,
        id: 'lc-' + Date.now(),
        cost_no: costNo,
        lkr_amount: lkrAmount,
        allocation_method: allocationMethod
      };

      const updatedCosts = [...(shp.landed_costs || []), newCost];
      const totalExpenses = updatedCosts.reduce((sum, c) => sum + (Number(c.lkr_amount) || 0), 0);

      // Re-allocate all expenses across items
      let totalDenominator = 0;
      if (allocationMethod === 'value') {
        totalDenominator = shp.items.reduce((s, it) => s + (it.foreign_unit_cost * it.shipped_qty), 0);
      } else if (allocationMethod === 'quantity') {
        totalDenominator = shp.items.reduce((s, it) => s + it.shipped_qty, 0);
      } else if (allocationMethod === 'weight') {
        totalDenominator = shp.items.reduce((s, it) => s + ((it.weight_kg || 1) * it.shipped_qty), 0);
      }
      if (totalDenominator <= 0) totalDenominator = 1;

      const updatedItems = shp.items.map(it => {
        let allocatedLkr = 0;
        if (allocationMethod === 'value') {
          allocatedLkr = totalExpenses * ((it.foreign_unit_cost * it.shipped_qty) / totalDenominator);
        } else if (allocationMethod === 'quantity') {
          allocatedLkr = totalExpenses * (it.shipped_qty / totalDenominator);
        } else if (allocationMethod === 'weight') {
          allocatedLkr = totalExpenses * (((it.weight_kg || 1) * it.shipped_qty) / totalDenominator);
        }
        const perUnitLanded = it.shipped_qty > 0 ? (allocatedLkr / it.shipped_qty) : 0;
        const finalUnitCost = (it.foreign_unit_cost * shp.exchange_rate_snapshot) + perUnitLanded;

        return {
          ...it,
          allocated_landed_lkr_per_unit: Number(perUnitLanded.toFixed(4)),
          final_landed_unit_cost_lkr: Number(finalUnitCost.toFixed(4))
        };
      });

      return {
        ...shp,
        landed_costs: updatedCosts,
        total_landed_expenses_lkr: totalExpenses,
        total_estimated_cost_lkr: (shp.foreign_items_subtotal * shp.exchange_rate_snapshot) + totalExpenses,
        items: updatedItems
      };
    }));

    notifySuccess(`Landed cost ${costData.expense_type} added and allocated by ${allocationMethod}`);
  };

  // Receive Purchase Shipment (GRN & WAC Update)
  const receivePurchaseShipment = (receiptData) => {
    const grnNo = `GRN-${new Date().toISOString().slice(0,7).replace('-','')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const { transit_shipment_id, items, advance_ids_to_apply = [], receipt_date = new Date().toISOString().slice(0,10), notes = '' } = receiptData;

    const shipment = transitShipments.find(s => s.id === transit_shipment_id);
    if (!shipment) {
      notifyError('Shipment not found');
      return null;
    }

    let foreignSubtotal = 0;
    let itemsLkrTotal = 0;
    let landedExpensesTotal = 0;

    items.forEach(it => {
      const sellable = Number(it.received_sellable_qty) || 0;
      const damaged = Number(it.damaged_qty) || 0;
      const fCost = Number(it.foreign_unit_cost) || 0;
      const landedPerUnit = Number(it.allocated_landed_lkr_per_unit) || 0;

      foreignSubtotal += fCost * (sellable + damaged);
      itemsLkrTotal += (fCost * shipment.exchange_rate_snapshot) * (sellable + damaged);
      landedExpensesTotal += landedPerUnit * (sellable + damaged);
    });

    const totalLandedLkr = itemsLkrTotal + landedExpensesTotal;
    const supplierPayableLkr = itemsLkrTotal;

    // Apply Supplier Advances
    let advAppliedTotal = 0;
    advance_ids_to_apply.forEach(advId => {
      const adv = supplierAdvances.find(a => a.id === advId);
      if (adv && adv.unallocated_lkr_amount > 0) {
        const canApply = Math.min(adv.unallocated_lkr_amount, (supplierPayableLkr - advAppliedTotal));
        advAppliedTotal += canApply;
        // Update advance allocation
        setSupplierAdvances(prev => prev.map(a => a.id === advId ? {
          ...a,
          allocated_lkr_amount: a.allocated_lkr_amount + canApply,
          unallocated_lkr_amount: a.unallocated_lkr_amount - canApply
        } : a));
      }
    });

    const remainingPayable = supplierPayableLkr - advAppliedTotal;

    // Create GRN Record
    const newGrn = {
      id: 'grn-' + Date.now(),
      grn_no: grnNo,
      transit_shipment_id,
      supplier_id: shipment.supplier_id,
      supplier_name: suppliers.find(s => s.id === shipment.supplier_id)?.name || 'Supplier',
      receipt_date,
      currency: shipment.currency,
      exchange_rate_snapshot: shipment.exchange_rate_snapshot,
      foreign_subtotal: foreignSubtotal,
      items_lkr_total: itemsLkrTotal,
      landed_expenses_lkr_total: landedExpensesTotal,
      total_landed_lkr: totalLandedLkr,
      supplier_goods_payable_lkr: supplierPayableLkr,
      advance_applied_lkr: advAppliedTotal,
      remaining_payable_lkr: remainingPayable,
      items,
      notes,
      created_at: new Date().toISOString()
    };

    setPurchases(prev => [newGrn, ...prev]);

    // Update Stock Balances, Weighted Average Costing, and Stock Movements
    setStockBalances(prev => {
      const updated = { ...prev };
      items.forEach(it => {
        const prodId = it.product_id;
        const sellable = Number(it.received_sellable_qty) || 0;
        const damaged = Number(it.damaged_qty) || 0;
        const missing = Number(it.missing_qty) || 0;
        const landedCost = Number(it.final_landed_unit_cost_lkr) || 0;

        const curStock = updated[prodId] || { qty_on_hand: 0, qty_reserved: 0, qty_available: 0, qty_in_transit: 0, qty_damaged: 0 };
        const oldOnHand = curStock.qty_on_hand;

        // Recalculate WAC
        setProducts(prodPrev => prodPrev.map(p => {
          if (p.id === prodId) {
            const oldWac = p.weighted_cost_lkr || 0;
            const newWac = (oldOnHand + sellable) > 0 ? ((oldOnHand * oldWac) + (sellable * landedCost)) / (oldOnHand + sellable) : landedCost;
            return {
              ...p,
              weighted_cost_lkr: Number(newWac.toFixed(4)),
              last_landed_cost_lkr: Number(landedCost.toFixed(4)),
              last_purchase_cost_foreign: it.foreign_unit_cost,
              last_foreign_currency: shipment.currency
            };
          }
          return p;
        }));

        updated[prodId] = {
          ...curStock,
          qty_on_hand: oldOnHand + sellable,
          qty_available: (oldOnHand + sellable) - curStock.qty_reserved,
          qty_damaged: curStock.qty_damaged + damaged,
          qty_in_transit: Math.max(0, curStock.qty_in_transit - (sellable + damaged + missing))
        };

        // Log Stock Movement
        if (sellable > 0) {
          setStockMovements(mvPrev => [{
            id: 'mv-' + Date.now() + Math.random(),
            product_id: prodId,
            movement_type: 'purchase_receipt',
            reference_doc_type: 'purchase_receipts',
            reference_doc_no: grnNo,
            qty_change: sellable,
            unit_cost_snapshot: landedCost,
            balance_after: oldOnHand + sellable,
            created_at: new Date().toISOString()
          }, ...mvPrev]);
        }
      });
      return updated;
    });

    // Update Supplier balance
    setSuppliers(prev => prev.map(s => {
      if (s.id === shipment.supplier_id) {
        return {
          ...s,
          current_advance_balance: Math.max(0, (s.current_advance_balance || 0) - advAppliedTotal),
          current_payable: (s.current_payable || 0) + remainingPayable
        };
      }
      return s;
    }));

    // Update Shipment Status
    setTransitShipments(prev => prev.map(s => {
      if (s.id === transit_shipment_id) {
        return { ...s, status: 'received' };
      }
      return s;
    }));

    notifySuccess(`GRN ${grnNo} processed. Received items into Available Stock!`);
    return newGrn;
  };

  // Post Sales Document (Quotation, Sales Order, Invoice)
  const postSalesDocument = (docData) => {
    const { doc_type = 'sales_invoice', customer_id, items = [], payments = [], margin_override_reason = '', notes = '' } = docData;
    const prefix = doc_type === 'quotation' ? 'QT' : doc_type === 'sales_order' ? 'SO' : doc_type === 'sales_invoice' ? 'INV' : doc_type === 'credit_note' ? 'CN' : 'EX';
    const docNo = `${prefix}-${new Date().toISOString().slice(0,7).replace('-','')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const customer = customers.find(c => c.id === customer_id);

    // Calculate totals
    let subtotal = 0;
    let lineDiscountTotal = 0;
    let totalCost = 0;

    const processedItems = items.map(it => {
      const product = products.find(p => p.id === it.product_id);
      const baseQty = it.unit_type === 'carton' ? it.qty * (product?.carton_units || 1) : it.unit_type === 'pack' ? it.qty * (product?.pack_size || 1) : it.qty;
      const unitCost = product?.weighted_cost_lkr || 0;
      const lineCost = unitCost * baseQty;
      totalCost += lineCost;

      const lineTotal = Number(it.line_total) || (Number(it.unit_price) * Number(it.qty) - Number(it.line_discount || 0));
      subtotal += (Number(it.unit_price) * Number(it.qty));
      lineDiscountTotal += Number(it.line_discount || 0);

      return {
        ...it,
        id: 'sdi-' + Math.random().toString(36).substr(2, 9),
        product,
        base_qty: baseQty,
        unit_cost_snapshot: unitCost,
        line_profit: lineTotal - lineCost,
        line_profit_pct: lineTotal > 0 ? Number((((lineTotal - lineCost) / lineTotal) * 100).toFixed(2)) : 0
      };
    });

    const docDiscount = Number(docData.doc_discount_total) || 0;
    const taxTotal = Number(docData.tax_total) || 0;
    const grandTotal = subtotal - lineDiscountTotal - docDiscount + taxTotal;

    const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const balanceDue = Math.max(0, grandTotal - totalPaid);

    const grossProfit = grandTotal - taxTotal - totalCost;
    const grossProfitPct = grandTotal > 0 ? Number(((grossProfit / grandTotal) * 100).toFixed(2)) : 0;

    const newDoc = {
      ...docData,
      id: 'doc-' + Date.now(),
      doc_no: docNo,
      doc_type,
      customer_id,
      customer,
      doc_date: docData.doc_date || new Date().toISOString().slice(0, 10),
      due_date: docData.due_date || (customer ? new Date(Date.now() + (customer.credit_days || 30) * 86400000).toISOString().slice(0, 10) : null),
      subtotal,
      line_discount_total: lineDiscountTotal,
      doc_discount_total: docDiscount,
      tax_total: taxTotal,
      grand_total: grandTotal,
      paid_amount: totalPaid,
      balance_due: balanceDue,
      total_cost_snapshot: totalCost,
      gross_profit: grossProfit,
      gross_profit_pct: grossProfitPct,
      status: doc_type === 'quotation' ? 'draft' : doc_type === 'sales_order' ? 'confirmed' : 'completed',
      payment_status: totalPaid >= grandTotal ? 'paid' : totalPaid > 0 ? 'partially_paid' : doc_type === 'sales_invoice' ? 'credit' : 'unpaid',
      items: processedItems,
      payments,
      margin_override_reason,
      notes,
      created_at: new Date().toISOString()
    };

    setSalesDocuments(prev => [newDoc, ...prev]);

    // Deduct or Reserve stock
    if (doc_type === 'sales_invoice') {
      setStockBalances(prev => {
        const updated = { ...prev };
        processedItems.forEach(it => {
          const cur = updated[it.product_id] || { qty_on_hand: 0, qty_reserved: 0, qty_available: 0, qty_in_transit: 0, qty_damaged: 0 };
          updated[it.product_id] = {
            ...cur,
            qty_on_hand: Math.max(0, cur.qty_on_hand - it.base_qty),
            qty_available: Math.max(0, (cur.qty_on_hand - it.base_qty) - cur.qty_reserved)
          };

          setStockMovements(mvPrev => [{
            id: 'mv-' + Date.now() + Math.random(),
            product_id: it.product_id,
            movement_type: 'sales_invoice',
            reference_doc_type: 'sales_invoice',
            reference_doc_no: docNo,
            qty_change: -it.base_qty,
            unit_cost_snapshot: it.unit_cost_snapshot,
            balance_after: cur.qty_on_hand - it.base_qty,
            created_at: new Date().toISOString()
          }, ...mvPrev]);
        });
        return updated;
      });

      // Update customer receivable
      if (customer_id && balanceDue > 0) {
        setCustomers(prev => prev.map(c => c.id === customer_id ? {
          ...c,
          current_receivable: (c.current_receivable || 0) + balanceDue
        } : c));
      }
    } else if (doc_type === 'sales_order') {
      // Reserve stock
      setStockBalances(prev => {
        const updated = { ...prev };
        processedItems.forEach(it => {
          const cur = updated[it.product_id] || { qty_on_hand: 0, qty_reserved: 0, qty_available: 0, qty_in_transit: 0, qty_damaged: 0 };
          updated[it.product_id] = {
            ...cur,
            qty_reserved: cur.qty_reserved + it.base_qty,
            qty_available: Math.max(0, cur.qty_on_hand - (cur.qty_reserved + it.base_qty))
          };
        });
        return updated;
      });
    }

    // Process Payments & Cheques
    payments.forEach(p => {
      const payNo = `PAY-${Math.floor(1000 + Math.random() * 9000)}`;
      let chequeId = null;

      if (p.payment_method === 'cheque') {
        const newCheque = {
          id: 'chq-' + Date.now() + Math.random(),
          cheque_no: p.cheque_no || 'CHQ-' + Math.floor(100000 + Math.random() * 900000),
          direction: 'received',
          party_type: 'customer',
          party_id: customer_id,
          party_name: customer?.business_name || 'Customer',
          sales_document_id: newDoc.id,
          sales_doc_no: docNo,
          bank_name: p.cheque_bank || 'Commercial Bank',
          branch: p.cheque_branch || 'Main',
          cheque_date: p.cheque_date || new Date().toISOString().slice(0, 10),
          received_or_issued_date: new Date().toISOString().slice(0, 10),
          amount: Number(p.amount),
          status: 'received',
          notes: p.notes || `Received for invoice ${docNo}`,
          created_at: new Date().toISOString()
        };
        chequeId = newCheque.id;
        setCheques(prev => [newCheque, ...prev]);
      }

      const newPayment = {
        id: 'pay-' + Date.now() + Math.random(),
        payment_no: payNo,
        payment_type: 'customer_payment',
        party_type: 'customer',
        party_id: customer_id,
        payment_date: docData.doc_date || new Date().toISOString().slice(0, 10),
        amount: Number(p.amount),
        payment_method: p.payment_method,
        bank_account_id: p.bank_account_id,
        cheque_id: chequeId,
        reference: docNo,
        notes: p.notes,
        created_at: new Date().toISOString()
      };

      setPayments(prev => [newPayment, ...prev]);

      // Direct Bank/Card updates bank account balance immediately
      if (['bank', 'card'].includes(p.payment_method) && p.bank_account_id) {
        setBankAccounts(prev => prev.map(b => b.id === p.bank_account_id ? {
          ...b,
          current_balance: (b.current_balance || 0) + Number(p.amount)
        } : b));
      }
    });

    notifySuccess(`${doc_type.toUpperCase().replace('_', ' ')} ${docNo} created successfully!`);
    return newDoc;
  };

  // Update Cheque Status
  const updateChequeStatus = (chequeId, newStatus, extraData = {}) => {
    const cheque = cheques.find(c => c.id === chequeId);
    if (!cheque) return;

    setCheques(prev => prev.map(c => {
      if (c.id === chequeId) {
        return {
          ...c,
          status: newStatus,
          deposit_bank_account_id: extraData.deposit_bank_account_id || c.deposit_bank_account_id,
          cleared_date: newStatus === 'cleared' ? (extraData.cleared_date || new Date().toISOString().slice(0,10)) : c.cleared_date,
          return_date: newStatus === 'returned' ? new Date().toISOString().slice(0,10) : c.return_date,
          return_reason: extraData.return_reason || c.return_reason,
          notes: extraData.notes || c.notes,
          updated_at: new Date().toISOString()
        };
      }
      return c;
    }));

    if (cheque.direction === 'received') {
      if (newStatus === 'cleared') {
        const bankId = extraData.deposit_bank_account_id || cheque.deposit_bank_account_id || bankAccounts[0]?.id;
        setBankAccounts(prev => prev.map(b => b.id === bankId ? { ...b, current_balance: (b.current_balance || 0) + cheque.amount } : b));
        notifySuccess(`Cheque #${cheque.cheque_no} marked CLEARED into Bank Account!`);
      } else if (newStatus === 'returned') {
        // Reopen Customer Receivable
        if (cheque.party_id) {
          setCustomers(prev => prev.map(c => c.id === cheque.party_id ? { ...c, current_receivable: (c.current_receivable || 0) + cheque.amount } : c));
        }
        // Reopen sales document if linked
        if (cheque.sales_document_id) {
          setSalesDocuments(prev => prev.map(d => d.id === cheque.sales_document_id ? {
            ...d,
            balance_due: (d.balance_due || 0) + cheque.amount,
            paid_amount: Math.max(0, (d.paid_amount || 0) - cheque.amount),
            payment_status: 'credit'
          } : d));
        }
        notifyError(`Cheque #${cheque.cheque_no} marked RETURNED/BOUNCED. Customer receivable reopened!`);
      }
    }
  };

  return (
    <BusinessContext.Provider value={{
      companySettings, setCompanySettings,
      currencies, setCurrencies,
      categories, setCategories,
      brands, setBrands,
      products, setProducts, saveProduct,
      stockBalances, setStockBalances,
      customers, setCustomers, saveCustomer,
      suppliers, setSuppliers, saveSupplier,
      bankAccounts, setBankAccounts,
      supplierOrders, setSupplierOrders, createSupplierOrder,
      supplierAdvances, setSupplierAdvances, recordSupplierAdvance,
      transitShipments, setTransitShipments, createTransitShipment, addLandedCostToShipment,
      purchases, setPurchases, receivePurchaseShipment,
      salesDocuments, setSalesDocuments, postSalesDocument,
      cheques, setCheques, updateChequeStatus,
      payments, setPayments,
      stockMovements, setStockMovements
    }}>
      {children}
    </BusinessContext.Provider>
  );
}

export const useBusiness = () => useContext(BusinessContext);
""")

print("BusinessContext created.")
