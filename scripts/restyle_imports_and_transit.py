import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print(f'Wrote {path}')

# src/components/transit/LandedCostModal.jsx
write_file('src/components/transit/LandedCostModal.jsx', """
import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency } from '../../lib/formatters';

export default function LandedCostModal({ isOpen, onClose, shipmentId }) {
  const { transitShipments, currencies, addLandedCostExpense, bankAccounts } = useBusiness();

  const shipment = transitShipments.find(s => s.id === shipmentId);

  const [form, setForm] = useState({
    expense_type: 'customs_duty',
    payee: 'Sri Lanka Customs',
    currency: 'LKR',
    amount: 125000,
    exchange_rate: 1.0,
    paid_by: 'bank',
    bank_account_id: bankAccounts[0]?.id || '',
    reference: '',
    notes: 'Import tariff & PAL charge'
  });

  if (!isOpen || !shipment) return null;

  const handleCurrencyChange = (currCode) => {
    const rate = currencies.find(c => c.code === currCode)?.exchange_rate_to_lkr || 1.0;
    setForm(prev => ({
      ...prev,
      currency: currCode,
      exchange_rate: rate
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    addLandedCostExpense(shipmentId, form);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box modal-lg">
        <div className="modal-header">
          <h3>Record Landed Expense for Shipment: {shipment.shipment_no}</h3>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ background: '#242424', padding: 12, border: '1px solid var(--line)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>BILL OF LADING</span>
                <div className="mono font-semibold">{shipment.bill_of_lading_no || 'Pending B/L'}</div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>CARRIER</span>
                <div style={{ fontWeight: 600 }}>{shipment.shipping_line_carrier || '-'}</div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>TOTAL EXPENSES SO FAR</span>
                <div className="mono font-semibold" style={{ color: '#ffca58' }}>
                  {formatCurrency(shipment.total_landed_expenses_lkr || 0)}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label>Expense Category *</label>
                <select
                  value={form.expense_type}
                  onChange={(e) => setForm(prev => ({ ...prev, expense_type: e.target.value }))}
                >
                  <option value="sea_freight">Sea Freight</option>
                  <option value="air_freight">Air Freight</option>
                  <option value="customs_duty">Customs Duty & Tariff</option>
                  <option value="port_demurrage">Port Demurrage / Wharfage</option>
                  <option value="clearing_agent">Clearing Agent Fees</option>
                  <option value="local_transport">Local Transportation / Delivery</option>
                  <option value="insurance">Marine Cargo Insurance</option>
                  <option value="other_landed">Other Landed Expense</option>
                </select>
              </div>

              <div>
                <label>Payee / Vendor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sri Lanka Customs, Maersk, C&F Agent"
                  value={form.payee}
                  onChange={(e) => setForm(prev => ({ ...prev, payee: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 140px', gap: 12 }}>
              <div>
                <label>Currency</label>
                <select
                  value={form.currency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                >
                  {currencies.map(c => (
                    <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="mono"
                  value={form.amount}
                  onChange={(e) => setForm(prev => ({ ...prev, amount: Number(e.target.value) || 0 }))}
                />
              </div>

              <div>
                <label>Exchange Rate</label>
                <input
                  type="number"
                  step="0.0001"
                  className="mono"
                  value={form.exchange_rate}
                  onChange={(e) => setForm(prev => ({ ...prev, exchange_rate: Number(e.target.value) || 1 }))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label>Payment Source Account</label>
                <select
                  value={form.bank_account_id}
                  onChange={(e) => setForm(prev => ({ ...prev, bank_account_id: e.target.value }))}
                >
                  {bankAccounts.map(b => (
                    <option key={b.id} value={b.id}>{b.account_name} ({formatCurrency(b.current_balance)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Invoice / Receipt Reference</label>
                <input
                  type="text"
                  placeholder="e.g. CUS-INV-998811"
                  value={form.reference}
                  onChange={(e) => setForm(prev => ({ ...prev, reference: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="secondary-button">
              Cancel
            </button>
            <button type="submit" className="primary-button">
              Post Landed Expense & Allocate Cost
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
""")

