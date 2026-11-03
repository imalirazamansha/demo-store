-- V5 Phase 5 Part B: CAPI token storage.
-- WHY: settings table ki "settings public read" policy hai (select using(true)) —
-- storefront har load par poora settings.data anon key se parhta hai. Token agar
-- settings.data.meta mein hota to DUNIYA dekh sakti thi. Is liye alag table.
-- Run: Supabase Dashboard -> SQL Editor (ya CLI). Idempotent — dobara chalana safe hai.
create table if not exists public.store_meta_secrets (
  store_id uuid primary key references public.stores (id) on delete cascade,
  capi_token text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.store_meta_secrets enable row level security;
-- NO select policy: anon/authenticated token parh nahi sakte; sirf service_role
-- (Edge Function) parhta hai. Team sirf likh/delete kar sakta hai.
drop policy if exists "store_meta_secrets insert team" on public.store_meta_secrets;
create policy "store_meta_secrets insert team" on public.store_meta_secrets for insert to authenticated
  with check (public.my_store_role(store_id) in ('owner','admin') or public.is_platform_admin());
drop policy if exists "store_meta_secrets update team" on public.store_meta_secrets;
create policy "store_meta_secrets update team" on public.store_meta_secrets for update to authenticated
  using (public.my_store_role(store_id) in ('owner','admin') or public.is_platform_admin())
  with check (public.my_store_role(store_id) in ('owner','admin') or public.is_platform_admin());
drop policy if exists "store_meta_secrets delete team" on public.store_meta_secrets;
create policy "store_meta_secrets delete team" on public.store_meta_secrets for delete to authenticated
  using (public.my_store_role(store_id) in ('owner','admin') or public.is_platform_admin());
