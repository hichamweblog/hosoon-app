# حصون (Hosoon) — Full Product & Code Review

**Scope:** whole repository (Next.js 16 + React 19 PWA, Zustand, Supabase, Tailwind v4) — UI/UX, Logic, Features, Data, Performance, Accessibility, Code Health.
**Method:** full source read (~4,800 LOC), dataset audit (480-record `quran-thumuns.json`), `tsc --noEmit`, `eslint src`.
**Results observed:** TypeScript compiles clean. ESLint: **51 problems (34 errors, 17 warnings)**, all catalogued below.

---

## 0. Executive summary

This is a genuinely well-ambitioned app: an Arabic-first, RTL, offline-capable PWA implementing the "الحصون الخمسة" (Five Fortresses) hifz method with gamification, cloud backup, and a polished dark/light shell. The core journey model (one ثُمُن per day → ~480 days) is sound and the domain split (`fortress-calculator`, store, tabs) is easy to follow.

But there are **critical content-integrity problems in the Quran dataset** (a hole in Al-Baqarah, 39 broken ayah ranges, cross-surah ranges the schema cannot represent), the **core method is incomplete (fortress #1 "الختمة" doesn't exist in code)**, and there is a layer of **logic bugs around completion/streak/XP** that will corrupt user progress over time. Feature-wise, the two most valuable feedback loops in a hifz app — *spaced repetition driven by self-ratings* and *daily reminders* — are stubbed or absent.

Priorities in one line: **fix the data → finish the method → fix the state logic → then grow features.**

---

## 1. What is already working well (keep it)

- **RTL/Arabic-first done properly** — `dir="rtl"` at the root, Arabic typography (IBM Plex Sans Arabic + Amiri for Quran text), Arabic toasts, Arabic copy with an appropriate spiritual tone (greetings like "قياماً مقبولاً").
- **PWA fundamentals** — Serwist precaching, manifest, offline-first local state. A hifz app must work in the masjid without signal; this is the right call.
- **Clean domain kernel** — `src/lib/fortress-calculator.ts` + `constants.ts` encode the method as pure functions; easy to test (even though no tests exist yet).
- **Warm light-theme identity** — emerald `#3c8268` + gold `#b8893c` on parchment `#faf7f1` feels like a product for Qur'an, not generic SaaS.
- **Micro-delights** — haptic taps, `playDing`, floating `+50 XP`, confetti on day completion, motivational hadith rotation. Good emotional texture.
- **Onboarding** explains the method (الحصون الخمسة) before asking anything. Right structure.
- **RLS-enabled Supabase schema** — per-user row policies are correct and minimal.
- **Export/Import** exists as a safety net (even if unvalidated — see §4).

---

## 2. P0 — Critical: Qur'an content integrity

> Nothing else matters if the memorization plan itself is wrong. These issues were found by auditing `src/lib/quran-thumuns.json` (480 records) against known surah/ayah counts.

### 2.1 A real hole in Al-Baqarah: ayahs 2:41–43 are never scheduled
Thumun **4** is `2:32–40` and thumun **5** is `2:44–51`. **Ayahs 41, 42, 43 («يَا بَنِي إِسْرَائِيلَ اذْكُرُوا نِعْمَتِيَ…») fall in no thumun at all.** A user following the plan to completion will not memorize them. Either thumun 5's `startAyah` is mislabeled (should be 41) or the ranges are genuinely split — either way, verify against a mushaf and fix.

### 2.2 39 thumuns have `endAyah < startAyah` — the data model can't represent cross-surah thumuns
IDs include: 39, 165, 176, 188, 198, 233, 243, 327, 330, 342, 347, 351, 356, 362, 366, 380, 385, 391, 396, 398, 404, 407, 413, 415, 418, 422, 430, 435, 438, 439, … and 476 (`سُورَةُ الشَّمۡسِ 15-11`), 478 (`العَلَق 17-8`), 479 (`العَادِيَات 9-2`), 480 (`قُرَيۡش 3-6`).

Root cause: the `Thumun` shape is `{ surah, startAyah, endAyah }` — a **single-surah range**. A ثمن that spans a surah boundary (common in جزء 30, e.g. `قُرَيۡش 3 → end of An-Nās`) is stored as "start in surah A, end number from a *different* surah". Consequences:

- `DayPreviewModal` renders **"الآيات 15 - 11"** — visibly broken output.
- `ThumunEditorModal` lets users "correct" numbers that are structurally meaningless.
- Related proof: thumun 474 is `الغَاشِيَة 20-30` but Al-Ghāshiyah has **26** ayahs; 477 is `الشَّرْح 1-16` but Ash-Sharh has **8**; 480 is `قُرَيۡش 3-6` but Quraysh has **4**. The end numbers belong to later surahs.

**Fix (recommended schema):** `{ start: {surahNumber, ayah}, end: {surahNumber, ayah} }` (and derive `surah` labels for display as "من سورة X آية Y إلى سورة Z آية W"). Migrate the dataset once, carefully, against a canonical mushaf source (e.g. Tanzil metadata). This is the single most important work item in this review.

### 2.3 Al-Fātiḥah is missing from the journey
Thumun 1 is `البقرة 1-15` (`المَٓ * ذَٰلِكَ اِ۬لْكِتَٰبُ…` — starts at 2:1). Surah 1 appears nowhere in 480 records. If excluding الفاتحة was intentional (many hifz programs assume it's known), **document it** in onboarding and consider including المُعَوِّذَات/الإخلاص in the daily وِرد anyway — students expect them. If unintentional, the division needs a re-base.

### 2.4 Dataset hygiene
- **476/480 `startText` values already end with `...`**, but some views append *another* `...` (`SessionView`, `DayPreviewModal` render `"{startText}..."`) → renders `…....`. Pick one convention (preferably: clean text in data, ellipsis purely in presentation) and strip the baked-in dots.
- Thumun 1 uniquely uses `*` as an ayah separator while everything else uses `…` — normalize.
- `startText` contains Uthmani pause/misc marks (`اِ۬` etc.) — fine for display, but confirm they're from a clean licensed source (Tanzil) and note the license in the README.

---

## 3. P0 — Critical: the method is incomplete (الحصون الخمسة = 5, the app tracks 4)

`TaskType` in `useHifzStore` is `"prep_weekly" | "new_hifz" | "review_near" | "review_far"` — **4 fortresses**. But:

- Onboarding explicitly promises: «الختمة (تلاوة واستماع)، التحضير…» — **الحصن الأول: الختمة is missing from every screen**.
- The code *knows* it should exist: `FORTRESS_COLORS.khatma` and the constants `RECITATION_JUZS_PER_DAY = 1` (one juz recitation/day) and `LISTENING_HIZBS_PER_DAY = 1` (one hizb listening/day) are defined in `constants.ts` and **never used anywhere** (confirmed by grep).
- The التحضير fortress is also partial: onboarding says «أسبوعي وليلي وقبلي» (weekly, nightly, pre-Fajr), only the weekly part exists.

**This is both the biggest trust gap and the biggest feature opportunity.** Implementing الختمة as a first-class task group (تلاوة جزء + استماع حزب, with checkbox + audio links + XP) makes the product match its own name and teaching.

---

## 4. Logic bugs (state, streak, XP, sync)

### 4.1 Completion-state inconsistency — `toggleDayCompletion` can do the wrong thing
- `useHifzStore.toggleDayCompletion` treats a day as completed iff `completedTasks[day] !== undefined`.
- `DayPreviewModal` treats it as completed iff `!== undefined && Object.values(...).some(Boolean)`.

**Failure path:** user unchecks every task of a day (leaving `{new_hifz:false,…}`) → modal shows «تحديد كمكتمل» → tapping it **deletes** the day entry (undo semantics) instead of marking complete. Also `ScheduleView` strikes a day through on `!== undefined` even if only 1 of 4 tasks is done. Standardize on one predicate (e.g. `isDayCompleted = keys.length > 0 && keys.every(...)` or explicit `completedAll` flag) and use it everywhere.

### 4.2 XP economy is farmable and inconsistent
- XP is granted inside `toggleTask`-adjacent click handlers: uncheck → re-check = **+50/+20/+10 again**, infinitely (`HomeTab`, `PrepTab`, `tabs/ReviewTab`).
- `DayPreviewModal` grants **+100** per "mark complete" — toggle off/on farms 100 XP per tap.
- `PrepSessionView.onComplete` grants +10 *and* the PrepTab checkbox grants +10 for the same task (double path; guarded only by closure state).
- Day completion via `HomeTab.handleAdvance` grants **0 XP**, same action via `DayPreviewModal` grants 100. Arbitrary.
- `resetProgress()` **does not reset `totalXp`** (nor `editedThumuns`) despite the UI promising «مسح كل تقدمك» — after a "factory reset" users keep their XP and corrections.

**Fix:** derive XP from a single reducer path on *transitions* (false→true only), centralize values in `constants.ts`, and include `totalXp` (and a decision on `editedThumuns`) in `resetProgress`.

### 4.3 Progress model: "farthest day" ≠ "amount completed"
`highestDay = max(day with any task true)` drives `overallPct`, `juzCount`, ranks («حافظ متقن»), and the stats dashboard. Consequences:

- Completing day 300 from `DayPreviewModal` (possible for *any* day in the plan UI) instantly reports «الأجزاء المحفوظة: 18» with zero days of work — no guard on marking far-future days, no "only up to currentDay+1" rule, no confirmation.
- Gaps are invisible: finish day 100, skip 2–99 → progress says 100/480.

Decide what the number means ("أبعد ثمن تم" is legitimate if labeled that way) and either gate `toggleDayCompletion` to past/current days or show "أبعد محطة" + "عدد الأثمان المنجزة" as two separate metrics.

### 4.4 `farReviewPointer` is dead state (and misleading API)
`getFortressTasks(day, farReviewPointer, …)` **never uses its `farReviewPointer` parameter** — it recomputes via `getFarReviewPointerForDay(day)` internally (ESLint confirms: `'farReviewPointer' is assigned a value but never used`, `fortress-calculator.ts:49`). Meanwhile the store mutates `state.farReviewPointer` in `advanceDay` with a parallel implementation of the same algorithm. Today they agree by luck; any tweak to one copy silently diverges. **Delete the stored pointer and the parameter (single source of truth = the pure function), or the opposite** — and note `ScheduleView`/`DayPreviewModal` currently pass the ignored value around, which suggests the author believed it mattered.

### 4.5 Streaks & dates are UTC-based and tied to "advance", not activity
- `getToday()` = `new Date().toISOString().split("T")[0]` → **UTC calendar date**. For a target audience in the Gulf (UTC+3) between midnight and ~3 AM, activity is logged under *yesterday*; for Maghreb/Europe users the opposite drift. `ActivityHeatmap` compounds it by mixing `toISOString()` keys with local `d.setDate()` cells. Use a local-date key helper (`en-CA` locale format) everywhere.
- Streak only increments inside `advanceDay()`. A user who does every task but forgets to press «إتمام الثمن والانتقال للتالي» gets **no streak credit** and one `dailyLog` entry (the entry is keyed by date and **overwritten** if multiple days are advanced in one sitting — `recordDailyCompletion` writes `dailyLog[today] = …`, so a weekend catch-up marathon records as a single heatmap cell).
- `calculateStreak` increments per *advance*, not per calendar day of work — 3 advances on one Saturday = streak still +0/+1 semantics get fuzzy.

Recommendation: credit streak on first *activity* per local calendar day; allow multiple `dailyLog` entries per date (key `date#day` or store an array); keep "advance" purely as journey navigation.

### 4.6 Session timer is inaccurate and triplicated
`SessionView`, `ReviewSessionView`, `PrepSessionView` are ~95% copy-paste of the same pomodoro (only the header/footer differ). Shared issues:

- Countdown uses `setInterval(…, 1000)` **recreated on every tick** and decrements a counter → drifts badly when the tab is backgrounded (mobile browsers throttle timers to ~1/min or freeze them). A 25:00 session can take 40 real minutes or finish "instantly". Use an end-timestamp (`Date.now() + duration`) and recompute each tick.
- At zero: only `vibrateSuccess()` — silent phones get nothing. Play `playDing()` + `Notification` + title-flash too.
- `initialTime` state + `timeLeft` + `isActive` duplicated ×3 → extract `useSessionTimer` and one `SessionOverlay` component with props (`title`, `subtitle`, `footer`).
- No accidental-close protection (backdrop tap exits with no confirm) and no WakeLock.

### 4.7 Review quality rating is thrown away — the SRS loop is fake
`ReviewSessionView` ends with three buttons — «ضعيف / جيد / ممتاز» — and **all three call the same `handleComplete`**. The rating is recorded nowhere. For a *memorization* app this is the highest-value missing data in the codebase: store `quality` per (thumunId, date), then (a) show a "ثُمُن ضعيفة" list, (b) bias مراجعة البعيد toward low-quality thumuns, (c) visualize strength in stats. Even a naive 3-box history per thumun would outperform the current fixed window.

### 4.8 Misc logic findings
- `PrepTab` recomputes `weeklyThumuns` via `getThumun(currentDay + i + 1)` **without `editedThumuns`** (the prop `tasks.prepWeekly` it already receives *does* apply edits) — user corrections silently vanish in the prep list. ESLint also reports the `tasks` prop as unused.
- `ScheduleView` `useMemo` for milestones calls `getFortressTasks(d, 1)` **without `editedThumuns`** and the deps array is missing `editedThumuns` (ESLint `exhaustive-deps`, `ScheduleView.tsx:106`) — edits to thumuns won't rebuild the roadmap until some other dep changes.
- `HomeTab.handleAdvance` hardcodes `recordDailyCompletion(currentDay, true, …)` — `completedAll: true` even though nothing re-verifies the tasks at that moment.
- `useHifzStore.persist` has no `version`/`migrate` strategy and `hydrateFromCloud` uses `?? state.x` field-merging — fine today, fragile on first schema change.
- Hydration gate in `HosoonApp` is a hack: `useSyncExternalStore(() => () => {}, () => true, () => false)` (and an *unused* second attempt, `useHifzHydrated`, sits in the store). Use `useHifzStore.persist.hasHydrated()` + `onFinishHydration`.
- Session hand-off via `window.dispatchEvent(new CustomEvent("openSession"))` with `target: Record<string, unknown>` and `as any[]` casts (`HosoonApp.tsx:281`) — untyped global event bus. Lift `activeSession` to context/store instead (or at minimum type the event detail union).

---

## 5. Cloud sync & auth (Supabase)

### 5.1 Sync strategy loses data
- Sync happens **only** on login and on the manual «مزامنة الآن» button. Zero auto-sync (not on `visibilitychange`, not debounced on store change, not on interval). A user who never opens Settings and clears their browser loses everything — the exact scenario cloud backup is sold for («لحفظ تقدمك سحابياً»).
- Merge policy in `AuthModal.handleSyncAfterLogin` is `if (cloudData.current_day >= currentDay) take cloud else push local` — **"higher day wins"** erases a second device's XP, notes, and edits, and ignores the `updated_at` column that exists for exactly this. At minimum compare `updated_at` (last-write-wins with timestamp), ideally merge maps per-day (`completed_tasks` keyed merge).
- JSONB round-trips turn `Record<number, …>` keys into strings; it works via JS coercion today but deserves normalization on hydrate (and real types instead of `Record<string, any>`).

### 5.2 Auth flows with holes
- **Magic link return is unhandled.** There is no `supabase.auth.onAuthStateChange` listener anywhere in the app. After the user clicks the emailed link and lands on `/`, nothing updates the UI or runs `handleSyncAfterLogin` — the sign-in "works" invisibly until they reopen Settings. Add a root auth listener (or route handler/callback page) that hydrates + syncs on `SIGNED_IN`.
- **Sign-up assumes instant session.** With email confirmation enabled (Supabase default), `signUp` succeeds but the following `handleSyncAfterLogin` finds no user and silently no-ops; the toast says «تم ربط حسابك لحفظ تقدمك سحابياً» which is **untrue at that point**. Detect `user.identities`/session absence and show "تفعيل من البريد" state.
- `fetchProgressFromCloud` uses `.single()` which errors on zero rows (`PGRST116`) and is conflated with "no data" by the `if (cloudData)` check — use `maybeSingle()` and distinguish "empty" from "network error" (right now a flaky connection on first login can *push and overwrite* good cloud data… actually it pushes local only when cloud fetch fails *or* is empty after `data` null — on transient error `data` is null → pushes local → **can clobber newer cloud state**. This is a real overwrite risk).
- No password reset flow, no show/hide password, no password strength hint (Supabase min-6 is the only rule), no "delete my account / data" (GDPR-style request a Qur'an audience may still expect from a privacy-claiming app).
- Sign-out doesn't prompt a final sync first.
- Copy overclaim in `AuthModal`: «جميع بياناتك… مشفرة ومحفوظة بأمان تام» — local mode stores plaintext `localStorage`. Soften the claim.
- Schema (`supabase/schema.sql`): add an `updated_at` trigger (or enforce client-set timestamps), and consider a `CHECK`/json schema down the road. RLS policies themselves are fine (no DELETE policy — pair with an account-deletion RPC later).

---

## 6. UI/UX

### 6.1 The two themes are two different brands
- Light: warm parchment + emerald `#3c8268` + gold `#b8893c` (beautiful, on-topic).
- Dark: generic Tailwind-blue `#3B82F6` + **violet** `#8B5CF6` on slate `#0B1121`. The gold identity disappears; the app could be any SaaS dashboard. (The repo's own `SKILL.md` design standard explicitly bans the "AI purple" look — dark mode violates it.)
- Hardcoded palette classes everywhere (`text-emerald-500`, `bg-violet-500`, `bg-indigo-500/10`, `text-amber-400`, `rgba(79,157,126,0.5)` checkbox glows) bypass the token system (`--primary` etc.) → these don't adapt between themes. E.g. the **green completion glow** renders on **blue** primary buttons in dark mode; `FORTRESS_COLORS` in `constants.ts` is a fifth palette nobody imports.

**Fix:** retheme `.dark` to deep-green/near-black with gold accent (mirroring light), and replace every hardcoded color with semantic tokens (`--fortress-prep`, `--fortress-near`, …). One source of truth.

### 6.2 Navigation & gestures
- `useSwipeable` wraps the **entire `<main>`** with `preventScrollOnSwipe: true` — any slightly diagonal drag anywhere (reading a verse, scrolling the roadmap) is captured and flips tabs instead of scrolling. The swipe direction mapping itself is correct for RTL, but the gesture should live in an edge zone or at least raise `delta` and never block vertical scroll.
- Bottom-nav buttons lack `aria-current`; active state is color-only (thin stroke change).

### 6.3 Screen-by-screen notes
- **Hero card** (`HosoonApp`): greeting + rank pill + big number + ring + 4 stat tiles in one card is dense; the 4-up stats row with `text-[10px]` labels is at the edge of legibility on small phones. Consider 2×2 tiles with larger type and let the ring carry "today's tasks" only.
- **Quran text truncated with CSS `truncate`** (`ThumunCard`, `ReviewBoundary`) — sacred text cut mid-ayah with a bare ellipsis is both a reading and a reverence problem. Use 2-line clamp (`line-clamp-2`) and open the full range on tap.
- **Session overlays** show only a 1-line `startText` snippet as "the content". For review sessions of 8 أثمان, show the full boundary list (or per-thumun cards with a "تم" tick) — right now `tabs/ReviewTab` opens a session on `reviewNear[0]` only, so 7 of the 8 near-review thumuns are invisible during the session.
- **`DayPreviewModal`** shows "الآيات 15 - 11" for cross-surah thumuns (see §2) and has edit affordances for structurally broken fields.
- **`ActivityHeatmap`**: not a GitHub-style calendar — it's an `auto-fit` wrapped grid with no week alignment, no month labels, newest-first reversed mid-grid, and a `TooltipProvider` (full Radix provider) mounted **per cell** (126+ providers). Rebuild as 7-row × N-col week columns, one shared provider, month labels on top. Also `totalMonthsSpan` is computed and never used.
- **`JourneyRoadmap`**: `shadow-[0_0_20px_rgba(var(--color-primary),0.4)]` is invalid CSS (CSS vars can't be dropped into `rgba()` like that in Tailwind v4 tokens) — the glow silently never applies. 60 `motion` items animate `delay: i * 0.01` on every mount.
- **`StatsDashboard`**: `copyStats()` is implemented and **never wired to any button** (`Share2` imported unused) — the share feature is unreachable. Same file computes `editedCount` and never shows it (nice candidate for a "صحّح بيانات" contribution stat).
- **Auth modal** mode switcher is a 2-button segmented control (دخول/حساب جديد) + a separate magic-link row; in `mode === "magic"` **neither segment shows as active**. The magic option deserves a third state in the control.
- **Copy/labels consistency**: `+50 XP` floats in English over Arabic UI (use «+٥٠ نقطة» or tokenized numbers), rank labels mix emoji glyphs with lucide icons elsewhere (the repo's `SKILL.md` bans emoji; `MILESTONES`, ranks and achievements are emoji-driven — pick a policy; lucide icons in badges would look more premium).
- **Manifest/branding drift**: `manifest.json` `background_color #0A0F1E` vs theme `#0B1121` vs layout `themeColor #FAF7F1/#14181A`; icons lack `"purpose": "maskable"` (Android adaptive icon crop), no screenshots/categories. `generate-icons.js` draws the "ح" mark at font-size 200 baseline 320 — crude vertical centering; regenerate with `text-anchor` + `dominant-baseline` or path outlines.
- **No end-of-journey experience**: day 480 completes… and nothing happens. No ختامة screen, no "ماذا بعد الختمة?" (maintenance phase), no share card. The last day of a 16-month journey deserves a moment.
- **No reminder/notification** of any kind despite a full service worker already being present (see §7).

### 6.4 Empty/edge states
Good: locked juz cards, "تبدأ من الثمن الثاني" copy. Missing: home has no "أنت في يوم متأخر X" recovery state (missed days just sit there), no offline/online indicator, no sync-failure surface beyond toasts, no loading skeleton (spinner-only `hydrated` gate).

---

## 7. Accessibility (a11y)

- `viewport.maximumScale: 1` **blocks pinch-zoom** — remove it (a WCAG failure; also hurts older users, the app's likely family audience).
- Hand-rolled modal divs (`SessionView`, `DayPreviewModal`, `SettingsModal`, `ThumunEditorModal`, `AuthModal`): no `role="dialog"`, `aria-modal`, focus trap, Escape-to-close, or `inert` background — and body scroll isn't locked. The repo already ships `ui/dialog.tsx` + `ui/alert-dialog.tsx` (Radix) — use them (or `aria` + focus-trap at minimum). Mobile sheet behavior for `SettingsModal` is nice; Radix dialog can do it.
- Check-circle task toggles are `<button>`s without `role="checkbox"`/`aria-checked`/labels — screen readers hear "button, unlabeled".
- Icon-only buttons (gear, theme toggle, edit pencil, session X) — `title` only on theme toggle; add `aria-label` everywhere.
- `ActivityHeatmap` cells: empty `TooltipTrigger` with no accessible name; the whole visualization has no text alternative. Add `aria-label` per cell ("الخميس 3 أبريل — 3 مهام") and a visually-hidden summary.
- `ThumunCard` clickable `div role="button"` without keyboard handlers, and it **nests the action `<button>` inside** (nested interactive elements).
- Color-only state signaling in several places (streak flame colors, heatmap intensity) — pair with numbers/text (heatmap does; streak flame does not).
- `text-[10px]` labels and `muted-foreground` on `surface` deserve a contrast audit (WCAG AA 4.5:1).
- Positive: `<html lang="ar" dir="rtl">`, `suppressHydrationWarning` for theme, sensible heading structure in most screens.

---

## 8. Performance

- **`ScheduleView` is O(n²) on every render dependency change**: `maxDays` loops up to `TOTAL_THUMUNS * 1.5 = 720` calls to `getFortressTasks`, then the milestone builder loops `maxDays` more — and *each* `getFortressTasks` call internally runs `getFarReviewPointerForDay(day)` which itself loops `O(day)`. Hundreds of thousands of iterations whenever `completedTasks` changes on the Plan tab. Cheap fixes: memoize the pointer series once (compute iteratively in O(1) per day), cache `getThumun` lookups, or precompute the static journey once (it only depends on `editedThumuns`).
- `quran-thumuns.json` is imported into the client bundle (fine at ~480 rows — keep it static; if `startText` grows, lazy-load).
- `TooltipProvider` per heatmap cell (§6.3) — one provider at the screen root.
- 60-item `motion` stagger remounts in `JourneyRoadmap` — gate animation to first open.
- Bundle: `framer-motion` + `canvas-confetti` + `@supabase/supabase-js` + unused **`recharts`** (see §9) in one client entry; `dynamic import` the stats tab and session overlays (`next/dynamic`) — the home checklist doesn't need Recharts/Supabase on first paint.
- Timer re-render every second re-runs the whole session overlay tree — trivial now, fixed by the `useSessionTimer` extraction.

---

## 9. Code health, architecture, tooling

- **Dead code inventory** (grep-confirmed):
  - `src/components/ReviewTab.tsx` — 232-line **unused duplicate** of `tabs/ReviewTab.tsx` (and it dispatches a `review_far` session type `HosoonApp` doesn't handle). Delete.
  - `recharts` in `dependencies` — **never imported anywhere**. Remove.
  - Store: `setNote`, `goToDay`, `useHifzHydrated` — defined, never used (notes is synced to Supabase and editable… nowhere).
  - `constants.ts`: `FORTRESS_COLORS`, `RECITATION_JUZS_PER_DAY`, `LISTENING_HIZBS_PER_DAY`, `TOTAL_SURAHS`, `THUMUNS_PER_HIZB` — unused (the last one *should* be used by `JourneyRoadmap`'s hardcoded `/8`).
  - Lint noise: `Share2`, `Button`, `resetProgress`, `toggleDayCompletion` (ScheduleView), `copyStats`, `editedCount`, `totalMonthsSpan`, `BookOpen`, `currentDay` (PrepTab) etc. — 17 unused-var warnings.
- **ESLint: 34 errors** — almost all `@typescript-eslint/no-explicit-any` (Session/Prep/Review session props are `any`; `CloudUserProgress` maps are `Record<string, any>`; `catch (err: any)`) plus `ban-ts-comment` for `@ts-nocheck` in `sw.ts`. Type the session event union and the JSONB maps (`Record<number, DailyTasks>` etc.) and the errors disappear.
- **Sessions/`Thumun` typing**: `SessionView` takes `surah: any; juz?: any; …` while a perfectly good `Thumun` interface exists in `fortress-calculator.ts`. Pass `thumun: Thumun`.
- **Duplication**: the three session views (§4.6) and the two `CheckBtn` implementations (PrepTab + tabs/ReviewTab) — extract once (`components/ui/task-checkbox.tsx`).
- **`shadcn` is in `dependencies`** — it's a CLI scaffolding tool; move to `devDependencies` (or use `npx`).
- **Dual lockfiles**: `package-lock.json` *and* `pnpm-lock.yaml` (+ `pnpm-workspace.yaml`) — pick one package manager; CI and contributors will drift otherwise.
- **Build config oddities**: `next.config.ts` sets `turbopack: {}` while `build` script forces `--webpack` (needed for `babel-plugin-react-compiler`?) — document or unify. `build` also depends on **network access to Google Fonts** (`next/font` fetch at build time; it failed in this sandbox) — self-host the two fonts if you need air-gapped/CI-robust builds.
- **No tests, no CI.** The pure core (`fortress-calculator`, streak/pointer math) is trivially unit-testable and *contains bugs of exactly the kind tests catch* (§2.1, §4.4). Add Vitest + a tiny GitHub Actions workflow (`tsc`, `eslint`, `vitest`, `next build`).
- **README is the stock create-next-app boilerplate** — no product description, no setup steps (`.env.local.example` exists but is unreferenced), no dataset provenance/license, no method citation (الشيخ سعيد أبو العلا حمزة — referenced in onboarding but nowhere in docs).
- `skills-lock.json` / `.agents/skills` — fine as dev tooling; `components.json` has `"rtl": false` despite the product being RTL-only (harmless today, misleads future shadcn codegen).

---

## 10. Features — what to build next (beyond fixing the above)

Ordered by expected impact for a hifz student:

1. **الحصن الأول: الختمة** (§3) — daily جزء تلاوة + حزب استماع tracking, with curated reciter audio links (per-thumun start/end) and a listen-along sheet. Completes the method and the brand promise.
2. **Real spaced repetition** (§4.7) — persist ضعيف/جيد/ممتاز per thumun; "الأثمان الضعيفة" review queue; auto-adjust مراجعة البعيد window toward weak material. This is the differentiator vs. static checklist apps.
3. **Daily reminder push** — Web Push / Notification via the existing Serwist SW, user-chosen time (suggest بعد الفجر), plus streak-freeze (يوم راحة) policy so one miss doesn't kill 200 days of motivation. A habit app without a trigger is half a habit app.
4. **Session journal** — the timer data is thrown away; record minutes per fortress per day and chart "وقت الحفظ" alongside counts in Stats. Cheap to add, powers future insights (e.g. "أثمنة تستغرق وقتاً أطول").
5. **Onboarding: "أين أنت من الرحلة؟"** — pick starting juz/day (or import), pick reminder time, pick theme. New users with prior memorization currently must fake-complete days (§4.3).
6. **Post-khatma phase** — after day 480: maintenance plan (e.g. جزء كل 3 أيام), "الحفظ الجديد" becomes "تثبيت", and a ختامة celebration + share card.
7. **Notes UI** for `notes`/`setNote` (store + sync already exist) — per-thumun notes ("مشكلة في كذا") surfaced in sessions; keep the community-correction flow (`ThumunEditorModal`) but gate/rank edits (see 8).
8. **Community-sourced data corrections** — `editedThumuns` is local-only despite the code comment "Community Sourcing". Submit corrections to a Supabase table for curation, then ship dataset updates. Turns your bug class (§2) into a flywheel.
9. **Search & surah index** — jump to any ثمن by surah/ayah; per-surah progress bar ("البقرة: 51/72 ثمناً").
10. **Share/invite** — wire up `copyStats` (§6.3) with Web Share API + a generated image card; family profiles (kids' progress) are a natural growth loop for this audience.
11. **Arabic-Indic numerals option** (٤٨٠) — the audience expects them in mushaf contexts.
12. **Privacy extras** — account deletion, "استيراد/تصدير" validation (§ below), and honest copy (§5.2).

**Import/export hardening (quick win):** `handleImport` accepts any parseable JSON into `localStorage["hifz-storage"]` (only `JSON.parse` is attempted) — validate against a Zod schema mirroring the persist shape (and run migrations) before writing; version the backup file; show a summary ("سيتم استيراد: يوم 127، 41 يوماً مثالياً…") before applying.

---

## 11. Suggested roadmap

**Sprint 1 — Truth & trust (P0)**
1. Rebuild `quran-thumuns.json` with `start/end {surah, ayah}`, fix 2:41–43, decide Fatiha policy, strip baked `...` (§2).
2. One `isDayCompleted` predicate; fix `toggleDayCompletion`; gate future-day completion (§4.1, §4.3).
3. Fix XP-on-transition + include XP in reset (§4.2).
4. Delete dead code: `components/ReviewTab.tsx`, `recharts`, unused constants (re-home the recitation constants into the new Khatma task) (§9).

**Sprint 2 — The five fortresses**
5. الختمة task group (§3, §10.1) + settings for pace (جزء/يوم, حزب استماع/يوم).
6. Session overlay consolidation + timestamp-based timer + end-of-timer alerts (§4.6).
7. Store review quality; weak-thumun list (§4.7).

**Sprint 3 — Retention & sync**
8. Reminders (SW push) + streak-credit on activity + local-date keys (§4.5, §10.3).
9. Auto-sync + timestamp merge + `onAuthStateChange` + honest signup states (§5).
10. Import validation (§10 last).

**Sprint 4 — Polish**
11. Unify dark theme with brand + token sweep (§6.1), heatmap rebuild, manifest/icons, a11y pass (§7), `ScheduleView` memoization (§8), tests+CI (§9).

---

*Review produced from a static audit of branch `arena/01a0da63-hosoon-app` (base `c4adfe8`). Dataset findings reproducible via the audit script logic in §2 (compare `startAyah/endAyah` and consecutive ranges per surah).*
