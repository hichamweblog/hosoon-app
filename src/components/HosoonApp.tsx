"use client";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart2, BookOpen, BookOpenCheck, CalendarDays, Cloud, Home, Settings, Shield } from "lucide-react";
import HomeTab from "./tabs/HomeTab";
import ThemeToggle from "./ThemeToggle";
import { Button } from "./ui/button";
import { useAccount } from "@/hooks/useAccount";
import { useCloudSync } from "@/hooks/useCloudSync";
import { useMounted } from "@/hooks/useMounted";
import { useToday } from "@/hooks/useToday";
import { useHijriDate } from "@/hooks/useHijriDate";
import { useHifzStore } from "@/store/useHifzStore";
import { useAppStatusStore } from "@/store/useAppStatusStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useSessionStore } from "@/store/useSessionStore";
import { useMushafStore } from "@/store/useMushafStore";
import { formatNum } from "@/lib/format";
import { planToFortress, tasksForPlan, memorizedIds } from "@/lib/progress/plan";
import { scheduleDailyReminder, cancelDailyReminder } from "@/lib/reminders";
import ScreenBoundary from "./ScreenBoundary";

const loading = () => <p role="status" className="p-6 text-center text-sm text-muted-foreground">جارٍ فتح الشاشة…</p>;
const Onboarding = dynamic(() => import("./Onboarding"), { loading });
const PrepTab = dynamic(() => import("./tabs/PrepTab"), { loading });
const ReviewTab = dynamic(() => import("./tabs/ReviewTab"), { loading });
const ScheduleView = dynamic(() => import("./ScheduleView"), { loading });
const StatsDashboard = dynamic(() => import("./StatsDashboard"), { loading });
const SettingsModal = dynamic(() => import("./SettingsModal"), { loading });
const SessionOverlay = dynamic(() => import("./SessionOverlay"), { loading });
const Reader = dynamic(() => import("./mushaf/ThumunReaderView"), { loading });
const Celebration = dynamic(() => import("./KhatmaCelebration"));
const ActiveAudio = dynamic(() => import("./audio/ActiveAudioBar"));
const PwaManager = dynamic(() => import("./PwaManager"));

