"use client";

import { getFortressTasks } from "@/lib/fortress-calculator";
import { X, BookOpen, History, Sparkles } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  day: number;
  farReviewPointer: number;
  onClose: () => void;
}

export default function DayPreviewModal({ day, farReviewPointer, onClose }: Props) {
  const tasks = getFortressTasks(day, farReviewPointer);

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95" dir="rtl">
      <div className="bg-surface rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto relative border border-border shadow-xl space-y-6">
        <div className="flex items-center justify-between sticky top-0 bg-surface/90 backdrop-blur-md pb-2 z-10 border-b border-border/50">
          <h2 className="font-bold text-xl flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">
              {day}
            </span>
            خطة اليوم
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>

        {/* ─── الحفظ الجديد ─── */}
        {tasks.newHifz ? (
          <div className="space-y-3">
            <h3 className="font-bold text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> الحفظ الجديد
            </h3>
            <div className="bg-background rounded-xl p-4 border border-border/50">
              <p className="font-bold">{tasks.newHifz.surah}</p>
              <p className="text-sm text-muted-foreground mt-1">
                الجزء {tasks.newHifz.juz} · الحزب {tasks.newHifz.hizb} · الثمن {tasks.newHifz.id}
              </p>
              {tasks.newHifz.startText && (
                <p className="font-quran text-foreground/80 leading-loose mt-2">
                  &quot;{tasks.newHifz.startText}&quot;
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="font-bold text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> الحفظ الجديد
            </h3>
            <div className="bg-background rounded-xl p-4 border border-border/50 text-center text-muted-foreground">
              يوم مراجعة فقط
            </div>
          </div>
        )}

        {/* ─── مراجعة القريب ─── */}
        <div className="space-y-3">
          <h3 className="font-bold text-emerald-500 flex items-center gap-2">
            <History className="w-4 h-4" /> مراجعة القريب
          </h3>
          <div className="bg-background rounded-xl p-4 border border-border/50">
            {tasks.reviewNear.length > 0 ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center pb-2 border-b border-border/50">
                  <span className="text-muted-foreground">من بداية</span>
                  <span className="font-semibold">{tasks.reviewNear[tasks.reviewNear.length - 1].surah} (ثمن {tasks.reviewNear[tasks.reviewNear.length - 1].id})</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-muted-foreground">إلى نهاية</span>
                  <span className="font-semibold">{tasks.reviewNear[0].surah} (ثمن {tasks.reviewNear[0].id})</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-center text-muted-foreground">لا يوجد مراجعة قريب</p>
            )}
          </div>
        </div>

        {/* ─── مراجعة البعيد ─── */}
        <div className="space-y-3">
          <h3 className="font-bold text-indigo-500 flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> مراجعة البعيد
          </h3>
          <div className="bg-background rounded-xl p-4 border border-border/50">
            {tasks.reviewFar ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center pb-2 border-b border-border/50">
                  <span className="text-muted-foreground">من بداية</span>
                  <span className="font-semibold">{tasks.reviewFar.start.surah} (ثمن {tasks.reviewFar.start.id})</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-muted-foreground">إلى نهاية</span>
                  <span className="font-semibold">{tasks.reviewFar.end.surah} (ثمن {tasks.reviewFar.end.id})</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-center text-muted-foreground">لا يوجد مراجعة بعيد</p>
            )}
          </div>
        </div>

        <Button className="w-full h-12 rounded-xl text-md font-bold" onClick={onClose}>
          إغلاق
        </Button>
      </div>
    </div>
  );
}
