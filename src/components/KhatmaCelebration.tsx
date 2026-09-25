"use client";

import { formatNum } from "@/lib/format";
import { vibrateSuccess } from "@/lib/haptic";
import { useHifzStore } from "@/store/useHifzStore";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { BookHeart, Share2, Sparkles, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";

export default function KhatmaCelebration() {
  const khatmaCompletedAt = useHifzStore((s) => s.khatmaCompletedAt);
  const startMaintainMode = useHifzStore((s) => s.startMaintainMode);
  const resetProgress = useHifzStore((s) => s.resetProgress);
  const totalXp = useHifzStore((s) => s.totalXp);
  const bestStreak = useHifzStore((s) => s.bestStreak);
  const arabic = useHifzStore((s) => s.settings.arabicNumerals);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const celebrated = useRef(false);

  const show = khatmaCompletedAt !== null && dismissed !== khatmaCompletedAt;

  useEffect(() => {
    if (show && !celebrated.current) {
      celebrated.current = true;
      vibrateSuccess();
      const burst = (x: number) =>
        confetti({ particleCount: 90, spread: 75, origin: { x, y: 0.55 }, colors: ["#B8893C", "#3C8268", "#F5E6C8"] });
      burst(0.3);
      setTimeout(() => burst(0.7), 350);
    }
    if (!show) celebrated.current = false;
  }, [show, khatmaCompletedAt]);

  if (!show || !khatmaCompletedAt) return null;

  const share = async () => {
    const text = `ختمتُ القرآن الكريم في مشروع حصون! الحمد لله. ${formatNum(bestStreak, arabic)} يوماً من السلسلة و${formatNum(totalXp, arabic)} نقطة خبرة. «وَفِي ذَٰلِكَ فَلْيَتَنَافَسِ الْمُتَنَافِسُونَ»`;
    try {
      if (navigator.share) await navigator.share({ title: "حصون", text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success("تم نسخ خبر الختمة — شاركه مع أحبابك");
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div
      className="fixed inset-0 z-[130] bg-background/85 backdrop-blur-sm flex items-center justify-center p-4"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="ختامة الختمة"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="bg-surface rounded-3xl p-8 w-full max-w-md text-center border border-f-gold/40 shadow-2xl space-y-5"
      >
        <div className="w-20 h-20 mx-auto rounded-full bg-f-gold/15 flex items-center justify-center">
          <BookHeart className="w-10 h-10 text-f-gold" aria-hidden />
        </div>
        <h2 className="text-3xl font-extrabold">ختمتَ القرآن — بارك الله فيك</h2>
        <p className="text-muted-foreground leading-relaxed">
          «يُقَالُ لِصَاحِبِ الْقُرْآنِ: اقْرَأْ وَارْتَقِ وَرَتِّلْ كَمَا كُنْتَ تُرَتِّلُ فِي
          الدُّنْيَا» — تقبّل الله منك ومنّ عليك بالثبات.
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="أيام الرحلة" value={formatNum(480, arabic)} />
          <Stat label="أفضل سلسلة" value={formatNum(bestStreak, arabic)} />
          <Stat label="نقاط الخبرة" value={formatNum(totalXp, arabic)} />
        </div>
        <div className="space-y-2.5">
          <Button className="w-full h-12 rounded-xl font-bold" onClick={share}>
            <Share2 className="w-4 h-4 ml-2" aria-hidden /> شارك خبر الختمة
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl font-bold"
            onClick={() => {
              startMaintainMode();
              setDismissed(khatmaCompletedAt);
            }}
          >
            <Sun className="w-4 h-4 ml-2" aria-hidden /> ابدأ ختمة التثبيت (ورد يومي)
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground text-sm"
            onClick={() => {
              if (confirm("بدء رحلة حفظ جديدة؟ سيُعاد ضبط تقدم الرحلة الحالية.")) {
                resetProgress();
                setDismissed(null);
              }
            }}
          >
            <Sparkles className="w-3.5 h-3.5 ml-1" aria-hidden /> ابدأ رحلة حفظ جديدة
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background/50 rounded-xl p-3 border border-border/50">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
