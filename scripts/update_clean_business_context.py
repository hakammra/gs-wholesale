import os

content = '''import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNotification } from './NotificationContext';
import { firstCell } from '../lib/exportUtils';

const BusinessContext = createContext();

// Clean initial state (No dummy products, customers, suppliers or orders)
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
  { id: 'cat-8', name: 'PC Cases & Cooling', code: 'CASE' },
  { id: 'cat-9', name: 'Networking & Cables', code: 'NET' },
  { id: 'cat-10', name: 'Computer Accessories', code: 'ACC' }
];

const INITIAL_BRANDS = [
  { id: 'b-1', name: 'Kingston', country: 'USA' },
  { id: 'b-2', name: 'Samsung', country: 'South Korea' },
  { id: 'b-3', name: 'Crucial', country: 'USA' },
  { id: 'b-4', name: 'Lexar', country: 'China' },
  { id: 'b-5', name: 'Hikvision', country: 'China' },
  { id: 'b-6', name: 'ASUS', country: 'Taiwan' },
  { id: 'b-7', name: 'MSI', country: 'Taiwan' },
  { id: 'b-8', name: 'Gigabyte', country: 'Taiwan' },
  { id: 'b-9', name: 'Western Digital', country: 'USA' }
];

const INITIAL_BANK_ACCOUNTS = [
  { id: 'ba-1', account_name: 'Cash on Hand - Main Drawer', account_number: 'CASH-001', bank_name: 'Cash In Hand', current_balance: 0.0 },
  { id: 'ba-2', account_name: 'Commercial Bank - Wholesale Current', account_number: '1000123456', bank_name: 'Commercial Bank', current_balance: 0.0 },
  { id: 'ba-3', account_name: 'Sampath Bank - Corporate', account_number: '002910004567', bank_name: 'Sampath Bank', current_balance: 0.0 }
];

// Clean Storage Migration: Auto-purge dummy cached data from prior runs
const CLEAN_STORAGE_VERSION = 'gs_wholesale_clean_v3';
if (typeof window !== 'undefined' && localStorage.getItem('gs_wholesale_storage_version') !== CLEAN_STORAGE_VERSION) {
  [
    'gs_wholesale_products',
    'gs_wholesale_stock',
    'gs_wholesale_customers',
    'gs_wholesale_suppliers',
    'gs_wholesale_supplier_orders',
    'gs_wholesale_advances',
    'gs_wholesale_transit',
    'gs_wholesale_purchases',
    'gs_wholesale_sales_docs',
    'gs_wholesale_cheques',
    'gs_wholesale_payments',
    'gs_wholesale_stock_movements'
  ].forEach(k => localStorage.removeItem(k));
  localStorage.setItem('gs_wholesale_storage_version', CLEAN_STORAGE_VERSION);
}

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

  // Empty initial operational states (clean for user import)
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_products');
    return saved ? JSON.parse(saved) : [];
  });

  const [stockBalances, setStockBalances] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_stock');
    return saved ? JSON.parse(saved) : {};
  });

  const [customers, setCustomers] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_customers');
    return saved ? JSON.parse(saved) : [];
  });

  const [suppliers, setSuppliers] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_suppliers');
    return saved ? JSON.parse(saved) : [];
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
    localStorage.setItem('gs_wholesale_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('gs_wholesale_brands', JSON.stringify(brands));
  }, [brands]);

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

  // EXCEL PRODUCT IMPORT ENGINE
  const importProductsFromExcel = async (rows) => {
    if (!rows || !rows.length) throw new Error('The selected Excel file has no rows.');

    let importedCount = 0;
    let skippedCount = 0;
    const currentCategories = [...categories];
    const currentProducts = [...products];
    const currentBalances = { ...stockBalances };

    for (const row of rows) {
      const itemCode = String(firstCell(row, ['sku', 'code', 'item code', 'product code', 'product_code', 'sku/code', 'item_code', 'itemcode'])).trim();
      const name = String(firstCell(row, ['name', 'product name', 'description', 'item name', 'product_name', 'itemname'])).trim();

      if (!itemCode || !name) {
        skippedCount++;
        continue;
      }

      // Auto-match or create Category
      const categoryName = String(firstCell(row, ['category', 'productgroup', 'group', 'product group', 'group name', 'category_name'])).trim();
      let categoryId = null;
      if (categoryName) {
        let existingCat = currentCategories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
        if (!existingCat) {
          existingCat = {
            id: 'cat-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            name: categoryName,
            code: categoryName.substring(0, 4).toUpperCase()
          };
          currentCategories.push(existingCat);
        }
        categoryId = existingCat.id;
      }

      // Auto-match Brand
      const brandName = String(firstCell(row, ['brand', 'brand name', 'manufacturer'])).trim();
      let brandId = null;
      if (brandName) {
        let existingBrand = brands.find(b => b.name.toLowerCase() === brandName.toLowerCase());
        if (existingBrand) brandId = existingBrand.id;
      }

      const barcode = String(firstCell(row, ['barcode', 'bar code', 'upc', 'ean'])).trim();
      const model = String(firstCell(row, ['model', 'specs', 'specification', 'part number'])).trim();
      const cost = Number(firstCell(row, ['cost', 'cost price', 'cost price (lkr)', 'average cost', 'avg cost', 'avg_cost', 'weighted cost', 'weighted_cost_lkr'])) || 0;
      
      let wholesalePrice = Number(firstCell(row, ['price', 'wholesale price', 'wholesale price (lkr)', 'wholesale_price', 'selling price', 'selling_price', 'sale price'])) || 0;
      if (wholesalePrice <= 0 && cost > 0) wholesalePrice = Math.round(cost * 1.15);

      let dealerPrice = Number(firstCell(row, ['dealer price', 'dealer price (lkr)', 'dealer_price', 'dealer'])) || 0;
      if (dealerPrice <= 0 && wholesalePrice > 0) dealerPrice = Math.round(wholesalePrice * 0.95);

      const packSize = Math.max(1, Math.round(Number(firstCell(row, ['pack size', 'pack_size', 'pack', 'pack quantity', 'units per pack'])) || 1));
      const cartonUnits = Math.max(1, Math.round(Number(firstCell(row, ['carton units', 'carton_units', 'carton', 'case size', 'units per carton'])) || (packSize > 1 ? packSize * 10 : 1)));
      const lowStock = Math.max(1, Math.round(Number(firstCell(row, ['low stock', 'low stock level', 'min stock', 'minimum stock', 'reorder level'])) || 5));
      const qty = Math.max(0, Math.round(Number(firstCell(row, ['stock quantity', 'stock', 'quantity', 'qty', 'on hand', 'sellable stock', 'initial stock'])) || 0));
      const statusRaw = String(firstCell(row, ['status', 'active'])).trim().toLowerCase();
      const status = ['inactive', 'disabled', 'false', '0', 'no'].includes(statusRaw) ? 'inactive' : 'active';

      const existingIdx = currentProducts.findIndex(p => p.item_code.toLowerCase() === itemCode.toLowerCase());
      const prodId = existingIdx >= 0 ? currentProducts[existingIdx].id : ('p-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5));

      const productObj = {
        id: prodId,
        item_code: itemCode,
        name,
        category_id: categoryId,
        brand_id: brandId,
        barcode: barcode || null,
        model: model || null,
        unit_name: 'Unit',
        pack_size: packSize,
        carton_units: cartonUnits,
        wholesale_price: wholesalePrice,
        dealer_price: dealerPrice,
        retail_price: wholesalePrice * 1.25,
        weighted_cost_lkr: cost,
        last_landed_cost_lkr: cost,
        min_profit_pct: 5.0,
        low_stock_threshold: lowStock,
        is_wholesale_active: status === 'active',
        is_active: status === 'active',
        created_at: new Date().toISOString()
      };

      if (existingIdx >= 0) {
        currentProducts[existingIdx] = { ...currentProducts[existingIdx], ...productObj };
      } else {
        currentProducts.push(productObj);
      }

      currentBalances[prodId] = {
        qty_on_hand: qty,
        qty_available: qty,
        qty_reserved: 0,
        qty_in_transit: 0,
        qty_damaged: 0
      };

      importedCount++;
    }

    setCategories(currentCategories);
    setProducts(currentProducts);
    setStockBalances(currentBalances);

    return { importedCount, skippedCount, total: rows.length };
  };

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
      order_date: new Date().toISOString().slice(0, 10),
      status: 'ordered',
      created_at: new Date().toISOString()
    };
    setSupplierOrders(prev => [newOrder, ...prev]);
    return newOrder;
  };

  // Record Supplier Advance (Pre-payment)
  const recordSupplierAdvance = (advanceData) => {
    const advNo = `ADV-${new Date().toISOString().slice(0,7).replace('-','')}-${Math.floor(100 + Math.random() * 900)}`;
    const lkrAmount = (Number(advanceData.foreign_amount) || 0) * (Number(advanceData.exchange_rate) || 1);

    const newAdv = {
      ...advanceData,
      id: 'adv-' + Date.now(),
      advance_no: advNo,
      payment_date: new Date().toISOString().slice(0, 10),
      lkr_amount: lkrAmount,
      unallocated_lkr_amount: lkrAmount,
      created_at: new Date().toISOString()
    };

    setSupplierAdvances(prev => [newAdv, ...prev]);

    // Update supplier advance balance
    setSuppliers(prev => prev.map(s => s.id === advanceData.supplier_id ? {
      ...s,
      current_advance_balance: (s.current_advance_balance || 0) + lkrAmount
    } : s));

    // Deduct from bank account
    if (advanceData.bank_account_id) {
      setBankAccounts(prev => prev.map(b => b.id === advanceData.bank_account_id ? {
        ...b,
        current_balance: (b.current_balance || 0) - lkrAmount
      } : b));
    }

    // Add cashflow payment record
    setPayments(prev => [{
      id: 'pay-' + Date.now(),
      payment_no: `PAY-ADV-${Date.now().toString().slice(-4)}`,
      payment_date: new Date().toISOString().slice(0, 10),
      payment_type: 'supplier_advance',
      party_type: 'supplier',
      party_id: advanceData.supplier_id,
      amount: lkrAmount,
      currency: 'LKR',
      payment_method: advanceData.payment_method || 'bank',
      bank_account_id: advanceData.bank_account_id,
      reference: advanceData.reference || advNo,
      created_at: new Date().toISOString()
    }, ...prev]);

    return newAdv;
  };

  // Create Stock in Transit Shipment
  const createTransitShipment = (shipmentData) => {
    const shpNo = `TRN-SHP-${new Date().toISOString().slice(0,7).replace('-','')}-${Math.floor(100 + Math.random() * 900)}`;
    const foreignSubtotal = (shipmentData.items || []).reduce((sum, it) => sum + ((Number(it.shipped_qty) || 0) * (Number(it.foreign_unit_cost) || 0)), 0);
    const rate = Number(shipmentData.exchange_rate_snapshot) || 305.5;
    const lkrFob = foreignSubtotal * rate;

    const newShp = {
      ...shipmentData,
      id: 'trn-' + Date.now(),
      shipment_no: shpNo,
      status: 'in_transit',
      foreign_items_subtotal: foreignSubtotal,
      total_landed_expenses_lkr: 0,
      total_estimated_cost_lkr: lkrFob,
      landed_expenses: [],
      items: (shipmentData.items || []).map(it => ({
        ...it,
        allocated_landed_lkr_per_unit: 0,
        final_landed_unit_cost_lkr: (Number(it.foreign_unit_cost) || 0) * rate
      })),
      created_at: new Date().toISOString()
    };

    setTransitShipments(prev => [newShp, ...prev]);

    // Update product stock_in_transit balances
    setStockBalances(prev => {
      const updated = { ...prev };
      (shipmentData.items || []).forEach(it => {
        const pId = it.product_id;
        const cur = updated[pId] || { qty_on_hand: 0, qty_reserved: 0, qty_available: 0, qty_in_transit: 0, qty_damaged: 0 };
        updated[pId] = {
          ...cur,
          qty_in_transit: (cur.qty_in_transit || 0) + Number(it.shipped_qty)
        };
      });
      return updated;
    });

    // Update supplier order status
    if (shipmentData.supplier_order_id) {
      setSupplierOrders(prev => prev.map(o => o.id === shipmentData.supplier_order_id ? { ...o, status: 'dispatched' } : o));
    }

    return newShp;
  };

  // Add Landed Cost Expense to Shipment
  const addLandedCostExpense = (shipmentId, expenseData) => {
    const expenseLkr = (Number(expenseData.amount) || 0) * (Number(expenseData.exchange_rate) || 1.0);

    setTransitShipments(prev => prev.map(shp => {
      if (shp.id !== shipmentId) return shp;

      const newExpense = {
        ...expenseData,
        id: 'exp-' + Date.now(),
        amount_lkr: expenseLkr,
        created_at: new Date().toISOString()
      };

      const updatedExpenses = [...(shp.landed_expenses || []), newExpense];
      const totalLandedExpenses = updatedExpenses.reduce((s, e) => s + (e.amount_lkr || 0), 0);
      const totalCostLkr = (shp.foreign_items_subtotal * (shp.exchange_rate_snapshot || 305.5)) + totalLandedExpenses;

      // Allocate landed expenses proportionally to items by foreign value
      const totalForeignValue = (shp.items || []).reduce((s, it) => s + (it.shipped_qty * it.foreign_unit_cost), 0) || 1;

      const updatedItems = (shp.items || []).map(it => {
        const itemVal = it.shipped_qty * it.foreign_unit_cost;
        const valueRatio = itemVal / totalForeignValue;
        const itemAllocatedLandedLkr = totalLandedExpenses * valueRatio;
        const itemAllocatedPerUnit = itemAllocatedLandedLkr / (it.shipped_qty || 1);
        const itemFobLkrPerUnit = it.foreign_unit_cost * (shp.exchange_rate_snapshot || 305.5);
        const finalLandedUnitCost = itemFobLkrPerUnit + itemAllocatedPerUnit;

        return {
          ...it,
          allocated_landed_lkr_per_unit: itemAllocatedPerUnit,
          final_landed_unit_cost_lkr: finalLandedUnitCost
        };
      });

      return {
        ...shp,
        landed_expenses: updatedExpenses,
        total_landed_expenses_lkr: totalLandedExpenses,
        total_estimated_cost_lkr: totalCostLkr,
        items: updatedItems
      };
    }));

    // Deduct from bank account
    if (expenseData.bank_account_id) {
      setBankAccounts(prev => prev.map(b => b.id === expenseData.bank_account_id ? {
        ...b,
        current_balance: (b.current_balance || 0) - expenseLkr
      } : b));
    }

    notifySuccess('Landed expense recorded & item unit costs updated!');
  };

  // Receive Purchase Shipment (GRN) & Re-average WAC
  const receivePurchaseShipment = (receiptData) => {
    const shp = transitShipments.find(s => s.id === receiptData.transit_shipment_id);
    const grnNo = `GRN-${new Date().toISOString().slice(0,7).replace('-','')}-${Math.floor(100 + Math.random() * 900)}`;

    const totalLandedLkr = shp ? shp.total_estimated_cost_lkr : 0;
    const foreignSubtotal = shp ? shp.foreign_items_subtotal : 0;
    const landedExpensesLkr = shp ? shp.total_landed_expenses_lkr : 0;

    // Calculate advance application
    let advanceAppliedTotal = 0;
    const appliedAdvances = (receiptData.advance_ids_to_apply || []);

    const newGRN = {
      ...receiptData,
      id: 'grn-' + Date.now(),
      grn_no: grnNo,
      supplier_id: shp?.supplier_id,
      supplier_name: suppliers.find(s => s.id === shp?.supplier_id)?.name || 'Foreign Supplier',
      currency: shp?.currency || 'USD',
      foreign_subtotal: foreignSubtotal,
      landed_expenses_lkr_total: landedExpensesLkr,
      total_landed_lkr: totalLandedLkr,
      advance_applied_lkr: advanceAppliedTotal,
      remaining_payable_lkr: Math.max(0, (foreignSubtotal * (shp?.exchange_rate_snapshot || 305.5)) - advanceAppliedTotal),
      created_at: new Date().toISOString()
    };

    setPurchases(prev => [newGRN, ...prev]);

    // Update stock balances, WAC, and create movements
    setProducts(prevProducts => {
      return prevProducts.map(p => {
        const receivedItem = (receiptData.items || []).find(it => it.product_id === p.id);
        if (!receivedItem) return p;

        const currentStock = stockBalances[p.id]?.qty_on_hand || 0;
        const currentWAC = p.weighted_cost_lkr || 0;
        const receivedQty = Number(receivedItem.received_sellable_qty) || 0;
        const receivedUnitCost = Number(receivedItem.final_landed_unit_cost_lkr) || currentWAC;

        // Weighted Average Cost formula
        let newWAC = currentWAC;
        if (currentStock + receivedQty > 0) {
          newWAC = ((currentStock * currentWAC) + (receivedQty * receivedUnitCost)) / (currentStock + receivedQty);
        }

        return {
          ...p,
          weighted_cost_lkr: Number(newWAC.toFixed(2)),
          last_landed_cost_lkr: Number(receivedUnitCost.toFixed(2))
        };
      });
    });

    setStockBalances(prev => {
      const updated = { ...prev };
      (receiptData.items || []).forEach(it => {
        const pId = it.product_id;
        const cur = updated[pId] || { qty_on_hand: 0, qty_reserved: 0, qty_available: 0, qty_in_transit: 0, qty_damaged: 0 };
        const sellable = Number(it.received_sellable_qty) || 0;
        const damaged = Number(it.damaged_qty) || 0;
        const shipped = Number(it.shipped_qty) || 0;

        updated[pId] = {
          ...cur,
          qty_on_hand: (cur.qty_on_hand || 0) + sellable,
          qty_available: (cur.qty_available || 0) + sellable,
          qty_in_transit: Math.max(0, (cur.qty_in_transit || 0) - shipped),
          qty_damaged: (cur.qty_damaged || 0) + damaged
        };
      });
      return updated;
    });

    // Mark transit shipment as received
    if (receiptData.transit_shipment_id) {
      setTransitShipments(prev => prev.map(s => s.id === receiptData.transit_shipment_id ? { ...s, status: 'received' } : s));
    }

    return newGRN;
  };

  // Post Sales Document (Quotation, Sales Order, Invoice)
  const postSalesDocument = (docData) => {
    const prefix = docData.doc_type === 'quotation' ? 'QT' : docData.doc_type === 'sales_order' ? 'SO' : 'INV';
    const docNo = `${prefix}-${new Date().toISOString().slice(0,7).replace('-','')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const itemsSubtotal = (docData.items || []).reduce((sum, it) => sum + ((it.qty * it.unit_price) - (it.discount_amount || 0)), 0);
    const grandTotal = Math.max(0, itemsSubtotal - (docData.discount_amount || 0));

    let paidAmount = 0;
    if (docData.payment_lines && docData.doc_type === 'sales_invoice') {
      paidAmount = docData.payment_lines.reduce((s, p) => p.method !== 'credit' ? s + (Number(p.amount) || 0) : s, 0);
    }
    const balanceDue = grandTotal - paidAmount;
    const paymentStatus = balanceDue <= 0.01 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';

    const newDoc = {
      ...docData,
      id: 'doc-' + Date.now(),
      doc_no: docNo,
      doc_date: new Date().toISOString().slice(0, 10),
      items_subtotal: itemsSubtotal,
      grand_total: grandTotal,
      paid_amount: paidAmount,
      balance_due: balanceDue,
      payment_status: paymentStatus,
      created_at: new Date().toISOString()
    };

    setSalesDocuments(prev => [newDoc, ...prev]);

    // If Invoice: Deduct sellable stock & handle customer receivable
    if (docData.doc_type === 'sales_invoice') {
      setStockBalances(prev => {
        const updated = { ...prev };
        (docData.items || []).forEach(it => {
          const pId = it.product.id;
          const cur = updated[pId] || { qty_on_hand: 0, qty_reserved: 0, qty_available: 0, qty_in_transit: 0, qty_damaged: 0 };
          const baseQty = it.unit_type === 'carton' ? it.qty * (it.product.carton_units || 1) : it.unit_type === 'pack' ? it.qty * (it.product.pack_size || 1) : it.qty;

          updated[pId] = {
            ...cur,
            qty_on_hand: Math.max(0, (cur.qty_on_hand || 0) - baseQty),
            qty_available: Math.max(0, (cur.qty_available || 0) - baseQty)
          };
        });
        return updated;
      });

      // Update customer receivable
      if (docData.customer_id && balanceDue > 0) {
        setCustomers(prev => prev.map(c => c.id === docData.customer_id ? {
          ...c,
          current_receivable: (c.current_receivable || 0) + balanceDue
        } : c));
      }

      // Handle post-dated cheques
      if (docData.cheque_details && docData.payment_lines?.some(p => p.method === 'cheque')) {
        const chequeLine = docData.payment_lines.find(p => p.method === 'cheque');
        const newCheque = {
          id: 'chq-' + Date.now(),
          direction: 'received',
          party_type: 'customer',
          party_id: docData.customer_id,
          party_name: docData.customer_name,
          sales_doc_id: newDoc.id,
          sales_doc_no: docNo,
          cheque_no: docData.cheque_details.cheque_no,
          bank_name: docData.cheque_details.bank_name,
          branch: docData.cheque_details.branch,
          cheque_date: docData.cheque_details.cheque_date,
          amount: Number(chequeLine.amount) || 0,
          status: 'received',
          created_at: new Date().toISOString()
        };
        setCheques(prev => [newCheque, ...prev]);
      }

      // Handle Cash / Bank deposits
      (docData.payment_lines || []).forEach(p => {
        if (p.method === 'cash' || p.method === 'bank') {
          const amt = Number(p.amount) || 0;
          if (amt > 0) {
            setPayments(prev => [{
              id: 'pay-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
              payment_no: `PAY-INV-${Date.now().toString().slice(-4)}`,
              payment_date: new Date().toISOString().slice(0, 10),
              payment_type: 'sales_receipt',
              party_type: 'customer',
              party_id: docData.customer_id,
              sales_doc_id: newDoc.id,
              amount: amt,
              currency: 'LKR',
              payment_method: p.method,
              bank_account_id: p.bank_account_id,
              reference: p.reference || docNo,
              created_at: new Date().toISOString()
            }, ...prev]);

            if (p.bank_account_id) {
              setBankAccounts(prev => prev.map(b => b.id === p.bank_account_id ? {
                ...b,
                current_balance: (b.current_balance || 0) + amt
              } : b));
            }
          }
        }
      });
    }

    return newDoc;
  };

  // Convert Quotation -> Sales Order -> Invoice
  const convertDocument = (sourceDocId, targetType) => {
    const source = salesDocuments.find(d => d.id === sourceDocId);
    if (!source) return;

    return postSalesDocument({
      doc_type: targetType,
      customer_id: source.customer_id,
      customer_name: source.customer_name,
      customer_phone: source.customer_phone,
      items: source.items,
      discount_amount: source.discount_amount,
      notes: `Converted from ${source.doc_no}`
    });
  };

  // Update Cheque Status (Clear or Bounce)
  const updateChequeStatus = (chequeId, newStatus, extraData = {}) => {
    const chq = cheques.find(c => c.id === chequeId);
    if (!chq) return;

    setCheques(prev => prev.map(c => c.id === chequeId ? {
      ...c,
      status: newStatus,
      deposit_bank_account_id: extraData.deposit_bank_account_id || c.deposit_bank_account_id,
      return_reason: extraData.return_reason || c.return_reason,
      cleared_at: newStatus === 'cleared' ? new Date().toISOString() : c.cleared_at,
      returned_at: newStatus === 'returned' ? new Date().toISOString() : c.returned_at
    } : c));

    // If Cleared: Deposit into bank account
    if (newStatus === 'cleared' && extraData.deposit_bank_account_id) {
      setBankAccounts(prev => prev.map(b => b.id === extraData.deposit_bank_account_id ? {
        ...b,
        current_balance: (b.current_balance || 0) + chq.amount
      } : b));
    }

    // If Bounced: Reopen customer receivable and reopen invoice balance
    if (newStatus === 'returned') {
      if (chq.party_id) {
        setCustomers(prev => prev.map(c => c.id === chq.party_id ? {
          ...c,
          current_receivable: (c.current_receivable || 0) + chq.amount
        } : c));
      }

      if (chq.sales_doc_id) {
        setSalesDocuments(prev => prev.map(d => d.id === chq.sales_doc_id ? {
          ...d,
          paid_amount: Math.max(0, (d.paid_amount || 0) - chq.amount),
          balance_due: (d.balance_due || 0) + chq.amount,
          payment_status: 'unpaid'
        } : d));
      }
    }
  };

  return (
    <BusinessContext.Provider value={{
      companySettings, setCompanySettings,
      currencies, setCurrencies,
      categories, setCategories,
      brands, setBrands,
      products, setProducts, saveProduct, importProductsFromExcel,
      stockBalances, setStockBalances,
      stockMovements, setStockMovements,
      customers, setCustomers, saveCustomer,
      suppliers, setSuppliers, saveSupplier,
      bankAccounts, setBankAccounts,
      supplierOrders, setSupplierOrders, createSupplierOrder,
      supplierAdvances, setSupplierAdvances, recordSupplierAdvance,
      transitShipments, setTransitShipments, createTransitShipment, addLandedCostExpense,
      purchases, setPurchases, receivePurchaseShipment,
      salesDocuments, setSalesDocuments, postSalesDocument, convertDocument,
      cheques, setCheques, updateChequeStatus,
      payments, setPayments
    }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (!context) throw new Error('useBusiness must be used within BusinessProvider');
  return context;
}
'''

with open('src/context/BusinessContext.jsx', 'w', encoding='utf-8') as f:
    f.write(content.strip() + '\n')
print("Clean BusinessContext.jsx written successfully.")
