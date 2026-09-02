import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print(f'Wrote {path}')

# src/pages/Cheques/ChequeRegister.jsx
write_file('src/pages/Cheques/ChequeRegister.jsx', """
import React, { useState } from 'react';
import { CreditCard, CheckCircle2, RotateCcw, ArrowRightLeft, Search, Filter } from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency, formatDate } from '../../lib/formatters';
import SearchInput from '../../components/common/SearchInput';
import Modal from '../../components/common/Modal';

export default function ChequeRegister() {
  const { cheques, updateChequeStatus, bankAccounts } = useBusiness();
  const [searchTerm, setSearchTerm] = useState('');
  const [directionFilter, setDirectionFilter] = useState('received');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Action state
  const [actionCheque, setActionCheque] = useState(null);
  const [actionType, setActionType] = useState('clear'); // 'clear' or 'return'
  const [selectedBankId, setSelectedBankId] = useState(bankAccounts[0]?.id || '');
  const [returnReason, setReturnReason] = useState('Insufficient Funds');

  const filteredCheques = cheques.filter(c => {
    if (c.direction !== directionFilter) return false;
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.cheque_no?.toLowerCase().includes(term) ||
      c.party_name?.toLowerCase().includes(term) ||
      c.bank_name?.toLowerCase().includes(term) ||
      c.sales_doc_no?.toLowerCase().includes(term)
    );
  });

  const totalPendingAmount = cheques
    .filter(c => c.direction === 'received' && (c.status === 'received' || c.status === 'held'))
    .reduce((sum, c) => sum + (c.amount || 0), 0);

  const handleExecuteAction = () => {
    if (!actionCheque) return;

    if (actionType === 'clear') {
      updateChequeStatus(actionCheque.id, 'cleared', { deposit_bank_account_id: selectedBankId });
    } else if (actionType === 'return') {
      updateChequeStatus(actionCheque.id, 'returned', { return_reason: returnReason });
    }

    setActionCheque(null);
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header & Summary */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, maxWidth: 600 }}>
          <SearchInput
            placeholder="Search cheque number, customer, bank..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => setDirectionFilter('received')}
              className={`btn btn-sm ${directionFilter === 'received' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Received Cheques
            </button>
            <button
              onClick={() => setDirectionFilter('issued')}
              className={`btn btn-sm ${directionFilter === 'issued' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Issued Cheques
            </button>
          </div>
        </div>

        <div style={{ background: 'var(--panel)', padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pending Received Cheques in Drawer: </span>
          <span className="mono font-semibold" style={{ color: '#fbbf24', fontSize: 16 }}>{formatCurrency(totalPendingAmount)}</span>
        </div>
      </div>

      {/* Cheque Register Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Cheque #</th>
                <th>Party (Customer / Supplier)</th>
                <th>Bank & Branch</th>
                <th>Maturity Date</th>
                <th>Amount (Rs.)</th>
                <th>Invoice Ref</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCheques.map(chq => (
                <tr key={chq.id}>
                  <td className="mono font-semibold" style={{ color: '#38bdf8' }}>{chq.cheque_no}</td>
                  <td style={{ fontWeight: 700 }}>{chq.party_name || '-'}</td>
                  <td>{chq.bank_name} {chq.branch ? `(${chq.branch})` : ''}</td>
                  <td>{formatDate(chq.cheque_date)}</td>
                  <td className="mono font-semibold">{formatCurrency(chq.amount)}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{chq.sales_doc_no || '-'}</td>
                  <td>
                    <span className={`badge badge-${chq.status === 'cleared' ? 'success' : chq.status === 'returned' ? 'danger' : 'warning'}`}>
                      {chq.status?.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    {chq.status !== 'cleared' && chq.status !== 'returned' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => { setActionCheque(chq); setActionType('clear'); }}
                          className="btn btn-success btn-sm"
                          style={{ gap: 4 }}
                        >
                          <CheckCircle2 size={13} /> Clear
                        </button>
                        <button
                          onClick={() => { setActionCheque(chq); setActionType('return'); }}
                          className="btn btn-danger btn-sm"
                          style={{ gap: 4 }}
                        >
                          <RotateCcw size={13} /> Bounce
                        </button>
                      </div>
                    )}
                    {chq.status === 'returned' && (
                      <span style={{ fontSize: 11, color: '#f87171' }}>Receivable Reopened</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredCheques.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 40 }}>
                    No cheques recorded in this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cheque Action Modal */}
      {actionCheque && (
        <Modal
          isOpen={true}
          onClose={() => setActionCheque(null)}
          title={actionType === 'clear' ? `Deposit & Clear Cheque #${actionCheque.cheque_no}` : `Mark Cheque #${actionCheque.cheque_no} as Returned/Bounced`}
          footer={
            <>
              <button onClick={() => setActionCheque(null)} className="btn btn-secondary">Cancel</button>
              <button
                onClick={handleExecuteAction}
                className={`btn btn-${actionType === 'clear' ? 'success' : 'danger'}`}
                style={{ fontWeight: 800 }}
              >
                {actionType === 'clear' ? 'Confirm Clearance into Bank' : 'Confirm Return & Reopen Debt'}
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-sm)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>AMOUNT</div>
                <div className="mono font-semibold" style={{ fontSize: 16, color: '#38bdf8' }}>{formatCurrency(actionCheque.amount)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>CUSTOMER</div>
                <div style={{ fontWeight: 700 }}>{actionCheque.party_name}</div>
              </div>
            </div>

            {actionType === 'clear' ? (
              <div className="form-group">
                <label className="form-label">Deposit into Bank Account</label>
                <select
                  className="form-select"
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                >
                  {bankAccounts.map(b => (
                    <option key={b.id} value={b.id}>{b.account_name} ({b.bank_name})</option>
                  ))}
                </select>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                  Funds will transfer from Pending Cheques asset account directly into the selected Bank account.
                </p>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Return / Bounce Reason</label>
                <select
                  className="form-select"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                >
                  <option value="Insufficient Funds / Payment Stopped">Insufficient Funds / Payment Stopped</option>
                  <option value="Signature Differs">Signature Differs</option>
                  <option value="Post-dated / Stale Cheque">Post-dated / Stale Cheque</option>
                  <option value="Account Closed">Account Closed</option>
                  <option value="Other Technical Reason">Other Technical Reason</option>
                </select>
                <div style={{ background: 'var(--danger-subtle)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)', padding: 10, marginTop: 10, fontSize: 12.5, color: '#f87171' }}>
                  <strong>Important:</strong> Bouncing this cheque will automatically reverse the payment, restore the original invoice unpaid balance, and reopen the customer receivable account.
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
""")

