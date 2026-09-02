import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print(f'Wrote {path}')

# src/pages/StockInTransit/TransitShipmentList.jsx
write_file('src/pages/StockInTransit/TransitShipmentList.jsx', """
import React, { useState } from 'react';
import { Ship, Plus, DollarSign, PackageCheck, Eye, Layers } from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency, formatDate } from '../../lib/formatters';
import LandedCostModal from '../../components/transit/LandedCostModal';
import SearchInput from '../../components/common/SearchInput';
import Modal from '../../components/common/Modal';

export default function TransitShipmentList({ onNavigateTab }) {
  const { transitShipments, suppliers, products } = useBusiness();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeShipmentForCost, setActiveShipmentForCost] = useState(null);
  const [viewShipment, setViewShipment] = useState(null);

  const filteredShipments = transitShipments.filter(s => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.shipment_no?.toLowerCase().includes(term) ||
      s.bill_of_lading_no?.toLowerCase().includes(term) ||
      s.shipping_line_carrier?.toLowerCase().includes(term)
    );
  });

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ maxWidth: 360, flex: 1 }}>
          <SearchInput
            placeholder="Search shipment number, B/L, carrier..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          * Items in transit are tracked separately and do not enter sellable stock until GRN is processed.
        </div>
      </div>

      {/* Shipments Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Shipment #</th>
                <th>B/L Number</th>
                <th>Supplier</th>
                <th>Carrier / Vessel</th>
                <th>ETA</th>
                <th>Foreign Value</th>
                <th>Landed Expenses</th>
                <th>Total Cost (LKR)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredShipments.map(shp => {
                const sup = suppliers.find(s => s.id === shp.supplier_id);

                return (
                  <tr key={shp.id}>
                    <td className="mono font-semibold" style={{ color: '#38bdf8' }}>{shp.shipment_no}</td>
                    <td className="mono">{shp.bill_of_lading_no || '-'}</td>
                    <td style={{ fontWeight: 700 }}>{sup?.name || 'Supplier'}</td>
                    <td>{shp.shipping_line_carrier} {shp.vessel_name ? `(${shp.vessel_name})` : ''}</td>
                    <td>{formatDate(shp.estimated_arrival_date)}</td>
                    <td className="mono font-semibold">{shp.currency} {shp.foreign_items_subtotal?.toLocaleString()}</td>
                    <td className="mono font-semibold" style={{ color: '#fbbf24' }}>
                      {formatCurrency(shp.total_landed_expenses_lkr)}
                    </td>
                    <td className="mono font-semibold">{formatCurrency(shp.total_estimated_cost_lkr)}</td>
                    <td>
                      <span className={`badge badge-${shp.status === 'received' ? 'success' : 'primary'}`}>
                        {shp.status?.toUpperCase().replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setViewShipment(shp)} className="btn btn-secondary btn-sm">
                          <Eye size={14} /> View
                        </button>
                        {shp.status !== 'received' && (
                          <>
                            <button
                              onClick={() => setActiveShipmentForCost(shp.id)}
                              className="btn btn-secondary btn-sm"
                              style={{ gap: 4 }}
                            >
                              <DollarSign size={14} /> + Expense
                            </button>
                            <button
                              onClick={() => onNavigateTab('purchases')}
                              className="btn btn-success btn-sm"
                              style={{ gap: 4 }}
                            >
                              <PackageCheck size={14} /> Receive GRN
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredShipments.length === 0 && (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 40 }}>
                    No shipments currently in transit. Dispatch an order from Supplier Orders tab.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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

      {/* Shipment Details & Landed Cost Breakdown Modal */}
      {viewShipment && (
        <Modal
          isOpen={true}
          onClose={() => setViewShipment(null)}
          title={`Shipment Details: ${viewShipment.shipment_no}`}
          size="lg"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, background: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-sm)' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>BILL OF LADING</div>
                <div className="mono font-semibold">{viewShipment.bill_of_lading_no}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>ETA PORT</div>
                <div style={{ fontWeight: 700 }}>{formatDate(viewShipment.estimated_arrival_date)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>EXCHANGE RATE</div>
                <div className="mono font-semibold">Rs. {viewShipment.exchange_rate_snapshot?.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>TOTAL LANDED COST</div>
                <div className="mono font-semibold" style={{ color: '#38bdf8' }}>{formatCurrency(viewShipment.total_estimated_cost_lkr)}</div>
              </div>
            </div>

            <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Items in Shipment & Landed Cost Breakdown</h4>
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Shipped Qty</th>
                  <th>Foreign Unit Cost</th>
                  <th>Foreign Cost (LKR)</th>
                  <th>Allocated Landed / Unit</th>
                  <th>Final Landed Cost / Unit</th>
                </tr>
              </thead>
              <tbody>
                {(viewShipment.items || []).map((it, idx) => {
                  const prod = products.find(p => p.id === it.product_id);
                  const foreignLkr = (it.foreign_unit_cost || 0) * (viewShipment.exchange_rate_snapshot || 305.5);

                  return (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700 }}>{prod?.name || it.product_id}</td>
                      <td>{it.shipped_qty} Units</td>
                      <td className="mono">{viewShipment.currency} {it.foreign_unit_cost?.toFixed(2)}</td>
                      <td className="mono">{formatCurrency(foreignLkr)}</td>
                      <td className="mono" style={{ color: '#fbbf24' }}>+ {formatCurrency(it.allocated_landed_lkr_per_unit || 0)}</td>
                      <td className="mono font-semibold" style={{ color: '#34d399' }}>{formatCurrency(it.final_landed_unit_cost_lkr || foreignLkr)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {viewShipment.landed_costs && viewShipment.landed_costs.length > 0 && (
              <>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginTop: 8 }}>Recorded Landed Expenses</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {viewShipment.landed_costs.map((c, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', fontSize: 12.5 }}>
                      <span>{c.expense_type?.toUpperCase().replace('_', ' ')} &bull; {c.payee || 'Vendor'}</span>
                      <span className="mono font-semibold">{formatCurrency(c.lkr_amount)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
""")

