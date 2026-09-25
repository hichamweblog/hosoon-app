"use client";

import { MOTIVATIONAL_QUOTES, type TaskType, XP_TABLE } from "@/lib/constants";
import { formatNum } from "@/lib/format";
import { vibrateLight, vibrateSuccess } from "@/lib/haptic";
import { thumunShort } from "@/lib/quran-labels";
import { formatHijriDate } from "@/lib/hijri";
import type { FortressTasks } from "@/lib/fortress-calculator";
import type { DailyTasks } from "@/store/useHifzStore";
import { useHifzStore } from "@/store/useHifzStore";
import { useSessionStore } from "@/store/useSessionStore";
import { useXpStore } from "@/store/useXpStore";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import {
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  Headphones,
  History,
  Sparkles,
  Volume2,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import TaskCheckbox from "../ui/task-checkbox";
import ThumunCard from "./ThumunCard";

interface Props {
  tasks: FortressTasks;
  dayTasks: DailyTasks;
  currentDay: number;
}

const TONE: Record<string, string> = {
  khatma: "text-f-khatma",
  prep: "text-f-prep",
  new: "text-f-new",
  near: "text-f-near",
  far: "text-f-far",
};

export default function HomeTab({ tasks, dayTasks, currentDay }: Props) {
  const toggle = useHifzStore((s) => s.toggleTask);
  const advanceDayFn = useHifzStore((s) => s.advanceDay);
  const maintain = useHifzStore((s) => s.maintain);
  const arabic = useHifzStore((s) => s.settings.arabicNumerals);
  const openSession = useSessionStore((s) => s.open);
  const addEvent = useXpStore((s) => s.addEvent);
  const celebratedRef = useRef(false);

  const quote = MOTIVATIONAL_QUOTES[currentDay % MOTIVATIONAL_QUOTES.length];

  const isAllDone =
    tasks.taskKeys.length > 0 && tasks.taskKeys.every((k) => dayTasks[k]);

  useEffect(() => {
    if (isAllDone && !celebratedRef.current) {
      celebratedRef.current = true;
      toast.success("تم إنجاز مهام هذا اليوم!", { description: "تقبل الله منك." });
      setTimeout(
        () =>
          confetti({
            particleCount: 110,
            spread: 90,
            origin: { y: 0.6 },
            colors: ["#3C8268", "#B8893C", "#FFFFFF"],
          }),
        300,
      );
    }
    if (!isAllDone) celebratedRef.current = false;
  }, [isAllDone]);

  const check = (task: TaskType, e: React.MouseEvent) => {
    if (!dayTasks[task]) addEvent(XP_TABLE[task] ?? 0, e.clientX, e.clientY);
    toggle(currentDay, task);
  };

  const handleAdvance = () => {
    vibrateSuccess();
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#3C8268", "#B8893C", "#3E7CB1", "#5B5FA8"],
      zIndex: 9999,
    });
    advanceDayFn();
    celebratedRef.current = false;
    toast("تم الانتقال للثمن التالي", {
      description: `من الرياحين إلى الياسمين — ${formatHijriDate(new Date(), arabic)}`,
    });
  };

  return (
    <div className="space-y-5">
      {/* Quote */}
      <div className="text-center py-4 px-3">
        <p className="font-quran text-foreground/90 text-xl sm:text-2xl leading-[2.1]">
          &laquo;{quote.text}&raquo;
        </p>
        <p className="text-xs text-muted-foreground mt-2">— {quote.source}</p>
      </div>

      {maintain.active ? (
        <MaintainCard />
      ) : (
        <>
          {/* ─── الحصن الأول: الختمة ─── */}
          <FortressCard
            title="الختمة"
            hint="تلاوة جزء + سماع حزب"
            tone="khatma"
          >
            <TaskRow
              label={`تلاوة ${tasks.reciteJuzs.length > 1 ? "الأجزاء" : "الجزء"} ${tasks.reciteJuzs
                .map((j) => formatNum(j, arabic))
                .join("، ")}`}
              sub={spanLabel(tasks.reciteSpan, arabic)}
              checked={!!dayTasks.khatma_recite}
              task="khatma_recite"
              onCheck={check}
              icon={<BookOpenCheck className="w-4 h-4" />}
              onSession={() =>
                openSession({
                  kind: "khatma",
                  day: currentDay,
                  thumuns: [],
                  reciteJuzs: tasks.reciteJuzs,
                  listenHizbs: tasks.listenHizbs,
                })
              }
            />
            <TaskRow
              label={`سماع ${tasks.listenHizbs.length > 1 ? "الأحزاب" : "الحزب"} ${tasks.listenHizbs
                .map((h) => formatNum(h, arabic))
                .join("، ")}`}
              sub={spanLabel(tasks.listenSpan, arabic)}
              checked={!!dayTasks.khatma_listen}
              task="khatma_listen"
              onCheck={check}
              icon={<Volume2 className="w-4 h-4" />}
              onSession={() =>
                openSession({
                  kind: "khatma",
                  day: currentDay,
                  thumuns: [],
                  reciteJuzs: tasks.reciteJuzs,
                  listenHizbs: tasks.listenHizbs,
                })
              }
            />
          </FortressCard>

          {/* ─── الحصن الثاني: التحضير ─── */}
          {tasks.prepWeekly.length > 0 && (
            <FortressCard title="التحضير" hint="الأثمان الثمانية القادمة" tone="prep">
              <TaskRow
                label="تحضير أسبوعي"
                sub={tasks.prepWeekly.length > 0 ? thumunShort(tasks.prepWeekly[0], arabic) : ""}
                checked={!!dayTasks.prep_weekly}
                task="prep_weekly"
                  onCheck={check}
                icon={<ClipboardList className="w-4 h-4" />}
                onSession={() =>
                  openSession({ kind: "prep", day: currentDay, thumuns: tasks.prepWeekly })
                }
              />
            </FortressCard>
          )}

          {/* ─── الحصن الثالث: الحفظ الجديد ─── */}
          {tasks.newHifz && (
            <div className="surface-card p-5">
              <div className="flex items-center justify-between mb-4">
                <TaskCheckbox
                  checked={!!dayTasks.new_hifz}
                  label="تم إنجاز الحفظ الجديد"
                  onToggle={(e) => check("new_hifz", e)}
                />
                <h3 className="font-bold text-lg flex items-center gap-2">
                  الحفظ الجديد
                  <Sparkles className="w-5 h-5 text-f-new" aria-hidden />
                </h3>
              </div>
              <ThumunCard
                thumun={tasks.newHifz}
                accentClass="bg-f-new text-accent-foreground"
                onClick={() =>
                  openSession({ kind: "new_hifz", day: currentDay, thumuns: [tasks.newHifz!] })
                }
                actionLabel={dayTasks.new_hifz ? undefined : "ابدأ الجلسة"}
              />
            </div>
          )}

          {/* ─── الحصن الرابع: مراجعة القريب ─── */}
          {tasks.reviewNear.length > 0 && (
            <FortressCard
              title="مراجعة القريب"
              hint="آخر ثمانية أثمان (حزب واحد)"
              tone="near"
            >
              <TaskRow
                label={`${thumunShort(tasks.reviewNear[tasks.reviewNear.length - 1], arabic)}`}
                sub={`إلى ${thumunShort(tasks.reviewNear[0], arabic)}`}
                checked={!!dayTasks.review_near}
                task="review_near"
                  onCheck={check}
                icon={<History className="w-4 h-4" />}
                onSession={() =>
                  openSession({
                    kind: "review_near",
                    day: currentDay,
                    thumuns: tasks.reviewNear,
                  })
                }
              />
            </FortressCard>
          )}

          {/* ─── الحصن الخامس: مراجعة البعيد ─── */}
          {tasks.reviewFar && (
            <FortressCard title="مراجعة البعيد" hint="نافذة دوّارة على المتقدم" tone="far">
              <TaskRow
                label={`من ${thumunShort(tasks.reviewFar.start, arabic)}`}
                sub={`إلى ${thumunShort(tasks.reviewFar.end, arabic)}`}
                checked={!!dayTasks.review_far}
                task="review_far"
                  onCheck={check}
                icon={<Headphones className="w-4 h-4" />}
                onSession={() =>
                  openSession({
                    kind: "review_far",
                    day: currentDay,
                    thumuns: tasks.reviewFar!.list,
                  })
                }
              />
            </FortressCard>
          )}
        </>
      )}

      {/* Advance */}
      {isAllDone && !maintain.active && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="pt-2">
          <button
            onClick={handleAdvance}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            {currentDay >= 480 ? "ختمت القرآن — بارك الله فيك" : "إتمام الثمن والانتقال للتالي"}
            <CheckCircle2 className="w-5 h-5" aria-hidden />
          </button>
        </motion.div>
      )}
    </div>
  );
}

