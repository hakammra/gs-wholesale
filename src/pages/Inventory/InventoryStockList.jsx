import React, { useState, useRef } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { exportToExcel, parseExcelFile, downloadProductExcelTemplate } from '../../lib/exportUtils';

export default function InventoryStockList() {
  const { products, stockBalances, stockMovements, importProductsFromExcel, categories } = useBusiness();
  const { notifySuccess, notifyError } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProductMovements, setSelectedProductMovements] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  const filteredProducts = products.filter(p => {
    if (selectedCategory && p.category_id !== selectedCategory) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return p.name?.toLowerCase().includes(term) || p.item_code?.toLowerCase().includes(term);
  });

  const totalOnHandValue = products.reduce((sum, p) => {
    const stock = stockBalances[p.id] || { qty_on_hand: 0 };
    return sum + (stock.qty_on_hand * (p.weighted_cost_lkr || 0));
  }, 0);

  const totalAvailableUnits = products.reduce((sum, p) => {
    const stock = stockBalances[p.id] || { qty_available: 0 };
    return sum + (stock.qty_available || 0);
  }, 0);

  const handleExport = () => {
    const data = products.map(p => {
      const cat = categories.find(c => c.id === p.category_id);
      const stock = stockBalances[p.id] || { qty_on_hand: 0, qty_available: 0, qty_reserved: 0, qty_in_transit: 0, qty_damaged: 0 };
      return {
        'Code': p.item_code,
        'Name': p.name,
        'Category': cat?.name || '',
        'On Hand': stock.qty_on_hand,
        'Reserved': stock.qty_reserved,
        'Available': stock.qty_available,
        'In Transit': stock.qty_in_transit,
        'Damaged': stock.qty_damaged,
        'Weighted Cost': p.weighted_cost_lkr,
        'Valuation (LKR)': stock.qty_on_hand * (p.weighted_cost_lkr || 0)
      };
    });
    exportToExcel(data, 'GS_Wholesale_Inventory_Valuation');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsImporting(true);
    try {
      const rows = await parseExcelFile(file);
      const res = await importProductsFromExcel(rows);
      notifySuccess(`Import complete: ${res.importedCount} products and stock balances updated.`);
    } catch (err) {
      notifyError(`Import failed: ${err.message || String(err)}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div>
      {/* Top Action Toolbar */}
      <div className="action-toolbar">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls, .csv"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="toolbar-button bright"
        >
          <span className="icon">⤒</span>
          <span>{isImporting ? 'Importing...' : 'Import Products & Stock'}</span>
        </button>

        <button onClick={downloadProductExcelTemplate} className="toolbar-button">
          <span className="icon">📄</span>
          <span>Download Template</span>
        </button>

        <button onClick={handleExport} className="toolbar-button">
          <span className="icon">⤓</span>
          <span>Export Valuation</span>
        </button>
      </div>

      <div className="page-section" style={{ padding: 18 }}>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="stat-card">
            <p>TOTAL INVENTORY VALUATION</p>
            <strong style={{ color: 'var(--primary)' }}>{formatCurrency(totalOnHandValue)}</strong>
          </div>
          <div className="stat-card">
            <p>TOTAL SELLABLE UNITS</p>
            <strong style={{ color: '#52e37e' }}>{totalAvailableUnits.toLocaleString()} Units</strong>
          </div>
          <div className="stat-card">
            <p>ACTIVE SKU COUNT</p>
            <strong>{products.length} Products</strong>
          </div>
        </div>

        {/* Category Pills Header */}
        <div className="category-filter-bar" style={{ marginBottom: 14 }}>
          <button
            className={`cat-chip ${selectedCategory === '' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('')}
          >
            All Stock ({products.length})
          </button>
          {categories.map(c => {
            const count = products.filter(p => p.category_id === c.id).length;
            return (
              <button
                key={c.id}
                className={`cat-chip ${selectedCategory === c.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(c.id)}
              >
                {c.name} ({count})
              </button>
            );
          })}
        </div>

        <div className="panel-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 12, borderBottom: '1px solid var(--line)' }}>
            <input
              type="text"
              placeholder="Filter stock balances by code or product name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ maxWidth: 450 }}
            />
          </div>

          <div className="table-responsive" style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 950 }}>
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
                      <td className="mono font-semibold" style={{ color: 'var(--primary)' }}>{p.item_code}</td>
                      <td style={{ fontWeight: 700, whiteSpace: 'normal', minWidth: 200, maxWidth: 360 }}>{p.name}</td>
                      <td className="mono font-semibold">{stock.qty_on_hand}</td>
                      <td className="mono" style={{ color: stock.qty_reserved > 0 ? '#ffca58' : 'inherit' }}>{stock.qty_reserved}</td>
                      <td className="mono font-semibold" style={{ color: stock.qty_available > 0 ? '#52e37e' : '#ff8e8e' }}>
                        {stock.qty_available}
                      </td>
                      <td className="mono" style={{ color: stock.qty_in_transit > 0 ? 'var(--primary)' : 'inherit' }}>{stock.qty_in_transit}</td>
                      <td className="mono" style={{ color: stock.qty_damaged > 0 ? '#ff8e8e' : 'inherit' }}>{stock.qty_damaged}</td>
                      <td className="mono">{formatCurrency(p.weighted_cost_lkr)}</td>
                      <td className="mono font-semibold">{formatCurrency(valuation)}</td>
                      <td>
                        <button
                          onClick={() => setSelectedProductMovements(p)}
                          className="secondary-button small-button"
                        >
                          Ledger
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
                      {products.length === 0 ? 'No products or inventory on record. Use Import Products to load stock.' : 'No stock items match your search.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Movement Ledger Modal */}
      {selectedProductMovements && (
        <div className="modal-overlay">
          <div className="modal-box modal-lg">
            <div className="modal-header">
              <h3>Stock Movement Ledger: {selectedProductMovements.name}</h3>
              <button onClick={() => setSelectedProductMovements(null)} className="modal-close">&times;</button>
            </div>

            <div className="modal-body">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Movement Type</th>
                    <th>Doc Ref</th>
                    <th>Qty Change</th>
                    <th>Cost Snapshot</th>
                    <th>Balance After</th>
                  </tr>
                </thead>
                <tbody>
                  {stockMovements.filter(m => m.product_id === selectedProductMovements.id).map((mv, idx) => (
                    <tr key={idx}>
                      <td>{formatDate(mv.created_at)}</td>
                      <td><span className="badge badge-neutral">{mv.movement_type?.replace('_', ' ')}</span></td>
                      <td className="mono">{mv.reference_doc_no || '-'}</td>
                      <td className="mono font-semibold" style={{ color: mv.qty_change > 0 ? '#52e37e' : '#ff8e8e' }}>
                        {mv.qty_change > 0 ? `+${mv.qty_change}` : mv.qty_change}
                      </td>
                      <td className="mono">{formatCurrency(mv.unit_cost_snapshot)}</td>
                      <td className="mono font-semibold">{mv.balance_after}</td>
                    </tr>
                  ))}
                  {stockMovements.filter(m => m.product_id === selectedProductMovements.id).length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>
                        No audit ledger records yet for this product.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="modal-footer">
              <button onClick={() => setSelectedProductMovements(null)} className="secondary-button">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
