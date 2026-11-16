-- =====================================================================
--  منصة إبداع الوزية — قاعدة البيانات (Supabase)
--  الاستخدام: Supabase ← SQL Editor ← New query ← الصقي هذا الملف كاملاً ← Run
--  آمن لإعادة التشغيل: لا يحذف أي بيانات موجودة.
-- =====================================================================

-- ---------- الجداول ----------
create table if not exists public.admins (
  email text primary key
);

create table if not exists public.settings (
  key text primary key,
  value text not null default ''
);

create table if not exists public.items (
  id bigint generated always as identity primary key,
  type text not null check (type in ('competition','achievement','participation','event','news','gallery','honor')),
  title text not null check (char_length(title) between 1 and 200),
  summary text not null default '',
  body text not null default '',
  date date,
  end_date date,
  time text not null default '',
  category text not null default '',
  level text not null default '',
  status text not null default 'auto' check (status in ('auto','open','upcoming','closed')),
  conditions text not null default '',
  winners jsonb not null default '[]'::jsonb,
  people text not null default '',
  location text not null default '',
  result text not null default '',
  distinction text not null default '',
  rank integer,
  visible boolean not null default true,
  featured boolean not null default false,
  is_demo boolean not null default false,
  cover_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists items_type_idx on public.items (type, visible, date);

create table if not exists public.media (
  id bigint generated always as identity primary key,
  item_id bigint not null references public.items(id) on delete cascade,
  url text not null,
  path text,                -- مسار الملف في التخزين (فارغ لصور البيانات التجريبية)
  original text not null default '',
  mime text not null default '',
  kind text not null check (kind in ('image','video','pdf')),
  caption text not null default '',
  size bigint not null default 0,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists media_item_idx on public.media (item_id);

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 2 and 120),
  contact text not null default '' check (char_length(contact) <= 160),
  subject text not null default '' check (char_length(subject) <= 200),
  body text not null check (char_length(body) between 5 and 4000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- دوال مساعدة ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;
drop trigger if exists items_touch on public.items;
create trigger items_touch before update on public.items for each row execute function public.touch_updated_at();

-- حد لمنع إغراق نموذج التواصل: 20 رسالة كحد أقصى كل 10 دقائق
create or replace function public.limit_messages()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.messages where created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'rate limit: رسائل كثيرة';
  end if;
  new.is_read := false;
  new.created_at := now();
  return new;
end; $$;
drop trigger if exists messages_limit on public.messages;
create trigger messages_limit before insert on public.messages for each row execute function public.limit_messages();

-- ---------- الصلاحيات (RLS) ----------
alter table public.admins   enable row level security;
alter table public.settings enable row level security;
alter table public.items    enable row level security;
alter table public.media    enable row level security;
alter table public.messages enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.settings, public.items, public.media to anon, authenticated;
grant insert on public.messages to anon, authenticated;
grant select, insert, update, delete on public.settings, public.items, public.media, public.messages to authenticated;
grant select on public.admins to authenticated;
grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists "admins read own" on public.admins;
create policy "admins read own" on public.admins for select to authenticated using (public.is_admin());

drop policy if exists "settings public read" on public.settings;
create policy "settings public read" on public.settings for select using (true);
drop policy if exists "settings admin write" on public.settings;
create policy "settings admin write" on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "items public read" on public.items;
create policy "items public read" on public.items for select using (visible or public.is_admin());
drop policy if exists "items admin write" on public.items;
create policy "items admin write" on public.items for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "media public read" on public.media;
create policy "media public read" on public.media for select using (
  exists (select 1 from public.items i where i.id = item_id and (i.visible or public.is_admin())));
drop policy if exists "media admin write" on public.media;
create policy "media admin write" on public.media for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "messages anyone send" on public.messages;
create policy "messages anyone send" on public.messages for insert to anon, authenticated with check (true);
drop policy if exists "messages admin read" on public.messages;
create policy "messages admin read" on public.messages for select to authenticated using (public.is_admin());
drop policy if exists "messages admin update" on public.messages;
create policy "messages admin update" on public.messages for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "messages admin delete" on public.messages;
create policy "messages admin delete" on public.messages for delete to authenticated using (public.is_admin());

-- ---------- تخزين الصور والملفات ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime','application/pdf'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- قراءة الملفات مطلوبة لعمليتي الحذف والاستبدال
drop policy if exists "media files admin select" on storage.objects;
create policy "media files admin select" on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.is_admin());
drop policy if exists "media files admin insert" on storage.objects;
create policy "media files admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());
drop policy if exists "media files admin update" on storage.objects;
create policy "media files admin update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_admin());
drop policy if exists "media files admin delete" on storage.objects;
create policy "media files admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());

-- ---------- الإعدادات الافتراضية ----------
insert into public.settings (key, value) values
  ('platform_name', 'منصة إبداع الوزية'),
  ('school_name', 'متوسطة الوزية'),
  ('activity_lead', 'نورة المصلح'),
  ('principal', 'خزماء القحطاني'),
  ('tagline', 'نكتشف المواهب، نصنع الإنجازات، ونوثق الإبداع'),
  ('footer_quote', 'كل إنجاز يبدأ بفكرة، وكل إبداع يستحق أن يُوثّق'),
  ('students_mode', 'auto'),
  ('students_count', '0'),
  ('contact_email', ''),
  ('contact_phone', ''),
  ('announcement_bar', '')
on conflict (key) do nothing;

-- ---------- حساب المسؤولة ----------
-- غيّري البريد أدناه إلى بريد حساب المسؤولة الذي أنشأتِه في Authentication ← Users
insert into public.admins (email) values ('ADMIN_EMAIL_HERE') on conflict do nothing;
