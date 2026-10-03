-- Remove the retired XP economy from the live progress table.
begin;

alter table public.user_progress
  drop constraint if exists hosoon_progress_numeric_bounds;

alter table public.user_progress
  drop column if exists total_xp;

alter table public.user_progress
  drop constraint if exists hosoon_progress_snapshot_contract;

alter table public.user_progress
  add constraint hosoon_progress_numeric_bounds
  check (current_day between 1 and 480 and streak >= 0 and best_streak >= 0 and revision >= 0 and epoch >= 0)
  not valid;

alter table public.user_progress
  add constraint hosoon_progress_snapshot_contract
  check (
    snapshot is null or (schema_version = 5 and jsonb_typeof(snapshot) = 'object'
    and snapshot->>'ownerId' = user_id::text and (snapshot->>'epoch')::bigint = epoch
    and pg_column_size(snapshot) <= 8388608)
  )
  not valid;

create or replace function public.validate_hosoon_snapshot(p_snapshot jsonb, p_owner uuid)
returns void language plpgsql set search_path = public, pg_temp as $$
declare k text; v jsonb;
begin
  if p_owner is null or p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object'
    or pg_column_size(p_snapshot) > 8388608 then raise exception 'HOSOON_INVALID_SNAPSHOT'; end if;
  if p_snapshot->>'schemaVersion' is distinct from '5'
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
      'notes','thumunRatings','editedThumuns','settings','maintain','khatmaCompletedAt',
      'celebrationSeenAt','showOnboarding','completedTasks','dailyLog','sessionLog',
      'streak','bestStreak','lastActiveDate']) then raise exception 'HOSOON_UNKNOWN_FIELD'; end if;
  end loop;
  foreach k in array array['memorization','dailyPlans','completions','sessions','reviewAttempts',
      'versions','legacyDailyLog','notes','thumunRatings','editedThumuns','settings','maintain',
      'completedTasks','dailyLog','sessionLog'] loop
    if jsonb_typeof(p_snapshot->k) is distinct from 'object' then raise exception 'HOSOON_INVALID_MAP'; end if;
  end loop;
  foreach k in array array['streak','bestStreak'] loop
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
    if p_expected_revision <> 0 or p_expected_epoch <> 0 or (p_snapshot->>'epoch')::bigint <> 0 then raise exception 'HOSOON_CONFLICT'; end if;
    insert into public.user_progress(user_id, snapshot, schema_version, revision, epoch)
      values (uid, p_snapshot, 5, 1, 0) returning * into r;
  else
    if r.revision <> p_expected_revision or r.epoch <> p_expected_epoch or (p_snapshot->>'epoch')::bigint <> r.epoch then raise exception 'HOSOON_CONFLICT'; end if;
    update public.user_progress set snapshot = p_snapshot, schema_version = 5, revision = r.revision + 1
      where user_id = uid returning * into r;
  end if;
  return to_jsonb(r);
end $$;
revoke all on function public.save_hosoon_progress(bigint, bigint, jsonb) from public, anon;
grant execute on function public.save_hosoon_progress(bigint, bigint, jsonb) to authenticated;

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
    if r.revision <> p_expected_revision then raise exception 'HOSOON_CONFLICT'; end if;
    insert into public.progress_recoveries(user_id, revision, epoch, snapshot, legacy_row)
      values(uid, r.revision, r.epoch, r.snapshot, case when r.snapshot is null then to_jsonb(r) else null end);
    delete from public.progress_recoveries where user_id = uid and revision not in
      (select revision from public.progress_recoveries where user_id = uid order by revision desc limit 3);
    next_epoch := r.epoch + 1; next_revision := r.revision + 1;
  else
    if p_expected_revision <> 0 then raise exception 'HOSOON_CONFLICT'; end if;
    next_epoch := 1; next_revision := 1;
  end if;
  p_snapshot := jsonb_set(p_snapshot, '{epoch}', to_jsonb(next_epoch));
  insert into public.user_progress(user_id, snapshot, schema_version, revision, epoch)
    values (uid, p_snapshot, 5, next_revision, next_epoch)
    on conflict (user_id) do update set snapshot = excluded.snapshot, schema_version = 5,
      revision = excluded.revision, epoch = excluded.epoch returning * into r;
  return to_jsonb(r);
end $$;
revoke all on function public.reset_hosoon_progress(bigint, jsonb) from public, anon;
grant execute on function public.reset_hosoon_progress(bigint, jsonb) to authenticated;

commit;
