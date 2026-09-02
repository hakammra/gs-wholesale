import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';

export default function CategoryManagerModal({ isOpen, onClose }) {
  const { categories = [], products = [], saveCategory, deleteCategory, deleteAllCategories, getCategoryPath } = useBusiness();
  const { notifySuccess, notifyWarning } = useNotification();

  const [isEditing, setIsEditing] = useState(false);
  const [editingCat, setEditingCat] = useState({ id: null, name: '', parent_id: '' });
  const [searchFilter, setSearchFilter] = useState('');

  if (!isOpen) return null;

  // Build Hierarchical Tree
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

  // Flatten tree for flat table display with indentation
  const flattenTree = (nodes) => {
    let list = [];
    for (const node of nodes) {
      list.push(node);
      if (node.children && node.children.length > 0) {
        list = list.concat(flattenTree(node.children));
      }
    }
    return list;
  };

  const flattenedCategories = flattenTree(tree);

  const filteredList = flattenedCategories.filter(c => {
    if (!searchFilter) return true;
    const term = searchFilter.toLowerCase();
    return c.name.toLowerCase().includes(term) || getCategoryPath(c.id).toLowerCase().includes(term);
  });

  const handleOpenAdd = (parentId = '') => {
    setEditingCat({ id: null, name: '', parent_id: parentId });
    setIsEditing(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingCat({ id: cat.id, name: cat.name, parent_id: cat.parent_id || '' });
    setIsEditing(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!editingCat.name.trim()) return;

    saveCategory({
      id: editingCat.id,
      name: editingCat.name.trim(),
      parent_id: editingCat.parent_id || null
    });

    setIsEditing(false);
    setEditingCat({ id: null, name: '', parent_id: '' });
  };

  const handleDelete = (cat) => {
    if (window.confirm(`Are you sure you want to delete folder "${cat.name}" and any subfolders inside it?`)) {
      deleteCategory(cat.id);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('WARNING: Are you sure you want to remove ALL category folders? Products will be kept with unassigned categories.')) {
      deleteAllCategories();
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div className="modal-box modal-lg" style={{ maxWidth: 850, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>📁</span>
            <div>
              <h3 style={{ margin: 0 }}>Category Folders & Subfolders</h3>
              <small style={{ color: 'var(--muted)' }}>Organize products into hierarchical folders and sub-levels</small>
            </div>
          </div>
          <button type="button" onClick={onClose} className="modal-close">&times;</button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {/* Top Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => handleOpenAdd('')}
                className="primary-button"
                style={{ fontWeight: 700 }}
              >
                + New Root Folder
              </button>

              <input
                type="text"
                placeholder="Search folder names or paths..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={{ width: 260 }}
              />
            </div>

            {categories.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="secondary-button"
                style={{ color: '#ff8e8e', borderColor: '#552222', fontSize: 12 }}
              >
                🗑 Remove All Folders
              </button>
            )}
          </div>

          {/* Inline Edit / Add Form */}
          {isEditing && (
            <div style={{ background: '#1c1c1c', border: '1px solid var(--primary)', padding: 14, borderRadius: 6, marginBottom: 16 }}>
              <h4 style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--primary)' }}>
                {editingCat.id ? '✏️ Edit Category Folder' : '📁 Create New Folder / Subfolder'}
              </h4>
              <form onSubmit={handleSave}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label>Folder Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SSD, DDR5 RAM, Monitors..."
                      value={editingCat.name}
                      onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
                      autoFocus
                    />
                  </div>

                  <div>
                    <label>Parent Folder (Optional)</label>
                    <select
                      value={editingCat.parent_id}
                      onChange={(e) => setEditingCat({ ...editingCat, parent_id: e.target.value })}
                    >
                      <option value="">-- Top Level (Root Folder) --</option>
                      {flattenedCategories
                        .filter(c => c.id !== editingCat.id) // Avoid self-parenting
                        .map(c => (
                          <option key={c.id} value={c.id}>
                            {'\u00A0'.repeat(c.level * 4)}📁 {c.name} ({getCategoryPath(c.id)})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="secondary-button small-button"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="primary-button small-button"
                    style={{ fontWeight: 700 }}
                  >
                    {editingCat.id ? 'Save Changes' : 'Create Folder'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Folder Tree Table */}
          <div style={{ border: '1px solid var(--line)', borderRadius: 6, overflow: 'hidden' }}>
            <table style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Folder Structure</th>
                  <th>Full Path</th>
                  <th style={{ width: 90, textAlign: 'center' }}>Products</th>
                  <th style={{ width: 230, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map(cat => (
                  <tr key={cat.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', paddingLeft: cat.level * 24 }}>
                        {cat.level > 0 && (
                          <span style={{ color: 'var(--muted)', marginRight: 6, fontFamily: 'monospace' }}>
                            └──
                          </span>
                        )}
                        <span style={{ marginRight: 6 }}>📁</span>
                        <strong style={{ color: cat.level === 0 ? 'var(--text)' : 'var(--primary)' }}>
                          {cat.name}
                        </strong>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {getCategoryPath(cat.id)}
                    </td>
                    <td className="mono" style={{ textAlign: 'center' }}>
                      <span className="badge badge-neutral">{cat.productCount}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenAdd(cat.id)}
                          className="secondary-button small-button"
                          title="Add folder inside this folder"
                          style={{ padding: '3px 8px', fontSize: 11, color: 'var(--primary)' }}
                        >
                          + Subfolder
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cat)}
                          className="secondary-button small-button"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat)}
                          className="secondary-button small-button"
                          style={{ padding: '3px 8px', fontSize: 11, color: '#ff8e8e' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredList.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                      No category folders found. Click <strong>"+ New Root Folder"</strong> to create your first category folder.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="secondary-button">
            Done / Close
          </button>
        </div>
      </div>
    </div>
  );
}
