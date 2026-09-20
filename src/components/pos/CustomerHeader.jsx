import React, { useEffect, useMemo, useRef, useState } from 'react';
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

  const liveCustomer = selectedCustomer
    ? (customers.find(c => String(c.id) === String(selectedCustomer.id)) || selectedCustomer)
    : null;

  const customerLabel = (customer) => customer
    ? `${customer.customer_code ? `${customer.customer_code} - ` : ''}${customer.business_name || customer.contact_person || 'Customer'}`
    : '';

  const [customerQuery, setCustomerQuery] = useState(() => customerLabel(liveCustomer));
  const [isCustomerListOpen, setIsCustomerListOpen] = useState(false);
  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(0);
  const customerPickerRef = useRef(null);
  const customerResultsRef = useRef(null);
  const isTypingCustomerRef = useRef(false);
  const syncedCustomerIdRef = useRef(liveCustomer?.id || null);

  useEffect(() => {
    const nextCustomerId = liveCustomer?.id || null;
    if (nextCustomerId === syncedCustomerIdRef.current) return;
    syncedCustomerIdRef.current = nextCustomerId;
    if (nextCustomerId) {
      setCustomerQuery(customerLabel(liveCustomer));
      isTypingCustomerRef.current = false;
    } else if (!isTypingCustomerRef.current) {
      setCustomerQuery('');
    }
  }, [liveCustomer?.id]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!customerPickerRef.current?.contains(event.target)) setIsCustomerListOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, []);

  const filteredCustomers = useMemo(() => {
    const search = customerQuery.trim().toLowerCase();
    return customers
      .filter(customer => customer.is_active !== false)
      .filter(customer => {
        if (!search) return true;
        return [
          customerLabel(customer),
          customer.business_name,
          customer.customer_code,
          customer.contact_person,
          customer.phone,
          customer.whatsapp,
          customer.email
        ].filter(Boolean).join(' ').toLowerCase().includes(search);
      })
      .sort((a, b) => String(a.business_name || '').localeCompare(String(b.business_name || '')))
      .slice(0, 30);
  }, [customers, customerQuery]);

  useEffect(() => {
    setHighlightedCustomerIndex(0);
  }, [customerQuery]);

  useEffect(() => {
    if (!isCustomerListOpen) return;
    customerResultsRef.current
      ?.querySelector(`[data-customer-index="${highlightedCustomerIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [highlightedCustomerIndex, isCustomerListOpen]);

  const selectCustomer = (customer) => {
    isTypingCustomerRef.current = false;
    syncedCustomerIdRef.current = customer?.id || null;
    setCustomerQuery(customerLabel(customer));
    setIsCustomerListOpen(false);
    onSelectCustomer(customer || null);
  };

  const handleCustomerSearch = (event) => {
    isTypingCustomerRef.current = true;
    setCustomerQuery(event.target.value);
    setIsCustomerListOpen(true);
    if (liveCustomer) onSelectCustomer(null);
  };

  const handleCustomerKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsCustomerListOpen(true);
      setHighlightedCustomerIndex(index => Math.min(index + 1, Math.max(filteredCustomers.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedCustomerIndex(index => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && isCustomerListOpen && filteredCustomers.length) {
      event.preventDefault();
      selectCustomer(filteredCustomers[highlightedCustomerIndex] || filteredCustomers[0]);
    } else if (event.key === 'Escape') {
      setIsCustomerListOpen(false);
      isTypingCustomerRef.current = false;
      setCustomerQuery(customerLabel(liveCustomer));
    }
  };

  const isCreditRestricted = liveCustomer && !liveCustomer.credit_allowed;
  const isOverLimit = liveCustomer && (Number(liveCustomer.current_receivable || 0) > Number(liveCustomer.credit_limit || 0));

  return (
    <div className="pos-customer-banner">
      <div className="pos-customer-controls" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        {/* Document Type Selector (Wholesale Invoice / Order / Quotation) */}
        <div className="pos-customer-field pos-document-type-field">
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
        <div className={`pos-customer-field pos-customer-select-field ${liveCustomer ? '' : 'customer-required'}`} style={{ minWidth: 260 }}>
          <label style={{ fontSize: 11, color: liveCustomer ? 'var(--muted)' : '#ffca58', display: 'block', marginBottom: 2 }}>
            WHOLESALE CUSTOMER {!liveCustomer && '• REQUIRED'}
          </label>
          <div className="pos-customer-combobox" ref={customerPickerRef}>
            <div className="pos-customer-search-wrap">
              <input
                type="search"
                value={customerQuery}
                onChange={handleCustomerSearch}
                onFocus={(event) => {
                  setIsCustomerListOpen(true);
                  event.currentTarget.select();
                }}
                onKeyDown={handleCustomerKeyDown}
                placeholder="Search name, code, phone or contact…"
                autoComplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={isCustomerListOpen}
                aria-controls="pos-customer-results"
                aria-activedescendant={isCustomerListOpen && filteredCustomers[highlightedCustomerIndex]
                  ? `pos-customer-option-${filteredCustomers[highlightedCustomerIndex].id}`
                  : undefined}
                aria-required="true"
                className={liveCustomer ? 'has-selection' : ''}
              />
              {(customerQuery || liveCustomer) && (
                <button
                  type="button"
                  className="pos-customer-clear"
                  onClick={() => {
                    isTypingCustomerRef.current = false;
                    selectCustomer(null);
                    setIsCustomerListOpen(true);
                  }}
                  aria-label="Clear selected customer"
                  title="Clear customer"
                >
                  ×
                </button>
              )}
            </div>

            {isCustomerListOpen && (
              <div id="pos-customer-results" className="pos-customer-results" role="listbox" ref={customerResultsRef}>
                {filteredCustomers.map((customer, index) => (
                  <button
                    key={customer.id}
                    type="button"
                    role="option"
                    id={`pos-customer-option-${customer.id}`}
                    data-customer-index={index}
                    aria-selected={String(customer.id) === String(liveCustomer?.id)}
                    className={`${index === highlightedCustomerIndex ? 'highlighted' : ''} ${String(customer.id) === String(liveCustomer?.id) ? 'selected' : ''}`}
                    onPointerDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setHighlightedCustomerIndex(index)}
                    onClick={() => selectCustomer(customer)}
                  >
                    <span>
                      <strong>{customer.business_name}</strong>
                      <small>{customer.customer_code || 'No code'}{customer.contact_person ? ` • ${customer.contact_person}` : ''}</small>
                    </span>
                    <span className="pos-customer-result-meta">
                      <small>{customer.phone || customer.whatsapp || 'No phone'}</small>
                      <b>{customer.price_tier || 'Standard'}</b>
                    </span>
                  </button>
                ))}
                {!filteredCustomers.length && (
                  <div className="pos-customer-empty">
                    No customers match “{customerQuery.trim()}”.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {liveCustomer && (
          <div className="pos-customer-account-stats" style={{ display: 'flex', gap: 14, alignItems: 'center', borderLeft: '1px solid var(--line)', paddingLeft: 14 }}>
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

      <div className="pos-customer-actions" style={{ display: 'flex', gap: 6 }}>
        <button type="button" onClick={onOpenAddCustomer} className="secondary-button small-button" style={{ fontWeight: 700 }}>
          + Add Customer
        </button>
      </div>
    </div>
  );
}
