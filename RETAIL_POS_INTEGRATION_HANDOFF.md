# Wholesale → Retail POS integration handoff

This document is the contract for the Codex session working in `Documents/Shop-POS`.
Do not modify the `GS-Wholesale` repository from that session.

## Business rules

- Wholesale inventory is the source of truth until Retail POS sells an item.
- Retail owns and edits its own customer-facing selling price. A catalog refresh must never overwrite that retail price.
- Wholesale transfer price is calculated at the moment of sale from current wholesale WAC:

  `ceil((WAC × 1.10) / 50) × 50`

  This is a 10% markup and always rounds upward to the next LKR 50. Examples:
  WAC `3300 → 3630 → 3650`; a calculated price of `3620 → 3650`; and an exact calculated price of `3650` stays `3650`.
- The wholesale buyer account is `Gatronix Store - Retail` (`RTL-STORE`).
- The matching Retail POS supplier should be `Gatronix Wholesale`.
- Both sides record the inter-business transfer as credit. Do not create cash, bank, card, cheque, or customer-payment entries for the transfer itself.
- Retail customer payment remains part of the normal Retail POS invoice.
- Later settlement is recorded once as a customer settlement in Wholesale and a supplier payment in Retail.

## Wholesale API already provided

The Wholesale Supabase project ref is `xxmdrrzoflakyzecmrmy`.

The server-only function endpoint is:

`https://xxmdrrzoflakyzecmrmy.supabase.co/functions/v1/retail-bridge`

Every request requires this server-only header:

`x-retail-bridge-secret: <shared secret>`

Never put the shared secret, the Wholesale service-role key, or the Retail service-role key in React code, a `VITE_*` environment variable, local storage, or a browser request. Store the shared secret only in a Retail Supabase Edge Function secret.

### Read wholesale catalog

Server-to-server request:

```http
GET /functions/v1/retail-bridge
x-retail-bridge-secret: ...
```

Response:

```json
{
  "success": true,
  "currency": "LKR",
  "products": [
    {
      "wholesale_product_id": "uuid",
      "item_code": "PRD-0001",
      "barcode": null,
      "product_name": "Product name",
      "model": null,
      "description": null,
      "category_id": "uuid-or-null",
      "category_name": "Category name",
      "unit_name": "Unit",
      "available_qty": 5,
      "transfer_unit_price": 3650,
      "updated_at": "timestamp"
    }
  ]
}
```

Wholesale WAC is intentionally not exposed.

### Post a completed wholesale transfer

Server-to-server request:

```http
POST /functions/v1/retail-bridge
content-type: application/json
x-retail-bridge-secret: ...

{
  "action": "post_sale",
  "idempotency_key": "retail-transfer:<stable retail UUID>",
  "retail_sale_reference": "INV-202609-12345",
  "sale_date": "2026-09-16",
  "items": [
    { "product_id": "wholesale-product-uuid", "qty": 1 }
  ]
}
```

The same idempotency key can be retried safely. It returns the first wholesale invoice instead of creating a duplicate.

Successful response:

```json
{
  "success": true,
  "idempotency_key": "retail-transfer:<stable retail UUID>",
  "retail_sale_reference": "INV-202609-12345",
  "wholesale_document_id": "uuid",
  "wholesale_document_no": "INV-...",
  "wholesale_customer_id": "uuid",
  "wholesale_customer_name": "Gatronix Store - Retail",
  "payment_status": "credit",
  "currency": "LKR",
  "transfer_total": 3650,
  "lines": [
    {
      "wholesale_product_id": "uuid",
      "item_code": "PRD-0001",
      "product_name": "Product name",
      "qty": 1,
      "transfer_unit_price": 3650,
      "line_total": 3650
    }
  ]
}
```

The Wholesale database recalculates the current transfer price, locks stock, rejects insufficient availability, creates one credit invoice, snapshots cost/profit, reduces stock, adds the customer receivable, and records stock movements in one database transaction.

## Required Retail POS implementation

