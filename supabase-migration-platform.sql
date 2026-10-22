-- =====================================================================
-- ShopNest — MULTI-TENANT PLATFORM migration (Phase 1A)
-- Run ONCE in the Supabase SQL Editor for project "shopnest-store".
-- Idempotent: safe to re-run (guards / drop-if-exists / on conflict).
--
-- Kya kya hota hai is migration mein:
--  1) public.stores           — har client ka ek store (slug, plan, fee,
--                               status, custom domain)
--  2) public.platform_admins — platform ke super-admins (sirf Muse/owner)
--  3) Default store 'shopnest' seed + SAARI existing tables (products,
--     orders, categories, coupons, visits, team, settings) mein
--     store_id column + backfill usi default store par.
--  4) Store-scoped helper functions: my_store_role() / is_team_of() /
--     is_platform_admin() / is_any_team()
--  5) public.storefront_stores VIEW — storefront tenant resolution ke
--     liye public-safe columns (slug, name, custom_domain, status, id)
--  6) SAARI RLS policies store-scoped dobara likhi gayi hain. Purani
--     shopify-migration wali "team" policies drop ho jati hain.
--  7) check_coupon RPC ab store-scoped hai: check_coupon(p_code, p_store).
--     Purani check_coupon(p_code) signature DROP ho jati hai — is liye ye
--     migration AUR naya storefront (script.js) EK SAATH deploy karein.
--
-- NOTE — purane helpers my_role()/is_team()/is_admin_plus() jaan boojh kar
-- NAHI hataye gaye: admin panel (Phase 1B) abhi unhi par chalta hai.
-- Phase 1B mein admin store-scoped hoga, tab woh bhi badal jayenge.
--
-- NOTE — storage 'product-images' bucket folder-agnostic hai: koi bhi
-- team member (kisi bhi store ka) ya platform admin images likh sakta
-- hai. Per-store folder isolation Phase 1B ke liye documented limit hai.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) STORES + PLATFORM ADMINS
-- ---------------------------------------------------------------------
create table if not exists public.stores (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  owner_email   text,
  status        text not null default 'active'
                check (status in ('active','suspended','deleted')),
  plan          text not null default 'Basic',
  monthly_fee   int  not null default 0,
  fee_status    text not null default 'paid'
                check (fee_status in ('paid','unpaid')),
  next_due      date,
  custom_domain text unique,
  domain_status text not null default 'none'
                check (domain_status in ('none','pending','live')),
  created_at    timestamptz not null default now()
);

create table if not exists public.platform_admins (
  email text primary key
);

insert into public.platform_admins (email)
values ('aliraza04591@gmail.com')
on conflict (email) do nothing;

alter table public.stores enable row level security;
alter table public.platform_admins enable row level security;

-- ---------------------------------------------------------------------
-- 2) DEFAULT STORE seed — maujooda ShopNest hi pehla tenant hai
-- ---------------------------------------------------------------------
insert into public.stores (slug, name, owner_email, status)
values ('shopnest', 'ShopNest', 'aliraza04591@gmail.com', 'active')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- 3) store_id columns — saari tenant tables mein
-- ---------------------------------------------------------------------
alter table public.products   add column if not exists store_id uuid references public.stores(id);
alter table public.orders     add column if not exists store_id uuid references public.stores(id);
alter table public.categories add column if not exists store_id uuid references public.stores(id);
alter table public.coupons    add column if not exists store_id uuid references public.stores(id);
alter table public.visits     add column if not exists store_id uuid references public.stores(id);
alter table public.team       add column if not exists store_id uuid references public.stores(id);
alter table public.settings   add column if not exists store_id uuid references public.stores(id);

-- ---------------------------------------------------------------------
-- 4) BACKFILL — jo row abhi store_id ke baghair hai, woh default
--    'shopnest' store ki hai (ab tak system single-tenant tha).
-- ---------------------------------------------------------------------
do $$
declare
  v_store uuid;
