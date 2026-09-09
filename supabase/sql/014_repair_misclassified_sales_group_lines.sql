-- =============================================================================
-- Migration: 014_repair_misclassified_sales_group_lines.sql
-- Description: Repair exact-product invoice lines that an earlier app version
--              stored as transit-group lines. Only unambiguous rows are changed.
-- Run after 013_secure_authenticated_data_access.sql.
-- =============================================================================

BEGIN;

-- Flexible group lines are never directly invoiceable. An invoice group line
-- created for a group containing exactly one product can therefore be restored
-- safely to that product. Multi-product groups are intentionally left alone
-- because the database cannot reliably infer which product was sold.
WITH single_product_groups AS (
  SELECT product.transit_group_id, MIN(product.id::TEXT)::UUID AS product_id
  FROM public.products AS product
  WHERE product.transit_group_id IS NOT NULL
  GROUP BY product.transit_group_id
  HAVING COUNT(*) = 1
)
UPDATE public.sales_document_items AS item
SET product_id = single_group.product_id,
    transit_group_id = NULL
FROM single_product_groups AS single_group,
     public.sales_documents AS document
WHERE document.id = item.sales_document_id
  AND document.doc_type = 'sales_invoice'
  AND item.product_id IS NULL
  AND item.transit_group_id = single_group.transit_group_id;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- This result should normally be zero. A non-zero result means an older invoice
-- contains a group with multiple possible products and needs manual selection.
SELECT COUNT(*) AS unresolved_invoice_group_lines
FROM public.sales_document_items AS item
JOIN public.sales_documents AS document ON document.id = item.sales_document_id
WHERE document.doc_type = 'sales_invoice'
  AND item.product_id IS NULL
  AND item.transit_group_id IS NOT NULL;
