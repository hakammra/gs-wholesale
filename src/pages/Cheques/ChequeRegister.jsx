import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency, formatDate } from '../../lib/formatters';

export default function ChequeRegister() {
  const { cheques, updateChequeStatus, bankAccounts } = useBusiness();
  const { notifySuccess } = useNotification();

  const [directionFilter, setDirectionFilter] = useState('received');
  const [actionCheque, setActionCheque] = useState(null);
  const [actionType, setActionType] = useState('clear');
  const [selectedBankId, setSelectedBankId] = useState(bankAccounts[0]?.id || '');
  const [returnReason, setReturnReason] = useState('Insufficient Funds');

  const filteredCheques = cheques.filter(c => c.direction === directionFilter);
  const totalPendingAmount = cheques.filter(c => c.direction === 'received' && (c.status === 'received' || c.status === 'held')).reduce((s, c) => s + (c.amount || 0), 0);

  const handleExecuteAction = () => {
    if (!actionCheque) return;

    if (actionType === 'clear') {
      updateChequeStatus(actionCheque.id, 'cleared', { deposit_bank_account_id: selectedBankId });
      notifySuccess(`Cheque #${actionCheque.cheque_no} cleared into bank!`);
    } else {
      updateChequeStatus(actionCheque.id, 'returned', { return_reason: returnReason });
      notifySuccess(`Cheque #${actionCheque.cheque_no} bounced & customer receivable reopened!`);
    }

    setActionCheque(null);
  };

  return (
    <div>
      {/* Action Toolbar */}
      <div className="action-toolbar">
        <button
          onClick={() => setDirectionFilter('received')}
          className={`toolbar-button ${directionFilter === 'received' ? 'bright' : ''}`}
        >
          <span className="icon">📥</span>
          <span>Received Cheques</span>
        </button>

        <button
          onClick={() => setDirectionFilter('issued')}
          className={`toolbar-button ${directionFilter === 'issued' ? 'bright' : ''}`}
        >
          <span className="icon">📤</span>
          <span>Issued Cheques</span>
        </button>
      </div>

      <div className="page-section" style={{ padding: 18 }}>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div className="stat-card">
            <p>PENDING CHEQUES IN DRAWER</p>
            <strong style={{ color: '#ffca58' }}>{formatCurrency(totalPendingAmount)}</strong>
          </div>
          <div className="stat-card">
            <p>TOTAL RECORDED CHEQUES</p>
            <strong>{filteredCheques.length} Cheques</strong>
          </div>
        </div>

        <div className="panel-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive" style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 850 }}>
              <thead>
                <tr>
                  <th>Cheque #</th>
                  <th>Party (Customer / Supplier)</th>
                  <th>Bank & Branch</th>
                  <th>Maturity Date</th>
                  <th>Amount (Rs)</th>
                  <th>Invoice Ref</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCheques.map(chq => (
                  <tr key={chq.id}>
                    <td className="mono font-semibold" style={{ color: 'var(--primary)' }}>{chq.cheque_no}</td>
                    <td style={{ fontWeight: 700 }}>{chq.party_name || '-'}</td>
                    <td>{chq.bank_name} ({chq.branch || 'Main'})</td>
                    <td>{formatDate(chq.cheque_date)}</td>
                    <td className="mono font-semibold">{formatCurrency(chq.amount)}</td>
                    <td className="mono">{chq.sales_doc_no || '-'}</td>
                    <td>
                      <span className={`badge badge-${chq.status === 'cleared' ? 'success' : chq.status === 'returned' ? 'danger' : 'warning'}`}>
                        {chq.status?.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {chq.status === 'received' && (
                        <>
                          <button
                            onClick={() => { setActionCheque(chq); setActionType('clear'); }}
                            className="success-button small-button"
                            style={{ marginRight: 6 }}
                          >
                            Clear
                          </button>
                          <button
                            onClick={() => { setActionCheque(chq); setActionType('return'); }}
                            className="danger-button small-button"
                          >
                            Bounce
                          </button>
                        </>
                      )}
                      {chq.status === 'returned' && (
                        <span style={{ fontSize: 11, color: '#ff8e8e' }}>Receivable Reopened</span>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredCheques.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', color: 'var(--muted)', padding: 30 }}>
                      No cheques recorded in this view.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Cheque Action Modal */}
      {actionCheque && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>{actionType === 'clear' ? `Clear Cheque #${actionCheque.cheque_no}` : `Bounce Cheque #${actionCheque.cheque_no}`}</h3>
              <button onClick={() => setActionCheque(null)} className="modal-close">&times;</button>
            </div>

            <div className="modal-body">
              <div style={{ background: '#242424', padding: 12, border: '1px solid var(--line)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>AMOUNT</span>
                  <div className="mono font-semibold" style={{ fontSize: 18, color: 'var(--primary)' }}>{formatCurrency(actionCheque.amount)}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>CUSTOMER</span>
                  <div style={{ fontWeight: 700 }}>{actionCheque.party_name}</div>
                </div>
              </div>

              {actionType === 'clear' ? (
                <div>
                  <label>Deposit into Bank Account</label>
                  <select
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                  >
                    {bankAccounts.map(b => (
                      <option key={b.id} value={b.id}>{b.account_name} ({b.bank_name})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label>Return / Bounce Reason</label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                  >
                    <option value="Insufficient Funds">Insufficient Funds</option>
                    <option value="Signature Differs">Signature Differs</option>
                    <option value="Post-dated / Stale">Post-dated / Stale</option>
                    <option value="Account Closed">Account Closed</option>
                  </select>
                  <p style={{ color: '#ff8e8e', fontSize: 12, marginTop: 8 }}>
                    * Bouncing this cheque will automatically restore the unpaid invoice balance and reopen customer receivable.
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setActionCheque(null)} className="secondary-button">
                Cancel
              </button>
              <button
                onClick={handleExecuteAction}
                className={actionType === 'clear' ? 'success-button' : 'danger-button'}
              >
                {actionType === 'clear' ? 'Confirm Clearance' : 'Confirm Return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