begin
  select id into v_store from public.stores where slug = 'shopnest';
  if v_store is null then
    raise exception 'Default store (slug=shopnest) nahi mila — backfill ruk gaya.';
  end if;

  update public.products   set store_id = v_store where store_id is null;
  update public.orders     set store_id = v_store where store_id is null;
  update public.categories set store_id = v_store where store_id is null;
  update public.coupons    set store_id = v_store where store_id is null;
  update public.visits     set store_id = v_store where store_id is null;
  update public.team       set store_id = v_store where store_id is null;
  update public.settings   set store_id = v_store where store_id is null;
end $$;

-- ---------------------------------------------------------------------
-- 5) CONSTRAINTS — backfill ke BAAD not null, settings par per-store
--    unique, aur team ki primary key (store_id, email) composite.
-- ---------------------------------------------------------------------
alter table public.products   alter column store_id set not null;
alter table public.orders     alter column store_id set not null;
alter table public.categories alter column store_id set not null;
alter table public.visits     alter column store_id set not null;
alter table public.team       alter column store_id set not null;
alter table public.settings   alter column store_id set not null;
alter table public.coupons    alter column store_id set not null;

-- Ek store ki sirf EK settings row (admin upsert isi par chalega).
create unique index if not exists settings_store_id_uidx
  on public.settings (store_id);

-- team: purani single-column PK (email) hata kar composite PK.
-- Guard: sirf tab jab purani 'team_pkey' mojood ho aur composite na ho.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.team'::regclass
      and contype = 'p' and conname = 'team_pkey'
  ) and not exists (
    select 1 from pg_constraint
    where conrelid = 'public.team'::regclass
      and contype = 'p' and conname = 'team_store_email_pkey'
  ) then
    alter table public.team drop constraint team_pkey;
    alter table public.team
      add constraint team_store_email_pkey primary key (store_id, email);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 6) HELPER FUNCTIONS (security definer — RLS ke andar safe calls)
-- ---------------------------------------------------------------------
create or replace function public.my_store_role(p_store uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.team
  where store_id = p_store
    and email = (auth.jwt() ->> 'email')
$$;

create or replace function public.is_team_of(p_store uuid)
returns bool
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.my_store_role(p_store) is not null, false)
$$;

create or replace function public.is_platform_admin()
returns bool
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins
    where email = (auth.jwt() ->> 'email')
  )
$$;

-- Orders/visits INSERT policies ke liye: store ACTIVE hai ya nahi.
-- YE FUNCTION LAZMI HAI: stores table par RLS hai aur anon ko us par
-- koi select policy nahi milti — policy ke andar seedha
-- "store_id in (select id from stores ...)" likhne se subquery hamesha
-- khaali aayegi aur har insert reject ho jayega. Security definer
-- helper RLS ko bypass karke sahi jawab deta hai.
create or replace function public.is_active_store(p_store uuid)
returns bool
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.stores
    where id = p_store and status = 'active'
  )
$$;

-- Storage policies ke liye: banda KISI bhi store ki team mein hai ya nahi
-- (bucket folder-agnostic hai — documented limitation).
create or replace function public.is_any_team()
returns bool
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team
    where email = (auth.jwt() ->> 'email')
  )
$$;

grant execute on function public.my_store_role(uuid)   to anon, authenticated;
grant execute on function public.is_team_of(uuid)      to anon, authenticated;
grant execute on function public.is_platform_admin()   to anon, authenticated;
grant execute on function public.is_any_team()         to anon, authenticated;
grant execute on function public.is_active_store(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 7) check_coupon — STORE-SCOPED naya signature + purana drop
-- ---------------------------------------------------------------------
create or replace function public.check_coupon(p_code text, p_store uuid)
returns table (pct int)
language sql
stable
security definer
set search_path = public
as $$
  select c.pct
  from public.coupons c
  where c.active
    and c.store_id = p_store
    and upper(c.code) = upper(trim(coalesce(p_code, '')))
  limit 1
$$;

grant execute on function public.check_coupon(text, uuid) to anon, authenticated;

-- Purana single-argument wala RPC ab istemal nahi hoga (naya storefront
-- hamesha p_store bhejta hai). Drop kar dein taa ke confusion na rahe.
drop function if exists public.check_coupon(text);

