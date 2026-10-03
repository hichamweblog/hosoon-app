-- حُصون — Supabase schema (PostgreSQL)
-- ينشئ جدول تقدم الحفظ (مستخدم واحد لكل صف) وجدول تصحيحات الأثمان + سياسات RLS.

-- ============ 1) جدول التقدم ============
create table if not exists public.user_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_day integer not null default 1,
  streak integer not null default 0,
  best_streak integer not null default 0,
  total_xp integer not null default 0,
  completed_tasks jsonb not null default '{}',
  daily_log jsonb not null default '{}',
  session_log jsonb not null default '{}',
  notes jsonb not null default '{}',
  thumun_ratings jsonb not null default '{}',
  edited_thumuns jsonb not null default '{}',
  khatma_completed_at timestamptz,
  maintain jsonb not null default '{"active":false,"day":0}',
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_progress enable row level security;

drop policy if exists "users can manage own progress" on public.user_progress;
create policy "users can manage own progress"
  on public.user_progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- حذف الصف عند حذف الحساب يتم تلقائياً عبر ON DELETE CASCADE.

-- ============ 2) جدول تصحيحات الأثمان (تصحيحات المستخدمين للمواضع) ============
create table if not exists public.thumun_corrections (
  id uuid primary key default gen_random_uuid(),
  thumun_id integer not null check (thumun_id between 1 and 480),
  fields jsonb not null default '{}',
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.thumun_corrections enable row level security;

-- أي مستخدم مسجّل يمكنه الإرسال، ولا أحد يقرأ تعديلات غيره (يبقى الإرسال مجهولاً للمشرف).
drop policy if exists "signed-in users can submit corrections" on public.thumun_corrections;
create policy "signed-in users can submit corrections"
  on public.thumun_corrections
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users can read own corrections" on public.thumun_corrections;
create policy "users can read own corrections"
  on public.thumun_corrections
  for select
  to authenticated
  using (auth.uid() = user_id);

-- ============ 3) trigger: تحديث updated_at تلقائياً ============
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_progress_touch_updated_at on public.user_progress;
create trigger user_progress_touch_updated_at
  before update on public.user_progress
  for each row execute function public.touch_updated_at();

-- ============ ملاحظات ============
-- * المزامنة تصعدية (upload) ونزولية (download) تُدار من العميل عبر upsert بـ
--   استراتيجية الدمج الموضحة في src/lib/supabase.ts (mergeProgress).
-- * المصادقة: email+password ورابط سحري وبريد استعادة كلمة المرور (تُفعّل من
--   لوحة Supabase: Authentication → Providers → Email).

-- Fresh installs. Existing projects apply migrations; no reset of live data.
-- Apply after the historical schema. No rows are deleted or silently rewritten.
-- This migration intentionally disables old clients' unprotected table upserts.
begin;
alter table public.user_progress
  add column if not exists snapshot jsonb,
  add column if not exists schema_version integer not null default 0,
  add column if not exists revision bigint not null default 0,
  add column if not exists epoch bigint not null default 0;

-- NOT VALID preserves legacy rows for review, while enforcing all new writes.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'hosoon_progress_numeric_bounds' and conrelid = 'public.user_progress'::regclass) then
    alter table public.user_progress add constraint hosoon_progress_numeric_bounds
      check (current_day between 1 and 480 and streak >= 0 and best_streak >= 0 and total_xp >= 0 and revision >= 0 and epoch >= 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'hosoon_progress_snapshot_contract' and conrelid = 'public.user_progress'::regclass) then
    alter table public.user_progress add constraint hosoon_progress_snapshot_contract check (
      snapshot is null or (schema_version = 4 and jsonb_typeof(snapshot) = 'object'
      and snapshot->>'ownerId' = user_id::text and (snapshot->>'epoch')::bigint = epoch
      and pg_column_size(snapshot) <= 8388608)) not valid;
  end if;
end $$;

