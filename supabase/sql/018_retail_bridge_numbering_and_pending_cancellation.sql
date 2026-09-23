-- Run in the GS-Wholesale Supabase project after 017_retail_bridge_cancellation.sql.
-- The old sequence parser started on the '-' before the sequence. PostgreSQL
-- interpreted '-0001' as -1, which could cause INV-YYYYMM-0001 to be reused.
begin;

create or replace function public.generate_document_number(p_prefix text)
returns text
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_year_month text := to_char(current_date, 'YYYYMM');
  v_sequence bigint;
  v_stem text;
begin
  if nullif(trim(p_prefix), '') is null then
    raise exception 'Document number prefix is required';
  end if;

  v_stem := p_prefix || '-' || v_year_month || '-';
  -- Serialize numbers for the same type and month. MAX + 1 alone is unsafe
  -- when two counters post at the same time.
  perform pg_advisory_xact_lock(hashtext('sales_documents'), hashtext(v_stem));

  select coalesce(max(substring(doc_no from char_length(v_stem) + 1)::bigint), 0) + 1
    into v_sequence
  from public.sales_documents
  where left(doc_no, char_length(v_stem)) = v_stem
    and substring(doc_no from char_length(v_stem) + 1) ~ '^[0-9]+$';

  return v_stem || lpad(v_sequence::text, greatest(4, char_length(v_sequence::text)), '0');
end;
$$;

-- A canceled idempotency key must never be allowed to complete a late post.
-- The bridge posts its invoice and changes this row in one transaction, so
-- rejecting the final state change rolls back all invoice/stock effects.
create or replace function public.guard_cancelled_retail_bridge_post_v18()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'This Retail transfer was cancelled and cannot be posted again';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_cancelled_retail_bridge_post_v18
  on public.retail_bridge_transactions;
create trigger guard_cancelled_retail_bridge_post_v18
before update on public.retail_bridge_transactions
for each row execute function public.guard_cancelled_retail_bridge_post_v18();

-- The Retail project may have lost the response after Wholesale committed.
-- Insert a canceled tombstone when no transaction exists so a delayed post
-- using the same idempotency key cannot create a Wholesale invoice later.
create or replace function public.retail_bridge_cancel_pending_sale(
  p_idempotency_key text,
  p_retail_sale_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  bridge_tx public.retail_bridge_transactions%rowtype;
  result jsonb;
  key_value text := trim(p_idempotency_key);
  reference_value text := trim(p_retail_sale_reference);
begin
  if length(coalesce(key_value, '')) < 8 or nullif(reference_value, '') is null then
    raise exception 'A transfer key and Retail sale reference are required';
  end if;

  result := jsonb_build_object(
    'success', true, 'cancelled', true, 'not_posted', true,
    'idempotency_key', key_value, 'retail_sale_reference', reference_value
  );
  insert into public.retail_bridge_transactions (
    idempotency_key, retail_sale_reference, status, request_payload,
    cancellation_response, cancelled_at
  ) values (
    key_value, reference_value, 'cancelled', '{}'::jsonb, result, now()
  ) on conflict (idempotency_key) do nothing;

  select * into bridge_tx
  from public.retail_bridge_transactions
  where idempotency_key = key_value
  for update;

  if bridge_tx.retail_sale_reference <> reference_value then
    raise exception 'Retail sale reference does not match the Wholesale transfer';
  end if;
  if bridge_tx.status = 'cancelled' then
    return coalesce(bridge_tx.cancellation_response, result);
  end if;
  if bridge_tx.status = 'completed' then
    if bridge_tx.wholesale_document_id is null then
      raise exception 'Wholesale transfer has no linked document; manual reconciliation is required';
    end if;
    return public.retail_bridge_cancel_sale(
      key_value, reference_value, bridge_tx.wholesale_document_id
    );
  end if;
  if bridge_tx.status <> 'processing' or bridge_tx.wholesale_document_id is not null then
    raise exception 'Wholesale transfer state requires manual reconciliation';
  end if;

  update public.retail_bridge_transactions
  set status = 'cancelled', cancellation_response = result, cancelled_at = now()
  where id = bridge_tx.id;
  return result;
end;
$$;

revoke all on function public.retail_bridge_cancel_pending_sale(text, text)
  from public, anon, authenticated;
grant execute on function public.retail_bridge_cancel_pending_sale(text, text)
  to service_role;

notify pgrst, 'reload schema';
commit;