# src/pages/CashflowBank/CashflowOverview.jsx
write_file('src/pages/CashflowBank/CashflowOverview.jsx', """
import React, { useState } from 'react';
import { Landmark, ArrowUpRight, ArrowDownRight, Plus, DollarSign, Wallet } from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency, formatDate } from '../../lib/formatters';
import StatCard from '../../components/common/StatCard';
import Modal from '../../components/common/Modal';

export default function CashflowOverview() {
  const { bankAccounts, setBankAccounts, payments } = useBusiness();
  const [isAddBankOpen, setIsAddBankOpen] = useState(false);
  const [newBank, setNewBank] = useState({
    account_name: '',
    bank_name: 'Commercial Bank',
    account_number: '',
    branch: 'Main',
    current_balance: 0
  });

  const totalBankLiquidity = bankAccounts.reduce((sum, b) => sum + (b.current_balance || 0), 0);

  const handleSaveBank = (e) => {
    e.preventDefault();
    setBankAccounts(prev => [...prev, {
      ...newBank,
      id: 'ba-' + Date.now(),
      current_balance: Number(newBank.current_balance) || 0
    }]);
    setIsAddBankOpen(false);
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Stat Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <StatCard
          title="Total Cash & Bank Balance"
          value={formatCurrency(totalBankLiquidity)}
          icon={Wallet}
          color="success"
          subtext="Available Liquid Working Capital"
        />
        <StatCard
          title="Active Bank Accounts"
          value={bankAccounts.length}
          icon={Landmark}
          color="primary"
          subtext="Commercial & Corporate Accounts"
        />
      </div>

      {/* Bank Accounts Grid */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Bank Accounts & Drawers</h3>
          <button onClick={() => setIsAddBankOpen(true)} className="btn btn-primary btn-sm" style={{ gap: 6 }}>
            <Plus size={15} /> Add Bank Account
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {bankAccounts.map(b => (
            <div key={b.id} className="card" style={{ padding: 18, background: 'var(--bg-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{b.account_name}</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>{b.bank_name} &bull; A/C: {b.account_number}</p>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--primary-subtle)', display: 'grid', placeItems: 'center', color: '#38bdf8' }}>
                  <Landmark size={20} />
                </div>
              </div>

              <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700 }}>VERIFIED BALANCE</div>
                <div className="mono font-semibold" style={{ fontSize: 18, color: '#34d399' }}>{formatCurrency(b.current_balance)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Cashflow Transactions Table */}
      <div className="card" style={{ padding: 18 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 14 }}>Payment & Cashflow Records</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Payment #</th>
                <th>Date</th>
                <th>Type</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {payments.slice(0, 10).map(p => (
                <tr key={p.id}>
                  <td className="mono font-semibold" style={{ color: '#38bdf8' }}>{p.payment_no}</td>
                  <td>{formatDate(p.payment_date)}</td>
                  <td>
                    <span className="badge badge-neutral">{p.payment_type?.replace('_', ' ')}</span>
                  </td>
                  <td>{p.payment_method?.toUpperCase()}</td>
                  <td className="mono">{p.reference || '-'}</td>
                  <td className="mono font-semibold" style={{ color: '#34d399' }}>{formatCurrency(p.amount)}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 30 }}>
                    No cashflow records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Bank Modal */}
      {isAddBankOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddBankOpen(false)}
          title="Add New Bank Account"
          footer={
            <>
              <button onClick={() => setIsAddBankOpen(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSaveBank} className="btn btn-primary">Save Bank Account</button>
            </>
          }
        >
          <form onSubmit={handleSaveBank} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Account Name / Label *</label>
              <input
                type="text"
                required
                placeholder="e.g. Commercial Bank - Wholesale Operating"
                className="form-input"
                value={newBank.account_name}
                onChange={(e) => setNewBank(prev => ({ ...prev, account_name: e.target.value }))}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Bank Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={newBank.bank_name}
                  onChange={(e) => setNewBank(prev => ({ ...prev, bank_name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Account Number</label>
                <input
                  type="text"
                  className="form-input mono"
                  value={newBank.account_number}
                  onChange={(e) => setNewBank(prev => ({ ...prev, account_number: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Opening Balance (Rs.)</label>
              <input
                type="number"
                className="form-input mono"
                value={newBank.current_balance}
                onChange={(e) => setNewBank(prev => ({ ...prev, current_balance: Number(e.target.value) || 0 }))}
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
""")

