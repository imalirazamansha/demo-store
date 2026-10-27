-- ============================================================
-- ShopNest Platform — Migration 7 (V3.6: Product gallery)
-- Idempotent: bar bar run ho sakti hai.
--
-- products.gallery (jsonb, default []):
--   Card par swipeable images ke liye extra image URLs ki list.
--   [0] = main image ke baad pehli extra image, [1] doosri, [2] teesri.
--   Khaali [] = sirf main image (purana behaviour, koi farq nahi).
--   RLS: products par maujooda table-level policies hi lagti hain
--   (column-level policy nahi chahiye), is liye sirf column add hai.
-- ============================================================

alter table public.products
  add column if not exists gallery jsonb not null default '[]'::jsonb;
