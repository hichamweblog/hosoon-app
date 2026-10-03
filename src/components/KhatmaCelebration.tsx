"use client";
import { useEffect } from "react";
import { BookHeart } from "lucide-react";
import { useHifzStore } from "@/store/useHifzStore";
import { celebrate } from "@/lib/effects";
import { AppModal } from "./ui/app-modal";
import { Button } from "./ui/button";
import { toast } from "sonner";

export default function KhatmaCelebration() {
  const state = useHifzStore(), event = state.khatmaCompletedAt;
  useEffect(() => { if (event && event !== state.celebrationSeenAt) void celebrate(); }, [event, state.celebrationSeenAt]);
  if (!event || state.celebrationSeenAt === event) return null;
  const share = async () => {
    const text = "الحمد لله، وثّقت حفظ جميع أثمان القرآن في حصون — رواية ورش عن نافع. اللهم ارزقني الرسوخ والعمل به.";
    try { if (navigator.share) await navigator.share({ title: "حصون", text }); else { await navigator.clipboard.writeText(text); toast.success("نُسخ خبر الختمة"); } } catch { /* User cancelled. */ }
  };
  return <AppModal title="بارك الله في حفظك" onClose={state.dismissCelebration} className="max-w-md">
    <div className="p-6 space-y-4 text-center"><BookHeart className="size-14 text-f-gold mx-auto" aria-hidden /><h2 className="text-2xl font-bold">وثّقت حفظ القرآن كاملًا</h2><p className="text-sm text-muted-foreground leading-relaxed">جميع 480 ثمنًا محفوظة، دون فجوات. العدد يصف الأثمان لا أيام الدراسة ولا شهادة إتقان. تعاهد حفظك وراجعه مع شيخك.</p><Button className="w-full min-h-12" onClick={() => { state.startMaintainMode(); state.dismissCelebration(); toast.success("فُعّلت مرحلة التثبيت؛ ورد مؤرخ مستقل وسجلات الرحلة محفوظة"); }}>ابدأ مرحلة التثبيت</Button><Button variant="outline" className="w-full min-h-12" onClick={share}>شارك الخبر</Button><Button variant="ghost" className="w-full min-h-11" onClick={state.dismissCelebration}>العودة إلى وردي</Button></div>
  </AppModal>;
}