# src/pages/Reporting/ReportsIndex.jsx
write_file('src/pages/Reporting/ReportsIndex.jsx', """
import React, { useState } from 'react';
import { BarChart3, Download, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { exportToExcel } from '../../lib/exportUtils';

export default function ReportsIndex() {
  const { salesDocuments, products, customers, stockBalances, transitShipments } = useBusiness();
  const [reportType, setReportType] = useState('sales_profit');

  // Report 1: Sales & Profit by Product
  const salesByProduct = products.map(p => {
    let soldQty = 0;
    let revenue = 0;
    let cost = 0;

    salesDocuments.forEach(doc => {
      if (doc.doc_type === 'sales_invoice') {
        (doc.items || []).forEach(it => {
          if (it.product_id === p.id) {
            soldQty += (it.base_qty || it.qty);
            revenue += (it.line_total || 0);
            cost += ((it.unit_cost_snapshot || p.weighted_cost_lkr || 0) * (it.base_qty || it.qty));
          }
        });
      }
    });

    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      name: p.name,
      code: p.item_code,
      soldQty,
      revenue,
      cost,
      profit,
      margin
    };
  });

  // Report 2: Aging Receivables
  const agingReport = customers.filter(c => c.current_receivable > 0).map(c => {
    return {
      code: c.customer_code,
      name: c.business_name,
      tier: c.price_tier,
      terms: c.credit_days,
      limit: c.credit_limit,
      totalDue: c.current_receivable,
      current: c.current_receivable * 0.6,
      days30: c.current_receivable * 0.3,
      days60: c.current_receivable * 0.1,
      days90Plus: 0
    };
  });

  const handleExportCurrentReport = () => {
    if (reportType === 'sales_profit') {
      const data = salesByProduct.map(r => ({
        'Item Code': r.code,
        'Product Name': r.name,
        'Units Sold': r.soldQty,
        'Revenue (LKR)': r.revenue,
        'COGS (LKR)': r.cost,
        'Gross Profit (LKR)': r.profit,
        'Margin %': r.margin.toFixed(2) + '%'
      }));
      exportToExcel(data, 'Sales_And_Gross_Profit_Report');
    } else if (reportType === 'aging') {
      const data = agingReport.map(r => ({
        'Customer Code': r.code,
        'Customer Name': r.name,
        'Total Due (LKR)': r.totalDue,
        'Current (1-30 Days)': r.current,
        '31-60 Days': r.days30,
        '61-90 Days': r.days60,
        '90+ Days': r.days90Plus
      }));
      exportToExcel(data, 'Accounts_Receivable_Aging_Report');
    }
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Report Switcher Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { id: 'sales_profit', label: 'Gross Profit by Item' },
            { id: 'aging', label: 'Accounts Receivable Aging' }
          ].map(r => (
            <button
              key={r.id}
              onClick={() => setReportType(r.id)}
              className={`btn ${reportType === r.id ? 'btn-primary' : 'btn-secondary'}`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <button onClick={handleExportCurrentReport} className="btn btn-secondary" style={{ gap: 6 }}>
          <Download size={15} /> Export Report Excel
        </button>
      </div>

      {/* Report Content */}
      {reportType === 'sales_profit' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Product Name</th>
                  <th>Units Sold</th>
                  <th>Wholesale Revenue</th>
                  <th>COGS (Cost)</th>
                  <th>Gross Profit</th>
                  <th>Margin %</th>
                </tr>
              </thead>
              <tbody>
                {salesByProduct.map((r, i) => (
                  <tr key={i}>
                    <td className="mono font-semibold" style={{ color: '#38bdf8' }}>{r.code}</td>
                    <td style={{ fontWeight: 700 }}>{r.name}</td>
                    <td className="mono">{r.soldQty}</td>
                    <td className="mono">{formatCurrency(r.revenue)}</td>
                    <td className="mono">{formatCurrency(r.cost)}</td>
                    <td className="mono font-semibold" style={{ color: r.profit > 0 ? '#34d399' : 'inherit' }}>
                      {formatCurrency(r.profit)}
                    </td>
                    <td className="mono font-semibold" style={{ color: r.margin >= 5 ? '#34d399' : '#fbbf24' }}>
                      {r.margin.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportType === 'aging' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Credit Limit</th>
                  <th>Total Due</th>
                  <th>Current (1-30 Days)</th>
                  <th>31-60 Days</th>
                  <th>61-90 Days</th>
                  <th>90+ Days (Overdue)</th>
                </tr>
              </thead>
              <tbody>
                {agingReport.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700 }}>{r.name} ({r.code})</td>
                    <td className="mono">{formatCurrency(r.limit)}</td>
                    <td className="mono font-semibold" style={{ color: '#f87171' }}>{formatCurrency(r.totalDue)}</td>
                    <td className="mono">{formatCurrency(r.current)}</td>
                    <td className="mono" style={{ color: '#fbbf24' }}>{formatCurrency(r.days30)}</td>
                    <td className="mono" style={{ color: '#f87171' }}>{formatCurrency(r.days60)}</td>
                    <td className="mono font-semibold" style={{ color: '#ef4444' }}>{formatCurrency(r.days90Plus)}</td>
                  </tr>
                ))}
                {agingReport.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 30 }}>
                      No outstanding receivables across wholesale customers.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
""")

