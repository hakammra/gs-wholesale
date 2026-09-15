import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency, calculateWholesaleItemPrice } from '../../lib/formatters';

const TRANSIT_GROUPS_FOLDER_ID = '__transit_groups__';
const UNCATEGORIZED_FOLDER_ID = '__uncategorized__';

export default function ProductSearchGrid({ onAddToCart, customer }) {
  const { products = [], categories = [], transitGroups = [], transitShipments = [], salesDocuments = [], stockBalances = {}, getCategoryPath } = useBusiness();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState(null); // null = root
  const [stockView, setStockView] = useState('on_hand');
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

  const rootCategories = useMemo(() => categories.filter(category => !category.parent_id), [categories]);

  // Direct child folders at the current level. Products are opened like a file browser:
  // root folders first, then the immediate folders/products inside the selected folder.
  const currentLevelFolders = useMemo(() => {
    if (currentFolderId === TRANSIT_GROUPS_FOLDER_ID || currentFolderId === UNCATEGORIZED_FOLDER_ID) return [];
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
    if (currentFolderId === TRANSIT_GROUPS_FOLDER_ID) return [{ id: TRANSIT_GROUPS_FOLDER_ID, name: 'Unconfirmed Transit Groups' }];
    if (currentFolderId === UNCATEGORIZED_FOLDER_ID) return [{ id: UNCATEGORIZED_FOLDER_ID, name: 'Uncategorized Products' }];
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
      const stock = stockBalances[p.id] || {};
      const incomingAvailable = Math.max(0, (Number(stock.qty_in_transit) || 0) - (Number(stock.qty_in_transit_reserved) || 0));
      if (stockView === 'incoming' && incomingAvailable <= 0) return false;

      // Search is global. Without a search, show only direct products in the open folder.
      if (!searchTerm.trim()) {
        if (currentFolderId === TRANSIT_GROUPS_FOLDER_ID) return false;
        if (currentFolderId === UNCATEGORIZED_FOLDER_ID) return !p.category_id;
        if (!currentFolderId) return rootCategories.length === 0 && !p.category_id;
        if (p.category_id !== currentFolderId) return false;
      }

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        p.name?.toLowerCase().includes(term) ||
        p.item_code?.toLowerCase().includes(term) ||
        p.barcode?.includes(term) ||
        p.model?.toLowerCase().includes(term)
      );
    });
  }, [products, currentFolderId, searchTerm, rootCategories, stockBalances, stockView]);

  const incomingGroupRecords = useMemo(() => transitGroups.map(group => {
    const incoming = transitShipments
      .filter(shipment => shipment.status === 'in_transit')
      .flatMap(shipment => shipment.items || [])
      .filter(item => item.transit_group_id === group.id)
      .reduce((sum, item) => sum + (Number(item.shipped_qty || item.qty) || 0), 0);
    const reserved = salesDocuments
      .filter(document => (document.doc_type === 'reserved_order' || document.doc_type === 'sales_order') && (document.status === 'reserved' || document.status === 'confirmed'))
      .flatMap(document => document.items || [])
      .filter(item => item.transit_group_id === group.id)
      .reduce((sum, item) => sum + (Number(item.reserved_in_transit_qty) || 0), 0);
    return {
      ...group,
      id: `transit-group:${group.id}`,
      transit_group_id: group.id,
      is_transit_group: true,
      item_code: 'GROUP',
      wholesale_price: 0,
      dealer_price: 0,
      weighted_cost_lkr: 0,
      qty_in_transit: incoming,
      qty_in_transit_reserved: reserved,
      incoming_available: Math.max(0, incoming - reserved)
    };
  }).filter(group => group.incoming_available > 0), [transitGroups, transitShipments, salesDocuments]);

  const visibleIncomingGroups = useMemo(() => stockView === 'incoming' ? incomingGroupRecords.filter(group => (
    searchTerm.trim()
      ? group.name.toLowerCase().includes(searchTerm.toLowerCase())
      : currentFolderId === TRANSIT_GROUPS_FOLDER_ID
  )) : [], [incomingGroupRecords, searchTerm, stockView, currentFolderId]);

  const uncategorizedCount = products.filter(product => !product.category_id).length;
  const availableTransitGroupCount = stockView === 'incoming' ? incomingGroupRecords.length : 0;

  const openFolder = (folderId) => {
    setSearchTerm('');
    setCurrentFolderId(folderId);
  };

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

      <div style={{ display: 'flex', gap: 6, marginBottom: 8, borderBottom: '1px solid var(--line)', paddingBottom: 6 }}>
        <button
          type="button"
          className={`secondary-button ${stockView === 'on_hand' ? 'active' : ''}`}
          onClick={() => { setStockView('on_hand'); setCurrentFolderId(null); }}
          style={{ flex: 1, fontWeight: 800, borderColor: stockView === 'on_hand' ? '#52e37e' : undefined, color: stockView === 'on_hand' ? '#52e37e' : undefined }}
        >
          In Stock
        </button>
        <button
          type="button"
          className={`secondary-button ${stockView === 'incoming' ? 'active' : ''}`}
          onClick={() => { setStockView('incoming'); setCurrentFolderId(null); }}
          style={{ flex: 1, fontWeight: 800, borderColor: stockView === 'incoming' ? '#ffca58' : undefined, color: stockView === 'incoming' ? '#ffca58' : undefined }}
        >
          In Transit · Reserve Only
        </button>
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

      {/* Product Results Grid (Shop-POS Product Tiles Style) */}
      <div className="pos-product-tiles">
        {!searchTerm.trim() && currentFolderId !== null && (
          <button
            type="button"
            className="product-tile pos-folder-product-tile back"
            onClick={() => openFolder(currentCategory?.parent_id || null)}
          >
            <span className="pos-folder-icon" aria-hidden="true">←</span>
            <div>
              <div className="pos-product-name">Back</div>
              <div className="pos-product-code">Previous folder</div>
            </div>
          </button>
        )}

        {!searchTerm.trim() && currentLevelFolders.map(folder => (
          <button
            key={folder.id}
            type="button"
            className="product-tile pos-folder-product-tile"
            onClick={() => openFolder(folder.id)}
          >
            <span className="pos-folder-icon" aria-hidden="true">📁</span>
            <div>
              <div className="pos-product-name">{folder.name}</div>
              <div className="pos-product-code">{folder.productCount} product{folder.productCount === 1 ? '' : 's'}</div>
            </div>
          </button>
        ))}

        {!searchTerm.trim() && currentFolderId === null && uncategorizedCount > 0 && (
          <button
            type="button"
            className="product-tile pos-folder-product-tile"
            onClick={() => openFolder(UNCATEGORIZED_FOLDER_ID)}
          >
            <span className="pos-folder-icon" aria-hidden="true">📦</span>
            <div>
              <div className="pos-product-name">Uncategorized Products</div>
              <div className="pos-product-code">{uncategorizedCount} product{uncategorizedCount === 1 ? '' : 's'}</div>
            </div>
          </button>
        )}

        {!searchTerm.trim() && currentFolderId === null && availableTransitGroupCount > 0 && (
          <button
            type="button"
            className="product-tile pos-folder-product-tile transit-folder"
            onClick={() => openFolder(TRANSIT_GROUPS_FOLDER_ID)}
          >
            <span className="pos-folder-icon" aria-hidden="true">🚚</span>
            <div>
              <div className="pos-product-name">Unconfirmed Transit Groups</div>
              <div className="pos-product-code">{availableTransitGroupCount} group{availableTransitGroupCount === 1 ? '' : 's'}</div>
            </div>
          </button>
        )}

        {visibleIncomingGroups.map(group => (
          <div key={group.id} className="product-tile in-transit-tile" onClick={() => onAddToCart(group, 1, false)}>
            <div>
              <div className="pos-product-name" title={group.name}>Any {group.name}</div>
              <div className="pos-product-code" style={{ color: '#ffca58' }}>UNCONFIRMED TRANSIT GROUP</div>
            </div>
            <div>
              <div className="pos-product-price" style={{ color: 'var(--muted)' }}>Set reservation price</div>
              <div className="pos-product-footer">
                <span className="pos-product-stock" style={{ color: '#ffca58' }}>● {group.incoming_available} Transit Available</span>
                <button type="button" onClick={(event) => { event.stopPropagation(); onAddToCart(group, 1, false); }} className="secondary-button small-button" style={{ padding: '2px 6px', fontSize: 11, fontWeight: 700 }}>+</button>
              </div>
            </div>
          </div>
        ))}
        {visibleProducts.map(p => {
          const stock = stockBalances[p.id] || { qty_available: 0, qty_in_transit: 0 };
          const price = calculateWholesaleItemPrice(p, 1, customer);
          const hasAvailable = (stock.qty_available || 0) > 0;
          const incomingAvailable = Math.max(0, (Number(stock.qty_in_transit) || 0) - (Number(stock.qty_in_transit_reserved) || 0));
          const hasTransit = incomingAvailable > 0;
          const canAdd = stockView === 'incoming' ? hasTransit : hasAvailable;
          const catPath = getCategoryPath ? getCategoryPath(p.category_id) : '';

          return (
            <div
              key={p.id}
              className={`product-tile ${canAdd ? (stockView === 'incoming' ? 'in-transit-tile' : '') : 'out-of-stock'}`}
              onClick={() => canAdd && onAddToCart(stockView === 'incoming' ? { ...p, pos_transit_only: true } : p, 1, false)}
              aria-disabled={!canAdd}
              title={!canAdd ? 'Out of stock' : undefined}
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
                    {stockView === 'incoming'
                      ? `● ${incomingAvailable} Transit Available`
                      : `● ${stock.qty_available} Available${hasTransit ? ` (+${incomingAvailable} transit)` : ''}`}
                  </span>

                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onAddToCart(stockView === 'incoming' ? { ...p, pos_transit_only: true } : p, 1, false); }}
                      disabled={!canAdd}
                      className="secondary-button small-button"
                      style={{ padding: '2px 6px', fontSize: 11, fontWeight: 700 }}
                      title="Add to Bill"
                    >
                      +
                    </button>
                    {stockView === 'on_hand' && <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onAddToCart(p, 1, true); }}
                      disabled={!canAdd}
                      className="secondary-button small-button"
                      style={{ padding: '2px 6px', fontSize: 10, color: '#52e37e', borderColor: 'rgba(82, 227, 126, 0.4)' }}
                      title="Add as 0-Price Warranty Replacement"
                    >
                      🛡️
                    </button>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {visibleProducts.length === 0 && visibleIncomingGroups.length === 0 &&
          (searchTerm.trim() || (currentFolderId !== null && currentLevelFolders.length === 0)) && (
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
              : `No ${stockView === 'incoming' ? 'unreserved in-transit' : ''} products inside "${breadcrumbs.at(-1)?.name || currentCategory?.name || 'this'}" folder.`}
          </div>
        )}
      </div>
    </div>
  );
}
