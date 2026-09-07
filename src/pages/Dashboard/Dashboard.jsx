import React, { useMemo, useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency, formatDate } from '../../lib/formatters';

const OUTFLOW_TYPES = new Set(['transit_purchase_payment', 'purchase_payment', 'supplier_payment', 'supplier_advance', 'operational_expense', 'expense', 'customer_refund']);
const PENDING_CHEQUE_STATUSES = new Set(['received', 'held', 'deposited']);

const RANGE_PRESETS = [
  ['this_month', 'This Month'], ['last_month', 'Last Month'], ['this_year', 'This Year'],
  ['last_year', 'Last Year'], ['all_time', 'Since Start'], ['custom', 'Custom']
];

const localDateKey = date => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const inDateRange = (value, start, end) => {
  if (!value) return false;
  const date = String(value).slice(0, 10);
  return (!start || date >= start) && (!end || date <= end);
};

export default function Dashboard({ onNavigateTab }) {
  const {
    salesDocuments = [], transitShipments = [],
    products = [], stockBalances = {}, payments = [], purchases = [], cheques = []
  } = useBusiness();

  const today = new Date();
  const [rangePreset, setRangePreset] = useState('this_month');
  const [customStart, setCustomStart] = useState(localDateKey(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [customEnd, setCustomEnd] = useState(localDateKey(today));
  const selectedRange = useMemo(() => {
    const year = today.getFullYear();
    const month = today.getMonth();
    if (rangePreset === 'this_month') return { start: localDateKey(new Date(year, month, 1)), end: localDateKey(today), label: 'This Month' };
    if (rangePreset === 'last_month') return { start: localDateKey(new Date(year, month - 1, 1)), end: localDateKey(new Date(year, month, 0)), label: 'Last Month' };
    if (rangePreset === 'this_year') return { start: `${year}-01-01`, end: localDateKey(today), label: 'This Year' };
    if (rangePreset === 'last_year') return { start: `${year - 1}-01-01`, end: `${year - 1}-12-31`, label: 'Last Year' };
    if (rangePreset === 'all_time') return { start: '', end: localDateKey(today), label: 'Since Start' };
    return { start: customStart, end: customEnd, label: customStart && customEnd ? `${formatDate(customStart)} – ${formatDate(customEnd)}` : 'Custom Range' };
  }, [rangePreset, customStart, customEnd]);

  const rangeSales = salesDocuments.filter(document =>
    document.doc_type === 'sales_invoice' &&
    !['cancelled', 'returned'].includes(document.status) &&
    inDateRange(document.doc_date || document.created_at, selectedRange.start, selectedRange.end)
  );
  const productById = new Map(products.map(product => [String(product.id), product]));
  const profitRows = rangeSales.map(document => {
    const lines = (document.items || []).map(item => {
      const qty = Number(item.base_qty || item.qty) || 0;
      const snapshotUnitCost = Number(item.unit_cost_snapshot) || 0;
      const currentProduct = productById.get(String(item.product_id));
      const currentUnitCost = Number(currentProduct?.weighted_cost_lkr || currentProduct?.cost_price || currentProduct?.cost) || 0;
      const usesCurrentCostFallback = snapshotUnitCost <= 0 && currentUnitCost > 0;
      const effectiveUnitCost = snapshotUnitCost > 0 ? snapshotUnitCost : currentUnitCost;
      return {
        id: item.id || `${document.id}-${item.product_id}`,
        name: item.product_name || item.product?.name || currentProduct?.name || 'Product item',
        qty,
        effectiveUnitCost,
        lineCost: qty * effectiveUnitCost,
        usesCurrentCostFallback,
        isCostMissing: effectiveUnitCost <= 0 && qty > 0
      };
    });
    const storedCost = Number(document.total_cost_snapshot) || 0;
    const calculatedLineCost = lines.reduce((sum, line) => sum + line.lineCost, 0);
    // Old invoices created before cost snapshots were introduced contain zero here.
    // Use current WAC only for those missing lines; valid sale-time snapshots always win.
    const costOfGoods = lines.length ? calculatedLineCost : storedCost;
    const revenue = Number(document.grand_total) || 0;
    return {
      ...document,
      revenue,
      storedCost,
      costOfGoods,
      grossProfit: revenue - costOfGoods,
      lines,
      fallbackLineCount: lines.filter(line => line.usesCurrentCostFallback).length,
      missingCostLineCount: lines.filter(line => line.isCostMissing).length,
      savedCostDiffers: lines.length > 0 && Math.abs(storedCost - costOfGoods) > 0.01
    };
  }).sort((a, b) => new Date(b.doc_date || b.created_at) - new Date(a.doc_date || a.created_at));
  const rangeRevenue = profitRows.reduce((sum, document) => sum + document.revenue, 0);
  const rangeCostOfGoods = profitRows.reduce((sum, document) => sum + document.costOfGoods, 0);
  const rangeProfit = rangeRevenue - rangeCostOfGoods;
  const fallbackInvoiceCount = profitRows.filter(document => document.fallbackLineCount > 0).length;
  const missingCostLineCount = profitRows.reduce((sum, document) => sum + document.missingCostLineCount, 0);

  const chequeById = new Map(cheques.map(cheque => [String(cheque.id), cheque]));
  const realizedPayments = payments.filter(payment => {
    if (!['cash', 'bank', 'card', 'cheque'].includes(payment.payment_method)) return false;
    if (payment.payment_method !== 'cheque') return inDateRange(payment.payment_date || payment.created_at, selectedRange.start, selectedRange.end);
    const cheque = chequeById.get(String(payment.cheque_id)) || cheques.find(item => String(item.payment_id) === String(payment.id));
    return cheque?.status === 'cleared' && inDateRange(cheque.cleared_date || payment.payment_date || payment.created_at, selectedRange.start, selectedRange.end);
  });
  const cashIn = realizedPayments.filter(payment => !OUTFLOW_TYPES.has(payment.payment_type)).reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const cashOut = realizedPayments.filter(payment => OUTFLOW_TYPES.has(payment.payment_type)).reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const rangeTransit = transitShipments.filter(shipment => inDateRange(shipment.document_date || shipment.shipping_date || shipment.departure_date || shipment.created_at, selectedRange.start, selectedRange.end));
  const totalTransitValue = rangeTransit.reduce((sum, shipment) => sum + (Number(shipment.total_estimated_cost_lkr) || 0), 0);
  const rangePurchases = purchases.filter(document => inDateRange(document.receipt_date || document.created_at, selectedRange.start, selectedRange.end));
  const purchaseValue = rangePurchases.reduce((sum, document) => sum + (Number(document.total_landed_lkr || document.total_amount_lkr) || 0), 0);
  const rangeReceivables = rangeSales.reduce((sum, document) => sum + Math.max(0, Number(document.balance_due) || 0), 0);
  const pendingCheques = cheques.filter(cheque => PENDING_CHEQUE_STATUSES.has(cheque.status) && inDateRange(cheque.received_or_issued_date || cheque.created_at, selectedRange.start, selectedRange.end));

  const lowStockItems = products.filter(product => {
    if (product.is_active === false) return false;
    const available = Number(stockBalances[product.id]?.qty_available) || 0;
    return available <= Number(product.low_stock_threshold ?? 5);
  }).sort((a, b) => (Number(stockBalances[a.id]?.qty_available) || 0) - (Number(stockBalances[b.id]?.qty_available) || 0));

  const recentActivity = useMemo(() => [
    ...payments.map(payment => ({ id: `pay-${payment.id}`, date: payment.payment_date || payment.created_at, type: 'Payment', reference: payment.payment_no, detail: payment.reference || payment.notes || payment.payment_type, amount: Number(payment.amount) || 0, outflow: OUTFLOW_TYPES.has(payment.payment_type) })),
    ...salesDocuments.map(document => ({ id: `sale-${document.id}`, date: document.doc_date || document.created_at, type: document.doc_type === 'quotation' ? 'Quotation' : 'Sales Document', reference: document.doc_no, detail: document.customer_name || document.payment_status, amount: Number(document.grand_total) || 0 })),
    ...purchases.map(document => ({ id: `purchase-${document.id}`, date: document.receipt_date || document.created_at, type: 'Purchase Document', reference: document.doc_no || document.grn_no, detail: document.supplier_name || document.status, amount: Number(document.total_landed_lkr || document.total_amount_lkr) || 0, outflow: true }))
  ].filter(item => inDateRange(item.date, selectedRange.start, selectedRange.end)).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8), [payments, salesDocuments, purchases, selectedRange.start, selectedRange.end]);

  return (
    <div className="page-section dashboard-page">
      <div className="dashboard-heading"><div><h2>Business Overview</h2><p>Financial activity for {selectedRange.label}</p></div><button className="primary-button" onClick={() => onNavigateTab('pos')}>Open Wholesale POS</button></div>

      <div className="dashboard-range-bar" aria-label="Dashboard date range">
        <div className="dashboard-range-presets">
          {RANGE_PRESETS.map(([key, label]) => <button type="button" key={key} className={rangePreset === key ? 'active' : ''} onClick={() => setRangePreset(key)}>{label}</button>)}
        </div>
        {rangePreset === 'custom' && <div className="dashboard-custom-range"><label>From<input type="date" value={customStart} max={customEnd || undefined} onChange={event => setCustomStart(event.target.value)} /></label><label>To<input type="date" value={customEnd} min={customStart || undefined} onChange={event => setCustomEnd(event.target.value)} /></label></div>}
      </div>

      <div className="dashboard-metric-grid">
        <div className="stat-card"><p>SALES</p><strong>{formatCurrency(rangeRevenue)}</strong><small>{rangeSales.length} posted invoices · {selectedRange.label}</small></div>
        <div className="stat-card"><p>COST OF GOODS SOLD</p><strong style={{ color: '#ffca58' }}>{formatCurrency(rangeCostOfGoods)}</strong><small>Quantity × cost recorded at sale</small></div>
        <div className="stat-card"><p>GROSS PROFIT</p><strong style={{ color: rangeProfit >= 0 ? '#52e37e' : '#ff8e8e' }}>{formatCurrency(rangeProfit)}</strong><small>{rangeRevenue ? `${((rangeProfit / rangeRevenue) * 100).toFixed(1)}% margin · sale-time cost` : `No sales for ${selectedRange.label.toLowerCase()}`}</small></div>
        <div className="stat-card"><p>REALIZED CASH + BANK</p><strong style={{ color: cashIn - cashOut >= 0 ? '#52e37e' : '#ff8e8e' }}>{formatCurrency(cashIn - cashOut)}</strong><small>{formatCurrency(cashIn)} in · {formatCurrency(cashOut)} out</small></div>
        <div className="stat-card"><p>OPEN RECEIVABLES</p><strong style={{ color: '#ffca58' }}>{formatCurrency(rangeReceivables)}</strong><small>Balance on invoices in this range</small></div>
        <div className="stat-card"><p>PURCHASE VALUE</p><strong style={{ color: '#ff8e8e' }}>{formatCurrency(purchaseValue)}</strong><small>{rangePurchases.length} purchase documents</small></div>
        <div className="stat-card"><p>TRANSIT ORDERS</p><strong>{formatCurrency(totalTransitValue)}</strong><small>{rangeTransit.length} transit documents created</small></div>
        <div className="stat-card"><p>PENDING CHEQUES</p><strong>{pendingCheques.length}</strong><small>Within the selected date range</small></div>
      </div>

      <div className="panel-card dashboard-profit-panel">
        <div className="panel-heading">
          <div><h3>Gross Profit Calculation</h3><p>{selectedRange.label} · invoice sales minus the cost of the exact quantity sold</p></div>
          <div className="profit-equation" aria-label="Gross profit formula">
            <span><small>Sales</small><strong>{formatCurrency(rangeRevenue)}</strong></span>
            <b>−</b>
            <span><small>COGS</small><strong>{formatCurrency(rangeCostOfGoods)}</strong></span>
            <b>=</b>
            <span><small>Gross profit</small><strong className={rangeProfit >= 0 ? 'amount-in' : 'amount-out'}>{formatCurrency(rangeProfit)}</strong></span>
          </div>
        </div>
        {fallbackInvoiceCount > 0 && (
          <div className="profit-cost-notice">
            <strong>{fallbackInvoiceCount} older invoice{fallbackInvoiceCount === 1 ? '' : 's'} had zero saved cost.</strong>
            {' '}Their current weighted-average product cost is used as a visible fallback. New invoices keep using their cost snapshot from the time of sale.
          </div>
        )}
        {missingCostLineCount > 0 && <div className="profit-cost-notice danger"><strong>{missingCostLineCount} sold item line{missingCostLineCount === 1 ? '' : 's'} still has no cost.</strong> Set a product cost to make the profit complete.</div>}
        <div className="table-responsive dashboard-profit-table">
          <table>
            <thead><tr><th>Invoice / Cost calculation</th><th>Date</th><th>Sales</th><th>COGS</th><th>Gross profit</th><th>Margin</th></tr></thead>
            <tbody>
              {profitRows.map(document => (
                <tr key={document.id}>
                  <td>
                    <strong>{document.doc_no}</strong>
                    <details className="profit-line-details">
                      <summary>{document.lines.length} item line{document.lines.length === 1 ? '' : 's'} · view calculation</summary>
                      {document.lines.map(line => (
                        <div className="profit-line" key={line.id}>
                          <span>{line.name}</span>
                          <span>{line.qty} × {formatCurrency(line.effectiveUnitCost)} = <strong>{formatCurrency(line.lineCost)}</strong></span>
                          {line.usesCurrentCostFallback && <em>Current WAC fallback</em>}
                          {line.isCostMissing && <em className="danger-text">Cost missing</em>}
                        </div>
                      ))}
                    </details>
                  </td>
                  <td>{formatDate(document.doc_date)}</td>
                  <td className="mono">{formatCurrency(document.revenue)}</td>
                  <td className="mono">
                    {formatCurrency(document.costOfGoods)}
                    {document.savedCostDiffers && <small className="cost-correction-note">Saved cost was {formatCurrency(document.storedCost)}</small>}
                  </td>
                  <td className={`mono ${document.grossProfit >= 0 ? 'amount-in' : 'amount-out'}`}>{formatCurrency(document.grossProfit)}</td>
                  <td className="mono">{document.revenue ? `${((document.grossProfit / document.revenue) * 100).toFixed(1)}%` : '0.0%'}</td>
                </tr>
              ))}
              {!profitRows.length && <tr><td colSpan="6" className="empty-state-cell">No posted sales invoices for {selectedRange.label.toLowerCase()}.</td></tr>}
            </tbody>
            {profitRows.length > 0 && <tfoot><tr><th colSpan="2">Range total</th><th className="mono">{formatCurrency(rangeRevenue)}</th><th className="mono">{formatCurrency(rangeCostOfGoods)}</th><th className={`mono ${rangeProfit >= 0 ? 'amount-in' : 'amount-out'}`}>{formatCurrency(rangeProfit)}</th><th className="mono">{rangeRevenue ? `${((rangeProfit / rangeRevenue) * 100).toFixed(1)}%` : '0.0%'}</th></tr></tfoot>}
          </table>
        </div>
      </div>

      <div className="dashboard-quick-actions">
        <button onClick={() => onNavigateTab('reporting')}>▥ Open Reports</button><button onClick={() => onNavigateTab('stock-in-transit')}>🚢 Track Transit</button><button onClick={() => onNavigateTab('purchase-documents')}>📄 Receive Purchase</button><button onClick={() => onNavigateTab('cheques')}>💳 Manage Cheques</button><button onClick={() => onNavigateTab('cashflow-bank')}>💵 Review Cash Flow</button>
      </div>

      <div className="dashboard-two-column">
        <div className="panel-card dashboard-panel">
          <div className="panel-heading"><div><h3>Low Stock</h3><p>Items at or below their reorder threshold</p></div><button className="secondary-button small-button" onClick={() => onNavigateTab('inventory')}>View Inventory</button></div>
          <div className="table-responsive"><table><thead><tr><th>Item</th><th>Available</th><th>In Transit</th><th>Threshold</th></tr></thead><tbody>{lowStockItems.slice(0, 8).map(product => { const stock = stockBalances[product.id] || {}; return <tr key={product.id}><td><strong>{product.name}</strong><small className="table-subtext">{product.item_code}</small></td><td className="mono" style={{ color: '#ff8e8e' }}>{Number(stock.qty_available) || 0}</td><td className="mono">{Number(stock.qty_in_transit) || 0}</td><td className="mono">{Number(product.low_stock_threshold ?? 5)}</td></tr>; })}{!lowStockItems.length && <tr><td colSpan="4" className="empty-state-cell">All active inventory is above its reorder threshold.</td></tr>}</tbody></table></div>
        </div>

        <div className="panel-card dashboard-panel">
          <div className="panel-heading"><div><h3>Recent Activity</h3><p>Documents and real payment movements</p></div></div>
          <div className="activity-list">{recentActivity.map(item => <div className="activity-row" key={item.id}><div><strong>{item.reference || item.type}</strong><span>{item.type} · {item.detail || '-'}</span></div><div><strong className={item.outflow ? 'amount-out' : 'amount-in'}>{item.outflow ? '-' : ''}{formatCurrency(item.amount)}</strong><span>{formatDate(item.date)}</span></div></div>)}{!recentActivity.length && <div className="empty-state-cell">No activity recorded yet.</div>}</div>
        </div>
      </div>
    </div>
  );
}
