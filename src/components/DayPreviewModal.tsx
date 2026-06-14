"use client";

import { getFortressTasks } from "@/lib/fortress-calculator";
import { useHifzStore } from "@/store/useHifzStore";
import { vibrateLight, playDing } from "@/lib/haptic";
import { X, BookOpen, History, Sparkles, CheckCircle2, RotateCcw, Edit2 } from "lucide-react";
import { useXpStore } from "@/store/useXpStore";
import { Button } from "./ui/button";
import { useState } from "react";
import ThumunEditorModal from "./ThumunEditorModal";

interface Props {
  day: number;
  farReviewPointer: number;
  onClose: () => void;
}

export default function DayPreviewModal({ day, farReviewPointer, onClose }: Props) {
  const { completedTasks, toggleDayCompletion, editedThumuns, addXp } = useHifzStore();
  const { addEvent } = useXpStore();
  const tasks = getFortressTasks(day, farReviewPointer, editedThumuns);
  const isCompleted = completedTasks[day] !== undefined && Object.values(completedTasks[day]).some(Boolean);
  const [editingThumun, setEditingThumun] = useState<any>(null);

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95" dir="rtl">
      <div className="bg-surface rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto relative border border-border shadow-xl space-y-6">
        <div className="flex items-center justify-between sticky top-0 bg-surface/90 backdrop-blur-md pb-2 z-10 border-b border-border/50">
          <h2 className="font-bold text-xl flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">
              {day}
            </span>
            خطة الثمن
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
              <div className="flex justify-between items-center pb-2 border-b border-border/50">
                <span className="text-muted-foreground">الثمن {tasks.newHifz.id}</span>
                <button 
                  onClick={() => setEditingThumun(tasks.newHifz)}
                  className="p-1 hover:bg-black/5 rounded-full transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
              <div className="pt-2 text-center text-lg font-amiri font-bold leading-loose">
                {tasks.newHifz.startText}...
              </div>
              <div className="flex justify-between items-center pt-2 text-xs text-muted-foreground border-t border-border/50 mt-2">
                <span>{tasks.newHifz.surah}</span>
                <span>الآيات {tasks.newHifz.startAyah} - {tasks.newHifz.endAyah}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="font-bold text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> الحفظ الجديد
            </h3>
            <div className="bg-background rounded-xl p-4 border border-border/50 text-center text-muted-foreground">
              محطة مراجعة فقط
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

        <div className="flex gap-3">
          <Button 
            className={`flex-1 h-12 rounded-xl text-md font-bold transition-all ${
               isCompleted 
                 ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                 : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(79,157,126,0.3)]"
            }`}
            onClick={(e) => {
              vibrateLight();
              if (!isCompleted) {
                playDing();
                addEvent(100, e.clientX, e.clientY);
                addXp(100);
              }
              toggleDayCompletion(day);
            }}
          >
            {isCompleted ? <><RotateCcw className="w-5 h-5 ml-2" /> التراجع عن الإنجاز</> : <><CheckCircle2 className="w-5 h-5 ml-2" /> تحديد كمكتمل</>}
          </Button>
          <Button variant="outline" className="flex-1 h-12 rounded-xl text-md font-bold" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>

      {editingThumun && (
        <ThumunEditorModal 
          thumun={editingThumun} 
          onClose={() => setEditingThumun(null)} 
        />
      )}
    </div>
  );
}
