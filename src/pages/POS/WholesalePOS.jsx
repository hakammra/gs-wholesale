import React, { useState, useEffect } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency, calculateWholesaleItemPrice, calculateDocumentTotals, formatDate } from '../../lib/formatters';
import { generateInvoicePDF } from '../../lib/pdfGenerator';
import { generateWhatsAppInvoiceLink } from '../../lib/exportUtils';
import CustomerHeader from '../../components/pos/CustomerHeader';
import ProductSearchGrid from '../../components/pos/ProductSearchGrid';
import PosCart from '../../components/pos/PosCart';
import PaymentModal from '../../components/pos/PaymentModal';
import MarginOverrideModal from '../../components/pos/MarginOverrideModal';

const DEFAULT_BILL = { id: 1, label: 'Bill 1', items: [], customer: null, docType: 'sales_invoice', discount: 0, source_reserved_doc_id: null };

export default function WholesalePOS() {
  const {
    postSalesDocument,
    saveCustomer,
    companySettings,
    salesDocuments,
    cancelReservation,
    customers,
    stockBalances = {}
  } = useBusiness();

  const { notifySuccess, notifyError, notifyWarning } = useNotification();

  // Multi-tab Bills state persisted in localStorage
  const [tabs, setTabs] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_pos_tabs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [DEFAULT_BILL];
  });

  const [activeTabId, setActiveTabId] = useState(() => {
    const saved = localStorage.getItem('gs_wholesale_pos_active_tab_id');
    return saved ? Number(saved) : 1;
  });

  // Persist bills whenever tabs change
  useEffect(() => {
    localStorage.setItem('gs_wholesale_pos_tabs', JSON.stringify(tabs));
  }, [tabs]);

  useEffect(() => {
    localStorage.setItem('gs_wholesale_pos_active_tab_id', String(activeTabId));
  }, [activeTabId]);

  const currentTab = tabs.find(t => t.id === activeTabId) || tabs[0] || DEFAULT_BILL;

  // Modals
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [completedSaleDoc, setCompletedSaleDoc] = useState(null);
  const [isMarginOverrideOpen, setIsMarginOverrideOpen] = useState(false);
  const [pendingLowMarginItems, setPendingLowMarginItems] = useState([]);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isReservationsModalOpen, setIsReservationsModalOpen] = useState(false);
  const [isCreateReservationOpen, setIsCreateReservationOpen] = useState(false);
  const [reservationForm, setReservationForm] = useState({
    customer_name: '',
    customer_phone: '',
    advance_amount: '',
    payment_method: 'cash',
    cheque_no: '',
    cheque_date: new Date().toISOString().slice(0, 10),
    notes: ''
  });
  const [newCustomerForm, setNewCustomerForm] = useState({
    business_name: '', contact_person: '', phone: '', price_tier: 'Dealer', credit_limit: 500000, credit_days: 30
  });

  const effectiveCartDiscount = currentTab.discount_type === 'percent'
    ? Number(((currentTab.items.reduce((s, it) => s + (it.is_warranty_replacement ? 0 : Math.max(0, (Number(it.qty) * Number(it.unit_price)) - (Number(it.discount_amount) || 0))), 0) * (Number(currentTab.discount_value) || 0)) / 100).toFixed(2))
    : (Number(currentTab.discount) || 0);

  const totals = calculateDocumentTotals(currentTab.items, effectiveCartDiscount, 0);

  // Active Open Customer Reservations
  const openReservations = salesDocuments.filter(d =>
    (d.doc_type === 'reserved_order' || d.doc_type === 'sales_order') &&
    (d.status === 'reserved' || d.payment_status === 'reserved')
  );

  const handleQuickCash = () => {
    if (currentTab.items.length === 0) {
      notifyWarning('Add products to the bill first');
      return;
    }
    handleCompleteSale({
      payment_lines: [{ method: 'cash', amount: totals.grand_total, currency: 'LKR' }],
      cheque_details: null,
      notes: 'Quick Cash Sale'
    });
  };

  const handleQuickCredit = () => {
    if (currentTab.items.length === 0) {
      notifyWarning('Add products to the bill first');
      return;
    }
    if (!currentTab.customer) {
      notifyWarning('Please select a Customer for Credit / Pay Later sale');
      return;
    }
    handleCompleteSale({
      payment_lines: [{ method: 'credit', amount: totals.grand_total, currency: 'LKR' }],
      cheque_details: null,
      notes: 'Credit / Pay Later Sale'
    });
  };

  const handleQuickCod = () => {
    if (currentTab.items.length === 0) {
      notifyWarning('Add products to the bill first');
      return;
    }
    if (!currentTab.customer) {
      notifyWarning('Please select a Customer for Cash on Delivery (COD) sale');
      return;
    }
    handleCompleteSale({
      payment_lines: [{ method: 'cod', amount: totals.grand_total, currency: 'LKR' }],
      cheque_details: null,
      notes: 'Cash on Delivery (COD) Sale'
    });
  };

  // Keyboard shortcuts: F4/F10 for Payment Modal, F12 for Quick Cash, F9 for COD
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F4' || e.key === 'F10') {
        e.preventDefault();
        handleTriggerCheckout();
      } else if (e.key === 'F12') {
        e.preventDefault();
        handleQuickCash();
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleQuickCod();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleUpdateCurrentTab = (updater) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? updater(t) : t));
  };

  const handleAddTab = () => {
    const nextId = (tabs[tabs.length - 1]?.id || 0) + 1;
    const newTab = { id: nextId, label: `Bill ${nextId}`, items: [], customer: null, docType: 'sales_invoice', discount: 0, source_reserved_doc_id: null };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(nextId);
  };

  const handleCloseTab = (id) => {
    if (tabs.length <= 1) {
      setTabs([DEFAULT_BILL]);
      setActiveTabId(1);
      return;
    }
    const remaining = tabs.filter(t => t.id !== id);
    setTabs(remaining);
    if (activeTabId === id) {
      setActiveTabId(remaining[0]?.id || 1);
    }
  };

  const handleAddToCart = (product, qty = 1, isWarranty = false) => {
    const normalPrice = calculateWholesaleItemPrice(product, qty, currentTab.customer, []);
    const unitPrice = isWarranty ? 0 : normalPrice;

    handleUpdateCurrentTab(tab => {
      const existingIdx = tab.items.findIndex(it =>
        it.product.id === product.id &&
        Boolean(it.is_warranty_replacement) === Boolean(isWarranty)
      );

      if (existingIdx >= 0) {
        const updated = [...tab.items];
        updated[existingIdx].qty += qty;
        return { ...tab, items: updated };
      } else {
        return {
          ...tab,
          items: [...tab.items, {
            product,
            qty,
            unit_price: unitPrice,
            original_unit_price: normalPrice,
            discount_amount: 0,
            unit_cost_snapshot: product.weighted_cost_lkr || 0,
            is_warranty_replacement: isWarranty,
            warranty_note: isWarranty ? 'Warranty Replacement' : ''
          }]
        };
      }
    });
  };

  const handleSplitWarranty = (idx) => {
    handleUpdateCurrentTab(tab => {
      const it = tab.items[idx];
      if (!it || it.qty <= 1) return tab;

      const updated = [...tab.items];
      updated[idx] = { ...it, qty: it.qty - 1 };

      const existingWarrantyIdx = updated.findIndex(x => x.product.id === it.product.id && x.is_warranty_replacement);
      if (existingWarrantyIdx >= 0) {
        updated[existingWarrantyIdx].qty += 1;
      } else {
        updated.splice(idx + 1, 0, {
          product: it.product,
          qty: 1,
          unit_price: 0,
          original_unit_price: it.original_unit_price || it.unit_price,
          discount_amount: 0,
          unit_cost_snapshot: it.unit_cost_snapshot,
          is_warranty_replacement: true,
          warranty_note: 'Warranty Replacement'
        });
      }

      return { ...tab, items: updated };
    });
  };

  // Trigger Reserve Order Popup Modal
  const handleReserveBill = () => {
    if (currentTab.items.length === 0) {
      notifyWarning('Cannot reserve an empty bill. Add products first.');
      return;
    }

    const hasOverLimit = currentTab.items.some(it => {
      if (it.is_warranty_replacement) return false;
      const p = it.product || it;
      const pId = p?.id || it.product_id || it.id;
      const sb = (pId && stockBalances[pId]) || {};
      const onHand = Number(
        sb.qty_on_hand !== undefined ? sb.qty_on_hand :
        sb.qty_available !== undefined ? sb.qty_available :
        p?.stock_quantity !== undefined ? p.stock_quantity :
        p?.qty_on_hand !== undefined ? p.qty_on_hand :
        0
      );
      const inTransit = Number(
        sb.qty_in_transit !== undefined ? sb.qty_in_transit :
        p?.qty_in_transit !== undefined ? p.qty_in_transit :
        0
      );
      return Number(it.qty) > (onHand + inTransit);
    });

    if (hasOverLimit) {
      notifyWarning('Cannot reserve: Quantity exceeds total available inventory (On-Hand + In-Transit). Please reduce quantity.');
      return;
    }

    setReservationForm({
      customer_name: currentTab.customer?.business_name || '',
      customer_phone: currentTab.customer?.phone || '',
      advance_amount: '',
      payment_method: 'cash',
      cheque_no: '',
      cheque_date: new Date().toISOString().slice(0, 10),
      notes: ''
    });

    setIsCreateReservationOpen(true);
  };

  // Confirm and Save Reservation with Optional Advance
  const handleConfirmReservation = async (e) => {
    e.preventDefault();
    const advAmt = Number(reservationForm.advance_amount) || 0;

    if (advAmt < 0) {
      notifyWarning('Advance amount cannot be negative.');
      return;
    }

    if (advAmt > totals.grand_total) {
      notifyWarning(`Advance payment cannot exceed the total bill amount (Rs. ${totals.grand_total.toLocaleString()}).`);
      return;
    }

    try {
      const docPayload = {
        doc_type: 'reserved_order',
        customer_id: currentTab.customer?.id || null,
        customer_name: reservationForm.customer_name || currentTab.customer?.business_name || 'Customer Hold / Reserved',
        customer_phone: reservationForm.customer_phone || currentTab.customer?.phone || null,
        items: currentTab.items,
        discount_amount: effectiveCartDiscount,
        advance_amount: advAmt,
        payment_lines: advAmt > 0 ? [{
          method: reservationForm.payment_method,
          amount: advAmt,
          currency: 'LKR',
          reference: `Advance deposit for Reservation`
        }] : [],
        cheque_details: (reservationForm.payment_method === 'cheque' && advAmt > 0) ? {
          cheque_no: reservationForm.cheque_no,
          cheque_date: reservationForm.cheque_date,
          bank_name: 'Commercial Bank'
        } : null,
        notes: reservationForm.notes || `Stock hold reserved for ${reservationForm.customer_name || currentTab.customer?.business_name || 'Customer'}`
      };

      await postSalesDocument(docPayload);

      // Clear bill
      handleUpdateCurrentTab(tab => ({
        ...tab,
        items: [],
        customer: null,
        discount: 0,
        discount_value: 0,
        discount_type: 'amount',
        source_reserved_doc_id: null
      }));

      setIsCreateReservationOpen(false);
    } catch (err) {
      notifyError('Failed to reserve stock: ' + err.message);
    }
  };

  // Load an existing reservation into POS to complete sale
  const handleLoadReservationIntoPOS = (resDoc) => {
    const cust = customers.find(c => c.id === resDoc.customer_id) || {
      id: resDoc.customer_id,
      business_name: resDoc.customer_name,
      phone: resDoc.customer_phone
    };

    handleUpdateCurrentTab(tab => ({
      ...tab,
      label: `From ${resDoc.doc_no}`,
      customer: cust,
      items: resDoc.items || [],
      discount: resDoc.discount_amount || 0,
      discount_value: resDoc.discount_amount || 0,
      discount_type: 'amount',
      source_reserved_doc_id: resDoc.id
    }));

    setIsReservationsModalOpen(false);
    notifySuccess(`Reservation ${resDoc.doc_no} loaded into POS! Click Checkout [F4] to collect payment and generate invoice.`);
  };

  const handleTriggerCheckout = () => {
    if (currentTab.items.length === 0) {
      notifyWarning('Cannot checkout an empty bill');
      return;
    }

    // Check minimum profit margin protection (5.0%)
    const lowMarginItems = [];
    const minMarginPct = companySettings?.min_profit_pct || 5.0;

    currentTab.items.forEach(it => {
      if (it.is_warranty_replacement) return; // Skip intentional Rs. 0 warranty replacements
      const cost = it.unit_cost_snapshot || it.product.weighted_cost_lkr || 0;
      if (cost > 0 && it.unit_price > 0) {
        const marginPct = ((it.unit_price - cost) / it.unit_price) * 100;
        if (marginPct < minMarginPct) {
          lowMarginItems.push({
            ...it,
            marginPct: marginPct.toFixed(1),
            minAllowedPrice: (cost / (1 - (minMarginPct / 100))).toFixed(2)
          });
        }
      }
    });

    if (lowMarginItems.length > 0) {
      setPendingLowMarginItems(lowMarginItems);
      setIsMarginOverrideOpen(true);
      return;
    }

    setIsPaymentOpen(true);
  };

  const handleCompleteSale = async (paymentData) => {
    try {
      const docPayload = {
        doc_type: 'sales_invoice',
        source_reserved_doc_id: currentTab.source_reserved_doc_id || null,
        customer_id: currentTab.customer?.id || null,
        customer_name: currentTab.customer?.business_name || 'Counter Sale / Cash',
        customer_phone: currentTab.customer?.phone || null,
        items: currentTab.items,
        discount_amount: effectiveCartDiscount,
        payment_lines: paymentData.payment_lines,
        cheque_details: paymentData.cheque_details,
        notes: paymentData.notes
      };

      const postedDoc = await postSalesDocument(docPayload);

      // Look up live customer from context to get exact current balance
      const liveCust = currentTab.customer
        ? (customers.find(c => String(c.id) === String(currentTab.customer.id)) || currentTab.customer)
        : null;

      const outstanding = postedDoc.customer_receivable !== undefined
        ? Number(postedDoc.customer_receivable)
        : ((Number(liveCust?.current_receivable) || 0) + Number(postedDoc.balance_due || 0));

      const updatedCust = liveCust ? {
        ...liveCust,
        current_receivable: outstanding
      } : null;

      // Notify success with exact customer outstanding balance if credit was used
      if (postedDoc.balance_due > 0 && liveCust) {
        notifySuccess(`Invoice ${postedDoc.doc_no} posted! ${liveCust.business_name} Outstanding Balance: ${formatCurrency(outstanding)}`);
      } else {
        notifySuccess(`Invoice ${postedDoc.doc_no} posted successfully!`);
      }

      // Generate invoice PDF with updated customer and outstanding balance
      generateInvoicePDF(postedDoc, companySettings, updatedCust);

      // Open Sale Completed Modal displaying the invoice and outstanding balance
      setCompletedSaleDoc({
        ...postedDoc,
        customer: updatedCust,
        customer_receivable: outstanding
      });

      // Reset the current bill tab cleanly
      handleUpdateCurrentTab(tab => ({
        ...tab,
        items: [],
        customer: null,
        discount: 0,
        discount_value: 0,
        discount_type: 'amount',
        source_reserved_doc_id: null
      }));

      setIsPaymentOpen(false);
    } catch (err) {
      notifyError('Failed to post sales invoice: ' + err.message);
    }
  };

  const handleCreateCustomerSubmit = async (e) => {
    e.preventDefault();
    const created = await saveCustomer(newCustomerForm);
    if (created) {
      handleUpdateCurrentTab(t => ({ ...t, customer: created }));
    }
    setIsAddCustomerOpen(false);
    setNewCustomerForm({ business_name: '', contact_person: '', phone: '', price_tier: 'Dealer', credit_limit: 500000, credit_days: 30 });
  };

  return (
    <div className="pos-workspace">
      {/* Top Multi-Bill Tabs & Reservation Bar */}
      <div className="bill-tabs-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', overflowX: 'auto' }}>
          {tabs.map(t => (
            <div
              key={t.id}
              onClick={() => setActiveTabId(t.id)}
              className={`bill-tab ${t.id === activeTabId ? 'active' : ''}`}
            >
              <span>{t.label} ({t.items.length})</span>
              {tabs.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTab(t.id);
                  }}
                  className="bill-tab-close"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
          <button onClick={handleAddTab} className="bill-tab add-btn">
            + New Bill
          </button>
        </div>

        {/* Quick Open Reservations Drawer Trigger */}
        <button
          type="button"
          onClick={() => setIsReservationsModalOpen(true)}
          style={{
            background: openReservations.length > 0 ? '#ffca58' : '#2a2a2a',
            color: openReservations.length > 0 ? '#000' : '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '4px 12px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <span>📌 Reserved Bills</span>
          <span
            style={{
              background: openReservations.length > 0 ? '#000' : '#444',
              color: '#fff',
              borderRadius: '50%',
              padding: '1px 6px',
              fontSize: 11
            }}
          >
            {openReservations.length}
          </span>
        </button>
      </div>

      {/* POS Top Customer Header */}
      <CustomerHeader
        selectedCustomer={currentTab.customer}
        onSelectCustomer={(cust) => handleUpdateCurrentTab(t => ({ ...t, customer: cust }))}
        onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
        docType={currentTab.docType}
        onChangeDocType={(dt) => handleUpdateCurrentTab(t => ({ ...t, docType: dt }))}
      />

      {/* Main Split Body: Left Bill Items (Cart) | Right Products Catalog & Search */}
      <div className="pos-main-split">
        {/* Left: Bill / Cart & Settlement */}
        <div className="pos-left-pane">
          {currentTab.source_reserved_doc_id && (
            <div
              style={{
                background: 'rgba(255, 202, 88, 0.12)',
                border: '1px solid #ffca58',
                padding: '6px 12px',
                fontSize: 12,
                color: '#ffca58',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>⚡ Converting Reserved Stock to Sale</span>
              <span className="mono font-semibold">Ref: {currentTab.label}</span>
            </div>
          )}

          <PosCart
            items={currentTab.items}
            customer={currentTab.customer}
            discount={effectiveCartDiscount}
            discountType={currentTab.discount_type || 'amount'}
            discountValue={currentTab.discount_value !== undefined ? currentTab.discount_value : currentTab.discount}
            totals={totals}
            onUpdateQty={(idx, newQty) => handleUpdateCurrentTab(tab => {
              const updated = [...tab.items];
              if (newQty <= 0) {
                updated.splice(idx, 1);
              } else {
                updated[idx].qty = newQty;
              }
              return { ...tab, items: updated };
            })}
            onUpdateUnitPrice={(idx, newPrice) => handleUpdateCurrentTab(tab => {
              const updated = [...tab.items];
              updated[idx].unit_price = Number(newPrice) || 0;
              return { ...tab, items: updated };
            })}
            onUpdateItemDiscount={(idx, discAmount) => handleUpdateCurrentTab(tab => {
              const updated = [...tab.items];
              updated[idx].discount_amount = Math.max(0, Number(discAmount) || 0);
              return { ...tab, items: updated };
            })}
            onToggleWarranty={(idx) => handleUpdateCurrentTab(tab => {
              const updated = [...tab.items];
              const it = updated[idx];
              const isW = !it.is_warranty_replacement;
              const normalPrice = calculateWholesaleItemPrice(it.product, it.qty, tab.customer, []);
              updated[idx] = {
                ...it,
                is_warranty_replacement: isW,
                unit_price: isW ? 0 : (it.original_unit_price || normalPrice),
                original_unit_price: it.original_unit_price || it.unit_price || normalPrice,
                warranty_note: isW ? (it.warranty_note || 'Warranty Replacement') : ''
              };
              return { ...tab, items: updated };
            })}
            onSplitWarranty={handleSplitWarranty}
            onUpdateWarrantyNote={(idx, note) => handleUpdateCurrentTab(tab => {
              const updated = [...tab.items];
              updated[idx].warranty_note = note;
              return { ...tab, items: updated };
            })}
            onRemoveItem={(idx) => handleUpdateCurrentTab(tab => {
              const updated = [...tab.items];
              updated.splice(idx, 1);
              return { ...tab, items: updated };
            })}
            onChangeCartDiscount={(type, value) => handleUpdateCurrentTab(tab => {
              const numVal = Math.max(0, Number(value) || 0);
              return {
                ...tab,
                discount_type: type,
                discount_value: numVal,
                discount: type === 'percent'
                  ? Number(((tab.items.reduce((s, it) => s + (it.is_warranty_replacement ? 0 : Math.max(0, (Number(it.qty) * Number(it.unit_price)) - (Number(it.discount_amount) || 0))), 0) * numVal) / 100).toFixed(2))
                  : numVal
              };
            })}
            onClearCart={() => handleUpdateCurrentTab(tab => ({ ...tab, items: [], discount: 0, discount_value: 0, discount_type: 'amount', source_reserved_doc_id: null }))}
            onReserve={handleReserveBill}
            onCheckout={handleTriggerCheckout}
            onQuickCash={handleQuickCash}
            onQuickCredit={handleQuickCredit}
            onQuickCod={handleQuickCod}
          />
        </div>

        {/* Right: Product Search & Categories Explorer Grid */}
        <div className="pos-right-pane">
          <ProductSearchGrid
            customer={currentTab.customer}
            onAddToCart={handleAddToCart}
          />
        </div>
      </div>

      {/* Payment & Multi-Tender Modal */}
      {isPaymentOpen && (
        <PaymentModal
          totals={totals}
          customer={currentTab.customer}
          onClose={() => setIsPaymentOpen(false)}
          onConfirmPayment={handleCompleteSale}
        />
      )}

      {/* Minimum Margin Override Protection Modal */}
      {isMarginOverrideOpen && (
        <MarginOverrideModal
          lowMarginItems={pendingLowMarginItems}
          minProfitPct={companySettings?.min_profit_pct || 5.0}
          onClose={() => setIsMarginOverrideOpen(false)}
          onProceedAnyway={() => {
            setIsMarginOverrideOpen(false);
            setIsPaymentOpen(true);
          }}
        />
      )}

      {/* Open Customer Reservations Modal */}
      {isReservationsModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box modal-lg" style={{ maxWidth: 850 }}>
            <div className="modal-header">
              <h3>📌 Active Customer Stock Reservations ({openReservations.length})</h3>
              <button onClick={() => setIsReservationsModalOpen(false)} className="modal-close">&times;</button>
            </div>
            <div className="modal-body" style={{ maxHeight: 520, overflowY: 'auto' }}>
              {openReservations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📌</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>No Active Reservations</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>
                    To hold stock for a customer, add products in POS and click "📌 Reserve Stock".
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {openReservations.map(res => (
                    <div
                      key={res.id}
                      style={{
                        background: '#1e1e1e',
                        border: '1px solid #ffca58',
                        borderRadius: 8,
                        padding: 14
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div>
                          <span className="mono font-semibold" style={{ color: '#ffca58', fontSize: 14 }}>
                            {res.doc_no}
                          </span>
                          <span style={{ marginLeft: 12, fontWeight: 700, fontSize: 14 }}>
                            {res.customer_name}
                          </span>
                          {res.customer_phone && (
                            <span style={{ marginLeft: 8, color: 'var(--muted)', fontSize: 12 }}>
                              ({res.customer_phone})
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                            Date: {formatDate(res.doc_date)}
                          </span>
                          <span className="badge badge-warning" style={{ fontSize: 11 }}>
                            HELD IN RESERVED
                          </span>
                        </div>
                      </div>

                      {/* Item Breakdown */}
                      <div style={{ background: '#141414', padding: '8px 12px', borderRadius: 4, marginBottom: 10, fontSize: 12 }}>
                        {(res.items || []).map((it, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                            <span>
                              {it.qty}x {it.product?.name || 'Product'} {it.is_warranty_replacement ? '[WARRANTY]' : ''}
                            </span>
                            <span className="mono">
                              {it.is_warranty_replacement ? 'Rs. 0.00' : formatCurrency(it.qty * (Number(it.unit_price) || 0))}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Total Value: </span>
                          <span className="mono font-semibold" style={{ fontSize: 15, color: 'var(--text)' }}>
                            {formatCurrency(res.grand_total)}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Release reserved stock for ${res.doc_no}?`)) {
                                cancelReservation(res.id);
                              }
                            }}
                            className="secondary-button small-button"
                            style={{ color: '#ff8e8e', borderColor: '#ff8e8e' }}
                          >
                            ❌ Release Stock
                          </button>

                          <button
                            type="button"
                            onClick={() => handleLoadReservationIntoPOS(res)}
                            className="primary-button small-button"
                            style={{ fontWeight: 700 }}
                          >
                            ⚡ Convert to Sale & Invoice
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create New Reservation with Advance Payment Modal */}
      {isCreateReservationOpen && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-box modal-md" style={{ maxWidth: 540 }}>
            <div className="modal-header" style={{ borderBottomColor: '#ffca58' }}>
              <h3 style={{ color: '#ffca58', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>📌</span> Reserve Order & Hold Stock
              </h3>
              <button type="button" onClick={() => setIsCreateReservationOpen(false)} className="modal-close">&times;</button>
            </div>
            <form onSubmit={handleConfirmReservation}>
              <div className="modal-body" style={{ gap: 12 }}>
                {/* Order Summary Header */}
                <div style={{ background: '#1c1c1c', border: '1px solid var(--line)', borderRadius: 6, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block' }}>TOTAL ORDER VALUE</span>
                    <span className="mono font-semibold" style={{ fontSize: 18, color: '#fff' }}>
                      {formatCurrency(totals.grand_total)}
                    </span>
                  </div>
                  <span className="badge badge-warning" style={{ fontSize: 11 }}>
                    {currentTab.items.length} items ({currentTab.items.reduce((s, i) => s + (Number(i.qty) || 0), 0)} units)
                  </span>
                </div>

                {/* Customer Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12 }}>Customer / Business Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Apex Tech Solutions"
                      value={reservationForm.customer_name}
                      onChange={(e) => setReservationForm(prev => ({ ...prev, customer_name: e.target.value }))}
                      style={{ fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12 }}>Phone / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="e.g. 0771234567"
                      value={reservationForm.customer_phone}
                      onChange={(e) => setReservationForm(prev => ({ ...prev, customer_phone: e.target.value }))}
                      style={{ fontSize: 13 }}
                    />
                  </div>
                </div>

                {/* Advance Deposit Section */}
                <div style={{ background: 'rgba(255, 202, 88, 0.06)', border: '1px solid rgba(255, 202, 88, 0.35)', borderRadius: 6, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <strong style={{ fontSize: 13, color: '#ffca58', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span>💵</span> Advance Payment Deposit
                    </strong>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                      Optional (Leave 0 if no advance)
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--muted)' }}>Advance Amount (Rs)</label>
                      <input
                        type="number"
                        min="0"
                        max={totals.grand_total}
                        step="100"
                        placeholder="0"
                        className="mono font-semibold"
                        value={reservationForm.advance_amount}
                        onChange={(e) => setReservationForm(prev => ({ ...prev, advance_amount: e.target.value }))}
                        style={{ color: '#ffca58', fontSize: 14 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--muted)' }}>Payment Method</label>
                      <select
                        value={reservationForm.payment_method}
                        onChange={(e) => setReservationForm(prev => ({ ...prev, payment_method: e.target.value }))}
                        disabled={!Number(reservationForm.advance_amount)}
                        style={{ fontSize: 13 }}
                      >
                        <option value="cash">💵 Cash</option>
                        <option value="bank">🏦 Bank Transfer</option>
                        <option value="cheque">📝 Cheque</option>
                      </select>
                    </div>
                  </div>

                  {/* Cheque Fields if Cheque Method */}
                  {Number(reservationForm.advance_amount) > 0 && reservationForm.payment_method === 'cheque' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10, paddingTop: 10, borderTop: '1px dashed rgba(255, 202, 88, 0.2)' }}>
                      <div>
                        <label style={{ fontSize: 11 }}>Cheque Number *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 984712"
                          value={reservationForm.cheque_no}
                          onChange={(e) => setReservationForm(prev => ({ ...prev, cheque_no: e.target.value }))}
                          style={{ fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11 }}>Cheque Date</label>
                        <input
                          type="date"
                          value={reservationForm.cheque_date}
                          onChange={(e) => setReservationForm(prev => ({ ...prev, cheque_date: e.target.value }))}
                          style={{ fontSize: 12 }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label style={{ fontSize: 11, color: 'var(--muted)' }}>Reservation Notes / Remarks</label>
                  <input
                    type="text"
                    placeholder="e.g. Waiting for transit container arrival / Pickup on Saturday"
                    value={reservationForm.notes}
                    onChange={(e) => setReservationForm(prev => ({ ...prev, notes: e.target.value }))}
                    style={{ fontSize: 12 }}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button type="button" onClick={() => setIsCreateReservationOpen(false)} className="secondary-button">
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#ffca58',
                    color: '#000',
                    fontWeight: 800,
                    padding: '8px 20px',
                    borderRadius: 4,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span>📌</span> Confirm & Hold Reservation
                  {Number(reservationForm.advance_amount) > 0 && ` (Rs. ${Number(reservationForm.advance_amount).toLocaleString()} Advance)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {isAddCustomerOpen && (
        <div className="modal-overlay">
          <div className="modal-box modal-md">
            <div className="modal-header">
              <h3>Quick Add Wholesale Customer</h3>
              <button onClick={() => setIsAddCustomerOpen(false)} className="modal-close">&times;</button>
            </div>
            <form onSubmit={handleCreateCustomerSubmit}>
              <div className="modal-body">
                <div style={{ marginBottom: 12 }}>
                  <label>Business / Shop Name *</label>
                  <input
                    type="text"
                    required
                    value={newCustomerForm.business_name}
                    onChange={(e) => setNewCustomerForm(prev => ({ ...prev, business_name: e.target.value }))}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label>Contact Person</label>
                    <input
                      type="text"
                      value={newCustomerForm.contact_person}
                      onChange={(e) => setNewCustomerForm(prev => ({ ...prev, contact_person: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>Phone / WhatsApp *</label>
                    <input
                      type="text"
                      required
                      value={newCustomerForm.phone}
                      onChange={(e) => setNewCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                  <div>
                    <label>Assigned Price Tier</label>
                    <select
                      value={newCustomerForm.price_tier}
                      onChange={(e) => setNewCustomerForm(prev => ({ ...prev, price_tier: e.target.value }))}
                    >
                      <option value="Standard">Standard Wholesale</option>
                      <option value="Tier1">Tier 1 Volume (3% Off)</option>
                      <option value="VIP">VIP Direct (8% Off)</option>
                      <option value="Dealer">Authorized Dealer Price</option>
                    </select>
                  </div>
                  <div>
                    <label>Credit Limit (Rs)</label>
                    <input
                      type="number"
                      className="mono"
                      value={newCustomerForm.credit_limit}
                      onChange={(e) => setNewCustomerForm(prev => ({ ...prev, credit_limit: Number(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsAddCustomerOpen(false)} className="secondary-button">
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Create Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sale Completed & Customer Outstanding Balance Summary Modal */}
      {completedSaleDoc && (
        <div className="modal-overlay">
          <div className="modal-box modal-md" style={{ maxWidth: 540 }}>
            <div className="modal-header" style={{ background: '#12251a', borderBottom: '1px solid #10b981' }}>
              <h3 style={{ color: '#52e37e', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <span>✅</span> Sale Completed & Invoice Posted
              </h3>
              <button
                type="button"
                onClick={() => setCompletedSaleDoc(null)}
                className="modal-close"
              >
                &times;
              </button>
            </div>

            <div className="modal-body" style={{ padding: 20 }}>
              {/* Document Banner */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Invoice Number</span>
                  <div className="mono font-semibold" style={{ fontSize: 18, color: 'var(--primary)' }}>
                    {completedSaleDoc.doc_no}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Date</span>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {formatDate(completedSaleDoc.doc_date || completedSaleDoc.created_at)}
                  </div>
                </div>
              </div>

              {/* Customer Box */}
              <div style={{ background: '#1e1e1e', padding: 12, borderRadius: 6, border: '1px solid var(--line)', marginBottom: 14 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Customer</span>
                <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
                  {completedSaleDoc.customer_name || 'Walk-in / Cash Customer'}
                </div>
              </div>

              {/* Financial Breakdown Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div style={{ background: '#222', padding: 12, borderRadius: 6, border: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>BILL TOTAL</span>
                  <div className="mono font-semibold" style={{ fontSize: 18, color: '#fff', marginTop: 2 }}>
                    {formatCurrency(completedSaleDoc.grand_total)}
                  </div>
                </div>
                <div style={{ background: '#222', padding: 12, borderRadius: 6, border: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>PAID NOW</span>
                  <div className="mono font-semibold" style={{ fontSize: 18, color: '#52e37e', marginTop: 2 }}>
                    {formatCurrency(completedSaleDoc.paid_amount)}
                  </div>
                </div>
              </div>

              {/* Outstanding Balance Highlight Box */}
              <div style={{
                background: completedSaleDoc.balance_due > 0 ? '#261414' : '#142618',
                border: `1.5px solid ${completedSaleDoc.balance_due > 0 ? '#ff8e8e' : '#52e37e'}`,
                borderRadius: 8,
                padding: '14px 16px',
                marginBottom: 16
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: 11.5, color: completedSaleDoc.balance_due > 0 ? '#ff8e8e' : '#52e37e', textTransform: 'uppercase', fontWeight: 800 }}>
                      {completedSaleDoc.balance_due > 0 ? '⚠️ THIS INVOICE BALANCE DUE (CREDIT)' : '✓ INVOICE STATUS'}
                    </span>
                    <div className="mono" style={{ fontSize: 20, fontWeight: 800, color: completedSaleDoc.balance_due > 0 ? '#ff8e8e' : '#52e37e', marginTop: 2 }}>
                      {completedSaleDoc.balance_due > 0 ? formatCurrency(completedSaleDoc.balance_due) : 'FULLY PAID'}
                    </div>
                  </div>

                  {completedSaleDoc.customer && (
                    <div style={{ textAlign: 'right', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: 16 }}>
                      <span style={{ fontSize: 11, color: '#93c5fd', textTransform: 'uppercase', fontWeight: 700 }}>
                        TOTAL OUTSTANDING
                      </span>
                      <div className="mono font-semibold" style={{ fontSize: 22, color: Number(completedSaleDoc.customer_receivable || 0) > 0 ? '#ff8e8e' : '#52e37e', marginTop: 2 }}>
                        {formatCurrency(completedSaleDoc.customer_receivable || 0)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={() => generateInvoicePDF(completedSaleDoc, companySettings, completedSaleDoc.customer)}
                  className="secondary-button"
                  style={{ flex: 1, padding: '10px 14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <span>🖨</span> Re-print Invoice
                </button>

                {completedSaleDoc.customer_phone && (
                  <a
                    href={generateWhatsAppInvoiceLink(completedSaleDoc, completedSaleDoc.customer_phone, companySettings.business_name)}
                    target="_blank"
                    rel="noreferrer"
                    className="secondary-button"
                    style={{ padding: '10px 14px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                  >
                    <span>💬</span> WhatsApp
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setCompletedSaleDoc(null)}
                  className="primary-button"
                  style={{ flex: 1, padding: '10px 14px', fontWeight: 800 }}
                >
                  + Start Next Bill
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
