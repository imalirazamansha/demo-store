-- ShopNest platform9: newsletter subscribers (V3.10)
-- Footer subscribe form (subForm) ki emails yahan save hoti hain.
-- Sirf INSERT allowed (anon); parhna sirf service/admin key se.
create table if not exists public.newsletter_subscribers (
  id bigint generated always as identity primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  unique (store_id, email)
);
alter table public.newsletter_subscribers enable row level security;
drop policy if exists "anon insert newsletter" on public.newsletter_subscribers;
create policy "anon insert newsletter" on public.newsletter_subscribers
  for insert to anon with check (true);
