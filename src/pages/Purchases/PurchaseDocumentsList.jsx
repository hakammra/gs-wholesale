import React, { useState, useMemo, useEffect } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { generatePurchaseInvoicePDF } from '../../lib/pdfGenerator';
import DocumentProductTree from '../../components/common/DocumentProductTree';

export default function PurchaseDocumentsList({ onNavigateTab }) {
  const {
    purchases = [],
    suppliers = [],
    products = [],
    categories = [],
    companySettings = {},
    bankAccounts = [],
    receivePurchaseShipment,
    updatePurchaseDocument,
    deletePurchaseDocument,
    saveSupplier,
    saveProduct
  } = useBusiness();

  const { notifySuccess, notifyError, notifyWarning } = useNotification();

  // Load unsaved draft across navigation if exists
  const savedDraft = useMemo(() => {
    try {
      const raw = localStorage.getItem('gs_purchase_form_draft');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.error('Failed to parse purchase draft', e);
    }
    return null;
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'drafts' | 'received'
  const [isDirectPurchaseOpen, setIsDirectPurchaseOpen] = useState(() => !!savedDraft?.isDirectPurchaseOpen);
  const [editingPurchaseId, setEditingPurchaseId] = useState(() => savedDraft?.editingPurchaseId || null);
  const [hasDraftBanner, setHasDraftBanner] = useState(() => !!savedDraft?.isDirectPurchaseOpen);

  // Direct Purchase Form State
  const [supplierId, setSupplierId] = useState(() => savedDraft?.supplierId || suppliers[0]?.id || '');
  const [purchaseDate, setPurchaseDate] = useState(() => savedDraft?.purchaseDate || new Date().toISOString().slice(0, 10));
  const [paymentType, setPaymentType] = useState(() => savedDraft?.paymentType || 'credit');
  const [bankAccountId, setBankAccountId] = useState(() => savedDraft?.bankAccountId || bankAccounts[0]?.id || '');
  const [notes, setNotes] = useState(() => savedDraft?.notes || '');
  const [items, setItems] = useState(() => savedDraft?.items || []);

  // Tree & Item Picker State (Shop-POS layout)
  const [treeSearch, setTreeSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [selectedLineProduct, setSelectedLineProduct] = useState(null);
  const [lineDraft, setLineDraft] = useState({ qty: 1, unit_cost: 0 });

  // Quick Add Supplier Modal State
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');

  // Quick Add Product Modal State
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductCode, setNewProductCode] = useState('');
  const [newProductCost, setNewProductCost] = useState('');
  const [newProductWholesalePrice, setNewProductWholesalePrice] = useState('');
  const [newProductCatId, setNewProductCatId] = useState('');

  // Auto-save form draft across page navigation
  useEffect(() => {
    if (isDirectPurchaseOpen) {
      const draft = {
        isDirectPurchaseOpen: true,
        editingPurchaseId,
        supplierId,
        purchaseDate,
        paymentType,
        bankAccountId,
        notes,
        items
      };
      localStorage.setItem('gs_purchase_form_draft', JSON.stringify(draft));
    } else {
      localStorage.removeItem('gs_purchase_form_draft');
    }
  }, [
    isDirectPurchaseOpen,
    editingPurchaseId,
    supplierId,
    purchaseDate,
    paymentType,
    bankAccountId,
    notes,
    items
  ]);

  const handleClearDraft = () => {
    localStorage.removeItem('gs_purchase_form_draft');
    setHasDraftBanner(false);
    setIsDirectPurchaseOpen(false);
    setEditingPurchaseId(null);
    setSupplierId(suppliers[0]?.id || '');
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    setPaymentType('credit');
    setBankAccountId(bankAccounts[0]?.id || '');
    setNotes('');
    setItems([]);
    notifySuccess('Unsaved purchase draft cleared');
  };

  const handleCancelForm = () => {
    localStorage.removeItem('gs_purchase_form_draft');
    setHasDraftBanner(false);
    setIsDirectPurchaseOpen(false);
    setEditingPurchaseId(null);
  };

  // Calculations
  const totalPurchaseValue = purchases
    .filter(p => p.status !== 'draft')
    .reduce((sum, p) => sum + (Number(p.total_amount_lkr || p.total_landed_lkr) || 0), 0);
  const totalItemsReceived = purchases
    .filter(p => p.status !== 'draft')
    .reduce((sum, p) => sum + (p.items || []).reduce((s, it) => s + (Number(it.received_sellable_qty || it.shipped_qty || it.qty) || 0), 0), 0);

  const draftCount = purchases.filter(p => p.status === 'draft').length;
  const receivedCount = purchases.filter(p => p.status !== 'draft').length;

  // Filtered Documents
  const filteredPurchases = purchases.filter(p => {
    const isDraft = p.status === 'draft';
    if (statusFilter === 'drafts' && !isDraft) return false;
    if (statusFilter === 'received' && isDraft) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.doc_no?.toLowerCase().includes(term) ||
      p.grn_no?.toLowerCase().includes(term) ||
      p.supplier_name?.toLowerCase().includes(term) ||
      p.shipment_no?.toLowerCase().includes(term)
    );
  });

  const handlePromoteDraftToReceived = (doc) => {
    updatePurchaseDocument(doc.id, { status: 'received' });
    notifySuccess(`Purchase Document ${doc.doc_no} confirmed & stock added to inventory!`);
  };

  const handleOpenDirectPurchase = () => {
    localStorage.removeItem('gs_purchase_form_draft');
    setHasDraftBanner(false);
    setEditingPurchaseId(null);
    setSupplierId(suppliers[0]?.id || '');
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    setPaymentType('credit');
    setBankAccountId(bankAccounts[0]?.id || '');
    setNotes('');
    setItems([]);
    setTreeSearch('');
    setSelectedCategoryId('all');
    setSelectedLineProduct(null);
    setIsDirectPurchaseOpen(true);
  };

  const handleEditPurchaseDocument = (purchase) => {
    setEditingPurchaseId(purchase.id);
    setSupplierId(purchase.supplier_id || suppliers[0]?.id || '');
    setPurchaseDate(purchase.receipt_date || purchase.document_date || new Date().toISOString().slice(0, 10));
    setPaymentType(purchase.payment_type || 'credit');
    setNotes(purchase.notes || '');

    const loadedItems = (purchase.items || []).map(it => {
      const prod = products.find(p => p.id === it.product_id);
      return {
        product_id: it.product_id,
        product_name: it.product_name || prod?.name || 'Product',
        item_code: it.item_code || prod?.item_code || '',
        qty: Number(it.received_sellable_qty || it.shipped_qty || it.qty) || 1,
        unit_cost: Number(it.final_landed_unit_cost_lkr || it.unit_cost_lkr || it.unit_cost) || 0
      };
    });

    setItems(loadedItems);
    setTreeSearch('');
    setSelectedCategoryId('all');
    setSelectedLineProduct(null);
    setIsDirectPurchaseOpen(true);
  };

  const startAddProductToLines = (product) => {
    setSelectedLineProduct(product);
    setLineDraft({
      qty: 1,
      unit_cost: Number(product.weighted_cost_lkr || product.cost_price) || 0
    });
  };

  const confirmAddProductToLines = (e) => {
    if (e) e.preventDefault();
    if (!selectedLineProduct) return;
    const qty = Number(lineDraft.qty) || 1;
    const unitCost = Number(lineDraft.unit_cost) || 0;
    if (qty <= 0) {
      notifyError('Quantity must be greater than zero');
      return;
    }

    setItems(prev => {
      const existingIdx = prev.findIndex(it => it.product_id === selectedLineProduct.id);
      if (existingIdx >= 0) {
        return prev.map((it, i) => {
          if (i !== existingIdx) return it;
          const currentQty = Number(it.qty ?? it.received_sellable_qty ?? it.shipped_qty) || 0;
          const newQty = currentQty + qty;
          return {
            ...it,
            qty: newQty,
            received_sellable_qty: newQty,
            shipped_qty: newQty,
            unit_cost: unitCost,
            final_landed_unit_cost_lkr: unitCost
          };
        });
      }
      return [
        ...prev,
        {
          product_id: selectedLineProduct.id,
          product_name: selectedLineProduct.name,
          item_code: selectedLineProduct.item_code,
          qty,
          received_sellable_qty: qty,
          shipped_qty: qty,
          unit_cost: unitCost,
          final_landed_unit_cost_lkr: unitCost
        }
      ];
    });

    notifySuccess(`Added ${selectedLineProduct.name} to purchase lines`);
    setSelectedLineProduct(null);
  };

  const handleUpdateItem = (idx, field, val) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: val };
      if (field === 'qty') {
        updated.received_sellable_qty = val;
        updated.shipped_qty = val;
      }
      if (field === 'unit_cost') {
        updated.final_landed_unit_cost_lkr = val;
        updated.unit_cost_lkr = val;
      }
      return updated;
    }));
  };

  const handleRemoveItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveSupplier = (e) => {
    e.preventDefault();
    if (!newSupplierName.trim()) return;
    const newSup = saveSupplier({
      name: newSupplierName,
      phone: newSupplierPhone,
      country: 'Sri Lanka'
    });
    if (newSup?.id) setSupplierId(newSup.id);
    setNewSupplierName('');
    setNewSupplierPhone('');
    setIsAddSupplierOpen(false);
    notifySuccess('Supplier added successfully');
  };

  const handleSaveQuickProduct = async (e) => {
    e.preventDefault();
    if (!newProductName.trim()) {
      notifyError('Product name is required');
      return;
    }
    const code = newProductCode.trim() || `PRD-${Date.now().toString().slice(-4)}`;
    const cost = Number(newProductCost) || 0;
    const price = Number(newProductWholesalePrice) || Math.round(cost * 1.15);

    const savedProd = await saveProduct({
      name: newProductName.trim(),
      item_code: code,
      category_id: newProductCatId || null,
      cost_price: cost,
      weighted_cost_lkr: cost,
      wholesale_price: price,
      dealer_price: price
    });

    if (savedProd?.id) {
      setItems(prev => [
        ...prev,
        {
          product_id: savedProd.id,
          product_name: savedProd.name,
          item_code: savedProd.item_code,
          qty: 1,
          unit_cost: cost
        }
      ]);
      notifySuccess(`Product ${savedProd.name} created and added to lines`);
    }

    setNewProductName('');
    setNewProductCode('');
    setNewProductCost('');
    setNewProductWholesalePrice('');
    setNewProductCatId('');
    setIsAddProductOpen(false);
  };

  const handleSaveDirectPurchase = (e, asDraft = false) => {
    if (e) e.preventDefault();
    
    // Auto-resolve supplier
    let resolvedSupplierId = supplierId;
    let resolvedSupplierName = 'General Supplier';
    if (!resolvedSupplierId) {
      if (suppliers.length > 0) {
        resolvedSupplierId = suppliers[0].id;
        resolvedSupplierName = suppliers[0].name;
      } else {
        const autoSup = saveSupplier({ name: 'General Supplier', country: 'Sri Lanka' });
        resolvedSupplierId = autoSup?.id || 'sup-general';
      }
    } else {
      const sup = suppliers.find(s => s.id === resolvedSupplierId);
      if (sup) resolvedSupplierName = sup.name;
    }

    const validItems = items.filter(it => it.product_id);
    if (validItems.length === 0) {
      notifyError('Please select at least one product for the purchase');
      return;
    }

    const directShipmentMock = {
      transit_shipment_id: editingPurchaseId ? null : ('direct-' + Date.now()),
      supplier_id: resolvedSupplierId,
      supplier_name: resolvedSupplierName,
      payment_type: paymentType,
      payment_details: paymentType === 'bank' ? { bank_account_id: bankAccountId } : null,
      receipt_date: purchaseDate,
      notes: notes || 'Direct Stock Purchase',
      status: asDraft ? 'draft' : 'received',
      items: validItems.map(it => ({
        product_id: it.product_id,
        shipped_qty: Number(it.qty) || 1,
        received_sellable_qty: Number(it.qty) || 1,
        damaged_qty: 0,
        missing_qty: 0,
        unit_cost_lkr: Number(it.unit_cost) || 0,
        final_landed_unit_cost_lkr: Number(it.unit_cost) || 0
      }))
    };

    if (editingPurchaseId) {
      updatePurchaseDocument(editingPurchaseId, directShipmentMock);
      notifySuccess(asDraft ? 'Draft Purchase Document updated!' : 'Purchase Document updated! Stock quantities and Weighted Average Cost (WAC) recalculated.');
    } else {
      receivePurchaseShipment(directShipmentMock);
      notifySuccess(asDraft ? 'Purchase Document saved as Draft! (No stock or WAC impact until received)' : 'Direct Purchase Document created and inventory balances + WAC updated!');
    }

    localStorage.removeItem('gs_purchase_form_draft');
    setHasDraftBanner(false);
    setEditingPurchaseId(null);
    setIsDirectPurchaseOpen(false);
  };

  const handleDownloadPDF = (doc) => {
    generatePurchaseInvoicePDF(doc, companySettings);
  };

  // RENDER FULL IN-PAGE WORKSPACE WHEN CREATING NEW DIRECT PURCHASE
  if (isDirectPurchaseOpen) {
    const totalQty = items.reduce((s, it) => s + (Number(it.qty ?? it.received_sellable_qty ?? it.shipped_qty) || 0), 0);
    const totalAmount = items.reduce((s, it) => s + ((Number(it.qty ?? it.received_sellable_qty ?? it.shipped_qty) || 0) * (Number(it.unit_cost ?? it.final_landed_unit_cost_lkr ?? it.unit_cost_lkr) || 0)), 0);

    return (
      <div className="document-form-workspace page-section">
        {/* Workspace Header Bar */}
        <div className="document-workspace-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              type="button"
              className="secondary-button"
              onClick={handleCancelForm}
            >
              ← Back to Purchases
            </button>
            <h2 style={{ margin: 0 }}>
              {editingPurchaseId ? '✏️ Edit Purchase Document' : '📄 New Purchase Document'}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="secondary-button"
              onClick={handleCancelForm}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => handleSaveDirectPurchase(e, true)}
              className="secondary-button"
              style={{ borderColor: '#ffca58', color: '#ffca58', fontWeight: 700 }}
              title="Save as Draft without affecting inventory balances or WAC"
            >
              📁 Save as Draft
            </button>
            <button
              type="button"
              onClick={(e) => handleSaveDirectPurchase(e, false)}
              className="primary-button"
              style={{ fontWeight: 800 }}
            >
              {editingPurchaseId ? '💾 Update & Add to Stock' : 'Save & Add to Stock'}
            </button>
          </div>
        </div>

        {hasDraftBanner && (
          <div style={{
            background: 'rgba(98, 201, 255, 0.12)',
            border: '1px solid #1f7fa8',
            borderRadius: 4,
            padding: '10px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14
          }}>
            <div style={{ fontSize: 13, color: '#62c9ff' }}>
              <strong>📝 In-Progress Draft Restored:</strong> Your unsaved purchase details were preserved when navigating between pages.
            </div>
            <button
              type="button"
              onClick={handleClearDraft}
              className="secondary-button small-button"
              style={{ color: '#ff8e8e', borderColor: 'rgba(255, 142, 142, 0.4)' }}
            >
              Discard Draft
            </button>
          </div>
        )}

        <form onSubmit={handleSaveDirectPurchase} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Purchase Meta Header Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, background: '#242424', padding: 14, borderRadius: 4, border: '1px solid var(--line)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <label style={{ margin: 0, fontSize: 12 }}>Supplier *</label>
                <button
                  type="button"
                  onClick={() => setIsAddSupplierOpen(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 11, padding: 0 }}
                >
                  + New Supplier
                </button>
              </div>
              <select
                value={supplierId}
                required
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">-- Select Supplier --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.country || 'Local'})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12 }}>Purchase Date *</label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 12 }}>Purchase Notes / Invoice Ref</label>
              <input
                type="text"
                placeholder="Optional supplier invoice number, reference, or notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Split Layout: Category Folder Tree (Left) + Purchase Items (Right) */}
          <div className="document-edit-layout">
            {/* Left: Product Tree Panel */}
            <div className="document-product-tree-panel">
              <div className="compact-search">
                <input
                  type="text"
                  placeholder="Search SKU / Name..."
                  value={treeSearch}
                  onChange={(e) => setTreeSearch(e.target.value)}
                  style={{ fontSize: 12 }}
                />
                <button
                  type="button"
                  className="secondary-button small-button"
                  onClick={() => { setTreeSearch(''); setSelectedCategoryId('all'); }}
                  title="Clear filter"
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="secondary-button small-button"
                  onClick={() => setIsAddProductOpen(true)}
                  style={{ color: '#52e37e', borderColor: 'rgba(82, 227, 126, 0.4)' }}
                  title="Create new product"
                >
                  + New
                </button>
              </div>

              <DocumentProductTree
                categories={categories}
                products={products}
                selectedCategoryId={selectedCategoryId}
                setSelectedCategoryId={setSelectedCategoryId}
                onProductClick={startAddProductToLines}
                searchText={treeSearch}
              />
            </div>

            {/* Right: Document Lines Panel */}
            <div className="document-lines-panel">
              <div className="document-lines-toolbar">
                <strong style={{ fontSize: 13 }}>Purchase Items & Quantities</strong>
                <span className="count-label">
                  {items.filter(it => it.product_id).length} item{items.filter(it => it.product_id).length === 1 ? '' : 's'} in purchase
                </span>
              </div>

              <div className="table-wrap purchase-items-wrap" style={{ maxHeight: 400 }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 100 }}>Item Code</th>
                      <th>Product Description</th>
                      <th style={{ width: 125, textAlign: 'center' }}>Qty</th>
                      <th style={{ width: 130, textAlign: 'right' }}>Unit Cost (Rs)</th>
                      <th style={{ width: 130, textAlign: 'right' }}>Line Total</th>
                      <th style={{ width: 35 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => {
                      const prod = products.find(p => p.id === it.product_id) || {};
                      const itemQty = Number(it.qty ?? it.received_sellable_qty ?? it.shipped_qty) || 1;
                      const itemCost = Number(it.unit_cost ?? it.final_landed_unit_cost_lkr ?? it.unit_cost_lkr) || 0;
                      const lineTotal = itemQty * itemCost;

                      return (
                        <tr key={it.product_id || idx}>
                          <td className="mono" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                            {it.item_code || prod.item_code || '-'}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{it.product_name || prod.name || 'Product'}</div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div className="table-qty-stepper">
                              <button
                                type="button"
                                className="table-qty-btn"
                                onClick={() => handleUpdateItem(idx, 'qty', Math.max(1, itemQty - 1))}
                                title="Decrease quantity"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min="1"
                                required
                                className="mono font-semibold table-number-input"
                                value={it.qty !== undefined && it.qty !== null && it.qty !== '' ? it.qty : itemQty}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  handleUpdateItem(idx, 'qty', raw === '' ? '' : Math.max(0, Number(raw)));
                                }}
                                onBlur={() => {
                                  if (!it.qty || Number(it.qty) < 1) {
                                    handleUpdateItem(idx, 'qty', 1);
                                  }
                                }}
                                style={{ width: 56, textAlign: 'center', fontWeight: 700 }}
                              />
                              <button
                                type="button"
                                className="table-qty-btn"
                                onClick={() => handleUpdateItem(idx, 'qty', itemQty + 1)}
                                title="Increase quantity"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <input
                              type="number"
                              step="0.01"
                              required
                              className="mono table-number-input"
                              value={it.unit_cost !== undefined && it.unit_cost !== null && it.unit_cost !== '' ? it.unit_cost : itemCost}
                              onChange={(e) => {
                                const raw = e.target.value;
                                handleUpdateItem(idx, 'unit_cost', raw === '' ? '' : Number(raw));
                              }}
                              onBlur={() => {
                                if (it.unit_cost === '' || isNaN(Number(it.unit_cost))) {
                                  handleUpdateItem(idx, 'unit_cost', 0);
                                }
                              }}
                              style={{ width: 110, textAlign: 'right' }}
                            />
                          </td>
                          <td className="mono font-semibold" style={{ textAlign: 'right', color: '#52e37e' }}>
                            {formatCurrency(lineTotal)}
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="secondary-button small-button"
                              style={{ color: '#ff8e8e', padding: '2px 6px' }}
                              title="Remove line"
                            >
                              &times;
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {items.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--muted)' }}>
                          <div style={{ fontSize: 24, marginBottom: 6 }}>📁 ➔ 📄</div>
                          <div style={{ fontWeight: 600, color: '#e5e5e5' }}>No items in this purchase document yet.</div>
                          <small style={{ display: 'block', marginTop: 4 }}>
                            Click any product from the folder tree on the left to add it here.
                          </small>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Payment Method Selector (4 clean buttons: Credit, Cash, Bank, Cheque) */}
          <div style={{ background: '#242424', padding: 14, border: '1px solid var(--line)', borderRadius: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8, display: 'block' }}>
              Payment Method (Updates Cashflow & Accounts Payable)
            </label>
            <div className="payment-method-selector">
              <button
                type="button"
                className={`payment-method-btn credit ${paymentType === 'credit' ? 'active' : ''}`}
                onClick={() => setPaymentType('credit')}
              >
                <span>💳</span> Credit / Pay Later
              </button>
              <button
                type="button"
                className={`payment-method-btn cash ${paymentType === 'cash' ? 'active' : ''}`}
                onClick={() => setPaymentType('cash')}
              >
                <span>💵</span> Cash Paid
              </button>
              <button
                type="button"
                className={`payment-method-btn bank ${paymentType === 'bank' ? 'active' : ''}`}
                onClick={() => setPaymentType('bank')}
              >
                <span>🏦</span> Bank Transfer
              </button>
              <button
                type="button"
                className={`payment-method-btn cheque ${paymentType === 'cheque' ? 'active' : ''}`}
                onClick={() => setPaymentType('cheque')}
              >
                <span>📝</span> Cheque Issued
              </button>
            </div>
          </div>

          {/* Bottom Totals & Submit Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1c1c1c', padding: '14px 18px', border: '1px solid var(--line)', borderRadius: 4 }}>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>
              Lines: <strong style={{ color: '#fff' }}>{items.length}</strong> | Total Qty: <strong style={{ color: '#fff' }}>{totalQty} units</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div>
                <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Purchase Amount: </span>
                <span className="mono font-semibold" style={{ fontSize: 24, color: '#52e37e', marginLeft: 8 }}>
                  {formatCurrency(totalAmount)}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => handleSaveDirectPurchase(e, true)}
                className="secondary-button"
                style={{ borderColor: '#ffca58', color: '#ffca58', padding: '10px 18px', fontSize: 14, fontWeight: 700 }}
                title="Save as Draft without affecting inventory balances or WAC"
              >
                📁 Save as Draft
              </button>
              <button
                type="submit"
                className="primary-button"
                style={{ padding: '10px 24px', fontSize: 14, fontWeight: 800 }}
              >
                {editingPurchaseId ? '💾 Update & Add to Stock' : 'Save & Add to Stock'}
              </button>
            </div>
          </div>
        </form>

        {/* Item Entry Popup (Shop-POS popup when clicking a product in the tree) */}
        {selectedLineProduct && (
          <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <div className="modal-box item-entry-modal">
              <div className="modal-header">
                <div className="item-entry-heading" style={{ margin: 0 }}>
                  <div>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Add Purchase Item</span>
                    <h3 style={{ margin: '2px 0 0', color: '#fff' }}>{selectedLineProduct.name}</h3>
                    <p style={{ margin: 0, color: 'var(--primary)', fontFamily: 'var(--mono)', fontSize: 12 }}>{selectedLineProduct.item_code}</p>
                  </div>
                </div>
                <button type="button" className="modal-close" onClick={() => setSelectedLineProduct(null)}>&times;</button>
              </div>

              <form onSubmit={confirmAddProductToLines}>
                <div className="modal-body">
                  <div className="item-entry-fields">
                    <div>
                      <label>Purchase Unit Cost (LKR) *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        autoFocus
                        className="mono font-semibold"
                        value={lineDraft.unit_cost}
                        onChange={(e) => setLineDraft({ ...lineDraft, unit_cost: e.target.value })}
                      />
                    </div>
                    <div>
                      <label>Quantity *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        className="mono font-semibold"
                        value={lineDraft.qty}
                        onChange={(e) => setLineDraft({ ...lineDraft, qty: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="item-entry-total">
                    <span style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>LINE TOTAL:</span>
                    <strong>{formatCurrency((Number(lineDraft.qty) || 0) * (Number(lineDraft.unit_cost) || 0))}</strong>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="secondary-button" onClick={() => setSelectedLineProduct(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="primary-button" style={{ fontWeight: 800 }}>
                    Add to Purchase Lines
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Quick Add Product Modal */}
        {isAddProductOpen && (
          <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <div className="modal-box modal-sm" style={{ maxWidth: 480 }}>
              <div className="modal-header">
                <h3>+ Quick Create Product</h3>
                <button type="button" onClick={() => setIsAddProductOpen(false)} className="modal-close">&times;</button>
              </div>
              <form onSubmit={handleSaveQuickProduct}>
                <div className="modal-body">
                  <div>
                    <label>Product Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 2.5 SATA SSD Samsung 128GB"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                    />
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <label>Item Code / SKU</label>
                    <input
                      type="text"
                      placeholder="e.g. SSD-SAM-128 (auto-generated if empty)"
                      value={newProductCode}
                      onChange={(e) => setNewProductCode(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                    <div>
                      <label>Cost Price (Rs) *</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        placeholder="e.g. 3500"
                        value={newProductCost}
                        onChange={(e) => setNewProductCost(e.target.value)}
                      />
                    </div>
                    <div>
                      <label>Wholesale Price (Rs)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 4200"
                        value={newProductWholesalePrice}
                        onChange={(e) => setNewProductWholesalePrice(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <label>Category Folder</label>
                    <select
                      value={newProductCatId}
                      onChange={(e) => setNewProductCatId(e.target.value)}
                    >
                      <option value="">-- No Folder / Root --</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>📁 {c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" onClick={() => setIsAddProductOpen(false)} className="secondary-button">
                    Cancel
                  </button>
                  <button type="submit" className="primary-button" style={{ fontWeight: 700 }}>
                    Create & Select
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Quick Add Supplier Modal */}
        {isAddSupplierOpen && (
          <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <div className="modal-box modal-sm">
              <div className="modal-header">
                <h3>+ Add New Supplier</h3>
                <button type="button" onClick={() => setIsAddSupplierOpen(false)} className="modal-close">&times;</button>
              </div>
              <form onSubmit={handleSaveSupplier}>
                <div className="modal-body">
                  <div>
                    <label>Supplier / Company Name *</label>
                    <input
                      type="text"
                      required
                      value={newSupplierName}
                      onChange={(e) => setNewSupplierName(e.target.value)}
                    />
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <label>Phone / Contact</label>
                    <input
                      type="text"
                      value={newSupplierPhone}
                      onChange={(e) => setNewSupplierPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" onClick={() => setIsAddSupplierOpen(false)} className="secondary-button">
                    Cancel
                  </button>
                  <button type="submit" className="primary-button">
                    Save Supplier
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page-section" style={{ padding: 18 }}>
      {/* Top Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
        <div className="panel-card" style={{ borderLeft: '4px solid #52e37e' }}>
          <small style={{ color: 'var(--muted)', fontWeight: 600 }}>PURCHASE DOCUMENTS</small>
          <div className="mono font-semibold" style={{ fontSize: 24, marginTop: 4, color: '#52e37e' }}>
            {purchases.length} Documents
          </div>
        </div>

        <div className="panel-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <small style={{ color: 'var(--muted)', fontWeight: 600 }}>TOTAL VALUE PURCHASED (LKR)</small>
          <div className="mono font-semibold" style={{ fontSize: 24, marginTop: 4, color: 'var(--primary)' }}>
            {formatCurrency(totalPurchaseValue)}
          </div>
        </div>

        <div className="panel-card" style={{ borderLeft: '4px solid #ffca58' }}>
          <small style={{ color: 'var(--muted)', fontWeight: 600 }}>TOTAL UNITS RECEIVED</small>
          <div className="mono font-semibold" style={{ fontSize: 24, marginTop: 4, color: '#ffca58' }}>
            {totalItemsReceived} Units
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="action-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleOpenDirectPurchase}
            className="primary-button"
            style={{ fontWeight: 700 }}
          >
            + New Purchase Document
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab && onNavigateTab('stock-in-transit')}
            className="secondary-button"
            style={{ fontWeight: 600 }}
          >
            🚢 Go to Stock in Transit
          </button>

          <input
            type="text"
            placeholder="Search doc #, supplier or transit ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 280 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`secondary-button ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({purchases.length})
          </button>
          <button
            className={`secondary-button ${statusFilter === 'drafts' ? 'active' : ''}`}
            onClick={() => setStatusFilter('drafts')}
            style={statusFilter === 'drafts' ? { borderColor: '#ffca58', color: '#ffca58' } : { color: '#ffca58' }}
          >
            Drafts ({draftCount})
          </button>
          <button
            className={`secondary-button ${statusFilter === 'received' ? 'active' : ''}`}
            onClick={() => setStatusFilter('received')}
          >
            Received & In Stock ({receivedCount})
          </button>
        </div>
      </div>

      {/* Purchase Documents Table */}
      <div className="large-table" style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 6 }}>
        <table>
          <thead>
            <tr>
              <th>Doc #</th>
              <th>Date</th>
              <th>Supplier</th>
              <th>Transit Ref</th>
              <th style={{ textAlign: 'center' }}>Items</th>
              <th style={{ textAlign: 'right' }}>Total (LKR)</th>
              <th style={{ textAlign: 'center' }}>Payment / Status</th>
              <th style={{ width: 200, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPurchases.map(doc => {
              const itemCount = (doc.items || []).length;
              const isSelected = selectedDoc?.id === doc.id;
              const isDraft = doc.status === 'draft';

              return (
                <tr
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={isSelected ? 'selected-row' : ''}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="mono font-semibold" style={{ color: 'var(--primary)' }}>
                    {doc.doc_no || doc.grn_no}
                  </td>
                  <td>{formatDate(doc.receipt_date || doc.created_at)}</td>
                  <td style={{ fontWeight: 700 }}>{doc.supplier_name || 'Supplier'}</td>
                  <td>
                    {doc.shipment_no ? (
                      <span className="mono" style={{ color: '#0284c7' }}>{doc.shipment_no}</span>
                    ) : (
                      <span style={{ color: 'var(--muted)' }}>Direct Purchase</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-neutral">{itemCount} items</span>
                  </td>
                  <td className="mono font-semibold" style={{ textAlign: 'right', color: 'var(--text)' }}>
                    {formatCurrency(doc.total_amount_lkr || doc.total_landed_lkr || 0)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {isDraft ? (
                      <span className="badge badge-warning" style={{ background: '#4a3811', color: '#ffca58', border: '1px solid #946f1e' }}>
                        DRAFT
                      </span>
                    ) : (
                      <span className="badge badge-primary" style={{ textTransform: 'uppercase' }}>
                        {doc.payment_type || 'Credit'}
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      {isDraft ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleEditPurchaseDocument(doc); }}
                            className="secondary-button small-button"
                            style={{ padding: '4px 8px', fontWeight: 700, color: '#ffca58' }}
                            title="Edit draft purchase document"
                          >
                            ✏️ Edit Draft
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handlePromoteDraftToReceived(doc); }}
                            className="primary-button small-button"
                            style={{ background: '#52e37e', color: '#000', padding: '4px 10px', fontWeight: 700 }}
                            title="Confirm & Receive stock into inventory"
                          >
                            ✅ Receive
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleEditPurchaseDocument(doc); }}
                            className="secondary-button small-button"
                            style={{ padding: '4px 8px', fontWeight: 700 }}
                            title="Edit purchase quantities, costs or items"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSelectedDoc(doc); }}
                            className="secondary-button small-button"
                            style={{ padding: '4px 8px' }}
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDownloadPDF(doc); }}
                            className="secondary-button small-button"
                            style={{ padding: '4px 8px', color: 'var(--primary)' }}
                          >
                            PDF
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const confirmMsg = isDraft
                            ? `Are you sure you want to delete draft purchase document ${doc.doc_no || doc.grn_no}?`
                            : `Are you sure you want to delete purchase document ${doc.doc_no || doc.grn_no}? This will reverse the stock added by this document.`;
                          if (window.confirm(confirmMsg)) {
                            deletePurchaseDocument(doc.id);
                            if (selectedDoc?.id === doc.id) setSelectedDoc(null);
                          }
                        }}
                        className="secondary-button small-button"
                        style={{ padding: '4px 8px', color: '#ff8e8e', borderColor: 'rgba(255, 142, 142, 0.4)' }}
                        title="Delete Purchase Document"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredPurchases.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
                  No purchase documents recorded yet. Receive an in-transit shipment or create a new purchase document.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Selected Purchase Document Details Drawer */}
      {selectedDoc && (
        <div className="panel-card" style={{ marginTop: 20, borderTop: '3px solid #52e37e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0 }}>
                Purchase Document: <span className="mono" style={{ color: '#52e37e' }}>{selectedDoc.doc_no || selectedDoc.grn_no}</span>
              </h3>
              <small style={{ color: 'var(--muted)' }}>
                Supplier: <strong>{selectedDoc.supplier_name}</strong> &bull; Received Date: {formatDate(selectedDoc.receipt_date)} {selectedDoc.shipment_no && `• Transit Ref: ${selectedDoc.shipment_no}`}
              </small>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => handleDownloadPDF(selectedDoc)}
                className="primary-button small-button"
                style={{ fontWeight: 700 }}
              >
                Print / Download PDF
              </button>
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="secondary-button small-button"
              >
                Close Details
              </button>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Product Description</th>
                <th style={{ width: 100, textAlign: 'center' }}>Received Qty</th>
                <th style={{ width: 140, textAlign: 'right' }}>Unit Cost (LKR)</th>
                <th style={{ width: 150, textAlign: 'right' }}>Line Total (LKR)</th>
              </tr>
            </thead>
            <tbody>
              {(selectedDoc.items || []).map((it, idx) => {
                const prod = products.find(p => p.id === it.product_id);
                const cost = it.final_landed_unit_cost_lkr || it.unit_cost_lkr || it.foreign_unit_cost || 0;
                const qty = it.received_sellable_qty || it.shipped_qty || it.qty || 0;

                return (
                  <tr key={idx}>
                    <td style={{ color: 'var(--muted)' }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{prod?.name || it.product_name || 'Product'}</div>
                      <small className="mono" style={{ color: 'var(--primary)' }}>{prod?.item_code || '-'}</small>
                    </td>
                    <td className="mono" style={{ textAlign: 'center', fontWeight: 600 }}>{qty}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{formatCurrency(cost)}</td>
                    <td className="mono font-semibold" style={{ textAlign: 'right', color: '#52e37e' }}>
                      {formatCurrency(qty * cost)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="4" style={{ textAlign: 'right', fontWeight: 700 }}>TOTAL PURCHASE AMOUNT (LKR):</td>
                <td className="mono font-semibold" style={{ textAlign: 'right', fontSize: 16, color: '#52e37e' }}>
                  {formatCurrency(selectedDoc.total_amount_lkr || selectedDoc.total_landed_lkr || 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

