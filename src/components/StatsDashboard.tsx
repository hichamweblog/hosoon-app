"use client";
import { BarChart3, BookOpen, CheckCircle2, Clock, Flame, Trophy } from "lucide-react";
import { useHifzStore } from "@/store/useHifzStore";
import { progressMetrics } from "@/lib/progress/derive";
import { formatNum } from "@/lib/format";
import { MILESTONES, SPECIAL_ACHIEVEMENTS } from "@/lib/constants";
import ActivityHeatmap from "./ActivityHeatmap";
import JourneyRoadmap from "./JourneyRoadmap";
export default function StatsDashboard() {
  const data = useHifzStore(), metrics = progressMetrics(data), arabic = data.settings.arabicNumerals;
  const sessions = Object.values(data.sessions), seconds = sessions.reduce((n, s) => n + s.seconds, 0), minutes = Math.floor(seconds / 60);
  const score = { bestStreak: data.bestStreak, perfectDays: metrics.perfectDays, totalXp: data.totalXp, highestDay: metrics.highest, zahrawayn: metrics.zahrawayn, sessionMinutes: minutes };
  const cards = [{ title: "أثمان محفوظة", value: metrics.count, icon: BookOpen }, { title: "أيام ورد مكتملة", value: metrics.perfectDays, icon: CheckCircle2 }, { title: "سلسلة النشاط", value: data.streak, icon: Flame }, { title: "أفضل سلسلة", value: data.bestStreak, icon: Trophy }, { title: "النقاط الموثقة / المستوردة", value: data.totalXp, icon: BarChart3 }, { title: "دقائق الدراسة المسجلة", value: minutes, icon: Clock }];
  const earned = MILESTONES.filter((m) => m.threshold === 480 ? metrics.count === 480 : metrics.juzs.length >= m.threshold / 16);
  const next = MILESTONES.find((m) => !earned.includes(m));
  const recent = [...sessions].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12);
  return <div className="space-y-4">
    <h1 className="text-xl font-bold">إحصائياتك</h1><p className="text-sm text-muted-foreground">المحفوظ، نشاط الدراسة، وإتمام الورد ثلاثة أشياء مختلفة. لا يحتسب الجزء أو الحزب إلا باكتمال جميع أثمانه.</p>
    <div className="grid grid-cols-2 gap-3">{cards.map(({ title, value, icon: Icon }) => <section key={title} className="surface-card p-4 space-y-2"><Icon className="size-5 text-primary" aria-hidden /><p className="text-2xl font-bold break-all">{formatNum(value, arabic)}</p><h2 className="text-sm text-muted-foreground">{title}</h2></section>)}</div>
    <p className="text-xs text-muted-foreground leading-relaxed">النشاط: إنجاز جديد أو محاولة مراجعة فردية أو جلسة فعلية 30 ثانية فأكثر. يوم راحة واحد يحافظ على السلسلة ولا يضيف يومًا إليها. فك العلامة وإعادتها لا يضاعف النشاط.</p>
    {data.legacyXp > 0 && <p className="rounded-xl bg-surface p-3 text-sm text-muted-foreground">{formatNum(data.legacyXp, arabic)} نقطة رصيد قديم محفوظ دون مضاعفة. الإنجازات القديمة ليست دليلًا على اكتمال أيام التقويم، ومحطات السجل القديم منفصلة عن أيام الورد المؤرخة.</p>}
    <JourneyRoadmap memorized={metrics.ids} currentDay={data.currentDay} />
    <section className="surface-card p-5 space-y-3"><h2 className="text-lg font-bold">مراحل المحفوظ</h2><p className="text-sm text-muted-foreground">الأجزاء المكتملة فعلًا: {formatNum(metrics.juzs.length, arabic)}/30 · الأحزاب: {formatNum(metrics.hizbs.length, arabic)}/60</p><div className="grid grid-cols-2 gap-2">{MILESTONES.map((m) => <article key={m.id} className={`rounded-xl border p-3 ${earned.includes(m) ? "border-primary bg-primary/10" : "border-border bg-surface"}`}><span className="text-xl" aria-hidden>{m.threshold === 480 ? "♛" : "◈"}</span><h3 className="font-bold text-sm mt-1">{m.label}</h3><p className="text-xs text-muted-foreground mt-1">{`${m.threshold / 16} أجزاء مكتملة`}</p><p className="text-xs mt-2">{earned.includes(m) ? "مكتمل" : "لم يكتمل"}</p></article>)}</div>{next && <p className="text-sm">المرحلة التالية: {next.label}. تحتاج {formatNum(Math.max(0, next.threshold / 16 - metrics.juzs.length), arabic)} أجزاء كاملة أخرى، وليس مجرد بلوغ رقم محطة.</p>}</section>
    <section className="surface-card p-5 space-y-3"><h2 className="text-lg font-bold">شارات النشاط والرسوخ</h2><div className="grid grid-cols-2 gap-2">{SPECIAL_ACHIEVEMENTS.map((item) => <article key={item.id} className={`rounded-xl border p-3 ${item.check(score) ? "border-primary bg-primary/10" : "border-border bg-surface"}`}><span className="text-xl" aria-hidden>{item.check(score) ? "★" : "☆"}</span><h3 className="font-bold text-sm mt-1">{item.label}</h3><p className="text-xs text-muted-foreground mt-1">{item.description}</p><p className="text-xs mt-2">{item.check(score) ? "محققة" : "لم تتحقق"}</p></article>)}</div><p className="text-xs text-muted-foreground">الزهراوان تتطلب كل الأثمان التي تغطي البقرة وآل عمران (حتى الثمن 60) دون فجوات. الشارات ليست شهادة إتقان ديني.</p></section>
    <ActivityHeatmap />
    <section className="surface-card p-5 space-y-3"><h2 className="text-lg font-bold">آخر جلسات الدراسة</h2>{recent.length ? <ul className="space-y-2">{recent.map((s) => <li key={s.id} className="rounded-xl bg-surface p-3 text-sm"><b>{s.task === "free_review" ? "تثبيت / دراسة حرة" : s.task === "new_hifz" ? "حفظ" : s.task === "prep_weekly" ? "تحضير" : "ورد أو مراجعة"}</b><span className="block text-xs text-muted-foreground mt-1">{s.date} · محطة {formatNum(s.day, arabic)} · {formatNum(Math.floor(s.seconds / 60), arabic)} دقيقة و{formatNum(s.seconds % 60, arabic)} ثانية{s.abandoned ? " · توقفت دون إتمام الورد" : ""}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">لم تُسجّل جلسات مؤقتة بعد. العلامات اليدوية لا تختلق وقت دراسة.</p>}</section>
  </div>;
}
