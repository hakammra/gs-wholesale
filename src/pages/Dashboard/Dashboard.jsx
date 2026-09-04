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
    document.doc_type === 'sales_invoice' && document.status !== 'cancelled' && String(document.doc_date || '').startsWith(monthKey)
  );
  const monthlyRevenue = monthlySales.reduce((sum, document) => sum + (Number(document.grand_total) || 0), 0);
  const monthlyProfit = monthlySales.reduce((sum, document) => sum + (document.items || []).reduce((itemSum, item) => {
    const qty = Number(item.base_qty || item.qty) || 0;
    return itemSum + (Number(item.line_total) || 0) - (qty * (Number(item.unit_cost_snapshot) || 0));
  }, 0), 0);

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
        <div className="stat-card"><p>EST. GROSS PROFIT</p><strong style={{ color: monthlyProfit >= 0 ? '#52e37e' : '#ff8e8e' }}>{formatCurrency(monthlyProfit)}</strong><small>{monthlyRevenue ? `${((monthlyProfit / monthlyRevenue) * 100).toFixed(1)}% margin` : 'No sales this month'}</small></div>
        <div className="stat-card"><p>REALIZED CASH FLOW</p><strong style={{ color: cashIn - cashOut >= 0 ? '#52e37e' : '#ff8e8e' }}>{formatCurrency(cashIn - cashOut)}</strong><small>{formatCurrency(cashIn)} in · {formatCurrency(cashOut)} out</small></div>
        <div className="stat-card"><p>BANK LIQUIDITY</p><strong>{formatCurrency(totalLiquidity)}</strong><small>Across {bankAccounts.length} accounts</small></div>
        <div className="stat-card"><p>RECEIVABLES</p><strong style={{ color: '#ffca58' }}>{formatCurrency(totalReceivables)}</strong><small>Outstanding customer balances</small></div>
        <div className="stat-card"><p>SUPPLIER PAYABLES</p><strong style={{ color: '#ff8e8e' }}>{formatCurrency(totalPayables)}</strong><small>Open supplier credit</small></div>
        <div className="stat-card"><p>IN TRANSIT</p><strong>{formatCurrency(totalTransitValue)}</strong><small>{transitShipments.filter(shipment => shipment.status === 'in_transit').length} active shipments</small></div>
        <div className="stat-card"><p>PENDING CHEQUES</p><strong>{pendingCheques.length}</strong><small>Received and issued awaiting clearance</small></div>
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
