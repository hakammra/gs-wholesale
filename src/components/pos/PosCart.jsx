import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { formatCurrency } from '../../lib/formatters';

export default function PosCart({
  items = [],
  customer,
  discount = 0,
  discountType = 'amount', // 'amount' | 'percent'
  discountValue = 0,
  totals = { items_subtotal: 0, grand_total: 0 },
  onUpdateQty,
  onUpdateUnitPrice,
  onUpdateItemDiscount,
  onToggleWarranty,
  onSplitWarranty,
  onUpdateWarrantyNote,
  onRemoveItem,
  onChangeCartDiscount,
  onClearCart,
  onReserve,
  onCheckout,
  onQuickCash,
  onQuickCredit,
  onQuickCod
}) {
  const { stockBalances = {} } = useBusiness();

  const [showDiscountBar, setShowDiscountBar] = useState(false);
  const [activeDiscType, setActiveDiscType] = useState(discountType || 'amount');
  const [activeDiscValue, setActiveDiscValue] = useState(discountValue || discount || 0);

  // Total item discounts across all rows
  const totalItemDiscounts = items.reduce((sum, it) => sum + (it.is_warranty_replacement ? 0 : (Number(it.discount_amount) || 0)), 0);

  // Helper to reliably compute on-hand and in-transit stock for any cart item
  const getItemStock = (item) => {
    if (item.is_warranty_replacement) {
      return { onHand: 999999, inTransit: 0, total: 999999 };
    }
    const p = item.product || item;
    const pId = p?.id || item.product_id || item.id;
    const sb = (pId && stockBalances[pId]) || {};

    const onHand = Number(
      sb.qty_on_hand !== undefined ? sb.qty_on_hand :
      sb.qty_available !== undefined ? sb.qty_available :
      p?.stock_quantity !== undefined ? p.stock_quantity :
      p?.qty_on_hand !== undefined ? p.qty_on_hand :
      0
    );

    const inTransit = Number(
      sb.qty_in_transit !== undefined ? sb.qty_in_transit :
      p?.qty_in_transit !== undefined ? p.qty_in_transit :
      0
    );

    return { onHand, inTransit, total: onHand + inTransit };
  };

  // Check inventory states across all cart items
  const hasOverLimitItem = items.some(it => {
    if (it.is_warranty_replacement) return false;
    const stock = getItemStock(it);
    return Number(it.qty) > stock.total;
  });

  const hasInTransitItem = !hasOverLimitItem && items.some(it => {
    if (it.is_warranty_replacement) return false;
    const stock = getItemStock(it);
    return Number(it.qty) > stock.onHand;
  });

  const handleApplyCartDiscount = (type, val) => {
    setActiveDiscType(type);
    setActiveDiscValue(val);
    onChangeCartDiscount?.(type, val);
  };

  const isCheckoutDisabled = items.length === 0 || hasInTransitItem || hasOverLimitItem;
  const isReserveDisabled = items.length === 0 || hasOverLimitItem;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--card-bg)' }}>
      {/* 1. TOP ACTION BAR */}
      <div
        style={{
          background: '#222',
          borderBottom: '2px solid var(--line)',
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8
        }}
      >
        {/* Left Actions: Clear & Items Count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={onClearCart}
            disabled={items.length === 0}
            className="secondary-button small-button"
            style={{ color: '#ff8e8e', borderColor: 'rgba(255, 142, 142, 0.4)', padding: '5px 10px', fontSize: 12 }}
            title="Clear all items from current bill"
          >
            🗑 Clear
          </button>

          <button
            type="button"
            onClick={() => setShowDiscountBar(prev => !prev)}
            className={`secondary-button small-button ${discount > 0 || showDiscountBar ? 'active' : ''}`}
            style={{
              padding: '5px 10px',
              fontSize: 12,
              color: discount > 0 ? '#ffca58' : 'inherit',
              borderColor: discount > 0 ? '#ffca58' : 'inherit',
              fontWeight: 600
            }}
            title="Add or configure Cart / Bill Discount"
          >
            🏷️ {discount > 0 ? `Bill Disc: ${formatCurrency(discount)}` : 'Cart Discount'}
          </button>

          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            <strong>{items.length}</strong> items &bull; <strong>{items.reduce((s, i) => s + (Number(i.qty) || 0), 0)}</strong> units
          </span>
        </div>

        {/* Right Actions: Cash, Credit, Reserve, Checkout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Quick Cash Checkout Action */}
          <button
            type="button"
            onClick={onQuickCash}
            disabled={isCheckoutDisabled}
            style={{
              padding: '6px 14px',
              fontSize: 12.5,
              fontWeight: 800,
              background: isCheckoutDisabled ? '#2a2a2a' : '#1d4d2b',
              color: isCheckoutDisabled ? '#888' : '#52e37e',
              border: `1px solid ${isCheckoutDisabled ? '#444' : '#28a745'}`,
              borderRadius: 4,
              cursor: isCheckoutDisabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              opacity: isCheckoutDisabled ? 0.5 : 1
            }}
            title={hasOverLimitItem ? "Stock exceeded. Reduce quantity." : (hasInTransitItem ? "Bill contains In-Transit stock. Click Reserve." : "Fast Cash Payment & Finalize [F12]")}
          >
            <span>💵</span> Cash [F12]
          </button>

          {/* Credit & COD Sale Actions if customer selected */}
          {customer && (
            <>
              <button
                type="button"
                onClick={onQuickCredit}
                disabled={isCheckoutDisabled}
                style={{
                  padding: '6px 12px',
                  fontSize: 12.5,
                  fontWeight: 700,
                  background: isCheckoutDisabled ? '#2a2a2a' : '#3a2d12',
                  color: isCheckoutDisabled ? '#888' : '#ffca58',
                  border: `1px solid ${isCheckoutDisabled ? '#444' : '#946f1e'}`,
                  borderRadius: 4,
                  cursor: isCheckoutDisabled ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  opacity: isCheckoutDisabled ? 0.5 : 1
                }}
                title={hasOverLimitItem ? "Stock exceeded. Reduce quantity." : (hasInTransitItem ? "Bill contains In-Transit stock. Click Reserve." : "Charge to Customer Account Balance")}
              >
                <span>💳</span> Credit
              </button>
              <button
                type="button"
                onClick={onQuickCod}
                disabled={isCheckoutDisabled}
                style={{
                  padding: '6px 12px',
                  fontSize: 12.5,
                  fontWeight: 700,
                  background: isCheckoutDisabled ? '#2a2a2a' : '#451a03',
                  color: isCheckoutDisabled ? '#888' : '#f59e0b',
                  border: `1px solid ${isCheckoutDisabled ? '#444' : '#b45309'}`,
                  borderRadius: 4,
                  cursor: isCheckoutDisabled ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  opacity: isCheckoutDisabled ? 0.5 : 1
                }}
                title={hasOverLimitItem ? "Stock exceeded. Reduce quantity." : (hasInTransitItem ? "Bill contains In-Transit stock. Click Reserve." : "Post as Cash on Delivery (COD) [F9] - Unpaid until delivered")}
              >
                <span>📦</span> COD [F9]
              </button>
            </>
          )}

          {/* Hold / Reserve Stock Action (Disabled/greyed out when over limit, highlighted gold when in-transit) */}
          <button
            type="button"
            onClick={() => onReserve?.(0, 'cash')}
            disabled={isReserveDisabled}
            style={{
              padding: '6px 14px',
              fontSize: 12.5,
              fontWeight: 800,
              background: hasOverLimitItem ? '#2a2a2a' : (hasInTransitItem ? '#ffca58' : '#292929'),
              color: hasOverLimitItem ? '#777' : (hasInTransitItem ? '#000' : '#ffca58'),
              border: `1px solid ${hasOverLimitItem ? '#444' : (hasInTransitItem ? '#e5b33d' : '#ffca58')}`,
              borderRadius: 4,
              cursor: isReserveDisabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              opacity: isReserveDisabled ? 0.5 : 1,
              boxShadow: (hasInTransitItem && !hasOverLimitItem) ? '0 0 10px rgba(255, 202, 88, 0.4)' : 'none'
            }}
            title={hasOverLimitItem ? "Quantity exceeds available inventory. Reduce quantity." : "Hold / Reserve stock with Advance Deposit option"}
          >
            <span>📌</span> {hasInTransitItem ? 'Reserve (In-Transit)' : 'Reserve / Advance'}
          </button>

          {/* Multi-Tender Payment / F10 Action */}
          <button
            type="button"
            onClick={onCheckout}
            disabled={isCheckoutDisabled}
            className="primary-button small-button"
            style={{
              padding: '6px 16px',
              fontSize: 13,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              opacity: isCheckoutDisabled ? 0.5 : 1,
              cursor: isCheckoutDisabled ? 'not-allowed' : 'pointer',
              background: isCheckoutDisabled ? '#2a2a2a' : undefined,
              borderColor: isCheckoutDisabled ? '#444' : undefined,
              color: isCheckoutDisabled ? '#888' : undefined
            }}
            title={hasOverLimitItem ? "Stock exceeded. Reduce quantity." : (hasInTransitItem ? "Bill contains In-Transit stock. Immediate payment locked." : "Open Payment Split & Cheque Details [F10 / F4]")}
          >
            <span>⚡</span> F10 Payment
          </button>
        </div>
      </div>

      {/* Brief Stock Warning Banners */}
      {hasOverLimitItem && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            borderBottom: '1px solid #ef4444',
            padding: '5px 12px',
            fontSize: 12,
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <span>⚠️ <strong>Stock Exceeded:</strong> Quantity exceeds On-Hand + In-Transit stock. Reduce quantity to proceed.</span>
        </div>
      )}

      {hasInTransitItem && (
        <div
          style={{
            background: 'rgba(255, 202, 88, 0.12)',
            borderBottom: '1px solid #ffca58',
            padding: '5px 12px',
            fontSize: 12,
            color: '#ffca58',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8
          }}
        >
          <span>🚢 <strong>In-Transit Stock Used:</strong> Order can only be Reserved.</span>
          <button
            type="button"
            onClick={() => onReserve?.(0, 'cash')}
            style={{
              background: '#ffca58',
              color: '#000',
              border: 'none',
              borderRadius: 3,
              padding: '2px 8px',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Reserve
          </button>
        </div>
      )}

      {/* Optional Top Bill Discount Bar */}
      {showDiscountBar && (
        <div
          style={{
            background: '#1a2b35',
            borderBottom: '1px solid var(--line)',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#ffca58' }}>Cart Discount:</span>
            
            {/* Mode Switch: Rs vs % */}
            <div style={{ display: 'inline-flex', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--line)' }}>
              <button
                type="button"
                onClick={() => handleApplyCartDiscount('amount', activeDiscValue)}
                style={{
                  padding: '3px 8px',
                  fontSize: 11,
                  fontWeight: 700,
                  background: activeDiscType === 'amount' ? 'var(--primary)' : '#242424',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Rs (Amount)
              </button>
              <button
                type="button"
                onClick={() => handleApplyCartDiscount('percent', activeDiscValue)}
                style={{
                  padding: '3px 8px',
                  fontSize: 11,
                  fontWeight: 700,
                  background: activeDiscType === 'percent' ? 'var(--primary)' : '#242424',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                % (Percent)
              </button>
            </div>

            <input
              type="number"
              min="0"
              step={activeDiscType === 'percent' ? '0.5' : '10'}
              className="mono font-semibold"
              placeholder={activeDiscType === 'percent' ? 'e.g. 5%' : 'e.g. 500'}
              value={activeDiscValue || ''}
              onChange={(e) => handleApplyCartDiscount(activeDiscType, Number(e.target.value) || 0)}
              style={{ width: 100, padding: '3px 8px', textAlign: 'right', color: '#ffca58' }}
            />
          </div>

          {/* Quick Presets */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Presets:</span>
            {[
              { label: '0%', type: 'percent', val: 0 },
              { label: '2%', type: 'percent', val: 2 },
              { label: '3%', type: 'percent', val: 3 },
              { label: '5%', type: 'percent', val: 5 },
              { label: '8%', type: 'percent', val: 8 },
              { label: '10%', type: 'percent', val: 10 }
            ].map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => handleApplyCartDiscount(p.type, p.val)}
                className="secondary-button small-button"
                style={{ padding: '2px 6px', fontSize: 10.5 }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. TWO-ROW STRUCTURED CART ITEMS (Fits comfortably with zero horizontal scroll) */}
      <div className="pos-cart-cards-container">
        {items.map((item, idx) => {
          const isWarranty = !!item.is_warranty_replacement;
          const unitPrice = isWarranty ? 0 : (Number(item.unit_price) || 0);
          const qty = Number(item.qty) || 1;
          const lineDisc = isWarranty ? 0 : (Number(item.discount_amount) || 0);
          const lineTotal = isWarranty ? 0 : Math.max(0, (qty * unitPrice) - lineDisc);

          const stock = getItemStock(item);
          const onHand = stock.onHand;
          const inTransit = stock.inTransit;
          const totalAvail = stock.total;

          const isExceedingOnHand = !isWarranty && (qty > onHand);
          const isExceedingTotal = !isWarranty && (qty > totalAvail);

          const cardClass = `pos-cart-card ${
            isWarranty ? 'warranty-card' : (isExceedingTotal ? 'overlimit-card' : (isExceedingOnHand ? 'intransit-card' : ''))
          }`;

          return (
            <div key={idx} className={cardClass}>
              {/* Row 1: Item Header (Number, Name, Code, Warranty button, Stock status badge, Remove) */}
              <div className="pos-cart-card-row1">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, minWidth: 20 }}>
                    #{idx + 1}
                  </span>

                  <strong style={{ fontSize: 13.5, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.product?.name}>
                    {item.product?.name}
                  </strong>

                  <span className="mono font-semibold" style={{ fontSize: 11, color: 'var(--primary)', background: 'rgba(2, 132, 199, 0.15)', padding: '1px 6px', borderRadius: 3 }}>
                    {item.product?.item_code}
                  </span>

                  {/* Warranty Tag / Toggle */}
                  {isWarranty ? (
                    <span className="badge badge-success" style={{ fontSize: 10, padding: '2px 5px' }}>
                      🛡️ WARRANTY (Rs. 0)
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onToggleWarranty?.(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#52e37e',
                        cursor: 'pointer',
                        fontSize: 11,
                        padding: 0,
                        textDecoration: 'underline',
                        fontWeight: 600
                      }}
                      title="Convert this item to a 0-price warranty replacement"
                    >
                      🛡️ Mark Warranty
                    </button>
                  )}

                  {isWarranty && (
                    <button
                      type="button"
                      onClick={() => onToggleWarranty?.(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ffca58',
                        cursor: 'pointer',
                        fontSize: 11,
                        padding: 0,
                        textDecoration: 'underline',
                        fontWeight: 600
                      }}
                    >
                      ↩ Restore Price
                    </button>
                  )}
                </div>

                {/* Right badges & Remove */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Stock Availability Badge */}
                  {!isWarranty && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 3,
                        background: isExceedingTotal ? 'rgba(239, 68, 68, 0.2)' : (isExceedingOnHand ? 'rgba(255, 202, 88, 0.2)' : 'rgba(82, 227, 126, 0.15)'),
                        color: isExceedingTotal ? '#ef4444' : (isExceedingOnHand ? '#ffca58' : '#52e37e'),
                        border: `1px solid ${isExceedingTotal ? '#ef4444' : (isExceedingOnHand ? '#ffca58' : 'transparent')}`
                      }}
                    >
                      {isExceedingTotal
                        ? `⚠️ Exceeds Total (${totalAvail} Avail)`
                        : (isExceedingOnHand
                            ? `🚢 In-Transit (${onHand} On Hand, +${inTransit} Transit)`
                            : `● ${onHand} On Hand`)}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => onRemoveItem?.(idx)}
                    className="secondary-button small-button"
                    style={{ color: '#ff8e8e', padding: '2px 7px', fontSize: 13, fontWeight: 700, lineHeight: 1 }}
                    title="Remove item from bill"
                  >
                    &times;
                  </button>
                </div>
              </div>

              {/* Optional Warranty RMA Note */}
              {isWarranty && (
                <div>
                  <input
                    type="text"
                    placeholder="RMA / Fault note (e.g. Faulty return from Inv #1042, SN: 84729)"
                    value={item.warranty_note || ''}
                    onChange={(e) => onUpdateWarrantyNote?.(idx, e.target.value)}
                    style={{ fontSize: 11, padding: '3px 8px', width: '100%', borderColor: '#52e37e', background: '#161616' }}
                  />
                </div>
              )}

              {/* Row 2: Controls (Qty, Unit Price, Item Disc, Line Total) */}
              <div className="pos-cart-card-row2">
                {/* Quantity Control */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <label style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>Qty:</label>
                  <button
                    type="button"
                    onClick={() => onUpdateQty?.(idx, Math.max(1, qty - 1))}
                    style={{ padding: '2px 7px', fontSize: 12, fontWeight: 700, background: '#333', border: '1px solid #555', color: '#fff', borderRadius: 3, cursor: 'pointer' }}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    className="mono font-semibold"
                    value={qty}
                    onChange={(e) => onUpdateQty?.(idx, Number(e.target.value) || 1)}
                    style={{ width: 48, padding: '3px 4px', textAlign: 'center', fontSize: 13 }}
                  />
                  <button
                    type="button"
                    onClick={() => onUpdateQty?.(idx, qty + 1)}
                    style={{ padding: '2px 7px', fontSize: 12, fontWeight: 700, background: '#333', border: '1px solid #555', color: '#fff', borderRadius: 3, cursor: 'pointer' }}
                  >
                    +
                  </button>
                </div>

                {/* Unit Price */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <label style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>Price (Rs):</label>
                  {isWarranty ? (
                    <span className="mono font-semibold" style={{ color: '#52e37e', fontSize: 12 }}>
                      0.00
                    </span>
                  ) : (
                    <input
                      type="number"
                      step="0.01"
                      className="mono"
                      value={item.unit_price}
                      onChange={(e) => onUpdateUnitPrice?.(idx, Number(e.target.value) || 0)}
                      style={{ width: 90, padding: '3px 6px', textAlign: 'right', fontSize: 12.5 }}
                    />
                  )}
                </div>

                {/* Item Discount */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <label style={{ fontSize: 11, color: (item.discount_amount > 0) ? '#ffca58' : 'var(--muted)', margin: 0 }}>
                    Disc (Rs):
                  </label>
                  {isWarranty ? (
                    <span style={{ color: 'var(--muted)', fontSize: 11 }}>-</span>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      step="10"
                      placeholder="0"
                      className="mono"
                      value={item.discount_amount || ''}
                      onChange={(e) => onUpdateItemDiscount?.(idx, Number(e.target.value) || 0)}
                      style={{
                        width: 75,
                        padding: '3px 6px',
                        textAlign: 'right',
                        fontSize: 12.5,
                        color: (item.discount_amount > 0) ? '#ffca58' : 'inherit'
                      }}
                      title="Direct rupee discount for this item"
                    />
                  )}
                </div>

                {/* Line Total */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>Total:</label>
                  <strong className="mono font-semibold" style={{ fontSize: 14.5, color: isWarranty ? '#52e37e' : '#fff' }}>
                    {formatCurrency(lineTotal)}
                  </strong>
                </div>
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '60px 20px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Bill is Empty</div>
            <div style={{ fontSize: 12.5 }}>Click or search products on the right catalog to add items.</div>
          </div>
        )}
      </div>

      {/* 3. CLEAN DOCUMENT TOTAL FOOTER */}
      <div
        style={{
          background: '#181818',
          borderTop: '2px solid var(--line)',
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        {/* Left Breakdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div>
            <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block' }}>ITEMS / UNITS</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>
              {items.length} Items &bull; {items.reduce((s, i) => s + (Number(i.qty) || 0), 0)} Units
            </span>
          </div>

          <div style={{ borderLeft: '1px solid var(--line)', paddingLeft: 16 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block' }}>SUBTOTAL</span>
            <span className="mono font-semibold" style={{ fontSize: 14 }}>
              {formatCurrency(totals.items_subtotal || 0)}
            </span>
          </div>

          {(totalItemDiscounts > 0 || discount > 0) && (
            <div style={{ borderLeft: '1px solid var(--line)', paddingLeft: 16 }}>
              <span style={{ fontSize: 11, color: '#ffca58', display: 'block' }}>TOTAL DISCOUNTS</span>
              <span className="mono font-semibold" style={{ fontSize: 14, color: '#ffca58' }}>
                -{formatCurrency(totalItemDiscounts + Number(discount || 0))}
              </span>
            </div>
          )}
        </div>

        {/* Right Grand Total Display */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted)', letterSpacing: 0.5 }}>
            DOCUMENT TOTAL (LKR):
          </span>
          <span
            className="mono"
            style={{
              fontSize: 26,
              fontWeight: 900,
              color: 'var(--primary)',
              background: 'rgba(2, 132, 199, 0.12)',
              border: '1px solid rgba(2, 132, 199, 0.3)',
              padding: '4px 14px',
              borderRadius: 6
            }}
          >
            {formatCurrency(totals.grand_total || 0)}
          </span>
        </div>
      </div>
    </div>
  );
}