1. Add a Retail Supabase Edge Function to act as the coordinator. The Retail React app calls this function using the existing signed-in user session. Only this Edge Function may call the Wholesale endpoint with the shared secret.
2. Add a Retail migration after `075` with a link table containing at least:
   - `wholesale_product_id UUID UNIQUE`
   - `retail_product_id UUID UNIQUE`
   - `last_transfer_price NUMERIC`
   - `last_wholesale_available_qty NUMERIC`
   - `last_synced_at TIMESTAMPTZ`
   - `is_enabled BOOLEAN`
3. Keep `products.selling_price` (or the current Retail price field) entirely Retail-owned. Never replace it during wholesale catalog refresh.
4. Mirror the wholesale name, item code, barcode and description only when appropriate. Keep the wholesale UUID as the permanent identity; do not match products only by name.
5. Create or reuse the Retail supplier `Gatronix Wholesale` and make wholesale-derived purchases credit purchases against this supplier.
6. Add a durable Retail transfer/outbox record with a unique idempotency key and statuses such as `pending`, `wholesale_posted`, `retail_posted`, and `failed`. Store the returned wholesale document ID/number.
7. For a Retail sale containing wholesale items:
   - Preserve the Retail customer-facing unit price from Retail POS.
   - Call the Wholesale bridge with only wholesale product IDs and quantities.
   - Use the authoritative returned `transfer_unit_price` as the Retail purchase cost and invoice cost snapshot.
   - Create a Retail credit purchase from `Gatronix Wholesale` for those quantities.
   - Receive that quantity, then let the normal Retail invoice consume it. The net Retail stock change is zero for a just-in-time transfer.
   - Link the Retail purchase, Retail customer invoice and Wholesale invoice through the transfer/outbox record.
8. Support mixed carts. Existing Retail-owned lines continue through normal Shop-POS logic; only linked wholesale lines create the automatic transfer purchase.
9. Use the existing transactional SQL/RPC patterns around `save_purchase_like_document_v65` and `save_pos_invoice_v74`. Do not reproduce accounting, inventory, customer payment, or WAC updates in browser JavaScript.
10. If Retail posting fails after Wholesale succeeds, do not call Wholesale again with a new key. Keep the transfer pending and retry the Retail step with the same stored response/idempotency key. Show pending integrations to an administrator until completed.
11. Refresh wholesale availability immediately before checkout. A catalog price is informative; the `post_sale` response is authoritative because Wholesale WAC may have changed.
12. Keep the wholesale-derived catalog in a separate POS section/folder. The exact visual treatment can be added later without changing this API.

## Important accounting behavior

- The wholesale transfer creates a receivable for `Gatronix Store - Retail` and no wholesale cashflow entry.
- The Retail automatic purchase creates a payable to `Gatronix Wholesale` and no Retail cash outflow entry.
- The Retail customer invoice and customer payment work normally and use the Retail selling price.
- Recording the eventual inter-business settlement must reduce both balances. Do not count the transfer as cash before settlement.

## Wholesale deployment steps for the owner

1. Run `supabase/sql/016_retail_store_bridge.sql` in the Wholesale Supabase SQL editor.
2. Generate a strong random shared secret of at least 32 characters.
3. Add it to the Wholesale Supabase Edge Function secrets as `RETAIL_BRIDGE_SHARED_SECRET`.
4. Deploy `supabase/functions/retail-bridge/index.ts` as a function named `retail-bridge` with JWT verification disabled. Authentication is instead the server-to-server shared secret.
5. Add the same secret to the Retail Supabase project Edge Function secrets. Never add it to Cloudflare Pages/Workers frontend variables prefixed with `VITE_`.
6. Give this entire handoff document to the Codex session working in `Documents/Shop-POS`.

CLI equivalent after linking/authenticating Supabase CLI:

```text
supabase secrets set RETAIL_BRIDGE_SHARED_SECRET=<strong-secret> --project-ref xxmdrrzoflakyzecmrmy
supabase functions deploy retail-bridge --project-ref xxmdrrzoflakyzecmrmy --no-verify-jwt
```
