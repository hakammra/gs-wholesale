import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency, calculateWholesaleItemPrice } from '../../lib/formatters';

export default function ProductSearchGrid({ onAddToCart, customer }) {
  const { products = [], categories = [], stockBalances = {}, getCategoryPath } = useBusiness();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState(null); // null = root
  const inputRef = useRef(null);

  // Focus shortcut '/'
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Helper to get all descendant category IDs for a folder
  const getAllDescendantCatIds = (folderId) => {
    if (!folderId) return [];
    const ids = [folderId];
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

  // Direct child folders at current level
  const currentLevelFolders = useMemo(() => {
    return categories
      .filter(c => (currentFolderId ? c.parent_id === currentFolderId : !c.parent_id))
      .map(c => {
        const subtreeIds = getAllDescendantCatIds(c.id);
        const count = products.filter(p => subtreeIds.includes(p.category_id)).length;
        return { ...c, productCount: count };
      });
  }, [categories, currentFolderId, products]);

  // Current folder object
  const currentCategory = useMemo(() => {
    return categories.find(c => c.id === currentFolderId) || null;
  }, [categories, currentFolderId]);

  // Breadcrumb Trail calculation
  const breadcrumbs = useMemo(() => {
    if (!currentFolderId) return [];
    const trail = [];
    let curId = currentFolderId;
    let depth = 0;
    while (curId && depth < 10) {
      const cat = categories.find(c => c.id === curId);
      if (!cat) break;
      trail.unshift(cat);
      curId = cat.parent_id;
      depth++;
    }
    return trail;
  }, [categories, currentFolderId]);

  // Products filter
  const visibleProducts = useMemo(() => {
    return products.filter(p => {
      // If folder selected and not searching globally, filter by folder subtree
      if (currentFolderId && !searchTerm) {
        const subtreeIds = getAllDescendantCatIds(currentFolderId);
        if (!subtreeIds.includes(p.category_id)) return false;
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
  }, [products, currentFolderId, searchTerm, categories]);

  return (
    <div className="product-search-panel" style={{ padding: 10 }}>
      {/* Top Search Bar with Shortcut */}
      <div className="pos-search-bar" style={{ marginBottom: 8 }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search product name, code, barcode (Press '/')..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
          style={{ padding: '8px 10px', fontSize: 13 }}
        />
        <span style={{ fontSize: 20 }}>⌕</span>
      </div>

      {/* Category Folders Filter Pills (Fully displayed without scrollbar) */}
      <div className="category-filter-bar" style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button
          type="button"
          className={`cat-chip ${currentFolderId === null && !searchTerm ? 'active' : ''}`}
          onClick={() => { setSearchTerm(''); setCurrentFolderId(null); }}
          style={{ fontSize: 11.5, padding: '4px 10px', whiteSpace: 'normal', wordBreak: 'break-word', height: 'auto' }}
        >
          All ({products.length})
        </button>
        {categories.filter(c => !c.parent_id).map(c => {
          const subtreeIds = getAllDescendantCatIds(c.id);
          const count = products.filter(p => subtreeIds.includes(p.category_id)).length;
          const isSelected = currentFolderId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              className={`cat-chip ${isSelected && !searchTerm ? 'active' : ''}`}
              onClick={() => { setSearchTerm(''); setCurrentFolderId(c.id); }}
              style={{ fontSize: 11.5, padding: '4px 10px', whiteSpace: 'normal', wordBreak: 'break-word', height: 'auto', textAlign: 'left' }}
            >
              📁 {c.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Breadcrumb Trail if inside sub-folder */}
      {breadcrumbs.length > 0 && (
        <div className="pos-breadcrumbs" style={{ marginBottom: 8, padding: '2px 0', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          <button
            type="button"
            onClick={() => { setSearchTerm(''); setCurrentFolderId(null); }}
            style={{ padding: '3px 8px', fontSize: 11 }}
          >
            🏠 Root
          </button>
          {breadcrumbs.map((crumb, index) => {
            const isCurrent = index === breadcrumbs.length - 1;
            return (
              <button
                key={crumb.id}
                type="button"
                onClick={() => { setSearchTerm(''); setCurrentFolderId(crumb.id); }}
                style={{
                  background: isCurrent && !searchTerm ? 'var(--primary)' : '#292929',
                  color: isCurrent && !searchTerm ? '#000' : 'var(--text)',
                  fontWeight: isCurrent ? 700 : 500,
                  padding: '3px 8px',
                  fontSize: 11,
                  whiteSpace: 'normal',
                  wordBreak: 'break-word'
                }}
              >
                <span>›</span> {crumb.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Sub-Folders Grid if current level has children (Fully displayed without truncation) */}
      {!searchTerm.trim() && currentLevelFolders.length > 0 && currentFolderId !== null && (
        <div className="pos-category-tiles" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6, marginBottom: 8 }}>
          <button
            type="button"
            className="pos-category-tile back"
            onClick={() => setCurrentFolderId(currentCategory?.parent_id || null)}
            style={{ minHeight: 44, padding: '6px 10px', height: 'auto' }}
          >
            <strong style={{ fontSize: 12 }}>← Back</strong>
          </button>

          {currentLevelFolders.map(folder => (
            <button
              key={folder.id}
              type="button"
              className="pos-category-tile"
              onClick={() => { setSearchTerm(''); setCurrentFolderId(folder.id); }}
              style={{ minHeight: 44, padding: '6px 10px', height: 'auto', textAlign: 'left' }}
            >
              <strong style={{ fontSize: 12, display: 'block', whiteSpace: 'normal', wordBreak: 'break-word' }}>📁 {folder.name}</strong>
              <small style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>{folder.productCount} items</small>
            </button>
          ))}
        </div>
      )}

      {/* Product Results Grid (Shop-POS Product Tiles Style) */}
      <div className="pos-product-tiles">
        {visibleProducts.map(p => {
          const stock = stockBalances[p.id] || { qty_available: 0, qty_in_transit: 0 };
          const price = calculateWholesaleItemPrice(p, 1, customer);
          const hasAvailable = (stock.qty_available || 0) > 0;
          const hasTransit = (stock.qty_in_transit || 0) > 0;
          const catPath = getCategoryPath ? getCategoryPath(p.category_id) : '';

          return (
            <div
              key={p.id}
              className={`product-tile ${!hasAvailable ? (hasTransit ? 'in-transit-tile' : 'out-of-stock') : ''}`}
              onClick={() => onAddToCart(p, 1, false)}
            >
              <div>
                <div className="pos-product-name" title={p.name}>
                  {p.name}
                </div>
                <div className="pos-product-code">
                  {p.item_code}
                  {p.model && <span style={{ color: '#888' }}> &bull; {p.model}</span>}
                </div>
                {catPath && (
                  <div style={{ fontSize: 10.5, color: '#777', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    📁 {catPath}
                  </div>
                )}
              </div>

              <div>
                <div className="pos-product-price">
                  {formatCurrency(price)}
                </div>

                <div className="pos-product-footer">
                  <span
                    className="pos-product-stock"
                    style={{ color: hasAvailable ? '#52e37e' : (hasTransit ? '#ffca58' : '#ef4444') }}
                  >
                    {hasAvailable
                      ? `● ${stock.qty_available} Avail${hasTransit ? ` (+${stock.qty_in_transit} transit)` : ''}`
                      : (hasTransit ? `● ${stock.qty_in_transit} In Transit` : '● Out of Stock')}
                  </span>

                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onAddToCart(p, 1, false); }}
                      className="secondary-button small-button"
                      style={{ padding: '2px 6px', fontSize: 11, fontWeight: 700 }}
                      title="Add to Bill"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onAddToCart(p, 1, true); }}
                      className="secondary-button small-button"
                      style={{ padding: '2px 6px', fontSize: 10, color: '#52e37e', borderColor: 'rgba(82, 227, 126, 0.4)' }}
                      title="Add as 0-Price Warranty Replacement"
                    >
                      🛡️
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {visibleProducts.length === 0 && (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            color: 'var(--muted)',
            padding: '36px 20px',
            background: '#222',
            border: '1px dashed var(--line)',
            borderRadius: 6,
            fontSize: 13
          }}>
            {searchTerm
              ? `No products found matching "${searchTerm}"`
              : (currentCategory ? `No products inside "${currentCategory.name}" folder.` : 'No products found. Add products to start selling.')}
          </div>
        )}
      </div>
    </div>
  );
}
