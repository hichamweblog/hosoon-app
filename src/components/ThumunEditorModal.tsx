"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { useHifzStore } from "@/store/useHifzStore";
import { Thumun } from "@/lib/fortress-calculator";

interface Props {
  thumun: Thumun;
  onClose: () => void;
}

export default function ThumunEditorModal({ thumun, onClose }: Props) {
  const { editThumun } = useHifzStore();
  const [startAyah, setStartAyah] = useState(thumun.startAyah.toString());
  const [endAyah, setEndAyah] = useState(thumun.endAyah.toString());
  const [startText, setStartText] = useState(thumun.startText);

  const handleSave = () => {
    editThumun(thumun.id, {
      startAyah: parseInt(startAyah) || thumun.startAyah,
      endAyah: parseInt(endAyah) || thumun.endAyah,
      startText: startText.trim() || thumun.startText,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95" dir="rtl">
      <div className="bg-card w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-border/50 relative">
        <h2 className="text-xl font-bold mb-4">تصحيح الثمن {thumun.id}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          السورة: {thumun.surah}
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold">آية البداية</label>
            <input
              type="number"
              value={startAyah}
              onChange={(e) => setStartAyah(e.target.value)}
              className="w-full bg-background border border-border/50 rounded-xl px-3 py-2 outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">آية النهاية</label>
            <input
              type="number"
              value={endAyah}
              onChange={(e) => setEndAyah(e.target.value)}
              className="w-full bg-background border border-border/50 rounded-xl px-3 py-2 outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">نص البداية (اختياري)</label>
            <textarea
              value={startText}
              onChange={(e) => setStartText(e.target.value)}
              rows={2}
              className="w-full bg-background border border-border/50 rounded-xl px-3 py-2 outline-none focus:border-primary transition-colors resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button className="flex-1 h-12 rounded-xl" onClick={handleSave}>
            حفظ التعديل
          </Button>
          <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={onClose}>
            إلغاء
          </Button>
        </div>
      </div>
    </div>
  );
}
