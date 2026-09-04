import React, { useState, useMemo, useEffect } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency, formatDate } from '../../lib/formatters';
import DocumentProductTree from '../../components/common/DocumentProductTree';

export default function TransitShipmentList({ onNavigateTab }) {
  const {
    transitShipments = [],
    purchases = [],
    suppliers = [],
    products = [],
    categories = [],
    bankAccounts = [],
    createTransitShipment,
    updateTransitShipment,
    deleteTransitShipment,
    receivePurchaseShipment,
    saveSupplier,
    saveProduct
  } = useBusiness();

  const { notifySuccess, notifyError, notifyWarning } = useNotification();

  // Load unsaved draft across navigation if exists
  const savedDraft = useMemo(() => {
    try {
      const raw = localStorage.getItem('gs_transit_form_draft');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.error('Failed to parse transit draft', e);
    }
    return null;
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(() => !!savedDraft?.isFormOpen);
  const [editingShipmentId, setEditingShipmentId] = useState(() => savedDraft?.editingShipmentId || null);
  const [hasDraftBanner, setHasDraftBanner] = useState(() => !!savedDraft?.isFormOpen);
  const [selectedTransit, setSelectedTransit] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Arrival & Conversion Modal State
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [shipmentToReceive, setShipmentToReceive] = useState(null);
  const [arrivalDate, setArrivalDate] = useState(new Date().toISOString().slice(0, 10));
  const [receivingItems, setReceivingItems] = useState([]);
  const [arrivalNotes, setArrivalNotes] = useState('');

  // Form State for New Stock in Transit
  const [supplierId, setSupplierId] = useState(() => savedDraft?.supplierId || suppliers[0]?.id || '');
  const [documentDate, setDocumentDate] = useState(() => savedDraft?.documentDate || new Date().toISOString().slice(0, 10));
  const [expectedArrivalDate, setExpectedArrivalDate] = useState(
    () => savedDraft?.expectedArrivalDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [shippingMethod, setShippingMethod] = useState(() => savedDraft?.shippingMethod || 'Air Cargo');
  const [externalReference, setExternalReference] = useState(() => savedDraft?.externalReference || '');
  const [notes, setNotes] = useState(() => savedDraft?.notes || '');

  // Payment Selection
  const [paymentType, setPaymentType] = useState(() => savedDraft?.paymentType || 'credit'); // 'credit' | 'cash' | 'bank' | 'cheque'
  const [bankAccountId, setBankAccountId] = useState(() => savedDraft?.bankAccountId || bankAccounts[0]?.id || '');
  const [chequeNo, setChequeNo] = useState(() => savedDraft?.chequeNo || '');
  const [chequeDate, setChequeDate] = useState(() => savedDraft?.chequeDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const [chequeBank, setChequeBank] = useState(() => savedDraft?.chequeBank || 'Commercial Bank');

  // Items State (in direct LKR, no foreign currency conversion)
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

  // Calculations
  const totalAmount = items.reduce((sum, it) => sum + ((Number(it.qty ?? it.shipped_qty) || 0) * (Number(it.unit_cost ?? it.foreign_unit_cost) || 0)), 0);
  const totalQty = items.reduce((sum, it) => sum + (Number(it.qty ?? it.shipped_qty) || 0), 0);

  // Auto-save form draft across page navigation
  useEffect(() => {
    if (isFormOpen) {
      const draft = {
        isFormOpen: true,
        editingShipmentId,
        supplierId,
        documentDate,
        expectedArrivalDate,
        shippingMethod,
        externalReference,
        notes,
        paymentType,
        bankAccountId,
        chequeNo,
        chequeDate,
        chequeBank,
        items
      };
      localStorage.setItem('gs_transit_form_draft', JSON.stringify(draft));
    } else {
      localStorage.removeItem('gs_transit_form_draft');
    }
  }, [
    isFormOpen,
    editingShipmentId,
    supplierId,
    documentDate,
    expectedArrivalDate,
    shippingMethod,
    externalReference,
    notes,
    paymentType,
    bankAccountId,
    chequeNo,
    chequeDate,
    chequeBank,
    items
  ]);

  const handleClearDraft = () => {
    localStorage.removeItem('gs_transit_form_draft');
    setHasDraftBanner(false);
    setIsFormOpen(false);
    setEditingShipmentId(null);
    setSupplierId(suppliers[0]?.id || '');
    setDocumentDate(new Date().toISOString().slice(0, 10));
    setExpectedArrivalDate(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
    setShippingMethod('Air Cargo');
    setExternalReference('');
    setNotes('');
    setPaymentType('credit');
    setBankAccountId(bankAccounts[0]?.id || '');
    setChequeNo('');
    setItems([]);
    notifySuccess('Unsaved draft cleared');
  };

  const handleCancelForm = () => {
    localStorage.removeItem('gs_transit_form_draft');
    setHasDraftBanner(false);
    setIsFormOpen(false);
    setEditingShipmentId(null);
  };

  // Filter out any internal companion shipments created for direct purchases
  const validTransitShipments = transitShipments.filter(s =>
    !s.shipment_no?.startsWith('DIR-TRN-') &&
    !s.notes?.includes('Direct purchase companion')
  );

  // Helper to determine if shipment has arrived or converted to purchase
  const checkIsArrived = (s) => {
    if (s.status === 'arrived' || s.status === 'received') return true;
    if (s.purchase_doc_id || s.purchase_doc_no) return true;
    return purchases.some(p => p.transit_shipment_id === s.id || (s.shipment_no && p.shipment_no === s.shipment_no));
  };

  // Filtered Shipments
  const filteredShipments = validTransitShipments.filter(s => {
    const isArrived = checkIsArrived(s);
    const isDraft = s.status === 'draft';
    if (statusFilter === 'drafts' && !isDraft) return false;
    if (statusFilter === 'in_transit' && (isArrived || isDraft)) return false;
    if (statusFilter === 'arrived' && !isArrived) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const sup = suppliers.find(sp => sp.id === s.supplier_id);
    return (
      s.shipment_no?.toLowerCase().includes(term) ||
      s.bill_of_lading_no?.toLowerCase().includes(term) ||
      s.purchase_doc_no?.toLowerCase().includes(term) ||
      sup?.name?.toLowerCase().includes(term)
    );
  });

  const draftCount = validTransitShipments.filter(s => s.status === 'draft').length;
  const inTransitCount = validTransitShipments.filter(s => s.status === 'in_transit' && !checkIsArrived(s)).length;
  const arrivedCount = validTransitShipments.filter(s => checkIsArrived(s)).length;
  const inTransitValue = validTransitShipments
    .filter(s => s.status === 'in_transit' && !checkIsArrived(s))
    .reduce((sum, s) => sum + (Number(s.total_estimated_cost_lkr || s.foreign_items_subtotal) || 0), 0);

  const handlePromoteDraftToTransit = (shipment) => {
    updateTransitShipment(shipment.id, { status: 'in_transit' });
    notifySuccess(`Draft shipment ${shipment.shipment_no} dispatched! In-transit inventory updated.`);
  };

  const handleOpenNewShipment = () => {
    localStorage.removeItem('gs_transit_form_draft');
    setHasDraftBanner(false);
    setEditingShipmentId(null);
    setSupplierId(suppliers[0]?.id || '');
    setDocumentDate(new Date().toISOString().slice(0, 10));
    setExpectedArrivalDate(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
    setShippingMethod('Air Cargo');
    setExternalReference('');
    setNotes('');
    setPaymentType('credit');
    setItems([]);
    setTreeSearch('');
    setSelectedCategoryId('all');
    setSelectedLineProduct(null);
    setIsFormOpen(true);
  };

  const handleEditShipment = (shipment) => {
    setEditingShipmentId(shipment.id);
    setSupplierId(shipment.supplier_id || suppliers[0]?.id || '');
    setDocumentDate(shipment.departure_date || shipment.document_date || new Date().toISOString().slice(0, 10));
    setExpectedArrivalDate(shipment.estimated_arrival_date || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
    setShippingMethod(shipment.shipping_line_carrier || 'Air Cargo');
    setExternalReference(shipment.bill_of_lading_no || '');
    setNotes(shipment.notes || '');
    setPaymentType(shipment.payment_type || 'credit');

    const loadedItems = (shipment.items || []).map(it => {
      const prod = products.find(p => p.id === it.product_id);
      return {
        product_id: it.product_id,
        product_name: it.product_name || prod?.name || 'Product',
        item_code: it.item_code || prod?.item_code || '',
        qty: Number(it.shipped_qty || it.qty) || 1,
        unit_cost: Number(it.foreign_unit_cost || it.unit_cost) || 0
      };
    });

    setItems(loadedItems);
    setTreeSearch('');
    setSelectedCategoryId('all');
    setSelectedLineProduct(null);
    setIsFormOpen(true);
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
          const currentQty = Number(it.qty ?? it.shipped_qty) || 0;
          const newQty = currentQty + qty;
          return {
            ...it,
            qty: newQty,
            shipped_qty: newQty,
            unit_cost: unitCost,
            foreign_unit_cost: unitCost
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
          shipped_qty: qty,
          unit_cost: unitCost,
          foreign_unit_cost: unitCost
        }
      ];
    });

    notifySuccess(`Added ${selectedLineProduct.name} to order lines`);
    setSelectedLineProduct(null);
  };

  const handleUpdateItem = (idx, field, val) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: val };
      if (field === 'qty') updated.shipped_qty = val;
      if (field === 'unit_cost') updated.foreign_unit_cost = val;
      return updated;
    }));
  };

  const handleRemoveItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (!newSupplierName.trim()) return;
    try {
      const newSup = await saveSupplier({
        name: newSupplierName,
        phone: newSupplierPhone,
        country: 'Sri Lanka'
      });
      if (newSup?.id) setSupplierId(newSup.id);
      setNewSupplierName('');
      setNewSupplierPhone('');
      setIsAddSupplierOpen(false);
      notifySuccess('Supplier added successfully');
    } catch {
      // Keep the dialog open; the shared sync layer displays the cloud error.
    }
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
      setItems(prev => {
        if (prev.length === 1 && !prev[0].product_id) {
          return [{ product_id: savedProd.id, qty: 1, unit_cost: cost }];
        }
        return [...prev, { product_id: savedProd.id, qty: 1, unit_cost: cost }];
      });
    }

    setNewProductName('');
    setNewProductCode('');
    setNewProductCost('');
    setNewProductWholesalePrice('');
    setNewProductCatId('');
    setIsAddProductOpen(false);
  };

  const handleSaveShipment = async (e, asDraft = false) => {
    if (e) e.preventDefault();

    // Auto-resolve supplier
    let resolvedSupplierId = supplierId;
    if (!resolvedSupplierId) {
      if (suppliers.length > 0) {
        resolvedSupplierId = suppliers[0].id;
      } else {
        const autoSup = await saveSupplier({ name: 'General Supplier', country: 'Sri Lanka' });
        resolvedSupplierId = autoSup?.id || 'sup-general';
      }
    }

    const validItems = items.filter(it => it.product_id);
    if (validItems.length === 0) {
      notifyError('Please select at least one product for the shipment');
      return;
    }

    const payload = {
      supplier_id: resolvedSupplierId,
      bill_of_lading_no: externalReference || `REF-${Date.now().toString().slice(-4)}`,
      shipping_line_carrier: shippingMethod,
      departure_date: documentDate,
      estimated_arrival_date: expectedArrivalDate,
      notes,
      payment_type: paymentType,
      payment_details: paymentType === 'bank' ? { bank_account_id: bankAccountId } : paymentType === 'cheque' ? { cheque_no: chequeNo, cheque_date: chequeDate, bank_name: chequeBank } : null,
      items: validItems.map(it => ({
        product_id: it.product_id,
        shipped_qty: Number(it.qty) || 1,
        qty: Number(it.qty) || 1,
        foreign_unit_cost: Number(it.unit_cost) || 0,
        unit_cost: Number(it.unit_cost) || 0,
        weight_kg: 0.1,
        volume_cbm: 0.001
      })),
      currency: 'LKR',
      exchange_rate_snapshot: 1.0,
      status: asDraft ? 'draft' : 'in_transit'
    };

    try {
      if (editingShipmentId) {
        await updateTransitShipment(editingShipmentId, payload);
        notifySuccess(asDraft ? 'Transit draft shipment updated!' : 'Stock in Transit shipment updated! In-transit inventory counts re-applied.');
      } else {
        await createTransitShipment(payload);
        notifySuccess(asDraft ? 'Stock in Transit saved as Draft! (No inventory impact until dispatched)' : 'Stock in Transit order placed! Inventory balances remain unchanged until shipment arrives.');
      }
      localStorage.removeItem('gs_transit_form_draft');
      setHasDraftBanner(false);
      setEditingShipmentId(null);
      setIsFormOpen(false);
    } catch {
      // Keep the form open; the shared sync layer displays the cloud error.
    }
  };

  // Open Receive & Convert Modal
  const handleOpenReceiveModal = (shipment) => {
    setShipmentToReceive(shipment);
    setArrivalDate(new Date().toISOString().slice(0, 10));
    setArrivalNotes(`Arrived from ${shipment.shipping_line_carrier} on ${new Date().toISOString().slice(0, 10)}`);
    setReceivingItems((shipment.items || []).map(it => ({
      product_id: it.product_id,
      shipped_qty: Number(it.shipped_qty || it.qty) || 1,
      received_sellable_qty: Number(it.shipped_qty || it.qty) || 1,
      damaged_qty: 0,
      missing_qty: 0,
      unit_cost_lkr: Number(it.foreign_unit_cost || it.unit_cost || it.final_landed_unit_cost_lkr) || 0,
      final_landed_unit_cost_lkr: Number(it.foreign_unit_cost || it.unit_cost || it.final_landed_unit_cost_lkr) || 0
    })));
    setIsReceiveModalOpen(true);
  };

  // Confirm Arrival & Convert to Purchase Document
  const handleConfirmArrival = (e) => {
    e.preventDefault();
    if (!shipmentToReceive) return;

    const purDoc = receivePurchaseShipment({
      transit_shipment_id: shipmentToReceive.id,
      receipt_date: arrivalDate,
      notes: arrivalNotes,
      items: receivingItems
    });

    notifySuccess(`Shipment ${shipmentToReceive.shipment_no} marked as ARRIVED and converted to Purchase Document ${purDoc?.doc_no || ''}! Stock quantities added to inventory.`);
    setIsReceiveModalOpen(false);
    setShipmentToReceive(null);
  };

  // RENDER FULL IN-PAGE WORKSPACE WHEN CREATING NEW SHIPMENT
  if (isFormOpen) {
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
              ← Back to Shipments
            </button>
            <h2 style={{ margin: 0 }}>
              {editingShipmentId ? '✏️ Edit Stock in Transit Order' : '📦 New Stock in Transit Order'}
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
              onClick={(e) => handleSaveShipment(e, true)}
              className="secondary-button"
              style={{ borderColor: '#ffca58', color: '#ffca58', fontWeight: 700 }}
              title="Save as Draft without affecting in-transit stock balances"
            >
              📁 Save as Draft
            </button>
            <button
              type="button"
              onClick={(e) => handleSaveShipment(e, false)}
              className="primary-button"
              style={{ fontWeight: 800 }}
            >
              {editingShipmentId ? '💾 Update & Dispatch' : '🚀 Place & Dispatch Shipment'}
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
              <strong>📝 In-Progress Draft Restored:</strong> Your unsaved shipment details were preserved when navigating between pages.
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

        <form onSubmit={handleSaveShipment} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Order Meta Header Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, background: '#242424', padding: 14, borderRadius: 4, border: '1px solid var(--line)' }}>
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
              <label style={{ fontSize: 12 }}>Order Date *</label>
              <input
                type="date"
                required
                value={documentDate}
                onChange={(e) => setDocumentDate(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12 }}>Expected Arrival Date *</label>
              <input
                type="date"
                required
                value={expectedArrivalDate}
                onChange={(e) => setExpectedArrivalDate(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12 }}>Shipping Method</label>
              <select
                value={shippingMethod}
                onChange={(e) => setShippingMethod(e.target.value)}
              >
                <option value="Air Cargo">Air Cargo (Express)</option>
                <option value="Sea Freight">Sea Freight (Container)</option>
                <option value="Courier / Local">Courier / Local Delivery</option>
                <option value="Supplier Delivery">Supplier Direct Delivery</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12 }}>Tracking / External Ref #</label>
              <input
                type="text"
                placeholder="e.g. AWB-982312 or INV-1092"
                value={externalReference}
                onChange={(e) => setExternalReference(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12 }}>Order Notes</label>
              <input
                type="text"
                placeholder="Optional notes or supplier instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Split Layout: Category Folder Tree (Left) + Document Line Items (Right) */}
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
                <strong style={{ fontSize: 13 }}>Ordered Products & Quantities</strong>
                <span className="count-label">
                  {items.filter(it => it.product_id).length} item{items.filter(it => it.product_id).length === 1 ? '' : 's'} in shipment
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
                      const itemQty = Number(it.qty ?? it.shipped_qty) || 1;
                      const itemCost = Number(it.unit_cost ?? it.foreign_unit_cost) || 0;
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
                          <td className="mono font-semibold" style={{ textAlign: 'right', color: 'var(--primary)' }}>
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
                          <div style={{ fontSize: 24, marginBottom: 6 }}>📦 ➔ 🚢</div>
                          <div style={{ fontWeight: 600, color: '#e5e5e5' }}>No products added to this shipment order yet.</div>
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
              Products: <strong style={{ color: '#fff' }}>{items.length}</strong> | Total Qty: <strong style={{ color: '#fff' }}>{totalQty} units</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div>
                <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Order Value: </span>
                <span className="mono font-semibold" style={{ fontSize: 24, color: 'var(--primary)', marginLeft: 8 }}>
                  {formatCurrency(totalAmount)}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => handleSaveShipment(e, true)}
                className="secondary-button"
                style={{ borderColor: '#ffca58', color: '#ffca58', padding: '10px 18px', fontSize: 14, fontWeight: 700 }}
                title="Save as Draft without affecting inventory balances"
              >
                📁 Save as Draft
              </button>
              <button
                type="submit"
                className="primary-button"
                style={{ padding: '10px 24px', fontSize: 14, fontWeight: 800 }}
              >
                {editingShipmentId ? '💾 Update & Dispatch' : '🚀 Place & Dispatch Shipment'}
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
                    <span style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Add Order Item</span>
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
                      <label>Unit Cost (LKR) *</label>
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
                    Add to Order Lines
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
        <div className="panel-card" style={{ borderLeft: '4px solid #0284c7' }}>
          <small style={{ color: 'var(--muted)', fontWeight: 600 }}>ACTIVE IN TRANSIT (NOT IN STOCK)</small>
          <div className="mono font-semibold" style={{ fontSize: 24, marginTop: 4, color: '#0284c7' }}>
            {inTransitCount} Shipments
          </div>
        </div>

        <div className="panel-card" style={{ borderLeft: '4px solid #ffca58' }}>
          <small style={{ color: 'var(--muted)', fontWeight: 600 }}>IN-TRANSIT VALUE (LKR)</small>
          <div className="mono font-semibold" style={{ fontSize: 24, marginTop: 4, color: '#ffca58' }}>
            {formatCurrency(inTransitValue)}
          </div>
        </div>

        <div className="panel-card" style={{ borderLeft: '4px solid #52e37e' }}>
          <small style={{ color: 'var(--muted)', fontWeight: 600 }}>ARRIVED & CONVERTED TO PURCHASES</small>
          <div className="mono font-semibold" style={{ fontSize: 24, marginTop: 4, color: '#52e37e' }}>
            {arrivedCount} Shipments
          </div>
        </div>
      </div>

      {/* Workflow Guidance Banner */}
      <div style={{ background: 'rgba(2, 132, 199, 0.08)', border: '1px solid rgba(2, 132, 199, 0.25)', borderRadius: 6, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 12.5, color: '#e0f2fe' }}>
          🚢 <strong>Stock in Transit tracking:</strong> These documents track goods as <span style={{ color: '#ffca58', fontWeight: 700 }}>In Transit</span>. When shipments arrive at your warehouse, click <strong style={{ color: '#52e37e' }}>✓ Arrive & Convert</strong> to add them to sellable on-hand stock. If you are adding stock already in your warehouse, use <strong>Purchase Documents</strong>.
        </div>
        <button
          type="button"
          onClick={() => onNavigateTab && onNavigateTab('purchase-documents')}
          className="secondary-button small-button"
          style={{ fontSize: 11.5, borderColor: '#0284c7', color: '#38bdf8' }}
        >
          📄 Go to Purchase Documents
        </button>
      </div>

      {/* Action & Filter Bar */}
      <div className="action-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleOpenNewShipment}
            className="primary-button"
            style={{ fontWeight: 700 }}
          >
            + New Stock in Transit
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab && onNavigateTab('purchase-documents')}
            className="secondary-button"
            style={{ fontWeight: 600 }}
          >
            📄 View Purchase Documents
          </button>

          <input
            type="text"
            placeholder="Search shipment #, ref, doc # or supplier..."
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
            All ({validTransitShipments.length})
          </button>
          <button
            className={`secondary-button ${statusFilter === 'drafts' ? 'active' : ''}`}
            onClick={() => setStatusFilter('drafts')}
            style={statusFilter === 'drafts' ? { borderColor: '#ffca58', color: '#ffca58' } : { color: '#ffca58' }}
          >
            Drafts ({draftCount})
          </button>
          <button
            className={`secondary-button ${statusFilter === 'in_transit' ? 'active' : ''}`}
            onClick={() => setStatusFilter('in_transit')}
          >
            In Transit ({inTransitCount})
          </button>
          <button
            className={`secondary-button ${statusFilter === 'arrived' ? 'active' : ''}`}
            onClick={() => setStatusFilter('arrived')}
          >
            Arrived & Converted ({arrivedCount})
          </button>
        </div>
      </div>

      {/* Shipments List Table */}
      <div className="large-table" style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 6 }}>
        <table>
          <thead>
            <tr>
              <th>Shipment #</th>
              <th>Order Date</th>
              <th>Supplier</th>
              <th>Shipping / Carrier</th>
              <th>Expected Arrival</th>
              <th style={{ textAlign: 'center' }}>Items</th>
              <th style={{ textAlign: 'right' }}>Total (LKR)</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th style={{ width: 220, textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredShipments.map(shp => {
              const sup = suppliers.find(s => s.id === shp.supplier_id);
              const itemCount = (shp.items || []).length;
              const isSelected = selectedTransit?.id === shp.id;
              const isArrived = checkIsArrived(shp);
              const isDraft = shp.status === 'draft';

              return (
                <tr
                  key={shp.id}
                  onClick={() => setSelectedTransit(shp)}
                  className={isSelected ? 'selected-row' : ''}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="mono font-semibold" style={{ color: 'var(--primary)' }}>
                    {shp.shipment_no}
                  </td>
                  <td>{formatDate(shp.departure_date || shp.created_at)}</td>
                  <td style={{ fontWeight: 700 }}>{sup?.name || 'Supplier'}</td>
                  <td>{shp.shipping_line_carrier || 'Local / Cargo'}</td>
                  <td>{formatDate(shp.estimated_arrival_date)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-neutral">{itemCount} items</span>
                  </td>
                  <td className="mono font-semibold" style={{ textAlign: 'right', color: 'var(--text)' }}>
                    {formatCurrency(shp.total_estimated_cost_lkr || shp.foreign_items_subtotal || 0)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {isDraft ? (
                      <span className="badge badge-warning" style={{ background: '#4a3811', color: '#ffca58', border: '1px solid #946f1e' }}>
                        DRAFT
                      </span>
                    ) : (
                      <span className={`badge badge-${isArrived ? 'success' : 'primary'}`}>
                        {isArrived ? 'Arrived / Received' : 'In Transit'}
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                      {isDraft ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleEditShipment(shp); }}
                            className="secondary-button small-button"
                            style={{ fontWeight: 700, padding: '5px 10px', fontSize: 12, color: '#ffca58' }}
                            title="Resume editing draft shipment"
                          >
                            ✏️ Edit Draft
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handlePromoteDraftToTransit(shp); }}
                            className="primary-button small-button"
                            style={{ background: '#ffca58', color: '#000', fontWeight: 700, padding: '5px 12px', fontSize: 12 }}
                            title="Dispatch draft shipment into in-transit status"
                          >
                            🚀 Dispatch
                          </button>
                        </>
                      ) : !isArrived ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleEditShipment(shp); }}
                            className="secondary-button small-button"
                            style={{ fontWeight: 700, padding: '5px 10px', fontSize: 12 }}
                            title="Edit items, quantities, or prices"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleOpenReceiveModal(shp); }}
                            className="primary-button small-button"
                            style={{ background: '#52e37e', color: '#000', fontWeight: 700, padding: '5px 12px', fontSize: 12 }}
                            title="Mark as arrived and convert to Purchase Document"
                          >
                            ✓ Arrive & Convert
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onNavigateTab) onNavigateTab('purchase-documents');
                          }}
                          className="secondary-button small-button"
                          style={{ fontSize: 11, padding: '4px 8px', color: '#52e37e' }}
                        >
                          📄 {shp.purchase_doc_no || 'View Purchase Doc'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to delete shipment ${shp.shipment_no}?`)) {
                            deleteTransitShipment(shp.id);
                            if (selectedTransit?.id === shp.id) setSelectedTransit(null);
                          }
                        }}
                        className="secondary-button small-button"
                        style={{ color: '#ff8e8e', borderColor: 'rgba(255, 142, 142, 0.4)', padding: '4px 8px' }}
                        title="Delete Shipment"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredShipments.length === 0 && (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
                  No stock in transit documents found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Selected Shipment Item Details Drawer */}
      {selectedTransit && (
        <div className="panel-card" style={{ marginTop: 20, borderTop: '3px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0 }}>
                Shipment Items: <span className="mono" style={{ color: 'var(--primary)' }}>{selectedTransit.shipment_no}</span>
              </h3>
              <small style={{ color: 'var(--muted)' }}>
                Supplier: <strong>{suppliers.find(s => s.id === selectedTransit.supplier_id)?.name || 'Supplier'}</strong> &bull; Carrier: {selectedTransit.shipping_line_carrier} {selectedTransit.purchase_doc_no && `• Converted to Purchase Doc: ${selectedTransit.purchase_doc_no}`}
              </small>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {selectedTransit.status === 'in_transit' && !checkIsArrived(selectedTransit) && (
                <button
                  type="button"
                  onClick={() => handleOpenReceiveModal(selectedTransit)}
                  className="primary-button small-button"
                  style={{ background: '#52e37e', color: '#000', fontWeight: 700 }}
                >
                  ✓ Mark Arrived & Convert to Purchase
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedTransit(null)}
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
                <th style={{ width: 100, textAlign: 'center' }}>Quantity</th>
                <th style={{ width: 130, textAlign: 'right' }}>Unit Cost (LKR)</th>
                <th style={{ width: 140, textAlign: 'right' }}>Line Total (LKR)</th>
              </tr>
            </thead>
            <tbody>
              {(selectedTransit.items || []).map((it, idx) => {
                const prod = products.find(p => p.id === it.product_id);
                const cost = it.foreign_unit_cost || it.unit_cost || it.final_landed_unit_cost_lkr || 0;
                const qty = it.shipped_qty || it.qty || 0;

                return (
                  <tr key={idx}>
                    <td style={{ color: 'var(--muted)' }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{prod?.name || 'Product'}</div>
                      <small className="mono" style={{ color: 'var(--primary)' }}>{prod?.item_code || '-'}</small>
                    </td>
                    <td className="mono" style={{ textAlign: 'center', fontWeight: 600 }}>{qty}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{formatCurrency(cost)}</td>
                    <td className="mono font-semibold" style={{ textAlign: 'right', color: 'var(--primary)' }}>
                      {formatCurrency(qty * cost)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MARK ARRIVED & CONVERT TO PURCHASE DOCUMENT MODAL */}
      {isReceiveModalOpen && shipmentToReceive && (
        <div className="modal-overlay">
          <div className="modal-box modal-lg" style={{ maxWidth: 880, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <h3>📦 Mark Shipment as Arrived & Convert to Purchase Document</h3>
              <button type="button" onClick={() => setIsReceiveModalOpen(false)} className="modal-close">&times;</button>
            </div>

            <form onSubmit={handleConfirmArrival} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="modal-body" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 18px' }}>
                <div style={{ background: '#1c1c1c', padding: 12, borderRadius: 4, marginBottom: 12, border: '1px solid var(--line)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <div>
                      <small style={{ color: 'var(--muted)' }}>SHIPMENT #</small>
                      <div className="mono font-semibold" style={{ color: 'var(--primary)' }}>{shipmentToReceive.shipment_no}</div>
                    </div>
                    <div>
                      <small style={{ color: 'var(--muted)' }}>SUPPLIER</small>
                      <div style={{ fontWeight: 700 }}>{suppliers.find(s => s.id === shipmentToReceive.supplier_id)?.name || 'Supplier'}</div>
                    </div>
                    <div>
                      <small style={{ color: 'var(--muted)' }}>SHIPPING CARRIER</small>
                      <div>{shipmentToReceive.shipping_line_carrier || 'Cargo'}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label>Actual Arrival Date *</label>
                    <input
                      type="date"
                      required
                      value={arrivalDate}
                      onChange={(e) => setArrivalDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Receiving Notes / Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Received at Main Warehouse, inspected by manager"
                      value={arrivalNotes}
                      onChange={(e) => setArrivalNotes(e.target.value)}
                    />
                  </div>
                </div>

                {/* Inspection Table with constrained height and sticky header */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ margin: 0, fontWeight: 700 }}>VERIFY RECEIVED QUANTITIES & UNIT COSTS</label>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{receivingItems.length} line items</span>
                  </div>
                  <div style={{ maxHeight: '38vh', overflowY: 'auto', overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 4 }}>
                    <table style={{ margin: 0, width: '100%' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 5, background: '#2a2a2a' }}>
                        <tr>
                          <th>Product</th>
                          <th style={{ width: 85, textAlign: 'center' }}>Shipped</th>
                          <th style={{ width: 110, textAlign: 'center' }}>Sellable Recv</th>
                          <th style={{ width: 90, textAlign: 'center' }}>Damaged</th>
                          <th style={{ width: 120, textAlign: 'right' }}>Unit Cost (LKR)</th>
                          <th style={{ width: 130, textAlign: 'right' }}>Total (LKR)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receivingItems.map((item, idx) => {
                          const prod = products.find(p => p.id === item.product_id);
                          return (
                            <tr key={idx}>
                              <td style={{ fontWeight: 700, whiteSpace: 'normal', minWidth: 180 }}>{prod?.name || item.product_id}</td>
                              <td className="mono" style={{ textAlign: 'center' }}>{item.shipped_qty}</td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  required
                                  className="mono table-number-input"
                                  value={item.received_sellable_qty}
                                  onChange={(e) => setReceivingItems(prev => prev.map((x, i) => i === idx ? { ...x, received_sellable_qty: Number(e.target.value) || 0 } : x))}
                                  style={{ width: 85, fontWeight: 700, textAlign: 'center' }}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  className="mono table-number-input"
                                  value={item.damaged_qty}
                                  onChange={(e) => setReceivingItems(prev => prev.map((x, i) => i === idx ? { ...x, damaged_qty: Number(e.target.value) || 0 } : x))}
                                  style={{ width: 75, color: '#ff8e8e', textAlign: 'center' }}
                                />
                              </td>
                              <td className="mono" style={{ textAlign: 'right' }}>
                                {formatCurrency(item.unit_cost_lkr)}
                              </td>
                              <td className="mono font-semibold" style={{ textAlign: 'right', color: '#52e37e' }}>
                                {formatCurrency((item.received_sellable_qty || 0) * (item.unit_cost_lkr || 0))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ marginTop: 10, padding: 10, background: 'rgba(82, 227, 126, 0.1)', border: '1px solid #52e37e', borderRadius: 4, fontSize: 12 }}>
                  <strong>ℹ️ Note:</strong> Upon clicking Confirm, this shipment will be marked as <strong>Arrived</strong>, converted into a formal <strong>Purchase Document</strong>, and quantities will be added to your sellable stock balance with updated WAC cost prices.
                </div>
              </div>

              <div className="modal-footer" style={{ flexShrink: 0, background: '#242424', borderTop: '1px solid var(--line)', padding: '12px 18px' }}>
                <button type="button" onClick={() => setIsReceiveModalOpen(false)} className="secondary-button">
                  Cancel
                </button>
                <button type="submit" className="primary-button" style={{ background: '#52e37e', color: '#000', fontWeight: 800 }}>
                  Confirm Arrival & Convert to Purchase Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
