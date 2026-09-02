import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print(f'Wrote {path}')

# src/pages/Products/ProductList.jsx
write_file('src/pages/Products/ProductList.jsx', """
import React, { useState, useRef } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency } from '../../lib/formatters';
import { exportToExcel, parseExcelFile, downloadProductExcelTemplate } from '../../lib/exportUtils';

export default function ProductList() {
  const { products, saveProduct, importProductsFromExcel, categories, brands, stockBalances } = useBusiness();
  const { notifySuccess, notifyError, notifyWarning } = useNotification();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  const filteredProducts = products.filter(p => {
    if (selectedCategory && p.category_id !== selectedCategory) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return p.name?.toLowerCase().includes(term) || p.item_code?.toLowerCase().includes(term) || p.barcode?.includes(term);
  });

  const handleExport = () => {
    if (products.length === 0) {
      notifyWarning('No products to export. Import products first.');
      return;
    }
    const data = products.map(p => {
      const cat = categories.find(c => c.id === p.category_id);
      const stock = stockBalances[p.id] || { qty_available: 0, qty_on_hand: 0 };
      const cost = Number(p.weighted_cost_lkr) || 0;
      const price = Number(p.wholesale_price) || 0;
      const markup = cost > 0 ? (((price - cost) / cost) * 100).toFixed(2) : '0.00';

      return {
        'SKU/Code': p.item_code,
        'Name': p.name,
        'Category': cat?.name || '',
        'Barcode': p.barcode || '',
        'Model': p.model || '',
        'Cost': cost,
        'Markup %': markup,
        'Price': price,
        'Wholesale Price': price,
        'Dealer Price': p.dealer_price || 0,
        'Stock Quantity': stock.qty_available,
        'Pack Size': p.pack_size || 1,
        'Carton Units': p.carton_units || 1,
        'Low Stock Level': p.low_stock_threshold || 5,
        'Status': p.is_active ? 'active' : 'inactive'
      };
    });
    exportToExcel(data, 'GS_Wholesale_Products');
    notifySuccess('Products exported to Excel');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsImporting(true);
    try {
      const rows = await parseExcelFile(file);
      if (!rows || rows.length === 0) {
        throw new Error('Selected file contains no data rows.');
      }

      const res = await importProductsFromExcel(rows);
      notifySuccess(`Excel import complete: ${res.importedCount} products imported/updated, ${res.skippedCount} skipped.`);
    } catch (err) {
      notifyError(`Import failed: ${err.message || String(err)}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    saveProduct(editingProduct);
    setEditingProduct(null);
  };

  return (
    <div>
      {/* Action Toolbar */}
      <div className="action-toolbar">
        <button
          onClick={() => setEditingProduct({
            name: '', item_code: '', barcode: '', model: '', brand_id: brands[0]?.id || '',
            category_id: categories[0]?.id || '', unit_name: 'Unit', pack_size: 10, carton_units: 100,
            wholesale_price: 5000, dealer_price: 4800, weighted_cost_lkr: 4000, low_stock_threshold: 10,
            is_active: true
          })}
          className="toolbar-button bright"
        >
          <span className="icon">+</span>
          <span>Add Product</span>
        </button>

        {/* Hidden File Input for Excel Import */}
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
          <span>{isImporting ? 'Importing Excel...' : 'Import Excel / CSV'}</span>
        </button>

        <button onClick={downloadProductExcelTemplate} className="toolbar-button">
          <span className="icon">📄</span>
          <span>Download Template</span>
        </button>

        <button onClick={handleExport} className="toolbar-button">
          <span className="icon">⤓</span>
          <span>Export Excel</span>
        </button>
      </div>

      <div className="page-section" style={{ padding: 18 }}>
        {/* Category Pills Header */}
        <div className="category-filter-bar" style={{ marginBottom: 14 }}>
          <button
            className={`cat-chip ${selectedCategory === '' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('')}
          >
            All Products ({products.length})
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

        <div className="panel-card" style={{ padding: 0 }}>
          <div style={{ padding: 12, borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search by code, SKU, barcode, model, or product name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ maxWidth: 450 }}
            />
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              Showing <strong>{filteredProducts.length}</strong> of <strong>{products.length}</strong> items
            </span>
          </div>

          <table>
            <thead>
              <tr>
                <th>SKU / Code</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Pack / Carton</th>
                <th>Cost (WAC)</th>
                <th>Wholesale Price</th>
                <th>Dealer Price</th>
                <th>Margin %</th>
                <th>Available</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => {
                const cat = categories.find(c => c.id === p.category_id);
                const stock = stockBalances[p.id] || { qty_available: 0 };
                const cost = Number(p.weighted_cost_lkr) || 0;
                const margin = p.wholesale_price > 0 ? (((p.wholesale_price - cost) / p.wholesale_price) * 100).toFixed(1) : 0;

                return (
                  <tr key={p.id}>
                    <td className="mono font-semibold" style={{ color: 'var(--primary)' }}>{p.item_code}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      {p.model && <small style={{ color: 'var(--muted)' }}>Model: {p.model}</small>}
                    </td>
                    <td><span className="badge badge-neutral">{cat?.name || 'General'}</span></td>
                    <td><span className="badge badge-neutral">Pk: {p.pack_size || 1} &bull; Ctn: {p.carton_units || 1}</span></td>
                    <td className="mono">{formatCurrency(cost)}</td>
                    <td className="mono font-semibold" style={{ color: 'var(--primary)' }}>{formatCurrency(p.wholesale_price)}</td>
                    <td className="mono">{formatCurrency(p.dealer_price || 0)}</td>
                    <td className="mono font-semibold" style={{ color: margin >= 5 ? '#52e37e' : '#ffca58' }}>{margin}%</td>
                    <td className="mono font-semibold" style={{ color: stock.qty_available > 0 ? '#52e37e' : '#ff8e8e' }}>
                      {stock.qty_available}
                    </td>
                    <td>
                      <span className={`badge badge-${p.is_active ? 'success' : 'danger'}`}>
                        {p.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => setEditingProduct(p)} className="secondary-button small-button">
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
                    {products.length === 0 ? (
                      <div>
                        <p style={{ fontSize: 16, marginBottom: 12 }}>No products in database yet.</p>
                        <button onClick={() => fileInputRef.current?.click()} className="primary-button" style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                          <span>⤒</span> Import Products from Excel / CSV
                        </button>
                      </div>
                    ) : (
                      'No products match your search or filter.'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="modal-overlay">
          <div className="modal-box modal-lg">
            <div className="modal-header">
              <h3>{editingProduct.id ? `Edit Product: ${editingProduct.item_code}` : 'Add Wholesale Product'}</h3>
              <button onClick={() => setEditingProduct(null)} className="modal-close">&times;</button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px', gap: 12 }}>
                  <div>
                    <label>Product Name *</label>
                    <input
                      type="text"
                      required
                      value={editingProduct.name}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>Item Code / SKU</label>
                    <input
                      type="text"
                      className="mono"
                      value={editingProduct.item_code}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, item_code: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>Barcode</label>
                    <input
                      type="text"
                      className="mono"
                      value={editingProduct.barcode || ''}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, barcode: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label>Category</label>
                    <select
                      value={editingProduct.category_id || ''}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, category_id: e.target.value }))}
                    >
                      <option value="">-- General Category --</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Brand</label>
                    <select
                      value={editingProduct.brand_id || ''}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, brand_id: e.target.value }))}
                    >
                      <option value="">-- Select Brand --</option>
                      {brands.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Model / Specs</label>
                    <input
                      type="text"
                      value={editingProduct.model || ''}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, model: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label>Wholesale Price (Rs) *</label>
                    <input
                      type="number"
                      required
                      className="mono"
                      value={editingProduct.wholesale_price}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, wholesale_price: Number(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label>Dealer Price (Rs)</label>
                    <input
                      type="number"
                      className="mono"
                      value={editingProduct.dealer_price}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, dealer_price: Number(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label>Cost Price / WAC (Rs)</label>
                    <input
                      type="number"
                      className="mono"
                      value={editingProduct.weighted_cost_lkr}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, weighted_cost_lkr: Number(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label>Pack Size (Units)</label>
                    <input
                      type="number"
                      className="mono"
                      value={editingProduct.pack_size || 1}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, pack_size: Number(e.target.value) || 1 }))}
                    />
                  </div>
                  <div>
                    <label>Carton Units</label>
                    <input
                      type="number"
                      className="mono"
                      value={editingProduct.carton_units || 1}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, carton_units: Number(e.target.value) || 1 }))}
                    />
                  </div>
                  <div>
                    <label>Low Stock Level</label>
                    <input
                      type="number"
                      className="mono"
                      value={editingProduct.low_stock_threshold || 5}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, low_stock_threshold: Number(e.target.value) || 5 }))}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setEditingProduct(null)} className="secondary-button">
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
""")

# src/pages/Inventory/InventoryStockList.jsx
write_file('src/pages/Inventory/InventoryStockList.jsx', """
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

        <div className="panel-card" style={{ padding: 0 }}>
          <div style={{ padding: 12, borderBottom: '1px solid var(--line)' }}>
            <input
              type="text"
              placeholder="Filter stock balances by code or product name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ maxWidth: 450 }}
            />
          </div>

          <table>
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
                    <td style={{ fontWeight: 700 }}>{p.name}</td>
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
""")

print("ProductList.jsx and InventoryStockList.jsx updated with Excel import, template download, and Shop-POS columns.")
