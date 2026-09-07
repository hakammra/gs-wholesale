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
    transitGroups = [],
    salesDocuments = [],
    stockBalances = {},
    payments = [],
    cheques = [],
    createTransitShipment,
    updateTransitShipment,
    deleteTransitShipment,
    receivePurchaseShipment,
    saveSupplier,
    saveProduct,
    saveTransitGroup,
    deleteTransitGroup
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
  const [isSaving, setIsSaving] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [arrivalShippingPaymentMethod, setArrivalShippingPaymentMethod] = useState('cash');
  const [arrivalShippingAlreadyRecorded, setArrivalShippingAlreadyRecorded] = useState(false);
  const [arrivalShippingCheque, setArrivalShippingCheque] = useState({
    cheque_no: '',
    cheque_date: new Date().toISOString().slice(0, 10),
    bank_name: ''
  });

  // Form State for New Stock in Transit
  const [supplierId, setSupplierId] = useState(() => savedDraft?.supplierId || suppliers[0]?.id || '');
  const [documentDate, setDocumentDate] = useState(() => savedDraft?.documentDate || new Date().toISOString().slice(0, 10));
  const [expectedArrivalDate, setExpectedArrivalDate] = useState(
    () => savedDraft?.expectedArrivalDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [shippingMethod, setShippingMethod] = useState(() => savedDraft?.shippingMethod || 'Air Cargo');
  const [externalReference, setExternalReference] = useState(() => savedDraft?.externalReference || '');
  const [notes, setNotes] = useState(() => savedDraft?.notes || '');
  const [goodsAmountPaid, setGoodsAmountPaid] = useState(() => Number(savedDraft?.goodsAmountPaid) || 0);

  // Payment Selection
  const [paymentType, setPaymentType] = useState(() => (
    savedDraft?.paymentType && savedDraft.paymentType !== 'credit' ? savedDraft.paymentType : 'cash'
  )); // Transit goods are paid when dispatched; shipping is paid separately on arrival.
  const [chequeNo, setChequeNo] = useState(() => savedDraft?.chequeNo || '');
  const [chequeDate, setChequeDate] = useState(() => savedDraft?.chequeDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const [chequeBank, setChequeBank] = useState(() => savedDraft?.chequeBank || '');

  // Items State (in direct LKR, no foreign currency conversion)
  const [items, setItems] = useState(() => savedDraft?.items || []);

  // Tree & Item Picker State (Shop-POS layout)
  const [treeSearch, setTreeSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [selectedLineProduct, setSelectedLineProduct] = useState(null);
  const [lineDraft, setLineDraft] = useState({ qty: 1 });
  const [isGroupManagerOpen, setIsGroupManagerOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [groupDraft, setGroupDraft] = useState({ name: '', description: '', product_ids: [] });
  const [groupProductSearch, setGroupProductSearch] = useState('');

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
  const totalQty = items.reduce((sum, it) => sum + (Number(it.qty ?? it.shipped_qty) || 0), 0);
  const arrivalFinalValue = receivingItems.reduce((sum, item) => sum + (
    ((Number(item.received_sellable_qty) || 0) + (Number(item.damaged_qty) || 0)) * (Number(item.final_landed_unit_cost_lkr) || 0)
  ), 0);
  const arrivalGoodsPaid = Number(shipmentToReceive?.goods_amount_paid_lkr) ||
    ((Number(shipmentToReceive?.foreign_items_subtotal) || 0) * (Number(shipmentToReceive?.exchange_rate_snapshot) || 1));
  const arrivalCostDifference = arrivalFinalValue - arrivalGoodsPaid;
  const arrivalShippingTotal = Math.max(0, arrivalCostDifference);
  const getShipmentCosts = (shipment) => {
    const goods = Number(shipment?.goods_amount_paid_lkr) || ((Number(shipment?.foreign_items_subtotal) || 0) * (Number(shipment?.exchange_rate_snapshot) || 1));
    const estimate = Math.max(0, Number(shipment?.estimated_landed_expenses_lkr) || ((Number(shipment?.total_estimated_cost_lkr) || 0) - goods));
    const actual = Math.max(0, Number(shipment?.total_landed_expenses_lkr) || 0);
    return { goods, estimate, actual, final: goods + actual, basis: goods + (actual > 0 ? actual : estimate) };
  };

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
        goodsAmountPaid,
        paymentType,
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
    goodsAmountPaid,
    paymentType,
    chequeNo,
    chequeDate,
    chequeBank,
    items
  ]);

  useEffect(() => {
    setSelectedTransit(current => current
      ? (transitShipments.find(shipment => shipment.id === current.id) || current)
      : null
    );
  }, [transitShipments]);

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
    setGoodsAmountPaid(0);
    setPaymentType('cash');
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

  const handlePromoteDraftToTransit = async (shipment) => {
    try {
      await updateTransitShipment(shipment.id, {
        status: 'in_transit',
        payment_type: 'cash'
      });
      notifySuccess(`Draft shipment ${shipment.shipment_no} dispatched! In-transit inventory updated.`);
    } catch {
      // Shared sync handling reports the error.
    }
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
    setGoodsAmountPaid(0);
    setPaymentType('cash');
    setItems([]);
    setTreeSearch('');
    setSelectedCategoryId('all');
    setSelectedLineProduct(null);
    setIsFormOpen(true);
  };

  const handleEditShipment = (shipment) => {
    setEditingShipmentId(shipment.id);
    setSupplierId(shipment.supplier_id || suppliers[0]?.id || '');
    setDocumentDate(shipment.shipping_date || shipment.departure_date || shipment.document_date || new Date().toISOString().slice(0, 10));
    setExpectedArrivalDate(shipment.expected_arrival_date || shipment.estimated_arrival_date || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
    setShippingMethod(shipment.courier_freight_company || shipment.shipping_line_carrier || 'Air Cargo');
    setExternalReference(shipment.tracking_or_bl_no || shipment.bill_of_lading_no || shipment.supplier_invoice_ref || '');
    setNotes(shipment.notes || '');
    setGoodsAmountPaid(Number(shipment.goods_amount_paid_lkr) || ((Number(shipment.foreign_items_subtotal) || 0) * (Number(shipment.exchange_rate_snapshot) || 1)));
    setPaymentType(shipment.payment_type && shipment.payment_type !== 'credit' ? shipment.payment_type : 'cash');
    const linkedPayment = payments.find(payment => (
      payment.source_key === `transit:${shipment.id}:payment` || payment.transit_shipment_id === shipment.id
    ));
    const linkedCheque = linkedPayment
      ? cheques.find(cheque => cheque.id === linkedPayment.cheque_id || cheque.payment_id === linkedPayment.id)
      : null;
    setChequeNo(linkedCheque?.cheque_no || '');
    setChequeDate(linkedCheque?.cheque_date || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
    setChequeBank(linkedCheque?.bank_name || '');

    const loadedItems = (shipment.items || []).map(it => {
      const prod = products.find(p => p.id === it.product_id);
      const group = transitGroups.find(candidate => candidate.id === it.transit_group_id);
      const qty = Number(it.shipped_qty || it.qty) || 1;
      const lineType = it.line_type === 'group' || it.transit_group_id ? 'group' : 'known_product';
      return {
        id: it.id,
        line_type: lineType,
        product_id: lineType === 'group' ? null : it.product_id,
        transit_group_id: lineType === 'group' ? it.transit_group_id : null,
        product_name: lineType === 'group' ? (group?.name || it.transit_group_name || 'Unconfirmed group') : (it.product_name || prod?.name || 'Product'),
        item_code: lineType === 'group' ? 'GROUP' : (it.item_code || prod?.item_code || ''),
        qty
      };
    });

    setItems(loadedItems);
    setTreeSearch('');
    setSelectedCategoryId('all');
    setSelectedLineProduct(null);
    setIsFormOpen(true);
  };

  const startAddProductToLines = (product) => {
    setSelectedLineProduct({ ...product, line_type: 'known_product' });
    setLineDraft({ qty: 1 });
  };

  const startAddGroupToLines = (group) => {
    setSelectedLineProduct({ ...group, line_type: 'group', item_code: 'GROUP' });
    setLineDraft({ qty: 1 });
  };

  const confirmAddProductToLines = (e) => {
    if (e) e.preventDefault();
    if (!selectedLineProduct) return;
    const qty = Number(lineDraft.qty) || 1;
    if (qty <= 0) {
      notifyError('Quantity must be greater than zero');
      return;
    }

    setItems(prev => {
      const isGroup = selectedLineProduct.line_type === 'group';
      const existingIdx = prev.findIndex(it => isGroup
        ? it.line_type === 'group' && it.transit_group_id === selectedLineProduct.id
        : it.line_type !== 'group' && it.product_id === selectedLineProduct.id
      );
      if (existingIdx >= 0) {
        return prev.map((it, i) => {
          if (i !== existingIdx) return it;
          const currentQty = Number(it.qty ?? it.shipped_qty) || 0;
          const newQty = currentQty + qty;
          return {
            ...it,
            qty: newQty,
            shipped_qty: newQty
          };
        });
      }
      return [
        ...prev,
        {
          line_type: isGroup ? 'group' : 'known_product',
          product_id: isGroup ? null : selectedLineProduct.id,
          transit_group_id: isGroup ? selectedLineProduct.id : null,
          product_name: selectedLineProduct.name,
          item_code: isGroup ? 'GROUP' : selectedLineProduct.item_code,
          qty,
          shipped_qty: qty
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
      return updated;
    }));
  };

  const openNewGroup = () => {
    setEditingGroupId(null);
    setGroupDraft({ name: '', description: '', product_ids: [] });
    setGroupProductSearch('');
    setIsGroupManagerOpen(true);
  };

  const openEditGroup = (group) => {
    setEditingGroupId(group.id);
    setGroupDraft({
      name: group.name,
      description: group.description || '',
      product_ids: products.filter(product => product.transit_group_id === group.id).map(product => product.id)
    });
    setGroupProductSearch('');
    setIsGroupManagerOpen(true);
  };

  const groupProductSearchTerm = groupProductSearch.trim().toLowerCase();
  const filteredGroupProducts = products.filter(product => !groupProductSearchTerm || [
    product.name,
    product.item_code,
    product.model,
    product.barcode
  ].some(value => String(value || '').toLowerCase().includes(groupProductSearchTerm)));

  const handleSaveGroup = async (event) => {
    event.preventDefault();
    try {
      await saveTransitGroup({ id: editingGroupId, ...groupDraft });
      setIsGroupManagerOpen(false);
    } catch (error) {
      notifyError(error.message || 'Could not save the transit group.');
    }
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
          return [{ line_type: 'known_product', product_id: savedProd.id, qty: 1 }];
        }
        return [...prev, { line_type: 'known_product', product_id: savedProd.id, qty: 1 }];
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
    if (isSaving) return;

    if (!asDraft && paymentType === 'cheque' && (!chequeNo.trim() || !chequeDate)) {
      notifyError('Cheque number and cheque date are required.');
      return;
    }

    const validItems = items.filter(it => it.line_type === 'group' ? it.transit_group_id : it.product_id);
    if (validItems.length === 0) {
      notifyError('Add at least one known product or unconfirmed transit group.');
      return;
    }
    if (!asDraft && Number(goodsAmountPaid) <= 0) {
      notifyError('Enter the total goods amount paid so it can be recorded in Cash Flow.');
      return;
    }

    setIsSaving(true);
    try {
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

      const payload = {
      supplier_id: resolvedSupplierId,
      bill_of_lading_no: externalReference || `REF-${Date.now().toString().slice(-4)}`,
      shipping_line_carrier: shippingMethod,
      departure_date: documentDate,
      estimated_arrival_date: expectedArrivalDate,
      notes,
      goods_amount_paid_lkr: Math.max(0, Number(goodsAmountPaid) || 0),
      estimated_landed_expenses_lkr: 0,
      payment_type: paymentType,
      payment_details: paymentType === 'cheque' ? { cheque_no: chequeNo, cheque_date: chequeDate, bank_name: chequeBank } : null,
      items: validItems.map(it => ({
        id: it.id,
        line_type: it.line_type === 'group' ? 'group' : 'known_product',
        product_id: it.line_type === 'group' ? null : it.product_id,
        transit_group_id: it.line_type === 'group' ? it.transit_group_id : null,
        shipped_qty: Number(it.qty) || 1,
        qty: Number(it.qty) || 1,
        foreign_unit_cost: 0,
        unit_cost: 0,
        allocated_landed_lkr_per_unit: 0,
        final_landed_unit_cost_lkr: 0,
        weight_kg: 0.1,
        volume_cbm: 0.001
      })),
      currency: 'LKR',
      exchange_rate_snapshot: 1.0,
      status: asDraft ? 'draft' : 'in_transit'
      };

      if (editingShipmentId) {
        await updateTransitShipment(editingShipmentId, payload);
        notifySuccess(asDraft ? 'Transit draft shipment updated!' : 'Stock in Transit shipment updated! In-transit inventory counts re-applied.');
      } else {
        await createTransitShipment(payload);
        notifySuccess(asDraft ? 'Stock in Transit saved as Draft! (No inventory impact until dispatched)' : 'Transit document saved. Goods payment entered Cash Flow and known-product quantities are now in transit.');
      }
      localStorage.removeItem('gs_transit_form_draft');
      setHasDraftBanner(false);
      setEditingShipmentId(null);
      setIsFormOpen(false);
    } catch {
      // Keep the form open; the shared sync layer displays the cloud error.
    } finally {
      setIsSaving(false);
    }
  };

  // Open Receive & Convert Modal
  const handleOpenReceiveModal = (shipment) => {
    const shipmentCosts = getShipmentCosts(shipment);
    setShipmentToReceive(shipment);
    setArrivalDate(new Date().toISOString().slice(0, 10));
    setArrivalNotes(`Arrived from ${shipment.shipping_line_carrier} on ${new Date().toISOString().slice(0, 10)}`);
    setReceivingItems((shipment.items || []).map(it => {
      const shippedQty = Number(it.shipped_qty || it.qty) || 1;
      const isGroup = it.line_type === 'group' || Boolean(it.transit_group_id);
      const product = products.find(candidate => candidate.id === it.product_id);
      const group = transitGroups.find(candidate => candidate.id === it.transit_group_id);
      return {
        row_id: `${it.id}-${Date.now()}-${Math.random()}`,
        transit_shipment_item_id: it.id,
        source_line_type: isGroup ? 'group' : 'known_product',
        source_product_id: isGroup ? null : it.product_id,
        transit_group_id: isGroup ? it.transit_group_id : null,
        source_label: isGroup ? (group?.name || 'Unconfirmed group') : (product?.name || 'Known product'),
        expected_qty: shippedQty,
        product_id: isGroup ? '' : it.product_id,
        shipped_qty: shippedQty,
        received_sellable_qty: shippedQty,
        damaged_qty: 0,
        missing_qty: 0,
        final_landed_unit_cost_lkr: Number(it.final_landed_unit_cost_lkr) || 0
      };
    }));
    setArrivalShippingPaymentMethod('cash');
    setArrivalShippingAlreadyRecorded(
      shipmentCosts.actual > 0 || (shipment.landed_expenses || []).some(expense => Number(expense.amount_lkr) > 0)
    );
    setArrivalShippingCheque({
      cheque_no: '',
      cheque_date: new Date().toISOString().slice(0, 10),
      bank_name: ''
    });
    setIsReceiveModalOpen(true);
  };

  const addArrivalSplit = (sourceRow) => {
    setReceivingItems(current => [...current, {
      ...sourceRow,
      row_id: `${sourceRow.transit_shipment_item_id}-${Date.now()}-${Math.random()}`,
      product_id: '',
      received_sellable_qty: 0,
      damaged_qty: 0,
      missing_qty: 0,
      final_landed_unit_cost_lkr: 0
    }]);
  };

  const updateArrivalRow = (rowId, patch) => {
    setReceivingItems(current => current.map(row => row.row_id === rowId ? { ...row, ...patch } : row));
  };

  const removeArrivalRow = (rowId) => {
    setReceivingItems(current => current.filter(row => row.row_id !== rowId));
  };

  // Confirm Arrival & Convert to Purchase Document
  const handleConfirmArrival = async (e) => {
    e.preventDefault();
    if (!shipmentToReceive || isReceiving) return;

    const sourceLines = shipmentToReceive.items || [];
    for (const sourceLine of sourceLines) {
      const sourceRows = receivingItems.filter(row => row.transit_shipment_item_id === sourceLine.id);
      const accounted = sourceRows.reduce((sum, row) => sum + (Number(row.received_sellable_qty) || 0) + (Number(row.damaged_qty) || 0) + (Number(row.missing_qty) || 0), 0);
      const expected = Number(sourceLine.shipped_qty || sourceLine.qty) || 0;
      if (Math.abs(accounted - expected) > 0.001) {
        notifyWarning(`${sourceRows[0]?.source_label || 'Transit line'} must account for exactly ${expected} units. Currently accounted: ${accounted}.`);
        return;
      }
    }
    const stockRows = receivingItems.filter(row => (Number(row.received_sellable_qty) || 0) + (Number(row.damaged_qty) || 0) > 0);
    if (stockRows.some(row => !row.product_id)) {
      notifyWarning('Select the actual product for every received or damaged quantity.');
      return;
    }
    if (stockRows.some(row => Number(row.final_landed_unit_cost_lkr) <= 0)) {
      notifyWarning('Enter the final landed unit cost for every received product.');
      return;
    }
    const duplicateProduct = stockRows.find((row, index) => stockRows.findIndex(other => other.product_id === row.product_id) !== index);
    if (duplicateProduct) {
      notifyWarning('The same actual product is selected more than once. Merge its quantities into one arrival line.');
      return;
    }

    const activeReservationItems = salesDocuments
      .filter(document =>
        (document.doc_type === 'reserved_order' || document.doc_type === 'sales_order') &&
        (document.status === 'reserved' || document.status === 'confirmed')
      )
      .flatMap(document => document.items || []);
    for (const sourceLine of sourceLines) {
      const isGroup = sourceLine.line_type === 'group' || Boolean(sourceLine.transit_group_id);
      const matchingArrivalRows = receivingItems.filter(row => row.transit_shipment_item_id === sourceLine.id);
      const arrivingSellable = matchingArrivalRows.reduce((sum, row) => sum + (Number(row.received_sellable_qty) || 0), 0);
      const otherIncoming = transitShipments
        .filter(shipment => shipment.id !== shipmentToReceive.id && shipment.status === 'in_transit')
        .flatMap(shipment => shipment.items || [])
        .filter(item => isGroup ? item.transit_group_id === sourceLine.transit_group_id : item.product_id === sourceLine.product_id)
        .reduce((sum, item) => sum + (Number(item.shipped_qty || item.qty) || 0), 0);
      const reserved = isGroup
        ? activeReservationItems
          .filter(item => item.transit_group_id === sourceLine.transit_group_id)
          .reduce((sum, item) => sum + (Number(item.reserved_in_transit_qty) || 0), 0)
        : Number(stockBalances[sourceLine.product_id]?.qty_in_transit_reserved) || 0;
      const unfulfilledAfterArrival = Math.max(0, reserved - arrivingSellable);
      if (unfulfilledAfterArrival > otherIncoming + 0.001) {
        const sourceName = isGroup
          ? (transitGroups.find(group => group.id === sourceLine.transit_group_id)?.name || 'transit group')
          : (products.find(product => product.id === sourceLine.product_id)?.name || 'product');
        notifyWarning(`${sourceName} has ${reserved} incoming units reserved. This arrival must provide at least ${reserved - otherIncoming} sellable units, or those reservations must be released first.`);
        return;
      }
    }
    if (arrivalCostDifference < -0.01) {
      notifyWarning(`Final classified value is ${formatCurrency(Math.abs(arrivalCostDifference))} below the goods amount already paid. Increase the landed costs or correct the goods payment before completing arrival.`);
      return;
    }

    if (!arrivalShippingAlreadyRecorded && arrivalShippingTotal > 0 && arrivalShippingPaymentMethod === 'cheque' && (!arrivalShippingCheque.cheque_no || !arrivalShippingCheque.cheque_date || !arrivalShippingCheque.bank_name)) {
      notifyWarning('Enter the shipping cheque number, date and bank.');
      return;
    }

    setIsReceiving(true);
    try {
      const shippingRatio = arrivalFinalValue > 0 ? arrivalShippingTotal / arrivalFinalValue : 0;
      const rowsToPost = receivingItems.filter(row =>
        (Number(row.received_sellable_qty) || 0) + (Number(row.damaged_qty) || 0) > 0 ||
        (row.source_line_type === 'known_product' && (Number(row.missing_qty) || 0) > 0)
      );
      const finalizedItems = rowsToPost.map(row => {
        const finalUnitCost = Number(row.final_landed_unit_cost_lkr) || 0;
        const shippingUnitCost = finalUnitCost * shippingRatio;
        return {
          ...row,
          shipped_qty: (Number(row.received_sellable_qty) || 0) + (Number(row.damaged_qty) || 0) + (Number(row.missing_qty) || 0),
          foreign_unit_cost: finalUnitCost - shippingUnitCost,
          goods_unit_cost_lkr: finalUnitCost - shippingUnitCost,
          shipping_unit_cost_lkr: shippingUnitCost,
          allocated_landed_lkr_per_unit: shippingUnitCost,
          unit_cost_lkr: finalUnitCost,
          final_landed_unit_cost_lkr: finalUnitCost
        };
      });
      const purDoc = await receivePurchaseShipment({
        transit_shipment_id: shipmentToReceive.id,
        receipt_date: arrivalDate,
        notes: arrivalNotes,
        items: finalizedItems,
        shipping_payment: arrivalShippingTotal > 0 && !arrivalShippingAlreadyRecorded ? {
          amount: arrivalShippingTotal,
          method: arrivalShippingPaymentMethod,
          bank_account_id: null,
          cheque_details: arrivalShippingPaymentMethod === 'cheque' ? arrivalShippingCheque : null,
          payee: shipmentToReceive.shipping_line_carrier || 'Shipping / Clearing'
        } : null
      });

      notifySuccess(`Shipment ${shipmentToReceive.shipment_no} marked as ARRIVED and converted to Purchase Document ${purDoc?.doc_no || ''}! Stock quantities added to inventory.`);
      setIsReceiveModalOpen(false);
      setShipmentToReceive(null);
    } catch {
      // Keep the modal open so the operation can be safely retried.
    } finally {
      setIsReceiving(false);
    }
  };

  // RENDER FULL IN-PAGE WORKSPACE WHEN CREATING NEW SHIPMENT
  if (isFormOpen) {
    return (
      <div className="document-form-workspace page-section">
        {/* Workspace Header Bar */}
        <div className="document-workspace-header transit-form-header">
          <div className="transit-form-title" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
          <div className="transit-form-actions" style={{ display: 'flex', gap: 10 }}>
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
              disabled={isSaving}
              className="secondary-button"
              style={{ borderColor: '#ffca58', color: '#ffca58', fontWeight: 700 }}
              title="Save as Draft without affecting in-transit stock balances"
            >
              📁 Save as Draft
            </button>
            <button
              type="button"
              onClick={(e) => handleSaveShipment(e, false)}
              disabled={isSaving}
              className="primary-button"
              style={{ fontWeight: 800 }}
            >
              {isSaving ? 'Saving…' : editingShipmentId ? '💾 Update & Dispatch' : '🚀 Place & Dispatch Shipment'}
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
              <label style={{ fontSize: 12 }}>Total Goods Amount Paid (LKR) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="mono font-semibold"
                value={goodsAmountPaid}
                onChange={(event) => setGoodsAmountPaid(event.target.value)}
                required
              />
              <small style={{ color: 'var(--muted)' }}>One payment for the complete order. Unit and shipping costs are decided at arrival.</small>
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
              <div style={{ padding: 8, borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 7 }}>
                  <strong style={{ fontSize: 12 }}>Unconfirmed Transit Groups</strong>
                  <button type="button" className="secondary-button small-button" onClick={openNewGroup}>+ Group</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {transitGroups.filter(group => group.is_active !== false).map(group => (
                    <div key={group.id} style={{ display: 'flex', border: '1px solid rgba(255, 202, 88, 0.55)', borderRadius: 5, overflow: 'hidden', background: 'rgba(255, 202, 88, 0.1)' }}>
                      <button type="button" onClick={() => startAddGroupToLines(group)} style={{ border: 0, borderRadius: 0, padding: '6px 9px', fontSize: 11, color: '#ffe2a0', background: 'transparent', fontWeight: 700 }}>
                        ? {group.name}
                      </button>
                      <button type="button" onClick={() => openEditGroup(group)} style={{ border: 0, borderLeft: '1px solid rgba(255, 202, 88, 0.35)', borderRadius: 0, padding: '6px 8px', fontSize: 10, color: '#ffe2a0', background: 'rgba(255, 202, 88, 0.08)' }} title="Edit group">✏️</button>
                    </div>
                  ))}
                  {!transitGroups.length && <small style={{ color: 'var(--muted)' }}>Create a group for items whose exact brand is unknown.</small>}
                </div>
              </div>
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
                <strong style={{ fontSize: 13 }}>Expected Products / Groups & Quantities</strong>
                <span className="count-label">
                  {items.length} line{items.length === 1 ? '' : 's'} in shipment
                </span>
              </div>

              <div className="table-wrap purchase-items-wrap" style={{ maxHeight: 400 }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 110 }}>Line Type</th>
                      <th>Known Product / Unconfirmed Group</th>
                      <th style={{ width: 125, textAlign: 'center' }}>Qty</th>
                      <th style={{ width: 35 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => {
                      const prod = products.find(p => p.id === it.product_id) || {};
                      const itemQty = Number(it.qty ?? it.shipped_qty) || 1;
                      const group = transitGroups.find(candidate => candidate.id === it.transit_group_id);
                      const isGroup = it.line_type === 'group';

                      return (
                        <tr key={it.product_id || it.transit_group_id || idx}>
                          <td style={{ color: isGroup ? '#ffca58' : '#52e37e', fontWeight: 700 }}>
                            {isGroup ? 'Unconfirmed Group' : 'Known Product'}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{isGroup ? (group?.name || it.product_name || 'Group') : (it.product_name || prod.name || 'Product')}</div>
                            {!isGroup && <small className="mono" style={{ color: 'var(--primary)' }}>{it.item_code || prod.item_code || '-'}</small>}
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
                        <td colSpan="4" style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--muted)' }}>
                          <div style={{ fontSize: 24, marginBottom: 6 }}>📦 ➔ 🚢</div>
                          <div style={{ fontWeight: 600, color: '#e5e5e5' }}>No products or transit groups added yet.</div>
                          <small style={{ display: 'block', marginTop: 4 }}>
                            Add a known product or an unconfirmed group from the left.
                          </small>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Goods payment is recorded now; shipping is recorded separately at arrival. */}
          <div style={{ background: '#242424', padding: 14, border: '1px solid var(--line)', borderRadius: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8, display: 'block' }}>
              Goods Payment Method (Added to Cash Flow on the Transit Document Date)
            </label>
            <div className="payment-method-selector">
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
            {paymentType === 'cheque' && (
              <div className="payment-detail-grid cheque-detail-grid">
                <div><label>Cheque number *</label><input value={chequeNo} onChange={(e) => setChequeNo(e.target.value)} required /></div>
                <div><label>Cheque date *</label><input type="date" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)} required /></div>
                <div><label>Cheque bank *</label><input value={chequeBank} onChange={(e) => setChequeBank(e.target.value)} required /></div>
              </div>
            )}
          </div>

          {/* Bottom Totals & Submit Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, background: '#1c1c1c', padding: '14px 18px', border: '1px solid var(--line)', borderRadius: 4 }}>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>
              Lines: <strong style={{ color: '#fff' }}>{items.length}</strong> | Expected Qty: <strong style={{ color: '#fff' }}>{totalQty} units</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  Complete supplier goods payment — unit costs assigned at arrival
                </div>
                <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>Goods Paid Now: </span>
                <span className="mono font-semibold" style={{ fontSize: 24, color: 'var(--primary)', marginLeft: 8 }}>
                  {formatCurrency(goodsAmountPaid)}
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
                disabled={isSaving}
                className="primary-button"
                style={{ padding: '10px 24px', fontSize: 14, fontWeight: 800 }}
              >
                {isSaving ? 'Saving…' : editingShipmentId ? '💾 Update & Dispatch' : '🚀 Place & Dispatch Shipment'}
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
                    <span style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>
                      {selectedLineProduct.line_type === 'group' ? 'Add Unconfirmed Group' : 'Add Known Product'}
                    </span>
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
                      <label>Expected Quantity *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        autoFocus
                        className="mono font-semibold"
                        value={lineDraft.qty}
                        onChange={(e) => setLineDraft({ ...lineDraft, qty: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="item-entry-total">
                    <span style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>COST:</span>
                    <strong style={{ fontSize: 13, color: 'var(--muted)' }}>Assigned when the shipment arrives</strong>
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

        {isGroupManagerOpen && (
          <div className="modal-overlay" style={{ zIndex: 1150 }}>
            <div className="modal-box" style={{ maxWidth: 680 }}>
              <div className="modal-header">
                <h3>{editingGroupId ? 'Edit Transit Group' : 'Create Transit Group'}</h3>
                <button type="button" className="modal-close" onClick={() => setIsGroupManagerOpen(false)}>&times;</button>
              </div>
              <form onSubmit={handleSaveGroup}>
                <div className="modal-body">
                  <label>Group Name *</label>
                  <input required value={groupDraft.name} onChange={(event) => setGroupDraft(current => ({ ...current, name: event.target.value }))} placeholder="e.g. 120/128GB SATA SSD" />
                  <label style={{ marginTop: 10 }}>Description</label>
                  <input value={groupDraft.description} onChange={(event) => setGroupDraft(current => ({ ...current, description: event.target.value }))} placeholder="Products that may arrive under this group" />
                  <label style={{ marginTop: 12 }}>Products allowed in this group</label>
                  <input
                    type="search"
                    value={groupProductSearch}
                    onChange={(event) => setGroupProductSearch(event.target.value)}
                    placeholder="Search product name, SKU, model or barcode..."
                    style={{ marginBottom: 8 }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: 'var(--muted)', fontSize: 11 }}>
                    <span>{filteredGroupProducts.length} matching products</span>
                    <span>{groupDraft.product_ids.length} selected</span>
                  </div>
                  <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid var(--line)', borderRadius: 4, padding: 8 }}>
                    {filteredGroupProducts.map(product => (
                      <label key={product.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 4px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={groupDraft.product_ids.includes(product.id)}
                          onChange={(event) => setGroupDraft(current => ({
                            ...current,
                            product_ids: event.target.checked
                              ? [...current.product_ids.filter(id => id !== product.id), product.id]
                              : current.product_ids.filter(id => id !== product.id)
                          }))}
                          style={{ width: 'auto' }}
                        />
                        <span><strong>{product.name}</strong> <small className="mono" style={{ color: 'var(--muted)' }}>{product.item_code}</small></span>
                      </label>
                    ))}
                    {!filteredGroupProducts.length && (
                      <div style={{ padding: 18, textAlign: 'center', color: 'var(--muted)' }}>No matching products.</div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  {editingGroupId && (
                    <button type="button" className="danger-button" onClick={async () => {
                      if (!window.confirm('Delete this transit group?')) return;
                      try { await deleteTransitGroup(editingGroupId); setIsGroupManagerOpen(false); } catch (error) { notifyError(error.message); }
                    }}>Delete Group</button>
                  )}
                  <button type="button" className="secondary-button" onClick={() => setIsGroupManagerOpen(false)}>Cancel</button>
                  <button type="submit" className="primary-button">Save Group</button>
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
    <div className="page-section transit-page">
      {/* Top Stat Cards */}
      <div className="transit-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
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
      <div className="transit-guide" style={{ background: 'rgba(2, 132, 199, 0.08)', border: '1px solid rgba(2, 132, 199, 0.25)', borderRadius: 6, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
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
      <div className="action-toolbar transit-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div className="transit-toolbar-primary" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
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

        <div className="transit-status-filters" style={{ display: 'flex', gap: 8 }}>
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
      <div className="large-table transit-list-table" style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 6 }}>
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
              <th style={{ minWidth: 350, textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredShipments.map(shp => {
              const sup = suppliers.find(s => s.id === shp.supplier_id);
              const itemCount = (shp.items || []).length;
              const isSelected = selectedTransit?.id === shp.id;
              const isArrived = checkIsArrived(shp);
              const isDraft = shp.status === 'draft';
              const shipmentCosts = getShipmentCosts(shp);

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
                  <td>{formatDate(shp.expected_arrival_date || shp.estimated_arrival_date)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-neutral">{itemCount} items</span>
                  </td>
                  <td className="mono font-semibold" style={{ textAlign: 'right', color: 'var(--text)' }}>
                    <div>{formatCurrency(isArrived ? shipmentCosts.basis : shipmentCosts.goods + shipmentCosts.estimate)}</div>
                    <small style={{ display: 'block', color: 'var(--muted)', fontFamily: 'var(--font)' }}>
                      {isArrived ? 'Final landed at arrival' : 'Goods amount paid only'}
                    </small>
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
                  <td style={{ textAlign: 'center', minWidth: 350 }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
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
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onNavigateTab) onNavigateTab('purchase-documents');
                            }}
                            className="secondary-button small-button"
                            style={{ fontSize: 11, padding: '4px 8px', color: '#52e37e' }}
                          >
                            ✏️ {shp.purchase_doc_no ? 'Edit Purchase' : 'View Purchase'}
                          </button>
                        </>
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
        <div className="panel-card transit-details-card" style={{ marginTop: 20, borderTop: '3px solid var(--primary)' }}>
          <div className="transit-details-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0 }}>
                Shipment Items: <span className="mono" style={{ color: 'var(--primary)' }}>{selectedTransit.shipment_no}</span>
              </h3>
              <small style={{ color: 'var(--muted)' }}>
                Supplier: <strong>{suppliers.find(s => s.id === selectedTransit.supplier_id)?.name || 'Supplier'}</strong> &bull; Carrier: {selectedTransit.shipping_line_carrier} {selectedTransit.purchase_doc_no && `• Converted to Purchase Doc: ${selectedTransit.purchase_doc_no}`}
              </small>
            </div>
            <div className="transit-details-actions" style={{ display: 'flex', gap: 8 }}>
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

          <div className="transit-details-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 12 }}>
            {[
              ['Goods Paid', getShipmentCosts(selectedTransit).goods, '#38bdf8'],
              [checkIsArrived(selectedTransit) ? 'Calculated Shipping' : 'Shipping at Arrival', checkIsArrived(selectedTransit) ? getShipmentCosts(selectedTransit).actual : 0, '#ffca58'],
              [checkIsArrived(selectedTransit) ? 'Final Landed Total' : 'Payment Recorded', checkIsArrived(selectedTransit) ? getShipmentCosts(selectedTransit).basis : getShipmentCosts(selectedTransit).goods, '#52e37e']
            ].map(([label, amount, color]) => (
              <div key={label} style={{ padding: 10, background: '#1c1c1c', border: '1px solid var(--line)', borderRadius: 4 }}>
                <small style={{ color: 'var(--muted)', display: 'block' }}>{label}</small>
                <strong className="mono" style={{ color }}>{formatCurrency(amount)}</strong>
              </div>
            ))}
          </div>

          <div className="transit-preview-table" role="region" aria-label="Shipment items table" tabIndex="0">
            <div className="transit-scroll-hint">Swipe sideways to view all item columns →</div>
            <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Expected Product / Group</th>
                <th style={{ width: 140 }}>Type</th>
                <th style={{ width: 100, textAlign: 'center' }}>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {(selectedTransit.items || []).map((it, idx) => {
                const prod = products.find(p => p.id === it.product_id);
                const group = transitGroups.find(candidate => candidate.id === it.transit_group_id);
                const isGroup = it.line_type === 'group' || Boolean(it.transit_group_id);
                const qty = it.shipped_qty || it.qty || 0;

                return (
                  <tr key={idx}>
                    <td style={{ color: 'var(--muted)' }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{isGroup ? (group?.name || 'Unconfirmed group') : (prod?.name || 'Product')}</div>
                      {!isGroup && <small className="mono" style={{ color: 'var(--primary)' }}>{prod?.item_code || '-'}</small>}
                    </td>
                    <td style={{ color: isGroup ? '#ffca58' : '#52e37e' }}>{isGroup ? 'Unconfirmed Group' : 'Known Product'}</td>
                    <td className="mono" style={{ textAlign: 'center', fontWeight: 600 }}>{qty}</td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MARK ARRIVED & CONVERT TO PURCHASE DOCUMENT MODAL */}
      {isReceiveModalOpen && shipmentToReceive && (
        <div className="modal-overlay">
          <div className="modal-box modal-lg transit-arrival-modal" style={{ maxWidth: 880, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <h3>📦 Mark Shipment as Arrived & Convert to Purchase Document</h3>
              <button type="button" onClick={() => setIsReceiveModalOpen(false)} className="modal-close">&times;</button>
            </div>

            <form onSubmit={handleConfirmArrival} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="modal-body" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 18px' }}>
                <div style={{ background: '#1c1c1c', padding: 12, borderRadius: 4, marginBottom: 12, border: '1px solid var(--line)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 12 }}>
                  <div className="panel-card" style={{ padding: 10 }}>
                    <small style={{ color: 'var(--muted)' }}>GOODS PAID AT DISPATCH</small>
                    <div className="mono font-semibold">{formatCurrency(getShipmentCosts(shipmentToReceive).goods)}</div>
                  </div>
                  <div className="panel-card" style={{ padding: 10 }}>
                    <small style={{ color: 'var(--muted)' }}>CALCULATED SHIPPING</small>
                    <div className="mono font-semibold" style={{ color: '#ffca58' }}>{formatCurrency(arrivalShippingTotal)}</div>
                  </div>
                  <div className="panel-card" style={{ padding: 10 }}>
                    <small style={{ color: 'var(--muted)' }}>FINAL LANDED TOTAL</small>
                    <div className="mono font-semibold" style={{ color: '#52e37e' }}>{formatCurrency(arrivalFinalValue)}</div>
                  </div>
                </div>

                <div style={{ marginBottom: 12, padding: 9, borderRadius: 4, background: 'rgba(255, 202, 88, 0.09)', border: '1px solid rgba(255, 202, 88, 0.4)', color: '#ffe2a0', fontSize: 12 }}>
                  Classify every group into actual products and enter each final landed unit cost (including shipping). Shipping is calculated as final classified value minus the goods payment already recorded.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 12 }}>
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
                    <label style={{ margin: 0, fontWeight: 700 }}>CLASSIFY ARRIVED PRODUCTS, QUANTITIES & FINAL LANDED COST</label>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{receivingItems.length} line items</span>
                  </div>
                  <div className="transit-arrival-table" style={{ maxHeight: '38vh', overflowY: 'auto', overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 4 }}>
                    <table style={{ margin: 0, width: '100%' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 5, background: '#2a2a2a' }}>
                        <tr>
                          <th>Transit Source</th>
                          <th style={{ minWidth: 210 }}>Actual Product</th>
                          <th style={{ width: 80, textAlign: 'center' }}>Expected</th>
                          <th style={{ width: 95, textAlign: 'center' }}>Sellable</th>
                          <th style={{ width: 90, textAlign: 'center' }}>Damaged</th>
                          <th style={{ width: 90, textAlign: 'center' }}>Missing</th>
                          <th style={{ width: 145, textAlign: 'right' }}>Final Landed / Unit</th>
                          <th style={{ width: 130, textAlign: 'right' }}>Total (LKR)</th>
                          <th style={{ width: 70 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {receivingItems.map((item) => {
                          const prod = products.find(p => p.id === item.product_id);
                          const allowedProducts = item.source_line_type === 'group'
                            ? products.filter(product => product.transit_group_id === item.transit_group_id)
                            : products.filter(product => product.id === item.source_product_id);
                          const sourceRows = receivingItems.filter(row => row.transit_shipment_item_id === item.transit_shipment_item_id);
                          const accounted = sourceRows.reduce((sum, row) => sum + (Number(row.received_sellable_qty) || 0) + (Number(row.damaged_qty) || 0) + (Number(row.missing_qty) || 0), 0);
                          return (
                            <tr key={item.row_id}>
                              <td style={{ fontWeight: 700, whiteSpace: 'normal', minWidth: 160 }}>
                                <div>{item.source_label}</div>
                                <small style={{ color: Math.abs(accounted - item.expected_qty) < 0.001 ? '#52e37e' : '#ffca58' }}>{accounted}/{item.expected_qty} accounted</small>
                              </td>
                              <td>
                                {item.source_line_type === 'group' ? (
                                  <select value={item.product_id} onChange={(event) => updateArrivalRow(item.row_id, { product_id: event.target.value })} required={(Number(item.received_sellable_qty) || 0) + (Number(item.damaged_qty) || 0) > 0}>
                                    <option value="">Select actual product</option>
                                    {allowedProducts.map(product => <option key={product.id} value={product.id}>{product.name} ({product.item_code})</option>)}
                                  </select>
                                ) : <div><strong>{prod?.name || item.source_label}</strong><small className="mono" style={{ display: 'block', color: 'var(--primary)' }}>{prod?.item_code}</small></div>}
                              </td>
                              <td className="mono" style={{ textAlign: 'center' }}>{item.expected_qty}</td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  required
                                  className="mono table-number-input"
                                  value={item.received_sellable_qty}
                                  onChange={(event) => updateArrivalRow(item.row_id, { received_sellable_qty: Number(event.target.value) || 0 })}
                                  style={{ width: 85, fontWeight: 700, textAlign: 'center' }}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  className="mono table-number-input"
                                  value={item.damaged_qty}
                                  onChange={(event) => updateArrivalRow(item.row_id, { damaged_qty: Number(event.target.value) || 0 })}
                                  style={{ width: 75, color: '#ff8e8e', textAlign: 'center' }}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  className="mono table-number-input"
                                  value={item.missing_qty}
                                  onChange={(event) => updateArrivalRow(item.row_id, { missing_qty: Number(event.target.value) || 0 })}
                                  style={{ width: 75, color: '#ffca58', textAlign: 'center' }}
                                />
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <input type="number" min="0" step="0.01" className="mono table-number-input" value={item.final_landed_unit_cost_lkr} onChange={(event) => updateArrivalRow(item.row_id, { final_landed_unit_cost_lkr: Number(event.target.value) || 0 })} style={{ width: 130, textAlign: 'right' }} disabled={arrivalShippingAlreadyRecorded} />
                              </td>
                              <td className="mono font-semibold" style={{ textAlign: 'right', color: '#52e37e' }}>
                                {formatCurrency(((Number(item.received_sellable_qty) || 0) + (Number(item.damaged_qty) || 0)) * (Number(item.final_landed_unit_cost_lkr) || 0))}
                              </td>
                              <td>
                                {item.source_line_type === 'group' && (
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <button type="button" className="secondary-button small-button" onClick={() => addArrivalSplit(item)} title="Split into another product">+</button>
                                    {sourceRows.length > 1 && <button type="button" className="secondary-button small-button" onClick={() => removeArrivalRow(item.row_id)} title="Remove split">×</button>}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {arrivalShippingTotal > 0 && arrivalShippingAlreadyRecorded && (
                  <div style={{ marginTop: 12, padding: 12, background: 'rgba(82, 227, 126, 0.08)', border: '1px solid rgba(82, 227, 126, 0.45)', borderRadius: 6 }}>
                    <strong>Shipping payment already recorded</strong>
                    <div style={{ marginTop: 4, color: 'var(--muted)', fontSize: 12 }}>
                      This older shipment already has landed-cost cash flow, so arrival will update stock and WAC without creating a duplicate payment.
                    </div>
                  </div>
                )}

                {arrivalShippingTotal > 0 && !arrivalShippingAlreadyRecorded && (
                  <div style={{ marginTop: 12, padding: 12, background: '#1c1c1c', border: '1px solid var(--line)', borderRadius: 6 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, alignItems: 'end' }}>
                      <div>
                        <label>Shipping Payment at Arrival *</label>
                        <select value={arrivalShippingPaymentMethod} onChange={(e) => setArrivalShippingPaymentMethod(e.target.value)}>
                          <option value="cash">Cash Paid</option>
                          <option value="bank">Bank Transfer</option>
                          <option value="cheque">Cheque Issued</option>
                        </select>
                      </div>
                      <div>
                        <small style={{ color: 'var(--muted)', display: 'block' }}>CASH FLOW AMOUNT</small>
                        <strong className="mono" style={{ color: '#ffca58', fontSize: 18 }}>{formatCurrency(arrivalShippingTotal)}</strong>
                      </div>
                    </div>
                    {arrivalShippingPaymentMethod === 'cheque' && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginTop: 10 }}>
                        <div><label>Cheque Number *</label><input value={arrivalShippingCheque.cheque_no} onChange={(e) => setArrivalShippingCheque(current => ({ ...current, cheque_no: e.target.value }))} required /></div>
                        <div><label>Cheque Date *</label><input type="date" value={arrivalShippingCheque.cheque_date} onChange={(e) => setArrivalShippingCheque(current => ({ ...current, cheque_date: e.target.value }))} required /></div>
                        <div><label>Bank *</label><input value={arrivalShippingCheque.bank_name} onChange={(e) => setArrivalShippingCheque(current => ({ ...current, bank_name: e.target.value }))} required /></div>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ marginTop: 10, padding: 10, background: 'rgba(82, 227, 126, 0.1)', border: '1px solid #52e37e', borderRadius: 4, fontSize: 12 }}>
                  <strong>ℹ️ Note:</strong> Upon clicking Confirm, this shipment will be marked as <strong>Arrived</strong>, converted into a formal <strong>Purchase Document</strong>, and quantities will be added to your sellable stock balance with updated WAC cost prices.
                </div>
              </div>

              <div className="modal-footer" style={{ flexShrink: 0, background: '#242424', borderTop: '1px solid var(--line)', padding: '12px 18px' }}>
                <button type="button" onClick={() => setIsReceiveModalOpen(false)} className="secondary-button">
                  Cancel
                </button>
                <button type="submit" disabled={isReceiving} className="primary-button" style={{ background: '#52e37e', color: '#000', fontWeight: 800 }}>
                  {isReceiving ? 'Receiving…' : 'Confirm Arrival & Convert to Purchase Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
