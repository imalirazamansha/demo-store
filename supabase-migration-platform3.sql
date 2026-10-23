-- ============================================================
-- ShopNest Platform — Migration 3 (V2 Part A)
-- Super Admin ko kisi bhi store ki settings row parhna/likhna:
-- "settings store write" policy (platform migration) mein platform
-- admin pehle se shamil hai, lekin yahan ek WAZEH dedicated policy
-- bhi laga di jati hai taa ke Super Admin ka Appearance (theme/font)
-- save har surat kaam kare — policies permissive hoti hain (OR),
-- is liye ye maujooda access ko kam nahi karti.
-- Idempotent: bar bar run ho sakti hai.
-- ============================================================

drop policy if exists "settings platform admin all" on public.settings;
create policy "settings platform admin all" on public.settings
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
