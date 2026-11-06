-- RUANG STOK: migration penambahan saldo awal + soft delete + histori stok yang aman.
-- Jalankan setelah schema utama. Script ini idempotent.

alter table public.inventory_items
    add column if not exists is_active boolean not null default true,
    add column if not exists archived_at timestamptz,
    add column if not exists archived_by uuid;

alter table public.stock_movements
    drop constraint if exists stock_movements_movement_type_check;

alter table public.stock_movements
    add constraint stock_movements_movement_type_check
    check (movement_type in ('OPENING','IN','OUT','ADJUSTMENT'));

update public.inventory_items
set is_active = true
where is_active is null;

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
    if p_movement_type not in ('OPENING','IN','OUT','ADJUSTMENT') then
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

    if p_movement_type = 'OPENING' then
        if v_item.stock_qty > 0 then
            raise exception 'Saldo awal hanya boleh dipasang pada item baru yang belum mempunyai stok.';
        end if;
        v_new_stock := p_quantity;
    elsif p_movement_type = 'IN' then
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
    set stock_qty = v_new_stock,
        updated_at = now()
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

create or replace function public.archive_item(p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_item public.inventory_items%rowtype;
begin
    if auth.uid() is null then
        raise exception 'Anda harus login untuk mengarsipkan barang.';
    end if;

    select * into v_item
    from public.inventory_items
    where id = p_item_id and user_id = auth.uid()
    for update;

    if not found then
        raise exception 'Barang tidak ditemukan atau bukan milik akun ini.';
    end if;

    update public.inventory_items
    set is_active = false,
        archived_at = now(),
        archived_by = auth.uid(),
        updated_at = now()
    where id = v_item.id;

    return jsonb_build_object(
        'id', v_item.id,
        'archived_at', now(),
        'is_active', false
    );
end;
$$;

revoke all on function public.register_stock_movement(uuid, text, numeric, text) from public, anon;
grant execute on function public.register_stock_movement(uuid, text, numeric, text) to authenticated;
revoke all on function public.archive_item(uuid) from public, anon;
grant execute on function public.archive_item(uuid) to authenticated;

create index if not exists inventory_items_user_active_idx
    on public.inventory_items(user_id, is_active, updated_at desc);
