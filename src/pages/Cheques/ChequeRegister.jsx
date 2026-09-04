import React, { useMemo, useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency, formatDate } from '../../lib/formatters';

const PENDING_STATUSES = new Set(['received', 'held', 'deposited']);

export default function ChequeRegister() {
  const { cheques = [], updateChequeStatus, bankAccounts = [] } = useBusiness();
  const { notifySuccess } = useNotification();
  const [directionFilter, setDirectionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionCheque, setActionCheque] = useState(null);
  const [actionType, setActionType] = useState('clear');
  const [selectedBankId, setSelectedBankId] = useState(bankAccounts[0]?.id || '');
  const [returnReason, setReturnReason] = useState('Insufficient Funds');
  const [isSaving, setIsSaving] = useState(false);

  const filteredCheques = useMemo(() => cheques
    .filter(cheque => directionFilter === 'all' || cheque.direction === directionFilter)
    .filter(cheque => statusFilter === 'all' || cheque.status === statusFilter)
    .filter(cheque => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      return [cheque.cheque_no, cheque.party_name, cheque.bank_name, cheque.sales_doc_no, cheque.notes]
        .some(value => String(value || '').toLowerCase().includes(term));
    })
    .sort((a, b) => new Date(a.cheque_date || a.created_at) - new Date(b.cheque_date || b.created_at)),
  [cheques, directionFilter, statusFilter, searchTerm]);

  const pendingReceived = cheques.filter(cheque => cheque.direction === 'received' && PENDING_STATUSES.has(cheque.status));
  const pendingIssued = cheques.filter(cheque => cheque.direction === 'issued' && PENDING_STATUSES.has(cheque.status));
  const receivedAmount = pendingReceived.reduce((sum, cheque) => sum + (Number(cheque.amount) || 0), 0);
  const issuedAmount = pendingIssued.reduce((sum, cheque) => sum + (Number(cheque.amount) || 0), 0);

  const openAction = (cheque, type) => {
    setActionCheque(cheque);
    setActionType(type);
    setSelectedBankId(cheque.deposit_bank_account_id || bankAccounts[0]?.id || '');
    setReturnReason('Insufficient Funds');
  };

  const handleExecuteAction = async () => {
    if (!actionCheque || isSaving || (actionType === 'clear' && !selectedBankId)) return;
    setIsSaving(true);
    try {
      const nextStatus = actionType === 'clear' ? 'cleared' : actionType === 'return' ? 'returned' : 'cancelled';
      await updateChequeStatus(actionCheque.id, nextStatus, {
        deposit_bank_account_id: actionType === 'clear' ? selectedBankId : null,
        return_reason: actionType === 'return' ? returnReason : null
      });
      notifySuccess(
        actionType === 'clear'
          ? `Cheque #${actionCheque.cheque_no} marked as cleared.`
          : actionType === 'return'
            ? `Cheque #${actionCheque.cheque_no} returned and the customer balance was reopened.`
            : `Issued cheque #${actionCheque.cheque_no} cancelled.`
      );
      setActionCheque(null);
    } finally {
      setIsSaving(false);
    }
  };

  const actionTitle = actionType === 'clear'
    ? `Clear cheque #${actionCheque?.cheque_no || ''}`
    : actionType === 'return'
      ? `Return cheque #${actionCheque?.cheque_no || ''}`
      : `Cancel cheque #${actionCheque?.cheque_no || ''}`;

  return (
    <div>
      <div className="action-toolbar cheque-toolbar">
        {['all', 'received', 'issued'].map(direction => (
          <button key={direction} onClick={() => setDirectionFilter(direction)} className={`toolbar-button ${directionFilter === direction ? 'bright' : ''}`}>
            <span className="icon">{direction === 'received' ? '📥' : direction === 'issued' ? '📤' : '▤'}</span>
            <span>{direction === 'all' ? 'All Cheques' : direction === 'received' ? 'Received' : 'Issued'}</span>
          </button>
        ))}
      </div>

      <div className="page-section" style={{ padding: 18 }}>
        <div className="stats-grid cheque-stats-grid">
          <div className="stat-card"><p>PENDING RECEIVED</p><strong style={{ color: '#ffca58' }}>{formatCurrency(receivedAmount)}</strong><small>{pendingReceived.length} awaiting clearance</small></div>
          <div className="stat-card"><p>PENDING ISSUED</p><strong style={{ color: '#ff8e8e' }}>{formatCurrency(issuedAmount)}</strong><small>{pendingIssued.length} not yet cleared</small></div>
          <div className="stat-card"><p>CLEARED</p><strong style={{ color: '#52e37e' }}>{cheques.filter(cheque => cheque.status === 'cleared').length}</strong><small>completed cheque payments</small></div>
        </div>

        <div className="ledger-filter-row">
          <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search cheque, party, bank or document…" />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option><option value="received">Received</option><option value="held">Held / Issued</option><option value="deposited">Deposited</option><option value="cleared">Cleared</option><option value="returned">Returned</option><option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="panel-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive" style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 980 }}>
              <thead><tr><th>Cheque #</th><th>Direction</th><th>Party</th><th>Bank</th><th>Cheque Date</th><th>Amount</th><th>Source Document</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredCheques.map(cheque => {
                  const pending = PENDING_STATUSES.has(cheque.status);
                  return (
                    <tr key={cheque.id}>
                      <td className="mono font-semibold" style={{ color: 'var(--primary)' }}>{cheque.cheque_no}</td>
                      <td><span className={`badge ${cheque.direction === 'received' ? 'badge-success' : 'badge-danger'}`}>{cheque.direction === 'received' ? 'RECEIVED' : 'ISSUED'}</span></td>
                      <td style={{ fontWeight: 700 }}>{cheque.party_name || 'Other'}</td>
                      <td>{cheque.bank_name || 'Bank'}{cheque.branch ? ` · ${cheque.branch}` : ''}</td>
                      <td>{formatDate(cheque.cheque_date)}</td>
                      <td className="mono font-semibold">{formatCurrency(cheque.amount)}</td>
                      <td className="mono">{cheque.sales_doc_no || cheque.notes || '-'}</td>
                      <td><span className={`badge badge-${cheque.status === 'cleared' ? 'success' : ['returned', 'cancelled'].includes(cheque.status) ? 'danger' : 'warning'}`}>{String(cheque.status || 'pending').toUpperCase()}</span></td>
                      <td>
                        {pending && <button onClick={() => openAction(cheque, 'clear')} className="success-button small-button" style={{ marginRight: 6 }}>Clear</button>}
                        {pending && cheque.direction === 'received' && <button onClick={() => openAction(cheque, 'return')} className="danger-button small-button">Return</button>}
                        {pending && cheque.direction === 'issued' && <button onClick={() => openAction(cheque, 'cancel')} className="danger-button small-button">Cancel</button>}
                      </td>
                    </tr>
                  );
                })}
                {!filteredCheques.length && <tr><td colSpan="9" className="empty-state-cell">No cheques match this view.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {actionCheque && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header"><h3>{actionTitle}</h3><button onClick={() => setActionCheque(null)} className="modal-close">&times;</button></div>
            <div className="modal-body">
              <div className="cheque-action-summary"><div><small>AMOUNT</small><strong>{formatCurrency(actionCheque.amount)}</strong></div><div><small>PARTY</small><strong>{actionCheque.party_name || 'Other'}</strong></div></div>
              {actionType === 'clear' && <div><label>{actionCheque.direction === 'received' ? 'Deposit into bank account' : 'Clear from bank account'} *</label><select value={selectedBankId} onChange={(event) => setSelectedBankId(event.target.value)} required><option value="">Select bank account</option>{bankAccounts.map(account => <option key={account.id} value={account.id}>{account.account_name} ({account.bank_name})</option>)}</select></div>}
              {actionType === 'return' && <div><label>Return reason</label><select value={returnReason} onChange={(event) => setReturnReason(event.target.value)}><option>Insufficient Funds</option><option>Signature Differs</option><option>Post-dated / Stale</option><option>Account Closed</option></select><p className="form-warning">Returning a received cheque reopens the related customer receivable.</p></div>}
              {actionType === 'cancel' && <p className="form-warning">This marks the issued cheque as cancelled. It will not affect realized cash flow or the selected bank balance.</p>}
            </div>
            <div className="modal-footer"><button onClick={() => setActionCheque(null)} className="secondary-button">Close</button><button onClick={handleExecuteAction} disabled={isSaving || (actionType === 'clear' && !selectedBankId)} className={actionType === 'clear' ? 'success-button' : 'danger-button'}>{isSaving ? 'Saving…' : actionType === 'clear' ? 'Confirm Clearance' : actionType === 'return' ? 'Confirm Return' : 'Confirm Cancellation'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
