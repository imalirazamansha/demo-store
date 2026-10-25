-- ============================================================
-- ShopNest Platform — Migration 6 (V3.2: Social-proof popups)
-- Idempotent: bar bar run ho sakti hai.
--
-- get_recent_orders_for_proof(p_store_slug):
--   Storefront ke "X ne Y order kiya" popups ke liye — sirf yehi
--   maloomat wapis karta hai:
--     first_name   = customer_name ka PEHLA lafz (poora naam kabhi nahi)
--     city         = order ka sheher
--     product_name = PEHLI line-item ka naam (poori items kabhi nahi)
--     total        = order total
--     ordered_at   = order ki date (time-ago ke liye)
--   Sirf status != 'Cancelled' wale orders, pichle 30 din ke, naye se
--   purane, zyada se zyada 10. Slug na mile to ZERO rows.
--   PRIVACY: phone, address, poora naam, poori items list — ye RPC
--   kabhi wapis nahi karta (columns select hi nahi hote).
--   Items ke dono formats support hain (get_order_status ki tarah):
--     { lines: [...] } object aur legacy plain array [...].
-- ============================================================

create or replace function public.get_recent_orders_for_proof(p_store_slug text)
returns table(first_name text, city text, product_name text, total int, ordered_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
begin
  -- Slug se store resolve karein; na mile to zero rows (koi leak nahi).
  select s.id into v_store_id
    from public.stores s
    where s.slug = nullif(trim(coalesce(p_store_slug, '')), '');

  if v_store_id is null then
    return;
  end if;

  return query
  select
    -- Pehla lafz hi: "Ahmed Raza" -> "Ahmed". Khaali ho to "Customer".
    coalesce(nullif(split_part(trim(coalesce(o.customer_name, '')), ' ', 1), ''), 'Customer'),
    o.city,
    -- Pehli line-item ka naam: dono items formats se.
    case
      when jsonb_typeof(o.items) = 'object' and o.items ? 'lines'
        then o.items -> 'lines' -> 0 ->> 'name'
      when jsonb_typeof(o.items) = 'array'
        then o.items -> 0 ->> 'name'
      else null
    end,
    o.total,
    o.created_at
  from public.orders o
  where o.store_id = v_store_id
    and o.status <> 'Cancelled'
    and o.created_at >= now() - interval '30 days'
  order by o.created_at desc
  limit 10;
end;
$$;

grant execute on function public.get_recent_orders_for_proof(text) to anon, authenticated;
