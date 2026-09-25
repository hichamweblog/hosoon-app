"use client";

import { submitThumunCorrection } from "@/lib/supabase";
import { getAllSurahs, type Thumun } from "@/lib/quran-data";
import { thumunRangeLabel } from "@/lib/quran-labels";
import { useHifzStore } from "@/store/useHifzStore";
import { Button } from "./ui/button";
import { Send, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  thumun: Thumun;
  onClose: () => void;
}

export default function ThumunEditorModal({ thumun, onClose }: Props) {
  const editThumun = useHifzStore((s) => s.editThumun);
  const settings = useHifzStore((s) => s.settings);
  const surahs = getAllSurahs();
  const [startSura, setStartSura] = useState(String(thumun.startSura));
  const [startAya, setStartAya] = useState(String(thumun.startAya));
  const [endSura, setEndSura] = useState(String(thumun.endSura));
  const [endAya, setEndAya] = useState(String(thumun.endAya));
  const [text, setText] = useState(thumun.text);

  const handleSave = () => {
    editThumun(thumun.id, {
      startSura: parseInt(startSura) || thumun.startSura,
      startAya: parseInt(startAya) || thumun.startAya,
      endSura: parseInt(endSura) || thumun.endSura,
      endAya: parseInt(endAya) || thumun.endAya,
      text: text.trim() || thumun.text,
    });
    toast.success(`حُفظ تصحيح الثمن ${thumun.id} على هذا الجهاز`);
    onClose();
  };

  const handleSuggest = async () => {
    const fields = {
      startSura: parseInt(startSura) || thumun.startSura,
      startAya: parseInt(startAya) || thumun.startAya,
      endSura: parseInt(endSura) || thumun.endSura,
      endAya: parseInt(endAya) || thumun.endAya,
      text: text.trim(),
    };
    const { error } = await submitThumunCorrection({
      thumunId: thumun.id,
      fields,
      note: "اقتراح تصحيح من المستخدم",
    });
    if (error && typeof error === "object" && "message" in error) {
      toast.error("تعذّر إرسال الاقتراح: " + error.message);
    } else {
      toast.success("أُرسل الاقتراح للمراجعة — جزاك الله خيراً");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[150] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={`تصحيح الثمن ${thumun.id}`}
    >
      <div className="bg-card w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-border/50 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          aria-label="إغلاق"
          className="absolute left-4 top-4 p-1 rounded-full hover:bg-muted"
        >
          <X className="w-4 h-4 text-muted-foreground" aria-hidden />
        </button>
        <h2 className="text-xl font-bold mb-1">تصحيح الثمن {thumun.id}</h2>
        <p className="text-xs text-muted-foreground mb-4">
          {thumunRangeLabel(thumun, settings.arabicNumerals)}
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold" htmlFor="ed-start-sura">
                سورة البداية
              </label>
              <select
                id="ed-start-sura"
                value={startSura}
                onChange={(e) => setStartSura(e.target.value)}
                className="w-full bg-background border border-border/50 rounded-xl px-3 py-2 outline-none focus:border-primary transition-colors"
              >
                {surahs.map((s) => (
                  <option key={s.number} value={s.number}>
                    {s.number}. {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold" htmlFor="ed-start-aya">
                آية البداية
              </label>
              <input
                id="ed-start-aya"
                type="number"
                min={1}
                value={startAya}
                onChange={(e) => setStartAya(e.target.value)}
                className="w-full bg-background border border-border/50 rounded-xl px-3 py-2 outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold" htmlFor="ed-end-sura">
                سورة النهاية
              </label>
              <select
                id="ed-end-sura"
                value={endSura}
                onChange={(e) => setEndSura(e.target.value)}
                className="w-full bg-background border border-border/50 rounded-xl px-3 py-2 outline-none focus:border-primary transition-colors"
              >
                {surahs.map((s) => (
                  <option key={s.number} value={s.number}>
                    {s.number}. {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold" htmlFor="ed-end-aya">
                آية النهاية
              </label>
              <input
                id="ed-end-aya"
                type="number"
                min={1}
                value={endAya}
                onChange={(e) => setEndAya(e.target.value)}
                className="w-full bg-background border border-border/50 rounded-xl px-3 py-2 outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold" htmlFor="ed-text">
              مقتطف البداية (اختياري)
            </label>
            <textarea
              id="ed-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              className="w-full bg-background border border-border/50 rounded-xl px-3 py-2 outline-none focus:border-primary transition-colors resize-none font-quran"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button className="flex-1 h-12 rounded-xl" onClick={handleSave}>
            حفظ محلياً
          </Button>
          <Button variant="outline" className="h-12 rounded-xl" onClick={handleSuggest}>
            <Send className="w-4 h-4 ml-1" aria-hidden /> اقتراح للتصحيح
          </Button>
        </div>
      </div>
    </div>
  );
}
