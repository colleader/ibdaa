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

-- ===== المعلمات والصلاحيات (انظري 002_team.sql) =====

alter table public.admins add column if not exists role text not null default 'owner';
alter table public.admins add column if not exists perms jsonb not null default '{}'::jsonb;
alter table public.admins add column if not exists name text not null default '';
alter table public.admins add column if not exists created_at timestamptz not null default now();
do $$ begin
  alter table public.admins add constraint admins_role_chk check (role in ('owner','teacher'));
exception when duplicate_object then null; end $$;
update public.admins set email = lower(trim(email)) where email <> lower(trim(email));

-- ---------- دوال الصلاحيات ----------
create or replace function public.my_email()
returns text language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where lower(email) = public.my_email());
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where lower(email) = public.my_email() and role = 'owner');
$$;

create or replace function public.can_do(p text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where lower(email) = public.my_email()
    and (role = 'owner' or coalesce((perms ->> p)::boolean, false)));
$$;

create or replace function public.my_access()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('email', email, 'role', role, 'perms', perms, 'name', name)
  from public.admins where lower(email) = public.my_email();
$$;

-- هل البريد مضاف من المسؤولة؟ (لصفحة إنشاء حساب المعلمة)
create or replace function public.is_invited(e text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where lower(email) = lower(trim(coalesce(e, ''))));
$$;

grant execute on function public.my_email(), public.is_admin(), public.is_owner(), public.can_do(text), public.my_access() to anon, authenticated;
grant execute on function public.is_invited(text) to anon, authenticated;

-- منع حذف آخر مسؤولة أو تحويلها لمعلمة (حتى لا يُغلق الباب على الجميع)
create or replace function public.protect_last_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner') then
    if (select count(*) from public.admins where role = 'owner' and email <> old.email) = 0 then
      raise exception 'last owner: يجب أن تبقى مسؤولة واحدة على الأقل';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  new.email := lower(trim(new.email));
  return new;
end; $$;
drop trigger if exists admins_protect on public.admins;
create trigger admins_protect before update or delete on public.admins for each row execute function public.protect_last_owner();

create or replace function public.lower_admin_email()
returns trigger language plpgsql as $$ begin new.email := lower(trim(new.email)); return new; end; $$;
drop trigger if exists admins_lower on public.admins;
create trigger admins_lower before insert on public.admins for each row execute function public.lower_admin_email();

-- ---------- السياسات ----------
grant select, insert, update, delete on public.admins to authenticated;
drop policy if exists "admins read own" on public.admins;
drop policy if exists "admins read" on public.admins;
create policy "admins read" on public.admins for select to authenticated using (public.is_owner() or lower(email) = public.my_email());
drop policy if exists "admins owner write" on public.admins;
create policy "admins owner write" on public.admins for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists "settings admin write" on public.settings;
create policy "settings admin write" on public.settings for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists "items admin write" on public.items;
drop policy if exists "items add" on public.items;
drop policy if exists "items edit" on public.items;
drop policy if exists "items delete" on public.items;
create policy "items add" on public.items for insert to authenticated with check (public.can_do('add'));
create policy "items edit" on public.items for update to authenticated using (public.can_do('edit')) with check (public.can_do('edit'));
create policy "items delete" on public.items for delete to authenticated using (public.can_do('delete'));

drop policy if exists "media admin write" on public.media;
drop policy if exists "media add" on public.media;
drop policy if exists "media edit" on public.media;
drop policy if exists "media delete" on public.media;
create policy "media add" on public.media for insert to authenticated with check (public.can_do('add') or public.can_do('edit'));
create policy "media edit" on public.media for update to authenticated using (public.can_do('edit')) with check (public.can_do('edit'));
create policy "media delete" on public.media for delete to authenticated using (public.can_do('edit') or public.can_do('delete'));

drop policy if exists "messages admin read" on public.messages;
create policy "messages admin read" on public.messages for select to authenticated using (public.can_do('messages'));
drop policy if exists "messages admin update" on public.messages;
create policy "messages admin update" on public.messages for update to authenticated using (public.can_do('messages')) with check (public.can_do('messages'));
drop policy if exists "messages admin delete" on public.messages;
create policy "messages admin delete" on public.messages for delete to authenticated using (public.can_do('messages'));

drop policy if exists "media files admin select" on storage.objects;
create policy "media files admin select" on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.is_admin());
drop policy if exists "media files admin insert" on storage.objects;
create policy "media files admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (public.can_do('add') or public.can_do('edit')));
drop policy if exists "media files admin update" on storage.objects;
create policy "media files admin update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.can_do('edit'));
drop policy if exists "media files admin delete" on storage.objects;
create policy "media files admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (public.can_do('edit') or public.can_do('delete')));
