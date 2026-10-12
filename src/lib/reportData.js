export const REPORT_PRESETS = [
  ['today', 'Today'], ['this_month', 'This month'], ['last_month', 'Last month'],
  ['this_year', 'This year'], ['last_year', 'Last year'], ['all_time', 'Since start'], ['custom', 'Custom range']
];

export const reportDateKey = (value = new Date()) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
};

const dateKey = (year, month, day) => reportDateKey(new Date(Date.UTC(year, month, day, 6)));

export function reportRange(preset, start, end, now = new Date()) {
  const today = reportDateKey(now);
  const [year, month] = today.split('-').map(Number);
  if (preset === 'today') return { start: today, end: today };
  if (preset === 'this_month') return { start: `${today.slice(0, 7)}-01`, end: today };
  if (preset === 'last_month') return { start: dateKey(year, month - 2, 1), end: dateKey(year, month - 1, 0) };
  if (preset === 'this_year') return { start: `${year}-01-01`, end: today };
  if (preset === 'last_year') return { start: `${year - 1}-01-01`, end: `${year - 1}-12-31` };
  if (preset === 'all_time') return { start: '', end: today };
  return { start, end };
}

export const inReportRange = (value, range) => {
  const key = reportDateKey(value);
  return Boolean(key) && (!range.start || key >= range.start) && (!range.end || key <= range.end);
};

const recordedNumber = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

// The report never reads current WAC. A missing historical cost stays missing;
// an explicitly recorded zero remains zero (and is flagged for review).
export function salesProfitData(documents, products, range) {
  const productById = new Map(products.map(product => [String(product.id), product]));
  const grouped = new Map();
  const details = [];
  let returnedSales = 0;
  let returnProfitImpact = 0;
  let missingCosts = 0;
  let zeroCosts = 0;

  documents.filter(document =>
    ['sales_invoice', 'credit_note'].includes(document.doc_type) &&
    !['draft', 'cancelled'].includes(document.status) &&
    // A returned invoice still records the original sale. Its credit note reverses it.
    inReportRange(document.doc_date || document.created_at, range)
  ).forEach(document => {
    const isReturn = document.doc_type === 'credit_note';
    const direction = isReturn ? -1 : 1;
    const items = document.items || [];
    const lineAmounts = items.map(item => Math.abs(Number(item.line_total ??
      ((Number(item.qty) || 0) * (Number(item.unit_price) || 0) - (Number(item.discount_amount ?? item.line_discount) || 0))) || 0));
    const beforeDiscount = lineAmounts.reduce((sum, amount) => sum + amount, 0);
    const netRevenue = Math.abs(Number(document.grand_total) || 0) - Math.abs(Number(document.tax_total) || 0);
    const ratio = beforeDiscount > 0 ? netRevenue / beforeDiscount : 0;
    if (isReturn) returnedSales += netRevenue;

    items.forEach((item, index) => {
      const productId = item.product_id || item.product?.id;
      const product = productById.get(String(productId));
      const qty = Math.abs(Number(item.base_qty ?? item.qty) || 0);
      const hasCost = recordedNumber(item.unit_cost_snapshot);
      const unitCost = hasCost ? Number(item.unit_cost_snapshot) : null;
      const cost = hasCost ? direction * qty * unitCost : null;
      const revenue = direction * lineAmounts[index] * ratio;
      const profit = hasCost ? revenue - cost : null;
      if (!hasCost) missingCosts++;
      if (unitCost === 0 && qty > 0) zeroCosts++;
      if (isReturn && hasCost) returnProfitImpact += profit;
      const row = {
        date: document.doc_date || document.created_at,
        reference: document.doc_no,
        type: isReturn ? 'Return' : 'Sale',
        customer: document.customer_name || document.customer?.business_name || 'Customer',
        code: item.item_code || product?.item_code || item.product?.item_code || '-',
        product: item.product_name || item.product?.name || product?.name || 'Product item',
        soldQty: direction * qty,
        unitCost,
        cost,
        revenue,
        profit,
        margin: hasCost && revenue !== 0 ? profit / revenue * 100 : hasCost ? 0 : null
      };
      details.push(row);
      const key = String(productId || item.transit_group_id || row.code + row.product);
      const aggregate = grouped.get(key) || {
        code: row.code, product: row.product, soldQty: 0, revenue: 0, cost: 0, missingCosts: 0
      };
      aggregate.soldQty += row.soldQty;
      aggregate.revenue += revenue;
      aggregate.cost += cost ?? 0;
      aggregate.missingCosts += hasCost ? 0 : 1;
      grouped.set(key, aggregate);
    });
  });

  const rows = [...grouped.values()].map(row => ({
    ...row,
    cost: row.missingCosts ? null : row.cost,
    profit: row.missingCosts ? null : row.revenue - row.cost,
    margin: row.missingCosts ? null : row.revenue !== 0 ? (row.revenue - row.cost) / row.revenue * 100 : 0
  })).sort((a, b) => b.revenue - a.revenue);
  const revenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const cost = missingCosts ? null : rows.reduce((sum, row) => sum + row.cost, 0);
  return {
    rows,
    details: details.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(a.reference).localeCompare(String(b.reference))),
    revenue, cost, profit: cost === null ? null : revenue - cost,
    returnedSales, returnProfitImpact, missingCosts, zeroCosts
  };
}