# src/pages/SupplierOrders/SupplierOrderList.jsx
write_file('src/pages/SupplierOrders/SupplierOrderList.jsx', """
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

  const [orderForm, setOrderForm] = useState({
    supplier_id: suppliers[0]?.id || '',
    currency: 'USD',
    exchange_rate_snapshot: 305.5,
    incoterm: 'FOB',
    port_of_loading: 'Shenzhen, China',
    destination_port: 'Colombo, Sri Lanka',
    notes: '',
    items: [
      { product_id: products[0]?.id || '', ordered_qty: 100, foreign_unit_cost: 14.5 }
    ]
  });

  const [dispatchForm, setDispatchForm] = useState({
    bill_of_lading_no: '',
    shipping_line_carrier: 'Maersk Line',
    vessel_name: '',
    origin_country: 'China',
    departure_port: 'Shenzhen',
    destination_port: 'Colombo Port',
    departure_date: new Date().toISOString().slice(0, 10),
    estimated_arrival_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    customs_clearing_agent: 'Lanka Logistics (Pvt) Ltd'
  });

  const handleAddItem = () => {
    setOrderForm(prev => ({
      ...prev,
      items: [...prev.items, { product_id: products[0]?.id || '', ordered_qty: 50, foreign_unit_cost: 10 }]
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

  const handleSaveOrder = (e) => {
    e.preventDefault();
    createSupplierOrder(orderForm);
    notifySuccess('Supplier Purchase Order issued successfully');
    setIsNewOrderOpen(false);
  };

  const handleConfirmDispatch = (e) => {
    e.preventDefault();
    if (!dispatchOrder) return;

    createTransitShipment({
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
                <button type="submit" className="primary-button">
                  Issue Supplier Order
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
                <button type="submit" className="primary-button">
                  Confirm Dispatch & Open Shipment
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

# src/pages/StockInTransit/TransitShipmentList.jsx
write_file('src/pages/StockInTransit/TransitShipmentList.jsx', """
import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency, formatDate } from '../../lib/formatters';
import LandedCostModal from '../../components/transit/LandedCostModal';

