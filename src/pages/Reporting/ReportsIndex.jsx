import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency } from '../../lib/formatters';
import { exportToExcel } from '../../lib/exportUtils';

export default function ReportsIndex() {
  const { salesDocuments, products, customers } = useBusiness();
  const [reportType, setReportType] = useState('sales_profit');

  // Profit by Product
  const salesByProduct = products.map(p => {
    let soldQty = 0;
    let revenue = 0;
    let cost = 0;

    salesDocuments.forEach(doc => {
      if (doc.doc_type === 'sales_invoice' && doc.status !== 'cancelled') {
        (doc.items || []).forEach(it => {
          if (it.product_id === p.id) {
            soldQty += (it.base_qty || it.qty);
            revenue += (it.line_total || 0);
            cost += ((it.unit_cost_snapshot || p.weighted_cost_lkr || 0) * (it.base_qty || it.qty));
          }
        });
      }
    });

    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return { name: p.name, code: p.item_code, soldQty, revenue, cost, profit, margin };
  });

  // Real aging from each open invoice date/due date. No estimated percentages.
  const today = new Date();
  const agingReport = customers.map(customer => {
    const result = {
      code: customer.customer_code,
      name: customer.business_name,
      limit: Number(customer.credit_limit) || 0,
      totalDue: 0,
      current: 0,
      days30: 0,
      days60: 0,
      days90Plus: 0
    };
    salesDocuments
      .filter(document => document.doc_type === 'sales_invoice' && document.status !== 'cancelled' && document.customer_id === customer.id && (Number(document.balance_due) || 0) > 0)
      .forEach(document => {
        const due = new Date(document.due_date || document.doc_date || document.created_at);
        const ageDays = Math.max(0, Math.floor((today - due) / 86400000));
        const balance = Number(document.balance_due) || 0;
        result.totalDue += balance;
        if (ageDays <= 30) result.current += balance;
        else if (ageDays <= 60) result.days30 += balance;
        else if (ageDays <= 90) result.days60 += balance;
        else result.days90Plus += balance;
      });
    return result;
  }).filter(row => row.totalDue > 0);

  const handleExport = () => {
    if (reportType === 'sales_profit') {
      exportToExcel(salesByProduct.map(r => ({
        'Item Code': r.code, 'Product': r.name, 'Sold': r.soldQty, 'Revenue': r.revenue, 'COGS': r.cost, 'Gross Profit': r.profit, 'Margin %': r.margin.toFixed(2) + '%'
      })), 'Sales_Gross_Profit');
    } else {
      exportToExcel(agingReport.map(r => ({
        'Code': r.code, 'Customer': r.name, 'Total Due': r.totalDue, '1-30 Days': r.current, '31-60 Days': r.days30, '61-90 Days': r.days60, '90+ Days': r.days90Plus
      })), 'Accounts_Receivable_Aging');
    }
  };

  return (
    <div>
      {/* Action Toolbar */}
      <div className="action-toolbar">
        <button
          onClick={() => setReportType('sales_profit')}
          className={`toolbar-button ${reportType === 'sales_profit' ? 'bright' : ''}`}
        >
          <span className="icon">▥</span>
          <span>Gross Margin by Item</span>
        </button>

        <button
          onClick={() => setReportType('aging')}
          className={`toolbar-button ${reportType === 'aging' ? 'bright' : ''}`}
        >
          <span className="icon">👥</span>
          <span>AR Aging (30/60/90)</span>
        </button>

        <button onClick={handleExport} className="toolbar-button">
          <span className="icon">⤓</span>
          <span>Export Excel</span>
        </button>
      </div>

      <div className="page-section" style={{ padding: 18 }}>
        <div className="panel-card" style={{ padding: 0 }}>
          {reportType === 'sales_profit' ? (
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Product</th>
                  <th>Units Sold</th>
                  <th>Wholesale Revenue</th>
                  <th>COGS (Cost)</th>
                  <th>Gross Profit</th>
                  <th>Margin %</th>
                </tr>
              </thead>
              <tbody>
                {salesByProduct.map((r, i) => (
                  <tr key={i}>
                    <td className="mono font-semibold" style={{ color: 'var(--primary)' }}>{r.code}</td>
                    <td style={{ fontWeight: 700 }}>{r.name}</td>
                    <td className="mono">{r.soldQty}</td>
                    <td className="mono">{formatCurrency(r.revenue)}</td>
                    <td className="mono">{formatCurrency(r.cost)}</td>
                    <td className="mono font-semibold" style={{ color: r.profit > 0 ? '#52e37e' : 'inherit' }}>{formatCurrency(r.profit)}</td>
                    <td className="mono font-semibold" style={{ color: r.margin >= 5 ? '#52e37e' : '#ffca58' }}>{r.margin.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Credit Limit</th>
                  <th>Total Due</th>
                  <th>Current (1-30 Days)</th>
                  <th>31-60 Days</th>
                  <th>61-90 Days</th>
                  <th>90+ Days</th>
                </tr>
              </thead>
              <tbody>
                {agingReport.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700 }}>{r.name} ({r.code})</td>
                    <td className="mono">{formatCurrency(r.limit)}</td>
                    <td className="mono font-semibold" style={{ color: '#ff8e8e' }}>{formatCurrency(r.totalDue)}</td>
                    <td className="mono">{formatCurrency(r.current)}</td>
                    <td className="mono" style={{ color: '#ffca58' }}>{formatCurrency(r.days30)}</td>
                    <td className="mono" style={{ color: '#ff8e8e' }}>{formatCurrency(r.days60)}</td>
                    <td className="mono" style={{ color: '#ff8e8e' }}>{formatCurrency(r.days90Plus)}</td>
                  </tr>
                ))}
                {agingReport.length === 0 && <tr><td colSpan="7" className="empty-state-cell">No outstanding customer balances.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
