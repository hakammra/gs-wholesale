import React, { useState, useRef, useMemo } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency } from '../../lib/formatters';
import { exportToExcel, parseExcelFile, downloadProductExcelTemplate } from '../../lib/exportUtils';
import CategoryManagerModal from '../../components/categories/CategoryManagerModal';

export default function ProductList() {
  const {
    products,
    saveProduct,
    deleteProduct,
    importProductsFromExcel,
    categories,
    brands,
    stockBalances,
    getCategoryPath,
    salesDocuments = [],
    purchases = [],
    transitShipments = [],
    supplierOrders = []
  } = useBusiness();

  const { notifySuccess, notifyError, notifyWarning } = useNotification();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleDeleteProduct = (p) => {
    const linkedSales = (salesDocuments || []).filter(d => (d.items || []).some(it => it.product_id === p.id));
    const linkedPurchases = (purchases || []).filter(pur => (pur.items || []).some(it => it.product_id === p.id));
    const linkedTransit = (transitShipments || []).filter(s => (s.items || []).some(it => it.product_id === p.id));
    const linkedSupplierOrders = (supplierOrders || []).filter(o => (o.items || []).some(it => it.product_id === p.id));

    const totalDocs = linkedSales.length + linkedPurchases.length + linkedTransit.length + linkedSupplierOrders.length;

    if (totalDocs > 0) {
      const docRefs = [
        ...linkedSales.map(d => `${d.doc_no} (${d.doc_type?.replace('_', ' ')})`),
        ...linkedPurchases.map(pur => `${pur.doc_no || pur.grn_no} (purchase doc)`),
        ...linkedTransit.map(s => `${s.shipment_no} (in-transit shipment)`),
        ...linkedSupplierOrders.map(o => `${o.order_no} (supplier order)`)
      ].filter(Boolean);

      window.alert(
        `Cannot delete "${p.name}":\n\n` +
        `This product is currently included in ${totalDocs} document(s):\n` +
        `• ${docRefs.slice(0, 5).join('\n• ')}${docRefs.length > 5 ? `\n...and ${docRefs.length - 5} more` : ''}\n\n` +
        `To delete this product, please delete or remove it from these document(s) first.`
      );
      return;
    }

    if (window.confirm(`Are you sure you want to delete product "${p.name}" (${p.item_code})? This will also remove its inventory record.`)) {
      deleteProduct(p.id);
    }
  };

  // Build Hierarchical Category Tree & Flattened List for dropdowns
  const { categoryTree, flatCategories } = useMemo(() => {
    const buildTree = (cats, parentId = null, level = 0) => {
      return cats
        .filter(c => (parentId ? c.parent_id === parentId : !c.parent_id))
        .map(c => ({
          ...c,
          level,
          children: buildTree(cats, c.id, level + 1),
          productCount: products.filter(p => p.category_id === c.id).length
        }));
    };

    const tree = buildTree(categories);

    const flatten = (nodes) => {
      let res = [];
      for (const node of nodes) {
        res.push(node);
        if (node.children?.length > 0) {
          res = res.concat(flatten(node.children));
        }
      }
      return res;
    };

    return { categoryTree: tree, flatCategories: flatten(tree) };
  }, [categories, products]);

  // Find all child category IDs of a selected category
  const getSubcategoryIds = (catId) => {
    if (!catId) return [];
    const ids = [catId];
    let added = true;
    while (added) {
      added = false;
      categories.forEach(c => {
        if (c.parent_id && ids.includes(c.parent_id) && !ids.includes(c.id)) {
          ids.push(c.id);
          added = true;
        }
      });
    }
    return ids;
  };

  const filteredProducts = products.filter(p => {
    if (selectedCategory) {
      const allowedCatIds = getSubcategoryIds(selectedCategory);
      if (!allowedCatIds.includes(p.category_id)) return false;
    }
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
    if (products.length === 0) {
      notifyWarning('No products to export. Import products first.');
      return;
    }
    const data = products.map(p => {
      const catPath = getCategoryPath(p.category_id);
      const stock = stockBalances[p.id] || { qty_available: 0, qty_on_hand: 0 };
      const cost = Number(p.weighted_cost_lkr) || 0;
      const price = Number(p.wholesale_price) || 0;
      const markup = cost > 0 ? (((price - cost) / cost) * 100).toFixed(2) : '0.00';

      return {
        'SKU/Code': p.item_code,
        'Name': p.name,
        'Category': catPath || '',
        'Barcode': p.barcode || '',
        'Model': p.model || '',
        'Cost': cost,
        'Markup %': markup,
        'Price': price,
        'Wholesale Price': price,
        'Dealer Price': p.dealer_price || 0,
        'Stock Quantity': stock.qty_available,
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
      <div className="action-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setEditingProduct({
              name: '', item_code: '', barcode: '', model: '', brand: '', brand_id: '',
              category_id: '', wholesale_price: 0, dealer_price: 0, weighted_cost_lkr: 0,
              low_stock_threshold: 5, is_active: true
            })}
            className="toolbar-button bright"
          >
            <span className="icon">+</span>
            <span>Add Product</span>
          </button>

          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="toolbar-button"
            style={{ fontWeight: 600 }}
          >
            <span className="icon">📁</span>
            <span>Manage Category Folders ({categories.length})</span>
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
      </div>

      <div className="page-section" style={{ padding: 18 }}>
        {/* Category Folders Filter Pills */}
        <div className="category-filter-bar" style={{ marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <button
            className={`cat-chip ${selectedCategory === '' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('')}
          >
            All Products ({products.length})
          </button>
          {flatCategories.map(c => {
            const allowedIds = getSubcategoryIds(c.id);
            const count = products.filter(p => allowedIds.includes(p.category_id)).length;
            return (
              <button
                key={c.id}
                className={`cat-chip ${selectedCategory === c.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(c.id)}
                title={getCategoryPath(c.id)}
              >
                {c.level > 0 ? '↳ ' : '📁 '}{c.name} ({count})
              </button>
            );
          })}
        </div>

        <div className="panel-card" style={{ padding: 0, overflow: 'hidden' }}>
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

          <div className="table-responsive" style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 1100 }}>
              <thead>
                <tr>
                  <th>SKU / Code</th>
                  <th>Product Name</th>
                  <th>Category Folder</th>
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
                  const catPath = getCategoryPath(p.category_id);
                  const stock = stockBalances[p.id] || { qty_available: 0 };
                  const cost = Number(p.weighted_cost_lkr || p.cost_price || p.cost) || 0;
                  const margin = p.wholesale_price > 0 ? (((p.wholesale_price - cost) / p.wholesale_price) * 100).toFixed(1) : 0;

                  return (
                    <tr key={p.id}>
                      <td className="mono font-semibold" style={{ color: 'var(--primary)' }}>{p.item_code}</td>
                      <td style={{ whiteSpace: 'normal', minWidth: 200, maxWidth: 320 }}>
                        <div style={{ fontWeight: 700 }}>{p.name}</div>
                        {p.model && <small style={{ color: 'var(--muted)' }}>Model: {p.model}</small>}
                      </td>
                      <td style={{ whiteSpace: 'normal', minWidth: 140 }}>
                        {catPath ? (
                          <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                            📁 {catPath}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: 11 }}>Uncategorized</span>
                        )}
                      </td>
                      <td><span className="badge badge-neutral">Pk: {p.pack_size || 1} &bull; Ctn: {p.carton_units || 1}</span></td>
                      <td className="mono">{formatCurrency(cost)}</td>
                      <td className="mono font-semibold" style={{ color: 'var(--primary)' }}>{formatCurrency(p.wholesale_price)}</td>
                      <td className="mono">{formatCurrency(p.dealer_price || 0)}</td>
                      <td className="mono font-semibold" style={{ color: margin >= 5 ? '#52e37e' : '#ffca58' }}>{margin}%</td>
                      <td className="mono font-semibold">
                        <span style={{ color: (stock.qty_available || 0) > 0 ? '#52e37e' : '#ff8e8e' }}>
                          {stock.qty_available || 0}
                        </span>
                        {(stock.qty_in_transit || 0) > 0 && (
                          <div style={{ fontSize: 11, color: '#ffca58', marginTop: 2, fontWeight: 700 }}>
                            + {stock.qty_in_transit} in transit
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${p.is_active ? 'success' : 'danger'}`}>
                          {p.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button onClick={() => setEditingProduct(p)} className="secondary-button small-button">
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p)}
                            className="secondary-button small-button"
                            style={{ color: '#ff8e8e', borderColor: 'rgba(255, 142, 142, 0.4)', padding: '4px 8px' }}
                            title="Delete Product"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                      No products found matching your filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <label style={{ margin: 0 }}>Category Folder</label>
                      <button
                        type="button"
                        onClick={() => setIsCategoryModalOpen(true)}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 11, padding: 0 }}
                      >
                        + Manage Folders
                      </button>
                    </div>
                    <select
                      value={editingProduct.category_id || ''}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, category_id: e.target.value }))}
                    >
                      <option value="">-- No Category (Unassigned) --</option>
                      {flatCategories.map(c => (
                        <option key={c.id} value={c.id}>
                          {'\u00A0'.repeat(c.level * 4)}📁 {c.name} ({getCategoryPath(c.id)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Brand (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Dell, HP, Kingston (or in Name)"
                      value={editingProduct.brand || (brands.find(b => b.id === editingProduct.brand_id)?.name) || ''}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, brand: e.target.value, brand_id: '' }))}
                    />
                  </div>
                  <div>
                    <label>Model / Specs (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 7050 SFF / DDR4 2666"
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                  <div>
                    <label>Low Stock Alert Threshold (Units)</label>
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

      {/* Category Folders Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />
    </div>
  );
}