export default function TransitShipmentList({ onNavigateTab }) {
  const { transitShipments, suppliers, products } = useBusiness();

  const [activeShipmentForCost, setActiveShipmentForCost] = useState(null);
  const [selectedShipmentId, setSelectedShipmentId] = useState(transitShipments[0]?.id || null);

  const selectedShipment = transitShipments.find(s => s.id === selectedShipmentId) || transitShipments[0];

  return (
    <div>
      {/* Action Toolbar */}
      <div className="action-toolbar">
        {selectedShipment && selectedShipment.status !== 'received' && (
          <>
            <button
              onClick={() => setActiveShipmentForCost(selectedShipment.id)}
              className="toolbar-button bright"
            >
              <span className="icon">+$</span>
              <span>Add Landed Expense</span>
            </button>

            <button
              onClick={() => onNavigateTab('purchases')}
              className="toolbar-button bright"
            >
              <span className="icon">▣</span>
              <span>Receive GRN</span>
            </button>
          </>
        )}
      </div>

      {/* Split Panels: Upper Shipments Table & Lower Cost Allocation Breakdown */}
      <div className="split-panel">
        <div className="large-table">
          <table>
            <thead>
              <tr>
                <th>Shipment #</th>
                <th>Bill of Lading</th>
                <th>Supplier</th>
                <th>Carrier</th>
                <th>ETA Port</th>
                <th>Foreign Value</th>
                <th>Landed Expenses (LKR)</th>
                <th>Total Cost (LKR)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transitShipments.map(shp => {
                const sup = suppliers.find(s => s.id === shp.supplier_id);
                const isSelected = selectedShipment?.id === shp.id;

                return (
                  <tr
                    key={shp.id}
                    onClick={() => setSelectedShipmentId(shp.id)}
                    className={isSelected ? 'selected-row' : ''}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="mono font-semibold" style={{ color: 'var(--primary)' }}>{shp.shipment_no}</td>
                    <td className="mono">{shp.bill_of_lading_no || '-'}</td>
                    <td style={{ fontWeight: 700 }}>{sup?.name || 'Supplier'}</td>
                    <td>{shp.shipping_line_carrier}</td>
                    <td>{formatDate(shp.estimated_arrival_date)}</td>
                    <td className="mono font-semibold">{shp.currency} {shp.foreign_items_subtotal?.toLocaleString()}</td>
                    <td className="mono font-semibold" style={{ color: '#ffca58' }}>
                      {formatCurrency(shp.total_landed_expenses_lkr)}
                    </td>
                    <td className="mono font-semibold">{formatCurrency(shp.total_estimated_cost_lkr)}</td>
                    <td>
                      <span className={`badge badge-${shp.status === 'received' ? 'success' : 'primary'}`}>
                        {shp.status?.toUpperCase().replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {transitShipments.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', color: 'var(--muted)', padding: 30 }}>
                    No shipments currently in transit.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Split Divider */}
        <div className="split-divider">
          {selectedShipment ? `Shipment Items & Landed Cost Breakdown: ${selectedShipment.shipment_no}` : 'Shipment Breakdown'}
        </div>

        {/* Lower Panel: Landed Cost Allocation per Item */}
        <div className="item-table">
          {selectedShipment ? (
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Shipped Qty</th>
                  <th>Foreign Unit Cost</th>
                  <th>Foreign Cost (LKR)</th>
                  <th>Allocated Landed / Unit</th>
                  <th>Final Landed Unit Cost (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {(selectedShipment.items || []).map((it, idx) => {
                  const prod = products.find(p => p.id === it.product_id);
                  const foreignLkr = (it.foreign_unit_cost || 0) * (selectedShipment.exchange_rate_snapshot || 305.5);

                  return (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700 }}>{prod?.name || it.product_id}</td>
                      <td className="mono">{it.shipped_qty} Units</td>
                      <td className="mono">{selectedShipment.currency} {it.foreign_unit_cost?.toFixed(2)}</td>
                      <td className="mono">{formatCurrency(foreignLkr)}</td>
                      <td className="mono" style={{ color: '#ffca58' }}>+ {formatCurrency(it.allocated_landed_lkr_per_unit || 0)}</td>
                      <td className="mono font-semibold" style={{ color: '#52e37e' }}>{formatCurrency(it.final_landed_unit_cost_lkr || foreignLkr)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>
              Select a shipment above to view allocated landed cost per item.
            </div>
          )}
        </div>
      </div>

      {/* Landed Cost Expense Modal */}
      {activeShipmentForCost && (
        <LandedCostModal
          isOpen={true}
          onClose={() => setActiveShipmentForCost(null)}
          shipmentId={activeShipmentForCost}
        />
      )}
    </div>
  );
}
""")

# src/pages/Purchases/GoodsReceivingList.jsx
write_file('src/pages/Purchases/GoodsReceivingList.jsx', """
import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency, formatDate } from '../../lib/formatters';

export default function GoodsReceivingList() {
  const { purchases, transitShipments, products, supplierAdvances, receivePurchaseShipment } = useBusiness();
  const { notifySuccess } = useNotification();

  const [isReceivingOpen, setIsReceivingOpen] = useState(false);
  const [selectedShipmentId, setSelectedShipmentId] = useState(transitShipments.find(s => s.status === 'in_transit')?.id || '');
  const [receivingItems, setReceivingItems] = useState([]);
  const [selectedAdvanceIds, setSelectedAdvanceIds] = useState([]);
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));

  const activeShipment = transitShipments.find(s => s.id === selectedShipmentId);
  const availableAdvances = supplierAdvances.filter(a => a.supplier_id === activeShipment?.supplier_id && a.unallocated_lkr_amount > 0);

  const handleOpenReceive = () => {
    const shp = transitShipments.find(s => s.status === 'in_transit') || transitShipments[0];
    if (shp) {
      setSelectedShipmentId(shp.id);
      setReceivingItems(shp.items.map(it => ({
        product_id: it.product_id,
        shipped_qty: it.shipped_qty,
        received_sellable_qty: it.shipped_qty,
        damaged_qty: 0,
        missing_qty: 0,
        foreign_unit_cost: it.foreign_unit_cost,
        allocated_landed_lkr_per_unit: it.allocated_landed_lkr_per_unit || 0,
        final_landed_unit_cost_lkr: it.final_landed_unit_cost_lkr || (it.foreign_unit_cost * (shp.exchange_rate_snapshot || 305.5))
      })));
    }
    setIsReceivingOpen(true);
  };

  const handleShipmentSelect = (shpId) => {
    setSelectedShipmentId(shpId);
    const shp = transitShipments.find(s => s.id === shpId);
    if (shp) {
      setReceivingItems(shp.items.map(it => ({
        product_id: it.product_id,
        shipped_qty: it.shipped_qty,
        received_sellable_qty: it.shipped_qty,
        damaged_qty: 0,
        missing_qty: 0,
        foreign_unit_cost: it.foreign_unit_cost,
        allocated_landed_lkr_per_unit: it.allocated_landed_lkr_per_unit || 0,
        final_landed_unit_cost_lkr: it.final_landed_unit_cost_lkr || (it.foreign_unit_cost * (shp.exchange_rate_snapshot || 305.5))
      })));
    }
  };

  const handleToggleAdvance = (advId) => {
    setSelectedAdvanceIds(prev => prev.includes(advId) ? prev.filter(x => x !== advId) : [...prev, advId]);
  };

  const handleSubmitGRN = (e) => {
    e.preventDefault();
    if (!selectedShipmentId) return;

    receivePurchaseShipment({
      transit_shipment_id: selectedShipmentId,
      receipt_date: receiptDate,
      items: receivingItems,
      advance_ids_to_apply: selectedAdvanceIds,
      notes: 'GRN received into warehouse sellable stock'
    });

    notifySuccess('Goods Received Note (GRN) created & Weighted Average Costs updated!');
    setIsReceivingOpen(false);
  };

  return (
    <div>
      {/* Action Toolbar */}
      <div className="action-toolbar">
        <button onClick={handleOpenReceive} className="toolbar-button bright">
          <span className="icon">▣</span>
          <span>Receive Shipment / GRN</span>
        </button>
      </div>

      {/* Purchases GRN Table */}
      <div className="panel-card" style={{ borderTop: 0, padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>GRN #</th>
              <th>Date</th>
              <th>Supplier</th>
              <th>Foreign Total</th>
              <th>Landed Costs (LKR)</th>
              <th>Total Landed (LKR)</th>
              <th>Advance Applied</th>
              <th>Net Payable (LKR)</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map(grn => (
              <tr key={grn.id}>
                <td className="mono font-semibold" style={{ color: 'var(--primary)' }}>{grn.grn_no}</td>
                <td>{formatDate(grn.receipt_date)}</td>
                <td style={{ fontWeight: 700 }}>{grn.supplier_name}</td>
                <td className="mono">{grn.currency} {grn.foreign_subtotal?.toLocaleString()}</td>
                <td className="mono" style={{ color: '#ffca58' }}>{formatCurrency(grn.landed_expenses_lkr_total)}</td>
                <td className="mono font-semibold">{formatCurrency(grn.total_landed_lkr)}</td>
                <td className="mono" style={{ color: '#52e37e' }}>- {formatCurrency(grn.advance_applied_lkr || 0)}</td>
                <td className="mono" style={{ color: grn.remaining_payable_lkr > 0 ? '#ff8e8e' : 'inherit', fontWeight: 700 }}>
                  {formatCurrency(grn.remaining_payable_lkr)}
                </td>
              </tr>
            ))}

            {purchases.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', color: 'var(--muted)', padding: 30 }}>
                  No Goods Received Notes (GRN) recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Receive GRN Modal */}
      {isReceivingOpen && (
        <div className="modal-overlay">
          <div className="modal-box modal-lg">
            <div className="modal-header">
              <h3>Process Goods Received Note (GRN) & Stock Entry</h3>
              <button onClick={() => setIsReceivingOpen(false)} className="modal-close">&times;</button>
            </div>

            <form onSubmit={handleSubmitGRN}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 12 }}>
                  <div>
                    <label>Select In-Transit Shipment</label>
                    <select
                      value={selectedShipmentId}
                      onChange={(e) => handleShipmentSelect(e.target.value)}
                    >
                      {transitShipments.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.shipment_no} - {s.bill_of_lading_no || 'No BL'} ({s.status?.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Receipt Date</label>
                    <input
                      type="date"
                      value={receiptDate}
                      onChange={(e) => setReceiptDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Quality & Qty Inspection */}
                <div>
                  <label style={{ marginBottom: 6 }}>ITEM QUALITY & QUANTITY INSPECTION</label>
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th style={{ width: 90 }}>Shipped</th>
                        <th style={{ width: 100 }}>Sellable Qty</th>
                        <th style={{ width: 100 }}>Damaged Qty</th>
                        <th style={{ width: 140, textAlign: 'right' }}>Final Landed Cost/Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receivingItems.map((item, idx) => {
                        const prod = products.find(p => p.id === item.product_id);
                        return (
                          <tr key={idx}>
                            <td style={{ fontWeight: 700 }}>{prod?.name || item.product_id}</td>
                            <td className="mono">{item.shipped_qty}</td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                className="mono"
                                value={item.received_sellable_qty}
                                onChange={(e) => setReceivingItems(prev => prev.map((x, i) => i === idx ? { ...x, received_sellable_qty: Number(e.target.value) || 0 } : x))}
                                style={{ width: 85, fontWeight: 700 }}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                className="mono"
                                value={item.damaged_qty}
                                onChange={(e) => setReceivingItems(prev => prev.map((x, i) => i === idx ? { ...x, damaged_qty: Number(e.target.value) || 0 } : x))}
                                style={{ width: 85, color: '#ff8e8e' }}
                              />
                            </td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                              {formatCurrency(item.final_landed_unit_cost_lkr)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Supplier Advances Application */}
                {availableAdvances.length > 0 && (
                  <div style={{ background: '#242424', padding: 12, border: '1px solid var(--line)' }}>
                    <label style={{ marginBottom: 6 }}>APPLY SUPPLIER PRE-PAYMENT ADVANCES</label>
                    {availableAdvances.map(adv => (
                      <label key={adv.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 500 }}>
                        <input
                          type="checkbox"
                          checked={selectedAdvanceIds.includes(adv.id)}
                          onChange={() => handleToggleAdvance(adv.id)}
                          style={{ width: 'auto' }}
                        />
                        <span>
                          {adv.advance_no} &bull; Available: <strong>{formatCurrency(adv.unallocated_lkr_amount)}</strong> ({adv.currency} {adv.foreign_amount})
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsReceivingOpen(false)} className="secondary-button">
                  Cancel
                </button>
                <button type="submit" className="success-button" style={{ fontWeight: 700 }}>
                  Receive into Sellable Stock & Update WAC
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

print("Imports, Transit, and GRN restyled in Shop-POS format.")