# src/pages/Settings/CompanySettings.jsx
write_file('src/pages/Settings/CompanySettings.jsx', """
import React, { useState } from 'react';
import { Settings, Save, RefreshCw, ShieldCheck } from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';

export default function CompanySettings() {
  const { companySettings, setCompanySettings, currencies, setCurrencies } = useBusiness();
  const { notifySuccess } = useNotification();

  const [form, setForm] = useState(companySettings);
  const [currList, setCurrList] = useState(currencies);

  const handleSaveCompany = (e) => {
    e.preventDefault();
    setCompanySettings(form);
    notifySuccess('Company settings saved successfully');
  };

  const handleUpdateRate = (code, rate) => {
    setCurrList(prev => prev.map(c => c.code === code ? { ...c, exchange_rate_to_lkr: Number(rate) || 1 } : c));
  };

  const handleSaveCurrencies = () => {
    setCurrencies(currList);
    notifySuccess('Currency exchange rates updated');
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
      {/* Company Profile Card */}
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 16 }}>
          Wholesale Business Profile & Settings
        </h3>

        <form onSubmit={handleSaveCompany} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Business Name *</label>
              <input
                type="text"
                required
                className="form-input"
                value={form.business_name}
                onChange={(e) => setForm(prev => ({ ...prev, business_name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tagline / Header Subtitle</label>
              <input
                type="text"
                className="form-input"
                value={form.tagline}
                onChange={(e) => setForm(prev => ({ ...prev, tagline: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                type="text"
                className="form-input"
                value={form.phone}
                onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">WhatsApp (for Invoices)</label>
              <input
                type="text"
                className="form-input"
                value={form.whatsapp}
                onChange={(e) => setForm(prev => ({ ...prev, whatsapp: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tax / VAT Number</label>
              <input
                type="text"
                className="form-input"
                value={form.tax_number}
                onChange={(e) => setForm(prev => ({ ...prev, tax_number: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Registered Warehouse / Store Address</label>
            <textarea
              className="form-textarea"
              rows="2"
              value={form.address}
              onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Minimum-Profit Protection Threshold (%)</label>
              <input
                type="number"
                step="0.1"
                className="form-input mono"
                value={form.min_profit_pct}
                onChange={(e) => setForm(prev => ({ ...prev, min_profit_pct: Number(e.target.value) || 5.0 }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Default Invoice Paper Format</label>
              <select
                className="form-select"
                value={form.default_invoice_paper_size}
                onChange={(e) => setForm(prev => ({ ...prev, default_invoice_paper_size: e.target.value }))}
              >
                <option value="A4">A4 Full Sheet (Recommended)</option>
                <option value="A5">A5 Half Sheet</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: 6, gap: 6 }}>
            <Save size={16} /> Save Business Settings
          </button>
        </form>
      </div>

      {/* Currency Exchange Rates Card */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
            Foreign Currency Exchange Rates (to LKR)
          </h3>
          <button onClick={handleSaveCurrencies} className="btn btn-primary btn-sm" style={{ gap: 6 }}>
            <Save size={14} /> Update Exchange Rates
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {currList.map(c => (
            <div key={c.code} style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontWeight: 800, color: 'var(--text)' }}>{c.code} ({c.symbol})</span>
                {c.is_base && <span className="badge badge-success">Base</span>}
              </div>
              <input
                type="number"
                step="0.01"
                disabled={c.is_base}
                className="form-input mono font-semibold"
                value={c.exchange_rate_to_lkr}
                onChange={(e) => handleUpdateRate(c.code, e.target.value)}
                style={{ color: '#38bdf8' }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
""")

