"use client";

import { XP_TABLE } from "@/lib/constants";
import { formatNum } from "@/lib/format";
import { playDing, vibrateLight } from "@/lib/haptic";
import { getFortressTasks } from "@/lib/fortress-calculator";
import { thumunRangeLabel, thumunTitle } from "@/lib/quran-labels";
import { isDayCompleted, useHifzStore } from "@/store/useHifzStore";
import { useSessionStore } from "@/store/useSessionStore";
import { useXpStore } from "@/store/useXpStore";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import {
  BookOpen,
  CheckCircle2,
  Edit2,
  History,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import ThumunEditorModal from "./ThumunEditorModal";

interface Props {
  day: number;
  onClose: () => void;
}

export default function DayPreviewModal({ day, onClose }: Props) {
  const completedTasks = useHifzStore((s) => s.completedTasks);
  const toggleDayCompletion = useHifzStore((s) => s.toggleDayCompletion);
  const editedThumuns = useHifzStore((s) => s.editedThumuns);
  const notes = useHifzStore((s) => s.notes);
  const setNote = useHifzStore((s) => s.setNote);
  const currentDay = useHifzStore((s) => s.currentDay);
  const thumunRatings = useHifzStore((s) => s.thumunRatings);
  const settings = useHifzStore((s) => s.settings);
  const addEvent = useXpStore((s) => s.addEvent);
  const openSession = useSessionStore((s) => s.open);
  const tasks = getFortressTasks(day, {
    edited: editedThumuns,
    weakIds: Object.entries(thumunRatings)
      .filter(([, v]) => v === "weak")
      .map(([k]) => Number(k)),
    maintain: false,
  });
  const dayEntry = completedTasks[day];
  const isCompleted = isDayCompleted(dayEntry);
  const [editingThumun, setEditingThumun] = useState<typeof tasks.newHifz>(null);
  const [noteDraft, setNoteDraft] = useState(notes[tasks.newHifz?.id ?? 0] ?? "");
  const arabic = settings.arabicNumerals;
  const canToggleDay = day <= currentDay;

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const target = tasks.newHifz;

  return (
    <div
      className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={`خطة الثمن ${day}`}
    >
      <div className="bg-surface rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto relative border border-border shadow-xl space-y-5">
        <div className="flex items-center justify-between sticky top-0 bg-surface/90 backdrop-blur-md pb-2 z-10 border-b border-border/50">
          <h2 className="font-bold text-xl flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">
              {formatNum(day, arabic)}
            </span>
            خطة الثمن
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full" aria-label="إغلاق">
            <X className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>

        {/* الحفظ الجديد */}
        <div className="space-y-3">
          <h3 className="font-bold text-f-new flex items-center gap-2">
            <Sparkles className="w-4 h-4" aria-hidden /> الحفظ الجديد
          </h3>
          {target ? (
            <div className="bg-background rounded-xl p-4 border border-border/50">
              <div className="flex justify-between items-center pb-2 border-b border-border/50">
                <span className="text-muted-foreground text-sm">{thumunTitle(target, arabic)}</span>
                <button
                  onClick={() => setEditingThumun(target)}
                  aria-label="تصحيح بيانات الثمن"
                  className="p-1.5 hover:bg-muted rounded-full transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
                </button>
              </div>
              <div className="pt-3 font-quran text-lg leading-loose">
                {target.partialStart ? "…" : ""}
                {target.text}
              </div>
              <p className="text-xs text-muted-foreground mt-3">{thumunRangeLabel(target, arabic)}</p>
            </div>
          ) : (
            <div className="bg-background rounded-xl p-4 border border-border/50 text-center text-muted-foreground">
              محطة مراجعة فقط — لا حفظ جديد
            </div>
          )}
        </div>

        {/* مراجعة القريب */}
        <ReviewSection
          title="مراجعة القريب"
          tone="text-f-near"
          icon={<History className="w-4 h-4" aria-hidden />}
          from={
            tasks.reviewNear.length
              ? tasks.reviewNear[tasks.reviewNear.length - 1]
              : null
          }
          to={tasks.reviewNear[0] ?? null}
          onSession={
            tasks.reviewNear.length
              ? () => {
                  openSession({ kind: "review_near", day, thumuns: tasks.reviewNear });
                  onClose();
                }
              : undefined
          }
          arabic={arabic}
        />

        {/* مراجعة البعيد */}
        <ReviewSection
          title="مراجعة البعيد"
          tone="text-f-far"
          icon={<BookOpen className="w-4 h-4" aria-hidden />}
          from={tasks.reviewFar?.start ?? null}
          to={tasks.reviewFar?.end ?? null}
          onSession={
            tasks.reviewFar
              ? () => {
                  openSession({ kind: "review_far", day, thumuns: tasks.reviewFar!.list });
                  onClose();
                }
              : undefined
          }
          arabic={arabic}
        />

        {/* ملاحظات */}
        {target && (
          <div className="space-y-2">
            <label htmlFor="thumun-note" className="font-bold text-sm flex items-center gap-2">
              ملاحظاتي على الثمن
            </label>
            <textarea
              id="thumun-note"
              rows={2}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onBlur={() => setNote(target.id, noteDraft.trim())}
              placeholder="مشكلة وقفت عندها، أو تذكير بمكان الترديد…"
              className="w-full bg-background border border-border/50 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary transition-colors resize-none"
            />
          </div>
        )}

        <div className="flex gap-3">
          <Button
            disabled={!canToggleDay}
            className={`flex-1 h-12 rounded-xl text-md font-bold transition-all ${
              isCompleted
                ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
            onClick={(e) => {
              vibrateLight();
              if (!isCompleted) {
                playDing();
                addEvent(XP_TABLE.day_bonus, e.clientX, e.clientY);
              }
              toggleDayCompletion(day);
            }}
            title={canToggleDay ? undefined : "لا يمكن إتمام يوم لم يحن وقته بعد"}
          >
            {isCompleted ? (
              <>
                <RotateCcw className="w-5 h-5 ml-2" aria-hidden /> التراجع عن الإنجاز
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 ml-2" aria-hidden /> تحديد كمكتمل
              </>
            )}
          </Button>
          <Button variant="outline" className="flex-1 h-12 rounded-xl text-md font-bold" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>

      {editingThumun && (
        <ThumunEditorModal thumun={editingThumun} onClose={() => setEditingThumun(null)} />
      )}
    </div>
  );
}

function ReviewSection({
  title,
  tone,
  icon,
  from,
  to,
  onSession,
  arabic,
}: {
  title: string;
  tone: string;
  icon: React.ReactNode;
  from: { id: number; text: string } | null;
  to: { id: number; text: string } | null;
  onSession?: () => void;
  arabic: boolean;
}) {
  return (
    <div className="space-y-3">
      <h3 className={`font-bold ${tone} flex items-center gap-2`}>
        {icon} {title}
      </h3>
      <div className="bg-background rounded-xl p-4 border border-border/50 space-y-2 text-sm">
        {from && to ? (
          <>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">من ثمن {formatNum(from.id, arabic)}</span>
              <span className="font-semibold font-quran truncate max-w-[60%]">{from.text.slice(0, 24)}…</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-border/40">
              <span className="text-muted-foreground">إلى ثمن {formatNum(to.id, arabic)}</span>
              <span className="font-semibold font-quran truncate max-w-[60%]">{to.text.slice(0, 24)}…</span>
            </div>
            {onSession && (
              <button
                onClick={onSession}
                className="w-full mt-2 py-2.5 rounded-xl font-bold text-sm bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                بدء الجلسة
              </button>
            )}
          </>
        ) : (
          <p className="text-center text-muted-foreground py-2">لا شيء هنا اليوم</p>
        )}
      </div>
    </div>
  );
}
