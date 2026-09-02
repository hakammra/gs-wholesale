import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print(f'Wrote {path}')

# 1. src/pages/StockInTransit/TransitShipmentList.jsx (Modern Shop-POS style Stock in Transit Page)
write_file('src/pages/StockInTransit/TransitShipmentList.jsx', """
import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency, formatDate } from '../../lib/formatters';

export default function TransitShipmentList() {
  const {
    transitShipments = [],
    suppliers = [],
    products = [],
    bankAccounts = [],
    createTransitShipment,
    receivePurchaseShipment,
    saveSupplier
  } = useBusiness();

  const { notifySuccess, notifyError, notifyWarning } = useNotification();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTransit, setSelectedTransit] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedArrivalDate, setExpectedArrivalDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [shippingMethod, setShippingMethod] = useState('Air Cargo');
  const [externalReference, setExternalReference] = useState('');
  const [notes, setNotes] = useState('');

  // Payment Selection
  const [paymentType, setPaymentType] = useState('credit'); // 'credit' | 'cash' | 'bank' | 'cheque'
  const [bankAccountId, setBankAccountId] = useState(bankAccounts[0]?.id || '');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const [chequeBank, setChequeBank] = useState('Commercial Bank');

  // Items State (in direct LKR, no foreign currency conversion)
  const [items, setItems] = useState([
    { product_id: products[0]?.id || '', qty: 10, unit_cost: Number(products[0]?.weighted_cost_lkr) || 1000 }
  ]);

  // Quick Add Supplier Modal State
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');

  // Calculations
  const totalAmount = items.reduce((sum, it) => sum + ((Number(it.qty) || 0) * (Number(it.unit_cost) || 0)), 0);
  const totalQty = items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);

  // Filtered Shipments
  const filteredShipments = transitShipments.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const sup = suppliers.find(sp => sp.id === s.supplier_id);
    return (
      s.shipment_no?.toLowerCase().includes(term) ||
      s.bill_of_lading_no?.toLowerCase().includes(term) ||
      sup?.name?.toLowerCase().includes(term)
    );
  });

  const inTransitCount = transitShipments.filter(s => s.status === 'in_transit').length;
  const receivedCount = transitShipments.filter(s => s.status === 'received').length;
  const inTransitValue = transitShipments
    .filter(s => s.status === 'in_transit')
    .reduce((sum, s) => sum + (Number(s.total_estimated_cost_lkr) || 0), 0);

  // Handlers for Items
  const handleAddItem = () => {
    const defaultProd = products[0] || {};
    setItems(prev => [
      ...prev,
      { product_id: defaultProd.id || '', qty: 5, unit_cost: Number(defaultProd.weighted_cost_lkr) || 1000 }
    ]);
  };

  const handleUpdateItem = (idx, field, val) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      if (field === 'product_id') {
        const prod = products.find(p => p.id === val);
        return {
          ...it,
          product_id: val,
          unit_cost: Number(prod?.weighted_cost_lkr) || it.unit_cost
        };
      }
      return { ...it, [field]: val };
    }));
  };

  const handleRemoveItem = (idx) => {
    if (items.length <= 1) {
      notifyWarning('At least one item is required in the shipment');
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveSupplier = (e) => {
    e.preventDefault();
    if (!newSupplierName.trim()) return;
    saveSupplier({
      name: newSupplierName,
      phone: newSupplierPhone,
      country: 'Sri Lanka'
    });
    setNewSupplierName('');
    setNewSupplierPhone('');
    setIsAddSupplierOpen(false);
  };

  const handleSaveShipment = (e) => {
    e.preventDefault();
    if (!supplierId) {
      notifyError('Please select a supplier');
      return;
    }
    if (items.length === 0) {
      notifyError('Please add at least one product');
      return;
    }

    const payload = {
      supplier_id: supplierId,
      bill_of_lading_no: externalReference || `REF-${Date.now().toString().slice(-4)}`,
      shipping_line_carrier: shippingMethod,
      departure_date: documentDate,
      estimated_arrival_date: expectedArrivalDate,
      notes,
      payment_type: paymentType,
      payment_details: paymentType === 'bank' ? { bank_account_id: bankAccountId } : paymentType === 'cheque' ? { cheque_no: chequeNo, cheque_date: chequeDate, bank_name: chequeBank } : null,
      items: items.map(it => ({
        product_id: it.product_id,
        shipped_qty: Number(it.qty) || 1,
        foreign_unit_cost: Number(it.unit_cost) || 0, // Direct LKR cost
        weight_kg: 0.1,
        volume_cbm: 0.001
      })),
      currency: 'LKR',
      exchange_rate_snapshot: 1.0
    };

    createTransitShipment(payload);
    notifySuccess('Stock in Transit order created successfully!');
    setIsFormOpen(false);
  };

  const handleReceiveStock = (shipment) => {
    if (!window.confirm(`Receive all stock for shipment ${shipment.shipment_no} into current inventory?`)) {
      return;
    }
    receivePurchaseShipment(shipment.id);
    notifySuccess(`Stock received for ${shipment.shipment_no}. Quantities added to inventory!`);
  };

  return (
    <div className="page-section" style={{ padding: 18 }}>
      {/* Top Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
        <div className="panel-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <small style={{ color: 'var(--muted)', fontWeight: 600 }}>ACTIVE IN TRANSIT</small>
          <div className="mono font-semibold" style={{ fontSize: 24, marginTop: 4, color: 'var(--primary)' }}>
            {inTransitCount} Shipments
          </div>
        </div>

        <div className="panel-card" style={{ borderLeft: '4px solid #ffca58' }}>
          <small style={{ color: 'var(--muted)', fontWeight: 600 }}>TOTAL IN-TRANSIT VALUE</small>
          <div className="mono font-semibold" style={{ fontSize: 24, marginTop: 4, color: '#ffca58' }}>
            {formatCurrency(inTransitValue)}
          </div>
        </div>

        <div className="panel-card" style={{ borderLeft: '4px solid #52e37e' }}>
          <small style={{ color: 'var(--muted)', fontWeight: 600 }}>RECEIVED / COMPLETED</small>
          <div className="mono font-semibold" style={{ fontSize: 24, marginTop: 4, color: '#52e37e' }}>
            {receivedCount} Shipments
          </div>
        </div>
      </div>

      {/* Action & Filter Bar */}
      <div className="action-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="primary-button"
            style={{ fontWeight: 700 }}
          >
            + New Stock in Transit
          </button>

          <input
            type="text"
            placeholder="Search by shipment #, ref or supplier..."
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
            All
          </button>
          <button
            className={`secondary-button ${statusFilter === 'in_transit' ? 'active' : ''}`}
            onClick={() => setStatusFilter('in_transit')}
          >
            In Transit ({inTransitCount})
          </button>
          <button
            className={`secondary-button ${statusFilter === 'received' ? 'active' : ''}`}
            onClick={() => setStatusFilter('received')}
          >
            Received ({receivedCount})
          </button>
        </div>
      </div>

      {/* Shipments List Table */}
      <div className="large-table" style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 6 }}>
        <table>
          <thead>
            <tr>
              <th>Shipment #</th>
              <th>Date</th>
              <th>Supplier</th>
              <th>Shipping / Carrier</th>
              <th>Expected Arrival</th>
              <th style={{ textAlign: 'center' }}>Items</th>
              <th style={{ textAlign: 'right' }}>Total (LKR)</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th style={{ width: 140, textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredShipments.map(shp => {
              const sup = suppliers.find(s => s.id === shp.supplier_id);
              const itemCount = (shp.items || []).length;
              const isSelected = selectedTransit?.id === shp.id;

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
                    <span className={`badge badge-${shp.status === 'received' ? 'success' : 'primary'}`}>
                      {shp.status === 'received' ? 'Received' : 'In Transit'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {shp.status === 'in_transit' ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleReceiveStock(shp); }}
                        className="primary-button small-button"
                        style={{ background: '#52e37e', color: '#000', fontWeight: 700, padding: '4px 10px' }}
                      >
                        Receive Stock
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>Stock In Hand</span>
                    )}
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
                Supplier: <strong>{suppliers.find(s => s.id === selectedTransit.supplier_id)?.name || 'Supplier'}</strong> &bull; Carrier: {selectedTransit.shipping_line_carrier}
              </small>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTransit(null)}
              className="secondary-button small-button"
            >
              Close Details
            </button>
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
                const cost = it.foreign_unit_cost || it.final_landed_unit_cost_lkr || 0;
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

      {/* NEW STOCK IN TRANSIT MODAL FORM (Simple, Shop-POS style) */}
      {isFormOpen && (
        <div className="modal-overlay">
          <div className="modal-box modal-lg" style={{ maxWidth: 900 }}>
            <div className="modal-header">
              <h3>📦 New Stock in Transit Order</h3>
              <button type="button" onClick={() => setIsFormOpen(false)} className="modal-close">&times;</button>
            </div>

            <form onSubmit={handleSaveShipment}>
              <div className="modal-body">
                {/* 1. Supplier & Document Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <label style={{ margin: 0 }}>Supplier *</label>
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
                    <label>Order Date *</label>
                    <input
                      type="date"
                      required
                      value={documentDate}
                      onChange={(e) => setDocumentDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label>Expected Arrival Date *</label>
                    <input
                      type="date"
                      required
                      value={expectedArrivalDate}
                      onChange={(e) => setExpectedArrivalDate(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
                  <div>
                    <label>Shipping Method / Carrier</label>
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
                    <label>Tracking / External Invoice #</label>
                    <input
                      type="text"
                      placeholder="e.g. AWB-982312 or INV-1092"
                      value={externalReference}
                      onChange={(e) => setExternalReference(e.target.value)}
                    />
                  </div>
                </div>

                {/* 2. Items List */}
                <div style={{ marginTop: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <h4 style={{ margin: 0, fontSize: 14 }}>Products & Quantities</h4>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="secondary-button small-button"
                      style={{ color: 'var(--primary)', fontWeight: 700 }}
                    >
                      + Add Product Line
                    </button>
                  </div>

                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 35 }}>#</th>
                        <th>Select Product</th>
                        <th style={{ width: 100 }}>Qty</th>
                        <th style={{ width: 140 }}>Unit Cost (Rs)</th>
                        <th style={{ width: 140, textAlign: 'right' }}>Total (Rs)</th>
                        <th style={{ width: 35 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => (
                        <tr key={idx}>
                          <td style={{ color: 'var(--muted)' }}>{idx + 1}</td>
                          <td>
                            <select
                              value={it.product_id}
                              required
                              onChange={(e) => handleUpdateItem(idx, 'product_id', e.target.value)}
                              style={{ width: '100%' }}
                            >
                              <option value="">-- Choose Product --</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.item_code} - {p.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              required
                              className="mono font-semibold"
                              value={it.qty}
                              onChange={(e) => handleUpdateItem(idx, 'qty', Number(e.target.value) || 1)}
                              style={{ textAlign: 'center' }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              required
                              className="mono"
                              value={it.unit_cost}
                              onChange={(e) => handleUpdateItem(idx, 'unit_cost', Number(e.target.value) || 0)}
                            />
                          </td>
                          <td className="mono font-semibold" style={{ textAlign: 'right', color: 'var(--primary)' }}>
                            {formatCurrency((Number(it.qty) || 0) * (Number(it.unit_cost) || 0))}
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="secondary-button small-button"
                              style={{ color: '#ff8e8e' }}
                            >
                              &times;
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 3. Payment Selection */}
                <div style={{ background: '#242424', padding: 14, border: '1px solid var(--line)', marginTop: 16, borderRadius: 4 }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 13 }}>Payment Method</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="payType"
                        value="credit"
                        checked={paymentType === 'credit'}
                        onChange={(e) => setPaymentType(e.target.value)}
                      />
                      <span>Supplier Credit / Pay Later</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="payType"
                        value="cash"
                        checked={paymentType === 'cash'}
                        onChange={(e) => setPaymentType(e.target.value)}
                      />
                      <span>Cash Paid</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="payType"
                        value="bank"
                        checked={paymentType === 'bank'}
                        onChange={(e) => setPaymentType(e.target.value)}
                      />
                      <span>Bank Transfer</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="payType"
                        value="cheque"
                        checked={paymentType === 'cheque'}
                        onChange={(e) => setPaymentType(e.target.value)}
                      />
                      <span>Cheque Issued</span>
                    </label>
                  </div>

                  {paymentType === 'bank' && (
                    <div style={{ marginTop: 10 }}>
                      <label>Select Bank Account *</label>
                      <select
                        value={bankAccountId}
                        onChange={(e) => setBankAccountId(e.target.value)}
                      >
                        {bankAccounts.map(b => (
                          <option key={b.id} value={b.id}>{b.account_name} ({b.bank_name})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {paymentType === 'cheque' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 10 }}>
                      <div>
                        <label>Cheque No *</label>
                        <input
                          type="text"
                          required
                          value={chequeNo}
                          onChange={(e) => setChequeNo(e.target.value)}
                        />
                      </div>
                      <div>
                        <label>Bank Name *</label>
                        <input
                          type="text"
                          required
                          value={chequeBank}
                          onChange={(e) => setChequeBank(e.target.value)}
                        />
                      </div>
                      <div>
                        <label>Cheque Date *</label>
                        <input
                          type="date"
                          required
                          value={chequeDate}
                          onChange={(e) => setChequeDate(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Notes & Totals */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 16, gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <label>Order Notes</label>
                    <input
                      type="text"
                      placeholder="Optional notes or supplier instructions..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  <div style={{ background: '#1c1c1c', padding: 14, border: '1px solid var(--line)', minWidth: 260, textAlign: 'right', borderRadius: 4 }}>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>TOTAL QUANTITY: <strong>{totalQty} units</strong></div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>TOTAL ORDER VALUE (LKR)</div>
                    <div className="mono font-semibold" style={{ fontSize: 24, color: 'var(--primary)', marginTop: 2 }}>
                      {formatCurrency(totalAmount)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsFormOpen(false)} className="secondary-button">
                  Cancel
                </button>
                <button type="submit" className="primary-button" style={{ fontWeight: 800 }}>
                  Save Stock in Transit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD SUPPLIER MODAL */}
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
""")

