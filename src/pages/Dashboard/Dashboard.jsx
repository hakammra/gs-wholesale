import React from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency } from '../../lib/formatters';

export default function Dashboard({ onNavigateTab }) {
  const { salesDocuments, transitShipments, customers, bankAccounts, products, stockBalances } = useBusiness();

  const totalSalesMonth = salesDocuments.filter(d => d.doc_type === 'sales_invoice').reduce((s, d) => s + (d.grand_total || 0), 0);
  const totalTransitValue = transitShipments.filter(s => s.status === 'in_transit').reduce((s, s2) => s + (s2.total_estimated_cost_lkr || 0), 0);
  const totalReceivables = customers.reduce((s, c) => s + (c.current_receivable || 0), 0);
  const totalLiquidity = bankAccounts.reduce((s, b) => s + (b.current_balance || 0), 0);

  const lowStockItems = products.filter(p => {
    const stock = stockBalances[p.id] || { qty_available: 0 };
    return stock.qty_available <= (p.low_stock_threshold || 10);
  });

  return (
    <div className="page-section" style={{ padding: 18 }}>
      {/* 4 Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <p>WHOLESALE REVENUE</p>
          <strong style={{ color: 'var(--primary)' }}>{formatCurrency(totalSalesMonth)}</strong>
        </div>
        <div className="stat-card">
          <p>IMPORTS IN TRANSIT</p>
          <strong style={{ color: '#ffca58' }}>{formatCurrency(totalTransitValue)}</strong>
        </div>
        <div className="stat-card">
          <p>ACCOUNTS RECEIVABLE</p>
          <strong style={{ color: '#ff8e8e' }}>{formatCurrency(totalReceivables)}</strong>
        </div>
        <div className="stat-card">
          <p>LIQUID WORKING CAPITAL</p>
          <strong style={{ color: '#52e37e' }}>{formatCurrency(totalLiquidity)}</strong>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="panel-card" style={{ marginBottom: 20 }}>
        <h3>Quick Operations</h3>
        <div className="button-row">
          <button onClick={() => onNavigateTab('pos')} className="primary-button" style={{ fontSize: 15 }}>
            ▦ Open Wholesale POS
          </button>
          <button onClick={() => onNavigateTab('supplier-orders')} className="secondary-button">
            ⌁ Issue Import Order
          </button>
          <button onClick={() => onNavigateTab('purchases')} className="secondary-button">
            ▣ Receive Shipment (GRN)
          </button>
          <button onClick={() => onNavigateTab('cheques')} className="secondary-button">
            💳 Manage Cheques
          </button>
        </div>
      </div>

      {/* Low Stock Alerts */}
      <div className="panel-card" style={{ padding: 0 }}>
        <div style={{ padding: 12, borderBottom: '1px solid var(--line)' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Inventory Reorder & Low Stock Alerts ({lowStockItems.length})</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Product Name</th>
              <th>Available</th>
              <th>Reorder Threshold</th>
              <th>Weighted Cost</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {lowStockItems.map(p => {
              const stock = stockBalances[p.id] || { qty_available: 0 };
              return (
                <tr key={p.id}>
                  <td className="mono font-semibold" style={{ color: 'var(--primary)' }}>{p.item_code}</td>
                  <td style={{ fontWeight: 700 }}>{p.name}</td>
                  <td className="mono font-semibold" style={{ color: '#ff8e8e' }}>{stock.qty_available}</td>
                  <td className="mono">{p.low_stock_threshold || 10}</td>
                  <td className="mono">{formatCurrency(p.weighted_cost_lkr)}</td>
                  <td>
                    <button onClick={() => onNavigateTab('supplier-orders')} className="primary-button small-button">
                      Order Import
                    </button>
                  </td>
                </tr>
              );
            })}
            {lowStockItems.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: '#52e37e', padding: 20 }}>
                  All stock items are within healthy operating levels.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
