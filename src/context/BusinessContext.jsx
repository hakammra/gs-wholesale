import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNotification } from './NotificationContext';
import { firstCell } from '../lib/exportUtils';

const BusinessContext = createContext();

const INITIAL_COMPANY = {
  business_name: 'Gatronix Store - Wholesale',
  tagline: 'Direct Importers & Wholesale Computer Components',
  phone: '0766600466',
  whatsapp: '0766600466',
  email: 'gatronix11@gmail.com',
  address: '43/H1, Kandy Road, 20260 Madawala Bazaar',
  address_line1: '43/H1, Kandy Road',
  address_line2: '20260 Madawala Bazaar',
  tax_number: '',
  base_currency: 'LKR',
  default_credit_days: 30,
  min_profit_pct: 5.0,
  is_tax_enabled: false,
  default_tax_pct: 0.0,
  default_landed_cost_allocation: 'value',
  default_invoice_paper_size: 'A4',
  logo_url: '',
  footer_text: 'Created with Gatronix POS - www.gatronix.com'
};

const INITIAL_CURRENCIES = [
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs.', exchange_rate_to_lkr: 1.0, is_base: true },
  { code: 'USD', name: 'US Dollar', symbol: '$', exchange_rate_to_lkr: 305.5, is_base: false },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', exchange_rate_to_lkr: 42.8, is_base: false },
  { code: 'EUR', name: 'Euro', symbol: '€', exchange_rate_to_lkr: 332.0, is_base: false }
];

const INITIAL_CATEGORIES = [];

const INITIAL_BRANDS = [];

const INITIAL_BANK_ACCOUNTS = [];

export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try { return crypto.randomUUID(); } catch (e) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const isValidUUID = (str) => {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
};

const safeGet = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    if (!saved || saved === 'undefined' || saved === 'null') return fallback;
    return JSON.parse(saved);
  } catch (e) {
    return fallback;
  }
};

