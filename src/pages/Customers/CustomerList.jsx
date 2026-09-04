import React, { useState, useMemo } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { generateStatementPDF, generateInvoicePDF } from '../../lib/pdfGenerator';

export default function CustomerList({ onNavigateTab }) {
  const {
    customers = [],
    saveCustomer,
    deleteCustomer,
    recordCustomerSettlement,
    salesDocuments = [],
    cheques = [],
    payments = [],
    bankAccounts = [],
    companySettings = {}
  } = useBusiness();

  const { notifySuccess, notifyError, notifyWarning } = useNotification();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'has_balance' | 'good_standing'
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || null);
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' | 'payments' | 'cheques' | 'aging'

  // Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [isSavingSettlement, setIsSavingSettlement] = useState(false);
  const [customerModalMode, setCustomerModalMode] = useState('create'); // 'create' | 'edit'

  const [customerForm, setCustomerForm] = useState({
    id: null,
    business_name: '',
    contact_person: '',
    phone: '',
    whatsapp: '',
    email: '',
    billing_address: '',
    price_tier: 'Dealer',
    credit_allowed: true,
    credit_limit: 500000,
    credit_days: 30
  });

  const [settlementForm, setSettlementForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: 'cash', // 'cash' | 'bank' | 'cheque'
    bank_account_id: bankAccounts[0]?.id || '',
    reference: '',
    notes: '',
    cheque_no: '',
    cheque_date: new Date().toISOString().slice(0, 10),
    bank_name: ''
  });

  // Calculate live dynamic outstanding balance for any customer based on posted, non-cancelled invoices
  const getCustomerDue = (c) => {
    if (!c) return 0;
    const targetId = c.id != null ? String(c.id).trim() : '';
    const targetName = (c.business_name || '').trim().toLowerCase();

    const isMatch = (itemCustId, itemCustName) => {
      const idStr = itemCustId != null ? String(itemCustId).trim() : '';
      const nameStr = (itemCustName || '').trim().toLowerCase();
      if (targetId && idStr && targetId === idStr) return true;
      if (targetName && nameStr && (targetName === nameStr || nameStr.includes(targetName) || targetName.includes(nameStr))) return true;
      return false;
    };

    const custDocs = (salesDocuments || []).filter(d =>
      d.doc_type !== 'quotation' &&
      d.status !== 'cancelled' &&
      isMatch(d.customer_id, d.customer_name)
    );

    const invoiceDue = custDocs.reduce((sum, d) => {
      const bal = d.balance_due !== undefined
        ? Number(d.balance_due)
        : Math.max(0, (Number(d.grand_total) || 0) - (Number(d.paid_amount) || 0));
      return sum + Math.max(0, bal);
    }, 0);

    const currentRec = Number(c.current_receivable || 0);

    if (custDocs.length > 0) {
      return invoiceDue <= 0 ? 0 : Math.min(invoiceDue, currentRec > 0 ? currentRec : invoiceDue);
    }
    return Math.max(0, currentRec);
  };

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const due = getCustomerDue(c);
      if (filterType === 'has_balance' && due <= 0) return false;
      if (filterType === 'good_standing' && due > 0) return false;

      if (!searchTerm) return true;
      const t = searchTerm.toLowerCase();
      return (
        c.business_name?.toLowerCase().includes(t) ||
        c.customer_code?.toLowerCase().includes(t) ||
        c.phone?.includes(t) ||
        c.contact_person?.toLowerCase().includes(t)
      );
    });
  }, [customers, salesDocuments, filterType, searchTerm]);

  // Currently Selected Customer
  const selectedCust = customers.find(c => String(c.id) === String(selectedCustomerId)) || filteredCustomers[0] || null;

  // Customer Related Data (Matched by both ID and Name)
  const customerDocs = useMemo(() => {
    if (!selectedCust) return [];
    const targetId = selectedCust.id != null ? String(selectedCust.id).trim() : '';
    const targetName = (selectedCust.business_name || '').trim().toLowerCase();

    return salesDocuments
      .filter(d => {
        const dId = d.customer_id != null ? String(d.customer_id).trim() : '';
        const dName = (d.customer_name || '').trim().toLowerCase();
        if (targetId && dId && targetId === dId) return true;
        if (targetName && dName && (targetName === dName || dName.includes(targetName) || targetName.includes(dName))) return true;
        return false;
      })
      .sort((a, b) => new Date(b.created_at || b.doc_date) - new Date(a.created_at || a.doc_date));
  }, [salesDocuments, selectedCust]);

  const customerPayments = useMemo(() => {
    if (!selectedCust) return [];
    const targetId = selectedCust.id != null ? String(selectedCust.id).trim() : '';
    const targetName = (selectedCust.business_name || '').trim().toLowerCase();

    return payments
      .filter(p => {
        const pId = (p.party_id != null ? String(p.party_id) : (p.customer_id != null ? String(p.customer_id) : '')).trim();
        const pName = (p.customer_name || p.party_name || '').trim().toLowerCase();
        if (targetId && pId && targetId === pId) return true;
        if (targetName && pName && (targetName === pName || pName.includes(targetName) || targetName.includes(pName))) return true;
        return false;
      })
      .sort((a, b) => new Date(b.created_at || b.payment_date) - new Date(a.created_at || a.payment_date));
  }, [payments, selectedCust]);

  const customerCheques = useMemo(() => {
    if (!selectedCust) return [];
    const targetId = selectedCust.id != null ? String(selectedCust.id).trim() : '';
    const targetName = (selectedCust.business_name || '').trim().toLowerCase();

    return cheques
      .filter(c => {
        const cId = (c.party_id != null ? String(c.party_id) : '').trim();
        const cName = (c.party_name || '').trim().toLowerCase();
        const matches = (targetId && cId && targetId === cId) || (targetName && cName && (targetName === cName || cName.includes(targetName) || targetName.includes(cName)));
        return matches && c.direction === 'received';
      })
      .sort((a, b) => new Date(b.cheque_date || b.created_at) - new Date(a.cheque_date || a.created_at));
  }, [cheques, selectedCust]);

  // Customer Financial Analytics
  const outstandingDue = getCustomerDue(selectedCust);
  const creditLimit = Number(selectedCust?.credit_limit) || 0;
  const availableCredit = Math.max(0, creditLimit - outstandingDue);
  const pendingCheques = customerCheques.filter(c => c.status === 'received' || c.status === 'held' || c.status === 'deposited');
  const pendingChequesTotal = pendingCheques.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const totalLifetimeInvoiced = customerDocs.filter(d => d.doc_type === 'sales_invoice').reduce((s, d) => s + (Number(d.grand_total) || 0), 0);

  // Aging Buckets Calculation
  const agingAnalysis = useMemo(() => {
    if (!selectedCust) return { current: 0, days30: 0, days60: 0, days90Plus: 0 };
    const now = Date.now();
    let current = 0;
    let days30 = 0;
    let days60 = 0;
    let days90Plus = 0;

    customerDocs.filter(d => d.doc_type === 'sales_invoice' && (Number(d.balance_due) > 0 || d.payment_status !== 'paid')).forEach(d => {
      const due = Number(d.balance_due) || (Number(d.grand_total) - Number(d.paid_amount || 0));
      if (due <= 0) return;
      const docDate = new Date(d.doc_date || d.created_at).getTime();
      const ageDays = Math.floor((now - docDate) / (1000 * 60 * 60 * 24));

      if (ageDays <= (selectedCust.credit_days || 30)) {
        current += due;
      } else if (ageDays <= (selectedCust.credit_days || 30) + 30) {
        days30 += due;
      } else if (ageDays <= (selectedCust.credit_days || 30) + 60) {
        days60 += due;
      } else {
        days90Plus += due;
      }
    });

    return { current, days30, days60, days90Plus };
  }, [customerDocs, selectedCust]);

  // Handlers
  const handleOpenCreateCustomer = () => {
    setCustomerModalMode('create');
    setCustomerForm({
      id: null,
      business_name: '',
      contact_person: '',
      phone: '',
      whatsapp: '',
      email: '',
      billing_address: '',
      price_tier: 'Dealer',
      credit_allowed: true,
      credit_limit: 500000,
      credit_days: 30
    });
    setIsCustomerModalOpen(true);
  };

  const handleOpenEditCustomer = (cust) => {
    setCustomerModalMode('edit');
    setCustomerForm({
      id: cust.id,
      business_name: cust.business_name || '',
      contact_person: cust.contact_person || '',
      phone: cust.phone || '',
      whatsapp: cust.whatsapp || '',
      email: cust.email || '',
      billing_address: cust.billing_address || '',
      price_tier: cust.price_tier || 'Dealer',
      credit_allowed: cust.credit_allowed !== false,
      credit_limit: cust.credit_limit || 500000,
      credit_days: cust.credit_days || 30
    });
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    try {
      const saved = await saveCustomer(customerForm);
      if (saved?.id) {
        setSelectedCustomerId(saved.id);
      }
      setIsCustomerModalOpen(false);
    } catch (err) {
      notifyError('Failed to save customer: ' + err.message);
    }
  };

  const handleDeleteCustomer = (cust) => {
    if (customerDocs.length > 0) {
      notifyWarning(`Cannot delete customer with ${customerDocs.length} existing invoices/documents.`);
      return;
    }
    if (window.confirm(`Are you sure you want to delete customer "${cust.business_name}"?`)) {
      deleteCustomer(cust.id);
      if (selectedCustomerId === cust.id) {
        setSelectedCustomerId(null);
      }
    }
  };

  const handleOpenSettlementModal = (prefillAmount = null, ref = '') => {
    if (!selectedCust) return;
    const due = prefillAmount !== null ? Number(prefillAmount) : getCustomerDue(selectedCust);
    setSettlementForm({
      amount: due > 0 ? due : '',
      payment_date: new Date().toISOString().slice(0, 10),
      payment_method: 'cash',
      bank_account_id: bankAccounts[0]?.id || '',
      reference: ref || `Credit settlement for ${selectedCust.business_name}`,
      notes: ref ? `Payment for ${ref}` : `Credit settlement for ${selectedCust.business_name}`,
      cheque_no: '',
      cheque_date: new Date().toISOString().slice(0, 10),
      bank_name: ''
    });
    setIsSettlementModalOpen(true);
  };

  const handleSaveSettlement = async (e) => {
    e.preventDefault();
    if (!selectedCust || isSavingSettlement) return;
    const amt = Number(settlementForm.amount);
    if (amt <= 0) {
      notifyError('Please enter a valid settlement amount');
      return;
    }

    setIsSavingSettlement(true);
    try {
      await recordCustomerSettlement({
        customer_id: selectedCust.id,
        customer_name: selectedCust.business_name,
        amount: amt,
        payment_date: settlementForm.payment_date,
        payment_method: settlementForm.payment_method,
        bank_account_id: settlementForm.bank_account_id || bankAccounts[0]?.id,
        reference: settlementForm.reference,
        notes: settlementForm.notes,
        cheque_no: settlementForm.cheque_no,
        cheque_date: settlementForm.cheque_date,
        bank_name: settlementForm.bank_name
      });
      setIsSettlementModalOpen(false);
    } catch (err) {
      notifyError(err.message);
    } finally {
      setIsSavingSettlement(false);
    }
  };

  return (
    <div style={{ height: 'calc(100vh - 75px)', display: 'flex', flexDirection: 'column', padding: '10px 14px', gap: 10, overflow: 'hidden' }}>
      {/* Top Stat Summary Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, flexShrink: 0 }}>
        <div className="panel-card" style={{ padding: '8px 12px', borderLeft: '4px solid #0284c7' }}>
          <small style={{ color: 'var(--muted)', fontWeight: 600, fontSize: 10 }}>TOTAL CUSTOMERS</small>
          <div className="mono font-semibold" style={{ fontSize: 18, marginTop: 2, color: '#0284c7' }}>
            {customers.length} Accounts
          </div>
        </div>

        <div className="panel-card" style={{ padding: '8px 12px', borderLeft: '4px solid #ff8e8e' }}>
          <small style={{ color: 'var(--muted)', fontWeight: 600, fontSize: 10 }}>OUTSTANDING RECEIVABLES</small>
          <div className="mono font-semibold" style={{ fontSize: 18, marginTop: 2, color: '#ff8e8e' }}>
            {formatCurrency(customers.reduce((s, c) => s + getCustomerDue(c), 0))}
          </div>
        </div>

        <div className="panel-card" style={{ padding: '8px 12px', borderLeft: '4px solid #ffca58' }}>
          <small style={{ color: 'var(--muted)', fontWeight: 600, fontSize: 10 }}>CUSTOMERS WITH DUE BALANCE</small>
          <div className="mono font-semibold" style={{ fontSize: 18, marginTop: 2, color: '#ffca58' }}>
            {customers.filter(c => getCustomerDue(c) > 0).length} Customers
          </div>
        </div>

        <div className="panel-card" style={{ padding: '8px 12px', borderLeft: '4px solid #52e37e' }}>
          <small style={{ color: 'var(--muted)', fontWeight: 600, fontSize: 10 }}>UNCLEARED CHEQUES IN HAND</small>
          <div className="mono font-semibold" style={{ fontSize: 18, marginTop: 2, color: '#52e37e' }}>
            {formatCurrency(cheques.filter(c => c.direction === 'received' && (c.status === 'received' || c.status === 'held' || c.status === 'deposited')).reduce((s, c) => s + (Number(c.amount) || 0), 0))}
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: Left Directory | Right Customer Profile & Ledger */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: 12, flex: 1, minHeight: 0, overflow: 'hidden' }}>
        
        {/* Left Column: Customer Directory */}
        <div className="panel-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <div style={{ padding: 10, borderBottom: '1px solid var(--line)', background: '#242424', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong style={{ fontSize: 13 }}>Customers Directory</strong>
              <button
                type="button"
                onClick={handleOpenCreateCustomer}
                className="primary-button small-button"
                style={{ fontWeight: 700, padding: '3px 8px', fontSize: 11 }}
              >
                + New Customer
              </button>
            </div>

            <input
              type="text"
              placeholder="Search by name, code, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', marginBottom: 6, padding: '4px 8px', fontSize: 12 }}
            />

            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                className={`secondary-button small-button ${filterType === 'all' ? 'active' : ''}`}
                onClick={() => setFilterType('all')}
                style={{ flex: 1, fontSize: 10.5, padding: '3px 4px' }}
              >
                All ({customers.length})
              </button>
              <button
                type="button"
                className={`secondary-button small-button ${filterType === 'has_balance' ? 'active' : ''}`}
                onClick={() => setFilterType('has_balance')}
                style={{ flex: 1, fontSize: 10.5, padding: '3px 4px', color: '#ff8e8e' }}
              >
                Due Balance
              </button>
              <button
                type="button"
                className={`secondary-button small-button ${filterType === 'good_standing' ? 'active' : ''}`}
                onClick={() => setFilterType('good_standing')}
                style={{ flex: 1, fontSize: 10.5, padding: '3px 4px', color: '#52e37e' }}
              >
                Zero Due
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredCustomers.map(c => {
              const isSelected = selectedCust?.id === c.id;
              const due = getCustomerDue(c);

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  style={{
                    padding: '9px 12px',
                    borderBottom: '1px solid var(--line-soft)',
                    background: isSelected ? '#13384d' : 'transparent',
                    borderLeft: isSelected ? '4px solid var(--primary)' : '4px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 13, color: isSelected ? '#fff' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.business_name}
                    </strong>
                    <span className="mono font-semibold" style={{ color: due > 0 ? '#ff8e8e' : '#52e37e', fontSize: 12, marginLeft: 6, flexShrink: 0 }}>
                      {formatCurrency(due)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    <span>{c.customer_code} &bull; <strong style={{ color: 'var(--primary)' }}>{c.price_tier || 'Standard'}</strong></span>
                    <span>Limit: {formatCurrency(c.credit_limit || 0)}</span>
                  </div>

                  {c.phone && (
                    <div style={{ fontSize: 10.5, color: '#888', marginTop: 2 }}>
                      📞 {c.phone}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredCustomers.length === 0 && (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
                No customers found. Click <strong>+ New Customer</strong> above to create one.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Customer Full Profile & Transaction History */}
        <div style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
          {selectedCust ? (
            <div className="panel-card" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              {/* Profile Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid var(--line)', paddingBottom: 16, marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h2 style={{ margin: 0, fontSize: 22, color: '#fff' }}>{selectedCust.business_name}</h2>
                    <span className="mono font-semibold" style={{ color: 'var(--primary)', fontSize: 13, background: 'rgba(2, 132, 199, 0.15)', padding: '2px 8px', borderRadius: 4 }}>
                      {selectedCust.customer_code}
                    </span>
                    <span className={`badge badge-${selectedCust.credit_allowed !== false ? 'success' : 'danger'}`}>
                      {selectedCust.credit_allowed !== false ? 'Active Account' : 'Credit Locked'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--muted)', marginTop: 6 }}>
                    {selectedCust.contact_person && <span>👤 <strong>Contact:</strong> {selectedCust.contact_person}</span>}
                    {selectedCust.phone && <span>📞 <strong>Phone:</strong> {selectedCust.phone}</span>}
                    {selectedCust.whatsapp && (
                      <a
                        href={`https://wa.me/${selectedCust.whatsapp.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#52e37e', textDecoration: 'none', fontWeight: 600 }}
                      >
                        💬 WhatsApp
                      </a>
                    )}
                    {selectedCust.email && <span>✉️ {selectedCust.email}</span>}
                  </div>

                  {selectedCust.billing_address && (
                    <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                      📍 {selectedCust.billing_address}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleOpenSettlementModal}
                    className="primary-button small-button"
                    style={{ background: '#52e37e', color: '#000', fontWeight: 800, padding: '6px 14px' }}
                  >
                    💵 Settle Credit / Pay
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditCustomer(selectedCust)}
                    className="secondary-button small-button"
                    style={{ fontWeight: 600 }}
                  >
                    ✏️ Edit Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => generateStatementPDF(selectedCust, customerDocs, customerCheques, companySettings)}
                    className="secondary-button small-button"
                    style={{ fontWeight: 600, color: 'var(--primary)' }}
                  >
                    🖨 Statement PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomer(selectedCust)}
                    className="secondary-button small-button"
                    style={{ color: '#ff8e8e' }}
                    title="Delete Customer"
                  >
                    🗑
                  </button>
                </div>
              </div>

              {/* Financial Metrics Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
                <div style={{ background: '#242424', padding: 12, borderRadius: 6, border: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>Current Receivable</span>
                  <div className="mono font-semibold" style={{ fontSize: 20, marginTop: 4, color: outstandingDue > 0 ? '#ff8e8e' : '#52e37e' }}>
                    {formatCurrency(outstandingDue)}
                  </div>
                </div>

                <div style={{ background: '#242424', padding: 12, borderRadius: 6, border: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>Available Credit Limit</span>
                  <div className="mono font-semibold" style={{ fontSize: 20, marginTop: 4, color: '#e5e5e5' }}>
                    {formatCurrency(availableCredit)}
                  </div>
                  <small style={{ color: 'var(--muted)', fontSize: 10.5 }}>Limit: {formatCurrency(creditLimit)} ({selectedCust.credit_days || 30} Days)</small>
                </div>

                <div style={{ background: '#242424', padding: 12, borderRadius: 6, border: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>Pending Cheques</span>
                  <div className="mono font-semibold" style={{ fontSize: 20, marginTop: 4, color: '#ffca58' }}>
                    {formatCurrency(pendingChequesTotal)}
                  </div>
                  <small style={{ color: 'var(--muted)', fontSize: 10.5 }}>{pendingCheques.length} Cheques awaiting clearance</small>
                </div>

                <div style={{ background: '#242424', padding: 12, borderRadius: 6, border: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Invoiced Sales</span>
                  <div className="mono font-semibold" style={{ fontSize: 20, marginTop: 4, color: 'var(--primary)' }}>
                    {formatCurrency(totalLifetimeInvoiced)}
                  </div>
                  <small style={{ color: 'var(--muted)', fontSize: 10.5 }}>Across {customerDocs.length} Documents</small>
                </div>
              </div>

              {/* Tab Navigation */}
              <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--line)', marginBottom: 12, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('invoices')}
                  className={`secondary-button small-button ${activeTab === 'invoices' ? 'active' : ''}`}
                  style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, fontWeight: 700, fontSize: 11 }}
                >
                  📄 Sales Documents & Invoices ({customerDocs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('payments')}
                  className={`secondary-button small-button ${activeTab === 'payments' ? 'active' : ''}`}
                  style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, fontWeight: 700, fontSize: 11 }}
                >
                  💵 Payment History ({customerPayments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('cheques')}
                  className={`secondary-button small-button ${activeTab === 'cheques' ? 'active' : ''}`}
                  style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, fontWeight: 700, fontSize: 11 }}
                >
                  💳 Cheques ({customerCheques.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('aging')}
                  className={`secondary-button small-button ${activeTab === 'aging' ? 'active' : ''}`}
                  style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, fontWeight: 700, fontSize: 11 }}
                >
                  ⏱️ Credit Aging Analysis
                </button>
              </div>

              {/* Scrollable Tab Body */}
              <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                {/* Tab 1: Sales Documents & Invoices */}
              {activeTab === 'invoices' && (
                <div className="large-table" style={{ background: '#1c1c1c', border: '1px solid var(--line)', borderRadius: 4 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Doc #</th>
                        <th>Date</th>
                        <th>Type</th>
                        <th style={{ textAlign: 'right' }}>Total (Rs)</th>
                        <th style={{ textAlign: 'right' }}>Paid (Rs)</th>
                        <th style={{ textAlign: 'right' }}>Balance Due (Rs)</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                        <th style={{ textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerDocs.map(doc => {
                        const due = Number(doc.balance_due) || (Number(doc.grand_total) - Number(doc.paid_amount || 0));
                        const isPaid = doc.payment_status === 'paid';

                        return (
                          <tr key={doc.id}>
                            <td className="mono font-semibold" style={{ color: 'var(--primary)' }}>
                              {doc.doc_no}
                            </td>
                            <td>{formatDate(doc.doc_date || doc.created_at)}</td>
                            <td>
                              <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                                {doc.doc_type?.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="mono" style={{ textAlign: 'right' }}>
                              {formatCurrency(doc.grand_total)}
                            </td>
                            <td className="mono" style={{ textAlign: 'right', color: '#52e37e' }}>
                              {formatCurrency(doc.paid_amount || 0)}
                            </td>
                            <td className="mono font-semibold" style={{ textAlign: 'right', color: due > 0 ? '#ff8e8e' : 'inherit' }}>
                              {formatCurrency(due)}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`badge badge-${isPaid ? 'success' : (doc.payment_status === 'partial' ? 'warning' : 'danger')}`} style={{ textTransform: 'uppercase' }}>
                                {doc.payment_status || 'UNPAID'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                {due > 0 && doc.doc_type === 'sales_invoice' && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenSettlementModal(due, doc.doc_no)}
                                    className="primary-button small-button"
                                    style={{ padding: '2px 8px', fontSize: 11, background: '#52e37e', color: '#000', fontWeight: 700 }}
                                    title={`Settle ${doc.doc_no}`}
                                  >
                                    💵 Pay
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => generateInvoicePDF(doc, companySettings, selectedCust)}
                                  className="secondary-button small-button"
                                  style={{ padding: '2px 8px', fontSize: 11, color: 'var(--primary)' }}
                                >
                                  PDF
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {customerDocs.length === 0 && (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>
                            No invoices or sales documents on record for this customer.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 2: Payments & Settlements */}
              {activeTab === 'payments' && (
                <div className="large-table" style={{ background: '#1c1c1c', border: '1px solid var(--line)', borderRadius: 4 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Receipt / Payment #</th>
                        <th>Date</th>
                        <th>Payment Type</th>
                        <th>Method</th>
                        <th>Reference / Notes</th>
                        <th style={{ textAlign: 'right' }}>Amount (LKR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerPayments.map(p => (
                        <tr key={p.id}>
                          <td className="mono font-semibold" style={{ color: 'var(--primary)' }}>
                            {p.payment_no}
                          </td>
                          <td>{formatDate(p.payment_date || p.created_at)}</td>
                          <td>
                            <span className="badge badge-neutral">
                              {p.payment_type?.replace('_', ' ') || 'Settlement'}
                            </span>
                          </td>
                          <td>
                            <strong>{p.payment_method?.toUpperCase()}</strong>
                          </td>
                          <td>{p.reference || p.notes || '-'}</td>
                          <td className="mono font-semibold" style={{ textAlign: 'right', color: '#52e37e' }}>
                            {formatCurrency(p.amount)}
                          </td>
                        </tr>
                      ))}

                      {customerPayments.length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>
                            No payment receipts recorded for this customer yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 3: Cheques */}
              {activeTab === 'cheques' && (
                <div className="large-table" style={{ background: '#1c1c1c', border: '1px solid var(--line)', borderRadius: 4 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Cheque #</th>
                        <th>Bank</th>
                        <th>Maturity Date</th>
                        <th style={{ textAlign: 'right' }}>Amount (LKR)</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerCheques.map(chq => (
                        <tr key={chq.id}>
                          <td className="mono font-semibold" style={{ color: 'var(--primary)' }}>
                            {chq.cheque_no}
                          </td>
                          <td>{chq.bank_name || 'Bank'}</td>
                          <td>{formatDate(chq.cheque_date)}</td>
                          <td className="mono font-semibold" style={{ textAlign: 'right', color: '#52e37e' }}>
                            {formatCurrency(chq.amount)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge badge-${chq.status === 'cleared' ? 'success' : (chq.status === 'returned' ? 'danger' : 'warning')}`} style={{ textTransform: 'uppercase' }}>
                              {chq.status}
                            </span>
                          </td>
                        </tr>
                      ))}

                      {customerCheques.length === 0 && (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>
                            No cheques issued by this customer.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 4: Credit Aging Analysis */}
              {activeTab === 'aging' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                  <div style={{ background: '#242424', padding: 14, borderRadius: 6, border: '1px solid var(--line)', borderLeft: '4px solid #52e37e' }}>
                    <small style={{ color: 'var(--muted)', fontWeight: 700 }}>CURRENT (0 - {selectedCust.credit_days || 30} DAYS)</small>
                    <div className="mono font-semibold" style={{ fontSize: 22, marginTop: 4, color: '#52e37e' }}>
                      {formatCurrency(agingAnalysis.current)}
                    </div>
                    <small style={{ color: '#888', display: 'block', marginTop: 4 }}>Within allowed credit period</small>
                  </div>

                  <div style={{ background: '#242424', padding: 14, borderRadius: 6, border: '1px solid var(--line)', borderLeft: '4px solid #ffca58' }}>
                    <small style={{ color: 'var(--muted)', fontWeight: 700 }}>1 - 30 DAYS OVERDUE</small>
                    <div className="mono font-semibold" style={{ fontSize: 22, marginTop: 4, color: '#ffca58' }}>
                      {formatCurrency(agingAnalysis.days30)}
                    </div>
                    <small style={{ color: '#888', display: 'block', marginTop: 4 }}>Payment follow-up recommended</small>
                  </div>

                  <div style={{ background: '#242424', padding: 14, borderRadius: 6, border: '1px solid var(--line)', borderLeft: '4px solid #f97316' }}>
                    <small style={{ color: 'var(--muted)', fontWeight: 700 }}>31 - 60 DAYS OVERDUE</small>
                    <div className="mono font-semibold" style={{ fontSize: 22, marginTop: 4, color: '#f97316' }}>
                      {formatCurrency(agingAnalysis.days60)}
                    </div>
                    <small style={{ color: '#888', display: 'block', marginTop: 4 }}>Urgent collection required</small>
                  </div>

                  <div style={{ background: '#242424', padding: 14, borderRadius: 6, border: '1px solid var(--line)', borderLeft: '4px solid #ef4444' }}>
                    <small style={{ color: 'var(--muted)', fontWeight: 700 }}>60+ DAYS CRITICAL</small>
                    <div className="mono font-semibold" style={{ fontSize: 22, marginTop: 4, color: '#ef4444' }}>
                      {formatCurrency(agingAnalysis.days90Plus)}
                    </div>
                    <small style={{ color: '#888', display: 'block', marginTop: 4 }}>Credit lock recommended</small>
                  </div>
                </div>
              )}
              </div>

            </div>
          ) : (
            <div className="panel-card" style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>
              <h3>No Customer Selected</h3>
              <p>Select a customer from the directory on the left or create a new customer.</p>
              <button
                type="button"
                onClick={handleOpenCreateCustomer}
                className="primary-button"
                style={{ fontWeight: 700, marginTop: 12 }}
              >
                + Create New Customer
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Modal: Create / Edit Customer */}
      {isCustomerModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box modal-lg">
            <div className="modal-header">
              <h3>{customerModalMode === 'edit' ? `Edit Customer: ${customerForm.business_name}` : 'Add Wholesale Customer'}</h3>
              <button type="button" onClick={() => setIsCustomerModalOpen(false)} className="modal-close">&times;</button>
            </div>

            <form onSubmit={handleSaveCustomer}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label>Business / Store Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Metro Computer Solutions"
                      value={customerForm.business_name}
                      onChange={(e) => setCustomerForm(prev => ({ ...prev, business_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>Contact Person</label>
                    <input
                      type="text"
                      placeholder="e.g. Mr. Samantha Perera"
                      value={customerForm.contact_person}
                      onChange={(e) => setCustomerForm(prev => ({ ...prev, contact_person: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
                  <div>
                    <label>Phone *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 0771234567"
                      value={customerForm.phone}
                      onChange={(e) => setCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>WhatsApp Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 0771234567"
                      value={customerForm.whatsapp}
                      onChange={(e) => setCustomerForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>Email</label>
                    <input
                      type="email"
                      placeholder="customer@example.com"
                      value={customerForm.email}
                      onChange={(e) => setCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
                  <div>
                    <label>Assigned Price Tier</label>
                    <select
                      value={customerForm.price_tier}
                      onChange={(e) => setCustomerForm(prev => ({ ...prev, price_tier: e.target.value }))}
                    >
                      <option value="Dealer">Dealer (Lowest Price)</option>
                      <option value="Tier1">Tier 1 (3% Off Wholesale)</option>
                      <option value="VIP">VIP (8% Off Wholesale)</option>
                      <option value="Standard">Standard Wholesale</option>
                    </select>
                  </div>
                  <div>
                    <label>Credit Limit (Rs)</label>
                    <input
                      type="number"
                      step="1000"
                      className="mono"
                      value={customerForm.credit_limit}
                      onChange={(e) => setCustomerForm(prev => ({ ...prev, credit_limit: Number(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label>Credit Terms (Days)</label>
                    <input
                      type="number"
                      className="mono"
                      value={customerForm.credit_days}
                      onChange={(e) => setCustomerForm(prev => ({ ...prev, credit_days: Number(e.target.value) || 30 }))}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <label>Billing & Delivery Address</label>
                  <textarea
                    rows="2"
                    placeholder="Shop address, Street, City..."
                    value={customerForm.billing_address}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, billing_address: e.target.value }))}
                  />
                </div>

                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    id="credit_allowed_chk"
                    checked={customerForm.credit_allowed}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, credit_allowed: e.target.checked }))}
                  />
                  <label htmlFor="credit_allowed_chk" style={{ margin: 0, cursor: 'pointer' }}>
                    Allow Credit & Invoicing on Account
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsCustomerModalOpen(false)} className="secondary-button">
                  Cancel
                </button>
                <button type="submit" className="primary-button" style={{ fontWeight: 800 }}>
                  {customerModalMode === 'edit' ? 'Save Changes' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Settle Customer Credit / Payment */}
      {isSettlementModalOpen && selectedCust && (
        <div className="modal-overlay">
          <div className="modal-box modal-md">
            <div className="modal-header">
              <h3>Record Payment / Settle Credit: {selectedCust.business_name}</h3>
              <button type="button" onClick={() => setIsSettlementModalOpen(false)} className="modal-close">&times;</button>
            </div>

            <form onSubmit={handleSaveSettlement}>
              <div className="modal-body">
                <div style={{ background: '#242424', padding: 12, borderRadius: 4, marginBottom: 14, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>Current Outstanding Due:</span>
                  <strong className="mono" style={{ color: '#ff8e8e', fontSize: 16 }}>
                    {formatCurrency(outstandingDue)}
                  </strong>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label>Settlement Amount (Rs) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      autoFocus
                      className="mono font-semibold"
                      value={settlementForm.amount}
                      onChange={(e) => setSettlementForm(prev => ({ ...prev, amount: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>Payment Date *</label>
                    <input
                      type="date"
                      required
                      value={settlementForm.payment_date}
                      onChange={(e) => setSettlementForm(prev => ({ ...prev, payment_date: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <label>Payment Method *</label>
                  <div className="payment-method-selector">
                    <button
                      type="button"
                      className={`payment-method-btn cash ${settlementForm.payment_method === 'cash' ? 'active' : ''}`}
                      onClick={() => setSettlementForm(prev => ({ ...prev, payment_method: 'cash' }))}
                    >
                      <span>💵</span> Cash
                    </button>
                    <button
                      type="button"
                      className={`payment-method-btn bank ${settlementForm.payment_method === 'bank' ? 'active' : ''}`}
                      onClick={() => setSettlementForm(prev => ({ ...prev, payment_method: 'bank' }))}
                    >
                      <span>🏦</span> Bank Transfer
                    </button>
                    <button
                      type="button"
                      className={`payment-method-btn cheque ${settlementForm.payment_method === 'cheque' ? 'active' : ''}`}
                      onClick={() => setSettlementForm(prev => ({ ...prev, payment_method: 'cheque' }))}
                    >
                      <span>📝</span> Cheque
                    </button>
                  </div>
                </div>

                {settlementForm.payment_method === 'cheque' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 12, background: '#242424', padding: 12, borderRadius: 4 }}>
                    <div>
                      <label>Cheque Number *</label>
                      <input
                        type="text"
                        required
                        className="mono"
                        placeholder="e.g. 123456"
                        value={settlementForm.cheque_no}
                        onChange={(e) => setSettlementForm(prev => ({ ...prev, cheque_no: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label>Bank Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Commercial Bank"
                        value={settlementForm.bank_name}
                        onChange={(e) => setSettlementForm(prev => ({ ...prev, bank_name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label>Maturity / Cheque Date</label>
                      <input
                        type="date"
                        value={settlementForm.cheque_date}
                        onChange={(e) => setSettlementForm(prev => ({ ...prev, cheque_date: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 12 }}>
                  <label>Reference / Receipt Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Bank slip #, transfer ref, or invoice note"
                    value={settlementForm.reference}
                    onChange={(e) => setSettlementForm(prev => ({ ...prev, reference: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsSettlementModalOpen(false)} className="secondary-button">
                  Cancel
                </button>
                <button type="submit" disabled={isSavingSettlement} className="primary-button" style={{ fontWeight: 800, background: '#52e37e', color: '#000' }}>
                  {isSavingSettlement ? 'Saving…' : 'Save Payment & Settle Invoices'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
