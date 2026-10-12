import assert from 'node:assert/strict';
import { salesProfitData, reportRange, reportDateKey, inReportRange } from '../src/lib/reportData.js';
import { reportCsv } from '../src/lib/reportExports.js';

const range = { start: '2026-09-01', end: '2026-09-30' };
const sale = { id: 'sale', doc_type: 'sales_invoice', status: 'completed', doc_date: '2026-09-04',
  doc_no: 'INV-1', grand_total: 270, items: [{ product_id: 'p', qty: 2, line_total: 300, unit_cost_snapshot: 100 }] };
const refund = { doc_type: 'credit_note', status: 'completed', doc_date: '2026-09-07', grand_total: -135,
  items: [{ product_id: 'p', qty: 1, line_total: -135, unit_cost_snapshot: 100 }] };
const product = { id: 'p', name: 'SSD', item_code: 'SSD-1', weighted_cost_lkr: 1000 };
const result = salesProfitData([sale, refund], [product], range);
assert.equal(result.revenue, 135, 'Returns and invoice discounts must reduce sales');
assert.equal(result.cost, 100, 'COGS uses original cost with returned cost reversed');
assert.equal(result.profit, 35);
assert.equal(result.rows[0].soldQty, 1);
assert.equal(result.returnedSales, 135);
assert.deepEqual(salesProfitData([sale, refund], [{ ...product, weighted_cost_lkr: 99999 }], range), result,
  'Later WAC must not alter historical profit');
assert.equal(salesProfitData([{ ...sale, status: 'returned' }, refund], [product], range).profit, 35,
  'Original returned invoice and credit note must not reverse the sale twice');
assert.equal(salesProfitData([sale], [], range).cost, 200, 'Missing catalog products must remain in reports');
assert.equal(salesProfitData([sale], [product], { start: '2026-10-01', end: '2026-10-31' }).rows.length, 0);
const missing = salesProfitData([{ ...sale, items: [{ product_id: 'p', qty: 1, line_total: 270 }] }], [product], range);
assert.equal(missing.cost, null);
assert.equal(missing.profit, null);
const zero = salesProfitData([{ ...sale, items: [{ product_id: 'p', qty: 1, line_total: 270, unit_cost_snapshot: 0 }] }], [product], range);
assert.equal(zero.cost, 0, 'Explicit zero snapshot must not fall back to WAC');
assert.equal(zero.zeroCosts, 1);
assert.deepEqual(reportRange('last_month', '', '', new Date('2026-10-12T00:00:00Z')), range);
assert.deepEqual(reportRange('last_month', '', '', new Date('2026-01-12T00:00:00Z')), { start: '2025-12-01', end: '2025-12-31' });
assert.equal(reportDateKey('2026-09-30T20:00:00Z'), '2026-10-01');
assert.equal(inReportRange('2026-09-30T20:00:00Z', range), false, 'Timestamp boundaries use Colombo time');
const csv = reportCsv({ title: 'Profit', period: 'September', stats: [], columns: [{ key: 'name', label: 'Product' }], rows: [{ name: '=2+2' }] });
assert.ok(csv.includes("'=2+2"));
console.log('Report checks passed: sale snapshots, WAC changes, discounts, returns, missing/zero costs, date boundaries and CSV safety.');
