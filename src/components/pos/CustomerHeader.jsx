import React from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency } from '../../lib/formatters';

export default function CustomerHeader({
  selectedCustomer,
  onSelectCustomer,
  onOpenAddCustomer,
  docType = 'sales_invoice',
  onChangeDocType
}) {
  const { customers = [] } = useBusiness();

  const handleCustomerChange = (e) => {
    const custId = e.target.value;
    const cust = customers.find(c => String(c.id) === String(custId)) || null;
    onSelectCustomer(cust);
  };

  const liveCustomer = selectedCustomer
    ? (customers.find(c => String(c.id) === String(selectedCustomer.id)) || selectedCustomer)
    : null;

  const isCreditRestricted = liveCustomer && !liveCustomer.credit_allowed;
  const isOverLimit = liveCustomer && (Number(liveCustomer.current_receivable || 0) > Number(liveCustomer.credit_limit || 0));

  return (
    <div className="pos-customer-banner">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        {/* Document Type Selector (Wholesale Invoice / Order / Quotation) */}
        <div>
          <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>DOCUMENT TYPE</label>
          <select
            value={docType}
            onChange={(e) => onChangeDocType?.(e.target.value)}
            style={{ fontWeight: 700, minWidth: 150, color: 'var(--primary)' }}
          >
            <option value="sales_invoice">Wholesale Invoice</option>
            <option value="sales_order">Wholesale Order</option>
            <option value="quotation">Price Quotation</option>
          </select>
        </div>

        {/* Customer Selector */}
        <div style={{ minWidth: 260 }}>
          <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>WHOLESALE CUSTOMER</label>
          <select
            value={liveCustomer?.id || ''}
            onChange={handleCustomerChange}
            style={{ fontWeight: 600 }}
          >
            <option value="">-- Walk-in / Cash Wholesale Customer --</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.customer_code} - {c.business_name} ({c.price_tier || 'Standard'})
              </option>
            ))}
          </select>
        </div>

        {liveCustomer && (
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', borderLeft: '1px solid var(--line)', paddingLeft: 14 }}>
            <div>
              <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block' }}>TIER</span>
              <span className="badge badge-primary">{liveCustomer.price_tier || 'Standard'}</span>
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block' }}>DUE RECEIVABLE</span>
              <span className="mono" style={{ color: liveCustomer.current_receivable > 0 ? '#ff8e8e' : '#52e37e', fontWeight: 700 }}>
                {formatCurrency(liveCustomer.current_receivable || 0)}
              </span>
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block' }}>CREDIT LIMIT</span>
              <span className="mono" style={{ fontWeight: 600 }}>
                {formatCurrency(liveCustomer.credit_limit || 0)}
              </span>
            </div>
            {isOverLimit && <span className="badge badge-danger">LIMIT EXCEEDED</span>}
            {isCreditRestricted && <span className="badge badge-warning">CREDIT LOCKED</span>}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" onClick={onOpenAddCustomer} className="secondary-button small-button" style={{ fontWeight: 700 }}>
          + Add Customer
        </button>
      </div>
    </div>
  );
}
