-- =====================================================================
--  منصة إبداع الوزية — المعلمات والصلاحيات
--  يُشغَّل بعد schema.sql (وهو مضمَّن في آخره أيضاً). آمن لإعادة التشغيل.
--  الأدوار: owner = مسؤولة بكل الصلاحيات، teacher = معلمة بصلاحيات تحددها المسؤولة
--  صلاحيات المعلمة (perms): add, edit, delete, messages
-- =====================================================================

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
