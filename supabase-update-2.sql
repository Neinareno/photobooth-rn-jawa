-- =====================================================================
-- Photobooth Ratna Prastyani & Nuryadi — Update 2
-- Aman dijalankan berulang kali (idempotent).
-- Jalankan di Supabase Dashboard → SQL Editor → New query → Run.
--
-- Isi:
--  1) Realtime untuk tabel public.photos (halaman display.html)
--  2) Skema privat + hash PIN (tidak bisa dibaca anon)
--  3) Fungsi verify_pin / delete_photo / delete_photos (SECURITY DEFINER,
--     cek PIN di server + batas percobaan salah)
--  4) Kebijakan storage: anon HANYA boleh menghapus file yang barisnya
--     baru saja dihapus lewat fungsi ber-PIN (tidak ada DELETE terbuka)
-- =====================================================================

-- 1) Realtime -----------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'photos'
  ) then
    alter publication supabase_realtime add table public.photos;
  end if;
end $$;

-- 2) Skema privat & konfigurasi -----------------------------------------
create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create table if not exists private.app_config (
  key   text primary key,
  value text not null
);
revoke all on private.app_config from public, anon, authenticated;

-- Hash PIN = sha256('rn-photobooth:' || PIN). PIN saat ini: 290127.
-- Untuk mengganti PIN, ubah angka di bawah lalu jalankan ulang file ini.
insert into private.app_config (key, value)
values ('admin_pin_sha256', encode(sha256(convert_to('rn-photobooth:' || '290127', 'UTF8')), 'hex'))
on conflict (key) do update set value = excluded.value;

create table if not exists private.pin_attempts (
  id  bigserial primary key,
  at  timestamptz not null default now(),
  ok  boolean not null
);
revoke all on private.pin_attempts from public, anon, authenticated;

create table if not exists private.pending_storage_deletes (
  file_path  text primary key,
  created_at timestamptz not null default now()
);
revoke all on private.pending_storage_deletes from public, anon, authenticated;

-- Pemeriksa PIN (dengan pembatasan: maks 15 salah per 10 menit)
create or replace function private.check_pin(p_pin text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fail int;
  v_hash text;
  v_ok   boolean;
begin
  select count(*) into v_fail
  from private.pin_attempts
  where ok = false and at > now() - interval '10 minutes';
  if v_fail >= 15 then
    return 'too_many_attempts';
  end if;

  select value into v_hash from private.app_config where key = 'admin_pin_sha256';
  v_ok := v_hash is not null
          and encode(sha256(convert_to('rn-photobooth:' || coalesce(p_pin, ''), 'UTF8')), 'hex') = v_hash;

  insert into private.pin_attempts (ok) values (v_ok);
  delete from private.pin_attempts where at < now() - interval '1 day';

  return case when v_ok then 'ok' else 'invalid_pin' end;
end;
$$;
revoke all on function private.check_pin(text) from public, anon, authenticated;

-- 3) Fungsi publik (RPC) ------------------------------------------------
create or replace function public.verify_pin(p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare r text;
begin
  r := private.check_pin(p_pin);
  if r = 'ok' then
    return jsonb_build_object('ok', true);
  end if;
  return jsonb_build_object('ok', false, 'error', r);
end;
$$;

create or replace function public.delete_photos(p_ids uuid[], p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r text;
  v_deleted jsonb;
begin
  r := private.check_pin(p_pin);
  if r <> 'ok' then
    return jsonb_build_object('ok', false, 'error', r);
  end if;

  with del as (
    delete from public.photos p
    where p.id = any(coalesce(p_ids, '{}'::uuid[]))
    returning p.id, p.file_path
  ), mark as (
    insert into private.pending_storage_deletes (file_path)
    select d.file_path from del d where d.file_path is not null
    on conflict (file_path) do update set created_at = now()
    returning 1
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'file_path', d.file_path)), '[]'::jsonb)
    into v_deleted
  from del d;

  delete from private.pending_storage_deletes where created_at < now() - interval '1 day';

  return jsonb_build_object('ok', true, 'deleted', v_deleted);
end;
$$;

create or replace function public.delete_photo(p_id uuid, p_pin text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.delete_photos(array[p_id], p_pin);
$$;

-- Dipakai oleh kebijakan storage di bawah: true hanya untuk file yang
-- barisnya sudah dihapus lewat delete_photos (berlaku 15 menit).
create or replace function public.photobooth_can_delete_object(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.pending_storage_deletes d
    where d.file_path = p_name
      and d.created_at > now() - interval '15 minutes'
  );
$$;

revoke all on function public.verify_pin(text) from public;
revoke all on function public.delete_photos(uuid[], text) from public;
revoke all on function public.delete_photo(uuid, text) from public;
revoke all on function public.photobooth_can_delete_object(text) from public;
grant execute on function public.verify_pin(text) to anon, authenticated;
grant execute on function public.delete_photos(uuid[], text) to anon, authenticated;
grant execute on function public.delete_photo(uuid, text) to anon, authenticated;
grant execute on function public.photobooth_can_delete_object(text) to anon, authenticated;

-- 4) Kebijakan storage: hapus file hanya jika sudah "disetujui" fungsi ber-PIN
drop policy if exists "anon_delete_photobooth_pending" on storage.objects;
create policy "anon_delete_photobooth_pending"
  on storage.objects
  for delete
  to anon
  using (bucket_id = 'photobooth' and public.photobooth_can_delete_object(name));

-- Selesai. Cek cepat (opsional):
-- select public.verify_pin('000000');   -- harus {"ok": false, "error": "invalid_pin"}
