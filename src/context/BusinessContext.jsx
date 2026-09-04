import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  tax_number: 'VAT-987654321',
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

const INITIAL_BANK_ACCOUNTS = [
  { id: 'ba-1', account_name: 'Cash on Hand - Main Drawer', account_number: 'CASH-001', bank_name: 'Cash In Hand', current_balance: 0.0 },
  { id: 'ba-2', account_name: 'Commercial Bank - Wholesale Current', account_number: '1000123456', bank_name: 'Commercial Bank', current_balance: 0.0 },
  { id: 'ba-3', account_name: 'Sampath Bank - Corporate', account_number: '002910004567', bank_name: 'Sampath Bank', current_balance: 0.0 }
];

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

  // Keep inventory balances (on-hand, in-transit, reserved, available) guaranteed in sync
  useEffect(() => {
    if (!products || products.length === 0) return;
    setStockBalances(prev => {
      let changed = false;
      const updated = { ...prev };
      products.forEach(p => {
        const pId = p.id;

        // 1. In-Transit Qty from active transit shipments
        const inTransitQty = (transitShipments || [])
          .filter(s => s.status === 'in_transit')
          .reduce((sum, s) => {
            const it = (s.items || []).find(x => x.product_id === pId);
            return sum + (Number(it?.shipped_qty || it?.qty) || 0);
          }, 0);

        // 2. Arrived / Received Qty from Purchase Documents
        const totalPurchasedOnHand = (purchases || []).reduce((sum, pur) => {
          const it = (pur.items || []).find(x => x.product_id === pId);
          return sum + (Number(it?.received_sellable_qty || it?.shipped_qty || it?.qty) || 0);
        }, 0);

        // 3. Qty Sold from Posted Sales Invoices
        const totalSold = (salesDocuments || [])
          .filter(d => d.doc_type === 'sales_invoice' && d.status !== 'cancelled')
          .reduce((sum, doc) => {
            const it = (doc.items || []).find(x => (x.product?.id || x.product_id) === pId);
            return sum + (Number(it?.qty) || 0);
          }, 0);

        // 4. Qty Reserved from Active Reservations
        const totalReserved = (salesDocuments || [])
          .filter(d => (d.doc_type === 'reserved_order' || d.doc_type === 'sales_order') && d.status === 'reserved')
          .reduce((sum, doc) => {
            const it = (doc.items || []).find(x => (x.product?.id || x.product_id) === pId);
            return sum + (Number(it?.qty) || 0);
          }, 0);

        const cur = updated[pId] || { qty_on_hand: 0, qty_reserved: 0, qty_available: 0, qty_in_transit: 0, qty_damaged: 0 };
        const initialOnHand = Number(p.stock_quantity ?? p.qty_on_hand ?? 0);
        const baseOnHand = Math.max(Number(cur.qty_on_hand) || 0, totalPurchasedOnHand, initialOnHand);
        const finalOnHand = Math.max(0, baseOnHand - totalSold);
        const finalAvailable = Math.max(0, finalOnHand - totalReserved);

        if (
          cur.qty_in_transit !== inTransitQty ||
          cur.qty_on_hand !== finalOnHand ||
          cur.qty_available !== finalAvailable ||
          cur.qty_reserved !== totalReserved
        ) {
          updated[pId] = {
            ...cur,
            qty_on_hand: finalOnHand,
            qty_available: finalAvailable,
            qty_reserved: totalReserved,
            qty_in_transit: inTransitQty
          };
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [transitShipments, purchases, salesDocuments, products]);

  // AUTO-RECONCILE UNALLOCATED CUSTOMER SETTLEMENTS TO INVOICES
  // If settlements were recorded in payments, ensure they are reflected on invoice balances
  useEffect(() => {
    if (!payments.length || !salesDocuments.length) return;

    const settlementPayments = payments.filter(p => p.payment_type === 'customer_settlement');
    if (settlementPayments.length === 0) return;

    setSalesDocuments(prev => {
      let anyChanged = false;
      const updated = prev.map(doc => ({ ...doc }));

      customers.forEach(c => {
        const cId = c.id != null ? String(c.id).trim() : '';
        const cName = (c.business_name || '').trim().toLowerCase();

        const isMatch = (itemCustId, itemCustName) => {
          const idStr = itemCustId != null ? String(itemCustId).trim() : '';
          const nameStr = (itemCustName || '').trim().toLowerCase();
          if (cId && idStr && cId === idStr) return true;
          if (cName && nameStr && (cName === nameStr || nameStr.includes(cName) || cName.includes(nameStr))) return true;
          return false;
        };

        const custSettlements = settlementPayments.filter(p => isMatch(p.party_id, p.customer_name));
        const totalSettled = custSettlements.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        if (totalSettled <= 0) return;

        // Find customer invoices
        const custInvoices = updated
          .filter(d => d.doc_type !== 'quotation' && d.status !== 'cancelled' && isMatch(d.customer_id, d.customer_name))
          .sort((a, b) => new Date(a.doc_date || a.created_at) - new Date(b.doc_date || b.created_at));

        if (custInvoices.length === 0) return;

        let rem = totalSettled;
        for (const inv of custInvoices) {
          const due = inv.balance_due !== undefined
            ? Number(inv.balance_due)
            : Math.max(0, (Number(inv.grand_total) || 0) - (Number(inv.paid_amount) || 0));

          if (rem > 0 && due > 0) {
            const alloc = Math.min(due, rem);
            inv.paid_amount = (Number(inv.paid_amount) || 0) + alloc;
            inv.balance_due = Math.max(0, due - alloc);
            inv.payment_status = inv.balance_due <= 0.01 ? 'paid' : 'partial';
            rem -= alloc;
            anyChanged = true;
          }
        }
      });

      return anyChanged ? updated : prev;
    });
  }, [payments.length]);

  // REAL-TIME CUSTOMER RECEIVABLES SYNCHRONIZATION EFFECT
  // Automatically computes and maintains current_receivable for every customer
  // based on all active posted sales documents and recorded settlements.
  useEffect(() => {
    setCustomers(prev => {
      let changed = false;
      const updated = prev.map(c => {
        const cId = c.id != null ? String(c.id).trim() : '';
        const cName = (c.business_name || '').trim().toLowerCase();

        const isMatch = (itemCustId, itemCustName) => {
          const idStr = itemCustId != null ? String(itemCustId).trim() : '';
          const nameStr = (itemCustName || '').trim().toLowerCase();
          if (cId && idStr && cId === idStr) return true;
          if (cName && nameStr && (cName === nameStr || nameStr.includes(cName) || cName.includes(nameStr))) return true;
          return false;
        };

        const custDocs = (salesDocuments || []).filter(d =>
          d.doc_type !== 'quotation' &&
          d.status !== 'cancelled' &&
          isMatch(d.customer_id, d.customer_name)
        );

        const invoiceDue = custDocs.reduce((sum, d) => {
          const bal = d.balance_due !== undefined
            ? Number(d.balance_due)
            : Math.max(0, (Number(d.grand_total) || 0) - (Number(d.paid_amount) || 0));
          return sum + Math.max(0, bal);
        }, 0);

        const currentRec = Number(c.current_receivable || 0);

        // If customer has posted documents, use invoiceDue (or currentRec if lowered by settlement)
        const computedRec = custDocs.length > 0
          ? (invoiceDue <= 0 ? 0 : Math.min(invoiceDue, currentRec > 0 ? currentRec : invoiceDue))
          : Math.max(0, currentRec);

        if (Math.abs(currentRec - computedRec) > 0.01) {
          changed = true;
          return {
            ...c,
            current_receivable: Math.round(computedRec * 100) / 100
          };
        }
        return c;
      });

      return changed ? updated : prev;
    });
  }, [salesDocuments, payments]);

  // LOAD REAL DATA FROM SUPABASE
  const fetchSupabaseData = useCallback(async () => {
    if (!supabase) return;
    setDataLoading(true);
    try {
      // 1. Categories
      const { data: catData, error: catErr } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
      if (!catErr && catData && catData.length > 0) setCategories(catData);

      // 2. Brands
      const { data: brandData, error: brandErr } = await supabase.from('brands').select('*').order('name', { ascending: true });
      if (!brandErr && brandData && brandData.length > 0) setBrands(brandData);

      // 3. Products (Preserve locally updated costs and WAC from purchase documents)
      const { data: prodData, error: prodErr } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (!prodErr && prodData && prodData.length > 0) {
        const localPurchases = safeGet('gs_wholesale_purchases', []);
        setProducts(prev => {
          return prodData.map(remoteP => {
            const localP = prev.find(p => p.id === remoteP.id) || {};
            
            // Calculate WAC from all arrived purchases for this product
            const prodPurchases = localPurchases.flatMap(pur => (pur.items || []).filter(it => it.product_id === remoteP.id));
            let totalPurchasedQty = 0;
            let totalPurchasedCost = 0;
            let lastLandedCost = Number(localP.last_landed_cost_lkr || remoteP.last_landed_cost_lkr) || 0;

            prodPurchases.forEach(it => {
              const q = Number(it.received_sellable_qty || it.shipped_qty || it.qty) || 0;
              const c = Number(it.final_landed_unit_cost_lkr || it.unit_cost_lkr || it.unit_cost) || 0;
              if (q > 0 && c > 0) {
                totalPurchasedQty += q;
                totalPurchasedCost += (q * c);
                lastLandedCost = c;
              }
            });

            const purchaseWAC = totalPurchasedQty > 0 ? (totalPurchasedCost / totalPurchasedQty) : 0;
            const effectiveWAC = purchaseWAC > 0 
              ? purchaseWAC 
              : (Number(localP.weighted_cost_lkr) || Number(localP.cost_price) || Number(localP.cost) || Number(remoteP.weighted_cost_lkr) || Number(remoteP.cost_price) || 0);

            return {
              ...remoteP,
              weighted_cost_lkr: Number(effectiveWAC.toFixed(2)),
              cost_price: Number(effectiveWAC.toFixed(2)),
              cost: Number(effectiveWAC.toFixed(2)),
              last_landed_cost_lkr: lastLandedCost > 0 ? Number(lastLandedCost.toFixed(2)) : Number(remoteP.last_landed_cost_lkr || 0)
            };
          });
        });
      }

      // 4. Stock Balances (Preserve local arrived purchases & in-transit shipments)
      const { data: stockData, error: stockErr } = await supabase.from('stock_balances').select('*');
      if (!stockErr && stockData && stockData.length > 0) {
        const localShipments = safeGet('gs_wholesale_transit', []);
        const localPurchases = safeGet('gs_wholesale_purchases', []);
        const localSales = safeGet('gs_wholesale_sales_docs', []);

        setStockBalances(prev => {
          const updated = { ...prev };
          stockData.forEach(sb => {
            const pId = sb.product_id;
            const inTrn = localShipments
              .filter(s => s.status === 'in_transit')
              .reduce((sum, s) => {
                const it = (s.items || []).find(x => x.product_id === pId);
                return sum + (Number(it?.shipped_qty || it?.qty) || 0);
              }, 0);

            const purQty = localPurchases.reduce((sum, pur) => {
              const it = (pur.items || []).find(x => x.product_id === pId);
              return sum + (Number(it?.received_sellable_qty || it?.shipped_qty || it?.qty) || 0);
            }, 0);

            const soldQty = localSales
              .filter(d => d.doc_type === 'sales_invoice' && d.status !== 'cancelled')
              .reduce((sum, doc) => {
                const it = (doc.items || []).find(x => (x.product?.id || x.product_id) === pId);
                return sum + (Number(it?.qty) || 0);
              }, 0);

            const resQty = localSales
              .filter(d => (d.doc_type === 'reserved_order' || d.doc_type === 'sales_order') && d.status === 'reserved')
              .reduce((sum, doc) => {
                const it = (doc.items || []).find(x => (x.product?.id || x.product_id) === pId);
                return sum + (Number(it?.qty) || 0);
              }, 0);

            const existingCur = prev[pId] || {};
            const remoteOnHand = Number(sb.qty_on_hand) || Number(sb.sellable_qty) || 0;
            const effectiveOnHand = Math.max(0, Math.max(remoteOnHand, Number(existingCur.qty_on_hand) || 0, purQty) - soldQty);
            const effectiveAvailable = Math.max(0, effectiveOnHand - resQty);

            updated[pId] = {
              qty_on_hand: effectiveOnHand,
              qty_available: effectiveAvailable,
              qty_reserved: resQty,
              qty_in_transit: Math.max(Number(sb.qty_in_transit) || 0, inTrn),
              qty_damaged: Number(sb.qty_damaged) || (existingCur.qty_damaged || 0)
            };
          });
          return updated;
        });
      }

      // 5. Customers (Enriched with live invoice receivables)
      const { data: custData, error: custErr } = await supabase.from('customers').select('*').order('business_name', { ascending: true });
      if (!custErr && custData && custData.length > 0) {
        const localSales = safeGet('gs_wholesale_sales_docs', []);
        const enrichedCustomers = custData.map(c => {
          const custDocs = localSales.filter(d =>
            d.doc_type === 'sales_invoice' &&
            d.status !== 'cancelled' &&
            (
              (d.customer_id != null && String(d.customer_id) === String(c.id)) ||
              (d.customer_name && c.business_name && d.customer_name.trim().toLowerCase() === c.business_name.trim().toLowerCase())
            )
          );
          const invoiceDue = custDocs.reduce((sum, d) => {
            const bal = d.balance_due !== undefined
              ? Number(d.balance_due)
              : Math.max(0, (Number(d.grand_total) || 0) - (Number(d.paid_amount) || 0));
            return sum + Math.max(0, bal);
          }, 0);

          return {
            ...c,
            current_receivable: custDocs.length > 0 ? invoiceDue : (Number(c.current_receivable) || 0)
          };
        });
        setCustomers(enrichedCustomers);
      }

      // 6. Suppliers
      const { data: suppData, error: suppErr } = await supabase.from('suppliers').select('*').order('name', { ascending: true });
      if (!suppErr && suppData && suppData.length > 0) setSuppliers(suppData);

      // 7. Bank Accounts
      const { data: bankData, error: bankErr } = await supabase.from('bank_accounts').select('*');
      if (!bankErr && bankData && bankData.length > 0) setBankAccounts(bankData);

      // 8. Sales Documents (Enriched with product details and customer info)
      const { data: docData, error: docErr } = await supabase.from('sales_documents')
        .select('*, items:sales_document_items(*, product:products(name, item_code, sku)), customer:customers(business_name, billing_address, phone)')
        .order('created_at', { ascending: false });
      if (!docErr && docData && docData.length > 0) {
        const enrichedSales = docData.map(d => ({
          ...d,
          customer_name: d.customer?.business_name || d.customer_name || 'Cash / Counter Customer',
          customer_phone: d.customer?.phone || d.customer_phone || '',
          items: (d.items || []).map(it => {
            const pObj = it.product || products.find(p => p.id === it.product_id);
            return {
              ...it,
              product_name: pObj?.name || it.product_name || 'Product Item',
              item_code: pObj?.item_code || it.item_code || '',
              product: pObj || it.product
            };
          })
        }));
        setSalesDocuments(enrichedSales);
      }

      // 9. Purchase Receipts (Enriched with product details and supplier info)
      const { data: grnData, error: grnErr } = await supabase.from('purchase_receipts')
        .select('*, items:purchase_receipt_items(*, product:products(name, item_code, sku)), supplier:suppliers(name), transit_shipment:transit_shipments(shipment_no)')
        .order('created_at', { ascending: false });

      const receivedTransitIds = new Set((grnData || []).map(g => g.transit_shipment_id).filter(Boolean));

      if (!grnErr && grnData && grnData.length > 0) {
        const enrichedPurchases = grnData.map(g => ({
          ...g,
          doc_no: g.grn_no || g.doc_no,
          grn_no: g.grn_no || g.doc_no,
          total_amount_lkr: Number(g.total_landed_lkr) || Number(g.total_amount_lkr) || 0,
          total_landed_lkr: Number(g.total_landed_lkr) || Number(g.total_amount_lkr) || 0,
          supplier_name: g.supplier?.name || 'Supplier',
          shipment_no: g.transit_shipment?.shipment_no || '',
          status: g.is_fully_received ? 'received' : 'draft',
          items: (g.items || []).map(it => {
            const pObj = it.product || products.find(p => p.id === it.product_id);
            const cost = Number(it.final_landed_unit_cost_lkr || it.unit_cost_lkr || it.foreign_unit_cost) || 0;
            const qty = Number(it.received_sellable_qty || it.qty || it.shipped_qty) || 0;
            return {
              ...it,
              product_name: pObj?.name || it.product_name || 'Product Item',
              item_code: pObj?.item_code || it.item_code || '',
              product: pObj || it.product,
              qty: qty,
              shipped_qty: qty,
              received_sellable_qty: qty,
              damaged_qty: Number(it.damaged_qty) || 0,
              unit_cost_lkr: cost,
              final_landed_unit_cost_lkr: cost
            };
          })
        }));
        setPurchases(enrichedPurchases);
      }

      // 10. Transit Shipments (Cross-checked against arrived purchase receipts)
      const { data: trnData, error: trnErr } = await supabase.from('transit_shipments').select('*, items:transit_shipment_items(*), landed_expenses:landed_costs(*), supplier:suppliers(name)').order('created_at', { ascending: false });
      if (!trnErr && trnData && trnData.length > 0) {
        const enrichedTransit = trnData
          .filter(t => !t.shipment_no?.startsWith('DIR-TRN-') && !t.notes?.includes('Direct purchase companion'))
          .map(t => {
            const isArrived = t.status === 'received' || receivedTransitIds.has(t.id);
            return {
              ...t,
              status: t.status === 'preparing' ? 'draft' : (isArrived ? 'arrived' : t.status),
              supplier_name: t.supplier?.name || 'Supplier',
              items: (t.items || []).map(it => ({
                ...it,
                qty: Number(it.shipped_qty) || 0,
                shipped_qty: Number(it.shipped_qty) || 0,
                foreign_unit_cost: Number(it.foreign_unit_cost) || 0,
                unit_cost: Number(it.foreign_unit_cost) || 0,
                final_landed_unit_cost_lkr: (Number(it.foreign_unit_cost) || 0) * (Number(t.exchange_rate_snapshot) || 1)
              }))
            };
          });
        setTransitShipments(enrichedTransit);
      }

      // 11. Cheques
      const { data: chqData, error: chqErr } = await supabase.from('cheque_register').select('*').order('created_at', { ascending: false });
      if (!chqErr && chqData && chqData.length > 0) setCheques(chqData);

      // 12. Payments
      const { data: payData, error: payErr } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
      if (!payErr && payData && payData.length > 0) setPayments(payData);

      // 13. Currencies & Company Settings
      const { data: currData, error: currErr } = await supabase.from('currencies').select('*');
      if (!currErr && currData && currData.length > 0) setCurrencies(currData);

      const { data: compData, error: compErr } = await supabase.from('company_settings').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle();
      
      let loadedLogoUrl = '';
      try {
        const { data: logoLog } = await supabase.from('audit_log').select('details').eq('entity_type', 'company_logo').order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (logoLog && logoLog.details?.logo_url) {
          loadedLogoUrl = logoLog.details.logo_url;
        }
      } catch (e) {
        console.warn('Could not fetch company logo from cloud:', e);
      }

      if (!compErr && compData) {
        const addressParts = (compData.address || '').split('\n').map(s => s.trim()).filter(Boolean);
        let line1 = '';
        let line2 = '';
        if (addressParts.length >= 2) {
          line1 = addressParts[0];
          line2 = addressParts.slice(1).join(', ');
        } else {
          const commaParts = (compData.address || '').split(',').map(s => s.trim()).filter(Boolean);
          if (commaParts.length > 1) {
            line1 = commaParts.slice(0, -1).join(', ');
            line2 = commaParts[commaParts.length - 1];
          } else {
            line1 = compData.address || '';
            line2 = '';
          }
        }

        const fullProfile = {
          ...compData,
          address_line1: line1,
          address_line2: line2,
          logo_url: loadedLogoUrl
        };
        setCompanySettings(fullProfile);
      }

    } catch (err) {
      console.warn('Supabase fetch notice (operating with cached local data):', err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Fetch from Supabase on mount
  useEffect(() => {
    fetchSupabaseData();
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
      try {
        if (supabase) {
          await supabase.from('categories').update({
            name: catData.name,
            parent_id: sanitizedParentId,
            sort_order: catData.sort_order || 0,
            is_active: catData.is_active !== false
          }).eq('id', catData.id);
        }
      } catch (e) {
        console.warn('Category update notice:', e);
      }
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
      try {
        if (supabase) {
          await supabase.from('categories').upsert({
            id: newCat.id,
            name: newCat.name,
            parent_id: newCat.parent_id,
            sort_order: newCat.sort_order,
            is_active: true
          });
        }
      } catch (e) {
        console.warn('Category insert notice:', e);
      }
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

    try {
      if (supabase) {
        await supabase.from('categories').delete().in('id', idsToDelete);
      }
    } catch (e) {
      console.warn('Category delete notice:', e);
    }
    notifySuccess('Category folder deleted');
  };

  const deleteAllCategories = async () => {
    setCategories([]);
    setProducts(prev => prev.map(p => ({ ...p, category_id: null })));
    localStorage.removeItem('gs_wholesale_categories');
    try {
      if (supabase) {
        await supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }
    } catch (e) {
      console.warn('All categories delete notice:', e);
    }
    notifySuccess('All category folders removed');
  };

  // Brand Management
  const saveBrand = async (brandData) => {
    const targetId = brandData.id || generateUUID();
    if (brandData.id) {
      setBrands(prev => prev.map(b => b.id === brandData.id ? { ...b, ...brandData } : b));
      try {
        if (supabase) {
          await supabase.from('brands').update({
            name: brandData.name,
            country: brandData.country || 'Local'
          }).eq('id', brandData.id);
        }
      } catch (e) {}
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
      try {
        if (supabase) {
          await supabase.from('brands').upsert({
            id: newB.id,
            name: newB.name,
            country: newB.country,
            is_active: true
          });
        }
      } catch (e) {}
      notifySuccess(`Brand "${newB.name}" created`);
      return newB;
    }
  };

  const deleteBrand = async (brandId) => {
    setBrands(prev => prev.filter(b => b.id !== brandId));
    setProducts(prev => prev.map(p => p.brand_id === brandId ? { ...p, brand_id: null } : p));
    try {
      if (supabase) {
        await supabase.from('brands').delete().eq('id', brandId);
      }
    } catch (e) {}
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

      try {
        if (supabase) {
          const { error } = await supabase.from('products').update({
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
            is_active: productData.is_active !== false
          }).eq('id', productData.id);
          if (error) console.error('Supabase product update error:', error);
        }
      } catch (e) {
        console.warn('Product update notice:', e);
      }
      notifySuccess('Product updated successfully');
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

      try {
        if (supabase) {
          const { error: prodErr } = await supabase.from('products').upsert({
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
          });

          if (prodErr) {
            console.error('Supabase product insert error:', prodErr);
          } else {
            // Also initialize stock_balances in Supabase
            await supabase.from('stock_balances').upsert({
              product_id: newProd.id,
              qty_on_hand: 0,
              qty_reserved: 0,
              qty_available: 0,
              qty_in_transit: 0,
              qty_damaged: 0
            });
          }
        }
      } catch (e) {
        console.warn('Product insert notice:', e);
      }
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
    try {
      if (supabase) {
        await supabase.from('stock_balances').delete().eq('product_id', productId);
        await supabase.from('products').delete().eq('id', productId);
      }
    } catch (e) {
      console.warn('Product delete error:', e);
    }
    notifySuccess('Product deleted successfully');
    return { success: true };
  };

  // Customer CRUD
  const saveCustomer = async (customerData) => {
    const targetId = customerData.id || generateUUID();
    if (customerData.id) {
      setCustomers(prev => prev.map(c => c.id === customerData.id ? { ...c, ...customerData, updated_at: new Date().toISOString() } : c));
      try {
        if (supabase) {
          await supabase.from('customers').update({
            business_name: customerData.business_name,
            contact_person: customerData.contact_person,
            phone: customerData.phone,
            whatsapp: customerData.whatsapp,
            email: customerData.email,
            billing_address: customerData.billing_address,
            price_tier: customerData.price_tier,
            credit_allowed: customerData.credit_allowed,
            credit_limit: customerData.credit_limit,
            credit_days: customerData.credit_days
          }).eq('id', customerData.id);
        }
      } catch (e) {}
      notifySuccess('Customer profile updated');
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

      try {
        if (supabase) {
          await supabase.from('customers').upsert({
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
          });
        }
      } catch (e) {}
      notifySuccess('New customer created');
      return newCust;
    }
  };

  const deleteCustomer = async (customerId) => {
    setCustomers(prev => prev.filter(c => c.id !== customerId));
    try {
      if (supabase) {
        await supabase.from('customers').delete().eq('id', customerId);
      }
    } catch (e) {}
    notifySuccess('Customer deleted');
  };

  // Record Customer Credit Settlement
  const recordCustomerSettlement = (settlementData) => {
    const {
      customer_id,
      customer_name,
      amount,
      payment_date,
      payment_method, // 'cash' | 'bank' | 'cheque'
      reference,
      notes,
      bank_account_id,
      cheque_no,
      cheque_date,
      bank_name
    } = settlementData;

    const amt = Number(amount) || 0;
    if (amt <= 0) throw new Error('Payment amount must be greater than 0');

    const targetId = customer_id != null ? String(customer_id).trim() : '';
    const targetName = (customer_name || '').trim().toLowerCase();

    const isCustomerMatch = (c) => {
      if (!c) return false;
      const cId = c.id != null ? String(c.id).trim() : '';
      const cName = (c.business_name || '').trim().toLowerCase();
      if (targetId && cId && targetId === cId) return true;
      if (targetName && cName && (targetName === cName || cName.includes(targetName) || targetName.includes(cName))) return true;
      return false;
    };

    const isDocMatch = (doc) => {
      if (!doc) return false;
      const docCustId = doc.customer_id != null ? String(doc.customer_id).trim() : '';
      const docCustName = (doc.customer_name || '').trim().toLowerCase();
      if (targetId && docCustId && targetId === docCustId) return true;
      if (targetName && docCustName && (targetName === docCustName || docCustName.includes(targetName) || targetName.includes(docCustName))) return true;
      return false;
    };

    const cust = customers.find(isCustomerMatch);
    const payDate = payment_date || new Date().toISOString().slice(0, 10);
    const payNo = `SETTLE-${Date.now().toString().slice(-4)}`;
    const paymentId = generateUUID();

    // 1. Create Payment Record (Recorded as Inflow in Cash Flow & Ledger)
    const newPayment = {
      id: paymentId,
      payment_no: payNo,
      payment_date: payDate,
      payment_type: 'customer_settlement',
      party_type: 'customer',
      party_id: cust?.id || customer_id,
      customer_name: cust?.business_name || customer_name || 'Customer',
      amount: amt,
      currency: 'LKR',
      payment_method: payment_method || 'cash',
      bank_account_id: bank_account_id || (payment_method === 'bank' ? bankAccounts[0]?.id : null),
      reference: reference || (cheque_no ? `Cheque #${cheque_no}` : 'Customer Credit Settlement'),
      notes: notes || '',
      created_at: new Date().toISOString()
    };

    setPayments(prev => [newPayment, ...prev]);

    try {
      if (supabase) {
        const cId = isValidUUID(cust?.id) ? cust.id : (isValidUUID(customer_id) ? customer_id : null);
        supabase.from('payments').insert({
          id: paymentId,
          payment_no: payNo,
          payment_type: 'customer_payment',
          party_type: 'customer',
          party_id: cId,
          payment_date: payDate,
          amount: amt,
          payment_method: payment_method || 'cash',
          reference: reference || (cheque_no ? `Cheque #${cheque_no}` : 'Customer Credit Settlement'),
          notes: notes || ''
        }).then(() => {}).catch(e => console.warn('Supabase payment insert notice:', e));

        if (cId) {
          const cur = Number(cust?.current_receivable) || 0;
          supabase.from('customers').update({
            current_receivable: Math.max(0, cur - amt)
          }).eq('id', cId).then(() => {}).catch(() => {});
        }
      }
    } catch (e) {}

    // 2. If cheque, record in cheque register
    if (payment_method === 'cheque' && cheque_no) {
      const newCheque = {
        id: 'chq-' + Date.now(),
        cheque_no,
        bank_name: bank_name || 'Commercial Bank',
        party_type: 'customer',
        party_id: cust?.id || customer_id,
        party_name: cust?.business_name || customer_name || 'Customer',
        direction: 'received',
        amount: amt,
        cheque_date: cheque_date || payDate,
        status: 'received',
        notes: notes || 'Customer Settlement Cheque',
        created_at: new Date().toISOString()
      };
      setCheques(prev => [newCheque, ...prev]);
    }

    // 3. Update customer receivable directly
    setCustomers(prev => prev.map(c => {
      if (!isCustomerMatch(c)) return c;
      const cur = Number(c.current_receivable) || 0;
      return {
        ...c,
        current_receivable: Math.max(0, cur - amt),
        updated_at: new Date().toISOString()
      };
    }));

    // 4. Allocate payment against oldest unpaid invoices (FIFO)
    setSalesDocuments(prev => {
      let remainingToAllocate = amt;

      // Find all matching unpaid invoices sorted oldest first
      const eligibleInvoices = prev
        .filter(doc => {
          const due = doc.balance_due !== undefined
            ? Number(doc.balance_due)
            : Math.max(0, (Number(doc.grand_total) || 0) - (Number(doc.paid_amount) || 0));
          return isDocMatch(doc) && doc.doc_type !== 'quotation' && doc.status !== 'cancelled' && due > 0.01;
        })
        .sort((a, b) => new Date(a.doc_date || a.created_at) - new Date(b.doc_date || b.created_at));

      const allocations = {};
      for (const inv of eligibleInvoices) {
        if (remainingToAllocate <= 0) break;
        const due = inv.balance_due !== undefined
          ? Number(inv.balance_due)
          : Math.max(0, (Number(inv.grand_total) || 0) - (Number(inv.paid_amount) || 0));
        const alloc = Math.min(due, remainingToAllocate);
        allocations[inv.id] = alloc;
        remainingToAllocate -= alloc;
      }

      return prev.map(doc => {
        const alloc = allocations[doc.id];
        if (!alloc) return doc;

        const due = doc.balance_due !== undefined
          ? Number(doc.balance_due)
          : Math.max(0, (Number(doc.grand_total) || 0) - (Number(doc.paid_amount) || 0));
        const newPaid = (Number(doc.paid_amount) || 0) + alloc;
        const newDue = Math.max(0, due - alloc);
        const newStatus = newDue <= 0.01 ? 'paid' : 'partial';

        return {
          ...doc,
          paid_amount: newPaid,
          balance_due: newDue,
          payment_status: newStatus
        };
      });
    });

    // 5. Update Bank Account if cash/bank
    const effectiveBankId = bank_account_id || (payment_method === 'bank' ? bankAccounts[0]?.id : null);
    if (effectiveBankId) {
      setBankAccounts(prev => prev.map(b => b.id === effectiveBankId ? {
        ...b,
        current_balance: (Number(b.current_balance) || 0) + amt
      } : b));
    }

    notifySuccess(`Settlement of Rs. ${amt.toLocaleString()} recorded for ${cust?.business_name || customer_name || 'Customer'}`);
    return newPayment;
  };

  // Record Direct Expense / Outflow
  const recordDirectExpense = (expenseData) => {
    const {
      amount,
      expense_category,
      payment_date,
      payment_method,
      bank_account_id,
      reference,
      notes,
      payee_name
    } = expenseData;

    const amt = Number(amount) || 0;
    if (amt <= 0) throw new Error('Expense amount must be greater than 0');

    const effectiveBankId = bank_account_id || (payment_method === 'bank' ? bankAccounts[0]?.id : null);
    const expNo = `EXP-${Date.now().toString().slice(-4)}`;
    const newPayment = {
      id: 'pay-exp-' + Date.now(),
      payment_no: expNo,
      payment_date: payment_date || new Date().toISOString().slice(0, 10),
      payment_type: 'operational_expense',
      party_type: 'payee',
      party_id: null,
      payee_name: payee_name || expense_category || 'Operational Expense',
      expense_category: expense_category || 'General Expense',
      amount: amt,
      currency: 'LKR',
      payment_method: payment_method || 'cash',
      bank_account_id: effectiveBankId,
      reference: reference || '',
      notes: notes || '',
      created_at: new Date().toISOString()
    };

    setPayments(prev => [newPayment, ...prev]);

    // Reverse bank balance if paid from bank
    if (effectiveBankId && amt > 0) {
      setBankAccounts(prev => prev.map(b => b.id === effectiveBankId ? {
        ...b,
        current_balance: Math.max(0, (Number(b.current_balance) || 0) - amt)
      } : b));
    }

    try {
      if (supabase) {
        supabase.from('payments').upsert({
          id: newPayment.id,
          payment_no: newPayment.payment_no,
          payment_date: newPayment.payment_date,
          payment_type: newPayment.payment_type,
          party_type: newPayment.party_type,
          amount: newPayment.amount,
          currency: newPayment.currency,
          payment_method: newPayment.payment_method,
          bank_account_id: newPayment.bank_account_id,
          reference: newPayment.reference,
          notes: newPayment.notes
        }).catch(() => {});
      }
    } catch (e) {}

    notifySuccess(`Expense payment of Rs. ${amt.toLocaleString()} recorded`);
    return newPayment;
  };

  // Record Direct Capital Investment / Other Inflow
  const recordDirectIncome = (incomeData) => {
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

    const effectiveBankId = bank_account_id || (payment_method === 'bank' ? bankAccounts[0]?.id : null);
    const incNo = `CAP-${Date.now().toString().slice(-4)}`;
    const categoryName = income_category || "Owner's Capital Investment (Initial)";

    const newPayment = {
      id: 'pay-inc-' + Date.now(),
      payment_no: incNo,
      payment_date: payment_date || new Date().toISOString().slice(0, 10),
      payment_type: 'direct_income',
      party_type: 'payer',
      party_id: null,
      payee_name: payer_name || categoryName || 'Capital Investment',
      payer_name: payer_name || categoryName || 'Capital Investment',
      income_category: categoryName,
      amount: amt,
      currency: 'LKR',
      payment_method: payment_method || 'cash',
      bank_account_id: effectiveBankId,
      reference: reference || '',
      notes: notes || '',
      created_at: new Date().toISOString()
    };

    setPayments(prev => [newPayment, ...prev]);

    // Add to bank balance if deposited into bank
    if (effectiveBankId && amt > 0) {
      setBankAccounts(prev => prev.map(b => b.id === effectiveBankId ? {
        ...b,
        current_balance: (Number(b.current_balance) || 0) + amt
      } : b));
    }

    try {
      if (supabase) {
        supabase.from('payments').upsert({
          id: newPayment.id,
          payment_no: newPayment.payment_no,
          payment_date: newPayment.payment_date,
          payment_type: newPayment.payment_type,
          party_type: newPayment.party_type,
          amount: newPayment.amount,
          currency: newPayment.currency,
          payment_method: newPayment.payment_method,
          bank_account_id: newPayment.bank_account_id,
          reference: newPayment.reference,
          notes: newPayment.notes
        }).catch(() => {});
      }
    } catch (e) {}

    notifySuccess(`${categoryName} of Rs. ${amt.toLocaleString()} recorded successfully`);
    return newPayment;
  };

  // Supplier CRUD
  const saveSupplier = async (supplierData) => {
    const targetId = supplierData.id || generateUUID();
    if (supplierData.id) {
      setSuppliers(prev => prev.map(s => s.id === supplierData.id ? { ...s, ...supplierData, updated_at: new Date().toISOString() } : s));
      try {
        if (supabase) {
          await supabase.from('suppliers').update({
            name: supplierData.name,
            country: supplierData.country,
            contact_person: supplierData.contact_person,
            phone: supplierData.phone,
            email: supplierData.email,
            default_currency: supplierData.default_currency,
            default_lead_days: supplierData.default_lead_days,
            bank_details: supplierData.bank_details
          }).eq('id', supplierData.id);
        }
      } catch (e) {}
      notifySuccess('Supplier profile updated');
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

      try {
        if (supabase) {
          await supabase.from('suppliers').upsert({
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
          });
        }
      } catch (e) {}
      notifySuccess('New supplier profile created');
    }
  };

  const deleteSupplier = async (supplierId) => {
    setSuppliers(prev => prev.filter(s => s.id !== supplierId));
    try {
      if (supabase) {
        await supabase.from('suppliers').delete().eq('id', supplierId);
      }
    } catch (e) {
      console.warn('Supplier delete error:', e);
    }
    notifySuccess('Supplier deleted successfully');
  };

  // Create Supplier Order
  const createSupplierOrder = async (orderData) => {
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

  // Record Supplier Advance
  const recordSupplierAdvance = async (advanceData) => {
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

    setSuppliers(prev => prev.map(s => s.id === advanceData.supplier_id ? {
      ...s,
      current_advance_balance: (s.current_advance_balance || 0) + lkrAmount
    } : s));

    if (advanceData.bank_account_id) {
      setBankAccounts(prev => prev.map(b => b.id === advanceData.bank_account_id ? {
        ...b,
        current_balance: (b.current_balance || 0) - lkrAmount
      } : b));
    }

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

    setTransitShipments(prev => [newShp, ...prev]);

    // Only affect stock balances and payments if NOT saved as draft
    if (!isDraft) {
      setStockBalances(prev => {
        const updated = { ...prev };
        (shipmentData.items || []).forEach(it => {
          const pId = it.product_id;
          const cur = updated[pId] || { qty_on_hand: 0, qty_reserved: 0, qty_available: 0, qty_in_transit: 0, qty_damaged: 0 };
          updated[pId] = {
            ...cur,
            qty_in_transit: (cur.qty_in_transit || 0) + (Number(it.shipped_qty || it.qty) || 1)
          };
        });
        return updated;
      });

      if (shipmentData.supplier_order_id) {
        setSupplierOrders(prev => prev.map(o => o.id === shipmentData.supplier_order_id ? { ...o, status: 'dispatched' } : o));
      }

      const payType = shipmentData.payment_type || 'credit';
      const totalOrderVal = lkrFob;

      if (payType !== 'credit') {
        // Record payment for Cashflow
        setPayments(prev => [{
          id: 'pay-' + Date.now(),
          payment_no: `PAY-TRN-${Date.now().toString().slice(-4)}`,
          payment_date: shipmentData.document_date || new Date().toISOString().slice(0, 10),
          payment_type: 'transit_purchase_payment',
          party_type: 'supplier',
          party_id: shipmentData.supplier_id,
          amount: totalOrderVal,
          currency: 'LKR',
          payment_method: payType, // 'cash' | 'bank' | 'cheque'
          reference: shipmentData.external_reference || shpNo,
          created_at: new Date().toISOString()
        }, ...prev]);

        if (payType === 'cash' || payType === 'bank') {
          setBankAccounts(prev => {
            if (!prev.length) return prev;
            return prev.map((b, idx) => idx === 0 ? { ...b, current_balance: (b.current_balance || 0) - totalOrderVal } : b);
          });
        }
      } else if (shipmentData.supplier_id) {
        // Record Accounts Payable to supplier
        setSuppliers(prev => prev.map(s => s.id === shipmentData.supplier_id ? {
          ...s,
          current_payable: (s.current_payable || 0) + totalOrderVal
        } : s));
      }
    }

    try {
      if (supabase) {
        const suppId = isValidUUID(shipmentData.supplier_id) ? shipmentData.supplier_id : (suppliers[0]?.id || null);
        supabase.from('transit_shipments').upsert({
          id: trnId,
          shipment_no: shpNo,
          supplier_id: suppId,
          supplier_invoice_ref: shipmentData.supplier_invoice_ref || shipmentData.external_reference || null,
          shipment_ref: shipmentData.shipment_ref || null,
          tracking_or_bl_no: shipmentData.tracking_or_bl_no || null,
          courier_freight_company: shipmentData.courier_freight_company || null,
          origin_country: shipmentData.origin_country || 'China',
          shipping_date: shipmentData.document_date || shipmentData.shipping_date || new Date().toISOString().slice(0, 10),
          currency: shipmentData.currency || 'USD',
          exchange_rate_snapshot: rate,
          foreign_items_subtotal: foreignSubtotal,
          total_landed_expenses_lkr: 0,
          total_estimated_cost_lkr: lkrFob,
          status: isDraft ? 'preparing' : 'in_transit',
          notes: shipmentData.notes || null
        }).then(() => {
          if (newShp.items && newShp.items.length > 0) {
            const trnItems = newShp.items.map(it => {
              const pId = it.product_id || it.id;
              if (!isValidUUID(pId)) return null;
              return {
                id: generateUUID(),
                transit_shipment_id: trnId,
                product_id: pId,
                shipped_qty: Number(it.shipped_qty || it.qty) || 1,
                foreign_unit_cost: Number(it.foreign_unit_cost || it.unit_cost) || 0
              };
            }).filter(Boolean);

            if (trnItems.length > 0) {
              supabase.from('transit_shipment_items').upsert(trnItems).then(() => {}).catch(() => {});
            }
          }

          if (!isDraft) {
            for (const it of (newShp.items || [])) {
              const pId = it.product_id || it.id;
              if (isValidUUID(pId)) {
                const cur = stockBalances[pId] || { qty_on_hand: 0, qty_in_transit: 0 };
                const qty = Number(it.shipped_qty || it.qty) || 1;
                supabase.from('stock_balances').upsert({
                  product_id: pId,
                  qty_in_transit: (cur.qty_in_transit || 0) + qty
                }).then(() => {}).catch(() => {});
              }
            }
          }
        }).catch(err => console.warn('Supabase transit shipment sync notice:', err));
      }
    } catch (e) {}

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

      const payType = updatedShipment.payment_type || existingShp.payment_type || 'credit';
      if (payType === 'credit' && updatedShipment.supplier_id) {
        setSuppliers(prev => prev.map(s => s.id === updatedShipment.supplier_id ? {
          ...s,
          current_payable: (s.current_payable || 0) + totalCostLkr
        } : s));
      }
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

      const oldTotal = existingShp.total_estimated_cost_lkr || existingShp.foreign_items_subtotal || 0;
      if (existingShp.payment_type === 'credit' && existingShp.supplier_id) {
        setSuppliers(prev => prev.map(s => s.id === existingShp.supplier_id ? {
          ...s,
          current_payable: Math.max(0, (s.current_payable || 0) - oldTotal)
        } : s));
      }
    }

    // Financial delta adjustment if both were in_transit
    if (!wasDraft && !isNowDraft) {
      const oldTotal = existingShp.total_estimated_cost_lkr || existingShp.foreign_items_subtotal || 0;
      const newTotal = totalCostLkr;
      const totalDelta = newTotal - oldTotal;

      const payType = updatedShipment.payment_type || existingShp.payment_type || 'credit';
      if (payType === 'credit' && updatedShipment.supplier_id) {
        setSuppliers(prev => prev.map(s => s.id === updatedShipment.supplier_id ? {
          ...s,
          current_payable: Math.max(0, (s.current_payable || 0) + totalDelta)
        } : s));
      }
    }

    try {
      if (supabase && isValidUUID(shipmentId)) {
        const dbStatus = newStatus === 'draft' ? 'preparing' : (newStatus === 'arrived' ? 'received' : (['preparing', 'in_transit', 'partially_received', 'received', 'cancelled'].includes(newStatus) ? newStatus : 'in_transit'));
        supabase.from('transit_shipments').update({
          status: dbStatus,
          shipping_date: updatedData.document_date || updatedData.shipping_date || existingShp.shipping_date,
          currency: updatedData.currency || existingShp.currency,
          exchange_rate_snapshot: rate,
          foreign_items_subtotal: foreignSubtotal,
          total_estimated_cost_lkr: totalCostLkr,
          notes: updatedData.notes || existingShp.notes
        }).eq('id', shipmentId).then(() => {}).catch(() => {});
      }
    } catch (e) {}

    return updatedShipment;
  };

  // Add Landed Cost Expense
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

    if (expenseData.bank_account_id) {
      setBankAccounts(prev => prev.map(b => b.id === expenseData.bank_account_id ? {
        ...b,
        current_balance: (b.current_balance || 0) - expenseLkr
      } : b));
    }

    notifySuccess('Landed expense recorded & item unit costs updated!');
  };

  // Delete Stock in Transit Shipment
  const deleteTransitShipment = async (shipmentId) => {
    const shp = transitShipments.find(s => s.id === shipmentId);
    if (!shp) return;

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

    if (shp.status === 'in_transit' && shp.payment_type === 'credit' && shp.supplier_id) {
      const totalCost = Number(shp.total_estimated_cost_lkr || shp.foreign_items_subtotal) || 0;
      setSuppliers(prev => prev.map(s => s.id === shp.supplier_id ? {
        ...s,
        current_payable: Math.max(0, (s.current_payable || 0) - totalCost)
      } : s));
    }

    setPayments(prev => prev.filter(p => p.transit_shipment_id !== shipmentId && p.reference !== shp.shipment_no));

    try {
      if (supabase) {
        await supabase.from('transit_shipment_items').delete().eq('transit_shipment_id', shipmentId);
        await supabase.from('transit_shipments').delete().eq('id', shipmentId);
        await supabase.from('payments').delete().eq('transit_shipment_id', shipmentId);
        if (shp.shipment_no) {
          await supabase.from('payments').delete().or(`reference.eq.${shp.shipment_no},payment_no.ilike.%${shp.shipment_no}%`);
        }
      }
    } catch (e) {}

    notifySuccess(`Shipment ${shp.shipment_no || ''} deleted`);
  };

  // Receive Purchase Shipment (GRN / Arrived / Direct Purchase) & Re-average WAC
  const receivePurchaseShipment = (param) => {
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

      // Update supplier balance if credit, or record payment if cash/bank/cheque for direct purchase
      const purPayType = newPurchaseDoc.payment_type || 'credit';
      if (purPayType === 'credit') {
        if (supId) {
          setSuppliers(prev => prev.map(s => s.id === supId ? {
            ...s,
            current_payable: (s.current_payable || 0) + totalLandedLkr
          } : s));
        }
      } else if (isDirect) {
        // Direct Purchase Paid Now -> Record in payments & Cashflow
        setPayments(prev => [{
          id: 'pay-' + Date.now(),
          payment_no: `PAY-PUR-${Date.now().toString().slice(-4)}`,
          payment_date: receiptDate,
          payment_type: 'purchase_payment',
          party_type: 'supplier',
          party_id: supId,
          amount: totalLandedLkr,
          currency: 'LKR',
          payment_method: purPayType, // 'cash' | 'bank' | 'cheque'
          reference: newPurchaseDoc.doc_no,
          created_at: new Date().toISOString()
        }, ...prev]);

        if (purPayType === 'cash' || purPayType === 'bank') {
          setBankAccounts(prev => {
            if (!prev.length) return prev;
            return prev.map((b, idx) => idx === 0 ? { ...b, current_balance: (b.current_balance || 0) - totalLandedLkr } : b);
          });
        }
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

    try {
      if (supabase) {
        const suppId = isValidUUID(newPurchaseDoc.supplier_id) ? newPurchaseDoc.supplier_id : (suppliers[0]?.id || null);
        let linkTransitId = isValidUUID(newPurchaseDoc.transit_shipment_id) ? newPurchaseDoc.transit_shipment_id : (shp && isValidUUID(shp.id) ? shp.id : null);

        // If direct purchase without an existing transit shipment, create companion transit shipment
        const performSupabaseSync = async () => {
          if (!linkTransitId) {
            linkTransitId = generateUUID();
            await supabase.from('transit_shipments').upsert({
              id: linkTransitId,
              shipment_no: `DIR-TRN-${newPurchaseDoc.doc_no}`,
              supplier_id: suppId,
              shipping_date: receiptDate,
              currency: 'LKR',
              exchange_rate_snapshot: 1,
              foreign_items_subtotal: totalLandedLkr,
              total_landed_expenses_lkr: 0,
              total_estimated_cost_lkr: totalLandedLkr,
              status: 'received',
              notes: 'Direct purchase companion shipment'
            });
          } else {
            // Update existing transit shipment to received in cloud so all devices immediately reflect arrival
            await supabase.from('transit_shipments').update({
              status: 'received',
              actual_arrival_date: receiptDate
            }).eq('id', linkTransitId);
          }

          await supabase.from('purchase_receipts').upsert({
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
            is_fully_received: !isDraft,
            notes: newPurchaseDoc.notes || null
          });

          if (items && items.length > 0) {
            const grnItems = items.map(it => {
              if (!isValidUUID(it.product_id)) return null;
              return {
                id: generateUUID(),
                purchase_receipt_id: purchaseId,
                product_id: it.product_id,
                received_sellable_qty: Number(it.received_sellable_qty) || 0,
                damaged_qty: Number(it.damaged_qty) || 0
              };
            }).filter(Boolean);

            if (grnItems.length > 0) {
              await supabase.from('purchase_receipt_items').upsert(grnItems);
            }
          }

          if (!isDraft) {
            for (const it of items) {
              if (isValidUUID(it.product_id)) {
                const cur = stockBalances[it.product_id] || { qty_on_hand: 0, qty_available: 0, qty_in_transit: 0 };
                const sellable = Number(it.received_sellable_qty) || 0;
                const shipped = isDirect ? 0 : (Number(it.shipped_qty) || sellable);
                await supabase.from('stock_balances').upsert({
                  product_id: it.product_id,
                  qty_on_hand: (cur.qty_on_hand || 0) + sellable,
                  qty_available: (cur.qty_available || 0) + sellable,
                  qty_in_transit: Math.max(0, (cur.qty_in_transit || 0) - shipped)
                });
              }
            }
          }
        };
        performSupabaseSync().catch(e => console.warn('Supabase receivePurchaseShipment sync notice:', e));
      }
    } catch (e) {}

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

      // Step 3: Financial delta adjustment
      const oldTotal = existingPur.total_amount_lkr || existingPur.total_landed_lkr || 0;
      const newTotal = totalLandedLkr;
      const totalDelta = newTotal - oldTotal;

      const purPayType = updatedPurchaseDoc.payment_type || existingPur.payment_type || 'credit';
      if (purPayType === 'credit' && supId) {
        setSuppliers(prev => prev.map(s => s.id === supId ? {
          ...s,
          current_payable: Math.max(0, (s.current_payable || 0) + totalDelta)
        } : s));
      }

      // Step 4: Record adjustment movement
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

      const purPayType = updatedPurchaseDoc.payment_type || existingPur.payment_type || 'credit';
      if (purPayType === 'credit' && supId) {
        setSuppliers(prev => prev.map(s => s.id === supId ? {
          ...s,
          current_payable: (s.current_payable || 0) + totalLandedLkr
        } : s));
      }

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

    try {
      if (supabase && isValidUUID(purchaseId)) {
        supabase.from('purchase_receipts').update({
          is_fully_received: updatedPurchaseDoc.status !== 'draft',
          total_landed_lkr: totalLandedLkr,
          receipt_date: updatedPurchaseDoc.receipt_date,
          notes: updatedPurchaseDoc.notes
        }).eq('id', purchaseId).then(() => {}).catch(() => {});
      }
    } catch (e) {}

    return updatedPurchaseDoc;
  };

  // Delete Purchase Document & Reverse Inventory
  const deletePurchaseDocument = async (purchaseId) => {
    const pur = purchases.find(p => p.id === purchaseId);
    if (!pur) return;

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

      // 4. Adjust supplier payable if credit
      if (pur.payment_type === 'credit' && pur.supplier_id) {
        const totalAmount = Number(pur.total_amount_lkr || pur.total_landed_lkr) || 0;
        setSuppliers(prev => prev.map(s => s.id === pur.supplier_id ? {
          ...s,
          current_payable: Math.max(0, (s.current_payable || 0) - totalAmount)
        } : s));
      }

      // 5. Remove any direct payment
      setPayments(prev => prev.filter(p => p.purchase_id !== purchaseId && p.reference !== pur.doc_no && p.reference !== pur.grn_no));
    }

    // 5. Remove any direct payment
    setPayments(prev => prev.filter(p => p.purchase_id !== purchaseId && p.reference !== pur.doc_no && p.reference !== pur.grn_no));

    try {
      if (supabase) {
        await supabase.from('purchase_receipt_items').delete().eq('purchase_receipt_id', purchaseId);
        await supabase.from('purchase_receipts').delete().eq('id', purchaseId);
        await supabase.from('payments').delete().eq('purchase_id', purchaseId);
        const refNo = pur.doc_no || pur.grn_no;
        if (refNo) {
          await supabase.from('payments').delete().or(`reference.eq.${refNo},payment_no.eq.PAY-${refNo},payment_no.eq.PAY-PUR-${refNo}`);
        }
        if (pur.transit_shipment_id) {
          await supabase.from('transit_shipments').delete().eq('id', pur.transit_shipment_id).ilike('shipment_no', 'DIR-TRN-%');
        }
      }
    } catch (e) {}

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
      let defaultSupplierId = 'efe224ca-693a-4eb2-ba78-8e436d6e0beb';
      const supplierIdMap = {};
      for (const s of suppliers) {
        const sId = isValidUUID(s.id) ? s.id : generateUUID();
        supplierIdMap[s.id] = sId;
        if (s.name) supplierIdMap[s.name.toLowerCase().trim()] = sId;
        await supabase.from('suppliers').upsert({
          id: sId,
          supplier_code: s.supplier_code || 'SUP-001',
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
        await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('cheque_register').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('stock_balances').update({
          qty_on_hand: 0,
          qty_reserved: 0,
          qty_available: 0,
          qty_in_transit: 0,
          qty_damaged: 0
        }).neq('id', '00000000-0000-0000-0000-000000000000');
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

    let paidAmount = 0;
    const isCod = (docData.payment_lines || []).some(p => p.method === 'cod');

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
      : isQuotation ? 'draft' : (balanceDue <= 0.01 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid');

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

      // Record Advance Cheque if provided
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
          notes: `Advance for Reservation ${docNo}`,
          created_at: new Date().toISOString()
        };
        setCheques(prev => [newCheque, ...prev]);
      }

      // Record Advance Payment Receipts
      (docData.payment_lines || []).forEach(p => {
        if (p.method === 'cash' || p.method === 'bank') {
          const amt = Number(p.amount) || 0;
          if (amt > 0) {
            setPayments(prev => [{
              id: 'pay-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
              payment_no: `PAY-RES-${Date.now().toString().slice(-4)}`,
              payment_date: new Date().toISOString().slice(0, 10),
              payment_type: 'customer_advance',
              party_type: 'customer',
              party_id: docData.customer_id,
              customer_name: docData.customer_name,
              sales_doc_id: newDoc.id,
              amount: amt,
              currency: 'LKR',
              payment_method: p.method,
              bank_account_id: p.bank_account_id,
              reference: p.reference || `Advance deposit for ${docNo}`,
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
      return newDoc;
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

        if (balanceDue > 0) {
          setCustomers(prev => prev.map(c => {
            const matches = (docData.customer_id != null && String(c.id) === String(docData.customer_id)) ||
              (docData.customer_name && c.business_name && docData.customer_name.trim().toLowerCase() === c.business_name.trim().toLowerCase());
            if (!matches) return c;
            return {
              ...c,
              current_receivable: (Number(c.current_receivable) || 0) + balanceDue
            };
          }));
        }
      }

      newDoc.customer = updatedCustomerObj || docData.customer;
      newDoc.customer_receivable = finalCustomerReceivable;

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

    try {
      if (supabase) {
        const custId = isValidUUID(docData.customer_id) ? docData.customer_id : null;
        const performDocSync = async () => {
          await supabase.from('sales_documents').upsert({
            id: docId,
            doc_type: isQuotation ? 'quotation' : isReservation ? 'sales_order' : 'sales_invoice',
            doc_no: docNo,
            customer_id: custId,
            doc_date: newDoc.doc_date,
            subtotal: itemsSubtotal,
            grand_total: grandTotal,
            paid_amount: paidAmount,
            balance_due: balanceDue,
            status: isReservation ? 'confirmed' : isQuotation ? 'draft' : (balanceDue <= 0.01 ? 'paid' : 'partially_paid'),
            payment_status: isReservation ? (paidAmount >= grandTotal ? 'paid' : paidAmount > 0 ? 'partially_paid' : 'unpaid') : isQuotation ? 'unpaid' : (balanceDue <= 0.01 ? 'paid' : paidAmount > 0 ? 'partially_paid' : 'unpaid'),
            notes: docData.notes || (isCod ? 'Cash on Delivery (COD)' : null)
          });

          if (docData.items && docData.items.length > 0) {
            const itemsToInsert = docData.items.map(it => {
              const pId = it.product?.id || it.product_id;
              if (!isValidUUID(pId)) return null;
              const unitPrice = it.is_warranty_replacement ? 0 : (Number(it.unit_price) || 0);
              const qty = Number(it.qty) || 1;
              return {
                id: generateUUID(),
                sales_document_id: docId,
                product_id: pId,
                qty: qty,
                unit_type: it.unit_type || 'unit',
                conversion_factor: 1,
                base_qty: qty,
                unit_price: unitPrice,
                line_total: Math.max(0, qty * unitPrice - (Number(it.discount_amount) || 0)),
                notes: it.notes || (it.is_warranty_replacement ? 'Warranty Replacement (Rs. 0)' : null)
              };
            }).filter(Boolean);

            if (itemsToInsert.length > 0) {
              await supabase.from('sales_document_items').upsert(itemsToInsert);
            }
          }

          if (docData.doc_type === 'sales_invoice' || isReservation) {
            for (const it of (docData.items || [])) {
              const pId = it.product?.id || it.product_id;
              if (isValidUUID(pId)) {
                const cur = stockBalances[pId] || { qty_on_hand: 0, qty_reserved: 0, qty_available: 0 };
                const qty = Number(it.qty) || 1;
                const newOnHand = isReservation ? (cur.qty_on_hand || 0) : Math.max(0, (cur.qty_on_hand || 0) - qty);
                const newReserved = isReservation ? (cur.qty_reserved || 0) + qty : (releasedFromReservation ? Math.max(0, (cur.qty_reserved || 0) - qty) : (cur.qty_reserved || 0));
                const newAvail = isReservation ? Math.max(0, (cur.qty_available || 0) - qty) : (releasedFromReservation ? (cur.qty_available || 0) : Math.max(0, (cur.qty_available || 0) - qty));

                await supabase.from('stock_balances').upsert({
                  product_id: pId,
                  qty_on_hand: newOnHand,
                  qty_reserved: newReserved,
                  qty_available: newAvail
                });
              }
            }
          }

          if (custId && balanceDue > 0) {
            const foundCust = customers.find(c => c.id === custId);
            if (foundCust) {
              await supabase.from('customers').update({
                current_receivable: (Number(foundCust.current_receivable) || 0) + balanceDue
              }).eq('id', custId);
            }
          }

          if (paidAmount > 0 && !isQuotation) {
            await supabase.from('payments').insert({
              id: generateUUID(),
              payment_no: `PAY-${docNo}`,
              payment_type: 'customer_payment',
              party_type: 'customer',
              party_id: custId,
              payment_date: new Date().toISOString().slice(0, 10),
              amount: paidAmount,
              payment_method: isCod ? 'cash' : (docData.payment_lines?.[0]?.method || 'cash'),
              reference: docNo,
              notes: `Payment for ${docNo}`
            });
          }
        };

        performDocSync().catch(err => console.warn('Supabase postSalesDocument sync notice:', err));
      }
    } catch (e) {}

    return newDoc;
  };

  // Cancel Customer Reservation & Release Stock back to available
  const cancelReservation = (docId) => {
    const doc = salesDocuments.find(d => d.id === docId);
    if (!doc) return;

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

    // Reverse customer balance due if unpaid balance existed
    if (doc.customer_id && doc.balance_due > 0) {
      setCustomers(prev => prev.map(c => c.id === doc.customer_id ? {
        ...c,
        current_receivable: Math.max(0, (c.current_receivable || 0) - doc.balance_due)
      } : c));
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

    const linkedPayments = payments.filter(isLinkedPayment);

    // Reverse bank account balances from linked payments
    linkedPayments.forEach(p => {
      const amt = Number(p.amount) || 0;
      if (amt > 0 && p.bank_account_id) {
        setBankAccounts(prev => prev.map(b => b.id === p.bank_account_id ? {
          ...b,
          current_balance: Math.max(0, (Number(b.current_balance) || 0) - amt)
        } : b));
      }
    });

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

    try {
      if (supabase) {
        await supabase.from('sales_document_items').delete().eq('sales_document_id', docId);
        await supabase.from('sales_documents').delete().eq('id', docId);
        await supabase.from('payments').delete().eq('sales_doc_id', docId);
        if (docNo) {
          await supabase.from('payments').delete().or(`reference.eq.${docNo},payment_no.eq.PAY-${docNo},payment_no.eq.PAY-INV-${docNo},notes.ilike.%${docNo}%`);
          await supabase.from('cheque_register').delete().or(`sales_document_id.eq.${docId},notes.ilike.%${docNo}%`);
        } else {
          await supabase.from('cheque_register').delete().eq('sales_document_id', docId);
        }
      }
    } catch (e) {
      console.warn('Supabase sales doc deletion notice:', e);
    }

    notifySuccess(`Document ${docNo || ''} deleted and related cash flow and stock reversed`);
  };

  // Delete an Individual Payment Transaction & Reverse Bank Balance Impact
  const deletePayment = async (paymentId) => {
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;

    // 1. Remove from payments state
    setPayments(prev => prev.filter(p => p.id !== paymentId));

    // 2. Reverse bank account balance if applicable
    const amt = Number(payment.amount) || 0;
    if (amt > 0 && payment.bank_account_id) {
      const isOutflow = payment.payment_type === 'transit_purchase_payment' ||
                        payment.payment_type === 'purchase_payment' ||
                        payment.payment_type === 'operational_expense' ||
                        payment.payment_type === 'supplier_advance' ||
                        payment.payment_type === 'expense';
      setBankAccounts(prev => prev.map(b => {
        if (b.id !== payment.bank_account_id) return b;
        const curBal = Number(b.current_balance) || 0;
        return {
          ...b,
          current_balance: isOutflow ? curBal + amt : Math.max(0, curBal - amt)
        };
      }));
    }

    // 3. If tied to a cheque, remove or cancel it in cheque register
    if (payment.payment_method === 'cheque' || payment.cheque_no) {
      setCheques(prev => prev.filter(c => c.id !== payment.cheque_id && c.cheque_no !== payment.cheque_no));
    }

    // 4. Delete from Supabase
    try {
      if (supabase) {
        await supabase.from('payments').delete().eq('id', paymentId);
      }
    } catch (e) {
      console.warn('Supabase delete payment notice:', e);
    }

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

    if (newStatus === 'cleared' && extraData.deposit_bank_account_id) {
      setBankAccounts(prev => prev.map(b => b.id === extraData.deposit_bank_account_id ? {
        ...b,
        current_balance: (b.current_balance || 0) + chq.amount
      } : b));
    }

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
      salesDocuments, setSalesDocuments, postSalesDocument, convertDocument, cancelReservation, deleteSalesDocument,
      cheques, setCheques, updateChequeStatus,
      payments, setPayments, recordDirectExpense, recordDirectIncome, deletePayment,
      resetAllData, resetTransactionsOnly, exportAllData, importAllData, syncLocalDataToCloud,
      dataLoading, refreshData: fetchSupabaseData
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
