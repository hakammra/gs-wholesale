import React, { useMemo } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency, formatDate } from '../../lib/formatters';

const OUTFLOW_TYPES = new Set(['transit_purchase_payment', 'purchase_payment', 'supplier_payment', 'supplier_advance', 'operational_expense', 'expense', 'customer_refund']);
const PENDING_CHEQUE_STATUSES = new Set(['received', 'held', 'deposited']);

export default function Dashboard({ onNavigateTab }) {
  const {
    salesDocuments = [], transitShipments = [], customers = [], suppliers = [], bankAccounts = [],
    products = [], stockBalances = {}, payments = [], purchases = [], cheques = []
  } = useBusiness();

  const monthKey = new Date().toISOString().slice(0, 7);
  const monthlySales = salesDocuments.filter(document =>
    document.doc_type === 'sales_invoice' && !['cancelled', 'returned'].includes(document.status) && String(document.doc_date || '').startsWith(monthKey)
  );
  const productById = new Map(products.map(product => [String(product.id), product]));
  const monthlyProfitRows = monthlySales.map(document => {
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
  const monthlyRevenue = monthlyProfitRows.reduce((sum, document) => sum + document.revenue, 0);
  const monthlyCostOfGoods = monthlyProfitRows.reduce((sum, document) => sum + document.costOfGoods, 0);
  const monthlyProfit = monthlyRevenue - monthlyCostOfGoods;
  const fallbackInvoiceCount = monthlyProfitRows.filter(document => document.fallbackLineCount > 0).length;
  const missingCostLineCount = monthlyProfitRows.reduce((sum, document) => sum + document.missingCostLineCount, 0);

  const chequeById = new Map(cheques.map(cheque => [String(cheque.id), cheque]));
  const monthlyPayments = payments.filter(payment => String(payment.payment_date || payment.created_at || '').startsWith(monthKey));
  const realizedPayments = monthlyPayments.filter(payment => {
    if (payment.payment_method !== 'cheque') return true;
    const cheque = chequeById.get(String(payment.cheque_id)) || cheques.find(item => String(item.payment_id) === String(payment.id));
    return cheque?.status === 'cleared';
  });
  const cashIn = realizedPayments.filter(payment => !OUTFLOW_TYPES.has(payment.payment_type)).reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const cashOut = realizedPayments.filter(payment => OUTFLOW_TYPES.has(payment.payment_type)).reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const totalTransitValue = transitShipments.filter(shipment => shipment.status === 'in_transit').reduce((sum, shipment) => sum + (Number(shipment.total_estimated_cost_lkr) || 0), 0);
  const totalReceivables = customers.reduce((sum, customer) => sum + (Number(customer.current_receivable) || 0), 0);
  const totalPayables = suppliers.reduce((sum, supplier) => sum + (Number(supplier.current_payable) || 0), 0);
  const totalLiquidity = bankAccounts.reduce((sum, account) => sum + (Number(account.current_balance) || 0), 0);
  const pendingCheques = cheques.filter(cheque => PENDING_CHEQUE_STATUSES.has(cheque.status));

  const lowStockItems = products.filter(product => {
    if (product.is_active === false) return false;
    const available = Number(stockBalances[product.id]?.qty_available) || 0;
    return available <= Number(product.low_stock_threshold ?? 5);
  }).sort((a, b) => (Number(stockBalances[a.id]?.qty_available) || 0) - (Number(stockBalances[b.id]?.qty_available) || 0));

  const recentActivity = useMemo(() => [
    ...payments.map(payment => ({ id: `pay-${payment.id}`, date: payment.payment_date || payment.created_at, type: 'Payment', reference: payment.payment_no, detail: payment.reference || payment.notes || payment.payment_type, amount: Number(payment.amount) || 0, outflow: OUTFLOW_TYPES.has(payment.payment_type) })),
    ...salesDocuments.map(document => ({ id: `sale-${document.id}`, date: document.doc_date || document.created_at, type: document.doc_type === 'quotation' ? 'Quotation' : 'Sales Document', reference: document.doc_no, detail: document.customer_name || document.payment_status, amount: Number(document.grand_total) || 0 })),
    ...purchases.map(document => ({ id: `purchase-${document.id}`, date: document.receipt_date || document.created_at, type: 'Purchase Document', reference: document.doc_no || document.grn_no, detail: document.supplier_name || document.status, amount: Number(document.total_landed_lkr || document.total_amount_lkr) || 0, outflow: true }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8), [payments, salesDocuments, purchases]);

  return (
    <div className="page-section dashboard-page">
      <div className="dashboard-heading"><div><h2>Business Overview</h2><p>Live operational and financial position for {new Date().toLocaleString('en-LK', { month: 'long', year: 'numeric' })}</p></div><button className="primary-button" onClick={() => onNavigateTab('pos')}>Open Wholesale POS</button></div>

      <div className="dashboard-metric-grid">
        <div className="stat-card"><p>MONTHLY SALES</p><strong>{formatCurrency(monthlyRevenue)}</strong><small>{monthlySales.length} posted invoices</small></div>
        <div className="stat-card"><p>COST OF GOODS SOLD</p><strong style={{ color: '#ffca58' }}>{formatCurrency(monthlyCostOfGoods)}</strong><small>Quantity × cost recorded at sale</small></div>
        <div className="stat-card"><p>GROSS PROFIT</p><strong style={{ color: monthlyProfit >= 0 ? '#52e37e' : '#ff8e8e' }}>{formatCurrency(monthlyProfit)}</strong><small>{monthlyRevenue ? `${((monthlyProfit / monthlyRevenue) * 100).toFixed(1)}% margin · sale-time cost` : 'No sales this month'}</small></div>
        <div className="stat-card"><p>REALIZED CASH FLOW</p><strong style={{ color: cashIn - cashOut >= 0 ? '#52e37e' : '#ff8e8e' }}>{formatCurrency(cashIn - cashOut)}</strong><small>{formatCurrency(cashIn)} in · {formatCurrency(cashOut)} out</small></div>
        <div className="stat-card"><p>BANK LIQUIDITY</p><strong>{formatCurrency(totalLiquidity)}</strong><small>Across {bankAccounts.length} accounts</small></div>
        <div className="stat-card"><p>RECEIVABLES</p><strong style={{ color: '#ffca58' }}>{formatCurrency(totalReceivables)}</strong><small>Outstanding customer balances</small></div>
        <div className="stat-card"><p>SUPPLIER PAYABLES</p><strong style={{ color: '#ff8e8e' }}>{formatCurrency(totalPayables)}</strong><small>Open supplier credit</small></div>
        <div className="stat-card"><p>IN TRANSIT</p><strong>{formatCurrency(totalTransitValue)}</strong><small>{transitShipments.filter(shipment => shipment.status === 'in_transit').length} active shipments</small></div>
        <div className="stat-card"><p>PENDING CHEQUES</p><strong>{pendingCheques.length}</strong><small>Received and issued awaiting clearance</small></div>
      </div>

      <div className="panel-card dashboard-profit-panel">
        <div className="panel-heading">
          <div><h3>Monthly Gross Profit Calculation</h3><p>Invoice sales minus the cost of the exact quantity sold</p></div>
          <div className="profit-equation" aria-label="Gross profit formula">
            <span><small>Sales</small><strong>{formatCurrency(monthlyRevenue)}</strong></span>
            <b>−</b>
            <span><small>COGS</small><strong>{formatCurrency(monthlyCostOfGoods)}</strong></span>
            <b>=</b>
            <span><small>Gross profit</small><strong className={monthlyProfit >= 0 ? 'amount-in' : 'amount-out'}>{formatCurrency(monthlyProfit)}</strong></span>
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
              {monthlyProfitRows.map(document => (
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
              {!monthlyProfitRows.length && <tr><td colSpan="6" className="empty-state-cell">No posted sales invoices this month.</td></tr>}
            </tbody>
            {monthlyProfitRows.length > 0 && <tfoot><tr><th colSpan="2">Monthly total</th><th className="mono">{formatCurrency(monthlyRevenue)}</th><th className="mono">{formatCurrency(monthlyCostOfGoods)}</th><th className={`mono ${monthlyProfit >= 0 ? 'amount-in' : 'amount-out'}`}>{formatCurrency(monthlyProfit)}</th><th className="mono">{monthlyRevenue ? `${((monthlyProfit / monthlyRevenue) * 100).toFixed(1)}%` : '0.0%'}</th></tr></tfoot>}
          </table>
        </div>
      </div>

      <div className="dashboard-quick-actions">
        <button onClick={() => onNavigateTab('supplier-orders')}>⌁ New Supplier Order</button><button onClick={() => onNavigateTab('stock-in-transit')}>🚢 Track Transit</button><button onClick={() => onNavigateTab('purchase-documents')}>📄 Receive Purchase</button><button onClick={() => onNavigateTab('cheques')}>💳 Manage Cheques</button><button onClick={() => onNavigateTab('cashflow-bank')}>💵 Review Cash Flow</button>
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
