-- Preserve a usable sale-time cost for invoices created before cost snapshots
-- were populated. This migration is safe to run more than once: it only fills
-- zero/missing item costs, then reconciles invoice totals from their item rows.

BEGIN;

UPDATE public.sales_document_items AS item
SET
  unit_cost_snapshot = product.weighted_cost_lkr,
  line_profit = ROUND(
    item.line_total - (item.base_qty * product.weighted_cost_lkr),
    2
  ),
  line_profit_pct = CASE
    WHEN item.line_total > 0 THEN ROUND(
      ((item.line_total - (item.base_qty * product.weighted_cost_lkr)) / item.line_total) * 100,
      2
    )
    ELSE 0
  END
FROM public.products AS product
WHERE item.product_id = product.id
  AND COALESCE(item.unit_cost_snapshot, 0) <= 0
  AND product.weighted_cost_lkr > 0
  AND EXISTS (
    SELECT 1
    FROM public.sales_documents AS document
    WHERE document.id = item.sales_document_id
      AND document.doc_type = 'sales_invoice'
      AND document.status NOT IN ('cancelled', 'returned')
  );

WITH invoice_costs AS (
  SELECT
    item.sales_document_id,
    ROUND(SUM(item.base_qty * item.unit_cost_snapshot), 2) AS total_cost
  FROM public.sales_document_items AS item
  JOIN public.sales_documents AS document
    ON document.id = item.sales_document_id
  WHERE document.doc_type = 'sales_invoice'
    AND document.status NOT IN ('cancelled', 'returned')
  GROUP BY item.sales_document_id
)
UPDATE public.sales_documents AS document
SET
  total_cost_snapshot = invoice_costs.total_cost,
  gross_profit = ROUND(
    document.grand_total - document.tax_total - invoice_costs.total_cost,
    2
  ),
  gross_profit_pct = CASE
    WHEN (document.grand_total - document.tax_total) > 0 THEN ROUND(
      ((document.grand_total - document.tax_total - invoice_costs.total_cost)
        / (document.grand_total - document.tax_total)) * 100,
      2
    )
    ELSE 0
  END,
  updated_at = NOW()
FROM invoice_costs
WHERE document.id = invoice_costs.sales_document_id;

COMMIT;

NOTIFY pgrst, 'reload schema';
