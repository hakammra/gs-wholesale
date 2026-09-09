-- =============================================================================
-- Migration: 015_repair_identified_sales_product_lines.sql
-- Description: Restore the exact products for three invoice lines that were
--              misclassified as flexible transit-group lines by the old app.
-- Run after 014_repair_misclassified_sales_group_lines.sql.
-- =============================================================================

BEGIN;

DO $repair$
DECLARE
  repaired_count INTEGER;
BEGIN
  WITH corrections(invoice_item_id, product_id) AS (
    VALUES
      -- INV-202609-9122 / PC Major / Branded 120/128GB SATA SSD
      ('5ba3990e-ecae-4802-84fd-0a3d305083b8'::UUID, 'ca644465-8436-4863-8077-6eb46f13a80e'::UUID),
      -- INV-202609-1199 / Winfix Solutions / Mix Brand 120/128GB SATA SSD
      ('979fd5ec-e111-460a-b879-ecc2fef2b717'::UUID, 'bb248761-dca3-4a7a-8d5b-14b033ad87ae'::UUID),
      -- INV-202609-1983 / Dulaj Kumana / Mix Brand 120/128GB SATA SSD
      ('9ddc9b07-aa8b-41c4-8ceb-8922b36f29dc'::UUID, 'bb248761-dca3-4a7a-8d5b-14b033ad87ae'::UUID)
  )
  UPDATE public.sales_document_items AS item
  SET product_id = correction.product_id,
      transit_group_id = NULL
  FROM corrections AS correction
  JOIN public.products AS product ON product.id = correction.product_id
  WHERE item.id = correction.invoice_item_id
    AND item.product_id IS NULL
    AND item.transit_group_id IS NOT NULL
    AND product.transit_group_id = item.transit_group_id;

  WITH corrections(invoice_item_id, product_id) AS (
    VALUES
      ('5ba3990e-ecae-4802-84fd-0a3d305083b8'::UUID, 'ca644465-8436-4863-8077-6eb46f13a80e'::UUID),
      ('979fd5ec-e111-460a-b879-ecc2fef2b717'::UUID, 'bb248761-dca3-4a7a-8d5b-14b033ad87ae'::UUID),
      ('9ddc9b07-aa8b-41c4-8ceb-8922b36f29dc'::UUID, 'bb248761-dca3-4a7a-8d5b-14b033ad87ae'::UUID)
  )
  SELECT COUNT(*)
  INTO repaired_count
  FROM corrections AS correction
  JOIN public.sales_document_items AS item
    ON item.id = correction.invoice_item_id
   AND item.product_id = correction.product_id
   AND item.transit_group_id IS NULL;

  IF repaired_count <> 3 THEN
    RAISE EXCEPTION 'Expected all 3 invoice lines to match their identified products, but only % do. No changes were saved.', repaired_count;
  END IF;
END;
$repair$;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- Expected result: unresolved_invoice_group_lines = 0.
SELECT COUNT(*) AS unresolved_invoice_group_lines
FROM public.sales_document_items AS item
JOIN public.sales_documents AS document ON document.id = item.sales_document_id
WHERE document.doc_type = 'sales_invoice'
  AND item.product_id IS NULL
  AND item.transit_group_id IS NOT NULL;
