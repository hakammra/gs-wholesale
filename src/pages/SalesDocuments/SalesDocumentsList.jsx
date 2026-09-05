import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { generateInvoicePDF, printInvoiceDocument } from '../../lib/pdfGenerator';
import { exportToExcel, generateWhatsAppInvoiceLink } from '../../lib/exportUtils';

export default function SalesDocumentsList() {
  const {
    salesDocuments, customers = [], products = [], payments = [], cheques = [],
    updateSalesDocument, convertDocument, cancelReservation, deleteSalesDocument, companySettings
  } = useBusiness();
  const { notifySuccess, notifyError } = useNotification();

  const [activeTab, setActiveTab] = useState('all'); // all, reserved, invoices, quotations
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocId, setSelectedDocId] = useState(salesDocuments[0]?.id || null);
  const [editingDocument, setEditingDocument] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [addProductId, setAddProductId] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const reservedDocsCount = salesDocuments.filter(d =>
    (d.doc_type === 'reserved_order' || d.doc_type === 'sales_order') &&
    (d.status === 'reserved' || d.payment_status === 'reserved')
  ).length;

  const invoicesCount = salesDocuments.filter(d => d.doc_type === 'sales_invoice').length;
  const quotationsCount = salesDocuments.filter(d => d.doc_type === 'quotation').length;

  const filteredDocs = salesDocuments.filter(d => {
    if (activeTab === 'reserved') {
      if (d.doc_type !== 'reserved_order' && d.doc_type !== 'sales_order') return false;
    } else if (activeTab === 'invoices') {
      if (d.doc_type !== 'sales_invoice') return false;
    } else if (activeTab === 'quotations') {
      if (d.doc_type !== 'quotation') return false;
    }

    if (filterStatus && d.payment_status !== filterStatus) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      d.doc_no?.toLowerCase().includes(term) ||
      d.customer_name?.toLowerCase().includes(term)
    );
  });

  const selectedDoc = salesDocuments.find(d => d.id === selectedDocId) || filteredDocs[0];
  const isSelectedReserved = selectedDoc && (selectedDoc.doc_type === 'reserved_order' || selectedDoc.doc_type === 'sales_order') && selectedDoc.status === 'reserved';

  const handleExport = () => {
    const data = filteredDocs.map(d => ({
      'Doc Number': d.doc_no,
      'Type': d.doc_type,
      'Date': d.doc_date,
      'Customer': d.customer_name,
      'Grand Total (LKR)': d.grand_total,
      'Paid Amount (LKR)': d.paid_amount,
      'Balance Due (LKR)': d.balance_due,
      'Status': d.status || d.payment_status
    }));
    exportToExcel(data, 'Sales_Documents_Export');
  };

  const getLinkedPayments = (document) => payments.filter(payment =>
    String(payment.sales_doc_id || '') === String(document.id) || payment.reference === document.doc_no
  );

  const openEditDocument = (document) => {
    const linkedPayments = getLinkedPayments(document).filter(payment => {
      if (payment.payment_method !== 'cheque') return true;
      const cheque = cheques.find(entry => entry.id === payment.cheque_id || entry.payment_id === payment.id);
      return !cheque || !['returned', 'cancelled'].includes(cheque.status);
    });
    const canAdjustPayment = linkedPayments.length === 1 && Number(document.balance_due) <= 0.01;
    setEditingDocument(document);
    setEditForm({
      customer_id: document.customer_id || '',
      doc_date: document.doc_date || new Date().toISOString().slice(0, 10),
      discount_amount: Number(document.discount_amount ?? document.doc_discount_total) || 0,
      notes: document.notes || '',
      adjust_paid_payment: canAdjustPayment,
      can_adjust_payment: canAdjustPayment,
      linked_payment: canAdjustPayment ? linkedPayments[0] : null,
      items: (document.items || []).map(item => {
        const productId = item.product_id || item.product?.id;
        const product = products.find(entry => entry.id === productId) || item.product;
        return {
          ...item,
          product_id: productId,
          product,
          product_name: product?.name || item.product_name || 'Product Item',
          qty: Number(item.qty || item.base_qty) || 1,
          unit_price: Number(item.unit_price) || 0,
          discount_amount: Number(item.discount_amount ?? item.line_discount) || 0,
          is_warranty_replacement: Boolean(item.is_warranty_replacement) || String(item.notes || '').toLowerCase().includes('warranty replacement')
        };
      })
    });
    setAddProductId('');
  };

  const updateEditItem = (index, field, value) => {
    setEditForm(current => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item)
    }));
  };

  const handleAddEditProduct = () => {
    const product = products.find(entry => entry.id === addProductId);
    if (!product) return;
    const existingIndex = editForm.items.findIndex(item => item.product_id === product.id && !item.is_warranty_replacement);
    if (existingIndex >= 0) {
      updateEditItem(existingIndex, 'qty', (Number(editForm.items[existingIndex].qty) || 0) + 1);
    } else {
      setEditForm(current => ({
        ...current,
        items: [...current.items, {
          product_id: product.id,
          product,
          product_name: product.name,
          item_code: product.item_code,
          qty: 1,
          unit_price: Number(product.wholesale_price || product.dealer_price || product.retail_price) || 0,
          discount_amount: 0,
          unit_cost_snapshot: Number(product.weighted_cost_lkr || product.cost_price) || 0,
          is_warranty_replacement: false
        }]
      }));
    }
    setAddProductId('');
  };

  const editItemsSubtotal = (editForm?.items || []).reduce((sum, item) => {
    const qty = Number(item.qty) || 0;
    const price = item.is_warranty_replacement ? 0 : Number(item.unit_price) || 0;
    const discount = item.is_warranty_replacement ? 0 : Number(item.discount_amount) || 0;
    return sum + Math.max(0, (qty * price) - discount);
  }, 0);
  const editGrandTotal = Math.max(0, editItemsSubtotal - (Number(editForm?.discount_amount) || 0));

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    if (!editingDocument || !editForm || isSavingEdit) return;
    setIsSavingEdit(true);
    try {
      const updated = await updateSalesDocument(editingDocument.id, editForm);
      setSelectedDocId(updated.id);
      setEditingDocument(null);
      setEditForm(null);
    } catch (error) {
      notifyError(error.message || 'The sales document could not be updated.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div>
      {/* Top Action Toolbar */}
      <div className="action-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={handleExport} className="toolbar-button">
            <span className="icon">⤓</span>
            <span>Export Excel</span>
          </button>

          {selectedDoc && (
            <>
              <button
                onClick={() => {
                  const cust = customers.find(c => c.id === selectedDoc.customer_id) || selectedDoc.customer;
                  generateInvoicePDF(selectedDoc, companySettings, cust, 'A4', products);
                }}
                className="toolbar-button"
                title="Download PDF Invoice"
              >
                <span className="icon">⤓</span>
                <span>Download PDF</span>
              </button>

              <button
                onClick={() => {
                  const cust = customers.find(c => c.id === selectedDoc.customer_id) || selectedDoc.customer;
                  printInvoiceDocument(selectedDoc, companySettings, cust, 'A4', products);
                }}
                className="toolbar-button bright"
                title="Open Native Print Catalog"
              >
                <span className="icon">🖨</span>
                <span>Print Document</span>
              </button>

              {selectedDoc.customer_phone && (
                <a
                  href={generateWhatsAppInvoiceLink(selectedDoc, selectedDoc.customer_phone, companySettings.business_name)}
                  target="_blank"
                  rel="noreferrer"
                  className="toolbar-button"
                  style={{ textDecoration: 'none' }}
                >
                  <span className="icon">💬</span>
                  <span>WhatsApp</span>
                </a>
              )}

              {isSelectedReserved && (
                <>
                  <button
                    onClick={() => {
                      convertDocument(selectedDoc.id, 'sales_invoice');
                      notifySuccess(`Reservation ${selectedDoc.doc_no} converted to Sales Invoice and stock finalized!`);
                    }}
                    className="toolbar-button bright"
                    style={{ background: '#52e37e', color: '#000', fontWeight: 700 }}
                  >
                    <span className="icon">⚡</span>
                    <span>Convert to Invoice & Complete Sale</span>
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm(`Cancel reservation and release stock for ${selectedDoc.doc_no}?`)) {
                        cancelReservation(selectedDoc.id);
                      }
                    }}
                    className="toolbar-button"
                    style={{ color: '#ff8e8e', borderColor: '#ff8e8e' }}
                  >
                    <span className="icon">❌</span>
                    <span>Cancel & Release Stock</span>
                  </button>
                </>
              )}

              {selectedDoc.doc_type === 'quotation' && (
                <button
                  onClick={() => { convertDocument(selectedDoc.id, 'sales_invoice'); notifySuccess('Quotation converted to Sales Invoice'); }}
                  className="toolbar-button bright"
                >
                  <span className="icon">➔</span>
                  <span>Convert to Invoice</span>
                </button>
              )}

              {!['cancelled', 'converted_to_sale', 'returned'].includes(selectedDoc.status) && (
                <button
                  type="button"
                  onClick={() => openEditDocument(selectedDoc)}
                  className="toolbar-button bright"
                  title="Edit items, customer, date, discount and notes"
                >
                  <span className="icon">✎</span>
                  <span>Edit Document</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete ${selectedDoc.doc_type?.replace('_', ' ')} "${selectedDoc.doc_no}"? This will reverse any stock and account balance impact.`)) {
                    deleteSalesDocument(selectedDoc.id);
                    setSelectedDocId(null);
                  }
                }}
                className="toolbar-button"
                style={{ color: '#ff8e8e', borderColor: 'rgba(255, 142, 142, 0.4)' }}
                title="Delete Document"
              >
                <span className="icon">🗑</span>
                <span>Delete Doc</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Primary Category / Document Tabs */}
      <div className="category-filter-bar" style={{ margin: '14px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          className={`cat-chip ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Documents ({salesDocuments.length})
        </button>

        <button
          className={`cat-chip ${activeTab === 'reserved' ? 'active' : ''}`}
          onClick={() => setActiveTab('reserved')}
          style={{ borderColor: activeTab === 'reserved' ? '#ffca58' : undefined }}
        >
          📌 Reserved Orders ({reservedDocsCount})
        </button>

        <button
          className={`cat-chip ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => setActiveTab('invoices')}
        >
          Sales Invoices ({invoicesCount})
        </button>

        <button
          className={`cat-chip ${activeTab === 'quotations' ? 'active' : ''}`}
          onClick={() => setActiveTab('quotations')}
        >
          Quotations ({quotationsCount})
        </button>
      </div>

      {/* Search & Secondary Filter Row */}
      <div className="document-filters" style={{ marginBottom: 16 }}>
        <div style={{ flex: 2 }}>
          <label style={{ fontSize: 11, color: 'var(--muted)' }}>SEARCH BY DOC # OR CUSTOMER</label>
          <input
            type="text"
            placeholder="Search document number, customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, color: 'var(--muted)' }}>PAYMENT STATUS</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="unpaid">Unpaid / Due</option>
            <option value="reserved">Reserved (Held)</option>
          </select>
        </div>
      </div>

      {/* Split Panels: Documents Table / Items Breakdown */}
      <div className="split-panel">
        <div className="large-table">
          <table>
            <thead>
              <tr>
                <th>Doc #</th>
                <th>Type</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Balance Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map(d => {
                const isSelected = selectedDoc?.id === d.id;
                const isRes = d.doc_type === 'reserved_order' || d.doc_type === 'sales_order' || d.status === 'reserved';

                return (
                  <tr
                    key={d.id}
                    onClick={() => setSelectedDocId(d.id)}
                    className={isSelected ? 'selected-row' : ''}
                    style={{
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(40, 169, 230, 0.12)' : isRes ? 'rgba(255, 202, 88, 0.04)' : undefined
                    }}
                  >
                    <td className="mono font-semibold" style={{ color: isRes ? '#ffca58' : 'var(--primary)' }}>
                      {isRes ? '📌 ' : ''}{d.doc_no}
                    </td>
                    <td>
                      <span className={`badge ${isRes ? 'badge-warning' : 'badge-neutral'}`}>
                        {d.doc_type === 'reserved_order' ? 'RESERVED' : d.doc_type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{formatDate(d.doc_date)}</td>
                    <td style={{ fontWeight: 700 }}>{d.customer_name}</td>
                    <td className="mono">{formatCurrency(d.grand_total)}</td>
                    <td className="mono">{formatCurrency(d.paid_amount)}</td>
                    <td className="mono" style={{ color: d.balance_due > 0 && !isRes ? '#ff8e8e' : 'inherit', fontWeight: 700 }}>
                      {formatCurrency(d.balance_due)}
                    </td>
                    <td>
                      {d.status === 'converted_to_sale' ? (
                        <span className="badge badge-neutral" style={{ fontSize: 11 }}>CONVERTED</span>
                      ) : d.status === 'cancelled' ? (
                        <span className="badge badge-danger" style={{ fontSize: 11 }}>CANCELLED</span>
                      ) : isRes ? (
                        <span className="badge badge-warning" style={{ fontSize: 11 }}>HELD IN STOCK</span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className={`badge badge-${d.payment_status === 'paid' ? 'success' : d.payment_status === 'partial' ? 'warning' : 'danger'}`}>
                            {d.payment_status?.toUpperCase()}
                          </span>
                          {(d.is_cod || (d.payment_lines && d.payment_lines.some(p => p.method === 'cod'))) && (
                            <span className="badge" style={{ fontSize: 10, background: '#451a03', color: '#f59e0b', border: '1px solid #b45309' }}>
                              📦 COD
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--muted)', padding: 35 }}>
                    No sales documents found matching current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Split Divider */}
        <div className="split-divider">
          {selectedDoc ? `Document Items: ${selectedDoc.doc_no} — ${selectedDoc.customer_name}` : 'Document Details'}
        </div>

        {/* Selected Document Line Items */}
        <div className="item-table">
          {selectedDoc ? (
            <table>
              <thead>
                <tr>
                  <th>Product Item</th>
                  <th style={{ width: 80, textAlign: 'center' }}>Qty</th>
                  <th>Unit Price</th>
                  <th>Discount</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(selectedDoc.items || []).map((it, idx) => {
                  const isW = !!it.is_warranty_replacement;
                  return (
                    <tr key={idx}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{it.product_name || it.product?.name || 'Item'}</div>
                        {isW && (
                          <div style={{ fontSize: 11, color: '#52e37e', marginTop: 2 }}>
                            🛡️ [WARRANTY REPLACEMENT - Rs. 0.00] {it.warranty_note ? `(${it.warranty_note})` : ''}
                          </div>
                        )}
                      </td>
                      <td className="mono font-semibold" style={{ textAlign: 'center' }}>{it.qty}</td>
                      <td className="mono">{isW ? 'Rs. 0.00' : formatCurrency(it.unit_price)}</td>
                      <td className="mono" style={{ color: '#ffca58' }}>{formatCurrency(it.discount_amount || 0)}</td>
                      <td className="mono font-semibold" style={{ textAlign: 'right' }}>
                        {isW ? 'Rs. 0.00' : formatCurrency(it.line_total || ((it.qty * it.unit_price) - (it.discount_amount || 0)))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>
              Select a document from above to view its itemized breakdown.
            </div>
          )}
        </div>
      </div>

      {editingDocument && editForm && (
        <div className="modal-overlay">
          <div className="modal-box modal-lg sales-edit-modal">
            <div className="modal-header">
              <div>
                <h3>Edit {editingDocument.doc_no}</h3>
                <small style={{ color: 'var(--muted)' }}>Inventory and account balances are readjusted from the saved differences.</small>
              </div>
              <button type="button" onClick={() => setEditingDocument(null)} className="modal-close">&times;</button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="modal-body">
                <div className="sales-edit-header-grid">
                  <div>
                    <label>Customer</label>
                    <select value={editForm.customer_id} onChange={(event) => setEditForm(current => ({ ...current, customer_id: event.target.value }))}>
                      <option value="">Cash / Counter Customer</option>
                      {customers.map(customer => <option key={customer.id} value={customer.id}>{customer.customer_code} - {customer.business_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Document Date *</label>
                    <input type="date" required value={editForm.doc_date} onChange={(event) => setEditForm(current => ({ ...current, doc_date: event.target.value }))} />
                  </div>
                  <div>
                    <label>Document Discount (LKR)</label>
                    <input type="number" min="0" max={editItemsSubtotal} step="0.01" value={editForm.discount_amount} onChange={(event) => setEditForm(current => ({ ...current, discount_amount: Number(event.target.value) || 0 }))} />
                  </div>
                </div>

                <div className="sales-edit-add-row">
                  <div>
                    <label>Add Product</label>
                    <select value={addProductId} onChange={(event) => setAddProductId(event.target.value)}>
                      <option value="">Select a product…</option>
                      {products.filter(product => product.is_active !== false).map(product => (
                        <option key={product.id} value={product.id}>{product.item_code} - {product.name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="button" className="secondary-button" disabled={!addProductId} onClick={handleAddEditProduct}>+ Add Item</button>
                </div>

                <div className="table-responsive sales-edit-items">
                  <table>
                    <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Discount</th><th>Warranty</th><th>Line Total</th><th></th></tr></thead>
                    <tbody>
                      {editForm.items.map((item, index) => {
                        const lineTotal = item.is_warranty_replacement
                          ? 0
                          : Math.max(0, (Number(item.qty) || 0) * (Number(item.unit_price) || 0) - (Number(item.discount_amount) || 0));
                        return (
                          <tr key={`${item.product_id}-${index}`}>
                            <td><strong>{item.product_name || item.product?.name}</strong><small className="table-subtext mono">{item.item_code || item.product?.item_code}</small></td>
                            <td><input className="table-number-input mono" type="number" min="0.01" step="0.01" required value={item.qty} onChange={(event) => updateEditItem(index, 'qty', Number(event.target.value) || 0)} /></td>
                            <td><input className="table-number-input mono" type="number" min="0" step="0.01" required disabled={item.is_warranty_replacement} value={item.is_warranty_replacement ? 0 : item.unit_price} onChange={(event) => updateEditItem(index, 'unit_price', Number(event.target.value) || 0)} /></td>
                            <td><input className="table-number-input mono" type="number" min="0" step="0.01" disabled={item.is_warranty_replacement} value={item.is_warranty_replacement ? 0 : item.discount_amount} onChange={(event) => updateEditItem(index, 'discount_amount', Number(event.target.value) || 0)} /></td>
                            <td>
                              <label className="sales-edit-warranty-toggle">
                                <input
                                  type="checkbox"
                                  checked={item.is_warranty_replacement}
                                  onChange={(event) => setEditForm(current => ({
                                    ...current,
                                    items: current.items.map((entry, itemIndex) => itemIndex === index ? {
                                      ...entry,
                                      is_warranty_replacement: event.target.checked,
                                      original_unit_price: event.target.checked ? entry.unit_price : entry.original_unit_price,
                                      unit_price: event.target.checked ? 0 : (Number(entry.original_unit_price) || Number(entry.product?.wholesale_price) || 0),
                                      discount_amount: event.target.checked ? 0 : entry.discount_amount
                                    } : entry)
                                  }))}
                                />
                                <span>{item.is_warranty_replacement ? 'Warranty' : 'Normal'}</span>
                              </label>
                            </td>
                            <td className="mono font-semibold">{formatCurrency(lineTotal)}</td>
                            <td><button type="button" className="danger-button small-button" onClick={() => setEditForm(current => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))}>Remove</button></td>
                          </tr>
                        );
                      })}
                      {!editForm.items.length && <tr><td colSpan="7" className="empty-state-cell">Add at least one product.</td></tr>}
                    </tbody>
                  </table>
                </div>

                <div className="sales-edit-summary-grid">
                  <div><small>ITEMS SUBTOTAL</small><strong>{formatCurrency(editItemsSubtotal)}</strong></div>
                  <div><small>DOCUMENT DISCOUNT</small><strong>-{formatCurrency(editForm.discount_amount || 0)}</strong></div>
                  <div><small>EDITED TOTAL</small><strong>{formatCurrency(editGrandTotal)}</strong></div>
                  <div><small>RECORDED PAID</small><strong>{formatCurrency(editingDocument.paid_amount || 0)}</strong></div>
                </div>

                {editForm.can_adjust_payment ? (
                  <label className="sales-payment-adjustment">
                    <input type="checkbox" checked={editForm.adjust_paid_payment} onChange={(event) => setEditForm(current => ({ ...current, adjust_paid_payment: event.target.checked }))} />
                    <span>
                      <strong>Readjust the linked {editForm.linked_payment?.payment_method} payment to the edited total</strong>
                      <small>Cash Flow{editForm.linked_payment?.payment_method === 'bank' ? ' and the selected bank balance' : editForm.linked_payment?.payment_method === 'cheque' ? ' and the linked cheque amount' : ''} will change by the same difference.</small>
                    </span>
                  </label>
                ) : Number(editingDocument.paid_amount) > 0 && (
                  <p className="form-warning">Existing split or partial payments will be preserved. The edited total cannot be lower than the amount already paid.</p>
                )}

                <div>
                  <label>Notes</label>
                  <textarea value={editForm.notes} onChange={(event) => setEditForm(current => ({ ...current, notes: event.target.value }))} placeholder="Document notes or edit reason" />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="secondary-button" disabled={isSavingEdit} onClick={() => setEditingDocument(null)}>Cancel</button>
                <button type="submit" className="primary-button" disabled={isSavingEdit || !editForm.items.length}>{isSavingEdit ? 'Readjusting…' : 'Save & Readjust Records'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