function spanLabel(
  rows: { name: string; fromAya: number; toAya: number }[],
  arabic: boolean,
) {
  if (rows.length === 0) return "";
  const a = rows[0];
  const b = rows[rows.length - 1];
  return rows.length === 1
    ? `${a.name} ${formatNum(a.fromAya, arabic)}–${formatNum(a.toAya, arabic)}`
    : `${a.name} ${formatNum(a.fromAya, arabic)} ← ${b.name} ${formatNum(b.toAya, arabic)}`;
}

const DOT_CLASS: Record<string, string> = {
  khatma: "bg-f-khatma",
  prep: "bg-f-prep",
  new: "bg-f-new",
  near: "bg-f-near",
  far: "bg-f-far",
};

function FortressCard({
  title,
  hint,
  tone,
  children,
}: {
  title: string;
  hint: string;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="surface-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-muted-foreground">{hint}</span>
        <h3 className="font-bold text-lg flex items-center gap-2">
          {title}
          <span className={`w-2.5 h-2.5 rounded-full ${DOT_CLASS[tone] ?? DOT_CLASS.new}`} aria-hidden />
        </h3>
      </div>
      <div className="space-y-3">{children}</div>
    </motion.div>
  );
}

function TaskRow({
  label,
  sub,
  checked,
  task,
  onCheck,
  icon,
  onSession,
}: {
  label: string;
  sub: string;
  checked: boolean;
  task: TaskType;
  onCheck: (task: TaskType, e: React.MouseEvent) => void;
  icon: React.ReactNode;
  onSession: () => void;
}) {
  return (
    <div className="bg-surface rounded-xl p-3.5 flex items-center gap-3">
      <TaskCheckbox
        checked={checked}
        label={label}
        onToggle={(e) => onCheck(task, e)}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm flex items-center gap-1.5 ${TONE[task === "khatma_recite" || task === "khatma_listen" ? "khatma" : task === "prep_weekly" ? "prep" : task === "review_near" ? "near" : task === "review_far" ? "far" : "new"]}`}>
          {icon}
          {label}
        </p>
        {sub && <p className="text-xs text-muted-foreground truncate mt-0.5">{sub}</p>}
      </div>
      {!checked && (
        <button
          type="button"
          onClick={() => {
            vibrateLight();
            onSession();
          }}
          className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-full px-3 py-1.5 shrink-0 transition-colors"
        >
          جلسة
        </button>
      )}
    </div>
  );
}

function MaintainCard() {
  const maintain = useHifzStore((s) => s.maintain);
  const dayTasks = useHifzStore((s) => s.completedTasks[s.currentDay]) || {};
  const currentDay = useHifzStore((s) => s.currentDay);
  const toggle = useHifzStore((s) => s.toggleTask);
  const arabic = useHifzStore((s) => s.settings.arabicNumerals);
  const openSession = useSessionStore((s) => s.open);
  const juz = ((maintain.day - 1) % 30) + 1;
  return (
    <div className="surface-card p-5">
      <h3 className="font-bold text-lg mb-1">الختمة التثبيتية</h3>
      <p className="text-xs text-muted-foreground mb-4">
        وردك اليومي للحفاظ على الرسوخ — جزء كل يوم
      </p>
      <div className="bg-surface rounded-xl p-3.5 flex items-center gap-3">
        <TaskCheckbox
          checked={!!dayTasks.maintain_recite}
          label="تم الورد التثبيتي"
          onToggle={(e) => {
            if (!dayTasks.maintain_recite) {
              const addEvent = useXpStore.getState().addEvent;
              addEvent(XP_TABLE.maintain_recite, e.clientX, e.clientY);
            }
            toggle(currentDay, "maintain_recite");
          }}
          size="sm"
        />
        <div className="flex-1">
          <p className="font-bold text-sm">تلاوة الجزء {formatNum(juz, arabic)}</p>
        </div>
        {!dayTasks.maintain_recite && (
          <button
            type="button"
            onClick={() =>
              openSession({
                kind: "maintain_recite",
                day: currentDay,
                thumuns: [],
                reciteJuzs: [juz],
              })
            }
            className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-full px-3 py-1.5"
          >
            جلسة
          </button>
        )}
      </div>
    </div>
  );
}