alter table public.user_progress enable row level security;
drop policy if exists "users can manage own progress" on public.user_progress;
drop policy if exists "users can read own progress" on public.user_progress;
create policy "users can read own progress" on public.user_progress for select to authenticated using (auth.uid() = user_id);
revoke insert, update, delete on public.user_progress from public, anon, authenticated;
grant select on public.user_progress to authenticated;

create or replace function public.validate_hosoon_snapshot(p_snapshot jsonb, p_owner uuid)
returns void language plpgsql set search_path = public, pg_temp as $$
declare k text; v jsonb;
begin
  if p_owner is null or p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object'
    or pg_column_size(p_snapshot) > 8388608 then raise exception 'HOSOON_INVALID_SNAPSHOT'; end if;
  if p_snapshot->>'schemaVersion' is distinct from '4'
    or p_snapshot->>'ownerId' is distinct from p_owner::text
    or jsonb_typeof(p_snapshot->'currentDay') is distinct from 'number'
    or jsonb_typeof(p_snapshot->'epoch') is distinct from 'number'
    or not coalesce((p_snapshot->>'currentDay') ~ '^[1-9][0-9]*$', false)
    or (p_snapshot->>'currentDay')::numeric not between 1 and 480
    or not coalesce((p_snapshot->>'epoch') ~ '^[0-9]+$', false) then
    raise exception 'HOSOON_INVALID_SNAPSHOT';
  end if;
  for k in select jsonb_object_keys(p_snapshot) loop
    if k <> all(array['schemaVersion','ownerId','epoch','currentDay','startDate','calendarStartDate',
      'memorization','dailyPlans','completions','sessions','reviewAttempts','versions','legacyDailyLog',
      'legacyXp','notes','thumunRatings','editedThumuns','settings','maintain','khatmaCompletedAt',
      'celebrationSeenAt','showOnboarding','completedTasks','dailyLog','sessionLog','totalXp',
      'streak','bestStreak','lastActiveDate']) then raise exception 'HOSOON_UNKNOWN_FIELD'; end if;
  end loop;
  foreach k in array array['memorization','dailyPlans','completions','sessions','reviewAttempts',
      'versions','legacyDailyLog','notes','thumunRatings','editedThumuns','settings','maintain',
      'completedTasks','dailyLog','sessionLog'] loop
    if jsonb_typeof(p_snapshot->k) is distinct from 'object' then raise exception 'HOSOON_INVALID_MAP'; end if;
  end loop;
  foreach k in array array['legacyXp','totalXp','streak','bestStreak'] loop
    if jsonb_typeof(p_snapshot->k) is distinct from 'number' or not coalesce((p_snapshot->>k) ~ '^[0-9]+$', false) or (p_snapshot->>k)::numeric > 9007199254740991 then
      raise exception 'HOSOON_INVALID_NUMBER';
    end if;
  end loop;
  if jsonb_typeof(p_snapshot->'showOnboarding') is distinct from 'boolean'
    or (p_snapshot->>'calendarStartDate') is null
    or not (p_snapshot->>'calendarStartDate') ~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'HOSOON_INVALID_META'; end if;
  for k, v in select key, value from jsonb_each(p_snapshot->'memorization') loop
    if not k ~ '^[1-9][0-9]*$' or k::numeric > 480 or jsonb_typeof(v->'memorized') is distinct from 'boolean'
      or v->>'source' not in ('prior','learned','legacy') then raise exception 'HOSOON_INVALID_MEMORIZATION'; end if;
  end loop;
  for k, v in select key, value from jsonb_each(p_snapshot->'notes') loop
    if not k ~ '^[1-9][0-9]*$' or k::numeric > 480 or jsonb_typeof(v) <> 'string'
      or length(v #>> '{}') > 10000 then raise exception 'HOSOON_INVALID_NOTE'; end if;
  end loop;
end $$;
revoke all on function public.validate_hosoon_snapshot(jsonb, uuid) from public, anon, authenticated;

create or replace function public.save_hosoon_progress(p_expected_revision bigint, p_expected_epoch bigint, p_snapshot jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); r public.user_progress%rowtype;
begin
  if uid is null then raise exception 'HOSOON_UNAUTHENTICATED' using errcode = '42501'; end if;
  if p_expected_revision is null or p_expected_revision < 0 then raise exception 'HOSOON_INVALID_REVISION'; end if;
  if p_expected_epoch is null or p_expected_epoch < 0 then raise exception 'HOSOON_INVALID_EPOCH'; end if;
  perform public.validate_hosoon_snapshot(p_snapshot, uid);
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  select * into r from public.user_progress where user_id = uid for update;
  if not found then
    if p_expected_revision <> 0 or p_expected_epoch <> 0 or (p_snapshot->>'epoch')::bigint <> 0 then
      raise exception 'HOSOON_CONFLICT' using errcode = '40001';
    end if;
    insert into public.user_progress(user_id, snapshot, schema_version, revision, epoch)
      values (uid, p_snapshot, 4, 1, 0) returning * into r;
  else
    if p_expected_epoch is null or p_expected_epoch < 0 or r.revision <> p_expected_revision or r.epoch <> p_expected_epoch or (p_snapshot->>'epoch')::bigint <> r.epoch then
      raise exception 'HOSOON_CONFLICT' using errcode = '40001';
    end if;
    update public.user_progress set snapshot = p_snapshot, schema_version = 4, revision = r.revision + 1
      where user_id = uid returning * into r;
  end if;
  return to_jsonb(r);
end $$;
revoke all on function public.save_hosoon_progress(bigint, bigint, jsonb) from public, anon;
grant execute on function public.save_hosoon_progress(bigint, bigint, jsonb) to authenticated;

create table if not exists public.progress_recoveries (
  user_id uuid not null references auth.users(id) on delete cascade,
  revision bigint not null,
  epoch bigint not null,
  snapshot jsonb,
  legacy_row jsonb,
  created_at timestamptz not null default now(),
  primary key(user_id, revision)
);
alter table public.progress_recoveries enable row level security;
drop policy if exists "read own recovery" on public.progress_recoveries;
create policy "read own recovery" on public.progress_recoveries for select to authenticated using (auth.uid() = user_id);
revoke insert, update, delete on public.progress_recoveries from public, anon, authenticated;
grant select on public.progress_recoveries to authenticated;

create or replace function public.reset_hosoon_progress(p_expected_revision bigint, p_snapshot jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); r public.user_progress%rowtype; next_epoch bigint; next_revision bigint;
begin
  if uid is null then raise exception 'HOSOON_UNAUTHENTICATED' using errcode = '42501'; end if;
  if p_expected_revision is null or p_expected_revision < 0 then raise exception 'HOSOON_INVALID_REVISION'; end if;
  perform public.validate_hosoon_snapshot(p_snapshot, uid);
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  select * into r from public.user_progress where user_id = uid for update;
  if found then
    if r.revision <> p_expected_revision then raise exception 'HOSOON_CONFLICT' using errcode = '40001'; end if;
    insert into public.progress_recoveries(user_id, revision, epoch, snapshot, legacy_row)
      values(uid, r.revision, r.epoch, r.snapshot, case when r.snapshot is null then to_jsonb(r) else null end);
    delete from public.progress_recoveries where user_id = uid and revision not in
      (select revision from public.progress_recoveries where user_id = uid order by revision desc limit 3);
    next_epoch := r.epoch + 1; next_revision := r.revision + 1;
  else
    if p_expected_revision <> 0 then raise exception 'HOSOON_CONFLICT' using errcode = '40001'; end if;
    next_epoch := 1; next_revision := 1;
  end if;
  -- Keep a reset row forever. A stale device cannot resurrect a deleted row at epoch 0.
  p_snapshot := jsonb_set(p_snapshot, '{epoch}', to_jsonb(next_epoch));
  insert into public.user_progress(user_id, snapshot, schema_version, revision, epoch)
    values (uid, p_snapshot, 4, next_revision, next_epoch)
    on conflict (user_id) do update set snapshot = excluded.snapshot, schema_version = 4,
      revision = excluded.revision, epoch = excluded.epoch returning * into r;
  return to_jsonb(r);
end $$;
revoke all on function public.reset_hosoon_progress(bigint, jsonb) from public, anon;
grant execute on function public.reset_hosoon_progress(bigint, jsonb) to authenticated;

alter table public.thumun_corrections
  add column if not exists note text not null default '',
  add column if not exists source text not null default '',
  add column if not exists status text not null default 'pending';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'hosoon_correction_bounds' and conrelid = 'public.thumun_corrections'::regclass) then
    alter table public.thumun_corrections add constraint hosoon_correction_bounds
      check (thumun_id between 1 and 480 and jsonb_typeof(fields) = 'object'
        and pg_column_size(fields) <= 16384 and length(note) <= 2000 and length(source) <= 1000
        and status in ('pending','approved','rejected')) not valid;
  end if;
