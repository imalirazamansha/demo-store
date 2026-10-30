-- ShopNest platform8: per-product fashion options (V3.9)
-- sizes: ["S","M","L","XL"]; colors: [{name:"Maroon", hex:"#7F1D1D"}]
-- Admin product form se bharta hai; khaali {} = koi size/color nahi.
alter table public.products
  add column if not exists options jsonb not null default '{}'::jsonb;
