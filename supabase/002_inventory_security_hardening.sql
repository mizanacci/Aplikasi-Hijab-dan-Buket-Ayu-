-- RUANG STOK: hardening keamanan + kepemilikan item
-- Jalankan sebagai project owner di Supabase SQL Editor setelah schema utama.
-- Ini bersifat idempotent dan aman untuk dijalankan berulang kali.

create or replace function public.inventory_belongs_to_user(p_item_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.inventory_items
        where id = p_item_id
          and user_id = p_user_id
    );
$$;

revoke all on function public.inventory_belongs_to_user(uuid, uuid) from public, anon;
grant execute on function public.inventory_belongs_to_user(uuid, uuid) to authenticated;

-- Policy read/write tetap milik user masing-masing. Jika project Anda sudah memiliki policy
-- yang lebih terperinci, SQL di bawah ini akan aman dijalankan karena memakai DROP IF EXISTS.

drop policy if exists "Users manage their own inventory" on public.inventory_items;
drop policy if exists "Users read their own movements" on public.stock_movements;
drop policy if exists "Users upload their own inventory images" on storage.objects;
drop policy if exists "Users update their own inventory images" on storage.objects;
drop policy if exists "Users delete their own inventory images" on storage.objects;

create policy "Users manage their own inventory"
on public.inventory_items
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users read their own movements"
on public.stock_movements
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users upload their own inventory images"
on storage.objects for insert to authenticated
with check (
    bucket_id = 'inventory-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users update their own inventory images"
on storage.objects for update to authenticated
using (
    bucket_id = 'inventory-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
    bucket_id = 'inventory-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users delete their own inventory images"
on storage.objects for delete to authenticated
using (
    bucket_id = 'inventory-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
);