# 2. src/components/layout/Sidebar.jsx (Cleaned nav items)
write_file('src/components/layout/Sidebar.jsx', """
import React from 'react';
import { useBusiness } from '../../context/BusinessContext';

const NAV_GROUPS = [
  {
    group: 'Checkout',
    items: [
      { key: 'pos', label: 'Wholesale POS', icon: '▦' },
      { key: 'dashboard', label: 'Dashboard', icon: '▤' },
    ]
  },
  {
    group: 'Purchases & Stock',
    items: [
      { key: 'stock-in-transit', label: 'Stock in Transit', icon: '🚢', showTransitBadge: true },
      { key: 'suppliers', label: 'Suppliers & Advances', icon: '♟' },
      { key: 'inventory', label: 'Inventory Stock', icon: '▣' },
      { key: 'products', label: 'Products & Tiers', icon: '◇' },
    ]
  },
  {
    group: 'Sales & Invoicing',
    items: [
      { key: 'sales-documents', label: 'Sales Documents', icon: '▰' },
      { key: 'customers', label: 'Customers & Aging', icon: '👥' },
    ]
  },
  {
    group: 'Finance & System',
    items: [
      { key: 'cheques', label: 'Cheque Register', icon: '💳', showChequeBadge: true },
      { key: 'cashflow-bank', label: 'Cash & Banking', icon: '↕' },
      { key: 'reporting', label: 'Reporting & P&L', icon: '▥' },
      { key: 'settings', label: 'Settings', icon: '⚙' },
    ]
  }
];

export default function Sidebar({ currentTab, onSelectTab }) {
  const { cheques = [], transitShipments = [] } = useBusiness();

  const pendingChequesCount = cheques.filter(c => c.direction === 'received' && (c.status === 'received' || c.status === 'held')).length;
  const inTransitCount = transitShipments.filter(s => s.status === 'in_transit').length;

  return (
    <aside className="sidebar">
      {/* Brand Block */}
      <div className="brand-block">
        <div className="brand-logo">GS</div>
        <div>
          <h1>GS WHOLESALE</h1>
          <p>Direct Importers & POS</p>
        </div>
      </div>

      {/* Grouped Nav List */}
      <div className="nav-list">
        {NAV_GROUPS.map((grp, gIdx) => (
          <div key={gIdx}>
            <div className="nav-group-title">{grp.group}</div>
            {grp.items.map((item) => {
              const isActive = currentTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => onSelectTab(item.key)}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.showChequeBadge && pendingChequesCount > 0 && (
                    <span className="nav-badge">{pendingChequesCount}</span>
                  )}
                  {item.showTransitBadge && inTransitCount > 0 && (
                    <span className="nav-badge" style={{ background: '#0284c7' }}>{inTransitCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}
""")

# 3. src/App.jsx (Updated navigation routing)
write_file('src/App.jsx', """
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
      case 'purchases':
        return <TransitShipmentList onNavigateTab={setCurrentTab} />;
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
""")

print("Stock in transit page and navigation updated successfully.")