export function BusinessProvider({ children }) {
  const { notifySuccess, notifyError, notifyWarning, notifyInfo } = useNotification();
  const [dataLoading, setDataLoading] = useState(false);
  const [syncState, setSyncState] = useState({
    status: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'connecting',
    lastSyncedAt: null,
    pendingWrites: 0,
    error: ''
  });
  const fetchInFlightRef = useRef(null);
  const realtimeRefreshTimerRef = useRef(null);

  // States initialized safely from local storage cache
  const [companySettings, setCompanySettings] = useState(() => {
    const saved = safeGet('gs_wholesale_settings', null);
    if (saved && typeof saved === 'object' && Object.keys(saved).length > 0) {
      return saved;
    }
    return INITIAL_COMPANY;
  });
  const [currencies, setCurrencies] = useState(() => safeGet('gs_wholesale_currencies', INITIAL_CURRENCIES));
  const [categories, setCategories] = useState(() => safeGet('gs_wholesale_categories', INITIAL_CATEGORIES));
  const [brands, setBrands] = useState(() => safeGet('gs_wholesale_brands', INITIAL_BRANDS));
  const [products, setProducts] = useState(() => safeGet('gs_wholesale_products', []));
  const [stockBalances, setStockBalances] = useState(() => safeGet('gs_wholesale_stock', {}));
  const [customers, setCustomers] = useState(() => safeGet('gs_wholesale_customers', []));
  const [suppliers, setSuppliers] = useState(() => safeGet('gs_wholesale_suppliers', []));
  const [bankAccounts, setBankAccounts] = useState(() => safeGet('gs_wholesale_bank_accounts', INITIAL_BANK_ACCOUNTS));
  const [supplierOrders, setSupplierOrders] = useState(() => safeGet('gs_wholesale_supplier_orders', []));
  const [supplierAdvances, setSupplierAdvances] = useState(() => safeGet('gs_wholesale_advances', []));
  const [transitShipments, setTransitShipments] = useState(() => safeGet('gs_wholesale_transit', []));
  const [purchases, setPurchases] = useState(() => safeGet('gs_wholesale_purchases', []));
  const [salesDocuments, setSalesDocuments] = useState(() => safeGet('gs_wholesale_sales_docs', []));
  const [cheques, setCheques] = useState(() => safeGet('gs_wholesale_cheques', []));
  const [payments, setPayments] = useState(() => safeGet('gs_wholesale_payments', []));
  const [stockMovements, setStockMovements] = useState(() => safeGet('gs_wholesale_stock_movements', []));

  // Sync to local storage for instant render
  useEffect(() => { localStorage.setItem('gs_wholesale_settings', JSON.stringify(companySettings)); }, [companySettings]);
  useEffect(() => { localStorage.setItem('gs_wholesale_currencies', JSON.stringify(currencies)); }, [currencies]);
  useEffect(() => { localStorage.setItem('gs_wholesale_categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('gs_wholesale_brands', JSON.stringify(brands)); }, [brands]);
  useEffect(() => { localStorage.setItem('gs_wholesale_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('gs_wholesale_stock', JSON.stringify(stockBalances)); }, [stockBalances]);
  useEffect(() => { localStorage.setItem('gs_wholesale_customers', JSON.stringify(customers)); }, [customers]);
  useEffect(() => { localStorage.setItem('gs_wholesale_suppliers', JSON.stringify(suppliers)); }, [suppliers]);
  useEffect(() => { localStorage.setItem('gs_wholesale_bank_accounts', JSON.stringify(bankAccounts)); }, [bankAccounts]);
  useEffect(() => { localStorage.setItem('gs_wholesale_supplier_orders', JSON.stringify(supplierOrders)); }, [supplierOrders]);
  useEffect(() => { localStorage.setItem('gs_wholesale_advances', JSON.stringify(supplierAdvances)); }, [supplierAdvances]);
  useEffect(() => { localStorage.setItem('gs_wholesale_transit', JSON.stringify(transitShipments)); }, [transitShipments]);
  useEffect(() => { localStorage.setItem('gs_wholesale_purchases', JSON.stringify(purchases)); }, [purchases]);
  useEffect(() => { localStorage.setItem('gs_wholesale_sales_docs', JSON.stringify(salesDocuments)); }, [salesDocuments]);
  useEffect(() => { localStorage.setItem('gs_wholesale_cheques', JSON.stringify(cheques)); }, [cheques]);
  useEffect(() => { localStorage.setItem('gs_wholesale_payments', JSON.stringify(payments)); }, [payments]);
  useEffect(() => { localStorage.setItem('gs_wholesale_stock_movements', JSON.stringify(stockMovements)); }, [stockMovements]);

  // LOAD AUTHORITATIVE DATA FROM SUPABASE. Local storage is only a startup cache;
  // successful cloud reads always replace it, including when a table is empty.
  const fetchSupabaseData = useCallback(async () => {
    if (!supabase) return false;
    if (fetchInFlightRef.current) return fetchInFlightRef.current;

    const request = (async () => {
      setDataLoading(true);
      setSyncState(prev => ({ ...prev, status: 'syncing', error: '' }));

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setSyncState(prev => ({ ...prev, status: 'offline', error: 'No internet connection' }));
        setDataLoading(false);
        return false;
      }

      try {
        const queryEntries = await Promise.all([
          supabase.from('categories').select('*').order('sort_order', { ascending: true }),
          supabase.from('brands').select('*').order('name', { ascending: true }),
          supabase.from('products').select('*').order('created_at', { ascending: false }),
          supabase.from('stock_balances').select('*'),
          supabase.from('sales_documents').select('*, items:sales_document_items(*, product:products(name, item_code)), customer:customers(business_name, billing_address, phone)').order('created_at', { ascending: false }),
          supabase.from('customers').select('*').order('business_name', { ascending: true }),
          supabase.from('suppliers').select('*').order('name', { ascending: true }),
          supabase.from('bank_accounts').select('*').order('created_at', { ascending: true }),
          supabase.from('purchase_receipts').select('*, items:purchase_receipt_items(*, product:products(name, item_code)), supplier:suppliers(name), transit_shipment:transit_shipments(shipment_no)').order('created_at', { ascending: false }),
          supabase.from('transit_shipments').select('*, items:transit_shipment_items(*), landed_expenses:landed_costs(*), supplier:suppliers(name)').order('created_at', { ascending: false }),
          supabase.from('cheque_register').select('*').order('created_at', { ascending: false }),
          supabase.from('payments').select('*').order('created_at', { ascending: false }),
          supabase.from('currencies').select('*').order('code', { ascending: true }),
          supabase.from('company_settings').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('audit_log').select('details').eq('entity_type', 'company_logo').order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('supplier_orders').select('*, items:supplier_order_items(*), supplier:suppliers(name)').order('created_at', { ascending: false }),
          supabase.from('supplier_advances').select('*').order('created_at', { ascending: false }),
          supabase.from('stock_movements').select('*').order('created_at', { ascending: false })
        ]);

        const labels = [
          'categories', 'brands', 'products', 'stock balances', 'sales documents',
          'customers', 'suppliers', 'bank accounts', 'purchase receipts',
          'transit shipments', 'cheques', 'payments', 'currencies',
          'company settings', 'company logo', 'supplier orders',
          'supplier advances', 'stock movements'
        ];
        const failures = queryEntries
          .map((result, index) => result.error ? `${labels[index]}: ${result.error.message}` : null)
          .filter(Boolean);

        const [
          catRes, brandRes, prodRes, stockRes, docRes, custRes, suppRes,
          bankRes, grnRes, trnRes, chqRes, payRes, currRes, compRes,
          logoRes, orderRes, advanceRes, movementRes
        ] = queryEntries;

        const prodData = prodRes.error ? null : (prodRes.data || []);
        const grnData = grnRes.error ? null : (grnRes.data || []);
        const docData = docRes.error ? null : (docRes.data || []);

        if (!catRes.error) setCategories(catRes.data || []);
        if (!brandRes.error) setBrands(brandRes.data || []);

        if (prodData) {
          const remoteReceiptItems = (grnData || []).flatMap(receipt => receipt.items || []);
          setProducts(prodData.map(remoteProduct => {
            const productReceipts = remoteReceiptItems.filter(item => item.product_id === remoteProduct.id);
            const totals = productReceipts.reduce((acc, item) => {
              const qty = Number(item.received_sellable_qty) || 0;
              const cost = Number(item.final_landed_unit_cost_lkr) || 0;
              return qty > 0 && cost > 0
                ? { qty: acc.qty + qty, cost: acc.cost + (qty * cost), last: cost }
                : acc;
            }, { qty: 0, cost: 0, last: Number(remoteProduct.last_landed_cost_lkr) || 0 });
            const weightedCost = totals.qty > 0
              ? totals.cost / totals.qty
              : Number(remoteProduct.weighted_cost_lkr) || 0;
            return {
              ...remoteProduct,
              weighted_cost_lkr: Number(weightedCost.toFixed(2)),
              cost_price: Number(weightedCost.toFixed(2)),
              cost: Number(weightedCost.toFixed(2)),
              last_landed_cost_lkr: Number(totals.last.toFixed(2))
            };
          }));
        }

        if (!stockRes.error) {
          const nextBalances = {};
          (prodData || []).forEach(product => {
            nextBalances[product.id] = { qty_on_hand: 0, qty_reserved: 0, qty_available: 0, qty_in_transit: 0, qty_damaged: 0 };
          });
          (stockRes.data || []).forEach(balance => {
            const onHand = Number(balance.qty_on_hand) || 0;
            const reserved = Number(balance.qty_reserved) || 0;
            nextBalances[balance.product_id] = {
              ...balance,
              qty_on_hand: onHand,
              qty_reserved: reserved,
              qty_available: balance.qty_available == null ? Math.max(0, onHand - reserved) : Number(balance.qty_available) || 0,
              qty_in_transit: Number(balance.qty_in_transit) || 0,
              qty_damaged: Number(balance.qty_damaged) || 0
            };
          });
          setStockBalances(nextBalances);
        }

        if (docData) {
          setSalesDocuments(docData.map(document => {
            const isActiveReservation = document.doc_type === 'sales_order' && document.status === 'confirmed';
            return {
              ...document,
              discount_amount: Number(document.doc_discount_total) || 0,
              status: isActiveReservation ? 'reserved' : document.status,
              payment_status: isActiveReservation && document.payment_status === 'unpaid'
                ? 'reserved'
                : document.payment_status === 'partially_paid' ? 'partial' : document.payment_status,
              customer_name: document.customer?.business_name || 'Cash / Counter Customer',
              customer_phone: document.customer?.phone || '',
              items: (document.items || []).map(item => ({
                ...item,
                discount_amount: Number(item.line_discount) || 0,
                is_warranty_replacement: String(item.notes || '').toLowerCase().includes('warranty replacement'),
                warranty_note: String(item.notes || '').toLowerCase().includes('warranty replacement') ? item.notes : '',
                product_name: item.product?.name || 'Product Item',
                item_code: item.product?.item_code || '',
                product: item.product || null
              }))
            };
          }));
        }

        if (!custRes.error) {
          setCustomers((custRes.data || []).map(customer => {
            const invoices = (docData || []).filter(document =>
              document.doc_type === 'sales_invoice' &&
              document.status !== 'cancelled' &&
              document.customer_id === customer.id
            );
            const receivable = invoices.reduce((sum, document) => sum + Math.max(0, Number(document.balance_due) || 0), 0);
            return { ...customer, current_receivable: invoices.length ? receivable : Number(customer.current_receivable) || 0 };
          }));
        }

        if (!suppRes.error) setSuppliers(suppRes.data || []);
        if (!bankRes.error) setBankAccounts(bankRes.data || []);

        const receivedTransitIds = new Set((grnData || []).map(receipt => receipt.transit_shipment_id).filter(Boolean));
        if (grnData) {
          setPurchases(grnData.map(receipt => ({
            ...receipt,
            doc_no: receipt.grn_no,
            total_amount_lkr: Number(receipt.total_landed_lkr) || 0,
            supplier_name: receipt.supplier?.name || 'Supplier',
            shipment_no: receipt.transit_shipment?.shipment_no || '',
            status: receipt.is_fully_received ? 'received' : 'draft',
            items: (receipt.items || []).map(item => {
              const qty = Number(item.received_sellable_qty) || 0;
              const cost = Number(item.final_landed_unit_cost_lkr) || 0;
              return {
                ...item,
                product_name: item.product?.name || 'Product Item',
                item_code: item.product?.item_code || '',
                product: item.product || null,
                qty,
                shipped_qty: qty,
                unit_cost_lkr: cost
              };
            })
          })));
        }

        if (!trnRes.error) {
          setTransitShipments((trnRes.data || [])
            .filter(shipment => !shipment.shipment_no?.startsWith('DIR-TRN-') && !shipment.notes?.includes('Direct purchase companion'))
            .map(shipment => ({
              ...shipment,
              status: shipment.status === 'preparing'
                ? 'draft'
                : (shipment.status === 'received' || receivedTransitIds.has(shipment.id) ? 'arrived' : shipment.status),
              supplier_name: shipment.supplier?.name || 'Supplier',
              items: (shipment.items || []).map(item => ({
                ...item,
                qty: Number(item.shipped_qty) || 0,
                unit_cost: Number(item.foreign_unit_cost) || 0
              }))
            })));
        }

        if (!chqRes.error) setCheques((chqRes.data || []).map(cheque => {
          const linkedDocument = (docData || []).find(document => document.id === cheque.sales_document_id);
          const linkedPurchase = (grnData || []).find(receipt => receipt.id === cheque.purchase_receipt_id);
          const linkedTransit = (trnRes.data || []).find(shipment => shipment.id === cheque.transit_shipment_id);
          const linkedCustomer = (custRes.data || []).find(customer => customer.id === cheque.party_id);
          const linkedSupplier = (suppRes.data || []).find(supplier => supplier.id === cheque.party_id);
          return {
            ...cheque,
            sales_doc_id: cheque.sales_document_id,
            sales_doc_no: linkedDocument?.doc_no || linkedPurchase?.grn_no || linkedTransit?.shipment_no || '',
            party_name: linkedCustomer?.business_name || linkedSupplier?.name || 'Other'
          };
        }));
        if (!payRes.error) setPayments(payRes.data || []);
        if (!currRes.error) setCurrencies(currRes.data || []);
        if (!orderRes.error) setSupplierOrders((orderRes.data || []).map(order => ({
          ...order,
          exchange_rate_snapshot: Number(order.exchange_rate_estimate) || 1,
          supplier_name: order.supplier?.name || 'Supplier'
        })));
        if (!advanceRes.error) setSupplierAdvances(advanceRes.data || []);
        if (!movementRes.error) setStockMovements(movementRes.data || []);

        if (!compRes.error) {
          if (compRes.data) {
            const addressParts = (compRes.data.address || '').split(',').map(part => part.trim()).filter(Boolean);
            setCompanySettings({
              ...compRes.data,
              address_line1: addressParts.length > 1 ? addressParts.slice(0, -1).join(', ') : (compRes.data.address || ''),
              address_line2: addressParts.length > 1 ? addressParts[addressParts.length - 1] : '',
              logo_url: logoRes.error ? '' : (logoRes.data?.details?.logo_url || '')
            });
          } else {
            setCompanySettings(INITIAL_COMPANY);
          }
        }

        const syncedAt = new Date().toISOString();
        if (failures.length) {
          console.warn('Supabase partial refresh:', failures);
          setSyncState(prev => ({ ...prev, status: 'error', lastSyncedAt: syncedAt, error: failures.join(' | ') }));
          return false;
        }

        setSyncState(prev => ({ ...prev, status: prev.pendingWrites > 0 ? 'syncing' : 'synced', lastSyncedAt: syncedAt, error: '' }));
        return true;
      } catch (error) {
        console.warn('Supabase refresh failed; cached data remains available:', error);
        setSyncState(prev => ({ ...prev, status: navigator.onLine ? 'error' : 'offline', error: error.message || String(error) }));
        return false;
      } finally {
        setDataLoading(false);
      }
    })();

    fetchInFlightRef.current = request;
    try {
      return await request;
    } finally {
      fetchInFlightRef.current = null;
    }
  }, []);

  const runCloudWrite = async (label, operation) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const offlineError = new Error(`${label} was not saved because this device is offline.`);
      setSyncState(prev => ({ ...prev, status: 'offline', error: offlineError.message }));
      notifyError(offlineError.message);
      throw offlineError;
    }

    setSyncState(prev => ({ ...prev, status: 'syncing', pendingWrites: prev.pendingWrites + 1, error: '' }));
    try {
      const result = await operation();
      if (result?.error) throw result.error;
      setSyncState(prev => ({
        ...prev,
        status: prev.pendingWrites <= 1 ? 'synced' : 'syncing',
        pendingWrites: Math.max(0, prev.pendingWrites - 1),
        lastSyncedAt: new Date().toISOString(),
        error: ''
      }));
      return result?.data;
    } catch (error) {
      const message = error?.message || String(error);
      console.error(`${label} failed:`, error);
      setSyncState(prev => ({ ...prev, status: 'error', pendingWrites: Math.max(0, prev.pendingWrites - 1), error: message }));
      notifyError(`${label} was not saved to the cloud: ${message}`);
      setTimeout(() => fetchSupabaseData(), 0);
      throw error;
    }
  };

  const runCloudBatch = (label, operations) => runCloudWrite(label, async () => {
    const results = await Promise.all(operations);
    const failed = results.find(result => result?.error);
    return failed || { data: results.map(result => result?.data) };
  });

  const adjustBankBalance = async (label, bankAccountId, delta) => {
    if (!isValidUUID(bankAccountId) || !Number.isFinite(Number(delta)) || Number(delta) === 0) return;
    await runCloudWrite(label, () => supabase.rpc('rpc_adjust_bank_balance', {
      p_bank_account_id: bankAccountId,
      p_delta: Number(delta)
    }));
    setBankAccounts(prev => prev.map(account => account.id === bankAccountId
      ? { ...account, current_balance: (Number(account.current_balance) || 0) + Number(delta) }
      : account));
  };

  const reversePaymentBalance = async (payment, label = 'Reversing payment balance') => {
    const amount = Number(payment?.amount) || 0;
    if (!amount) return;
    const outflowTypes = new Set(['transit_purchase_payment', 'purchase_payment', 'operational_expense', 'supplier_advance', 'expense', 'customer_refund']);
    if (isValidUUID(payment.bank_account_id)) {
      await adjustBankBalance(label, payment.bank_account_id, outflowTypes.has(payment.payment_type) ? amount : -amount);
      return;
    }
    if (payment.payment_method === 'cheque') {
      const cheque = cheques.find(item => item.id === payment.cheque_id || item.payment_id === payment.id);
      if (cheque?.status === 'cleared' && isValidUUID(cheque.deposit_bank_account_id)) {
        await adjustBankBalance(label, cheque.deposit_bank_account_id, cheque.direction === 'issued' ? amount : -amount);
      }
    }
  };

  const adjustCustomerBalance = async (label, customerId, receivableDelta = 0, creditDelta = 0) => {
    if (!isValidUUID(customerId)) return;
    await runCloudWrite(label, () => supabase.rpc('rpc_adjust_customer_balance', {
      p_customer_id: customerId,
      p_receivable_delta: Number(receivableDelta) || 0,
      p_credit_delta: Number(creditDelta) || 0
    }));
    setCustomers(prev => prev.map(customer => customer.id === customerId ? {
      ...customer,
      current_receivable: Math.max(0, (Number(customer.current_receivable) || 0) + (Number(receivableDelta) || 0)),
      unallocated_credit: Math.max(0, (Number(customer.unallocated_credit) || 0) + (Number(creditDelta) || 0))
    } : customer));
  };

  const adjustSupplierBalance = async (label, supplierId, payableDelta = 0, advanceDelta = 0) => {
    if (!isValidUUID(supplierId)) return;
    await runCloudWrite(label, () => supabase.rpc('rpc_adjust_supplier_balance', {
      p_supplier_id: supplierId,
      p_payable_delta: Number(payableDelta) || 0,
      p_advance_delta: Number(advanceDelta) || 0
    }));
    setSuppliers(prev => prev.map(supplier => supplier.id === supplierId ? {
      ...supplier,
      current_payable: Math.max(0, (Number(supplier.current_payable) || 0) + (Number(payableDelta) || 0)),
      current_advance_balance: Math.max(0, (Number(supplier.current_advance_balance) || 0) + (Number(advanceDelta) || 0))
    } : supplier));
  };

  // Realtime is the primary cross-device path; focus/visibility and polling are
  // fallbacks for suspended mobile tabs and temporarily disconnected sockets.
  useEffect(() => {
    fetchSupabaseData();

    const scheduleRefresh = () => {
      clearTimeout(realtimeRefreshTimerRef.current);
      realtimeRefreshTimerRef.current = setTimeout(fetchSupabaseData, 350);
    };
    const handleFocus = () => fetchSupabaseData();
    const handleVisibility = () => document.visibilityState === 'visible' && fetchSupabaseData();
    const handleOnline = () => {
      setSyncState(prev => ({ ...prev, status: 'connecting', error: '' }));
      fetchSupabaseData();
    };
    const handleOffline = () => setSyncState(prev => ({ ...prev, status: 'offline', error: 'No internet connection' }));

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibility);

    const realtimeChannel = supabase
      .channel('gs-wholesale-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public' }, scheduleRefresh)
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setSyncState(prev => ({ ...prev, status: navigator.onLine ? 'reconnecting' : 'offline' }));
        }
      });

    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchSupabaseData();
    }, 30000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearTimeout(realtimeRefreshTimerRef.current);
      clearInterval(pollInterval);
      supabase.removeChannel(realtimeChannel);
    };
  }, [fetchSupabaseData]);

  // EXCEL PRODUCT IMPORT ENGINE (Direct Supabase Upsert)
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

      // Auto-match or create hierarchical Category folders (e.g. "Components / RAM / Desktop RAM")
      const rawCatPath = String(firstCell(row, ['category', 'productgroup', 'group', 'product group', 'group name', 'category_name'])).trim();
      let categoryId = null;
      if (rawCatPath) {
        const parts = rawCatPath.split(/[/›>]/).map(s => s.trim()).filter(Boolean);
        let parentId = null;
        for (const part of parts) {
          let found = currentCategories.find(c => c.name.toLowerCase() === part.toLowerCase() && (parentId ? c.parent_id === parentId : !c.parent_id));
          if (!found) {
            found = {
              id: 'cat-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
              name: part,
              parent_id: parentId,
              code: part.substring(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, ''),
              sort_order: 0,
              is_active: true,
              created_at: new Date().toISOString()
            };
            currentCategories.push(found);
            try {
              if (supabase) await supabase.from('categories').insert({ name: found.name, code: found.code, parent_id: found.parent_id });
            } catch (e) {}
          }
          parentId = found.id;
          categoryId = found.id;
        }
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

      const existingIdx = currentProducts.findIndex(p => p.item_code?.toLowerCase() === itemCode.toLowerCase());
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

      // Push to Supabase
      try {
        if (supabase) {
          const { data: dbProd } = await supabase.from('products').upsert({
            item_code: itemCode,
            name,
            category_id: categoryId,
            brand_id: brandId,
            barcode: barcode || null,
            model: model || null,
            wholesale_price: wholesalePrice,
            dealer_price: dealerPrice,
            weighted_cost_lkr: cost,
            pack_size: packSize,
            carton_units: cartonUnits,
            low_stock_threshold: lowStock,
            is_wholesale_active: status === 'active',
            is_active: status === 'active'
          }, { onConflict: 'item_code' }).select('id').single();

          if (dbProd?.id && qty > 0) {
            await supabase.from('stock_balances').upsert({
              product_id: dbProd.id,
              qty_on_hand: qty,
              qty_available: qty
            }, { onConflict: 'product_id' });
          }
        }
      } catch (e) {
        console.warn('Supabase product upsert warning:', e);
      }

      importedCount++;
    }

    setCategories(currentCategories);
    setProducts(currentProducts);
    setStockBalances(currentBalances);

    return { importedCount, skippedCount, total: rows.length };
  };

  // Category Folder CRUD & Path Helper
  const getCategoryPath = useCallback((catId) => {
    if (!catId) return '';
    const catMap = new Map(categories.map(c => [c.id, c]));
    const names = [];
    let currentId = catId;
    let depth = 0;
    while (currentId && depth < 10) {
      const cat = catMap.get(currentId);
      if (!cat) break;
      names.unshift(cat.name);
      currentId = cat.parent_id;
      depth++;
    }
    return names.join(' › ');
  }, [categories]);

  // Save & Persist Company Settings Safely to Supabase Cloud
  const saveCompanySettings = async (settingsData) => {
    const combinedAddress = [settingsData.address_line1, settingsData.address_line2].filter(Boolean).join(', ') || settingsData.address || '';

    const validCompanyPayload = {
      business_name: settingsData.business_name || 'Gatronix Store - Wholesale',
      tagline: settingsData.tagline || '',
      tax_number: settingsData.tax_number || '',
      phone: settingsData.phone || '',
      whatsapp: settingsData.whatsapp || '',
      email: settingsData.email || '',
      address: combinedAddress,
      base_currency: settingsData.base_currency || 'LKR',
      default_credit_days: Number(settingsData.default_credit_days) || 30,
      min_profit_pct: Number(settingsData.min_profit_pct) || 5,
      is_tax_enabled: Boolean(settingsData.is_tax_enabled),
      default_tax_pct: Number(settingsData.default_tax_pct) || 0,
      default_landed_cost_allocation: settingsData.default_landed_cost_allocation || 'value',
      default_invoice_paper_size: settingsData.default_invoice_paper_size || 'A4',
      updated_at: new Date().toISOString()
    };

    const updatedProfile = {
      ...settingsData,
      address: combinedAddress
    };

    setCompanySettings(updatedProfile);

    try {
      localStorage.setItem('gs_wholesale_settings', JSON.stringify(updatedProfile));
      localStorage.setItem('gs_wholesale_settings_user_customized', 'true');

      if (supabase) {
        const { data: existing } = await supabase.from('company_settings').select('id').order('updated_at', { ascending: false }).limit(1);
        if (existing && existing.length > 0) {
          const { error: upErr } = await supabase.from('company_settings').update(validCompanyPayload).eq('id', existing[0].id);
          if (upErr) throw upErr;
        } else {
          const { error: inErr } = await supabase.from('company_settings').insert([{
            ...validCompanyPayload,
            id: generateUUID(),
            created_at: new Date().toISOString()
          }]);
          if (inErr) throw inErr;
        }

        // Save Logo in Supabase Cloud
        if (settingsData.logo_url !== undefined) {
          await supabase.from('audit_log').insert({
            action: 'save_app_asset',
            entity_type: 'company_logo',
            details: { logo_url: settingsData.logo_url || '' }
          });
        }
      }
    } catch (e) {
      console.error('Failed to sync company_settings to Supabase:', e);
      notifyError('Failed to save settings to cloud: ' + (e.message || e));
      throw e;
    }

    notifySuccess('Company profile and settings saved successfully');
    return updatedProfile;
  };

  const saveCategory = async (catData) => {
    const targetId = catData.id || generateUUID();
    const sanitizedParentId = isValidUUID(catData.parent_id) ? catData.parent_id : null;

    if (catData.id) {
      setCategories(prev => prev.map(c => c.id === catData.id ? { ...c, ...catData, parent_id: sanitizedParentId, updated_at: new Date().toISOString() } : c));
      await runCloudWrite('Updating category', () => supabase.from('categories').update({
        name: catData.name,
        parent_id: sanitizedParentId,
        sort_order: catData.sort_order || 0,
        is_active: catData.is_active !== false
      }).eq('id', catData.id));
      notifySuccess(`Category folder "${catData.name}" updated`);
    } else {
      const newCat = {
        ...catData,
        id: targetId,
        parent_id: sanitizedParentId,
        sort_order: catData.sort_order || 0,
        is_active: true,
        created_at: new Date().toISOString()
      };
      setCategories(prev => [...prev, newCat]);
      await runCloudWrite('Creating category', () => supabase.from('categories').upsert({
        id: newCat.id,
        name: newCat.name,
        parent_id: newCat.parent_id,
        sort_order: newCat.sort_order,
        is_active: true
      }));
      notifySuccess(`Category folder "${newCat.name}" created`);
      return newCat;
    }
  };

  const deleteCategory = async (catId) => {
    const idsToDelete = [catId];
    let added = true;
    while (added) {
      added = false;
      categories.forEach(c => {
        if (c.parent_id && idsToDelete.includes(c.parent_id) && !idsToDelete.includes(c.id)) {
          idsToDelete.push(c.id);
          added = true;
        }
      });
    }

    setCategories(prev => prev.filter(c => !idsToDelete.includes(c.id)));
    setProducts(prev => prev.map(p => idsToDelete.includes(p.category_id) ? { ...p, category_id: null } : p));

    await runCloudWrite('Deleting category', () => supabase.from('categories').delete().in('id', idsToDelete));
    notifySuccess('Category folder deleted');
  };

  const deleteAllCategories = async () => {
    setCategories([]);
    setProducts(prev => prev.map(p => ({ ...p, category_id: null })));
    localStorage.removeItem('gs_wholesale_categories');
    await runCloudWrite('Deleting all categories', () => supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
    notifySuccess('All category folders removed');
  };

  // Brand Management
  const saveBrand = async (brandData) => {
    const targetId = brandData.id || generateUUID();
    if (brandData.id) {
      setBrands(prev => prev.map(b => b.id === brandData.id ? { ...b, ...brandData } : b));
      await runCloudWrite('Updating brand', () => supabase.from('brands').update({
        name: brandData.name,
        country: brandData.country || 'Local'
      }).eq('id', brandData.id));
      notifySuccess(`Brand "${brandData.name}" updated`);
    } else {
      const newB = {
        id: targetId,
        name: brandData.name,
        country: brandData.country || 'Local',
        is_active: true,
        created_at: new Date().toISOString()
      };
      setBrands(prev => [...prev, newB]);
      await runCloudWrite('Creating brand', () => supabase.from('brands').upsert({
        id: newB.id,
        name: newB.name,
        country: newB.country,
        is_active: true
      }));
      notifySuccess(`Brand "${newB.name}" created`);
      return newB;
    }
  };

  const deleteBrand = async (brandId) => {
    setBrands(prev => prev.filter(b => b.id !== brandId));
    setProducts(prev => prev.map(p => p.brand_id === brandId ? { ...p, brand_id: null } : p));
    await runCloudWrite('Deleting brand', () => supabase.from('brands').delete().eq('id', brandId));
    notifySuccess('Brand removed');
  };

  // Product CRUD (Zero initial stock; stock increases via Purchases only)
  const saveProduct = async (productData) => {
    const targetId = productData.id || generateUUID();
    const sanitizedCategoryId = isValidUUID(productData.category_id) ? productData.category_id : null;
    const sanitizedBrandId = isValidUUID(productData.brand_id) ? productData.brand_id : null;

    if (productData.id) {
      setProducts(prev => prev.map(p => p.id === productData.id ? {
        ...p,
        ...productData,
        category_id: sanitizedCategoryId,
        brand_id: sanitizedBrandId,
        updated_at: new Date().toISOString()
      } : p));

      await runCloudWrite('Updating product', () => supabase.from('products').update({
        name: productData.name,
        item_code: productData.item_code,
        barcode: productData.barcode || null,
        model: productData.model || null,
        category_id: sanitizedCategoryId,
        brand_id: sanitizedBrandId,
        wholesale_price: Number(productData.wholesale_price) || 0,
        dealer_price: Number(productData.dealer_price) || 0,
        weighted_cost_lkr: Number(productData.weighted_cost_lkr) || 0,
        low_stock_threshold: Number(productData.low_stock_threshold) || 5,
        is_active: productData.is_active !== false,
        updated_at: new Date().toISOString()
      }).eq('id', productData.id));
      notifySuccess('Product updated successfully');
      return { ...productData, id: productData.id, category_id: sanitizedCategoryId, brand_id: sanitizedBrandId };
    } else {
      const newProd = {
        ...productData,
        id: targetId,
        category_id: sanitizedCategoryId,
        brand_id: sanitizedBrandId,
        item_code: productData.item_code || `PRD-${Date.now().toString().slice(-4)}`,
        weighted_cost_lkr: Number(productData.weighted_cost_lkr) || 0,
        last_landed_cost_lkr: Number(productData.last_landed_cost_lkr) || 0,
        wholesale_price: Number(productData.wholesale_price) || 0,
        dealer_price: Number(productData.dealer_price) || 0,
        low_stock_threshold: Number(productData.low_stock_threshold) || 5,
        is_wholesale_active: true,
        is_active: true,
        created_at: new Date().toISOString()
      };
      
      setProducts(prev => [newProd, ...prev.filter(p => p.id !== newProd.id)]);
      
      // Initial stock is strictly 0. Increased by Purchases only!
      setStockBalances(prev => ({
        ...prev,
        [newProd.id]: prev[newProd.id] || { qty_on_hand: 0, qty_reserved: 0, qty_available: 0, qty_in_transit: 0, qty_damaged: 0 }
      }));

      await runCloudWrite('Creating product', () => supabase.from('products').upsert({
        id: newProd.id,
        name: newProd.name,
        item_code: newProd.item_code,
        barcode: newProd.barcode || null,
        model: newProd.model || null,
        category_id: newProd.category_id,
        brand_id: newProd.brand_id,
        wholesale_price: newProd.wholesale_price,
        dealer_price: newProd.dealer_price,
        weighted_cost_lkr: newProd.weighted_cost_lkr,
        low_stock_threshold: newProd.low_stock_threshold,
        is_wholesale_active: true,
        is_active: true
      }));
      await runCloudWrite('Initializing product stock', () => supabase.from('stock_balances').upsert({
        product_id: newProd.id,
        qty_on_hand: 0,
        qty_reserved: 0,
        qty_available: 0,
        qty_in_transit: 0,
        qty_damaged: 0
      }));
      notifySuccess('Product added! Stock starts at 0 and will increase when purchase documents or transit orders arrive.');
      return newProd;
    }
  };

  const deleteProduct = async (productId) => {
    const prod = products.find(p => p.id === productId);

    // Check if product is referenced in any active documents
    const linkedSales = (salesDocuments || []).filter(d => (d.items || []).some(it => it.product_id === productId));
    const linkedPurchases = (purchases || []).filter(p => (p.items || []).some(it => it.product_id === productId));
    const linkedTransit = (transitShipments || []).filter(s => (s.items || []).some(it => it.product_id === productId));
    const linkedSupplierOrders = (supplierOrders || []).filter(o => (o.items || []).some(it => it.product_id === productId));

    const totalDocCount = linkedSales.length + linkedPurchases.length + linkedTransit.length + linkedSupplierOrders.length;

    if (totalDocCount > 0) {
      const docRefs = [
        ...linkedSales.map(d => d.doc_no),
        ...linkedPurchases.map(p => p.doc_no || p.grn_no),
        ...linkedTransit.map(s => s.shipment_no),
        ...linkedSupplierOrders.map(o => o.order_no)
      ].filter(Boolean);

      const msg = `Cannot delete "${prod?.name || 'product'}": It is currently used in ${totalDocCount} document(s) (${docRefs.slice(0, 3).join(', ')}${docRefs.length > 3 ? '...' : ''}). Please delete or remove it from those document(s) first.`;
      notifyWarning(msg);
      return { success: false, message: msg };
    }

    setProducts(prev => prev.filter(p => p.id !== productId));
    setStockBalances(prev => {
      const updated = { ...prev };
      delete updated[productId];
      return updated;
    });
    await runCloudWrite('Deleting product stock', () => supabase.from('stock_balances').delete().eq('product_id', productId));
    await runCloudWrite('Deleting product', () => supabase.from('products').delete().eq('id', productId));
    notifySuccess('Product deleted successfully');
    return { success: true };
  };

  // Customer CRUD
  const saveCustomer = async (customerData) => {
    const targetId = customerData.id || generateUUID();
    if (customerData.id) {
      setCustomers(prev => prev.map(c => c.id === customerData.id ? { ...c, ...customerData, updated_at: new Date().toISOString() } : c));
      await runCloudWrite('Updating customer', () => supabase.from('customers').update({
        business_name: customerData.business_name,
        contact_person: customerData.contact_person,
        phone: customerData.phone,
        whatsapp: customerData.whatsapp,
        email: customerData.email,
        billing_address: customerData.billing_address,
        price_tier: customerData.price_tier,
        credit_allowed: customerData.credit_allowed,
        credit_limit: customerData.credit_limit,
        credit_days: customerData.credit_days,
        updated_at: new Date().toISOString()
      }).eq('id', customerData.id));
      notifySuccess('Customer profile updated');
      return { ...customerData, id: customerData.id };
    } else {
      const newCust = {
        ...customerData,
        id: targetId,
        customer_code: customerData.customer_code || `CUST-${(customers.length + 1).toString().padStart(3, '0')}`,
        current_receivable: 0,
        unallocated_credit: 0,
        is_active: true,
        created_at: new Date().toISOString()
      };
      setCustomers(prev => [newCust, ...prev]);

      await runCloudWrite('Creating customer', () => supabase.from('customers').upsert({
        id: newCust.id,
        customer_code: newCust.customer_code,
        business_name: newCust.business_name,
        contact_person: newCust.contact_person,
        phone: newCust.phone,
        whatsapp: newCust.whatsapp,
        email: newCust.email,
        billing_address: newCust.billing_address,
        price_tier: newCust.price_tier,
        credit_allowed: newCust.credit_allowed,
        credit_limit: newCust.credit_limit,
        credit_days: newCust.credit_days,
        is_active: true
      }));
      notifySuccess('New customer created');
      return newCust;
    }
  };

  const deleteCustomer = async (customerId) => {
    setCustomers(prev => prev.filter(c => c.id !== customerId));
    await runCloudWrite('Deleting customer', () => supabase.from('customers').delete().eq('id', customerId));
    notifySuccess('Customer deleted');
  };

  // Record Customer Credit Settlement
  const recordCustomerSettlement = async (settlementData) => {
    const amount = Number(settlementData.amount) || 0;
    if (amount <= 0) throw new Error('Payment amount must be greater than 0');

    const customer = customers.find(item =>
      (settlementData.customer_id && String(item.id) === String(settlementData.customer_id)) ||
      (settlementData.customer_name && item.business_name?.trim().toLowerCase() === settlementData.customer_name.trim().toLowerCase())
    );
    const customerId = isValidUUID(customer?.id) ? customer.id : (isValidUUID(settlementData.customer_id) ? settlementData.customer_id : null);
    if (!customerId) throw new Error('Select a valid customer before recording a settlement.');

    const paymentDate = settlementData.payment_date || new Date().toISOString().slice(0, 10);
    const paymentId = generateUUID();
    const paymentNo = `SETTLE-${Date.now().toString().slice(-6)}`;
    const effectiveBankId = isValidUUID(settlementData.bank_account_id)
      ? settlementData.bank_account_id
      : (settlementData.payment_method === 'bank' && isValidUUID(bankAccounts[0]?.id) ? bankAccounts[0].id : null);
    const paymentReference = settlementData.reference || (settlementData.cheque_no ? `Cheque #${settlementData.cheque_no}` : 'Customer Credit Settlement');

    const allocations = [];
    let remaining = amount;
    salesDocuments
      .filter(document => document.customer_id === customerId && document.doc_type !== 'quotation' && document.status !== 'cancelled' && (Number(document.balance_due) || 0) > 0.01)
      .sort((a, b) => new Date(a.doc_date || a.created_at) - new Date(b.doc_date || b.created_at))
      .forEach(document => {
        if (remaining <= 0) return;
        const allocated = Math.min(Number(document.balance_due) || 0, remaining);
        allocations.push({ document, allocated });
        remaining -= allocated;
      });

    await runCloudWrite('Recording customer settlement', () => supabase.from('payments').insert({
      id: paymentId,
      payment_no: paymentNo,
      payment_type: 'customer_settlement',
      party_type: 'customer',
      party_id: customerId,
      payment_date: paymentDate,
      amount,
      payment_method: settlementData.payment_method || 'cash',
      bank_account_id: effectiveBankId,
      cheque_id: null,
      source_key: `customer-settlement:${paymentId}`,
      reference: paymentReference,
      notes: settlementData.notes || null
    }));

    if (allocations.length) {
      await runCloudBatch('Allocating customer settlement', allocations.map(({ document, allocated }) => {
        const nextPaid = (Number(document.paid_amount) || 0) + allocated;
        const nextDue = Math.max(0, (Number(document.balance_due) || 0) - allocated);
        return supabase.from('sales_documents').update({
          paid_amount: nextPaid,
          balance_due: nextDue,
          payment_status: nextDue <= 0.01 ? 'paid' : 'partially_paid',
          status: nextDue <= 0.01 ? 'paid' : 'partially_paid',
          updated_at: new Date().toISOString()
        }).eq('id', document.id);
      }));
    }

    await adjustCustomerBalance('Updating customer balance', customerId, -amount, 0);

    let newCheque = null;
    if (settlementData.payment_method === 'cheque' && settlementData.cheque_no) {
      newCheque = {
        id: generateUUID(),
        cheque_no: settlementData.cheque_no,
        bank_name: settlementData.bank_name || 'Bank',
        branch: settlementData.branch || null,
        party_type: 'customer',
        party_id: customerId,
        payment_id: paymentId,
        party_name: customer?.business_name || settlementData.customer_name || 'Customer',
        direction: 'received',
        amount,
        cheque_date: settlementData.cheque_date || paymentDate,
        received_or_issued_date: paymentDate,
        status: 'received',
        notes: settlementData.notes || 'Customer Settlement Cheque',
        created_at: new Date().toISOString()
      };
      await runCloudWrite('Recording settlement cheque', () => supabase.from('cheque_register').insert({
        id: newCheque.id,
        cheque_no: newCheque.cheque_no,
        bank_name: newCheque.bank_name,
        branch: newCheque.branch,
        party_type: 'customer',
        party_id: customerId,
        direction: 'received',
        amount,
        cheque_date: newCheque.cheque_date,
        received_or_issued_date: paymentDate,
        status: 'received',
        notes: newCheque.notes
      }));
      await runCloudWrite('Linking settlement cheque', () => supabase.from('payments').update({ cheque_id: newCheque.id }).eq('id', paymentId));
    }

    const bankAccount = bankAccounts.find(item => item.id === effectiveBankId);
    if (bankAccount) {
      await adjustBankBalance('Updating bank balance', bankAccount.id, amount);
    }

    const newPayment = {
      id: paymentId,
      payment_no: paymentNo,
      payment_date: paymentDate,
      payment_type: 'customer_settlement',
      party_type: 'customer',
      party_id: customerId,
      customer_name: customer?.business_name || settlementData.customer_name || 'Customer',
      amount,
      currency: 'LKR',
      payment_method: settlementData.payment_method || 'cash',
      bank_account_id: effectiveBankId,
      cheque_id: newCheque?.id || null,
      source_key: `customer-settlement:${paymentId}`,
      reference: paymentReference,
      notes: settlementData.notes || '',
      created_at: new Date().toISOString()
    };
    setPayments(prev => [newPayment, ...prev]);
    if (newCheque) setCheques(prev => [newCheque, ...prev]);
    setSalesDocuments(prev => prev.map(document => {
      const allocation = allocations.find(item => item.document.id === document.id);
      if (!allocation) return document;
      const nextDue = Math.max(0, (Number(document.balance_due) || 0) - allocation.allocated);
      return {
        ...document,
        paid_amount: (Number(document.paid_amount) || 0) + allocation.allocated,
        balance_due: nextDue,
        payment_status: nextDue <= 0.01 ? 'paid' : 'partial'
      };
    }));

    notifySuccess(`Settlement of Rs. ${amount.toLocaleString()} recorded for ${customer?.business_name || settlementData.customer_name || 'Customer'}`);
    return newPayment;
  };

  // Record Direct Expense / Outflow
  const recordDirectExpense = async (expenseData) => {
    const {
      amount,
      expense_category,
      payment_date,
      payment_method,
      bank_account_id,
      cheque_no,
      cheque_date,
      cheque_bank,
      cheque_branch,
      reference,
      notes,
      payee_name
    } = expenseData;

    const amt = Number(amount) || 0;
    if (amt <= 0) throw new Error('Expense amount must be greater than 0');
    if (payment_method === 'bank' && !isValidUUID(bank_account_id)) {
      throw new Error('Select the bank account used for this expense.');
    }
    if (payment_method === 'cheque' && (!cheque_no || !cheque_date || !cheque_bank)) {
      throw new Error('Cheque number, cheque date and bank are required.');
    }

    const effectiveBankId = payment_method === 'bank' ? bank_account_id : null;
    const validBankId = isValidUUID(effectiveBankId) ? effectiveBankId : null;
    const expNo = `EXP-${Date.now().toString().slice(-6)}`;
    const paymentId = generateUUID();
    const chequeId = payment_method === 'cheque' ? generateUUID() : null;
    const categoryLabel = expense_category || 'General Expense';
    const payeeName = payee_name || categoryLabel;
    // Pack all metadata into reference and notes so they survive Supabase round-trip
    const combinedReference = reference ? `${categoryLabel} | ${reference}` : categoryLabel;
    const combinedNotes = notes
      ? `${payeeName} | ${notes}`
      : payeeName;

    const newPayment = {
      id: paymentId,
      payment_no: expNo,
      payment_date: payment_date || new Date().toISOString().slice(0, 10),
      payment_type: 'operational_expense',
      party_type: 'payee',
      party_id: null,
      payee_name: payeeName,
      expense_category: categoryLabel,
      amount: amt,
      currency: 'LKR',
      payment_method: payment_method || 'cash',
      bank_account_id: validBankId,
      cheque_id: null,
      source_key: `direct-expense:${paymentId}`,
      reference: combinedReference,
      notes: combinedNotes,
      created_at: new Date().toISOString()
    };

    await runCloudWrite('Recording expense', () => supabase.from('payments').insert({
      id: paymentId,
      payment_no: expNo,
      payment_date: newPayment.payment_date,
      payment_type: 'operational_expense',
      party_type: 'payee',
      party_id: null,
      amount: amt,
      payment_method: payment_method || 'cash',
      bank_account_id: validBankId,
      source_key: `direct-expense:${paymentId}`,
      reference: combinedReference,
      notes: combinedNotes
    }));

    if (chequeId) {
      const expenseCheque = {
        id: chequeId,
        cheque_no,
        direction: 'issued',
        party_type: 'other',
        party_id: null,
        payment_id: paymentId,
        bank_name: cheque_bank,
        branch: cheque_branch || null,
        cheque_date,
        received_or_issued_date: newPayment.payment_date,
        amount: amt,
        status: 'held',
        notes: combinedNotes
      };
      await runCloudWrite('Recording expense cheque', () => supabase.from('cheque_register').insert(expenseCheque));
      await runCloudWrite('Linking expense cheque', () => supabase.from('payments').update({ cheque_id: chequeId }).eq('id', paymentId));
      newPayment.cheque_id = chequeId;
      setCheques(prev => [{ ...expenseCheque, party_name: payeeName }, ...prev.filter(cheque => cheque.id !== chequeId)]);
    }

    if (validBankId && amt > 0) {
      const account = bankAccounts.find(item => item.id === validBankId);
      if (account) {
        await adjustBankBalance('Updating bank balance', validBankId, -amt);
      }
    }

    setPayments(prev => [newPayment, ...prev]);

    notifySuccess(`Expense of Rs. ${amt.toLocaleString()} recorded`);
    return newPayment;
  };

  // Record Direct Capital Investment / Other Inflow
  const recordDirectIncome = async (incomeData) => {
    const {
      amount,
      income_category,
      payment_date,
      payment_method,
      bank_account_id,
      reference,
      notes,
      payer_name
    } = incomeData;

    const amt = Number(amount) || 0;
    if (amt <= 0) throw new Error('Inflow amount must be greater than 0');
    if (payment_method === 'bank' && !isValidUUID(bank_account_id)) {
      throw new Error('Select the bank account receiving this inflow.');
    }

    const effectiveBankId = payment_method === 'bank' ? bank_account_id : null;
    const validBankId = isValidUUID(effectiveBankId) ? effectiveBankId : null;
    const incNo = `CAP-${Date.now().toString().slice(-6)}`;
    const paymentId = generateUUID();
    const categoryName = income_category || "Owner's Capital Investment (Initial)";
    const payerName = payer_name || categoryName;
    // Pack all metadata into reference and notes so they survive Supabase round-trip
    const combinedReference = reference ? `${categoryName} | ${reference}` : categoryName;
    const combinedNotes = notes
      ? `${payerName} | ${notes}`
      : payerName;

    const newPayment = {
      id: paymentId,
      payment_no: incNo,
      payment_date: payment_date || new Date().toISOString().slice(0, 10),
      payment_type: 'direct_income',
      party_type: 'payer',
      party_id: null,
      payee_name: payerName,
      payer_name: payerName,
      income_category: categoryName,
      amount: amt,
      currency: 'LKR',
      payment_method: payment_method || 'cash',
      bank_account_id: validBankId,
      source_key: `direct-income:${paymentId}`,
      reference: combinedReference,
      notes: combinedNotes,
      created_at: new Date().toISOString()
    };

    await runCloudWrite('Recording income', () => supabase.from('payments').insert({
      id: paymentId,
      payment_no: incNo,
      payment_date: newPayment.payment_date,
      payment_type: 'direct_income',
      party_type: 'payer',
      party_id: null,
      amount: amt,
      payment_method: payment_method || 'cash',
      bank_account_id: validBankId,
      source_key: `direct-income:${paymentId}`,
      reference: combinedReference,
      notes: combinedNotes
    }));

    if (validBankId && amt > 0) {
      const account = bankAccounts.find(item => item.id === validBankId);
      if (account) {
        await adjustBankBalance('Updating bank balance', validBankId, amt);
      }
    }

    setPayments(prev => [newPayment, ...prev]);

    notifySuccess(`${categoryName} of Rs. ${amt.toLocaleString()} recorded`);
    return newPayment;
  };

  // Supplier CRUD

  const saveSupplier = async (supplierData) => {
    const targetId = supplierData.id || generateUUID();
    if (supplierData.id) {
      setSuppliers(prev => prev.map(s => s.id === supplierData.id ? { ...s, ...supplierData, updated_at: new Date().toISOString() } : s));
      await runCloudWrite('Updating supplier', () => supabase.from('suppliers').update({
        name: supplierData.name,
        country: supplierData.country,
        contact_person: supplierData.contact_person,
        phone: supplierData.phone,
        email: supplierData.email,
        default_currency: supplierData.default_currency,
        default_lead_days: supplierData.default_lead_days,
        bank_details: supplierData.bank_details,
        updated_at: new Date().toISOString()
      }).eq('id', supplierData.id));
      notifySuccess('Supplier profile updated');
      return { ...supplierData, id: supplierData.id };
    } else {
      const newSupp = {
        ...supplierData,
        id: targetId,
        supplier_code: supplierData.supplier_code || `SUP-${(suppliers.length + 1).toString().padStart(3, '0')}`,
        current_advance_balance: 0,
        current_payable: 0,
        is_active: true,
        created_at: new Date().toISOString()
      };
      setSuppliers(prev => [newSupp, ...prev]);

      await runCloudWrite('Creating supplier', () => supabase.from('suppliers').upsert({
        id: newSupp.id,
        supplier_code: newSupp.supplier_code,
        name: newSupp.name,
        country: newSupp.country,
        contact_person: newSupp.contact_person,
        phone: newSupp.phone,
        email: newSupp.email,
        default_currency: newSupp.default_currency,
        default_lead_days: newSupp.default_lead_days,
        bank_details: newSupp.bank_details,
        is_active: true
      }));
      notifySuccess('New supplier profile created');
      return newSupp;
    }
  };

  const deleteSupplier = async (supplierId) => {
    setSuppliers(prev => prev.filter(s => s.id !== supplierId));
    await runCloudWrite('Deleting supplier', () => supabase.from('suppliers').delete().eq('id', supplierId));
    notifySuccess('Supplier deleted successfully');
  };

  // Create Supplier Order
  const createSupplierOrder = async (orderData) => {
    if (!isValidUUID(orderData.supplier_id)) throw new Error('Select a supplier before saving the order.');
    const validOrderItems = (orderData.items || []).filter(item => isValidUUID(item.product_id) && (Number(item.ordered_qty) || 0) > 0);
    if (!validOrderItems.length) throw new Error('Add at least one product with a valid quantity.');
    const orderNo = `SO-IMP-${new Date().toISOString().slice(0,7).replace('-','')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const orderId = generateUUID();
    const exchangeRate = Number(orderData.exchange_rate_snapshot) || 1;
    const foreignTotal = validOrderItems.reduce((sum, item) =>
      sum + ((Number(item.ordered_qty) || 0) * (Number(item.foreign_unit_cost) || 0)), 0);
    const newOrder = {
      ...orderData,
      id: orderId,
      order_no: orderNo,
      order_date: new Date().toISOString().slice(0, 10),
      total_foreign_amount: foreignTotal,
      estimated_lkr_total: foreignTotal * exchangeRate,
      status: 'ordered',
      created_at: new Date().toISOString()
    };

    await runCloudWrite('Creating supplier order', () => supabase.from('supplier_orders').insert({
      id: orderId,
      order_no: orderNo,
      supplier_id: orderData.supplier_id,
      order_date: newOrder.order_date,
      currency: orderData.currency || 'USD',
      exchange_rate_estimate: exchangeRate,
      incoterm: orderData.incoterm || 'FOB',
      expected_shipment_date: orderData.expected_shipment_date || null,
      expected_arrival_date: orderData.expected_arrival_date || null,
      total_foreign_amount: foreignTotal,
      estimated_lkr_total: foreignTotal * exchangeRate,
      status: 'ordered',
      notes: orderData.notes || null
    }));

    const orderItems = validOrderItems.map(item => ({
      id: generateUUID(),
      supplier_order_id: orderId,
      product_id: item.product_id,
      ordered_qty: Number(item.ordered_qty) || 0,
      shipped_qty: 0,
      foreign_unit_cost: Number(item.foreign_unit_cost) || 0,
      foreign_total: (Number(item.ordered_qty) || 0) * (Number(item.foreign_unit_cost) || 0),
      notes: item.notes || null
    })).filter(item => isValidUUID(item.product_id) && item.ordered_qty > 0);

    if (orderItems.length) {
      await runCloudWrite('Saving supplier order items', () => supabase.from('supplier_order_items').insert(orderItems));
    }

    setSupplierOrders(prev => [newOrder, ...prev]);
    return newOrder;
  };

  // Record Supplier Advance
  const recordSupplierAdvance = async (advanceData) => {
    const advNo = `ADV-${new Date().toISOString().slice(0,7).replace('-','')}-${Math.floor(100 + Math.random() * 900)}`;
    const lkrAmount = (Number(advanceData.foreign_amount) || 0) * (Number(advanceData.exchange_rate) || 1);

    const newAdv = {
      ...advanceData,
      id: generateUUID(),
      advance_no: advNo,
      payment_date: new Date().toISOString().slice(0, 10),
      lkr_amount: lkrAmount,
      unallocated_lkr_amount: lkrAmount,
      created_at: new Date().toISOString()
    };

    const paymentId = generateUUID();
    const chequeId = advanceData.payment_method === 'cheque' ? generateUUID() : null;
    const paymentNo = `PAY-ADV-${Date.now().toString().slice(-6)}`;
    const supplier = suppliers.find(item => item.id === advanceData.supplier_id);
    const bankAccount = advanceData.payment_method === 'bank'
      ? bankAccounts.find(item => item.id === advanceData.bank_account_id)
      : null;

    await runCloudWrite('Recording supplier advance', () => supabase.from('supplier_advances').insert({
      id: newAdv.id,
      advance_no: advNo,
      supplier_id: advanceData.supplier_id,
      supplier_order_id: isValidUUID(advanceData.supplier_order_id) ? advanceData.supplier_order_id : null,
      payment_date: newAdv.payment_date,
      currency: advanceData.currency || 'USD',
      foreign_amount: Number(advanceData.foreign_amount) || 0,
      exchange_rate: Number(advanceData.exchange_rate) || 1,
      lkr_amount: lkrAmount,
      payment_method: advanceData.payment_method || 'bank',
      bank_account_id: bankAccount && isValidUUID(bankAccount.id) ? bankAccount.id : null,
      bank_ref: advanceData.reference || null,
      allocated_lkr_amount: 0,
      unallocated_lkr_amount: lkrAmount,
      notes: advanceData.notes || null
    }));

    await runCloudWrite('Recording supplier advance payment', () => supabase.from('payments').insert({
      id: paymentId,
      payment_no: paymentNo,
      payment_date: newAdv.payment_date,
      payment_type: 'supplier_advance',
      party_type: 'supplier',
      party_id: advanceData.supplier_id,
      amount: lkrAmount,
      payment_method: advanceData.payment_method || 'bank',
      bank_account_id: bankAccount && isValidUUID(bankAccount.id) ? bankAccount.id : null,
      cheque_id: null,
      supplier_advance_id: newAdv.id,
      source_key: `supplier-advance:${newAdv.id}:payment`,
      reference: advanceData.reference || advNo,
      notes: advanceData.notes || null
    }));

    let advanceCheque = null;
    if (advanceData.payment_method === 'cheque') {
      if (!advanceData.cheque_no || !advanceData.cheque_date) throw new Error('Cheque number and cheque date are required.');
      advanceCheque = {
        id: chequeId,
        cheque_no: advanceData.cheque_no,
        direction: 'issued',
        party_type: 'supplier',
        party_id: advanceData.supplier_id,
        payment_id: paymentId,
        supplier_advance_id: newAdv.id,
        bank_name: advanceData.cheque_bank || 'Bank',
        cheque_date: advanceData.cheque_date,
        received_or_issued_date: newAdv.payment_date,
        amount: lkrAmount,
        status: 'held',
        notes: advanceData.notes || `Supplier advance ${advNo}`
      };
      await runCloudWrite('Recording supplier advance cheque', () => supabase.from('cheque_register').upsert(advanceCheque));
      await runCloudWrite('Linking supplier advance cheque', () => supabase.from('payments').update({ cheque_id: chequeId }).eq('id', paymentId));
    }

    if (supplier) {
      await adjustSupplierBalance('Updating supplier advance balance', supplier.id, 0, lkrAmount);
    }

    if (bankAccount) {
      await adjustBankBalance('Updating bank balance', bankAccount.id, -lkrAmount);
    }

    setSupplierAdvances(prev => [newAdv, ...prev]);

    setPayments(prev => [{
      id: paymentId,
      payment_no: paymentNo,
      payment_date: new Date().toISOString().slice(0, 10),
      payment_type: 'supplier_advance',
      party_type: 'supplier',
      party_id: advanceData.supplier_id,
      amount: lkrAmount,
      currency: 'LKR',
      payment_method: advanceData.payment_method || 'bank',
      bank_account_id: bankAccount?.id || null,
      cheque_id: advanceCheque?.id || null,
      supplier_advance_id: newAdv.id,
      source_key: `supplier-advance:${newAdv.id}:payment`,
      reference: advanceData.reference || advNo,
      created_at: new Date().toISOString()
    }, ...prev]);

    if (advanceCheque) setCheques(prev => [{ ...advanceCheque, party_name: supplier?.name || 'Supplier' }, ...prev]);

    return newAdv;
  };

  // Create Stock in Transit Shipment
  const createTransitShipment = async (shipmentData) => {
    const shpNo = `TRN-SHP-${new Date().toISOString().slice(0,7).replace('-','')}-${Math.floor(100 + Math.random() * 900)}`;
    const foreignSubtotal = (shipmentData.items || []).reduce((sum, it) => sum + ((Number(it.shipped_qty || it.qty) || 0) * (Number(it.foreign_unit_cost || it.unit_cost) || 0)), 0);
    const rate = Number(shipmentData.exchange_rate_snapshot) || 305.5;
    const lkrFob = foreignSubtotal * rate;
    const isDraft = shipmentData.status === 'draft';
    const trnId = shipmentData.id || generateUUID();

    const newShp = {
      ...shipmentData,
      id: trnId,
      shipment_no: shpNo,
      status: isDraft ? 'draft' : (shipmentData.status || 'in_transit'),
      foreign_items_subtotal: foreignSubtotal,
      total_landed_expenses_lkr: 0,
      total_estimated_cost_lkr: lkrFob,
      landed_expenses: [],
      items: (shipmentData.items || []).map(it => ({
        ...it,
        shipped_qty: Number(it.shipped_qty || it.qty) || 1,
        qty: Number(it.shipped_qty || it.qty) || 1,
        foreign_unit_cost: Number(it.foreign_unit_cost || it.unit_cost) || 0,
        unit_cost: Number(it.foreign_unit_cost || it.unit_cost) || 0,
        allocated_landed_lkr_per_unit: 0,
        final_landed_unit_cost_lkr: (Number(it.foreign_unit_cost || it.unit_cost) || 0) * rate
      })),
      created_at: new Date().toISOString()
    };

    const suppId = isValidUUID(shipmentData.supplier_id) ? shipmentData.supplier_id : null;
    if (!suppId) throw new Error('Select a valid supplier before saving the shipment.');

    await runCloudWrite('Creating transit shipment', () => supabase.from('transit_shipments').upsert({
      id: trnId,
      shipment_no: shpNo,
      supplier_id: suppId,
      supplier_order_id: isValidUUID(shipmentData.supplier_order_id) ? shipmentData.supplier_order_id : null,
      supplier_invoice_ref: shipmentData.supplier_invoice_ref || shipmentData.external_reference || null,
      shipment_ref: shipmentData.shipment_ref || null,
      tracking_or_bl_no: shipmentData.tracking_or_bl_no || shipmentData.bill_of_lading_no || null,
      courier_freight_company: shipmentData.courier_freight_company || shipmentData.shipping_line_carrier || null,
      origin_country: shipmentData.origin_country || 'China',
      shipping_date: shipmentData.document_date || shipmentData.shipping_date || shipmentData.departure_date || new Date().toISOString().slice(0, 10),
      expected_arrival_date: shipmentData.expected_arrival_date || shipmentData.estimated_arrival_date || null,
      currency: shipmentData.currency || 'USD',
      exchange_rate_snapshot: rate,
      foreign_items_subtotal: foreignSubtotal,
      total_landed_expenses_lkr: 0,
      total_estimated_cost_lkr: lkrFob,
      payment_type: shipmentData.payment_type || 'credit',
      status: isDraft ? 'preparing' : 'in_transit',
      notes: shipmentData.notes || null
    }));

    const transitItems = newShp.items.map(item => ({
      id: generateUUID(),
      transit_shipment_id: trnId,
      product_id: item.product_id || item.id,
      shipped_qty: Number(item.shipped_qty || item.qty) || 1,
      foreign_unit_cost: Number(item.foreign_unit_cost || item.unit_cost) || 0,
      weight_kg: Number(item.weight_kg) || 0,
      volume_cbm: Number(item.volume_cbm) || 0
    })).filter(item => isValidUUID(item.product_id));
    if (transitItems.length) {
      await runCloudWrite('Saving transit shipment items', () => supabase.from('transit_shipment_items').insert(transitItems));
    }

    if (!isDraft) {
      const stockWrites = transitItems.map(item => {
        return supabase.rpc('rpc_adjust_stock_balance', {
          p_product_id: item.product_id,
          p_qty_on_hand_delta: 0,
          p_qty_reserved_delta: 0,
          p_qty_in_transit_delta: item.shipped_qty,
          p_qty_damaged_delta: 0
        });
      });
      if (stockWrites.length) await runCloudBatch('Updating in-transit stock', stockWrites);

      if (isValidUUID(shipmentData.supplier_order_id)) {
        await runCloudWrite('Updating supplier order status', () => supabase.from('supplier_orders').update({
          status: 'shipped',
          updated_at: new Date().toISOString()
        }).eq('id', shipmentData.supplier_order_id));
      }

      const payType = shipmentData.payment_type || 'credit';
      if (payType !== 'credit') {
        const paymentId = generateUUID();
        const chequeId = payType === 'cheque' ? generateUUID() : null;
        const paymentNo = `PAY-TRN-${Date.now().toString().slice(-6)}`;
        const requestedBankId = shipmentData.payment_details?.bank_account_id;
        const bankAccount = payType === 'bank' ? bankAccounts.find(account => account.id === requestedBankId) : null;
        const payment = {
          id: paymentId,
          payment_no: paymentNo,
          payment_date: shipmentData.document_date || new Date().toISOString().slice(0, 10),
          payment_type: 'transit_purchase_payment',
          party_type: 'supplier',
          party_id: suppId,
          amount: lkrFob,
          payment_method: payType,
          bank_account_id: isValidUUID(bankAccount?.id) ? bankAccount.id : null,
          cheque_id: null,
          transit_shipment_id: trnId,
          source_key: `transit:${trnId}:payment`,
          reference: shpNo,
          notes: `Payment for transit shipment ${shpNo}`
        };
        await runCloudWrite('Recording transit payment', () => supabase.from('payments').upsert(payment, { onConflict: 'source_key' }));

        let cheque = null;
        if (payType === 'cheque') {
          const details = shipmentData.payment_details;
          if (!details?.cheque_no || !details?.cheque_date) throw new Error('Cheque number and cheque date are required.');
          cheque = {
            id: chequeId,
            cheque_no: details.cheque_no,
            direction: 'issued',
            party_type: 'supplier',
            party_id: suppId,
            payment_id: paymentId,
            transit_shipment_id: trnId,
            bank_name: details.bank_name || 'Bank',
            cheque_date: details.cheque_date,
            received_or_issued_date: shipmentData.document_date || new Date().toISOString().slice(0, 10),
            amount: lkrFob,
            status: 'held',
            notes: `Payment for transit shipment ${shpNo}`
          };
          await runCloudWrite('Recording transit cheque', () => supabase.from('cheque_register').upsert(cheque));
          await runCloudWrite('Linking transit cheque', () => supabase.from('payments').update({ cheque_id: chequeId }).eq('id', paymentId));
          payment.cheque_id = chequeId;
          setCheques(prev => [{ ...cheque, party_name: newShp.supplier_name || 'Supplier' }, ...prev.filter(item => item.id !== chequeId)]);
        }

        setPayments(prev => [{ ...payment, created_at: new Date().toISOString() }, ...prev.filter(item => item.source_key !== payment.source_key)]);
        if (bankAccount) {
          await adjustBankBalance('Updating bank balance', bankAccount.id, -lkrFob);
        }
      } else {
        const supplier = suppliers.find(item => item.id === suppId);
        if (supplier) {
          await adjustSupplierBalance('Updating supplier payable', suppId, lkrFob, 0);
        }
      }
    }

    setTransitShipments(prev => [newShp, ...prev]);
    if (!isDraft) {
      setStockBalances(prev => {
        const updated = { ...prev };
        transitItems.forEach(item => {
          const current = updated[item.product_id] || { qty_on_hand: 0, qty_reserved: 0, qty_available: 0, qty_in_transit: 0, qty_damaged: 0 };
          updated[item.product_id] = { ...current, qty_in_transit: (Number(current.qty_in_transit) || 0) + item.shipped_qty };
        });
        return updated;
      });
      if (shipmentData.supplier_order_id) {
        setSupplierOrders(prev => prev.map(order => order.id === shipmentData.supplier_order_id ? { ...order, status: 'shipped' } : order));
      }
    }

    return newShp;
  };

  // Update Existing Stock in Transit Shipment & adjust transit balances
  const updateTransitShipment = async (shipmentId, updatedData) => {
    const existingShp = transitShipments.find(s => s.id === shipmentId);
    if (!existingShp) throw new Error('Shipment not found');

    const oldItems = existingShp.items || [];
    const newItems = updatedData.items || [];
    const rate = Number(updatedData.exchange_rate_snapshot || existingShp.exchange_rate_snapshot) || 1.0;
    const foreignSubtotal = newItems.reduce((sum, it) => sum + ((Number(it.shipped_qty || it.qty) || 0) * (Number(it.foreign_unit_cost || it.unit_cost) || 0)), 0);
    const lkrFob = foreignSubtotal * rate;
    const totalExpenses = existingShp.total_landed_expenses_lkr || 0;
    const totalCostLkr = lkrFob + totalExpenses;

    const formattedItems = newItems.map(it => {
      const shippedQty = Number(it.shipped_qty || it.qty) || 1;
      const unitCost = Number(it.foreign_unit_cost || it.unit_cost) || 0;
      return {
        ...it,
        shipped_qty: shippedQty,
        qty: shippedQty,
        foreign_unit_cost: unitCost,
        unit_cost: unitCost,
        final_landed_unit_cost_lkr: (unitCost * rate) + (Number(it.allocated_landed_lkr_per_unit) || 0)
      };
    });

    const wasDraft = existingShp.status === 'draft';
    const newStatus = updatedData.status || existingShp.status;
    const isNowDraft = newStatus === 'draft';

    const updatedShipment = {
      ...existingShp,
      ...updatedData,
      id: existingShp.id,
      shipment_no: existingShp.shipment_no,
      status: newStatus,
      foreign_items_subtotal: foreignSubtotal,
      total_estimated_cost_lkr: totalCostLkr,
      items: formattedItems,
      updated_at: new Date().toISOString()
    };

    setTransitShipments(prev => prev.map(s => s.id === shipmentId ? updatedShipment : s));

    // Handle stock in transit adjustments across status transitions
    if (!wasDraft && newStatus === 'in_transit') {
      const allProductIds = Array.from(new Set([
        ...oldItems.map(it => it.product_id),
        ...formattedItems.map(it => it.product_id)
      ]));

      setStockBalances(prev => {
        const updated = { ...prev };
        allProductIds.forEach(pId => {
          const oldIt = oldItems.find(it => it.product_id === pId);
          const newIt = formattedItems.find(it => it.product_id === pId);
          const oldQty = Number(oldIt?.shipped_qty || oldIt?.qty) || 0;
          const newQty = Number(newIt?.shipped_qty || newIt?.qty) || 0;
          const deltaQty = newQty - oldQty;

          const cur = updated[pId] || { qty_on_hand: 0, qty_reserved: 0, qty_available: 0, qty_in_transit: 0, qty_damaged: 0 };
          updated[pId] = {
            ...cur,
            qty_in_transit: Math.max(0, (cur.qty_in_transit || 0) + deltaQty)
          };
        });
        return updated;
      });
    } else if (wasDraft && newStatus === 'in_transit') {
      // Promoting from draft to in_transit
      setStockBalances(prev => {
        const updated = { ...prev };
        formattedItems.forEach(it => {
          const pId = it.product_id;
          const qty = Number(it.shipped_qty || it.qty) || 0;
          const cur = updated[pId] || { qty_on_hand: 0, qty_reserved: 0, qty_available: 0, qty_in_transit: 0, qty_damaged: 0 };
          updated[pId] = {
            ...cur,
            qty_in_transit: (cur.qty_in_transit || 0) + qty
          };
        });
        return updated;
      });

    } else if (!wasDraft && isNowDraft) {
      // Demoting from in_transit to draft
      setStockBalances(prev => {
        const updated = { ...prev };
        oldItems.forEach(it => {
          const pId = it.product_id;
          const qty = Number(it.shipped_qty || it.qty) || 0;
          const cur = updated[pId] || { qty_on_hand: 0, qty_reserved: 0, qty_available: 0, qty_in_transit: 0, qty_damaged: 0 };
          updated[pId] = {
            ...cur,
            qty_in_transit: Math.max(0, (cur.qty_in_transit || 0) - qty)
          };
        });
        return updated;
      });

    }

    if (!isValidUUID(shipmentId)) throw new Error('This shipment has an invalid cloud identifier.');
    const dbStatus = newStatus === 'draft' ? 'preparing' : (newStatus === 'arrived' ? 'received' : (['preparing', 'in_transit', 'partially_received', 'received', 'cancelled'].includes(newStatus) ? newStatus : 'in_transit'));
    await runCloudWrite('Updating transit shipment', () => supabase.from('transit_shipments').update({
      status: dbStatus,
      shipping_date: updatedData.document_date || updatedData.shipping_date || existingShp.shipping_date,
      expected_arrival_date: updatedData.expected_arrival_date || updatedData.estimated_arrival_date || existingShp.expected_arrival_date || null,
      currency: updatedData.currency || existingShp.currency,
      exchange_rate_snapshot: rate,
      foreign_items_subtotal: foreignSubtotal,
      total_estimated_cost_lkr: totalCostLkr,
      payment_type: updatedShipment.payment_type || existingShp.payment_type || 'credit',
      notes: updatedData.notes || existingShp.notes,
      updated_at: new Date().toISOString()
    }).eq('id', shipmentId));

    await runCloudWrite('Replacing transit shipment items', () => supabase.from('transit_shipment_items').delete().eq('transit_shipment_id', shipmentId));
    const cloudItems = formattedItems.map(item => ({
      id: generateUUID(),
      transit_shipment_id: shipmentId,
      product_id: item.product_id,
      shipped_qty: Number(item.shipped_qty) || 0,
      foreign_unit_cost: Number(item.foreign_unit_cost) || 0,
      weight_kg: Number(item.weight_kg) || 0,
      volume_cbm: Number(item.volume_cbm) || 0
    })).filter(item => isValidUUID(item.product_id) && item.shipped_qty > 0);
    if (cloudItems.length) {
      await runCloudWrite('Saving updated transit items', () => supabase.from('transit_shipment_items').insert(cloudItems));
    }

    const affectedProductIds = Array.from(new Set([...oldItems, ...formattedItems].map(item => item.product_id).filter(Boolean)));
    const oldWasActive = existingShp.status === 'in_transit';
    const newIsActive = newStatus === 'in_transit';
    const stockWrites = affectedProductIds.map(productId => {
      const oldQty = oldWasActive ? Number(oldItems.find(item => item.product_id === productId)?.shipped_qty || oldItems.find(item => item.product_id === productId)?.qty) || 0 : 0;
      const nextQty = newIsActive ? Number(formattedItems.find(item => item.product_id === productId)?.shipped_qty || formattedItems.find(item => item.product_id === productId)?.qty) || 0 : 0;
      return supabase.rpc('rpc_adjust_stock_balance', {
        p_product_id: productId,
        p_qty_on_hand_delta: 0,
        p_qty_reserved_delta: 0,
        p_qty_in_transit_delta: nextQty - oldQty,
        p_qty_damaged_delta: 0
      });
    });
    if (stockWrites.length) await runCloudBatch('Updating transit inventory', stockWrites);

    const oldSupplierId = existingShp.supplier_id;
    const nextSupplierId = updatedShipment.supplier_id;
    const oldPayable = oldWasActive && (existingShp.payment_type || 'credit') === 'credit'
      ? Number(existingShp.total_estimated_cost_lkr || existingShp.foreign_items_subtotal) || 0
      : 0;
    const nextPayable = newIsActive && (updatedShipment.payment_type || 'credit') === 'credit'
      ? totalCostLkr
      : 0;
    if (oldSupplierId === nextSupplierId) {
      await adjustSupplierBalance('Updating supplier payable', nextSupplierId, nextPayable - oldPayable, 0);
    } else {
      if (oldPayable) await adjustSupplierBalance('Reversing previous supplier payable', oldSupplierId, -oldPayable, 0);
      if (nextPayable) await adjustSupplierBalance('Updating new supplier payable', nextSupplierId, nextPayable, 0);
    }

    return updatedShipment;
  };

  // Add Landed Cost Expense
  const addLandedCostExpense = async (shipmentId, expenseData) => {
    const expenseLkr = (Number(expenseData.amount) || 0) * (Number(expenseData.exchange_rate) || 1.0);
    if (expenseLkr <= 0) throw new Error('Landed expense amount must be greater than zero.');
    const shipment = transitShipments.find(item => item.id === shipmentId);
    if (!shipment || !isValidUUID(shipmentId)) throw new Error('Shipment not found in the cloud.');

    const expenseTypeMap = {
      sea_freight: 'freight',
      air_freight: 'freight',
      port_demurrage: 'clearing',
      clearing_agent: 'clearing',
      local_transport: 'local_delivery',
      other_landed: 'other'
    };
    const expenseId = generateUUID();
    const newExpense = {
      ...expenseData,
      id: expenseId,
      cost_no: `LC-${Date.now().toString().slice(-8)}`,
      lkr_amount: expenseLkr,
      amount_lkr: expenseLkr,
      created_at: new Date().toISOString()
    };
    const updatedExpenses = [...(shipment.landed_expenses || []), newExpense];
    const totalLandedExpenses = updatedExpenses.reduce((sum, expense) => sum + (Number(expense.lkr_amount ?? expense.amount_lkr) || 0), 0);
    const totalCostLkr = (Number(shipment.foreign_items_subtotal) || 0) * (Number(shipment.exchange_rate_snapshot) || 1) + totalLandedExpenses;
    const totalForeignValue = (shipment.items || []).reduce((sum, item) => sum + ((Number(item.shipped_qty) || 0) * (Number(item.foreign_unit_cost) || 0)), 0) || 1;
    const updatedItems = (shipment.items || []).map(item => {
      const ratio = ((Number(item.shipped_qty) || 0) * (Number(item.foreign_unit_cost) || 0)) / totalForeignValue;
      const allocatedPerUnit = (totalLandedExpenses * ratio) / (Number(item.shipped_qty) || 1);
      return {
        ...item,
        allocated_landed_lkr_per_unit: allocatedPerUnit,
        final_landed_unit_cost_lkr: ((Number(item.foreign_unit_cost) || 0) * (Number(shipment.exchange_rate_snapshot) || 1)) + allocatedPerUnit
      };
    });

    await runCloudWrite('Recording landed expense', () => supabase.from('landed_costs').insert({
      id: expenseId,
      cost_no: newExpense.cost_no,
      transit_shipment_id: shipmentId,
      expense_type: expenseTypeMap[expenseData.expense_type] || expenseData.expense_type || 'other',
      payee: expenseData.payee || null,
      currency: expenseData.currency || 'LKR',
      foreign_amount: Number(expenseData.amount) || 0,
      exchange_rate: Number(expenseData.exchange_rate) || 1,
      lkr_amount: expenseLkr,
      payment_date: expenseData.payment_date || new Date().toISOString().slice(0, 10),
      payment_method: expenseData.paid_by || expenseData.payment_method || 'bank',
      bank_account_id: isValidUUID(expenseData.bank_account_id) ? expenseData.bank_account_id : null,
      reference: expenseData.reference || null,
      allocation_method: 'value',
      notes: [expenseData.expense_type, expenseData.notes].filter(Boolean).join(' | ') || null
    }));
    await runCloudWrite('Updating landed shipment totals', () => supabase.from('transit_shipments').update({
      total_landed_expenses_lkr: totalLandedExpenses,
      total_estimated_cost_lkr: totalCostLkr,
      updated_at: new Date().toISOString()
    }).eq('id', shipmentId));

    const itemWrites = updatedItems
      .filter(item => isValidUUID(item.id))
      .map(item => supabase.from('transit_shipment_items').update({
        allocated_landed_lkr_per_unit: item.allocated_landed_lkr_per_unit,
        final_landed_unit_cost_lkr: item.final_landed_unit_cost_lkr
      }).eq('id', item.id));
    if (itemWrites.length) await runCloudBatch('Allocating landed costs', itemWrites);

    const paymentMethod = expenseData.paid_by || expenseData.payment_method || 'bank';
    const paymentId = generateUUID();
    const chequeId = paymentMethod === 'cheque' ? generateUUID() : null;
    const paymentBankId = paymentMethod === 'bank' && isValidUUID(expenseData.bank_account_id) ? expenseData.bank_account_id : null;
    const landedPayment = {
      id: paymentId,
      payment_no: `PAY-${newExpense.cost_no}`,
      payment_date: expenseData.payment_date || new Date().toISOString().slice(0, 10),
      payment_type: 'operational_expense',
      party_type: 'payee',
      party_id: null,
      amount: expenseLkr,
      payment_method: paymentMethod,
      bank_account_id: paymentBankId,
      cheque_id: null,
      transit_shipment_id: shipmentId,
      landed_cost_id: expenseId,
      source_key: `landed-cost:${expenseId}:payment`,
      reference: expenseData.reference || newExpense.cost_no,
      notes: [expenseData.payee, expenseData.expense_type, expenseData.notes].filter(Boolean).join(' | ') || 'Landed cost payment'
    };
    await runCloudWrite('Recording landed cost payment', () => supabase.from('payments').upsert(landedPayment, { onConflict: 'source_key' }));

    if (paymentMethod === 'cheque') {
      if (!expenseData.cheque_no || !expenseData.cheque_date) throw new Error('Cheque number and cheque date are required.');
      const cheque = {
        id: chequeId,
        cheque_no: expenseData.cheque_no,
        direction: 'issued',
        party_type: 'other',
        party_id: null,
        payment_id: paymentId,
        transit_shipment_id: shipmentId,
        landed_cost_id: expenseId,
        bank_name: expenseData.cheque_bank || 'Bank',
        cheque_date: expenseData.cheque_date,
        received_or_issued_date: landedPayment.payment_date,
        amount: expenseLkr,
        status: 'held',
        notes: landedPayment.notes
      };
      await runCloudWrite('Recording landed cost cheque', () => supabase.from('cheque_register').upsert(cheque));
      await runCloudWrite('Linking landed cost cheque', () => supabase.from('payments').update({ cheque_id: chequeId }).eq('id', paymentId));
      landedPayment.cheque_id = chequeId;
      setCheques(prev => [{ ...cheque, party_name: expenseData.payee || 'Landed cost payee' }, ...prev.filter(item => item.id !== chequeId)]);
    }

    setPayments(prev => [{ ...landedPayment, payee_name: expenseData.payee || 'Landed cost payee', expense_category: 'Landed Cost', created_at: new Date().toISOString() }, ...prev.filter(item => item.source_key !== landedPayment.source_key)]);

    const bankAccount = bankAccounts.find(account => account.id === paymentBankId);
    if (bankAccount) {
      await adjustBankBalance('Updating bank balance', bankAccount.id, -expenseLkr);
    }

    setTransitShipments(prev => prev.map(item => item.id === shipmentId ? {
      ...item,
      landed_expenses: updatedExpenses,
      total_landed_expenses_lkr: totalLandedExpenses,
      total_estimated_cost_lkr: totalCostLkr,
      items: updatedItems
    } : item));

    notifySuccess('Landed expense recorded & item unit costs updated!');
    return newExpense;
  };

  // Delete Stock in Transit Shipment
  const deleteTransitShipment = async (shipmentId) => {
    const shp = transitShipments.find(s => s.id === shipmentId);
    if (!shp) return;

    const linkedPayments = payments.filter(payment => payment.transit_shipment_id === shipmentId || payment.reference === shp.shipment_no);
    for (const payment of linkedPayments) await reversePaymentBalance(payment, 'Reversing transit payment');

    if (shp.status === 'in_transit' && shp.payment_type === 'credit' && shp.supplier_id) {
      const totalCost = Number(shp.total_estimated_cost_lkr || shp.foreign_items_subtotal) || 0;
      await adjustSupplierBalance('Reversing transit supplier payable', shp.supplier_id, -totalCost, 0);
    }

    if (shp.status === 'in_transit') {
      const stockReversals = (shp.items || [])
        .filter(item => isValidUUID(item.product_id))
        .map(item => supabase.rpc('rpc_adjust_stock_balance', {
          p_product_id: item.product_id,
          p_qty_on_hand_delta: 0,
          p_qty_reserved_delta: 0,
          p_qty_in_transit_delta: -(Number(item.shipped_qty || item.qty) || 0),
          p_qty_damaged_delta: 0
        }));
      if (stockReversals.length) await runCloudBatch('Reversing transit stock', stockReversals);
    }

    setTransitShipments(prev => prev.filter(s => s.id !== shipmentId));

    if (shp.status === 'in_transit') {
      setStockBalances(prev => {
        const updated = { ...prev };
        (shp.items || []).forEach(it => {
          const pId = it.product_id;
          const qty = Number(it.shipped_qty || it.qty) || 0;
          const cur = updated[pId] || { qty_on_hand: 0, qty_reserved: 0, qty_available: 0, qty_in_transit: 0, qty_damaged: 0 };
          updated[pId] = {
            ...cur,
            qty_in_transit: Math.max(0, (cur.qty_in_transit || 0) - qty)
          };
        });
        return updated;
      });
    }

    setPayments(prev => prev.filter(p => p.transit_shipment_id !== shipmentId && p.reference !== shp.shipment_no));
    setCheques(prev => prev.filter(cheque => cheque.transit_shipment_id !== shipmentId && !linkedPayments.some(payment => payment.id === cheque.payment_id)));

    await runCloudWrite('Deleting transit cheques', () => supabase.from('cheque_register').delete().eq('transit_shipment_id', shipmentId));
    await runCloudWrite('Deleting transit payments', () => supabase.from('payments').delete().eq('transit_shipment_id', shipmentId));
    if (shp.shipment_no) {
      await runCloudWrite('Deleting referenced transit payments', () => supabase.from('payments').delete().or(`reference.eq.${shp.shipment_no},payment_no.ilike.%${shp.shipment_no}%`));
    }
    await runCloudWrite('Deleting transit shipment', () => supabase.from('transit_shipments').delete().eq('id', shipmentId));

    notifySuccess(`Shipment ${shp.shipment_no || ''} deleted`);
  };

  // Receive Purchase Shipment (GRN / Arrived / Direct Purchase) & Re-average WAC
  const receivePurchaseShipment = async (param) => {
    let receiptData = typeof param === 'string' ? { transit_shipment_id: param } : (param || {});
    const isDirect = !receiptData.transit_shipment_id || receiptData.transit_shipment_id === 'direct' || String(receiptData.transit_shipment_id).startsWith('direct-');
    const shp = isDirect ? null : transitShipments.find(s => String(s.id) === String(receiptData.transit_shipment_id) || s.shipment_no === receiptData.transit_shipment_id || (receiptData.shipment_no && s.shipment_no === receiptData.shipment_no));

    const receiptDate = receiptData.receipt_date || new Date().toISOString().slice(0, 10);
    const grnNo = `PUR-DOC-${new Date().toISOString().slice(0,7).replace('-','')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const isDraft = receiptData.status === 'draft';
    const purchaseId = receiptData.id || generateUUID();

    const rawItems = receiptData.items || (shp?.items || []);
    const items = rawItems.map(it => {
      const unitCost = Number(it.foreign_unit_cost || it.unit_cost || it.final_landed_unit_cost_lkr || it.unit_cost_lkr) || 0;
      const shippedQty = Number(it.shipped_qty || it.received_sellable_qty || it.qty) || 1;
      const pObj = it.product || products.find(p => p.id === (it.product_id || it.id));
      return {
        ...it,
        product_id: it.product_id || it.id,
        product_name: pObj?.name || it.product_name || 'Product Item',
        item_code: pObj?.item_code || it.item_code || '',
        product: pObj || it.product,
        shipped_qty: shippedQty,
        received_sellable_qty: shippedQty,
        damaged_qty: Number(it.damaged_qty) || 0,
        missing_qty: Number(it.missing_qty) || 0,
        unit_cost_lkr: unitCost,
        final_landed_unit_cost_lkr: unitCost,
        line_total_lkr: shippedQty * unitCost
      };
    });

    const totalLandedLkr = items.reduce((sum, it) => {
      const qty = Number(it.received_sellable_qty) || 0;
      const cost = Number(it.final_landed_unit_cost_lkr || it.unit_cost_lkr) || 0;
      return sum + (qty * cost);
    }, 0);

    const supId = receiptData.supplier_id || shp?.supplier_id;
    const supplier = suppliers.find(s => s.id === supId);
    const supplierName = supplier?.name || receiptData.supplier_name || 'Local / Overseas Supplier';

    const newPurchaseDoc = {
      id: purchaseId,
      doc_no: grnNo,
      grn_no: grnNo,
      status: isDraft ? 'draft' : (receiptData.status || 'received'),
      transit_shipment_id: shp?.id || (isValidUUID(receiptData.transit_shipment_id) ? receiptData.transit_shipment_id : null),
      shipment_no: shp?.shipment_no || receiptData.shipment_no || (isDirect ? 'DIRECT' : ''),
      bill_of_lading_no: shp?.bill_of_lading_no || receiptData.bill_of_lading_no || '',
      receipt_date: receiptDate,
      supplier_id: supId,
      supplier_name: supplierName,
      currency: 'LKR',
      total_amount_lkr: totalLandedLkr,
      total_landed_lkr: totalLandedLkr,
      payment_type: receiptData.payment_type || shp?.payment_type || 'credit',
      payment_details: receiptData.payment_details || shp?.payment_details || null,
      notes: receiptData.notes || shp?.notes || (isDirect ? (isDraft ? 'Draft Purchase Document' : 'Direct Purchase Document') : 'Arrived from Stock in Transit and converted to Purchase Document'),
      items: items,
      created_at: new Date().toISOString()
    };

    setPurchases(prev => [newPurchaseDoc, ...prev]);

    // Only update inventory, WAC, movements, and payments if NOT saved as draft
    if (!isDraft) {
      // Recalculate Weighted Average Cost (WAC) & Last Landed Cost for each product
      setProducts(prevProducts => {
        return prevProducts.map(p => {
          const receivedItem = items.find(it => it.product_id === p.id);
          if (!receivedItem) return p;

          const currentStock = Number(stockBalances[p.id]?.qty_on_hand) || 0;
          const currentWAC = Number(p.weighted_cost_lkr || p.cost_price || p.cost) || 0;
          const receivedQty = Number(receivedItem.received_sellable_qty) || 0;
          const receivedUnitCost = Number(receivedItem.final_landed_unit_cost_lkr || receivedItem.unit_cost_lkr || receivedItem.unit_cost) || 0;

          let newWAC = receivedUnitCost;
          if (currentStock > 0 && currentWAC > 0 && (currentStock + receivedQty > 0)) {
            newWAC = ((currentStock * currentWAC) + (receivedQty * receivedUnitCost)) / (currentStock + receivedQty);
          } else if (receivedUnitCost > 0) {
            newWAC = receivedUnitCost;
          } else if (currentWAC > 0) {
            newWAC = currentWAC;
          }

          return {
            ...p,
            weighted_cost_lkr: Number(newWAC.toFixed(2)),
            cost_price: Number(newWAC.toFixed(2)),
            cost: Number(newWAC.toFixed(2)),
            last_landed_cost_lkr: receivedUnitCost > 0 ? Number(receivedUnitCost.toFixed(2)) : (Number(p.last_landed_cost_lkr) || Number(newWAC.toFixed(2)))
          };
        });
      });

      // Move stock: add to qty_on_hand and qty_available; deduct from qty_in_transit if transit shipment
      setStockBalances(prev => {
        const updated = { ...prev };
        items.forEach(it => {
          const pId = it.product_id;
          const cur = updated[pId] || { qty_on_hand: 0, qty_reserved: 0, qty_available: 0, qty_in_transit: 0, qty_damaged: 0 };
          const sellable = Number(it.received_sellable_qty) || 0;
          const damaged = Number(it.damaged_qty) || 0;
          const shipped = isDirect ? 0 : (Number(it.shipped_qty) || sellable);

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

      // Mark transit shipment as arrived if applicable
      if (shp) {
        setTransitShipments(prev => prev.map(s => s.id === shp.id ? {
          ...s,
          status: 'arrived',
          purchase_doc_id: newPurchaseDoc.id,
          purchase_doc_no: grnNo,
          arrived_at: receiptDate
        } : s));
      }

      // Record stock movement
      setStockMovements(prev => [{
        id: 'mov-' + Date.now(),
        date: receiptDate,
        type: 'purchase_in',
        doc_no: grnNo,
        reference: isDirect ? 'Direct Purchase Document' : `Arrival of ${shp?.shipment_no || 'Shipment'}`,
        total_amount: totalLandedLkr,
        items_count: items.length,
        created_at: new Date().toISOString()
      }, ...prev]);
    }

    const suppId = isValidUUID(newPurchaseDoc.supplier_id) ? newPurchaseDoc.supplier_id : (suppliers[0]?.id || null);
    if (!suppId) throw new Error('Select a valid supplier before saving the purchase.');
    let linkTransitId = isValidUUID(newPurchaseDoc.transit_shipment_id) ? newPurchaseDoc.transit_shipment_id : (shp && isValidUUID(shp.id) ? shp.id : null);

        // If direct purchase without an existing transit shipment, create companion transit shipment
        const performSupabaseSync = async () => {
          if (!linkTransitId) {
            linkTransitId = generateUUID();
            await runCloudWrite('Creating direct purchase link', () => supabase.from('transit_shipments').upsert({
              id: linkTransitId,
              shipment_no: `DIR-TRN-${newPurchaseDoc.doc_no}`,
              supplier_id: suppId,
              shipping_date: receiptDate,
              currency: 'LKR',
              exchange_rate_snapshot: 1,
              foreign_items_subtotal: totalLandedLkr,
              total_landed_expenses_lkr: 0,
              total_estimated_cost_lkr: totalLandedLkr,
              payment_type: newPurchaseDoc.payment_type || 'credit',
              status: 'received',
              notes: 'Direct purchase companion shipment'
            }));
          } else {
            // Update existing transit shipment to received in cloud so all devices immediately reflect arrival
            await runCloudWrite('Marking shipment received', () => supabase.from('transit_shipments').update({
              status: 'received',
              actual_arrival_date: receiptDate,
              updated_at: new Date().toISOString()
            }).eq('id', linkTransitId));
          }

          await runCloudWrite('Saving purchase receipt', () => supabase.from('purchase_receipts').upsert({
            id: purchaseId,
            grn_no: grnNo,
            transit_shipment_id: linkTransitId,
            supplier_id: suppId,
            receipt_date: receiptDate,
            currency: 'LKR',
            exchange_rate_snapshot: 1,
            foreign_subtotal: totalLandedLkr,
            items_lkr_total: totalLandedLkr,
            landed_expenses_lkr_total: 0,
            total_landed_lkr: totalLandedLkr,
            supplier_goods_payable_lkr: totalLandedLkr,
            payment_type: newPurchaseDoc.payment_type || 'credit',
            is_fully_received: !isDraft,
            notes: newPurchaseDoc.notes || null
          }));

          if (items && items.length > 0) {
            const grnItems = items.map(it => {
              if (!isValidUUID(it.product_id)) return null;
              return {
                id: generateUUID(),
                purchase_receipt_id: purchaseId,
                product_id: it.product_id,
                received_sellable_qty: Number(it.received_sellable_qty) || 0,
                damaged_qty: Number(it.damaged_qty) || 0,
                missing_qty: Number(it.missing_qty) || 0,
                foreign_unit_cost: Number(it.foreign_unit_cost || it.unit_cost_lkr || it.final_landed_unit_cost_lkr) || 0,
                allocated_landed_lkr_per_unit: Number(it.allocated_landed_lkr_per_unit) || 0,
                final_landed_unit_cost_lkr: Number(it.final_landed_unit_cost_lkr || it.unit_cost_lkr || it.foreign_unit_cost) || 0
              };
            }).filter(Boolean);

            if (grnItems.length > 0) {
              await runCloudWrite('Saving purchase receipt items', () => supabase.from('purchase_receipt_items').upsert(grnItems));
            }
          }

          if (!isDraft) {
            for (const it of items) {
              if (isValidUUID(it.product_id)) {
                const sellable = Number(it.received_sellable_qty) || 0;
                const shipped = isDirect ? 0 : (Number(it.shipped_qty) || sellable);
                await runCloudWrite('Updating received inventory', () => supabase.rpc('rpc_adjust_stock_balance', {
                  p_product_id: it.product_id,
                  p_qty_on_hand_delta: sellable,
                  p_qty_reserved_delta: 0,
                  p_qty_in_transit_delta: -shipped,
                  p_qty_damaged_delta: Number(it.damaged_qty) || 0
                }));
              }
            }
          }
        };
    await performSupabaseSync();

    // Transit credit was already recorded when the shipment was dispatched.
    // Only direct credit purchases create a new supplier payable at receiving.
    if (!isDraft && isDirect && newPurchaseDoc.payment_type === 'credit') {
      await adjustSupplierBalance('Updating purchase supplier payable', suppId, totalLandedLkr, 0);
    }

    if (!isDraft && isDirect && newPurchaseDoc.payment_type !== 'credit') {
      const paymentId = generateUUID();
      const chequeId = newPurchaseDoc.payment_type === 'cheque' ? generateUUID() : null;
      const requestedBankId = newPurchaseDoc.payment_details?.bank_account_id;
      const bankId = newPurchaseDoc.payment_type === 'bank' && isValidUUID(requestedBankId) ? requestedBankId : null;
      const payment = {
        id: paymentId,
        payment_no: `PAY-${grnNo}`,
        payment_date: receiptDate,
        payment_type: 'purchase_payment',
        party_type: 'supplier',
        party_id: suppId,
        purchase_id: purchaseId,
        amount: totalLandedLkr,
        payment_method: newPurchaseDoc.payment_type,
        bank_account_id: bankId,
        cheque_id: null,
        source_key: `purchase:${purchaseId}:payment`,
        reference: grnNo,
        notes: `Payment for purchase ${grnNo}`
      };
      await runCloudWrite('Recording purchase payment', () => supabase.from('payments').upsert(payment, { onConflict: 'source_key' }));

      if (newPurchaseDoc.payment_type === 'cheque') {
        const details = newPurchaseDoc.payment_details;
        if (!details?.cheque_no || !details?.cheque_date) throw new Error('Cheque number and cheque date are required.');
        const cheque = {
          id: chequeId,
          cheque_no: details.cheque_no,
          direction: 'issued',
          party_type: 'supplier',
          party_id: suppId,
          payment_id: paymentId,
          purchase_receipt_id: purchaseId,
          bank_name: details.bank_name || 'Bank',
          cheque_date: details.cheque_date,
          received_or_issued_date: receiptDate,
          amount: totalLandedLkr,
          status: 'held',
          notes: `Payment for purchase ${grnNo}`
        };
        await runCloudWrite('Recording purchase cheque', () => supabase.from('cheque_register').upsert(cheque));
        await runCloudWrite('Linking purchase cheque', () => supabase.from('payments').update({ cheque_id: chequeId }).eq('id', paymentId));
        payment.cheque_id = chequeId;
        setCheques(prev => [{ ...cheque, party_name: supplierName }, ...prev.filter(item => item.id !== chequeId)]);
      }

      if (bankId) {
        const account = bankAccounts.find(item => item.id === bankId);
        if (account) {
          await adjustBankBalance('Updating purchase bank balance', bankId, -totalLandedLkr);
        }
      }

      setPayments(prev => [{ ...payment, supplier_name: supplierName, created_at: new Date().toISOString() }, ...prev.filter(item => item.source_key !== payment.source_key)]);
    }

    return newPurchaseDoc;
  };

  // Update Existing Purchase Document & Recalculate Stock Balances and WAC
  const updatePurchaseDocument = async (purchaseId, updatedData) => {
    const existingPur = purchases.find(p => p.id === purchaseId);
    if (!existingPur) throw new Error('Purchase document not found');

    const oldItems = existingPur.items || [];
    const rawNewItems = updatedData.items || [];

    const newItems = rawNewItems.map(it => {
      const unitCost = Number(it.final_landed_unit_cost_lkr || it.unit_cost_lkr || it.unit_cost || it.foreign_unit_cost) || 0;
      const shippedQty = Number(it.received_sellable_qty || it.shipped_qty || it.qty) || 1;
      const pObj = it.product || products.find(p => p.id === (it.product_id || it.id));
      return {
        ...it,
        product_id: it.product_id || it.id,
        product_name: pObj?.name || it.product_name || 'Product Item',
        item_code: pObj?.item_code || it.item_code || '',
        product: pObj || it.product,
        shipped_qty: shippedQty,
        received_sellable_qty: shippedQty,
        damaged_qty: Number(it.damaged_qty) || 0,
        missing_qty: Number(it.missing_qty) || 0,
        unit_cost_lkr: unitCost,
        final_landed_unit_cost_lkr: unitCost,
        line_total_lkr: shippedQty * unitCost
      };
    });

    const totalLandedLkr = newItems.reduce((sum, it) => sum + (it.received_sellable_qty * it.final_landed_unit_cost_lkr), 0);

    const supId = updatedData.supplier_id || existingPur.supplier_id;
    const supplier = suppliers.find(s => s.id === supId);
    const supplierName = supplier?.name || updatedData.supplier_name || existingPur.supplier_name;

    const wasDraft = existingPur.status === 'draft';
    const newStatus = updatedData.status || existingPur.status || 'received';
    const isNowDraft = newStatus === 'draft';
    const linkedPurchaseShipment = transitShipments.find(shipment => shipment.id === existingPur.transit_shipment_id);
    const isDirectPurchase = !existingPur.transit_shipment_id
      || String(linkedPurchaseShipment?.shipment_no || existingPur.shipment_no || '').startsWith('DIR-TRN-')
      || existingPur.shipment_no === 'DIRECT';

    const updatedPurchaseDoc = {
      ...existingPur,
      ...updatedData,
      id: existingPur.id,
      doc_no: existingPur.doc_no,
      grn_no: existingPur.grn_no || existingPur.doc_no,
      status: newStatus,
      supplier_id: supId,
      supplier_name: supplierName,
      total_amount_lkr: totalLandedLkr,
      total_landed_lkr: totalLandedLkr,
      items: newItems,
      updated_at: new Date().toISOString()
    };

    setPurchases(prev => prev.map(p => p.id === purchaseId ? updatedPurchaseDoc : p));

    // Union of product IDs affected by this edit
    const allProductIds = Array.from(new Set([
      ...oldItems.map(it => it.product_id),
      ...newItems.map(it => it.product_id)
    ]));

    if (!wasDraft && !isNowDraft) {
      // Step 1: Recalculate WAC & Product record for each affected product
      setProducts(prevProducts => {
        return prevProducts.map(p => {
          if (!allProductIds.includes(p.id)) return p;

          const oldIt = oldItems.find(it => it.product_id === p.id);
          const newIt = newItems.find(it => it.product_id === p.id);

          const oldQty = Number(oldIt?.received_sellable_qty || oldIt?.shipped_qty || oldIt?.qty) || 0;
          const oldCost = Number(oldIt?.final_landed_unit_cost_lkr || oldIt?.unit_cost_lkr || oldIt?.unit_cost) || 0;

          const newQty = Number(newIt?.received_sellable_qty || newIt?.shipped_qty || newIt?.qty) || 0;
          const newCost = Number(newIt?.final_landed_unit_cost_lkr || newIt?.unit_cost_lkr || newIt?.unit_cost) || 0;

          const currentStock = Number(stockBalances[p.id]?.qty_on_hand) || 0;
          const currentWAC = Number(p.weighted_cost_lkr || p.cost_price || p.cost) || 0;
          const currentValuation = currentStock * currentWAC;

          // Strip old purchase contribution to find prior base
          const baseStock = Math.max(0, currentStock - oldQty);
          const baseValuation = Math.max(0, currentValuation - (oldQty * oldCost));

          // Apply new purchase contribution
          const resultingStock = baseStock + newQty;
          const resultingValuation = baseValuation + (newQty * newCost);

          let resultingWAC = newCost;
          if (resultingStock > 0 && resultingValuation > 0) {
            resultingWAC = resultingValuation / resultingStock;
          } else if (newQty > 0 && newCost > 0) {
            resultingWAC = newCost;
          } else if (currentWAC > 0) {
            resultingWAC = currentWAC;
          }

          return {
            ...p,
            weighted_cost_lkr: Number(resultingWAC.toFixed(2)),
            cost_price: Number(resultingWAC.toFixed(2)),
            cost: Number(resultingWAC.toFixed(2)),
            last_landed_cost_lkr: newQty > 0 && newCost > 0 ? Number(newCost.toFixed(2)) : p.last_landed_cost_lkr
          };
        });
      });

      // Step 2: Update stockBalances accurately
      setStockBalances(prev => {
        const updated = { ...prev };
        allProductIds.forEach(pId => {
          const oldIt = oldItems.find(it => it.product_id === pId);
          const newIt = newItems.find(it => it.product_id === pId);

          const oldQty = Number(oldIt?.received_sellable_qty || oldIt?.shipped_qty || oldIt?.qty) || 0;
          const newQty = Number(newIt?.received_sellable_qty || newIt?.shipped_qty || newIt?.qty) || 0;
          const deltaQty = newQty - oldQty;

          const cur = updated[pId] || { qty_on_hand: 0, qty_reserved: 0, qty_available: 0, qty_in_transit: 0, qty_damaged: 0 };
          updated[pId] = {
            ...cur,
            qty_on_hand: Math.max(0, (cur.qty_on_hand || 0) + deltaQty),
            qty_available: Math.max(0, (cur.qty_available || 0) + deltaQty)
          };
        });
        return updated;
      });

      // Step 3: Record adjustment movement
      setStockMovements(prev => [{
        id: 'mov-' + Date.now(),
        date: updatedPurchaseDoc.receipt_date || new Date().toISOString().slice(0, 10),
        type: 'purchase_edit',
        doc_no: existingPur.doc_no,
        reference: `Edited Purchase Document ${existingPur.doc_no}`,
        total_amount: totalLandedLkr,
        items_count: newItems.length,
        created_at: new Date().toISOString()
      }, ...prev]);
    } else if (wasDraft && !isNowDraft) {
      // Promoting from draft to received!
      setProducts(prevProducts => {
        return prevProducts.map(p => {
          const newIt = newItems.find(it => it.product_id === p.id);
          if (!newIt) return p;

          const currentStock = Number(stockBalances[p.id]?.qty_on_hand) || 0;
          const currentWAC = Number(p.weighted_cost_lkr || p.cost_price || p.cost) || 0;
          const receivedQty = Number(newIt.received_sellable_qty) || 0;
          const receivedUnitCost = Number(newIt.final_landed_unit_cost_lkr || newIt.unit_cost_lkr || newIt.unit_cost) || 0;

          let newWAC = receivedUnitCost;
          if (currentStock > 0 && currentWAC > 0 && (currentStock + receivedQty > 0)) {
            newWAC = ((currentStock * currentWAC) + (receivedQty * receivedUnitCost)) / (currentStock + receivedQty);
          } else if (receivedUnitCost > 0) {
            newWAC = receivedUnitCost;
          } else if (currentWAC > 0) {
            newWAC = currentWAC;
          }

          return {
            ...p,
            weighted_cost_lkr: Number(newWAC.toFixed(2)),
            cost_price: Number(newWAC.toFixed(2)),
            cost: Number(newWAC.toFixed(2)),
            last_landed_cost_lkr: receivedUnitCost > 0 ? Number(receivedUnitCost.toFixed(2)) : (Number(p.last_landed_cost_lkr) || Number(newWAC.toFixed(2)))
          };
        });
      });

      setStockBalances(prev => {
        const updated = { ...prev };
        newItems.forEach(it => {
          const pId = it.product_id;
          const cur = updated[pId] || { qty_on_hand: 0, qty_reserved: 0, qty_available: 0, qty_in_transit: 0, qty_damaged: 0 };
          const sellable = Number(it.received_sellable_qty) || 0;
          updated[pId] = {
            ...cur,
            qty_on_hand: (cur.qty_on_hand || 0) + sellable,
            qty_available: (cur.qty_available || 0) + sellable
          };
        });
        return updated;
      });

      setStockMovements(prev => [{
        id: 'mov-' + Date.now(),
        date: updatedPurchaseDoc.receipt_date || new Date().toISOString().slice(0, 10),
        type: 'purchase_in',
        doc_no: existingPur.doc_no,
        reference: `Promoted Draft to Purchase Document ${existingPur.doc_no}`,
        total_amount: totalLandedLkr,
        items_count: newItems.length,
        created_at: new Date().toISOString()
      }, ...prev]);
    }

    if (!isValidUUID(purchaseId)) throw new Error('This purchase has an invalid cloud identifier.');
    await runCloudWrite('Updating purchase receipt', () => supabase.from('purchase_receipts').update({
      supplier_id: isValidUUID(supId) ? supId : existingPur.supplier_id,
      is_fully_received: updatedPurchaseDoc.status !== 'draft',
      total_landed_lkr: totalLandedLkr,
      supplier_goods_payable_lkr: totalLandedLkr,
      payment_type: updatedPurchaseDoc.payment_type || existingPur.payment_type || 'credit',
      receipt_date: updatedPurchaseDoc.receipt_date,
      notes: updatedPurchaseDoc.notes
    }).eq('id', purchaseId));

    await runCloudWrite('Replacing purchase receipt items', () => supabase.from('purchase_receipt_items').delete().eq('purchase_receipt_id', purchaseId));
    const cloudPurchaseItems = newItems
      .filter(item => isValidUUID(item.product_id))
      .map(item => ({
        id: generateUUID(),
        purchase_receipt_id: purchaseId,
        product_id: item.product_id,
        received_sellable_qty: Number(item.received_sellable_qty) || 0,
        damaged_qty: Number(item.damaged_qty) || 0,
        missing_qty: Number(item.missing_qty) || 0,
        foreign_unit_cost: Number(item.foreign_unit_cost || item.unit_cost_lkr || item.final_landed_unit_cost_lkr) || 0,
        allocated_landed_lkr_per_unit: Number(item.allocated_landed_lkr_per_unit) || 0,
        final_landed_unit_cost_lkr: Number(item.final_landed_unit_cost_lkr || item.unit_cost_lkr || item.foreign_unit_cost) || 0
      }));
    if (cloudPurchaseItems.length) {
      await runCloudWrite('Saving updated purchase items', () => supabase.from('purchase_receipt_items').insert(cloudPurchaseItems));
    }

    const purchaseStockWrites = allProductIds
      .filter(isValidUUID)
      .map(productId => {
        const oldItem = oldItems.find(item => item.product_id === productId);
        const nextItem = newItems.find(item => item.product_id === productId);
        const oldQty = wasDraft ? 0 : Number(oldItem?.received_sellable_qty || oldItem?.shipped_qty || oldItem?.qty) || 0;
        const nextQty = isNowDraft ? 0 : Number(nextItem?.received_sellable_qty || nextItem?.shipped_qty || nextItem?.qty) || 0;
        const oldDamaged = wasDraft ? 0 : Number(oldItem?.damaged_qty) || 0;
        const nextDamaged = isNowDraft ? 0 : Number(nextItem?.damaged_qty) || 0;
        return supabase.rpc('rpc_adjust_stock_balance', {
          p_product_id: productId,
          p_qty_on_hand_delta: nextQty - oldQty,
          p_qty_reserved_delta: 0,
          p_qty_in_transit_delta: 0,
          p_qty_damaged_delta: nextDamaged - oldDamaged
        });
      });
    if (purchaseStockWrites.length) await runCloudBatch('Updating edited purchase inventory', purchaseStockWrites);

    if (isDirectPurchase) {
      const oldSupplierId = existingPur.supplier_id;
      const nextSupplierId = updatedPurchaseDoc.supplier_id;
      const oldPayable = !wasDraft && (existingPur.payment_type || 'credit') === 'credit'
        ? Number(existingPur.total_amount_lkr || existingPur.total_landed_lkr) || 0
        : 0;
      const nextPayable = !isNowDraft && (updatedPurchaseDoc.payment_type || 'credit') === 'credit'
        ? totalLandedLkr
        : 0;
      if (oldSupplierId === nextSupplierId) {
        await adjustSupplierBalance('Updating purchase supplier payable', nextSupplierId, nextPayable - oldPayable, 0);
      } else {
        if (oldPayable) await adjustSupplierBalance('Reversing previous purchase payable', oldSupplierId, -oldPayable, 0);
        if (nextPayable) await adjustSupplierBalance('Updating new purchase payable', nextSupplierId, nextPayable, 0);
      }
    }

    return updatedPurchaseDoc;
  };

  // Delete Purchase Document & Reverse Inventory
  const deletePurchaseDocument = async (purchaseId) => {
    const pur = purchases.find(p => p.id === purchaseId);
    if (!pur) return;

    const linkedPayments = payments.filter(payment => payment.purchase_id === purchaseId || payment.reference === pur.doc_no || payment.reference === pur.grn_no);
    for (const payment of linkedPayments) await reversePaymentBalance(payment, 'Reversing purchase payment');

    const sourceTransit = transitShipments.find(shipment => shipment.id === pur.transit_shipment_id);
    const restoreToTransit = !!sourceTransit && !String(sourceTransit.shipment_no || '').startsWith('DIR-TRN-');

    // Transit purchases already carry the supplier payable on the shipment.
    // Direct credit purchases own their payable and must reverse it on deletion.
    if (pur.status !== 'draft' && !restoreToTransit && pur.payment_type === 'credit' && pur.supplier_id) {
      const totalAmount = Number(pur.total_amount_lkr || pur.total_landed_lkr) || 0;
      await adjustSupplierBalance('Reversing purchase supplier payable', pur.supplier_id, -totalAmount, 0);
    }

    if (pur.status !== 'draft') {
      const stockReversals = (pur.items || [])
        .filter(item => isValidUUID(item.product_id))
        .map(item => {
          const sellable = Number(item.received_sellable_qty || item.shipped_qty || item.qty) || 0;
          const shipped = Number(item.shipped_qty || item.received_sellable_qty || item.qty) || 0;
          const damaged = Math.min(Number(stockBalances[item.product_id]?.qty_damaged) || 0, Number(item.damaged_qty) || 0);
          return supabase.rpc('rpc_adjust_stock_balance', {
            p_product_id: item.product_id,
            p_qty_on_hand_delta: -sellable,
            p_qty_reserved_delta: 0,
            p_qty_in_transit_delta: restoreToTransit ? shipped : 0,
            p_qty_damaged_delta: -damaged
          });
        });
      if (stockReversals.length) await runCloudBatch('Reversing received inventory', stockReversals);
      if (restoreToTransit) {
        await runCloudWrite('Restoring shipment to transit', () => supabase.from('transit_shipments').update({
          status: 'in_transit',
          actual_arrival_date: null,
          updated_at: new Date().toISOString()
        }).eq('id', sourceTransit.id));
      }
    }

    // 1. Remove from purchases
    setPurchases(prev => prev.filter(p => p.id !== purchaseId));

    // Only reverse stock, WAC, and payables if the purchase was NOT a draft
    if (pur.status !== 'draft') {
      // 2. Reverse stock on hand & available
      setStockBalances(prev => {
        const updated = { ...prev };
        (pur.items || []).forEach(it => {
          const pId = it.product_id;
          const sellable = Number(it.received_sellable_qty || it.shipped_qty || it.qty) || 0;
          const cur = updated[pId] || { qty_on_hand: 0, qty_reserved: 0, qty_available: 0, qty_in_transit: 0, qty_damaged: 0 };
          updated[pId] = {
            ...cur,
            qty_on_hand: Math.max(0, (cur.qty_on_hand || 0) - sellable),
            qty_available: Math.max(0, (cur.qty_available || 0) - sellable)
          };
        });
        return updated;
      });

      // 3. Recalculate WAC from remaining purchase documents
      const remainingPurchases = purchases.filter(p => p.id !== purchaseId && p.status !== 'draft');
      setProducts(prev => prev.map(prod => {
        const prodPurchases = remainingPurchases.flatMap(p => (p.items || []).filter(it => it.product_id === prod.id));
        let totalQty = 0;
        let totalCost = 0;
        let lastCost = 0;
        prodPurchases.forEach(it => {
          const q = Number(it.received_sellable_qty || it.shipped_qty || it.qty) || 0;
          const c = Number(it.final_landed_unit_cost_lkr || it.unit_cost_lkr || it.unit_cost) || 0;
          if (q > 0 && c > 0) {
            totalQty += q;
            totalCost += (q * c);
            lastCost = c;
          }
        });
        const newWAC = totalQty > 0 ? (totalCost / totalQty) : (Number(prod.cost_price) || 0);
        return {
          ...prod,
          weighted_cost_lkr: Number(newWAC.toFixed(2)),
          cost_price: Number(newWAC.toFixed(2)),
          cost: Number(newWAC.toFixed(2)),
          last_landed_cost_lkr: lastCost > 0 ? Number(lastCost.toFixed(2)) : prod.last_landed_cost_lkr
        };
      }));

    }

    // Remove any direct payment or cheque linked to this purchase.
    setPayments(prev => prev.filter(p => p.purchase_id !== purchaseId && p.reference !== pur.doc_no && p.reference !== pur.grn_no));
    setCheques(prev => prev.filter(cheque => cheque.purchase_receipt_id !== purchaseId && !linkedPayments.some(payment => payment.id === cheque.payment_id)));

    await runCloudWrite('Deleting purchase cheques', () => supabase.from('cheque_register').delete().eq('purchase_receipt_id', purchaseId));
    await runCloudWrite('Deleting purchase payments', () => supabase.from('payments').delete().eq('purchase_id', purchaseId));
    const refNo = pur.doc_no || pur.grn_no;
    if (refNo) {
      await runCloudWrite('Deleting referenced purchase payments', () => supabase.from('payments').delete().or(`reference.eq.${refNo},payment_no.eq.PAY-${refNo},payment_no.eq.PAY-PUR-${refNo}`));
    }
    await runCloudWrite('Deleting purchase receipt', () => supabase.from('purchase_receipts').delete().eq('id', purchaseId));
    if (pur.transit_shipment_id) {
      await runCloudWrite('Deleting direct purchase link', () => supabase.from('transit_shipments').delete().eq('id', pur.transit_shipment_id).ilike('shipment_no', 'DIR-TRN-%'));
    }

    notifySuccess(`Purchase document ${pur.doc_no || ''} deleted and inventory reversed`);
  };

  // Full System Data Backup (JSON Download)
  const exportAllData = () => {
    const backupPayload = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      companySettings,
      currencies,
      categories,
      brands,
      products,
      stockBalances,
      customers,
      suppliers,
      bankAccounts,
      supplierOrders,
      supplierAdvances,
      transitShipments,
      purchases,
      salesDocuments,
      cheques,
      payments,
      stockMovements
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gs_wholesale_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    notifySuccess('Complete data backup exported successfully!');
  };

  // Full System Data Restore (From JSON File)
  const importAllData = async (backupPayload) => {
    try {
      if (!backupPayload || typeof backupPayload !== 'object') {
        throw new Error('Invalid backup file format');
      }

      if (backupPayload.companySettings) setCompanySettings(backupPayload.companySettings);
      if (backupPayload.currencies) setCurrencies(backupPayload.currencies);
      if (backupPayload.categories) setCategories(backupPayload.categories);
      if (backupPayload.brands) setBrands(backupPayload.brands);
      if (backupPayload.products) setProducts(backupPayload.products);
      if (backupPayload.stockBalances) setStockBalances(backupPayload.stockBalances);
      if (backupPayload.customers) setCustomers(backupPayload.customers);
      if (backupPayload.suppliers) setSuppliers(backupPayload.suppliers);
      if (backupPayload.bankAccounts) setBankAccounts(backupPayload.bankAccounts);
      if (backupPayload.supplierOrders) setSupplierOrders(backupPayload.supplierOrders);
      if (backupPayload.supplierAdvances) setSupplierAdvances(backupPayload.supplierAdvances);
      if (backupPayload.transitShipments) setTransitShipments(backupPayload.transitShipments);
      if (backupPayload.purchases) setPurchases(backupPayload.purchases);
      if (backupPayload.salesDocuments) setSalesDocuments(backupPayload.salesDocuments);
      if (backupPayload.cheques) setCheques(backupPayload.cheques);
      if (backupPayload.payments) setPayments(backupPayload.payments);
      if (backupPayload.stockMovements) setStockMovements(backupPayload.stockMovements);

      const storageMappings = {
        gs_wholesale_settings: backupPayload.companySettings,
        gs_wholesale_settings_user_customized: 'true',
        gs_wholesale_currencies: backupPayload.currencies,
        gs_wholesale_categories: backupPayload.categories,
        gs_wholesale_brands: backupPayload.brands,
        gs_wholesale_products: backupPayload.products,
        gs_wholesale_stock: backupPayload.stockBalances,
        gs_wholesale_customers: backupPayload.customers,
        gs_wholesale_suppliers: backupPayload.suppliers,
        gs_wholesale_bank_accounts: backupPayload.bankAccounts,
        gs_wholesale_supplier_orders: backupPayload.supplierOrders,
        gs_wholesale_advances: backupPayload.supplierAdvances,
        gs_wholesale_transit: backupPayload.transitShipments,
        gs_wholesale_purchases: backupPayload.purchases,
        gs_wholesale_sales_docs: backupPayload.salesDocuments,
        gs_wholesale_cheques: backupPayload.cheques,
        gs_wholesale_payments: backupPayload.payments,
        gs_wholesale_stock_movements: backupPayload.stockMovements
      };

      Object.entries(storageMappings).forEach(([k, v]) => {
        if (v !== undefined) {
          localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
        }
      });

      notifySuccess('All documents, products, inventory, and records restored successfully!');
      return true;
    } catch (err) {
      notifyError('Failed to restore backup: ' + err.message);
      return false;
    }
  };

  // Push all local data & documents to Supabase Cloud
  const syncLocalDataToCloud = async () => {
    if (!supabase) {
      notifyError('Supabase database client is not connected');
      return false;
    }

    try {
      notifyWarning('Syncing all local data and documents to Supabase Cloud...');

      // 1. Sync Company Settings
      if (companySettings) {
        await supabase.from('company_settings').upsert({
          id: isValidUUID(companySettings.id) ? companySettings.id : '00000000-0000-0000-0000-000000000001',
          business_name: companySettings.business_name || 'GS Wholesale',
          tagline: companySettings.tagline || '',
          tax_number: companySettings.tax_number || '',
          phone: companySettings.phone || '',
          whatsapp: companySettings.whatsapp || '',
          email: companySettings.email || '',
          address: companySettings.address || '',
          base_currency: companySettings.base_currency || 'LKR'
        });
      }

      // 2. Sync Customers
      for (const c of customers) {
        const cId = isValidUUID(c.id) ? c.id : generateUUID();
        await supabase.from('customers').upsert({
          id: cId,
          customer_code: c.customer_code || `CUST-${(c.business_name || 'C').slice(0, 3).toUpperCase()}`,
          business_name: c.business_name || 'Customer',
          phone: c.phone || null,
          billing_address: c.billing_address || null,
          current_receivable: Number(c.current_receivable) || 0,
          credit_limit: Number(c.credit_limit) || 0,
          credit_days: Number(c.credit_days) || 0,
          is_active: true
        });
      }

      // 3. Sync Products & Stock Balances
      const productIdMap = {};
      for (const p of products) {
        const pId = isValidUUID(p.id) ? p.id : generateUUID();
        productIdMap[p.id] = pId;
        if (p.name) productIdMap[p.name.toLowerCase().trim()] = pId;
        if (p.item_code) productIdMap[p.item_code.toLowerCase().trim()] = pId;
        if (p.sku) productIdMap[p.sku.toLowerCase().trim()] = pId;

        await supabase.from('products').upsert({
          id: pId,
          item_code: p.item_code || p.sku || `ITEM-${(p.name || 'P').slice(0, 3).toUpperCase()}`,
          name: p.name,
          wholesale_price: Number(p.wholesale_price) || 0,
          retail_price: Number(p.retail_price) || 0,
          dealer_price: Number(p.dealer_price) || 0,
          weighted_cost_lkr: Number(p.weighted_cost_lkr || p.cost_price || p.cost) || 0,
          is_active: true
        });

        const stock = stockBalances[p.id] || stockBalances[pId] || { qty_on_hand: 0, qty_available: 0, qty_in_transit: 0, qty_reserved: 0 };
        await supabase.from('stock_balances').upsert({
          product_id: pId,
          qty_on_hand: Number(stock.qty_on_hand) || 0,
          qty_available: Number(stock.qty_available) || 0,
          qty_reserved: Number(stock.qty_reserved) || 0,
          qty_in_transit: Number(stock.qty_in_transit) || 0
        });
      }

      // Also index existing Supabase products
      const { data: dbProducts } = await supabase.from('products').select('id, name, item_code');
      (dbProducts || []).forEach(p => {
        productIdMap[p.id] = p.id;
        if (p.name) productIdMap[p.name.toLowerCase().trim()] = p.id;
        if (p.item_code) productIdMap[p.item_code.toLowerCase().trim()] = p.id;
      });
      const defaultProductId = dbProducts?.[0]?.id || Object.values(productIdMap)[0] || null;

      // 4. Sync Suppliers & resolve defaultSupplierId
      let defaultSupplierId = null;
      const supplierIdMap = {};
      for (const s of suppliers) {
        const sId = isValidUUID(s.id) ? s.id : generateUUID();
        supplierIdMap[s.id] = sId;
        if (s.name) supplierIdMap[s.name.toLowerCase().trim()] = sId;
        await supabase.from('suppliers').upsert({
          id: sId,
          supplier_code: s.supplier_code || `SUP-${sId.slice(0, 8).toUpperCase()}`,
          name: s.name,
          country: s.country || 'China',
          phone: s.phone || null,
          email: s.email || null,
          is_active: true
        });
      }

      const { data: dbSuppliers } = await supabase.from('suppliers').select('id, name');
      (dbSuppliers || []).forEach(s => {
        supplierIdMap[s.id] = s.id;
        if (s.name) supplierIdMap[s.name.toLowerCase().trim()] = s.id;
      });
      if (dbSuppliers && dbSuppliers.length > 0) {
        defaultSupplierId = dbSuppliers[0].id;
      }

      // 5. Sync Transit Shipments
      for (const shp of transitShipments) {
        const sId = isValidUUID(shp.id) ? shp.id : generateUUID();
        const suppId = supplierIdMap[shp.supplier_id] || (isValidUUID(shp.supplier_id) ? shp.supplier_id : defaultSupplierId);
        if (!isValidUUID(suppId)) throw new Error(`Shipment ${shp.shipment_no || shp.id} has no valid supplier.`);
        const dbStatus = shp.status === 'draft' ? 'preparing' : (shp.status === 'arrived' ? 'received' : (['preparing', 'in_transit', 'partially_received', 'received', 'cancelled'].includes(shp.status) ? shp.status : 'in_transit'));

        await supabase.from('transit_shipments').upsert({
          id: sId,
          shipment_no: shp.shipment_no,
          supplier_id: suppId,
          shipping_date: shp.shipping_date || new Date().toISOString().slice(0, 10),
          currency: shp.currency || 'USD',
          exchange_rate_snapshot: Number(shp.exchange_rate_snapshot) || 300,
          foreign_items_subtotal: Number(shp.foreign_items_subtotal) || 0,
          total_landed_expenses_lkr: Number(shp.total_landed_expenses_lkr) || 0,
          total_estimated_cost_lkr: Number(shp.total_estimated_cost_lkr) || 0,
          status: dbStatus,
          notes: shp.notes || null
        });

        if (shp.items && shp.items.length > 0) {
          const itemsToUpsert = shp.items.map(it => {
            const rawPId = it.product_id || it.id;
            const prodId = productIdMap[rawPId] || (isValidUUID(rawPId) ? rawPId : defaultProductId);
            if (!isValidUUID(prodId)) return null;
            return {
              id: isValidUUID(it.id) ? it.id : generateUUID(),
              transit_shipment_id: sId,
              product_id: prodId,
              shipped_qty: Number(it.shipped_qty || it.qty) || 1,
              foreign_unit_cost: Number(it.foreign_unit_cost || it.unit_cost) || 0
            };
          }).filter(Boolean);
          if (itemsToUpsert.length > 0) {
            await supabase.from('transit_shipment_items').upsert(itemsToUpsert);
          }
        }
      }

      // 6. Sync Purchases (Goods Receipts)
      for (const pur of purchases) {
        const purId = isValidUUID(pur.id) ? pur.id : generateUUID();
        const suppId = supplierIdMap[pur.supplier_id] || (isValidUUID(pur.supplier_id) ? pur.supplier_id : defaultSupplierId);
        if (!isValidUUID(suppId)) throw new Error(`Purchase ${pur.doc_no || pur.grn_no || pur.id} has no valid supplier.`);
        let linkTransitId = isValidUUID(pur.transit_shipment_id) ? pur.transit_shipment_id : null;

        if (!linkTransitId) {
          linkTransitId = generateUUID();
          await supabase.from('transit_shipments').upsert({
            id: linkTransitId,
            shipment_no: `DIR-TRN-${pur.doc_no || pur.grn_no || purId.slice(0, 6)}`,
            supplier_id: suppId,
            shipping_date: pur.receipt_date || new Date().toISOString().slice(0, 10),
            currency: 'LKR',
            exchange_rate_snapshot: 1,
            foreign_items_subtotal: Number(pur.total_amount_lkr || pur.total_landed_lkr) || 0,
            total_landed_expenses_lkr: 0,
            total_estimated_cost_lkr: Number(pur.total_amount_lkr || pur.total_landed_lkr) || 0,
            status: 'received',
            notes: 'Direct purchase companion shipment'
          });
        }

        const totalLanded = Number(pur.total_amount_lkr || pur.total_landed_lkr) || 0;
        await supabase.from('purchase_receipts').upsert({
          id: purId,
          grn_no: pur.doc_no || pur.grn_no || `PUR-${Date.now()}`,
          transit_shipment_id: linkTransitId,
          supplier_id: suppId,
          receipt_date: pur.receipt_date || new Date().toISOString().slice(0, 10),
          currency: 'LKR',
          exchange_rate_snapshot: 1,
          foreign_subtotal: totalLanded,
          items_lkr_total: totalLanded,
          landed_expenses_lkr_total: 0,
          total_landed_lkr: totalLanded,
          supplier_goods_payable_lkr: totalLanded,
          is_fully_received: pur.status !== 'draft',
          notes: pur.notes || null
        });

        if (pur.items && pur.items.length > 0) {
          const grnItems = pur.items.map(it => {
            const rawPId = it.product_id || it.id;
            const prodId = productIdMap[rawPId] || (isValidUUID(rawPId) ? rawPId : defaultProductId);
            if (!isValidUUID(prodId)) return null;
            return {
              id: isValidUUID(it.id) ? it.id : generateUUID(),
              purchase_receipt_id: purId,
              product_id: prodId,
              received_sellable_qty: Number(it.received_sellable_qty || it.qty || it.shipped_qty) || 0,
              damaged_qty: Number(it.damaged_qty) || 0
            };
          }).filter(Boolean);

          if (grnItems.length > 0) {
            await supabase.from('purchase_receipt_items').upsert(grnItems);
          }
        }
      }

      // 7. Sync Sales Documents
      for (const doc of salesDocuments) {
        const dId = isValidUUID(doc.id) ? doc.id : generateUUID();
        const custId = isValidUUID(doc.customer_id) ? doc.customer_id : null;
        await supabase.from('sales_documents').upsert({
          id: dId,
          doc_type: doc.doc_type === 'quotation' ? 'quotation' : (doc.doc_type === 'reserved_order' || doc.doc_type === 'sales_order') ? 'sales_order' : 'sales_invoice',
          doc_no: doc.doc_no,
          customer_id: custId,
          doc_date: doc.doc_date || new Date().toISOString().slice(0, 10),
          subtotal: Number(doc.items_subtotal || doc.subtotal) || 0,
          grand_total: Number(doc.grand_total) || 0,
          paid_amount: Number(doc.paid_amount) || 0,
          balance_due: Number(doc.balance_due) || 0,
          status: doc.status === 'draft' ? 'draft' : 'completed',
          payment_status: doc.payment_status || 'unpaid',
          notes: doc.notes || null
        });

        if (doc.items && doc.items.length > 0) {
          const docItems = doc.items.map(it => {
            const pId = it.product?.id || it.product_id;
            if (!isValidUUID(pId)) return null;
            return {
              id: isValidUUID(it.id) ? it.id : generateUUID(),
              sales_document_id: dId,
              product_id: pId,
              qty: Number(it.qty) || 1,
              unit_price: Number(it.unit_price) || 0,
              line_total: Number(it.line_total) || (Number(it.qty || 1) * Number(it.unit_price || 0))
            };
          }).filter(Boolean);
          if (docItems.length > 0) {
            await supabase.from('sales_document_items').upsert(docItems);
          }
        }
      }

      // 7. Sync Payments
      for (const p of payments) {
        const pId = isValidUUID(p.id) ? p.id : generateUUID();
        await supabase.from('payments').upsert({
          id: pId,
          payment_no: p.payment_no || `PAY-${pId.slice(-6)}`,
          payment_type: p.payment_type || 'customer_payment',
          party_type: p.party_type || 'customer',
          party_id: isValidUUID(p.party_id) ? p.party_id : null,
          payment_date: p.payment_date || new Date().toISOString().slice(0, 10),
          amount: Number(p.amount) || 0,
          payment_method: p.payment_method || 'cash',
          reference: p.reference || null,
          notes: p.notes || null
        });
      }

      notifySuccess('All local documents, inventory, and records pushed to Supabase Cloud! Your phone and other devices can now see all data.');
      return true;
    } catch (e) {
      notifyError('Sync error: ' + e.message);
      return false;
    }
  };

  // Clean Reset: Wipe All Added Data
  const resetAllData = async () => {
    setProducts([]);
    setStockBalances({});
    setStockMovements([]);
    setTransitShipments([]);
    setPurchases([]);
    setSalesDocuments([]);
    setCustomers([]);
    setSuppliers([]);
    setSupplierOrders([]);
    setSupplierAdvances([]);
    setPayments([]);
    setCheques([]);
    setBankAccounts(INITIAL_BANK_ACCOUNTS);

    const keysToRemove = [
      'gs_wholesale_products',
      'gs_wholesale_stock',
      'gs_wholesale_stock_movements',
      'gs_wholesale_transit',
      'gs_wholesale_purchases',
      'gs_wholesale_sales_docs',
      'gs_wholesale_customers',
      'gs_wholesale_suppliers',
      'gs_wholesale_advances',
      'gs_wholesale_supplier_orders',
      'gs_wholesale_payments',
      'gs_wholesale_cheques',
      'gs_wholesale_bank_accounts',
      'gs_wholesale_pos_tabs'
    ];
    keysToRemove.forEach(k => localStorage.removeItem(k));

    try {
      if (supabase) {
        await supabase.from('sales_document_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('sales_documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('transit_shipment_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('transit_shipments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('purchase_receipt_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('purchase_receipts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('stock_balances').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('suppliers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('cheque_register').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }
    } catch (e) {
      console.warn('Supabase reset notice:', e);
    }

    notifySuccess('All added data wiped successfully! System reset to fresh state.');
  };

  // Reset Transactions Only (Keep Products & Master Catalog)
  const resetTransactionsOnly = async () => {
    setStockMovements([]);
    setTransitShipments([]);
    setPurchases([]);
    setSalesDocuments([]);
    setSupplierOrders([]);
    setSupplierAdvances([]);
    setPayments([]);
    setCheques([]);
    setBankAccounts(INITIAL_BANK_ACCOUNTS);

    setStockBalances(prev => {
      const reset = {};
      Object.keys(prev).forEach(k => {
        reset[k] = { qty_on_hand: 0, qty_reserved: 0, qty_available: 0, qty_in_transit: 0, qty_damaged: 0 };
      });
      return reset;
    });

    const keysToRemove = [
      'gs_wholesale_stock_movements',
      'gs_wholesale_transit',
      'gs_wholesale_purchases',
      'gs_wholesale_sales_docs',
      'gs_wholesale_advances',
      'gs_wholesale_supplier_orders',
      'gs_wholesale_payments',
      'gs_wholesale_cheques',
      'gs_wholesale_bank_accounts',
      'gs_wholesale_pos_tabs'
    ];
    keysToRemove.forEach(k => localStorage.removeItem(k));

    try {
      if (supabase) {
        await supabase.from('sales_document_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('sales_documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('purchase_receipt_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('purchase_receipts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('transit_shipment_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('transit_shipments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('stock_movements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('cheque_register').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('stock_balances').update({
          qty_on_hand: 0,
          qty_reserved: 0,
          qty_available: 0,
          qty_in_transit: 0,
          qty_damaged: 0
        }).neq('product_id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('customers').update({
          current_receivable: 0
        }).neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('suppliers').update({
          current_payable: 0
        }).neq('id', '00000000-0000-0000-0000-000000000000');
      }
    } catch (e) {
      console.warn('Supabase resetTransactionsOnly notice:', e);
    }

    notifySuccess('All transactions, orders, and documents cleared. Master products and customers retained.');
  };

  // Post Sales Document (with support for Reservations and Warranty Replacements)
  const postSalesDocument = async (docData) => {
    const isReservation = docData.doc_type === 'reserved_order' || docData.doc_type === 'sales_order';
    const isQuotation = docData.doc_type === 'quotation';
    const prefix = isQuotation ? 'QT' : isReservation ? 'RES' : 'INV';
    const docNo = `${prefix}-${new Date().toISOString().slice(0,7).replace('-','')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const itemsSubtotal = (docData.items || []).reduce((sum, it) => {
      const price = it.is_warranty_replacement ? 0 : (Number(it.unit_price) || 0);
      return sum + ((Number(it.qty) || 1) * price - (Number(it.discount_amount) || 0));
    }, 0);
    const grandTotal = Math.max(0, itemsSubtotal - (Number(docData.discount_amount) || 0));
    const totalCostSnapshot = (docData.items || []).reduce((sum, item) => {
      const qty = Number(item.qty) || 1;
      const unitCost = Number(item.unit_cost_snapshot || item.product?.weighted_cost_lkr || item.product?.cost_price) || 0;
      return sum + (qty * unitCost);
    }, 0);
    const grossProfit = grandTotal - totalCostSnapshot;

    let paidAmount = 0;
    const isCod = (docData.payment_lines || []).some(p => p.method === 'cod');
    const isCredit = (docData.payment_lines || []).some(p => p.method === 'credit') ||
                     (docData.notes || '').toLowerCase().includes('credit') ||
                     (!isQuotation && !isReservation && grandTotal > 0 && !(docData.payment_lines || []).some(p => p.method === 'cash' || p.method === 'bank' || p.method === 'cheque'));

    if (docData.payment_lines && !isQuotation) {
      paidAmount = docData.payment_lines.reduce((s, p) => (p.method !== 'credit' && p.method !== 'cod') ? s + (Number(p.amount) || 0) : s, 0);
    } else if (docData.advance_amount && isReservation) {
      paidAmount = Number(docData.advance_amount) || 0;
    }

    // When converting from a source document, identify whether it actually HELD reserved stock.
    // Reservations (reserved_order / sales_order) pre-reduce qty_available at creation time;
    // quotations do NOT touch stock at all. Converting a quotation must therefore behave like a
    // regular direct sale, not like releasing a reservation.
    const sourceDoc = docData.source_reserved_doc_id
      ? salesDocuments.find(d => d.id === docData.source_reserved_doc_id)
      : null;
    const releasedFromReservation = !!sourceDoc &&
      (sourceDoc.doc_type === 'reserved_order' || sourceDoc.doc_type === 'sales_order');

    // When converting from a reservation, carry over any previously paid advance deposit
    if (sourceDoc && Number(sourceDoc.paid_amount) > 0) {
      paidAmount += Number(sourceDoc.paid_amount);
    }

    const balanceDue = Math.max(0, grandTotal - paidAmount);
    const paymentStatus = isReservation
      ? (paidAmount >= grandTotal ? 'paid_advance' : paidAmount > 0 ? 'partial_advance' : 'reserved')
      : isQuotation ? 'draft' : (balanceDue <= 0.01 ? 'paid' : paidAmount > 0 ? 'partial' : isCredit ? 'credit' : 'unpaid');

    const docId = docData.id || generateUUID();

    const newDoc = {
      ...docData,
      id: docId,
      doc_no: docNo,
      doc_date: new Date().toISOString().slice(0, 10),
      items_subtotal: itemsSubtotal,
      grand_total: grandTotal,
      paid_amount: paidAmount,
      balance_due: balanceDue,
      payment_status: paymentStatus,
      is_cod: isCod,
      status: isReservation ? 'reserved' : isQuotation ? 'draft' : 'posted',
      created_at: new Date().toISOString(),
      items: (docData.items || []).map(it => {
        const pObj = it.product || products.find(p => p.id === (it.product_id || it.id));
        return {
          ...it,
          product_name: pObj?.name || it.product_name || 'Product Item',
          item_code: pObj?.item_code || it.item_code || '',
          product: pObj || it.product
        };
      })
    };

    setSalesDocuments(prev => [newDoc, ...prev]);

    // If converting from an existing reservation, mark that reservation as converted
    if (docData.source_reserved_doc_id) {
      setSalesDocuments(prev => prev.map(d => d.id === docData.source_reserved_doc_id ? {
        ...d,
        status: 'converted_to_sale',
        converted_invoice_no: docNo
      } : d));
    }

    // 1. If RESERVATION: Hold stock & record Advance Payment (if taken)
    if (isReservation) {
      setStockBalances(prev => {
        const updated = { ...prev };
        (docData.items || []).forEach(it => {
          const pId = it.product?.id || it.product_id;
          const cur = updated[pId] || { qty_on_hand: 0, qty_reserved: 0, qty_available: 0, qty_in_transit: 0, qty_damaged: 0 };
          const qty = Number(it.qty) || 1;

          updated[pId] = {
            ...cur,
            qty_reserved: (cur.qty_reserved || 0) + qty,
            qty_available: Math.max(0, (cur.qty_available || 0) - qty)
          };
        });
        return updated;
      });

      setStockMovements(prev => [{
        id: 'mov-' + Date.now(),
        date: new Date().toISOString().slice(0, 10),
        type: 'stock_reserved',
        doc_no: docNo,
        reference: `Customer Reservation: ${docData.customer_name || 'Customer Hold'} (Advance: Rs. ${paidAmount.toLocaleString()})`,
        total_amount: grandTotal,
        items_count: (docData.items || []).length,
        created_at: new Date().toISOString()
      }, ...prev]);

      notifySuccess(`Stock reserved successfully (${docNo})! ${paidAmount > 0 ? `Advance payment of Rs. ${paidAmount.toLocaleString()} recorded.` : ''}`);
    }

    // 2. If SALES INVOICE (Physical sale):
    if (docData.doc_type === 'sales_invoice') {
      setStockBalances(prev => {
        const updated = { ...prev };
        (docData.items || []).forEach(it => {
          const pId = it.product?.id || it.product_id;
          const cur = updated[pId] || { qty_on_hand: 0, qty_reserved: 0, qty_available: 0, qty_in_transit: 0, qty_damaged: 0 };
          const qty = Number(it.qty) || 1;
          const faultyAdd = it.is_warranty_replacement ? qty : 0;

          if (releasedFromReservation) {
            // Converting from reservation: release from reserved and deduct from on_hand (available was already reduced)
            updated[pId] = {
              ...cur,
              qty_on_hand: Math.max(0, (cur.qty_on_hand || 0) - qty),
              qty_reserved: Math.max(0, (cur.qty_reserved || 0) - qty),
              qty_damaged: (cur.qty_damaged || 0) + faultyAdd
            };
          } else {
            // Regular direct sale: deduct from on_hand and available
            updated[pId] = {
              ...cur,
              qty_on_hand: Math.max(0, (cur.qty_on_hand || 0) - qty),
              qty_available: Math.max(0, (cur.qty_available || 0) - qty),
              qty_damaged: (cur.qty_damaged || 0) + faultyAdd
            };
          }
        });
        return updated;
      });

      let updatedCustomerObj = null;
      let finalCustomerReceivable = balanceDue;

      if (docData.customer_id || docData.customer_name) {
        const foundCust = customers.find(c =>
          (docData.customer_id != null && String(c.id) === String(docData.customer_id)) ||
          (docData.customer_name && c.business_name && docData.customer_name.trim().toLowerCase() === c.business_name.trim().toLowerCase())
        );
        const priorReceivable = Number(foundCust?.current_receivable) || 0;
        finalCustomerReceivable = priorReceivable + balanceDue;

        if (foundCust) {
          updatedCustomerObj = {
            ...foundCust,
            current_receivable: finalCustomerReceivable
          };
        }

      }

      newDoc.customer = updatedCustomerObj || docData.customer;
      newDoc.customer_receivable = finalCustomerReceivable;

      setStockMovements(prev => [{
        id: 'mov-' + Date.now(),
        date: new Date().toISOString().slice(0, 10),
        type: 'sale_out',
        doc_no: docNo,
        reference: `Sale to ${docData.customer_name || 'Counter Customer'}`,
        total_amount: grandTotal,
        items_count: (docData.items || []).length,
        created_at: new Date().toISOString()
      }, ...prev]);
    }

    const custId = isValidUUID(docData.customer_id) ? docData.customer_id : null;
    await runCloudWrite('Saving sales document', () => supabase.from('sales_documents').upsert({
      id: docId,
      doc_type: isQuotation ? 'quotation' : isReservation ? 'sales_order' : 'sales_invoice',
      doc_no: docNo,
      customer_id: custId,
      doc_date: newDoc.doc_date,
      subtotal: itemsSubtotal,
      line_discount_total: (docData.items || []).reduce((sum, item) => sum + (Number(item.discount_amount) || 0), 0),
      doc_discount_type: 'amount',
      doc_discount_value: Number(docData.discount_amount) || 0,
      doc_discount_total: Number(docData.discount_amount) || 0,
      grand_total: grandTotal,
      total_cost_snapshot: totalCostSnapshot,
      gross_profit: grossProfit,
      gross_profit_pct: grandTotal > 0 ? (grossProfit / grandTotal) * 100 : 0,
      paid_amount: paidAmount,
      balance_due: balanceDue,
      status: isReservation ? 'confirmed' : isQuotation ? 'draft' : (balanceDue <= 0.01 ? 'completed' : 'confirmed'),
      payment_status: isReservation
        ? (paidAmount >= grandTotal ? 'paid' : paidAmount > 0 ? 'partially_paid' : 'unpaid')
        : isQuotation
          ? 'unpaid'
          : (balanceDue <= 0.01 ? 'paid' : paidAmount > 0 ? 'partially_paid' : isCredit ? 'credit' : 'unpaid'),
      notes: docData.notes || (isCredit ? 'Customer Account Credit Sale' : isCod ? 'Cash on Delivery (COD)' : null),
      updated_at: new Date().toISOString()
    }));

    const itemsToInsert = (docData.items || []).map(item => {
      const productId = item.product?.id || item.product_id;
      const unitPrice = item.is_warranty_replacement ? 0 : (Number(item.unit_price) || 0);
      const qty = Number(item.qty) || 1;
      const lineDiscount = item.is_warranty_replacement ? 0 : (Number(item.discount_amount) || 0);
      const unitCost = Number(item.unit_cost_snapshot || item.product?.weighted_cost_lkr || item.product?.cost_price) || 0;
      const lineTotal = Math.max(0, qty * unitPrice - lineDiscount);
      const lineProfit = lineTotal - (qty * unitCost);
      return {
        id: generateUUID(),
        sales_document_id: docId,
        product_id: productId,
        qty,
        unit_type: item.unit_type || 'unit',
        conversion_factor: 1,
        base_qty: qty,
        unit_price: unitPrice,
        discount_type: 'amount',
        discount_value: lineDiscount,
        line_discount: lineDiscount,
        line_total: lineTotal,
        unit_cost_snapshot: unitCost,
        line_profit: lineProfit,
        line_profit_pct: lineTotal > 0 ? (lineProfit / lineTotal) * 100 : 0,
        notes: item.warranty_note || item.notes || (item.is_warranty_replacement ? 'Warranty Replacement (Rs. 0)' : null)
      };
    }).filter(item => isValidUUID(item.product_id));
    if (itemsToInsert.length) {
      await runCloudWrite('Saving sales document items', () => supabase.from('sales_document_items').insert(itemsToInsert));
    }

    if (docData.doc_type === 'sales_invoice' || isReservation) {
      const stockWrites = (docData.items || []).map(item => {
        const productId = item.product?.id || item.product_id;
        if (!isValidUUID(productId)) return null;
        const qty = Number(item.qty) || 1;
        return supabase.rpc('rpc_adjust_stock_balance', {
          p_product_id: productId,
          p_qty_on_hand_delta: isReservation ? 0 : -qty,
          p_qty_reserved_delta: isReservation ? qty : (releasedFromReservation ? -qty : 0),
          p_qty_in_transit_delta: 0,
          p_qty_damaged_delta: item.is_warranty_replacement ? qty : 0
        });
      }).filter(Boolean);
      if (stockWrites.length) await runCloudBatch('Updating inventory', stockWrites);
    }

    if (custId && balanceDue > 0) {
      const foundCustomer = customers.find(customer => customer.id === custId);
      if (foundCustomer) {
        await adjustCustomerBalance('Updating customer receivable', custId, balanceDue, 0);
      }
    }

    const paidLines = (docData.payment_lines || [])
      .filter(line => !['credit', 'cod'].includes(line.method) && (Number(line.amount) || 0) > 0);
    const savedPayments = [];
    const savedCheques = [];

    for (let index = 0; index < paidLines.length; index += 1) {
      const line = paidLines[index];
      const paymentId = generateUUID();
      const paymentNo = `PAY-${docNo}-${index + 1}`;
      const chequeId = line.method === 'cheque' ? generateUUID() : null;
      const bankId = line.method === 'bank' && isValidUUID(line.bank_account_id) ? line.bank_account_id : null;
      const payment = {
        id: paymentId,
        payment_no: paymentNo,
        payment_type: isReservation ? 'customer_advance' : 'sales_receipt',
        party_type: 'customer',
        party_id: custId,
        sales_doc_id: docId,
        payment_date: newDoc.doc_date,
        amount: Number(line.amount),
        payment_method: line.method,
        bank_account_id: bankId,
        cheque_id: null,
        source_key: `sales:${docId}:${index + 1}`,
        reference: line.reference || docNo,
        notes: `Payment for ${docNo}`
      };

      await runCloudWrite('Recording sales payment', () => supabase.from('payments').upsert(payment, { onConflict: 'source_key' }));

      if (line.method === 'bank' && bankId) {
        const account = bankAccounts.find(item => item.id === bankId);
        if (account) {
          await adjustBankBalance('Updating sales bank balance', bankId, Number(line.amount));
        }
      }

      if (line.method === 'cheque') {
        const details = line.cheque_details || docData.cheque_details;
        if (!details?.cheque_no || !details?.cheque_date) throw new Error('Cheque number and cheque date are required.');
        const cheque = {
          id: chequeId,
          cheque_no: details.cheque_no,
          direction: 'received',
          party_type: 'customer',
          party_id: custId,
          payment_id: paymentId,
          sales_document_id: docId,
          bank_name: details.bank_name || 'Bank',
          branch: details.branch || null,
          cheque_date: details.cheque_date,
          received_or_issued_date: newDoc.doc_date,
          amount: Number(line.amount),
          status: 'received',
          notes: `${isReservation ? 'Advance for reservation' : 'Payment for invoice'} ${docNo}`
        };
        await runCloudWrite('Recording sales cheque', () => supabase.from('cheque_register').upsert(cheque));
        await runCloudWrite('Linking sales cheque', () => supabase.from('payments').update({ cheque_id: chequeId }).eq('id', paymentId));
        payment.cheque_id = chequeId;
        savedCheques.push({ ...cheque, party_name: docData.customer_name || 'Customer', sales_doc_no: docNo });
      }

      savedPayments.push({ ...payment, customer_name: docData.customer_name || 'Customer', created_at: new Date().toISOString() });
    }

    if (savedPayments.length) setPayments(prev => [...savedPayments, ...prev.filter(item => !savedPayments.some(saved => saved.source_key === item.source_key))]);
    if (savedCheques.length) setCheques(prev => [...savedCheques, ...prev.filter(item => !savedCheques.some(saved => saved.id === item.id))]);

    if (sourceDoc && isValidUUID(sourceDoc.id)) {
      await runCloudWrite('Closing converted document', () => supabase.from('sales_documents').update({
        status: 'completed',
        notes: [sourceDoc.notes, `Converted to ${docNo}`].filter(Boolean).join(' | '),
        updated_at: new Date().toISOString()
      }).eq('id', sourceDoc.id));
    }

    return newDoc;
  };

  // Edit an existing sales document and apply only the financial/inventory
  // deltas. This preserves the document number and linked payment identities.
  const updateSalesDocument = async (documentId, updatedData = {}) => {
    const existingDoc = salesDocuments.find(document => String(document.id) === String(documentId));
    if (!existingDoc) throw new Error('Sales document not found.');
    if (!isValidUUID(existingDoc.id)) throw new Error('This sales document has an invalid cloud identifier.');
    if (['cancelled', 'converted_to_sale', 'returned'].includes(existingDoc.status)) {
      throw new Error('Cancelled, returned, or converted documents cannot be edited.');
    }

    const isReservation = existingDoc.doc_type === 'reserved_order' || existingDoc.doc_type === 'sales_order';
    const isQuotation = existingDoc.doc_type === 'quotation';
    const isInvoice = existingDoc.doc_type === 'sales_invoice';
    const rawItems = updatedData.items || existingDoc.items || [];
    if (!rawItems.length) throw new Error('Add at least one item before saving the document.');

    const nextItems = rawItems.map(item => {
      const productId = item.product_id || item.product?.id || item.id;
      const product = products.find(entry => entry.id === productId) || item.product;
      const qty = Number(item.qty || item.base_qty) || 0;
      const isWarranty = Boolean(item.is_warranty_replacement);
      const unitPrice = isWarranty ? 0 : Math.max(0, Number(item.unit_price) || 0);
      const discountAmount = isWarranty ? 0 : Math.max(0, Number(item.discount_amount ?? item.line_discount) || 0);
      const lineTotal = Math.max(0, (qty * unitPrice) - discountAmount);
      const unitCost = Number(item.unit_cost_snapshot || product?.weighted_cost_lkr || product?.cost_price) || 0;
      if (!isValidUUID(productId)) throw new Error(`Select a valid product for ${product?.name || item.product_name || 'each line'}.`);
      if (qty <= 0) throw new Error(`Quantity must be greater than zero for ${product?.name || item.product_name || 'each line'}.`);
      return {
        ...item,
        product_id: productId,
        product,
        product_name: product?.name || item.product_name || 'Product Item',
        item_code: product?.item_code || item.item_code || '',
        qty,
        base_qty: qty,
        unit_price: unitPrice,
        discount_amount: Math.min(discountAmount, qty * unitPrice),
        line_total: lineTotal,
        unit_cost_snapshot: unitCost,
        is_warranty_replacement: isWarranty
      };
    });

    const lineSubtotal = nextItems.reduce((sum, item) => sum + item.line_total, 0);
    const documentDiscount = Math.min(Math.max(0, Number(updatedData.discount_amount) || 0), lineSubtotal);
    const grandTotal = Math.max(0, lineSubtotal - documentDiscount);
    const totalCostSnapshot = nextItems.reduce((sum, item) => sum + (item.qty * item.unit_cost_snapshot), 0);
    const grossProfit = grandTotal - totalCostSnapshot;

    const linkedPayments = payments.filter(payment =>
      String(payment.sales_doc_id || '') === String(existingDoc.id) ||
      payment.reference === existingDoc.doc_no
    );
    const activeLinkedPayments = linkedPayments.filter(payment => {
      if (payment.payment_method !== 'cheque') return true;
      const cheque = cheques.find(entry => entry.id === payment.cheque_id || entry.payment_id === payment.id);
      return !cheque || !['returned', 'cancelled'].includes(cheque.status);
    });
    const adjustablePayment = activeLinkedPayments.length === 1 && Number(existingDoc.balance_due) <= 0.01
      ? activeLinkedPayments[0]
      : null;
    const shouldAdjustPaidPayment = Boolean(updatedData.adjust_paid_payment);
    if (shouldAdjustPaidPayment && !adjustablePayment) {
      throw new Error('Only a fully paid document with one linked payment can automatically readjust its payment.');
    }

    let paidAmount = Number(existingDoc.paid_amount) || 0;
    let paymentDelta = 0;
    if (shouldAdjustPaidPayment && adjustablePayment) {
      paymentDelta = grandTotal - (Number(adjustablePayment.amount) || 0);
      paidAmount = grandTotal;
      if (grandTotal <= 0) throw new Error('A paid document cannot be reduced to zero. Remove or replace the payment first.');
      if (paymentDelta && adjustablePayment.payment_method === 'bank' && !isValidUUID(adjustablePayment.bank_account_id)) {
        throw new Error('The linked bank payment has no valid bank account and cannot be adjusted safely.');
      }
      if (paymentDelta && adjustablePayment.payment_method === 'cheque') {
        const cheque = cheques.find(entry => entry.id === adjustablePayment.cheque_id || entry.payment_id === adjustablePayment.id);
        if (cheque?.status === 'cleared' && !isValidUUID(cheque.deposit_bank_account_id)) {
          throw new Error('The cleared cheque has no deposit account and cannot be adjusted safely.');
        }
      }
    } else if (grandTotal + 0.01 < paidAmount) {
      throw new Error(`The edited total cannot be below the recorded payment (${paidAmount.toFixed(2)} LKR). Enable payment readjustment when available.`);
    }

    const balanceDue = Math.max(0, grandTotal - paidAmount);
    const nextCustomerId = isValidUUID(updatedData.customer_id) ? updatedData.customer_id : null;
    if (!isQuotation && balanceDue > 0.01 && !nextCustomerId) {
      throw new Error('Select a customer when the edited document has an outstanding balance.');
    }
    const nextCustomer = customers.find(customer => customer.id === nextCustomerId);

    const aggregateItems = (items) => items.reduce((map, item) => {
      const productId = item.product_id || item.product?.id;
      if (!isValidUUID(productId)) return map;
      const current = map.get(productId) || { qty: 0, damaged: 0 };
      current.qty += Number(item.qty || item.base_qty) || 0;
      if (item.is_warranty_replacement || String(item.notes || '').toLowerCase().includes('warranty replacement')) {
        current.damaged += Number(item.qty || item.base_qty) || 0;
      }
      map.set(productId, current);
      return map;
    }, new Map());

    const oldItemsByProduct = aggregateItems(existingDoc.items || []);
    const nextItemsByProduct = aggregateItems(nextItems);
    const affectedProductIds = Array.from(new Set([...oldItemsByProduct.keys(), ...nextItemsByProduct.keys()]));
    const stockDeltas = [];
    if (isInvoice || isReservation) {
      for (const productId of affectedProductIds) {
        const oldLine = oldItemsByProduct.get(productId) || { qty: 0, damaged: 0 };
        const nextLine = nextItemsByProduct.get(productId) || { qty: 0, damaged: 0 };
        const stock = stockBalances[productId] || {};
        if (isInvoice && nextLine.qty > (Number(stock.qty_on_hand) || 0) + oldLine.qty) {
          const product = products.find(item => item.id === productId);
          throw new Error(`Not enough stock to increase ${product?.name || 'this item'} to ${nextLine.qty}.`);
        }
        if (isReservation && nextLine.qty > (Number(stock.qty_available) || 0) + oldLine.qty) {
          const product = products.find(item => item.id === productId);
          throw new Error(`Not enough available stock to reserve ${nextLine.qty} of ${product?.name || 'this item'}.`);
        }
        stockDeltas.push({
          productId,
          onHand: isInvoice ? oldLine.qty - nextLine.qty : 0,
          reserved: isReservation ? nextLine.qty - oldLine.qty : 0,
          damaged: isInvoice ? nextLine.damaged - oldLine.damaged : 0
        });
      }
    }

    const localPaymentStatus = isReservation
      ? (balanceDue <= 0.01 ? 'paid_advance' : paidAmount > 0 ? 'partial_advance' : 'reserved')
      : isQuotation
        ? 'draft'
        : balanceDue <= 0.01
          ? 'paid'
          : paidAmount > 0
            ? 'partial'
            : existingDoc.payment_status === 'credit' ? 'credit' : 'unpaid';
    const cloudPaymentStatus = balanceDue <= 0.01 ? 'paid' : paidAmount > 0 ? 'partially_paid' : existingDoc.payment_status === 'credit' ? 'credit' : 'unpaid';
    const cloudStatus = isQuotation ? 'draft' : isReservation ? 'confirmed' : balanceDue <= 0.01 ? 'completed' : paidAmount > 0 ? 'partially_paid' : 'confirmed';
    const now = new Date().toISOString();

    await runCloudWrite('Updating sales document', () => supabase.from('sales_documents').update({
      customer_id: nextCustomerId,
      doc_date: updatedData.doc_date || existingDoc.doc_date,
      subtotal: lineSubtotal,
      line_discount_total: nextItems.reduce((sum, item) => sum + item.discount_amount, 0),
      doc_discount_type: 'amount',
      doc_discount_value: documentDiscount,
      doc_discount_total: documentDiscount,
      grand_total: grandTotal,
      paid_amount: paidAmount,
      balance_due: balanceDue,
      total_cost_snapshot: totalCostSnapshot,
      gross_profit: grossProfit,
      gross_profit_pct: grandTotal > 0 ? (grossProfit / grandTotal) * 100 : 0,
      status: cloudStatus,
      payment_status: cloudPaymentStatus,
      notes: updatedData.notes ?? existingDoc.notes ?? null,
      updated_at: now
    }).eq('id', existingDoc.id));

    await runCloudWrite('Replacing sales document items', () => supabase.from('sales_document_items').delete().eq('sales_document_id', existingDoc.id));
    const cloudItems = nextItems.map(item => {
      const lineProfit = item.line_total - (item.qty * item.unit_cost_snapshot);
      return {
        id: generateUUID(),
        sales_document_id: existingDoc.id,
        product_id: item.product_id,
        qty: item.qty,
        unit_type: item.unit_type || 'unit',
        conversion_factor: Number(item.conversion_factor) || 1,
        base_qty: item.qty,
        unit_price: item.unit_price,
        discount_type: 'amount',
        discount_value: item.discount_amount,
        line_discount: item.discount_amount,
        line_total: item.line_total,
        unit_cost_snapshot: item.unit_cost_snapshot,
        line_profit: lineProfit,
        line_profit_pct: item.line_total > 0 ? (lineProfit / item.line_total) * 100 : 0,
        notes: item.is_warranty_replacement ? (item.warranty_note || 'Warranty Replacement (Rs. 0)') : (item.notes || null)
      };
    });
    await runCloudWrite('Saving edited sales items', () => supabase.from('sales_document_items').insert(cloudItems));

    const stockWrites = stockDeltas
      .filter(delta => delta.onHand || delta.reserved || delta.damaged)
      .map(delta => supabase.rpc('rpc_adjust_stock_balance', {
        p_product_id: delta.productId,
        p_qty_on_hand_delta: delta.onHand,
        p_qty_reserved_delta: delta.reserved,
        p_qty_in_transit_delta: 0,
        p_qty_damaged_delta: delta.damaged
      }));
    if (stockWrites.length) await runCloudBatch('Readjusting edited sales inventory', stockWrites);

    const oldCustomerId = isValidUUID(existingDoc.customer_id) ? existingDoc.customer_id : null;
    const oldBalanceDue = Number(existingDoc.balance_due) || 0;
    if (oldCustomerId === nextCustomerId) {
      if (nextCustomerId) await adjustCustomerBalance('Readjusting customer receivable', nextCustomerId, balanceDue - oldBalanceDue, 0);
    } else {
      if (oldCustomerId && oldBalanceDue) await adjustCustomerBalance('Reversing previous customer receivable', oldCustomerId, -oldBalanceDue, 0);
      if (nextCustomerId && balanceDue) await adjustCustomerBalance('Recording new customer receivable', nextCustomerId, balanceDue, 0);
    }

    if (nextCustomerId !== oldCustomerId) {
      await runCloudWrite('Relinking sales payments', () => supabase.from('payments').update({ party_id: nextCustomerId }).eq('sales_doc_id', existingDoc.id));
      await runCloudWrite('Relinking sales cheques', () => supabase.from('cheque_register').update({ party_id: nextCustomerId }).eq('sales_document_id', existingDoc.id));
    }

    if (adjustablePayment && shouldAdjustPaidPayment && paymentDelta) {
      await runCloudWrite('Readjusting linked sales payment', () => supabase.from('payments').update({ amount: grandTotal }).eq('id', adjustablePayment.id));
      if (adjustablePayment.payment_method === 'bank') {
        await adjustBankBalance('Readjusting sales bank balance', adjustablePayment.bank_account_id, paymentDelta);
      }
      if (adjustablePayment.payment_method === 'cheque') {
        const cheque = cheques.find(entry => entry.id === adjustablePayment.cheque_id || entry.payment_id === adjustablePayment.id);
        if (cheque) {
          await runCloudWrite('Readjusting sales cheque amount', () => supabase.from('cheque_register').update({ amount: grandTotal }).eq('id', cheque.id));
          if (cheque.status === 'cleared') {
            await adjustBankBalance('Readjusting cleared cheque balance', cheque.deposit_bank_account_id, paymentDelta);
          }
          setCheques(prev => prev.map(entry => entry.id === cheque.id ? { ...entry, amount: grandTotal, party_id: nextCustomerId, party_name: nextCustomer?.business_name || entry.party_name } : entry));
        }
      }
      setPayments(prev => prev.map(payment => payment.id === adjustablePayment.id ? { ...payment, amount: grandTotal, party_id: nextCustomerId } : payment));
    } else if (nextCustomerId !== oldCustomerId) {
      setPayments(prev => prev.map(payment => String(payment.sales_doc_id || '') === String(existingDoc.id) ? { ...payment, party_id: nextCustomerId } : payment));
      setCheques(prev => prev.map(cheque => String(cheque.sales_document_id || cheque.sales_doc_id || '') === String(existingDoc.id) ? { ...cheque, party_id: nextCustomerId, party_name: nextCustomer?.business_name || 'Customer' } : cheque));
    }

    if (stockDeltas.length) {
      setStockBalances(prev => {
        const next = { ...prev };
        stockDeltas.forEach(delta => {
          const current = next[delta.productId] || { qty_on_hand: 0, qty_reserved: 0, qty_available: 0, qty_in_transit: 0, qty_damaged: 0 };
          const qtyOnHand = Math.max(0, (Number(current.qty_on_hand) || 0) + delta.onHand);
          const qtyReserved = Math.max(0, (Number(current.qty_reserved) || 0) + delta.reserved);
          next[delta.productId] = {
            ...current,
            qty_on_hand: qtyOnHand,
            qty_reserved: qtyReserved,
            qty_available: Math.max(0, qtyOnHand - qtyReserved),
            qty_damaged: Math.max(0, (Number(current.qty_damaged) || 0) + delta.damaged)
          };
        });
        return next;
      });
      setStockMovements(prev => [{
        id: `mov-${Date.now()}`,
        date: updatedData.doc_date || existingDoc.doc_date,
        type: isReservation ? 'reservation_edit' : isInvoice ? 'sales_edit' : 'quotation_edit',
        doc_no: existingDoc.doc_no,
        reference: `Edited ${existingDoc.doc_no}; inventory readjusted by document delta`,
        total_amount: grandTotal,
        items_count: nextItems.length,
        created_at: now
      }, ...prev]);
    }

    const updatedDocument = {
      ...existingDoc,
      ...updatedData,
      id: existingDoc.id,
      doc_no: existingDoc.doc_no,
      doc_type: existingDoc.doc_type,
      customer_id: nextCustomerId,
      customer_name: nextCustomer?.business_name || updatedData.customer_name || 'Cash / Counter Customer',
      customer_phone: nextCustomer?.phone || '',
      doc_date: updatedData.doc_date || existingDoc.doc_date,
      items_subtotal: lineSubtotal,
      subtotal: lineSubtotal,
      discount_amount: documentDiscount,
      grand_total: grandTotal,
      paid_amount: paidAmount,
      balance_due: balanceDue,
      payment_status: localPaymentStatus,
      total_cost_snapshot: totalCostSnapshot,
      gross_profit: grossProfit,
      gross_profit_pct: grandTotal > 0 ? (grossProfit / grandTotal) * 100 : 0,
      notes: updatedData.notes ?? existingDoc.notes,
      items: nextItems,
      updated_at: now
    };
    setSalesDocuments(prev => prev.map(document => String(document.id) === String(existingDoc.id) ? updatedDocument : document));
    notifySuccess(`Document ${existingDoc.doc_no} updated and dependent balances readjusted.`);
    return updatedDocument;
  };

  // Cancel Customer Reservation & Release Stock back to available
  const cancelReservation = async (docId) => {
    const doc = salesDocuments.find(d => d.id === docId);
    if (!doc) return;

    await runCloudWrite('Cancelling reservation', () => supabase.from('sales_documents').update({
      status: 'cancelled',
      payment_status: 'unpaid',
      updated_at: new Date().toISOString()
    }).eq('id', docId));

    const stockWrites = (doc.items || []).map(item => {
      const productId = item.product?.id || item.product_id;
      const qty = Number(item.qty) || 0;
      return supabase.rpc('rpc_adjust_stock_balance', {
        p_product_id: productId,
        p_qty_on_hand_delta: 0,
        p_qty_reserved_delta: -qty,
        p_qty_in_transit_delta: 0,
        p_qty_damaged_delta: 0
      });
    });
    if (stockWrites.length) await runCloudBatch('Releasing reserved stock', stockWrites);

    setStockBalances(prev => {
      const updated = { ...prev };
      (doc.items || []).forEach(it => {
        const pId = it.product?.id || it.product_id;
        const cur = updated[pId] || { qty_on_hand: 0, qty_reserved: 0, qty_available: 0, qty_in_transit: 0, qty_damaged: 0 };
        const qty = Number(it.qty) || 1;

        updated[pId] = {
          ...cur,
          qty_reserved: Math.max(0, (cur.qty_reserved || 0) - qty),
          qty_available: (cur.qty_available || 0) + qty
        };
      });
      return updated;
    });

    setSalesDocuments(prev => prev.map(d => d.id === docId ? { ...d, status: 'cancelled', payment_status: 'cancelled' } : d));

    setStockMovements(prev => [{
      id: 'mov-' + Date.now(),
      date: new Date().toISOString().slice(0, 10),
      type: 'reservation_cancelled',
      doc_no: doc.doc_no,
      reference: `Cancelled Reservation for ${doc.customer_name}`,
      total_amount: doc.grand_total || 0,
      items_count: (doc.items || []).length,
      created_at: new Date().toISOString()
    }, ...prev]);

    notifySuccess(`Reservation ${doc.doc_no} cancelled. Stock released back to Available!`);
  };

  // Delete Sales Document (Invoice / Quotation / Reservation) & Restore Inventory and Cashflow
  const deleteSalesDocument = async (docId) => {
    const doc = salesDocuments.find(d => String(d.id) === String(docId));
    if (!doc) return;

    const docNo = doc.doc_no;
    const docIdStr = String(docId);

    const cloudLinkedPayments = payments.filter(payment =>
      (payment.sales_doc_id && String(payment.sales_doc_id) === docIdStr) ||
      (docNo && (payment.reference === docNo || payment.reference?.includes(docNo) || payment.payment_no?.includes(docNo)))
    );
    for (const payment of cloudLinkedPayments) await reversePaymentBalance(payment, 'Reversing sales payment');

    if (doc.customer_id && Number(doc.balance_due) > 0) {
      await adjustCustomerBalance('Reversing customer receivable', doc.customer_id, -Number(doc.balance_due), 0);
    }

    if (doc.status !== 'cancelled' && (doc.doc_type === 'sales_invoice' || doc.doc_type === 'reserved_order' || doc.doc_type === 'sales_order')) {
      const isReservationDocument = doc.doc_type === 'reserved_order' || doc.doc_type === 'sales_order';
      const stockReversals = (doc.items || [])
        .filter(item => isValidUUID(item.product_id || item.product?.id))
        .map(item => {
          const productId = item.product_id || item.product?.id;
          const qty = Number(item.qty) || 0;
          return supabase.rpc('rpc_adjust_stock_balance', {
            p_product_id: productId,
            p_qty_on_hand_delta: isReservationDocument ? 0 : qty,
            p_qty_reserved_delta: isReservationDocument ? -qty : 0,
            p_qty_in_transit_delta: 0,
            p_qty_damaged_delta: item.is_warranty_replacement ? -Math.min(qty, Number(stockBalances[productId]?.qty_damaged) || 0) : 0
          });
        });
      if (stockReversals.length) await runCloudBatch('Reversing sales inventory', stockReversals);
    }

    setSalesDocuments(prev => prev.filter(d => String(d.id) !== docIdStr));

    // Reverse inventory impact
    if (doc.doc_type === 'sales_invoice' && doc.status !== 'cancelled') {
      setStockBalances(prev => {
        const updated = { ...prev };
        (doc.items || []).forEach(it => {
          const pId = it.product_id;
          const qty = Number(it.qty) || 0;
          const cur = updated[pId] || { qty_on_hand: 0, qty_reserved: 0, qty_available: 0, qty_in_transit: 0, qty_damaged: 0 };
          updated[pId] = {
            ...cur,
            qty_on_hand: (cur.qty_on_hand || 0) + qty,
            qty_available: (cur.qty_available || 0) + qty
          };
        });
        return updated;
      });
    } else if ((doc.doc_type === 'reserved_order' || doc.doc_type === 'sales_order') && doc.status === 'reserved') {
      setStockBalances(prev => {
        const updated = { ...prev };
        (doc.items || []).forEach(it => {
          const pId = it.product_id;
          const qty = Number(it.qty) || 0;
          const cur = updated[pId] || { qty_on_hand: 0, qty_reserved: 0, qty_available: 0, qty_in_transit: 0, qty_damaged: 0 };
          updated[pId] = {
            ...cur,
            qty_reserved: Math.max(0, (cur.qty_reserved || 0) - qty),
            qty_available: (cur.qty_available || 0) + qty
          };
        });
        return updated;
      });
    }

    // Identify all linked payments (by sales_doc_id or doc_no in reference/notes/payment_no)
    const isLinkedPayment = (p) => {
      if (!p) return false;
      if (p.sales_doc_id && String(p.sales_doc_id) === docIdStr) return true;
      if (docNo) {
        if (p.reference === docNo || p.reference?.includes(docNo)) return true;
        if (p.notes && p.notes.includes(docNo)) return true;
        if (p.payment_no && p.payment_no.includes(docNo)) return true;
      }
      return false;
    };

    // Remove payments linked to this sales doc
    setPayments(prev => prev.filter(p => !isLinkedPayment(p)));

    // Remove cheques linked to this sales doc
    setCheques(prev => prev.filter(c => {
      if (c.sales_doc_id && String(c.sales_doc_id) === docIdStr) return false;
      if (docNo) {
        if (c.sales_doc_no && c.sales_doc_no === docNo) return false;
        if (c.notes && c.notes.includes(docNo)) return false;
      }
      return true;
    }));

    // Remove stock movements for this sales doc
    if (docNo) {
      setStockMovements(prev => prev.filter(m => m.doc_no !== docNo && !m.reference?.includes(docNo)));
    }

    if (docNo) {
      await runCloudWrite('Deleting sales cheques', () => supabase.from('cheque_register').delete().or(`sales_document_id.eq.${docId},notes.ilike.%${docNo}%`));
      await runCloudWrite('Deleting referenced sales payments', () => supabase.from('payments').delete().or(`reference.eq.${docNo},payment_no.eq.PAY-${docNo},payment_no.eq.PAY-INV-${docNo},notes.ilike.%${docNo}%`));
    } else {
      await runCloudWrite('Deleting sales cheques', () => supabase.from('cheque_register').delete().eq('sales_document_id', docId));
    }
    await runCloudWrite('Deleting sales payments', () => supabase.from('payments').delete().eq('sales_doc_id', docId));
    await runCloudWrite('Deleting sales document', () => supabase.from('sales_documents').delete().eq('id', docId));

    notifySuccess(`Document ${docNo || ''} deleted and related cash flow and stock reversed`);
  };

  // Delete an Individual Payment Transaction & Reverse Bank Balance Impact
  const deletePayment = async (paymentId) => {
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;

    await reversePaymentBalance(payment, 'Reversing bank payment');

    if (payment.cheque_id) {
      await runCloudWrite('Deleting linked cheque', () => supabase.from('cheque_register').delete().eq('id', payment.cheque_id));
    }
    await runCloudWrite('Deleting payment', () => supabase.from('payments').delete().eq('id', paymentId));

    setPayments(prev => prev.filter(p => p.id !== paymentId));
    setCheques(prev => prev.filter(c => c.id !== payment.cheque_id && c.payment_id !== paymentId));

    notifySuccess(`Payment entry ${payment.payment_no || ''} deleted`);
  };

  const convertDocument = (sourceDocId, targetType, extraPayload = {}) => {
    const source = salesDocuments.find(d => d.id === sourceDocId);
    if (!source) return;

    return postSalesDocument({
      doc_type: targetType,
      source_reserved_doc_id: sourceDocId,
      customer_id: source.customer_id,
      customer_name: source.customer_name,
      customer_phone: source.customer_phone,
      items: source.items,
      discount_amount: source.discount_amount,
      notes: `Converted from ${source.doc_no}`,
      ...extraPayload
    });
  };

  const updateChequeStatus = async (chequeId, newStatus, extraData = {}) => {
    const chq = cheques.find(c => c.id === chequeId);
    if (!chq) return;

    const today = new Date().toISOString().slice(0, 10);
    await runCloudWrite('Updating cheque status', () => supabase.from('cheque_register').update({
      status: newStatus,
      deposit_bank_account_id: isValidUUID(extraData.deposit_bank_account_id) ? extraData.deposit_bank_account_id : chq.deposit_bank_account_id || null,
      return_reason: extraData.return_reason || chq.return_reason || null,
      cleared_date: newStatus === 'cleared' ? today : chq.cleared_date || null,
      return_date: newStatus === 'returned' ? today : chq.return_date || null,
      updated_at: new Date().toISOString()
    }).eq('id', chequeId));

    if (newStatus === 'cleared' && isValidUUID(extraData.deposit_bank_account_id)) {
      const account = bankAccounts.find(item => item.id === extraData.deposit_bank_account_id);
      if (account) {
        const directionMultiplier = chq.direction === 'issued' ? -1 : 1;
        await adjustBankBalance('Updating deposited cheque balance', account.id, directionMultiplier * (Number(chq.amount) || 0));
      }
    }

    if (newStatus === 'returned' && chq.direction === 'received') {
      if (isValidUUID(chq.party_id)) {
        const customer = customers.find(item => item.id === chq.party_id);
        if (customer) {
          await adjustCustomerBalance('Reopening customer receivable', customer.id, Number(chq.amount) || 0, 0);
        }
      }
      const salesDocumentId = chq.sales_document_id || chq.sales_doc_id;
      if (isValidUUID(salesDocumentId)) {
        const salesDocument = salesDocuments.find(item => item.id === salesDocumentId);
        if (salesDocument) {
          const nextPaid = Math.max(0, (Number(salesDocument.paid_amount) || 0) - (Number(chq.amount) || 0));
          const nextDue = (Number(salesDocument.balance_due) || 0) + (Number(chq.amount) || 0);
          await runCloudWrite('Reopening invoice balance', () => supabase.from('sales_documents').update({
            paid_amount: nextPaid,
            balance_due: nextDue,
            payment_status: nextPaid > 0 ? 'partially_paid' : 'unpaid',
            status: nextPaid > 0 ? 'partially_paid' : 'confirmed',
            updated_at: new Date().toISOString()
          }).eq('id', salesDocumentId));
        }
      }
    }

    setCheques(prev => prev.map(c => c.id === chequeId ? {
      ...c,
      status: newStatus,
      deposit_bank_account_id: extraData.deposit_bank_account_id || c.deposit_bank_account_id,
      return_reason: extraData.return_reason || c.return_reason,
      cleared_date: newStatus === 'cleared' ? today : c.cleared_date,
      return_date: newStatus === 'returned' ? today : c.return_date
    } : c));

    if (newStatus === 'returned' && chq.direction === 'received') {
      const salesDocumentId = chq.sales_document_id || chq.sales_doc_id;
      if (salesDocumentId) {
        setSalesDocuments(prev => prev.map(d => d.id === salesDocumentId ? {
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
      companySettings, setCompanySettings, saveCompanySettings,
      currencies, setCurrencies,
      categories, setCategories, saveCategory, deleteCategory, deleteAllCategories, getCategoryPath,
      brands, setBrands, saveBrand, deleteBrand,
      products, setProducts, saveProduct, deleteProduct, importProductsFromExcel,
      stockBalances, setStockBalances,
      stockMovements, setStockMovements,
      customers, setCustomers, saveCustomer, deleteCustomer, recordCustomerSettlement,
      suppliers, setSuppliers, saveSupplier, deleteSupplier,
      bankAccounts, setBankAccounts,
      supplierOrders, setSupplierOrders, createSupplierOrder,
      supplierAdvances, setSupplierAdvances, recordSupplierAdvance,
      transitShipments, setTransitShipments, createTransitShipment, updateTransitShipment, deleteTransitShipment, addLandedCostExpense,
      purchases, setPurchases, receivePurchaseShipment, updatePurchaseDocument, deletePurchaseDocument,
      salesDocuments, setSalesDocuments, postSalesDocument, updateSalesDocument, convertDocument, cancelReservation, deleteSalesDocument,
      cheques, setCheques, updateChequeStatus,
      payments, setPayments, recordDirectExpense, recordDirectIncome, deletePayment,
      resetAllData, resetTransactionsOnly, exportAllData, importAllData, syncLocalDataToCloud,
      dataLoading, syncState, refreshData: fetchSupabaseData
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
