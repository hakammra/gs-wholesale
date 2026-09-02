import React from 'react';
import { formatCurrency } from '../../lib/formatters';

export default function MarginOverrideModal({
  lowMarginItems = [],
  minProfitPct = 5.0,
  onClose,
  onProceedAnyway
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-box modal-md">
        <div className="modal-header">
          <h3 style={{ color: '#ff8e8e', margin: 0 }}>⚠️ Minimum Profit Margin Protection Alert</h3>
          <button type="button" onClick={onClose} className="modal-close">&times;</button>
        </div>

        <div className="modal-body">
          <p style={{ color: 'var(--muted)', margin: '0 0 12px', fontSize: 13 }}>
            The following item(s) are priced below the minimum protected margin ({minProfitPct}%) based on Landed Weighted Average Cost:
          </p>

          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Unit Cost</th>
                <th>Selling Price</th>
                <th>Margin %</th>
              </tr>
            </thead>
            <tbody>
              {lowMarginItems.map((it, idx) => (
                <tr key={idx}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{it.product?.name}</div>
                    <small className="mono" style={{ color: 'var(--primary)' }}>{it.product?.item_code}</small>
                  </td>
                  <td className="mono">{formatCurrency(it.unit_cost_snapshot || it.product?.weighted_cost_lkr || 0)}</td>
                  <td className="mono font-semibold">{formatCurrency(it.unit_price)}</td>
                  <td className="mono" style={{ color: '#ff8e8e', fontWeight: 700 }}>
                    {it.marginPct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="secondary-button">
            Cancel & Adjust Prices
          </button>
          <button
            type="button"
            onClick={onProceedAnyway}
            className="danger-button"
            style={{ fontWeight: 700 }}
          >
            Authorize Override & Proceed to Payment
          </button>
        </div>
      </div>
    </div>
  );
}