# src/pages/Purchases/GoodsReceivingList.jsx
write_file('src/pages/Purchases/GoodsReceivingList.jsx', """
import React, { useState } from 'react';
import { PackageCheck, Plus, Eye, DollarSign, CheckCircle2 } from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency, formatDate } from '../../lib/formatters';
import SearchInput from '../../components/common/SearchInput';
import Modal from '../../components/common/Modal';

export default function GoodsReceivingList() {
  const { 
    purchases, transitShipments, suppliers, products, 
    supplierAdvances, receivePurchaseShipment 
  } = useBusiness();
  const [searchTerm, setSearchTerm] = useState('');
  const [isReceivingOpen, setIsReceivingOpen] = useState(false);
  const [viewGrn, setViewGrn] = useState(null);

  // Receiving Form state
  const [selectedShipmentId, setSelectedShipmentId] = useState(transitShipments.find(s => s.status === 'in_transit')?.id || '');
  const [receivingItems, setReceivingItems] = useState([]);
  const [selectedAdvanceIds, setSelectedAdvanceIds] = useState([]);
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));
  const [grnNotes, setGrnNotes] = useState('');

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

  const handleUpdateItemQty = (index, field, value) => {
    setReceivingItems(prev => prev.map((it, i) => i === index ? { ...it, [field]: Number(value) || 0 } : it));
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
      notes: grnNotes
    });

    setIsReceivingOpen(false);
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ maxWidth: 360, flex: 1 }}>
          <SearchInput
            placeholder="Search GRN #, supplier..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>
        <button onClick={handleOpenReceive} className="btn btn-primary" style={{ gap: 6 }}>
          <PackageCheck size={16} />
          <span>Receive Shipment / Create GRN</span>
        </button>
      </div>

      {/* Purchases Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>GRN #</th>
                <th>Date</th>
                <th>Supplier</th>
                <th>Foreign Subtotal</th>
                <th>Landed Costs (LKR)</th>
                <th>Total Value (LKR)</th>
                <th>Advances Applied</th>
                <th>Net Payable (LKR)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map(grn => (
                <tr key={grn.id}>
                  <td className="mono font-semibold" style={{ color: '#38bdf8' }}>{grn.grn_no}</td>
                  <td>{formatDate(grn.receipt_date)}</td>
                  <td style={{ fontWeight: 700 }}>{grn.supplier_name}</td>
                  <td className="mono font-semibold">{grn.currency} {grn.foreign_subtotal?.toLocaleString()}</td>
                  <td className="mono" style={{ color: '#fbbf24' }}>{formatCurrency(grn.landed_expenses_lkr_total)}</td>
                  <td className="mono font-semibold">{formatCurrency(grn.total_landed_lkr)}</td>
                  <td className="mono" style={{ color: '#34d399' }}>- {formatCurrency(grn.advance_applied_lkr || 0)}</td>
                  <td className="mono font-semibold" style={{ color: grn.remaining_payable_lkr > 0 ? '#f87171' : 'inherit' }}>
                    {formatCurrency(grn.remaining_payable_lkr)}
                  </td>
                  <td>
                    <button onClick={() => setViewGrn(grn)} className="btn btn-secondary btn-sm">
                      <Eye size={14} /> View
                    </button>
                  </td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 40 }}>
                    No Goods Received Notes (GRN) created yet. Click Receive Shipment above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receive GRN Modal */}
      {isReceivingOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsReceivingOpen(false)}
          title="Process Goods Received Note (GRN) & Stock Entry"
          size="lg"
          footer={
            <>
              <button onClick={() => setIsReceivingOpen(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSubmitGRN} className="btn btn-success btn-lg" style={{ fontWeight: 800 }}>
                Receive into Available Stock & Update WAC
              </button>
            </>
          }
        >
          <form onSubmit={handleSubmitGRN} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Select In-Transit Shipment</label>
                <select
                  className="form-select"
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

              <div className="form-group">
                <label className="form-label">Receipt Date</label>
                <input
                  type="date"
                  className="form-input mono"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                />
              </div>
            </div>

            {/* Item Inspection Table */}
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                Item Quality & Quantity Inspection (Sellable vs Damaged)
              </h4>
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Shipped</th>
                    <th>Sellable Qty</th>
                    <th>Damaged Qty</th>
                    <th>Final Landed Cost/Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {receivingItems.map((item, idx) => {
                    const prod = products.find(p => p.id === item.product_id);

                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700 }}>{prod?.name || item.product_id}</td>
                        <td>{item.shipped_qty}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            className="form-input mono"
                            value={item.received_sellable_qty}
                            onChange={(e) => handleUpdateItemQty(idx, 'received_sellable_qty', e.target.value)}
                            style={{ width: 90, fontWeight: 700 }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            className="form-input mono"
                            value={item.damaged_qty}
                            onChange={(e) => handleUpdateItemQty(idx, 'damaged_qty', e.target.value)}
                            style={{ width: 80, color: '#f87171' }}
                          />
                        </td>
                        <td className="mono font-semibold" style={{ color: '#38bdf8' }}>
                          {formatCurrency(item.final_landed_unit_cost_lkr)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Advance Allocation Section */}
            {availableAdvances.length > 0 && (
              <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                  Apply Available Supplier Advances
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {availableAdvances.map(adv => (
                    <label key={adv.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedAdvanceIds.includes(adv.id)}
                        onChange={() => handleToggleAdvance(adv.id)}
                      />
                      <span>
                        {adv.advance_no} &bull; Available: <strong>{formatCurrency(adv.unallocated_lkr_amount)}</strong> ({adv.currency} {adv.foreign_amount})
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </form>
        </Modal>
      )}

      {/* View GRN Modal */}
      {viewGrn && (
        <Modal
          isOpen={true}
          onClose={() => setViewGrn(null)}
          title={`GRN Details: ${viewGrn.grn_no}`}
          size="lg"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, background: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-sm)' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>SUPPLIER</div>
                <div style={{ fontWeight: 700 }}>{viewGrn.supplier_name}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>DATE</div>
                <div style={{ fontWeight: 700 }}>{formatDate(viewGrn.receipt_date)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>TOTAL LANDED COST</div>
                <div className="mono font-semibold" style={{ color: '#38bdf8' }}>{formatCurrency(viewGrn.total_landed_lkr)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>ADVANCE APPLIED</div>
                <div className="mono font-semibold" style={{ color: '#34d399' }}>{formatCurrency(viewGrn.advance_applied_lkr || 0)}</div>
              </div>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Sellable Qty</th>
                  <th>Damaged Qty</th>
                  <th>Landed Unit Cost</th>
                </tr>
              </thead>
              <tbody>
                {(viewGrn.items || []).map((it, idx) => {
                  const prod = products.find(p => p.id === it.product_id);
                  return (
                    <tr key={idx}>
                      <td>{prod?.name || it.product_id}</td>
                      <td className="mono font-semibold">{it.received_sellable_qty} Units</td>
                      <td className="mono" style={{ color: it.damaged_qty > 0 ? '#f87171' : 'inherit' }}>{it.damaged_qty}</td>
                      <td className="mono font-semibold">{formatCurrency(it.final_landed_unit_cost_lkr)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}
""")

