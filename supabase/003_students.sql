-- =====================================================================
--  منصة إبداع الوزية — بوابة الطالبات
--  حسابات الطالبات (باسم مستخدم بلا بريد)، التسجيل في المسابقات والفعاليات، ورفع الأعمال
--  كل طلب يصل للمسؤولة أو لمن لها صلاحية "students". آمن لإعادة التشغيل.
-- =====================================================================

create table if not exists public.students (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_.]{3,30}$'),
  full_name text not null check (char_length(full_name) between 3 and 80),
  grade text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.registrations (
  id bigint generated always as identity primary key,
  student_id uuid not null default auth.uid() references public.students(id) on delete cascade,
  item_id bigint not null references public.items(id) on delete cascade,
  note text not null default '' check (char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  unique (student_id, item_id)
);

create table if not exists public.submissions (
  id bigint generated always as identity primary key,
  student_id uuid not null default auth.uid() references public.students(id) on delete cascade,
  kind text not null default 'work' check (kind in ('work','achievement')),
  title text not null check (char_length(title) between 2 and 200),
  description text not null default '' check (char_length(description) <= 3000),
  category text not null default '' check (char_length(category) <= 80),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text not null default '',
  item_id bigint references public.items(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.submission_files (
  id bigint generated always as identity primary key,
  submission_id bigint not null references public.submissions(id) on delete cascade,
  url text not null,
  path text not null,
  mime text not null default '',
  kind text not null check (kind in ('image','video','pdf')),
  size bigint not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- دوال ----------
create or replace function public.is_student()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.students where id = auth.uid() and status = 'approved');
$$;
create or replace function public.my_student()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('id', id, 'username', username, 'full_name', full_name, 'grade', grade, 'status', status)
  from public.students where id = auth.uid();
$$;
grant execute on function public.is_student(), public.my_student() to anon, authenticated;

-- الطالبة لا تغيّر حالة طلبها بنفسها
create or replace function public.force_pending()
returns trigger language plpgsql as $$
begin
  if not public.can_do('students') then
    new.status := 'pending';
    if tg_table_name = 'submissions' then new.item_id := null; new.admin_note := ''; end if;
  end if;
  return new;
end; $$;
drop trigger if exists registrations_pending on public.registrations;
create trigger registrations_pending before insert on public.registrations for each row execute function public.force_pending();
drop trigger if exists submissions_pending on public.submissions;
create trigger submissions_pending before insert on public.submissions for each row execute function public.force_pending();

-- ---------- الصلاحيات ----------
alter table public.students enable row level security;
alter table public.registrations enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_files enable row level security;

grant select, update, delete on public.students to authenticated;
grant select, insert, update, delete on public.registrations, public.submissions, public.submission_files to authenticated;

drop policy if exists "students self read" on public.students;
create policy "students self read" on public.students for select to authenticated using (id = auth.uid() or public.can_do('students'));
drop policy if exists "students staff update" on public.students;
create policy "students staff update" on public.students for update to authenticated using (public.can_do('students')) with check (public.can_do('students'));
drop policy if exists "students staff delete" on public.students;
create policy "students staff delete" on public.students for delete to authenticated using (public.can_do('students'));

drop policy if exists "reg student insert" on public.registrations;
create policy "reg student insert" on public.registrations for insert to authenticated with check (
  student_id = auth.uid() and public.is_student()
  and exists (select 1 from public.items i where i.id = item_id and i.visible and i.type in ('competition','event')));
drop policy if exists "reg read" on public.registrations;
create policy "reg read" on public.registrations for select to authenticated using (student_id = auth.uid() or public.can_do('students'));
drop policy if exists "reg student cancel" on public.registrations;
create policy "reg student cancel" on public.registrations for delete to authenticated using ((student_id = auth.uid() and status = 'pending') or public.can_do('students'));
drop policy if exists "reg staff update" on public.registrations;
create policy "reg staff update" on public.registrations for update to authenticated using (public.can_do('students')) with check (public.can_do('students'));

drop policy if exists "sub student insert" on public.submissions;
create policy "sub student insert" on public.submissions for insert to authenticated with check (student_id = auth.uid() and public.is_student());
drop policy if exists "sub read" on public.submissions;
create policy "sub read" on public.submissions for select to authenticated using (student_id = auth.uid() or public.can_do('students'));
drop policy if exists "sub delete" on public.submissions;
create policy "sub delete" on public.submissions for delete to authenticated using ((student_id = auth.uid() and status = 'pending') or public.can_do('students'));
drop policy if exists "sub staff update" on public.submissions;
create policy "sub staff update" on public.submissions for update to authenticated using (public.can_do('students')) with check (public.can_do('students'));

drop policy if exists "subfile insert" on public.submission_files;
create policy "subfile insert" on public.submission_files for insert to authenticated with check (
  exists (select 1 from public.submissions s where s.id = submission_id and s.student_id = auth.uid() and s.status = 'pending')
  and path like 'submissions/' || auth.uid()::text || '/%');
drop policy if exists "subfile read" on public.submission_files;
create policy "subfile read" on public.submission_files for select to authenticated using (
  exists (select 1 from public.submissions s where s.id = submission_id and (s.student_id = auth.uid() or public.can_do('students'))));
drop policy if exists "subfile delete" on public.submission_files;
create policy "subfile delete" on public.submission_files for delete to authenticated using (
  exists (select 1 from public.submissions s where s.id = submission_id and ((s.student_id = auth.uid() and s.status = 'pending') or public.can_do('students'))));

-- رفع ملفات الطالبات في مجلدها الخاص فقط
drop policy if exists "student files insert" on storage.objects;
create policy "student files insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_student() and name like 'submissions/' || auth.uid()::text || '/%');
drop policy if exists "student files select" on storage.objects;
create policy "student files select" on storage.objects for select to authenticated
  using (bucket_id = 'media' and name like 'submissions/' || auth.uid()::text || '/%');
drop policy if exists "student files delete" on storage.objects;
create policy "student files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (name like 'submissions/' || auth.uid()::text || '/%' or public.can_do('students')));