type Tab = "home" | "prep" | "review" | "plan" | "stats";
const tabs = [
  { id: "home" as const, label: "اليوم", icon: Home }, { id: "prep" as const, label: "التحضير", icon: BookOpenCheck },
  { id: "review" as const, label: "المراجعة", icon: Shield }, { id: "plan" as const, label: "الخطة", icon: CalendarDays },
  { id: "stats" as const, label: "إحصائيات", icon: BarChart2 },
];
export default function HosoonApp() {
  useAccount();
  const router = useRouter(), recovery = useAuthStore((s) => s.recovery);
  useEffect(() => { if (recovery) router.replace("/auth/recovery"); }, [recovery, router]);
  const owner = useHifzStore((s) => s.ownerId), initialized = useAuthStore((s) => s.initialized), mounted = useMounted();
  useCloudSync(owner);
  if (!mounted || !initialized || recovery) return <div className="min-h-[100dvh] grid place-items-center"><p role="status">جارٍ فتح بياناتك…</p></div>;
  return <Workspace key={owner ?? "guest"} />;
}
function Workspace() {
  const state = useHifzStore(), status = useAppStatusStore(), today = useToday();
  const session = useSessionStore((s) => s.payload), readerOpen = useMushafStore((s) => s.isOpen), openReader = useMushafStore((s) => s.openReader);
  const [tab, setTab] = useState<Tab>("home"), [settingsOpen, setSettingsOpen] = useState(false);
  const hijri = useHijriDate(state.settings.arabicNumerals), arabic = state.settings.arabicNumerals;
  useEffect(() => { if (!state.ownerId || status.cloudReadReady) useHifzStore.getState().ensureTodayPlan(today); }, [today, state.ownerId, state.showOnboarding, state.currentDay, status.cloudReadReady]);
  useEffect(() => {
    scheduleDailyReminder(state.settings.reminderTime);
    return cancelDailyReminder;
  }, [state.ownerId, state.settings.reminderTime]);
  if (state.showOnboarding && !status.storageError) return <Onboarding />;
  const plan = state.ownerId && !status.cloudReadReady ? undefined : state.dailyPlans[today];
  const tasks = plan ? planToFortress(plan) : null;
  const dayTasks = tasksForPlan(state, plan), count = plan?.taskKeys.filter((key) => dayTasks[key]).length ?? 0, total = plan?.taskKeys.length ?? 0;
  const phaseLabels = { local: "محفوظ على هذا الجهاز", pending: "محفوظ محليًا · ينتظر المزامنة", syncing: "جارٍ مزامنة التقدم", synced: "تم حفظ النسخة السحابية", error: "المزامنة متوقفة · النسخة المحلية محفوظة" };
  const memorized = memorizedIds(state).length;
  return <main className={`min-h-[100dvh] bg-background text-foreground pb-44 ${state.settings.quietMode ? "quiet-mode" : ""}`} dir="rtl">
    <a href="#workspace-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 z-[200] bg-card p-3 rounded-xl">انتقل إلى المحتوى</a>
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div><p className="text-xl font-bold">حصون</p><p className="text-xs text-muted-foreground">رواية ورش عن نافع</p></div>
        <div className="flex flex-wrap gap-1 items-center">
          <Button variant="outline" className="rounded-full gap-1 text-sm" aria-label="فتح المصحف الشريف" onClick={() => openReader(state.currentDay)}><BookOpen className="size-4" aria-hidden /><span>المصحف</span></Button>
          <Button variant="ghost" size="icon" aria-label="الإعدادات" onClick={() => setSettingsOpen(true)}><Settings className="size-5" aria-hidden /></Button><ThemeToggle />
        </div>
      </header>
      {status.storageError && <section role="alert" className="rounded-2xl border border-destructive bg-destructive/10 p-4 space-y-2"><p className="font-semibold">الحفظ المحلي يحتاج انتباهك</p><p className="text-sm">{status.storageError}</p><Button variant="outline" onClick={() => setSettingsOpen(true)}>النسخ والاسترجاع</Button></section>}
      {status.migrationNotice && <section className="rounded-2xl bg-primary/10 p-3 text-sm" aria-label="نتيجة ترحيل البيانات"><p>{status.migrationNotice}</p><button className="min-h-11 font-semibold text-primary" onClick={() => status.setStatus({ migrationNotice: null })}>فهمت</button></section>}
      <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Cloud className="size-3.5" aria-hidden />{phaseLabels[status.syncPhase]}</p>
      {tab === "home" && <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface p-4" aria-label="تقدم ورد اليوم">
        <div className="space-y-1 min-w-0 grow basis-40"><h1 className="text-2xl font-bold">وردك اليوم</h1><p className="text-sm text-muted-foreground">{today} · {hijri}</p><p className="text-sm">محطة الحفظ: الثمن {formatNum(state.currentDay, arabic)} · المحفوظ {formatNum(memorized, arabic)} / {formatNum(480, arabic)}</p></div>
        <div className="shrink-0 grid place-items-center rounded-full border-4 border-primary/40 size-20 text-center" role="progressbar" aria-valuenow={count} aria-valuemin={0} aria-valuemax={total || 1} aria-label="إنجاز مهام اليوم"><span><b className="text-lg">{formatNum(count, arabic)}/{formatNum(total, arabic)}</b><span className="block text-xs text-muted-foreground">{total ? formatNum(Math.round(count * 100 / total), arabic) : "0"}%</span></span></div>
      </section>}
      <div id="workspace-content" tabIndex={-1} className="outline-none">
        <ScreenBoundary key={tab}>
          {tab === "home" && tasks && plan && <HomeTab tasks={tasks} dayTasks={dayTasks} currentDay={plan.journeyDay} />}
          {tab === "prep" && tasks && plan && <PrepTab tasks={tasks} dayTasks={dayTasks} currentDay={plan.journeyDay} />}
          {tab === "review" && tasks && plan && <ReviewTab tasks={tasks} dayTasks={dayTasks} currentDay={plan.journeyDay} />}
          {tab === "plan" && <ScheduleView />}{tab === "stats" && <StatsDashboard />}
          {!plan && ["home", "prep", "review"].includes(tab) && <p className="text-sm text-muted-foreground p-4">يحتاج الحساب أول قراءة سحابية ناجحة قبل إنشاء ورد أو نقل بيانات إليه. إن تعذر الاتصال، النسخة المحلية السابقة محفوظة؛ يمكنك فتح الإعدادات أو العودة للضيف.</p>}
        </ScreenBoundary>
      </div>
    </div>
    <nav aria-label="التنقل الرئيسي" className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 border-t border-border backdrop-blur-sm pb-safe">
      <div className="max-w-2xl mx-auto flex justify-around gap-1 p-2">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-current={tab === id ? "page" : undefined} aria-label={label} className={`min-h-14 min-w-0 flex-1 rounded-xl flex flex-col items-center justify-center gap-1 ${tab === id ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground"}`} onClick={() => setTab(id)}><Icon className="size-5" aria-hidden /><span className="text-xs break-words">{label === "إحصائيات" ? "إحصاء" : label}</span></button>)}</div>
    </nav>
    {settingsOpen && <ScreenBoundary onClose={() => setSettingsOpen(false)}><SettingsModal onClose={() => setSettingsOpen(false)} /></ScreenBoundary>}
    {session && <ScreenBoundary onClose={() => useSessionStore.getState().close()}><SessionOverlay /></ScreenBoundary>}
    {readerOpen && <ScreenBoundary onClose={() => useMushafStore.getState().closeReader()}><Reader /></ScreenBoundary>}
    {state.khatmaCompletedAt && state.celebrationSeenAt !== state.khatmaCompletedAt && <Celebration />}
    <ActiveAudio /><PwaManager />
  </main>;
}
