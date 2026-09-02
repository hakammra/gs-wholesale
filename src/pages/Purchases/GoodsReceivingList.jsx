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
