import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { generateInvoicePDF } from '../../lib/pdfGenerator';
import { exportToExcel, generateWhatsAppInvoiceLink } from '../../lib/exportUtils';

export default function SalesDocumentsList() {
  const { salesDocuments, customers = [], convertDocument, cancelReservation, deleteSalesDocument, companySettings } = useBusiness();
  const { notifySuccess } = useNotification();

  const [activeTab, setActiveTab] = useState('all'); // all, reserved, invoices, quotations
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocId, setSelectedDocId] = useState(salesDocuments[0]?.id || null);

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
                  generateInvoicePDF(selectedDoc, companySettings, cust);
                }}
                className="toolbar-button bright"
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
    </div>
  );
}
