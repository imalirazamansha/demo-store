-- ============================================================
-- ShopNest Platform — Migration 5 (V3 Part B: Security + Domain)
-- Idempotent: bar bar run ho sakti hai.
--
-- 1) platform_audit: Super Admin ke har ahem action ka record
--    (store create/suspend/activate/delete, fee paid/unpaid,
--     theme allocation change, domain live). Sirf platform admin
--    parh/likh sakta hai; anon ko koi access nahi.
-- 2) get_order_status(p_order_id, p_phone): customer apna order
--    track kare — phone verify karke sirf status/total/item count/
--    date wapis karta hai. Galat phone par ZERO rows. Yehi waahid
--    public order-read path hai — orders table par koi public
--    select policy NAHI kholi gayi.
-- 3) set_store_domain(p_store_id, p_domain, p_status): domain
--    update ka waahid rasta. Sirf woh columns badalta hai.
--    Team member apne store ka domain sirf 'pending'/'none' kar
--    sakta hai; 'live' sirf platform admin kar sakta hai.
--    Domain regex se validate hota hai; khaali string = clear.
-- 4) orders.tracking_note: admin ka courier/shipping note jo
--    tracking mein customer ko dikhta hai.
-- ============================================================

-- ---------- 1) platform_audit ----------
create table if not exists public.platform_audit (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_email text,
  store_id uuid references public.stores(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb
);

alter table public.platform_audit enable row level security;

drop policy if exists "platform audit platform select" on public.platform_audit;
create policy "platform audit platform select" on public.platform_audit
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "platform audit platform insert" on public.platform_audit;
create policy "platform audit platform insert" on public.platform_audit
  for insert to authenticated
  with check (public.is_platform_admin());

-- ---------- 2) get_order_status RPC ----------
create or replace function public.get_order_status(p_order_id bigint, p_phone text)
returns table(status text, total int, created_at timestamptz, item_count int, tracking_note text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_order record;
begin
  -- Phone normalize: sirf digits rakhein.
  v_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  if v_phone = '' then
    return;
  end if;

  select o.status, o.total, o.created_at, o.items, o.tracking_note, o.phone
    into v_order
    from public.orders o
    where o.id = p_order_id;

  if not found then
    return; -- order nahi mila: zero rows
  end if;

  -- Phone match: dono normalized numbers 10+ digits hon to aakhri
  -- 10 digits milayen (country code farq ignore); warna exact match.
  declare
    v_stored text := regexp_replace(coalesce(v_order.phone, ''), '[^0-9]', '', 'g');
  begin
    if length(v_phone) >= 10 and length(v_stored) >= 10 then
      if right(v_phone, 10) <> right(v_stored, 10) then
        return; -- mismatch: zero rows, koi info leak nahi
      end if;
    elsif v_phone <> v_stored then
      return; -- mismatch: zero rows
    end if;
  end;

  -- Item count: lines array ho ya purana plain array.
  return query select
    v_order.status,
    v_order.total,
    v_order.created_at,
    case
      when jsonb_typeof(v_order.items) = 'object' and v_order.items ? 'lines'
        then coalesce(jsonb_array_length(v_order.items -> 'lines'), 0)
      when jsonb_typeof(v_order.items) = 'array'
        then coalesce(jsonb_array_length(v_order.items), 0)
      else 0
    end,
    v_order.tracking_note;
end;
$$;

grant execute on function public.get_order_status(bigint, text) to anon, authenticated;

-- ---------- 3) set_store_domain RPC ----------
create or replace function public.set_store_domain(p_store_id uuid, p_domain text, p_status text default 'pending')
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain text := lower(trim(coalesce(p_domain, '')));
  v_is_platform boolean := public.is_platform_admin();
  v_is_team boolean := public.is_team_of(p_store_id);
begin
  if not v_is_platform and not v_is_team then
    raise exception 'not authorized for this store';
  end if;

  -- Status rules: team sirf pending/none; live sirf platform admin.
  if p_status not in ('none', 'pending', 'live') then
    raise exception 'invalid domain status';
  end if;
  if p_status = 'live' and not v_is_platform then
    raise exception 'only platform admin can mark a domain live';
  end if;

  -- Domain validate (khaali = clear karna).
  if v_domain <> '' then
    if length(v_domain) > 253
      or v_domain !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$' then
      raise exception 'invalid domain';
    end if;
  end if;

  update public.stores
    set custom_domain = nullif(v_domain, ''),
        domain_status = case when v_domain = '' then 'none' else p_status end
    where id = p_store_id;

  return found;
end;
$$;

grant execute on function public.set_store_domain(uuid, text, text) to authenticated;

-- ---------- 4) orders.tracking_note ----------
alter table public.orders
  add column if not exists tracking_note text;
