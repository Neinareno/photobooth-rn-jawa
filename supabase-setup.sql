-- Photobooth Ratna Prastyani & Nuryadi
-- Jalankan di Supabase: SQL Editor → New query → Run
-- Langkah ini membuat bucket penyimpanan, tabel foto, dan kebijakan RLS
-- agar tamu (anon) bisa mengunggah serta membaca foto.

-- 1) Bucket publik untuk file foto
insert into storage.buckets (id, name, public)
values ('photobooth', 'photobooth', true)
on conflict (id) do update set public = true;

-- 2) Tabel metadata foto
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  file_path text not null,
  public_url text not null,
  layout text,
  theme text
);

create index if not exists photos_created_at_idx
  on public.photos (created_at desc);

-- 3) Row Level Security
alter table public.photos enable row level security;

drop policy if exists "anon_insert_photos" on public.photos;
create policy "anon_insert_photos"
  on public.photos
  for insert
  to anon
  with check (true);

drop policy if exists "anon_select_photos" on public.photos;
create policy "anon_select_photos"
  on public.photos
  for select
  to anon
  using (true);

-- 4) Kebijakan Storage (unggah & baca di bucket photobooth)
drop policy if exists "anon_upload_photobooth" on storage.objects;
create policy "anon_upload_photobooth"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'photobooth');

drop policy if exists "anon_read_photobooth" on storage.objects;
create policy "anon_read_photobooth"
  on storage.objects
  for select
  to anon
  using (bucket_id = 'photobooth');

-- Opsional: izinkan menimpa file dengan nama yang sama (umumnya tidak terpakai)
-- drop policy if exists "anon_update_photobooth" on storage.objects;
-- create policy "anon_update_photobooth"
--   on storage.objects
--   for update
--   to anon
--   using (bucket_id = 'photobooth')
--   with check (bucket_id = 'photobooth');
