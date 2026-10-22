-- =====================================================================
-- ShopNest — MULTI-TENANT PLATFORM patch (Phase 1B)
-- Run ONCE in the Supabase SQL Editor for project "shopnest-store",
-- supabase-migration-platform.sql (Phase 1A) ke BAAD.
-- Idempotent: safe to re-run (guards / DO blocks / if-not-exists).
--
-- Kya kya hota hai is patch mein:
--  1) categories.name ki GLOBAL unique constraint hata kar per-store
--     unique (store_id, name) — do stores ki "Fashion" category chalegi.
--  2) coupons.code ki GLOBAL unique bhi per-store: unique (store_id, code).
--  3) settings.id ke liye sequence + DEFAULT — har nayi store ki settings
--     row bhi id conflict ke baghair ban sakti hai (ab settings per-store
--     upsert store_id par hota hai, id sirf internal hai).
--  4) platform_admins par RLS confirm + read policy sirf platform admins
--     ke liye (API se writes koi nahi — sirf SQL Editor se change hoga).
--     (Phase 1A mein bhi yehi policy thi; yahan idempotent dobara lagayi
--     gayi hai taa ke patch akela bhi complete ho.)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) CATEGORIES — global unique(name) → unique(store_id, name)
--    Constraint ka naam pg_constraint se dhoonda jata hai (aam tor par
--    'categories_name_key'), hardcode nahi kiya gaya.
-- ---------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.categories'::regclass
      and con.contype = 'u'
      and (select string_agg(att.attname, ',' order by att.attname)
             from pg_attribute att
            where att.attrelid = con.conrelid
              and att.attnum = any (con.conkey::int[])) = 'name'
  loop
    execute format('alter table public.categories drop constraint %I', r.conname);
    raise notice 'Dropped global unique constraint on categories: %', r.conname;
  end loop;
end $$;

-- Per-store unique — pehle se ho to dobara nahi lagti.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.categories'::regclass
      and contype = 'u'
      and conname = 'categories_store_id_name_key'
  ) then
    alter table public.categories
      add constraint categories_store_id_name_key unique (store_id, name);
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 2) COUPONS — global unique(code) → unique(store_id, code)
--    (aam tor par purani constraint 'coupons_code_key' hoti hai)
-- ---------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.coupons'::regclass
      and con.contype = 'u'
      and (select string_agg(att.attname, ',' order by att.attname)
             from pg_attribute att
            where att.attrelid = con.conrelid
              and att.attnum = any (con.conkey::int[])) = 'code'
  loop
    execute format('alter table public.coupons drop constraint %I', r.conname);
    raise notice 'Dropped global unique constraint on coupons: %', r.conname;
  end loop;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.coupons'::regclass
      and contype = 'u'
      and conname = 'coupons_store_id_code_key'
  ) then
    alter table public.coupons
      add constraint coupons_store_id_code_key unique (store_id, code);
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 3) SETTINGS id — sequence + DEFAULT nextval.
--    Sequence ko mojooda max(id) se AAGE set kiya jata hai taa ke nayi
--    rows purani ids se takrayein nahi.
-- ---------------------------------------------------------------------
create sequence if not exists public.settings_id_seq;

do $$
declare
  v_max bigint;
begin
  select coalesce(max(id), 0) into v_max from public.settings;
  perform setval('public.settings_id_seq', v_max + 1, false);
end $$;

alter table public.settings
  alter column id set default nextval('public.settings_id_seq');


-- ---------------------------------------------------------------------
-- 4) PLATFORM ADMINS — RLS enable + sirf platform admins list dekh
--    sakte hain. Koi insert/update/delete policy NAHI di gayi: API se
--    platform admins change nahi ho sakte (sirf SQL Editor).
-- ---------------------------------------------------------------------
alter table public.platform_admins enable row level security;

drop policy if exists "platform admins read" on public.platform_admins;
create policy "platform admins read" on public.platform_admins
  for select to authenticated
  using (public.is_platform_admin());

-- Verify (optional):
-- select conname, pg_get_constraintdef(oid) from pg_constraint
--   where conrelid in ('public.categories'::regclass, 'public.coupons'::regclass)
--     and contype = 'u';
-- select id, store_id from public.settings order by id;
-- insert into public.settings (store_id, data)
--   select id, '{}'::jsonb from public.stores where slug = 'shopnest'
--   on conflict (store_id) do nothing;  -- id auto aana chahiye
