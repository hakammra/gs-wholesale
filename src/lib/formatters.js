export function formatCurrency(amount, currency = 'LKR') {
  const num = Number(amount) || 0;
  return 'Rs. ' + num.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatNumber(num, decimals = 2) {
  const n = Number(num) || 0;
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function calculateMargin(cost, price) {
  const c = Number(cost) || 0;
  const p = Number(price) || 0;
  if (p <= 0) return 0;
  return Number((((p - c) / p) * 100).toFixed(2));
}

export function calculateBestWholesalePrice(product, customer, qty = 1) {
  if (!product) return 0;
  const numQty = Number(qty) || 1;
  
  // 1. Check custom customer price
  if (customer && customer.custom_prices && customer.custom_prices[product.id]) {
    return Number(customer.custom_prices[product.id]) || 0;
  }

  // 2. Check quantity breaks
  if (product.quantity_breaks && product.quantity_breaks.length > 0) {
    const matchedBreak = product.quantity_breaks.find(qb => numQty >= qb.min_qty && (!qb.max_qty || numQty <= qb.max_qty));
    if (matchedBreak) {
      return Number(matchedBreak.unit_price) || 0;
    }
  }

  // 3. Check customer price tier
  let unitPrice = Number(product.wholesale_price) || 0;
  if (customer && customer.price_tier === 'Dealer' && Number(product.dealer_price) > 0) {
    unitPrice = Number(product.dealer_price);
  } else if (customer && customer.price_tier === 'Tier1') {
    unitPrice = unitPrice * 0.97; // 3% tier discount
  } else if (customer && customer.price_tier === 'VIP') {
    unitPrice = unitPrice * 0.92; // 8% tier discount
  }

  return Number(unitPrice.toFixed(2));
}

export function calculateWholesaleItemPrice(product, qty = 1, customer = null) {
  return calculateBestWholesalePrice(product, customer, qty);
}

export function calculateDocumentTotals(items = [], discountAmount = 0) {
  let subtotal = 0;
  let totalCost = 0;

  items.forEach(it => {
    const qty = Number(it.qty) || 0;
    const price = it.is_warranty_replacement ? 0 : (Number(it.unit_price) || 0);
    const lineDisc = it.is_warranty_replacement ? 0 : (Number(it.discount_amount) || 0);
    const cost = Number(it.unit_cost_snapshot || it.product?.weighted_cost_lkr) || 0;

    subtotal += (qty * price) - lineDisc;
    totalCost += qty * cost;
  });

  const grandTotal = Math.max(0, subtotal - Number(discountAmount || 0));
  const grossProfit = grandTotal - totalCost;
  const marginPct = grandTotal > 0 ? (grossProfit / grandTotal) * 100 : 0;

  return {
    items_subtotal: subtotal,
    subtotal,
    discount_amount: Number(discountAmount) || 0,
    grand_total: grandTotal,
    totalCost,
    grossProfit,
    marginPct
  };
}