end $$;
-- Account deletion also removes the user's private explanation/source, not just the UUID.
alter table public.thumun_corrections drop constraint if exists thumun_corrections_user_id_fkey;
alter table public.thumun_corrections add constraint thumun_corrections_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.thumun_corrections enable row level security;
drop policy if exists "signed-in users can submit corrections" on public.thumun_corrections;
create policy "signed-in users can submit corrections" on public.thumun_corrections for insert to authenticated
  with check (auth.uid() = user_id and status = 'pending' and length(note) >= 10 and length(source) >= 1);
revoke update, delete on public.thumun_corrections from public, anon, authenticated;
grant insert, select on public.thumun_corrections to authenticated;

-- Verse counts come from the unchanged Maghrebi surah dataset (6214 ayahs), not Kufi defaults.
create or replace function public.validate_hosoon_correction()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare k text; v jsonb; ss int; sa int; es int; ea int;
  verse_counts int[] := array[7,285,200,175,122,167,206,76,130,109,121,111,44,54,99,128,110,105,99,134,111,76,119,62,77,226,95,88,69,59,33,30,73,54,46,82,182,86,72,84,53,50,89,56,36,34,39,29,18,45,60,47,61,55,77,99,28,21,24,13,14,11,11,18,12,12,31,52,52,44,30,28,18,55,39,31,50,40,45,42,29,19,36,25,22,17,19,26,32,20,15,21,11,8,8,20,5,8,9,11,10,8,3,9,5,5,6,3,6,3,5,4,5,6];
