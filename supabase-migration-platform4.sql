-- ============================================================
-- ShopNest Platform — Migration 4 (V3 Part A: Theme System)
-- Idempotent: bar bar run ho sakti hai.
--
-- 1) stores.allowed_themes (jsonb, default []):
--    Super Admin is store ke liye kon se themes allow karta hai.
--    [] (empty array) = SAB themes allowed (default semantics).
-- 2) stores.theme (text, default null):
--    Super Admin ka set kiya hua store ka DEFAULT theme key
--    (null = koi default nahi, 'general' fallback chalega).
-- 3) storefront_stores view dobara banayi gayi taa ke storefront
--    (anon) theme + allowed_themes bhi parh sake — ye public-safe
--    fields hain, koi secret nahi.
-- ============================================================

alter table public.stores
  add column if not exists allowed_themes jsonb default '[]'::jsonb;

alter table public.stores
  add column if not exists theme text default null;

comment on column public.stores.allowed_themes is
  'V3 themes: is store ke liye allowed theme keys (json array). Empty [] = sab themes allowed.';
comment on column public.stores.theme is
  'V3 themes: store ka active/default theme key (super admin set karta hai). Null = general fallback.';

drop view if exists public.storefront_stores;

create view public.storefront_stores as
  select id, slug, name, custom_domain, status, theme, allowed_themes
  from public.stores
  where status <> 'deleted';

grant select on public.storefront_stores to anon, authenticated;
