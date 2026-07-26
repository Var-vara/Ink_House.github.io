-- ============================================================
-- БАЗА ДАННЫХ ДЛЯ АВТОРСКОГО САЙТА
-- Вставьте весь этот файл в Supabase → SQL Editor → New query → Run.
-- ============================================================

create extension if not exists pgcrypto;

-- Профили пользователей. Только профиль с is_admin = true управляет сайтом.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Произведения.
create table if not exists public.works (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  type text not null default 'book' check (type in ('book','story','illustrated')),
  genre text,
  description text,
  cover_url text,
  status text not null default 'draft' check (status in ('draft','published')),
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Главы. content_json хранит упорядоченные блоки текста и изображений.
create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works(id) on delete cascade,
  title text not null,
  chapter_number integer not null default 1,
  content_json jsonb not null default '[]'::jsonb,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(work_id, chapter_number)
);

-- Галерея.
create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text not null,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

-- Автоматически создаём профиль для нового пользователя.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Создаём профили для пользователей, которые появились раньше запуска этого файла.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- Безопасная проверка прав автора.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Включаем Row Level Security.
alter table public.profiles enable row level security;
alter table public.works enable row level security;
alter table public.chapters enable row level security;
alter table public.gallery enable row level security;

-- Удаляем старые политики, если файл запускается повторно.
drop policy if exists "profile owner can read" on public.profiles;
drop policy if exists "admin can manage profiles" on public.profiles;
drop policy if exists "published works are public" on public.works;
drop policy if exists "admin inserts works" on public.works;
drop policy if exists "admin updates works" on public.works;
drop policy if exists "admin deletes works" on public.works;
drop policy if exists "published chapters are public" on public.chapters;
drop policy if exists "admin inserts chapters" on public.chapters;
drop policy if exists "admin updates chapters" on public.chapters;
drop policy if exists "admin deletes chapters" on public.chapters;
drop policy if exists "published gallery is public" on public.gallery;
drop policy if exists "admin inserts gallery" on public.gallery;
drop policy if exists "admin updates gallery" on public.gallery;
drop policy if exists "admin deletes gallery" on public.gallery;

create policy "profile owner can read" on public.profiles
for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "admin can manage profiles" on public.profiles
for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "published works are public" on public.works
for select to anon, authenticated using (status = 'published' or public.is_admin());
create policy "admin inserts works" on public.works
for insert to authenticated with check (public.is_admin());
create policy "admin updates works" on public.works
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin deletes works" on public.works
for delete to authenticated using (public.is_admin());

create policy "published chapters are public" on public.chapters
for select to anon, authenticated using (
  public.is_admin() or (
    is_published = true and exists (
      select 1 from public.works w where w.id = work_id and w.status = 'published'
    )
  )
);
create policy "admin inserts chapters" on public.chapters
for insert to authenticated with check (public.is_admin());
create policy "admin updates chapters" on public.chapters
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin deletes chapters" on public.chapters
for delete to authenticated using (public.is_admin());

create policy "published gallery is public" on public.gallery
for select to anon, authenticated using (published = true or public.is_admin());
create policy "admin inserts gallery" on public.gallery
for insert to authenticated with check (public.is_admin());
create policy "admin updates gallery" on public.gallery
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin deletes gallery" on public.gallery
for delete to authenticated using (public.is_admin());

-- Права для Data API.
grant usage on schema public to anon, authenticated;
grant select on public.works, public.chapters, public.gallery to anon;
grant select, insert, update, delete on public.works, public.chapters, public.gallery to authenticated;
grant select, update on public.profiles to authenticated;

-- Публичное хранилище изображений.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', true, 10485760,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media files are public" on storage.objects;
drop policy if exists "admin uploads media" on storage.objects;
drop policy if exists "admin updates media" on storage.objects;
drop policy if exists "admin deletes media" on storage.objects;

create policy "media files are public" on storage.objects
for select to public using (bucket_id = 'media');
create policy "admin uploads media" on storage.objects
for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
create policy "admin updates media" on storage.objects
for update to authenticated using (bucket_id = 'media' and public.is_admin()) with check (bucket_id = 'media' and public.is_admin());
create policy "admin deletes media" on storage.objects
for delete to authenticated using (bucket_id = 'media' and public.is_admin());
