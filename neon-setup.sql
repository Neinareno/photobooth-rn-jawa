-- Photobooth Ratna Prastyani & Nuryadi — skema Neon (sudah diterapkan).
-- Backend: proyek Neon `photobooth-rn-jawa` + Function publik `api`.
-- Tidak ada kunci rahasia di situs GitHub Pages; klien hanya memakai URL Function.
-- PIN admin/galeri diverifikasi di server (hash di skema private).

create schema if not exists private;
revoke all on schema private from public;

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  file_path text not null,
  public_url text not null,
  layout text,
  theme text,
  content_type text not null default 'image/jpeg'
);

create table if not exists public.photo_blobs (
  photo_id uuid primary key references public.photos(id) on delete cascade,
  image_data bytea not null
);

create index if not exists photos_created_at_idx on public.photos (created_at desc);

create table if not exists private.app_config (
  key text primary key,
  value text not null
);
create table if not exists private.pin_attempts (
  id bigserial primary key,
  at timestamptz not null default now(),
  ok boolean not null
);

-- Hash PIN = sha256('rn-photobooth:' || PIN). PIN: 290127.
insert into private.app_config (key, value)
values ('admin_pin_sha256', encode(sha256(convert_to('rn-photobooth:' || '290127', 'UTF8')), 'hex'))
on conflict (key) do update set value = excluded.value;

alter table public.photos enable row level security;
alter table public.photo_blobs enable row level security;
revoke all on public.photos from public;
revoke all on public.photo_blobs from public;
revoke all on private.app_config from public;
revoke all on private.pin_attempts from public;

-- Fungsi verify_pin / delete_photos: lihat neon-fn (Function memanggil SQL ini).
-- Anon tidak mendapat GRANT; hanya role pemilik (Function) yang menulis/membaca.
-- Permukaan publik: GET daftar, GET gambar, POST unggah (dibatasi ukuran), hapus hanya dengan PIN.
