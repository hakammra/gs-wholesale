import React, { useState, useEffect, useMemo } from 'react';

export default function DocumentProductTree({
  categories = [],
  products = [],
  selectedCategoryId = 'all',
  setSelectedCategoryId,
  onProductClick,
  searchText = ''
}) {
  const [expanded, setExpanded] = useState(() => new Set(['root']));
  const cleanSearch = (searchText || '').trim().toLowerCase();
  const hasSearch = cleanSearch.length > 0;

  // Filter products by searchText
  const filteredProducts = useMemo(() => {
    if (!hasSearch) return products;
    return products.filter((p) => {
      const code = String(p.item_code || '').toLowerCase();
      const name = String(p.name || '').toLowerCase();
      const barcode = String(p.barcode || '').toLowerCase();
      const model = String(p.model || '').toLowerCase();
      return code.includes(cleanSearch) || name.includes(cleanSearch) || barcode.includes(cleanSearch) || model.includes(cleanSearch);
    });
  }, [products, cleanSearch, hasSearch]);

  // Build category hierarchy
  const children = useMemo(() => {
    const map = new Map();
    categories.forEach((cat) => {
      const parent = cat.parent_id || 'root';
      if (!map.has(parent)) map.set(parent, []);
      map.get(parent).push(cat);
    });
    for (const list of map.values()) {
      list.sort((a, b) => (a.path || a.name).localeCompare(b.path || b.name));
    }
    return map;
  }, [categories]);

  // Group filtered products by category ID
  const productsByCategory = useMemo(() => {
    const map = new Map();
    filteredProducts.forEach((product) => {
      const key = product.category_id || 'uncategorized';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(product);
    });
    for (const list of map.values()) {
      list.sort((a, b) => String(a.item_code || '').localeCompare(String(b.item_code || '')));
    }
    return map;
  }, [filteredProducts]);

  // Auto-expand all matching categories when search is active
  useEffect(() => {
    if (!hasSearch) return;
    const next = new Set(['root']);
    filteredProducts.forEach((product) => {
      const category = categories.find((cat) => cat.id === product.category_id);
      if (category) {
        let cur = category;
        let depth = 0;
        while (cur && depth < 10) {
          next.add(cur.id);
          cur = categories.find((c) => c.id === cur.parent_id);
          depth++;
        }
      } else {
        next.add('uncategorized');
      }
    });
    setExpanded(next);
  }, [hasSearch, filteredProducts, categories]);

  const toggleExpanded = (id) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasProductsInBranch = (category) => {
    if ((productsByCategory.get(category.id) || []).length) return true;
    const childCats = children.get(category.id) || [];
    return childCats.some((child) => hasProductsInBranch(child));
  };

  function renderProduct(product) {
    return (
      <button
        type="button"
        key={product.id || product.product_id}
        className="tree-product-item"
        onClick={() => onProductClick(product)}
        title={`Click to add ${product.name} (Code: ${product.item_code})`}
      >
        <span>◆</span>
        <strong>{product.item_code}</strong>
        <em>{product.name}</em>
      </button>
    );
  }

  function renderCategory(category, depth = 0) {
    const directProducts = productsByCategory.get(category.id) || [];
    const childCats = children.get(category.id) || [];
    if (!directProducts.length && !childCats.some((child) => hasProductsInBranch(child))) {
      return null;
    }
    const active = selectedCategoryId === category.id;
    const isExpanded = expanded.has(category.id);
    const hasChildren = childCats.length > 0 || directProducts.length > 0;

    return (
      <div key={category.id} className="tree-folder-block" style={{ marginLeft: `${depth * 10}px` }}>
        <div className={active ? 'tree-folder-row active' : 'tree-folder-row'}>
          <button
            type="button"
            className="tree-expand-button"
            onClick={() => hasChildren && toggleExpanded(category.id)}
          >
            {hasChildren ? (isExpanded ? '−' : '+') : ''}
          </button>
          <button
            type="button"
            className="tree-folder"
            onClick={() => {
              setSelectedCategoryId(category.id);
              if (!isExpanded && hasChildren) toggleExpanded(category.id);
            }}
          >
            <strong>📁</strong>
            <span>{category.name}</span>
          </button>
        </div>
        {isExpanded && (
          <div className="tree-folder-children">
            {childCats.map((child) => renderCategory(child, depth + 1))}
            {directProducts.map(renderProduct)}
          </div>
        )}
      </div>
    );
  }

  const uncategorizedProducts = productsByCategory.get('uncategorized') || [];
  const rootCategories = children.get('root') || [];
  const rootExpanded = expanded.has('root');

  return (
    <div className="document-product-tree">
      <div className={selectedCategoryId === 'all' ? 'tree-root-row active' : 'tree-root-row'}>
        <button
          type="button"
          className="tree-expand-button"
          onClick={() => toggleExpanded('root')}
        >
          {rootExpanded ? '−' : '+'}
        </button>
        <button
          type="button"
          className="tree-root"
          onClick={() => setSelectedCategoryId('all')}
        >
          <span>📁 All Products</span>
          <small>{filteredProducts.length}</small>
        </button>
      </div>

      {rootExpanded && (
        <div className="tree-folder-children">
          {rootCategories.map((cat) => renderCategory(cat, 0))}
          {uncategorizedProducts.length > 0 && (
            <div className="tree-folder-block">
              <div className={selectedCategoryId === 'uncategorized' ? 'tree-folder-row active' : 'tree-folder-row'}>
                <button
                  type="button"
                  className="tree-expand-button"
                  onClick={() => toggleExpanded('uncategorized')}
                >
                  {expanded.has('uncategorized') ? '−' : '+'}
                </button>
                <button
                  type="button"
                  className="tree-folder"
                  onClick={() => setSelectedCategoryId('uncategorized')}
                >
                  <strong>📁</strong> Uncategorized
                </button>
              </div>
              {expanded.has('uncategorized') && (
                <div className="tree-folder-children">
                  {uncategorizedProducts.map(renderProduct)}
                </div>
              )}
            </div>
          )}
          {filteredProducts.length === 0 && (
            <div style={{ color: 'var(--muted)', padding: '16px 8px', textAlign: 'center', fontSize: 12 }}>
              {hasSearch ? `No products match "${cleanSearch}"` : 'No products in catalog yet.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
