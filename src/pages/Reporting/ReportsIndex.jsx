import React, { useMemo, useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { REPORT_PRESETS, reportDateKey, reportRange, inReportRange, salesProfitData } from '../../lib/reportData';
import { downloadReportCsv, downloadReportPdf } from '../../lib/reportExports';

const OUTFLOW_TYPES = new Set(['transit_purchase_payment', 'purchase_payment', 'supplier_payment', 'supplier_advance', 'operational_expense', 'expense', 'customer_refund']);
const numericTypes = new Set(['currency', 'number', 'percent']);
const reportCell = (value, type) => {
  if (value == null) return numericTypes.has(type) ? 'Not recorded' : '-';
  if (type === 'currency') return formatCurrency(value);
  if (type === 'number') return Number(value || 0).toLocaleString('en-LK', { maximumFractionDigits: 2 });
  if (type === 'percent') return Number(value || 0).toFixed(2) + '%';
  if (type === 'date') return formatDate(value);
  return value === '' ? '-' : String(value);
};
const profitColumns = [
  { key: 'code', label: 'Code' }, { key: 'product', label: 'Product' },
  { key: 'soldQty', label: 'Quantity', type: 'number' }, { key: 'cost', label: 'Cost', type: 'currency' },
  { key: 'revenue', label: 'Total', type: 'currency' }, { key: 'profit', label: 'Profit', type: 'currency' },
  { key: 'margin', label: 'Margin', type: 'percent' }
];

export default function ReportsIndex() {
  const { salesDocuments = [], products = [], customers = [], stockBalances = {}, payments = [], cheques = [], companySettings = {} } = useBusiness();
  const [reportType, setReportType] = useState('sales_profit');
  const [preset, setPreset] = useState('this_month');
  const [customStart, setCustomStart] = useState(reportDateKey().slice(0, 7) + '-01');
  const [customEnd, setCustomEnd] = useState(reportDateKey());
  const range = reportRange(preset, customStart, customEnd);
  const invalidRange = !range.end || (preset === 'custom' && !range.start) || (range.start && range.start > range.end);
  const rangeLabel = (range.start ? formatDate(range.start) : 'Since start') + ' - ' + formatDate(range.end);

  const reports = useMemo(() => {
    const profit = salesProfitData(salesDocuments, products, range);
    const costNotice = profit.missingCosts
      ? profit.missingCosts + ' line(s) have no saved cost. Incomplete cost and profit are marked Not recorded. Current WAC is never substituted.'
      : profit.zeroCosts
        ? profit.zeroCosts + ' line(s) have a recorded cost of zero. Review older invoices if those products had a purchase cost. Current WAC is never substituted.'
        : 'Costs come from the snapshots saved on each sale or original returned item. Later WAC changes do not change this report.';
    const stats = [['Net sales', profit.revenue], ['Sale-time cost', profit.cost], ['Returned sales', profit.returnedSales], ['Gross profit', profit.profit]];
    const totals = {
      code: 'TOTAL', product: '', soldQty: profit.rows.reduce((sum, row) => sum + row.soldQty, 0),
      cost: profit.cost, revenue: profit.revenue, profit: profit.profit,
      margin: profit.profit === null ? null : profit.revenue !== 0 ? profit.profit / profit.revenue * 100 : 0
    };
    const invoices = salesDocuments.filter(document => document.doc_type === 'sales_invoice' &&
      !['draft', 'cancelled', 'returned'].includes(document.status) && inReportRange(document.doc_date || document.created_at, range));
    const today = new Date(reportDateKey() + 'T12:00:00+05:30');
    const agingRows = customers.map(customer => {
      const row = { code: customer.customer_code, customer: customer.business_name, limit: Number(customer.credit_limit) || 0,
        totalDue: 0, current: 0, days30: 0, days60: 0, days90Plus: 0 };
      invoices.filter(document => String(document.customer_id) === String(customer.id) && Number(document.balance_due) > 0)
        .forEach(document => {
          const dueKey = reportDateKey(document.due_date || document.doc_date || document.created_at);
          const days = Math.floor((today - new Date(dueKey + 'T12:00:00+05:30')) / 86400000);
          const amount = Number(document.balance_due) || 0;
          row.totalDue += amount;
          if (days <= 0) row.current += amount;
          else if (days <= 30) row.days30 += amount;
          else if (days <= 60) row.days60 += amount;
          else row.days90Plus += amount;
        });
      return row;
    }).filter(row => row.totalDue > 0);
    const inventoryRows = products.filter(product => product.is_active !== false).map(product => {
      const stock = stockBalances[product.id] || {};
      const onHand = Number(stock.qty_on_hand) || 0;
      const unitCost = Number(product.weighted_cost_lkr ?? product.cost_price ?? product.cost) || 0;
      return { code: product.item_code, product: product.name, onHand, reserved: Number(stock.qty_reserved) || 0,
        available: Number(stock.qty_available) || 0, inTransit: Number(stock.qty_in_transit) || 0,
        damaged: Number(stock.qty_damaged) || 0, unitCost, stockValue: onHand * unitCost };
    });
    const linkedCheque = payment => cheques.find(entry => entry.id === payment.cheque_id || entry.payment_id === payment.id);
    const cashflowRows = payments.filter(payment => {
      if (!['cash', 'bank', 'card', 'cheque'].includes(payment.payment_method)) return false;
      if (payment.payment_method !== 'cheque') return inReportRange(payment.payment_date || payment.created_at, range);
      const cheque = linkedCheque(payment);
      return cheque?.status === 'cleared' && inReportRange(cheque.cleared_date || payment.payment_date, range);
    }).map(payment => {
      const cheque = payment.payment_method === 'cheque' ? linkedCheque(payment) : null;
      const outflow = OUTFLOW_TYPES.has(payment.payment_type);
      return { date: cheque?.cleared_date || payment.payment_date || payment.created_at,
        reference: payment.payment_no || payment.reference || '-', type: String(payment.payment_type || 'payment').replaceAll('_', ' '),
        party: payment.party_name || payment.customer_name || payment.payee || '-', method: String(payment.payment_method || '-').replaceAll('_', ' '),
        inflow: outflow ? 0 : Number(payment.amount) || 0, outflow: outflow ? Number(payment.amount) || 0 : 0,
        notes: payment.reference || payment.notes || '-' };
    }).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const totalDue = agingRows.reduce((sum, row) => sum + row.totalDue, 0);
    const overdue = agingRows.reduce((sum, row) => sum + row.days30 + row.days60 + row.days90Plus, 0);
    const inflow = cashflowRows.reduce((sum, row) => sum + row.inflow, 0);
    const outflow = cashflowRows.reduce((sum, row) => sum + row.outflow, 0);
    return {
      sales_profit: {
        title: 'Profit Margin', shortTitle: 'Profit margin', fileName: 'profit_margin',
        description: 'Net sales and profit by product, after returns and discounts.',
        note: costNotice, stats, columns: profitColumns, rows: profit.rows, totals
      },
      sales_detail: {
        title: 'Sales Cost Detail', shortTitle: 'Sales detail', fileName: 'sales_cost_detail',
        description: 'Invoice-by-invoice detail showing the unit cost recorded when each item was sold.',
        note: costNotice, stats, totals,
        columns: [
          { key: 'date', label: 'Date', type: 'date' }, { key: 'reference', label: 'Document' },
          { key: 'type', label: 'Type' }, { key: 'customer', label: 'Customer' },
          ...profitColumns.slice(0, 3), { key: 'unitCost', label: 'Recorded unit cost', type: 'currency' }, ...profitColumns.slice(3)
        ], rows: profit.details
      },
      aging: {
        title: 'Accounts Receivable Aging', shortTitle: 'Receivables', fileName: 'receivables',
        description: 'Current outstanding balances on invoices issued in the selected period.',
        note: 'This is the balance still due today on the selected invoices, not a reconstructed historical closing balance.',
        stats: [['Total receivable', totalDue], ['Overdue', overdue], ['Customer accounts', agingRows.length, 'number']],
        columns: [
          { key: 'code', label: 'Code' }, { key: 'customer', label: 'Customer' },
          { key: 'limit', label: 'Credit limit', type: 'currency' }, { key: 'totalDue', label: 'Total due', type: 'currency' },
          { key: 'current', label: 'Not yet due', type: 'currency' }, { key: 'days30', label: '1-30 days', type: 'currency' },
          { key: 'days60', label: '31-60 days', type: 'currency' }, { key: 'days90Plus', label: '60+ days', type: 'currency' }
        ], rows: agingRows
      },
      inventory: {
        title: 'Inventory Stock & Valuation', shortTitle: 'Inventory', fileName: 'inventory_valuation', isSnapshot: true,
        description: 'Current inventory quantities and valuation at the current weighted average cost.',
        note: 'Inventory is a live snapshot as of today. Date filters apply to transaction reports; historical inventory snapshots are not stored.',
        stats: [['On hand units', inventoryRows.reduce((sum, row) => sum + row.onHand, 0), 'number'],
          ['Available units', inventoryRows.reduce((sum, row) => sum + row.available, 0), 'number'],
          ['Stock value', inventoryRows.reduce((sum, row) => sum + row.stockValue, 0)]],
        columns: [
          { key: 'code', label: 'Code' }, { key: 'product', label: 'Product' },
          { key: 'onHand', label: 'On hand', type: 'number' }, { key: 'reserved', label: 'Reserved', type: 'number' },
          { key: 'available', label: 'Available', type: 'number' }, { key: 'inTransit', label: 'In transit', type: 'number' },
          { key: 'damaged', label: 'Damaged', type: 'number' }, { key: 'unitCost', label: 'Current WAC', type: 'currency' },
          { key: 'stockValue', label: 'Stock value', type: 'currency' }
        ], rows: inventoryRows
      },
      cashflow: {
        title: 'Realized Cash Flow', shortTitle: 'Cash flow', fileName: 'cash_flow',
        description: 'Cash, bank and card movements plus cheques cleared in the selected period.',
        note: 'Credit transfers and pending cheques are excluded. Cheques use their clearance date.',
        stats: [['Inflow', inflow], ['Outflow', outflow], ['Net cash flow', inflow - outflow]],
        columns: [
          { key: 'date', label: 'Date', type: 'date' }, { key: 'reference', label: 'Reference' },
          { key: 'type', label: 'Type' }, { key: 'party', label: 'Party' }, { key: 'method', label: 'Method' },
          { key: 'inflow', label: 'Inflow', type: 'currency' }, { key: 'outflow', label: 'Outflow', type: 'currency' },
          { key: 'notes', label: 'Notes' }
        ], rows: cashflowRows
      }
    };
  }, [salesDocuments, products, customers, stockBalances, payments, cheques, range.start, range.end]);
  const activeReport = reports[reportType];
  const exportReport = { ...activeReport,
    period: activeReport.isSnapshot ? 'Current snapshot - ' + formatDate(reportDateKey()) : rangeLabel,
    fileName: activeReport.fileName + '-' + (activeReport.isSnapshot ? reportDateKey() : (range.start || 'start') + '-to-' + range.end) };
  const canExport = activeReport.isSnapshot || !invalidRange;
  return (
    <div className="reports-page">
      <div className="reports-page-intro"><h3>Reports & Export</h3><p>Choose a report and period, then download the same figures as PDF or CSV.</p></div>
      <div className="report-selector-grid">
        {Object.entries(reports).map(([key, report]) => (
          <button key={key} type="button" onClick={() => setReportType(key)} className={'report-selector ' + (reportType === key ? 'active' : '')}>
            <strong>{report.shortTitle}</strong><small>{report.rows.length} {key === 'sales_detail' ? 'lines' : 'rows'}</small>
          </button>
        ))}
      </div>
      {!activeReport.isSnapshot && (
        <div className="panel-card reports-range-panel">
          <div className="reports-range-presets">
            {REPORT_PRESETS.map(([key, label]) => <button type="button" key={key} className={'secondary-button small-button ' + (preset === key ? 'active' : '')} aria-pressed={preset === key} onClick={() => setPreset(key)}>{label}</button>)}
          </div>
          {preset === 'custom' && <div className="reports-custom-range">
            <label>From<input type="date" value={customStart} max={customEnd || undefined} onChange={event => setCustomStart(event.target.value)} /></label>
            <label>To<input type="date" value={customEnd} min={customStart || undefined} onChange={event => setCustomEnd(event.target.value)} /></label>
          </div>}
          <small className={invalidRange ? 'reports-range-error' : 'reports-period-label'}>{invalidRange ? 'Select a valid start and end date. The end must be on or after the start.' : rangeLabel}</small>
        </div>
      )}
      <div className="panel-card reports-panel">
        <div className="reports-heading">
          <div><h3>{activeReport.title}</h3><p>{activeReport.description}</p></div>
          <div className="report-export-actions">
            <button type="button" disabled={!canExport} className="secondary-button" onClick={() => downloadReportCsv(exportReport)}>Export CSV</button>
            <button type="button" disabled={!canExport} className="primary-button" onClick={() => downloadReportPdf(exportReport, companySettings.business_name)}>Download PDF</button>
          </div>
        </div>
        <div className="report-summary-grid" style={{ '--report-stat-count': activeReport.stats.length }}>
          {activeReport.stats.map(([label, value, type = 'currency']) => <div key={label}><small>{label}</small><strong>{reportCell(value, type)}</strong></div>)}
        </div>
        <p className="reports-cost-note">{activeReport.note}</p>
        <div className="table-responsive reports-table">
          <table>
            <thead><tr>{activeReport.columns.map(column => <th key={column.key}>{column.label}</th>)}</tr></thead>
            <tbody>
              {canExport && activeReport.rows.map((row, index) => (
                <tr key={reportType + '-' + index}>{activeReport.columns.map(column => <td key={column.key} style={{ textAlign: numericTypes.has(column.type) ? 'right' : 'left' }} className={numericTypes.has(column.type) ? 'mono' : ''}>{reportCell(row[column.key], column.type)}</td>)}</tr>
              ))}
              {(!canExport || !activeReport.rows.length) && <tr><td colSpan={activeReport.columns.length} className="empty-state-cell">{canExport ? 'No records in this period.' : 'Choose a valid date range.'}</td></tr>}
            </tbody>
            {canExport && activeReport.totals && activeReport.rows.length > 0 && <tfoot><tr>{activeReport.columns.map((column, index) => <td key={column.key} style={{ textAlign: numericTypes.has(column.type) ? 'right' : 'left' }}>{index === 0 ? 'TOTAL' : column.key === 'unitCost' || (activeReport.totals[column.key] == null && !numericTypes.has(column.type)) ? '' : reportCell(activeReport.totals[column.key], column.type)}</td>)}</tr></tfoot>}
          </table>
        </div>
      </div>
    </div>
  );
}