-- ---------------------------------------------------------------------
-- 8) STOREFRONT VIEW — tenant resolution ke liye public-safe columns.
--    id bhi shamil hai: storefront ko queries scope karne ke liye store
--    ki uuid chahiye hoti hai (warna store_id filter lag hi nahi sakta).
--    View owner ke rights se chalti hai, is liye stores ki RLS anon ko
--    poori table nahi kholti — sirf ye mehfooz columns milte hain.
-- ---------------------------------------------------------------------
create or replace view public.storefront_stores as
  select id, slug, name, custom_domain, status
  from public.stores
  where status <> 'deleted';

grant select on public.storefront_stores to anon, authenticated;


-- =====================================================================
-- 9) RLS POLICIES — store-scoped dobara.
--    Purani shopify-migration wali policy names drop kiye ja rahe hain.
-- =====================================================================

-- STORES: apni store ki team ya platform admin dekh sakta hai;
-- banana / badalna / mitana sirf platform admin. --------------------
drop policy if exists "stores team read" on public.stores;
drop policy if exists "stores platform insert" on public.stores;
drop policy if exists "stores platform update" on public.stores;
drop policy if exists "stores platform delete" on public.stores;
create policy "stores team read" on public.stores
  for select to authenticated
  using (public.is_team_of(id) or public.is_platform_admin());
create policy "stores platform insert" on public.stores
  for insert to authenticated
  with check (public.is_platform_admin());
create policy "stores platform update" on public.stores
  for update to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "stores platform delete" on public.stores
  for delete to authenticated
  using (public.is_platform_admin());

-- PLATFORM ADMINS: sirf platform admin khud list dekh sakta hai;
-- API se koi write policy nahi (sirf SQL Editor se change hoga). ----
drop policy if exists "platform admins read" on public.platform_admins;
create policy "platform admins read" on public.platform_admins
  for select to authenticated
  using (public.is_platform_admin());

-- PRODUCTS: public read wesay hi; write usi store ki team / platform -
drop policy if exists "products admin write" on public.products;
drop policy if exists "products team write" on public.products;
drop policy if exists "products store write" on public.products;
create policy "products store write" on public.products
  for all to authenticated
  using (public.is_team_of(store_id) or public.is_platform_admin())
  with check (public.is_team_of(store_id) or public.is_platform_admin());
-- ("products public read" policy setup se mojood hai — select using(true)
--  storefront ke liye theek hai; store scope client query se hota hai.)

-- CATEGORIES: products jaisa hi pattern ------------------------------
drop policy if exists "categories team write" on public.categories;
drop policy if exists "categories store write" on public.categories;
create policy "categories store write" on public.categories
  for all to authenticated
  using (public.is_team_of(store_id) or public.is_platform_admin())
  with check (public.is_team_of(store_id) or public.is_platform_admin());
-- ("categories public read" select using(true) mojood rehti hai.)

-- ORDERS: checkout insert sirf ACTIVE store ke liye;
-- read/update/delete usi store ki team / platform admin --------------
drop policy if exists "orders public insert" on public.orders;
drop policy if exists "orders admin read" on public.orders;
drop policy if exists "orders admin update" on public.orders;
drop policy if exists "orders admin delete" on public.orders;
drop policy if exists "orders team read" on public.orders;
drop policy if exists "orders team update" on public.orders;
drop policy if exists "orders team delete" on public.orders;
drop policy if exists "orders store insert" on public.orders;
drop policy if exists "orders store read" on public.orders;
drop policy if exists "orders store update" on public.orders;
drop policy if exists "orders store delete" on public.orders;
create policy "orders store insert" on public.orders
  for insert to anon
  with check (public.is_active_store(store_id));
create policy "orders store read" on public.orders
  for select to authenticated
  using (public.is_team_of(store_id) or public.is_platform_admin());
create policy "orders store update" on public.orders
  for update to authenticated
  using (public.is_team_of(store_id) or public.is_platform_admin())
  with check (public.is_team_of(store_id) or public.is_platform_admin());
create policy "orders store delete" on public.orders
  for delete to authenticated
  using (public.is_team_of(store_id) or public.is_platform_admin());

-- SETTINGS: public read wesay hi; write usi store ke owner/admin
-- ya platform admin ---------------------------------------------------
drop policy if exists "settings admin write" on public.settings;
drop policy if exists "settings team write" on public.settings;
drop policy if exists "settings store write" on public.settings;
create policy "settings store write" on public.settings
  for all to authenticated
  using (public.my_store_role(store_id) in ('owner','admin') or public.is_platform_admin())
  with check (public.my_store_role(store_id) in ('owner','admin') or public.is_platform_admin());
