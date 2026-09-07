import React, { useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency, formatDate } from '../../lib/formatters';

const OUTFLOW_TYPES = new Set([
  'transit_purchase_payment', 'purchase_payment', 'supplier_payment', 'supplier_advance',
  'operational_expense', 'expense', 'customer_refund'
]);

const reportCell = (value, type) => {
  if (type === 'currency') return formatCurrency(value);
  if (type === 'number') return Number(value || 0).toLocaleString('en-LK', { maximumFractionDigits: 2 });
  if (type === 'percent') return `${Number(value || 0).toFixed(1)}%`;
  if (type === 'date') return formatDate(value);
  return value == null || value === '' ? '-' : String(value);
};

const csvCell = value => `"${String(value ?? '').replace(/"/g, '""')}"`;

function downloadCsv(report) {
  const lines = [
    report.columns.map(column => csvCell(column.label)).join(','),
    ...report.rows.map(row => report.columns.map(column => csvCell(
      column.type === 'date' ? formatDate(row[column.key]) : row[column.key]
    )).join(','))
  ];
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${report.fileName}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadPdf(report, companyName) {
  const landscape = report.columns.length > 6;
  const pdf = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', format: 'a4' });
  pdf.setFontSize(16);
  pdf.text(companyName || 'GS Wholesale', 14, 16);
  pdf.setFontSize(12);
  pdf.text(report.title, 14, 24);
  pdf.setFontSize(8);
  pdf.setTextColor(100);
  pdf.text(`Generated ${new Date().toLocaleString('en-LK')}`, 14, 30);
  autoTable(pdf, {
    startY: 35,
    head: [report.columns.map(column => column.label)],
    body: report.rows.map(row => report.columns.map(column => reportCell(row[column.key], column.type))),
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2.2, overflow: 'linebreak' },
    headStyles: { fillColor: [19, 139, 197], textColor: 255 },
    columnStyles: report.columns.reduce((styles, column, index) => {
      if (['currency', 'number', 'percent'].includes(column.type)) styles[index] = { halign: 'right' };
      return styles;
    }, {}),
    didDrawPage: data => {
      pdf.setFontSize(7);
      pdf.setTextColor(120);
      pdf.text(`Page ${pdf.getNumberOfPages()}`, data.settings.margin.left, pdf.internal.pageSize.height - 7);
    }
  });
  pdf.save(`${report.fileName}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export default function ReportsIndex() {
  const {
    salesDocuments = [], products = [], customers = [], stockBalances = {},
    payments = [], companySettings = {}
  } = useBusiness();
  const [reportType, setReportType] = useState('sales_profit');

  const reports = useMemo(() => {
    const activeInvoices = salesDocuments.filter(document =>
      document.doc_type === 'sales_invoice' && !['cancelled', 'returned'].includes(document.status)
    );

    const salesRows = products.map(product => {
      let soldQty = 0;
      let revenue = 0;
      let cost = 0;
      let fallbackLines = 0;
      activeInvoices.forEach(document => {
        const lineRevenue = (document.items || []).reduce((sum, item) => sum + (Number(item.line_total) || 0), 0);
        const revenueRatio = lineRevenue > 0 ? (Number(document.grand_total) || 0) / lineRevenue : 1;
        (document.items || []).forEach(item => {
          if (String(item.product_id) !== String(product.id)) return;
          const qty = Number(item.base_qty || item.qty) || 0;
          const snapshotCost = Number(item.unit_cost_snapshot) || 0;
          const unitCost = snapshotCost > 0
            ? snapshotCost
            : Number(product.weighted_cost_lkr || product.cost_price || product.cost) || 0;
          if (snapshotCost <= 0 && unitCost > 0) fallbackLines += 1;
          soldQty += qty;
          revenue += (Number(item.line_total) || 0) * revenueRatio;
          cost += qty * unitCost;
        });
      });
      const profit = revenue - cost;
      return {
        code: product.item_code,
        product: product.name,
        soldQty,
        revenue,
        cost,
        profit,
        margin: revenue > 0 ? (profit / revenue) * 100 : 0,
        costBasis: fallbackLines ? `Sale snapshot + current WAC (${fallbackLines} legacy)` : 'Sale-time snapshot'
      };
    }).filter(row => row.soldQty > 0);

    const today = new Date();
    const agingRows = customers.map(customer => {
      const row = {
        code: customer.customer_code,
        customer: customer.business_name,
        limit: Number(customer.credit_limit) || 0,
        totalDue: 0,
        current: 0,
        days30: 0,
        days60: 0,
        days90Plus: 0
      };
      activeInvoices
        .filter(document => String(document.customer_id) === String(customer.id) && (Number(document.balance_due) || 0) > 0)
        .forEach(document => {
          const dueDate = new Date(document.due_date || document.doc_date || document.created_at);
          const daysOverdue = Math.floor((today - dueDate) / 86400000);
          const balance = Number(document.balance_due) || 0;
          row.totalDue += balance;
          if (daysOverdue <= 0) row.current += balance;
          else if (daysOverdue <= 30) row.days30 += balance;
          else if (daysOverdue <= 60) row.days60 += balance;
          else row.days90Plus += balance;
        });
      return row;
    }).filter(row => row.totalDue > 0);

    const inventoryRows = products.filter(product => product.is_active !== false).map(product => {
      const stock = stockBalances[product.id] || {};
      const onHand = Number(stock.qty_on_hand) || 0;
      const unitCost = Number(product.weighted_cost_lkr || product.cost_price || product.cost) || 0;
      return {
        code: product.item_code,
        product: product.name,
        onHand,
        reserved: Number(stock.qty_reserved) || 0,
        available: Number(stock.qty_available) || 0,
        inTransit: Number(stock.qty_in_transit) || 0,
        damaged: Number(stock.qty_damaged) || 0,
        unitCost,
        stockValue: onHand * unitCost
      };
    });

    const cashflowRows = [...payments]
      .sort((a, b) => new Date(b.payment_date || b.created_at) - new Date(a.payment_date || a.created_at))
      .map(payment => {
        const outflow = OUTFLOW_TYPES.has(payment.payment_type);
        return {
          date: payment.payment_date || payment.created_at,
          reference: payment.payment_no || payment.reference || '-',
          type: String(payment.payment_type || 'payment').replaceAll('_', ' '),
          party: payment.party_name || payment.customer_name || payment.payee || '-',
          method: String(payment.payment_method || '-').replaceAll('_', ' '),
          inflow: outflow ? 0 : Number(payment.amount) || 0,
          outflow: outflow ? Number(payment.amount) || 0 : 0,
          notes: payment.reference || payment.notes || '-'
        };
      });

    const salesRevenue = salesRows.reduce((sum, row) => sum + row.revenue, 0);
    const salesCost = salesRows.reduce((sum, row) => sum + row.cost, 0);
    const totalDue = agingRows.reduce((sum, row) => sum + row.totalDue, 0);
    const overdue = agingRows.reduce((sum, row) => sum + row.days30 + row.days60 + row.days90Plus, 0);
    const stockValue = inventoryRows.reduce((sum, row) => sum + row.stockValue, 0);
    const inflow = cashflowRows.reduce((sum, row) => sum + row.inflow, 0);
    const outflow = cashflowRows.reduce((sum, row) => sum + row.outflow, 0);

    return {
      sales_profit: {
        title: 'Sales & Gross Profit by Product', shortTitle: 'Sales & Profit',
        description: 'Revenue, sale-time cost, gross profit and margin for every sold product.', fileName: 'Sales_Gross_Profit',
        stats: [['Revenue', salesRevenue], ['COGS', salesCost], ['Gross profit', salesRevenue - salesCost]],
        columns: [
          { key: 'code', label: 'Code' }, { key: 'product', label: 'Product' },
          { key: 'soldQty', label: 'Units Sold', type: 'number' }, { key: 'revenue', label: 'Revenue', type: 'currency' },
          { key: 'cost', label: 'COGS', type: 'currency' }, { key: 'profit', label: 'Gross Profit', type: 'currency' },
          { key: 'margin', label: 'Margin', type: 'percent' }, { key: 'costBasis', label: 'Cost Basis' }
        ], rows: salesRows
      },
      aging: {
        title: 'Accounts Receivable Aging', shortTitle: 'Receivable Aging',
        description: 'Outstanding customer credit grouped by how long it has been overdue.', fileName: 'Accounts_Receivable_Aging',
        stats: [['Total receivable', totalDue], ['Overdue', overdue], ['Customer accounts', agingRows.length, 'number']],
        columns: [
          { key: 'code', label: 'Code' }, { key: 'customer', label: 'Customer' },
          { key: 'limit', label: 'Credit Limit', type: 'currency' }, { key: 'totalDue', label: 'Total Due', type: 'currency' },
          { key: 'current', label: 'Not Yet Due', type: 'currency' }, { key: 'days30', label: '1-30 Days', type: 'currency' },
          { key: 'days60', label: '31-60 Days', type: 'currency' }, { key: 'days90Plus', label: '60+ Days', type: 'currency' }
        ], rows: agingRows
      },
      inventory: {
        title: 'Inventory Stock & Valuation', shortTitle: 'Inventory Value',
        description: 'On-hand, reserved, available, incoming and damaged stock with weighted cost.', fileName: 'Inventory_Valuation',
        stats: [
          ['On hand units', inventoryRows.reduce((sum, row) => sum + row.onHand, 0), 'number'],
          ['Available units', inventoryRows.reduce((sum, row) => sum + row.available, 0), 'number'],
          ['Stock value', stockValue]
        ],
        columns: [
          { key: 'code', label: 'Code' }, { key: 'product', label: 'Product' },
          { key: 'onHand', label: 'On Hand', type: 'number' }, { key: 'reserved', label: 'Reserved', type: 'number' },
          { key: 'available', label: 'Available', type: 'number' }, { key: 'inTransit', label: 'In Transit', type: 'number' },
          { key: 'damaged', label: 'Damaged', type: 'number' }, { key: 'unitCost', label: 'WAC', type: 'currency' },
          { key: 'stockValue', label: 'Stock Value', type: 'currency' }
        ], rows: inventoryRows
      },
      cashflow: {
        title: 'Cash Flow Transactions', shortTitle: 'Cash Flow',
        description: 'All recorded inflows and outflows with payment method and reference.', fileName: 'Cash_Flow_Transactions',
        stats: [['Total inflow', inflow], ['Total outflow', outflow], ['Net cash flow', inflow - outflow]],
        columns: [
          { key: 'date', label: 'Date', type: 'date' }, { key: 'reference', label: 'Reference' },
          { key: 'type', label: 'Type' }, { key: 'party', label: 'Party' }, { key: 'method', label: 'Method' },
          { key: 'inflow', label: 'Inflow', type: 'currency' }, { key: 'outflow', label: 'Outflow', type: 'currency' },
          { key: 'notes', label: 'Notes' }
        ], rows: cashflowRows
      }
    };
  }, [salesDocuments, products, customers, stockBalances, payments]);

  const activeReport = reports[reportType];

  return (
    <div className="reports-page">
      <div className="report-selector-grid">
        {Object.entries(reports).map(([key, report]) => (
          <button key={key} type="button" onClick={() => setReportType(key)} className={`report-selector ${reportType === key ? 'active' : ''}`}>
            <strong>{report.shortTitle}</strong><small>{report.rows.length} rows</small>
          </button>
        ))}
      </div>

      <div className="panel-card reports-panel">
        <div className="reports-heading">
          <div><h3>{activeReport.title}</h3><p>{activeReport.description}</p></div>
          <div className="report-export-actions">
            <button type="button" className="secondary-button" onClick={() => downloadCsv(activeReport)}>↓ Export CSV</button>
            <button type="button" className="primary-button" onClick={() => downloadPdf(activeReport, companySettings.business_name)}>PDF Export</button>
          </div>
        </div>

        <div className="report-summary-grid">
          {activeReport.stats.map(([label, value, type = 'currency']) => (
            <div key={label}><small>{label}</small><strong>{reportCell(value, type)}</strong></div>
          ))}
        </div>

        <div className="table-responsive reports-table">
          <table>
            <thead><tr>{activeReport.columns.map(column => <th key={column.key}>{column.label}</th>)}</tr></thead>
            <tbody>
              {activeReport.rows.map((row, index) => (
                <tr key={`${reportType}-${row.code || row.reference || index}`}>
                  {activeReport.columns.map(column => <td key={column.key} className={['currency', 'number', 'percent'].includes(column.type) ? 'mono' : ''}>{reportCell(row[column.key], column.type)}</td>)}
                </tr>
              ))}
              {!activeReport.rows.length && <tr><td colSpan={activeReport.columns.length} className="empty-state-cell">No records available for this report.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
