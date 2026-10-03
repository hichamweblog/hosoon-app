"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Shield } from "lucide-react";
import { useHifzStore } from "@/store/useHifzStore";
import { formatNum } from "@/lib/format";
import { Button } from "./ui/button";
import PriorSelection from "./PriorSelection";

export default function Onboarding() {
  const [step, setStep] = useState(0), [selected, setSelected] = useState<Set<number>>(new Set());
  const arabic = useHifzStore((s) => s.settings.arabicNumerals);
  const complete = useHifzStore((s) => s.completeOnboarding);
  const titles = ["رحلة هادئة مع القرآن", "ما المحفوظ لديك؟", "ورد واضح، على وتيرتك"];
  return <main className="min-h-[100dvh] grid place-items-center p-4" dir="rtl">
    <section className="surface-card p-5 sm:p-8 w-full max-w-lg space-y-5" aria-label="تهيئة حصون">
      <div className="flex items-center justify-between"><span className="font-bold text-primary">حصون · رواية ورش</span><span className="text-sm text-muted-foreground">{formatNum(step + 1, arabic)} / {formatNum(3, arabic)}</span></div>
      <h1 className="text-2xl sm:text-3xl font-bold">{titles[step]}</h1>
      {step === 0 && <div className="space-y-4">
        <Shield className="size-10 text-primary" aria-hidden />
        <p className="text-muted-foreground leading-relaxed">الحصون الخمسة تجمع التلاوة والاستماع والتحضير والحفظ والمراجعة. ابدأ بثمن واحد، وخذ وقتك في إتقانه.</p>
        <p className="leading-relaxed">وردك يتجدد كل يوم، ومحطة الحفظ تتقدم عند الإتقان. التعثر في ثمن لا يوقف التلاوة والمراجعة.</p>
        <p className="text-sm text-muted-foreground">التقدم محفوظ على جهازك أولًا. يمكنك تصديره أو مزامنته بحساب اختياري لاحقًا.</p>
      </div>}
      {step === 1 && <PriorSelection selected={selected} onChange={setSelected} arabic={arabic} />}
      {step === 2 && <div className="space-y-4">
        <BookOpen className="size-10 text-primary" aria-hidden />
        <p>ستبدأ من أول ثمن غير محفوظ، مع احتساب {formatNum(selected.size, arabic)} ثمناً محفوظًا سابقًا.</p>
        <p className="text-sm text-muted-foreground leading-relaxed">480 ثمنًا لا تعني 480 يومًا مضمونة؛ المدة تعتمد على أيام الدراسة والإتقان. يمكنك تخصيص الوتيرة واختيار «اليوم للمراجعة» عند الحاجة.</p>
        <p className="text-sm text-muted-foreground">التذكير اختياري لاحقًا في الإعدادات، ويعمل أفضل جهد أثناء فتح التطبيق فقط. لن نطلب إذن الإشعارات الآن.</p>
      </div>}
      <footer className="flex items-center gap-3 pt-3 border-t border-border">
        {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)}><ArrowRight className="size-4" aria-hidden /> السابق</Button>}
        <Button className="flex-1 min-h-12 font-bold" onClick={() => { if (step < 2) setStep(step + 1); else complete({ memorizedIds: [...selected], reminderTime: null }); }}>{step === 2 ? "ابدأ وردي" : "التالي"}<ArrowLeft className="size-4" aria-hidden /></Button>
      </footer>
    </section>
  </main>;
}