# src/pages/Products/ProductList.jsx
write_file('src/pages/Products/ProductList.jsx', """
import React, { useState } from 'react';
import { Boxes, Plus, Edit, Layers, Download, Upload, Search } from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency } from '../../lib/formatters';
import { exportToExcel } from '../../lib/exportUtils';
import SearchInput from '../../components/common/SearchInput';
import Modal from '../../components/common/Modal';

export default function ProductList() {
  const { products, saveProduct, categories, brands, stockBalances } = useBusiness();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);

  const filteredProducts = products.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.name?.toLowerCase().includes(term) ||
      p.item_code?.toLowerCase().includes(term) ||
      p.barcode?.includes(term) ||
      p.model?.toLowerCase().includes(term)
    );
  });

  const handleExport = () => {
    const data = products.map(p => {
      const stock = stockBalances[p.id] || { qty_on_hand: 0, qty_available: 0 };
      return {
        'Item Code': p.item_code,
        'Barcode': p.barcode || '',
        'Product Name': p.name,
        'Model': p.model || '',
        'Wholesale Price (LKR)': p.wholesale_price,
        'Dealer Price (LKR)': p.dealer_price || 0,
        'Weighted Cost (LKR)': p.weighted_cost_lkr,
        'Pack Size': p.pack_size || 1,
        'Carton Units': p.carton_units || 1,
        'Available Stock': stock.qty_available,
        'On Hand Stock': stock.qty_on_hand
      };
    });
    exportToExcel(data, 'GS_Wholesale_Products');
  };

  const handleSave = (e) => {
    e.preventDefault();
    saveProduct(editingProduct);
    setEditingProduct(null);
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ maxWidth: 360, flex: 1 }}>
          <SearchInput
            placeholder="Search item code, barcode, name..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleExport} className="btn btn-secondary" style={{ gap: 6 }}>
            <Download size={15} />
            <span>Export Excel</span>
          </button>
          <button
            onClick={() => setEditingProduct({
              name: '', item_code: '', barcode: '', model: '', brand_id: brands[0]?.id || '',
              category_id: categories[0]?.id || '', unit_name: 'Unit', pack_size: 10, carton_units: 100,
              wholesale_price: 5000, dealer_price: 4800, weighted_cost_lkr: 4000, low_stock_threshold: 10,
              quantity_breaks: []
            })}
            className="btn btn-primary"
            style={{ gap: 6 }}
          >
            <Plus size={16} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Product Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Code / Barcode</th>
                <th>Product Name</th>
                <th>Pack / Carton</th>
                <th>Weighted Cost</th>
                <th>Wholesale Price</th>
                <th>Dealer Price</th>
                <th>Margin</th>
                <th>Available</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => {
                const stock = stockBalances[p.id] || { qty_available: 0 };
                const cost = p.weighted_cost_lkr || 0;
                const margin = p.wholesale_price > 0 ? (((p.wholesale_price - cost) / p.wholesale_price) * 100).toFixed(1) : 0;

                return (
                  <tr key={p.id}>
                    <td>
                      <div className="mono font-semibold" style={{ color: '#38bdf8' }}>{p.item_code}</div>
                      {p.barcode && <div className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>{p.barcode}</div>}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      {p.model && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Model: {p.model}</div>}
                    </td>
                    <td>
                      <span className="badge badge-neutral">Pk: {p.pack_size || 1} &bull; Ctn: {p.carton_units || 1}</span>
                    </td>
                    <td className="mono">{formatCurrency(cost)}</td>
                    <td className="mono font-semibold" style={{ color: '#38bdf8' }}>{formatCurrency(p.wholesale_price)}</td>
                    <td className="mono">{formatCurrency(p.dealer_price || 0)}</td>
                    <td className="mono font-semibold" style={{ color: margin >= 5 ? '#34d399' : '#fbbf24' }}>
                      {margin}%
                    </td>
                    <td className="mono font-semibold" style={{ color: stock.qty_available > 10 ? '#34d399' : stock.qty_available > 0 ? '#fbbf24' : '#f87171' }}>
                      {stock.qty_available} {p.unit_name || 'Units'}
                    </td>
                    <td>
                      <button onClick={() => setEditingProduct(p)} className="btn btn-secondary btn-sm">
                        <Edit size={14} /> Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <Modal
          isOpen={true}
          onClose={() => setEditingProduct(null)}
          title={editingProduct.id ? `Edit Product: ${editingProduct.item_code}` : 'Add Wholesale Product'}
          size="lg"
          footer={
            <>
              <button onClick={() => setEditingProduct(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn btn-primary">Save Product</button>
            </>
          }
        >
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Item Code / SKU</label>
                <input
                  type="text"
                  className="form-input mono"
                  value={editingProduct.item_code}
                  onChange={(e) => setEditingProduct(prev => ({ ...prev, item_code: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Barcode</label>
                <input
                  type="text"
                  className="form-input mono"
                  value={editingProduct.barcode}
                  onChange={(e) => setEditingProduct(prev => ({ ...prev, barcode: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={editingProduct.category_id}
                  onChange={(e) => setEditingProduct(prev => ({ ...prev, category_id: e.target.value }))}
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Brand</label>
                <select
                  className="form-select"
                  value={editingProduct.brand_id}
                  onChange={(e) => setEditingProduct(prev => ({ ...prev, brand_id: e.target.value }))}
                >
                  {brands.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Model / Specs</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingProduct.model}
                  onChange={(e) => setEditingProduct(prev => ({ ...prev, model: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Wholesale Price (Rs.) *</label>
                <input
                  type="number"
                  required
                  className="form-input mono"
                  value={editingProduct.wholesale_price}
                  onChange={(e) => setEditingProduct(prev => ({ ...prev, wholesale_price: Number(e.target.value) || 0 }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Dealer Price (Rs.)</label>
                <input
                  type="number"
                  className="form-input mono"
                  value={editingProduct.dealer_price}
                  onChange={(e) => setEditingProduct(prev => ({ ...prev, dealer_price: Number(e.target.value) || 0 }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Weighted Cost (Rs.)</label>
                <input
                  type="number"
                  className="form-input mono"
                  value={editingProduct.weighted_cost_lkr}
                  onChange={(e) => setEditingProduct(prev => ({ ...prev, weighted_cost_lkr: Number(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Pack Size (Units)</label>
                <input
                  type="number"
                  className="form-input mono"
                  value={editingProduct.pack_size}
                  onChange={(e) => setEditingProduct(prev => ({ ...prev, pack_size: Number(e.target.value) || 1 }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Carton Units</label>
                <input
                  type="number"
                  className="form-input mono"
                  value={editingProduct.carton_units}
                  onChange={(e) => setEditingProduct(prev => ({ ...prev, carton_units: Number(e.target.value) || 1 }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Low Stock Threshold</label>
                <input
                  type="number"
                  className="form-input mono"
                  value={editingProduct.low_stock_threshold}
                  onChange={(e) => setEditingProduct(prev => ({ ...prev, low_stock_threshold: Number(e.target.value) || 10 }))}
                />
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
""")