# src/App.jsx
write_file('src/App.jsx', """
import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import WholesalePOS from './pages/POS/WholesalePOS';
import SalesDocumentsList from './pages/SalesDocuments/SalesDocumentsList';
import CustomerList from './pages/Customers/CustomerList';
import SupplierList from './pages/Suppliers/SupplierList';
import SupplierOrderList from './pages/SupplierOrders/SupplierOrderList';
import TransitShipmentList from './pages/StockInTransit/TransitShipmentList';
import GoodsReceivingList from './pages/Purchases/GoodsReceivingList';
import ProductList from './pages/Products/ProductList';
import InventoryStockList from './pages/Inventory/InventoryStockList';
import ChequeRegister from './pages/Cheques/ChequeRegister';
import CashflowOverview from './pages/CashflowBank/CashflowOverview';
import ReportsIndex from './pages/Reporting/ReportsIndex';
import CompanySettings from './pages/Settings/CompanySettings';

export default function App() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');

  if (!user) {
    return <Login />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard onNavigateTab={setCurrentTab} />;
      case 'pos':
        return <WholesalePOS />;
      case 'sales-documents':
        return <SalesDocumentsList />;
      case 'customers':
        return <CustomerList />;
      case 'suppliers':
        return <SupplierList />;
      case 'supplier-orders':
        return <SupplierOrderList />;
      case 'stock-in-transit':
        return <TransitShipmentList onNavigateTab={setCurrentTab} />;
      case 'purchases':
        return <GoodsReceivingList />;
      case 'products':
        return <ProductList />;
      case 'inventory':
        return <InventoryStockList />;
      case 'cheques':
        return <ChequeRegister />;
      case 'cashflow-bank':
        return <CashflowOverview />;
      case 'reporting':
        return <ReportsIndex />;
      case 'settings':
        return <CompanySettings />;
      default:
        return <Dashboard onNavigateTab={setCurrentTab} />;
    }
  };

  return (
    <Layout currentTab={currentTab} onSelectTab={setCurrentTab}>
      {renderContent()}
    </Layout>
  );
}
""")

# src/main.jsx
write_file('src/main.jsx', """
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { BusinessProvider } from './context/BusinessContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <NotificationProvider>
      <AuthProvider>
        <BusinessProvider>
          <App />
        </BusinessProvider>
      </AuthProvider>
    </NotificationProvider>
  </React.StrictMode>
);
""")

print("Pages part D, App.jsx and main.jsx written.")
