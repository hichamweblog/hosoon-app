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
