-- RUANG STOK: Hijab & Bahan Buket
-- Jalankan seluruh file ini sekali melalui Supabase Dashboard > SQL Editor.
-- Semua tabel memakai RLS. Jangan pernah menaruh service_role/secret key di aplikasi.

create extension if not exists pgcrypto;

create table if not exists public.inventory_items (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    category text not null check (category in ('hijab','flower','tool','packaging','finished_product')),
    name text not null check (char_length(name) between 1 and 120),
    variant text,
    color text,
    sku text,
    unit text not null default 'pcs',
    stock_qty numeric(12,2) not null default 0 check (stock_qty >= 0),
    min_stock numeric(12,2) not null default 0 check (min_stock >= 0),
    purchase_price numeric(14,2) not null default 0 check (purchase_price >= 0),
    stem_price numeric(14,2) not null default 0 check (stem_price >= 0),
    selling_price numeric(14,2) not null default 0 check (selling_price >= 0),
    description text,
    image_url text,
    image_path text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists inventory_items_user_sku_unique
    on public.inventory_items(user_id, sku) where sku is not null and sku <> '';
create index if not exists inventory_items_user_category_idx
    on public.inventory_items(user_id, category);
create index if not exists inventory_items_user_updated_idx
    on public.inventory_items(user_id, updated_at desc);

create table if not exists public.stock_movements (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    item_id uuid not null references public.inventory_items(id) on delete cascade,
    movement_type text not null check (movement_type in ('IN','OUT','ADJUSTMENT')),
    quantity numeric(12,2) not null check (quantity > 0),
    stock_before numeric(12,2) not null,
    stock_after numeric(12,2) not null check (stock_after >= 0),
    note text,
    created_at timestamptz not null default now()
);
create index if not exists stock_movements_user_created_idx
    on public.stock_movements(user_id, created_at desc);
create index if not exists stock_movements_item_created_idx
    on public.stock_movements(item_id, created_at desc);

-- updated_at otomatis diperbarui ketika barang diedit.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists inventory_items_set_updated_at on public.inventory_items;
create trigger inventory_items_set_updated_at
before update on public.inventory_items
for each row execute function public.set_updated_at();

-- Riwayat perubahan stok + update saldo dilakukan dalam satu transaksi database.
-- Fungsi SECURITY DEFINER diperlukan agar user tidak mendapat hak INSERT langsung ke tabel histori.
-- Fungsi tetap memeriksa auth.uid() dan user_id barang secara eksplisit. Jalankan SQL ini sebagai project owner.
-- Untuk ADJUSTMENT, p_quantity adalah jumlah stok akhir yang ingin ditetapkan.
create or replace function public.register_stock_movement(
    p_item_id uuid,
    p_movement_type text,
    p_quantity numeric,
    p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_item public.inventory_items%rowtype;
    v_new_stock numeric(12,2);
    v_movement public.stock_movements%rowtype;
begin
    if auth.uid() is null then
        raise exception 'Anda harus login untuk mengubah stok.';
    end if;
    if p_movement_type not in ('IN','OUT','ADJUSTMENT') then
        raise exception 'Jenis perubahan stok tidak valid.';
    end if;
    if p_quantity is null or p_quantity <= 0 then
        raise exception 'Jumlah harus lebih besar dari nol.';
    end if;

    select * into v_item
    from public.inventory_items
    where id = p_item_id and user_id = auth.uid()
    for update;

    if not found then
        raise exception 'Barang tidak ditemukan atau bukan milik akun ini.';
    end if;

    if p_movement_type = 'IN' then
        v_new_stock := v_item.stock_qty + p_quantity;
    elsif p_movement_type = 'OUT' then
        v_new_stock := v_item.stock_qty - p_quantity;
    else
        v_new_stock := p_quantity;
    end if;

    if v_new_stock < 0 then
        raise exception 'Stok tidak mencukupi. Stok saat ini: %', v_item.stock_qty;
    end if;

    update public.inventory_items
    set stock_qty = v_new_stock
    where id = v_item.id;

    insert into public.stock_movements (
        user_id, item_id, movement_type, quantity, stock_before, stock_after, note
    ) values (
        auth.uid(), v_item.id, p_movement_type, p_quantity, v_item.stock_qty, v_new_stock, p_note
    ) returning * into v_movement;

    return jsonb_build_object(
        'id', v_movement.id,
        'item_id', v_movement.item_id,
        'movement_type', v_movement.movement_type,
        'quantity', v_movement.quantity,
        'stock_before', v_movement.stock_before,
        'stock_after', v_movement.stock_after,
        'created_at', v_movement.created_at
    );
end;
$$;

-- Akses tabel: hanya user terautentikasi, dan hanya baris miliknya sendiri.
alter table public.inventory_items enable row level security;
alter table public.stock_movements enable row level security;

revoke all on table public.inventory_items from anon, authenticated;
revoke all on table public.stock_movements from anon, authenticated;
grant select, insert, delete on table public.inventory_items to authenticated;
-- Saldo stok dan pemilik tidak boleh diedit langsung lewat Data API. Perubahan saldo hanya lewat fungsi register_stock_movement.
grant update (category, name, variant, color, sku, unit, min_stock, purchase_price, stem_price, selling_price, description, image_url, image_path)
    on table public.inventory_items to authenticated;
grant select on table public.stock_movements to authenticated;

-- Hapus policy bernama sama supaya file SQL aman dijalankan ulang.
drop policy if exists "Users manage their own inventory" on public.inventory_items;
drop policy if exists "Users read their own movements" on public.stock_movements;

create policy "Users manage their own inventory"
on public.inventory_items
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users read their own movements"
on public.stock_movements
for select to authenticated
using ((select auth.uid()) = user_id);

revoke all on function public.register_stock_movement(uuid, text, numeric, text) from public, anon;
grant execute on function public.register_stock_movement(uuid, text, numeric, text) to authenticated;

-- Bucket foto. Bucket public hanya membuat URL foto dapat ditampilkan; upload/update/delete
-- tetap dibatasi berdasarkan folder pertama = UUID pengguna yang sedang login.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('inventory-images', 'inventory-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload their own inventory images" on storage.objects;
drop policy if exists "Users update their own inventory images" on storage.objects;
drop policy if exists "Users delete their own inventory images" on storage.objects;

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

-- Catatan kategori:
-- hijab            = jenis/varian hijab dan warna (stok dicatat per warna/varian)
-- flower           = jenis bunga, warna, harga bunga, harga per tangkai
-- tool             = perkakas (gunting, glue gun, dll.)
-- packaging        = bahan habis pakai (selotip, kayu tusuk, kertas, gabus, dll.)
-- finished_product = produk buket jadi (opsional, bila ingin dihitung sebagai stok produk)
