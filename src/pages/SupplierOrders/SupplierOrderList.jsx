import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency, formatDate } from '../../lib/formatters';

export default function SupplierOrderList() {
  const { supplierOrders, suppliers, products, currencies, createSupplierOrder, createTransitShipment } = useBusiness();
  const { notifySuccess } = useNotification();

  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [dispatchOrder, setDispatchOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [orderForm, setOrderForm] = useState({
    supplier_id: suppliers[0]?.id || '',
    currency: 'USD',
    exchange_rate_snapshot: 305.5,
    incoterm: 'FOB',
    port_of_loading: '',
    destination_port: '',
    notes: '',
    items: []
  });

  const [dispatchForm, setDispatchForm] = useState({
    bill_of_lading_no: '',
    shipping_line_carrier: '',
    vessel_name: '',
    origin_country: 'China',
    departure_port: '',
    destination_port: '',
    departure_date: new Date().toISOString().slice(0, 10),
    estimated_arrival_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    customs_clearing_agent: ''
  });

  const handleAddItem = () => {
    setOrderForm(prev => ({
      ...prev,
      items: [...prev.items, { product_id: products[0]?.id || '', ordered_qty: 1, foreign_unit_cost: '' }]
    }));
  };

  const handleUpdateItem = (idx, field, val) => {
    setOrderForm(prev => ({
      ...prev,
      items: prev.items.map((it, i) => i === idx ? { ...it, [field]: val } : it)
    }));
  };

  const handleRemoveItem = (idx) => {
    setOrderForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }));
  };

  const handleSaveOrder = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      await createSupplierOrder(orderForm);
      notifySuccess('Supplier Purchase Order issued successfully');
      setIsNewOrderOpen(false);
    } catch {
      // Keep the order open; the shared sync layer displays the cloud error.
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDispatch = async (e) => {
    e.preventDefault();
    if (!dispatchOrder || isSaving) return;

    setIsSaving(true);
    try {
      await createTransitShipment({
        ...dispatchForm,
        supplier_order_id: dispatchOrder.id,
        supplier_id: dispatchOrder.supplier_id,
        currency: dispatchOrder.currency,
        exchange_rate_snapshot: dispatchOrder.exchange_rate_snapshot,
        items: dispatchOrder.items.map(it => ({
          product_id: it.product_id,
          shipped_qty: it.ordered_qty,
          foreign_unit_cost: it.foreign_unit_cost,
          weight_kg: 0.15,
          volume_cbm: 0.001
        }))
      });
      notifySuccess(`Order ${dispatchOrder.order_no} dispatched into Stock in Transit!`);
      setDispatchOrder(null);
    } catch {
      // Keep the dispatch dialog open; the shared sync layer displays the error.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      {/* Top Action Toolbar */}
      <div className="action-toolbar">
        <button onClick={() => setIsNewOrderOpen(true)} className="toolbar-button bright">
          <span className="icon">+</span>
          <span>New Import Order</span>
        </button>
      </div>

      {/* Orders Table */}
      <div className="panel-card" style={{ borderTop: 0, padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Order #</th>
              <th>Supplier</th>
              <th>Order Date</th>
              <th>Incoterm</th>
              <th>Foreign Total</th>
              <th>Est. Total (LKR)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {supplierOrders.map(order => {
              const sup = suppliers.find(s => s.id === order.supplier_id);
              const foreignTotal = (order.items || []).reduce((sum, it) => sum + (it.ordered_qty * it.foreign_unit_cost), 0);
              const lkrTotal = foreignTotal * (order.exchange_rate_snapshot || 305.5);

              return (
                <tr key={order.id}>
                  <td className="mono font-semibold" style={{ color: 'var(--primary)' }}>{order.order_no}</td>
                  <td style={{ fontWeight: 700 }}>{sup?.name || 'Supplier'}</td>
                  <td>{formatDate(order.order_date)}</td>
                  <td><span className="badge badge-neutral">{order.incoterm || 'FOB'}</span></td>
                  <td className="mono font-semibold">{order.currency} {foreignTotal.toLocaleString()}</td>
                  <td className="mono">{formatCurrency(lkrTotal)}</td>
                  <td>
                    <span className={`badge badge-${order.status === 'completed' ? 'success' : order.status === 'ordered' ? 'primary' : 'warning'}`}>
                      {order.status?.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    {order.status === 'ordered' && (
                      <button
                        onClick={() => setDispatchOrder(order)}
                        className="primary-button small-button"
                      >
                        🚢 Dispatch to Transit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {supplierOrders.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', color: 'var(--muted)', padding: 30 }}>
                  No supplier orders issued yet. Click + New Import Order above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Order Modal */}
      {isNewOrderOpen && (
        <div className="modal-overlay">
          <div className="modal-box modal-lg">
            <div className="modal-header">
              <h3>Issue Import Purchase Order to Factory</h3>
              <button onClick={() => setIsNewOrderOpen(false)} className="modal-close">&times;</button>
            </div>

            <form onSubmit={handleSaveOrder}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px', gap: 12 }}>
                  <div>
                    <label>Foreign Supplier *</label>
                    <select
                      value={orderForm.supplier_id}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, supplier_id: e.target.value }))}
                    >
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.country})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Currency</label>
                    <select
                      value={orderForm.currency}
                      onChange={(e) => {
                        const c = e.target.value;
                        const r = currencies.find(x => x.code === c)?.exchange_rate_to_lkr || 1;
                        setOrderForm(prev => ({ ...prev, currency: c, exchange_rate_snapshot: r }));
                      }}
                    >
                      {currencies.map(c => (
                        <option key={c.code} value={c.code}>{c.code}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Exchange Rate (LKR)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="mono"
                      value={orderForm.exchange_rate_snapshot}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, exchange_rate_snapshot: Number(e.target.value) || 1 }))}
                    />
                  </div>
                </div>

                {/* Items */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ margin: 0 }}>ORDER LINE ITEMS</label>
                    <button type="button" onClick={handleAddItem} className="secondary-button small-button">
                      + Add Item
                    </button>
                  </div>

                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th style={{ width: 100 }}>Qty</th>
                        <th style={{ width: 130 }}>Unit Cost ({orderForm.currency})</th>
                        <th style={{ width: 130, textAlign: 'right' }}>Total</th>
                        <th style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderForm.items.map((it, idx) => (
                        <tr key={idx}>
                          <td>
                            <select
                              value={it.product_id}
                              onChange={(e) => handleUpdateItem(idx, 'product_id', e.target.value)}
                            >
                              {products.map(p => (
                                <option key={p.id} value={p.id}>{p.item_code} - {p.name}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              className="mono"
                              value={it.ordered_qty}
                              onChange={(e) => handleUpdateItem(idx, 'ordered_qty', Number(e.target.value) || 1)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              className="mono"
                              value={it.foreign_unit_cost}
                              onChange={(e) => handleUpdateItem(idx, 'foreign_unit_cost', Number(e.target.value) || 0)}
                            />
                          </td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                            {orderForm.currency} {(it.ordered_qty * it.foreign_unit_cost).toFixed(2)}
                          </td>
                          <td>
                            {orderForm.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="secondary-button small-button danger"
                              >
                                &times;
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsNewOrderOpen(false)} className="secondary-button">
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={isSaving}>
                  {isSaving ? 'Saving…' : 'Issue Supplier Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispatch to Transit Modal */}
      {dispatchOrder && (
        <div className="modal-overlay">
          <div className="modal-box modal-lg">
            <div className="modal-header">
              <h3>Dispatch Order #{dispatchOrder.order_no} into Stock in Transit</h3>
              <button onClick={() => setDispatchOrder(null)} className="modal-close">&times;</button>
            </div>

            <form onSubmit={handleConfirmDispatch}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label>Bill of Lading / Airway Bill No *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MAEU-99881122"
                      value={dispatchForm.bill_of_lading_no}
                      onChange={(e) => setDispatchForm(prev => ({ ...prev, bill_of_lading_no: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label>Carrier / Shipping Line</label>
                    <input
                      type="text"
                      value={dispatchForm.shipping_line_carrier}
                      onChange={(e) => setDispatchForm(prev => ({ ...prev, shipping_line_carrier: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label>Departure Date</label>
                    <input
                      type="date"
                      value={dispatchForm.departure_date}
                      onChange={(e) => setDispatchForm(prev => ({ ...prev, departure_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>Estimated Arrival Date (ETA Colombo)</label>
                    <input
                      type="date"
                      value={dispatchForm.estimated_arrival_date}
                      onChange={(e) => setDispatchForm(prev => ({ ...prev, estimated_arrival_date: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label>Customs Clearing & Forwarding Agent</label>
                  <input
                    type="text"
                    value={dispatchForm.customs_clearing_agent}
                    onChange={(e) => setDispatchForm(prev => ({ ...prev, customs_clearing_agent: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setDispatchOrder(null)} className="secondary-button">
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={isSaving}>
                  {isSaving ? 'Saving…' : 'Confirm Dispatch & Open Shipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