-- ("settings public read" select using(true) mojood rehti hai.)

-- COUPONS: list sirf usi store ke owner/admin / platform admin ko;
-- shoppers ke liye sirf check_coupon RPC hai -------------------------
drop policy if exists "coupons admin all" on public.coupons;
drop policy if exists "coupons store all" on public.coupons;
create policy "coupons store all" on public.coupons
  for all to authenticated
  using (public.my_store_role(store_id) in ('owner','admin') or public.is_platform_admin())
  with check (public.my_store_role(store_id) in ('owner','admin') or public.is_platform_admin());

-- TEAM: list usi store ki team / platform admin;
-- add/change/remove usi store ka owner ya platform admin -------------
drop policy if exists "team read" on public.team;
drop policy if exists "team owner insert" on public.team;
drop policy if exists "team owner update" on public.team;
drop policy if exists "team owner delete" on public.team;
drop policy if exists "team store read" on public.team;
drop policy if exists "team store insert" on public.team;
drop policy if exists "team store update" on public.team;
drop policy if exists "team store delete" on public.team;
create policy "team store read" on public.team
  for select to authenticated
  using (public.is_team_of(store_id) or public.is_platform_admin());
create policy "team store insert" on public.team
  for insert to authenticated
  with check (public.my_store_role(store_id) = 'owner' or public.is_platform_admin());
create policy "team store update" on public.team
  for update to authenticated
  using (public.my_store_role(store_id) = 'owner' or public.is_platform_admin())
  with check (public.my_store_role(store_id) = 'owner' or public.is_platform_admin());
create policy "team store delete" on public.team
  for delete to authenticated
  using (public.my_store_role(store_id) = 'owner' or public.is_platform_admin());

-- VISITS: tracking insert sirf ACTIVE store ke liye;
-- parhna/mitana usi store ki team / platform admin -------------------
drop policy if exists "visits public insert" on public.visits;
drop policy if exists "visits team read" on public.visits;
drop policy if exists "visits team delete" on public.visits;
drop policy if exists "visits store insert" on public.visits;
drop policy if exists "visits store read" on public.visits;
drop policy if exists "visits store delete" on public.visits;
create policy "visits store insert" on public.visits
  for insert to anon, authenticated
  with check (public.is_active_store(store_id));
create policy "visits store read" on public.visits
  for select to authenticated
  using (public.is_team_of(store_id) or public.is_platform_admin());
create policy "visits store delete" on public.visits
  for delete to authenticated
  using (public.is_team_of(store_id) or public.is_platform_admin());

-- STORAGE (product-images bucket): public read wesay hi
-- ("product images public read" mojood hai); write = kisi bhi store ki
-- team ka member ya platform admin. LIMITATION: bucket folder-agnostic
-- hai — ek store ki team dusre store ki images bhi overwrite kar sakti
-- hai. Per-store folders Phase 1B mein. -------------------------------
drop policy if exists "product images admin insert" on storage.objects;
drop policy if exists "product images admin update" on storage.objects;
drop policy if exists "product images admin delete" on storage.objects;
drop policy if exists "product images team insert" on storage.objects;
drop policy if exists "product images team update" on storage.objects;
drop policy if exists "product images team delete" on storage.objects;
drop policy if exists "product images platform insert" on storage.objects;
drop policy if exists "product images platform update" on storage.objects;
drop policy if exists "product images platform delete" on storage.objects;
create policy "product images platform insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images'
              and (public.is_any_team() or public.is_platform_admin()));
create policy "product images platform update" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images'
         and (public.is_any_team() or public.is_platform_admin()))
  with check (bucket_id = 'product-images'
              and (public.is_any_team() or public.is_platform_admin()));
create policy "product images platform delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images'
         and (public.is_any_team() or public.is_platform_admin()));

-- Verify (optional):
-- select slug, name, status from public.stores;
-- select slug, name, status from public.storefront_stores;
-- select count(*), store_id from public.products group by store_id;
-- select * from public.team;  -- store_id + email composite PK
