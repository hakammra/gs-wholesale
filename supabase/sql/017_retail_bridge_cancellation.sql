-- Migration: 017_retail_bridge_cancellation.sql
-- Idempotently cancel a bridge-created Wholesale credit invoice when its
-- linked Retail sale is deleted. Run after 016_retail_store_bridge.sql.

begin;

alter table public.retail_bridge_transactions
  drop constraint if exists retail_bridge_transactions_status_check;

alter table public.retail_bridge_transactions
  add constraint retail_bridge_transactions_status_check
    check (status in ('processing', 'completed', 'cancelled')),
  add column if not exists cancellation_response jsonb,
  add column if not exists cancelled_at timestamptz;

create or replace function public.retail_bridge_cancel_sale(
  p_idempotency_key text,
  p_retail_sale_reference text,
  p_wholesale_document_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  bridge_tx public.retail_bridge_transactions%rowtype;
  sale_doc public.sales_documents%rowtype;
  sale_line record;
  stock public.stock_balances%rowtype;
  result jsonb;
begin
  select * into bridge_tx
  from public.retail_bridge_transactions
  where idempotency_key = trim(p_idempotency_key)
  for update;
  if not found then raise exception 'Wholesale bridge transaction was not found'; end if;
  if bridge_tx.retail_sale_reference <> trim(p_retail_sale_reference) then
    raise exception 'Retail sale reference does not match the Wholesale bridge transaction';
  end if;
  if bridge_tx.wholesale_document_id is distinct from p_wholesale_document_id then
    raise exception 'Wholesale document does not match the bridge transaction';
  end if;
  if bridge_tx.status = 'cancelled' then
    return coalesce(bridge_tx.cancellation_response, jsonb_build_object(
      'success', true,
      'cancelled', true,
      'already_cancelled', true,
      'idempotency_key', bridge_tx.idempotency_key,
      'retail_sale_reference', bridge_tx.retail_sale_reference,
      'wholesale_document_id', bridge_tx.wholesale_document_id
    ));
  end if;
  if bridge_tx.status <> 'completed' then
    raise exception 'Wholesale bridge transaction is not completed and cannot be cancelled';
  end if;

  select * into sale_doc
  from public.sales_documents
  where id = bridge_tx.wholesale_document_id
  for update;
  if not found or sale_doc.doc_type <> 'sales_invoice' then
    raise exception 'Linked Wholesale sales invoice was not found';
  end if;
  if sale_doc.status = 'cancelled' then
    raise exception 'Wholesale invoice is already cancelled outside the Retail bridge; manual reconciliation is required';
  end if;
  if exists (select 1 from public.payments where sales_doc_id = sale_doc.id)
     or exists (select 1 from public.payment_allocations where sales_document_id = sale_doc.id)
     or exists (select 1 from public.cheque_register where sales_document_id = sale_doc.id) then
    raise exception 'Wholesale invoice has a linked payment or cheque. Remove or reverse it before deleting the Retail sale';
  end if;
  if exists (select 1 from public.sales_documents where original_invoice_id = sale_doc.id) then
    raise exception 'Wholesale invoice has a linked credit note or exchange and cannot be cancelled automatically';
  end if;

  for sale_line in
    select item.product_id, sum(item.base_qty) qty, max(item.unit_cost_snapshot) unit_cost
    from public.sales_document_items item
    where item.sales_document_id = sale_doc.id
    group by item.product_id
    order by item.product_id
  loop
    insert into public.stock_balances(product_id) values (sale_line.product_id)
    on conflict (product_id) do nothing;
    select * into stock from public.stock_balances where product_id = sale_line.product_id for update;
    update public.stock_balances
    set qty_on_hand = qty_on_hand + sale_line.qty,
        qty_available = greatest(0, qty_on_hand + sale_line.qty - qty_reserved),
        updated_at = now()
    where product_id = sale_line.product_id;
    insert into public.stock_movements(
      product_id, movement_type, reference_doc_type, reference_doc_id, reference_doc_no,
      qty_change, unit_cost_snapshot, balance_after, notes, created_by
    ) values (
      sale_line.product_id, 'sales_return_sellable', 'sales_invoice', sale_doc.id, sale_doc.doc_no,
      sale_line.qty, sale_line.unit_cost, stock.qty_on_hand + sale_line.qty,
      'Wholesale stock restored after linked Retail sale cancellation', 'Retail POS Bridge'
    );
  end loop;

  if coalesce(sale_doc.receivable_posted, false) and sale_doc.customer_id is not null and coalesce(sale_doc.balance_due, 0) > 0 then
    update public.customers
    set current_receivable = greatest(0, current_receivable - sale_doc.balance_due),
        updated_at = now()
    where id = sale_doc.customer_id;
  end if;

  update public.sales_documents
  set status = 'cancelled',
      payment_status = 'unpaid',
      paid_amount = 0,
      balance_due = 0,
      receivable_posted = false,
      notes = concat_ws(' | ', nullif(notes, ''), 'Cancelled by Retail POS bridge for ' || bridge_tx.retail_sale_reference),
      updated_at = now()
  where id = sale_doc.id;

  result := jsonb_build_object(
    'success', true,
    'cancelled', true,
    'idempotency_key', bridge_tx.idempotency_key,
    'retail_sale_reference', bridge_tx.retail_sale_reference,
    'wholesale_document_id', sale_doc.id,
    'wholesale_document_no', sale_doc.doc_no,
    'restored_total', sale_doc.grand_total
  );
  update public.retail_bridge_transactions
  set status = 'cancelled', cancellation_response = result, cancelled_at = now()
  where id = bridge_tx.id;
  return result;
end;
$$;

revoke all on function public.retail_bridge_cancel_sale(text, text, uuid) from public, anon, authenticated;
grant execute on function public.retail_bridge_cancel_sale(text, text, uuid) to service_role;

notify pgrst, 'reload schema';

commit;