# src/pages/Inventory/InventoryStockList.jsx
write_file('src/pages/Inventory/InventoryStockList.jsx', """
import React, { useState } from 'react';
import { Layers, History, TrendingDown, ArrowUpDown, Download } from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { exportToExcel } from '../../lib/exportUtils';
import SearchInput from '../../components/common/SearchInput';
import Modal from '../../components/common/Modal';

export default function InventoryStockList() {
  const { products, stockBalances, stockMovements } = useBusiness();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductMovements, setSelectedProductMovements] = useState(null);

  const filteredProducts = products.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.name?.toLowerCase().includes(term) ||
      p.item_code?.toLowerCase().includes(term) ||
      p.model?.toLowerCase().includes(term)
    );
  });

  const totalOnHandValue = products.reduce((sum, p) => {
    const stock = stockBalances[p.id] || { qty_on_hand: 0 };
    return sum + (stock.qty_on_hand * (p.weighted_cost_lkr || 0));
  }, 0);

  const handleExport = () => {
    const data = products.map(p => {
      const stock = stockBalances[p.id] || { qty_on_hand: 0, qty_available: 0, qty_reserved: 0, qty_in_transit: 0, qty_damaged: 0 };
      return {
        'Code': p.item_code,
        'Name': p.name,
        'On Hand': stock.qty_on_hand,
        'Reserved': stock.qty_reserved,
        'Available': stock.qty_available,
        'In Transit': stock.qty_in_transit,
        'Damaged': stock.qty_damaged,
        'Weighted Cost (LKR)': p.weighted_cost_lkr,
        'Total Valuation (LKR)': stock.qty_on_hand * (p.weighted_cost_lkr || 0)
      };
    });
    exportToExcel(data, 'GS_Wholesale_Inventory_Valuation');
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ maxWidth: 360, flex: 1 }}>
          <SearchInput
            placeholder="Search stock by code, name..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ background: 'var(--panel)', padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Inventory Asset Valuation: </span>
            <span className="mono font-semibold" style={{ color: '#38bdf8', fontSize: 15 }}>{formatCurrency(totalOnHandValue)}</span>
          </div>
          <button onClick={handleExport} className="btn btn-secondary" style={{ gap: 6 }}>
            <Download size={15} />
            <span>Export Stock</span>
          </button>
        </div>
      </div>

      {/* Stock Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Product Description</th>
                <th>On Hand</th>
                <th>Reserved</th>
                <th>Available</th>
                <th>In Transit</th>
                <th>Damaged</th>
                <th>Weighted Cost</th>
                <th>Valuation (LKR)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => {
                const stock = stockBalances[p.id] || { qty_on_hand: 0, qty_available: 0, qty_reserved: 0, qty_in_transit: 0, qty_damaged: 0 };
                const valuation = stock.qty_on_hand * (p.weighted_cost_lkr || 0);

                return (
                  <tr key={p.id}>
                    <td className="mono font-semibold" style={{ color: '#38bdf8' }}>{p.item_code}</td>
                    <td style={{ fontWeight: 700 }}>{p.name}</td>
                    <td className="mono font-semibold">{stock.qty_on_hand}</td>
                    <td className="mono" style={{ color: stock.qty_reserved > 0 ? '#fbbf24' : 'inherit' }}>{stock.qty_reserved}</td>
                    <td className="mono font-semibold" style={{ color: stock.qty_available > 0 ? '#34d399' : '#f87171' }}>
                      {stock.qty_available}
                    </td>
                    <td className="mono" style={{ color: stock.qty_in_transit > 0 ? '#38bdf8' : 'inherit' }}>{stock.qty_in_transit}</td>
                    <td className="mono" style={{ color: stock.qty_damaged > 0 ? '#f87171' : 'inherit' }}>{stock.qty_damaged}</td>
                    <td className="mono">{formatCurrency(p.weighted_cost_lkr)}</td>
                    <td className="mono font-semibold">{formatCurrency(valuation)}</td>
                    <td>
                      <button
                        onClick={() => setSelectedProductMovements(p)}
                        className="btn btn-secondary btn-sm"
                        style={{ gap: 4 }}
                      >
                        <History size={14} /> Ledger
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Movement Ledger Modal */}
      {selectedProductMovements && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedProductMovements(null)}
          title={`Stock Movement Ledger: ${selectedProductMovements.name}`}
          size="lg"
        >
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Movement Type</th>
                  <th>Doc Ref</th>
                  <th>Qty Change</th>
                  <th>Unit Cost Snapshot</th>
                  <th>Balance After</th>
                </tr>
              </thead>
              <tbody>
                {stockMovements
                  .filter(m => m.product_id === selectedProductMovements.id)
                  .map((mv, idx) => (
                    <tr key={idx}>
                      <td>{formatDate(mv.created_at)}</td>
                      <td>
                        <span className="badge badge-neutral">{mv.movement_type?.replace('_', ' ')}</span>
                      </td>
                      <td className="mono">{mv.reference_doc_no || '-'}</td>
                      <td className="mono font-semibold" style={{ color: mv.qty_change > 0 ? '#34d399' : '#f87171' }}>
                        {mv.qty_change > 0 ? `+${mv.qty_change}` : mv.qty_change}
                      </td>
                      <td className="mono">{formatCurrency(mv.unit_cost_snapshot)}</td>
                      <td className="mono font-semibold">{mv.balance_after}</td>
                    </tr>
                  ))}
                {stockMovements.filter(m => m.product_id === selectedProductMovements.id).length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 30 }}>
                      No stock movement audit records yet for this product.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}
""")

print("Pages part C written.")