begin
  if jsonb_typeof(new.fields) is distinct from 'object' then raise exception 'HOSOON_INVALID_CORRECTION'; end if;
  for k, v in select key,value from jsonb_each(new.fields) loop
    if k not in ('startSura','startAya','endSura','endAya','text') then raise exception 'HOSOON_INVALID_CORRECTION'; end if;
    if k = 'text' then
      if jsonb_typeof(v) <> 'string' or length(v #>> '{}') > 3000 then raise exception 'HOSOON_INVALID_CORRECTION'; end if;
    elsif jsonb_typeof(v) <> 'number' or not (v #>> '{}') ~ '^[1-9][0-9]*$' then raise exception 'HOSOON_INVALID_CORRECTION';
    end if;
  end loop;
  if new.fields ?| array['startSura','startAya','endSura','endAya'] then
    if not (new.fields ?& array['startSura','startAya','endSura','endAya']) then raise exception 'HOSOON_INCOMPLETE_BOUNDARY'; end if;
    ss := (new.fields->>'startSura')::int; sa := (new.fields->>'startAya')::int;
    es := (new.fields->>'endSura')::int; ea := (new.fields->>'endAya')::int;
    if ss not between 1 and 114 or es not between 1 and 114 or sa not between 1 and verse_counts[ss]
      or ea not between 1 and verse_counts[es] or ss > es or (ss = es and sa > ea) then
      raise exception 'HOSOON_INVALID_BOUNDARY';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.validate_hosoon_correction() from public, anon, authenticated;
drop trigger if exists validate_hosoon_correction on public.thumun_corrections;
create trigger validate_hosoon_correction before insert or update of fields, thumun_id on public.thumun_corrections
  for each row execute function public.validate_hosoon_correction();

commit;
