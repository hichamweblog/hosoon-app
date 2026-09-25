"use client";

import { Button } from "@/components/ui/button";
import { formatNum } from "@/lib/format";
import { ensureNotificationPermission } from "@/lib/reminders";
import { useHifzStore } from "@/store/useHifzStore";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  Castle,
  Flame,
  Shield,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const completeOnboarding = useHifzStore((s) => s.completeOnboarding);
  const arabic = useHifzStore((s) => s.settings.arabicNumerals);
  const [startAt, setStartAt] = useState(0);
  const [reminderTime, setReminderTime] = useState("05:30");

  const steps = [
    {
      icon: <Sparkles className="w-12 h-12 text-f-gold" />,
      title: "بسم الله الرحمن الرحيم",
      body: (
        <p className="text-muted-foreground leading-relaxed text-lg">
          مرحباً بك في حصون — منظومة تنظيم حفظ القرآن الكريم بطريقة الحصون الخمسة، وفق
          التقسيم المعتمد في المصاحف المغاربية (رواية ورش عن نافع): 480 ثُمناً في 480 يوماً.
        </p>
      ),
    },
    {
      icon: <Shield className="w-12 h-12 text-f-khatma" />,
      title: "ما هي الحصون الخمسة؟",
      body: (
        <p className="text-muted-foreground leading-relaxed text-lg">
          خمسة حصون تحمي حفظك من النسيان: <b>الختمة</b> (تلاوة جزء واستماع حزب)،{" "}
          <b>التحضير</b> (أسبوعي وليلي وقبلي)، <b>الحفظ الجديد</b>، <b>مراجعة القريب</b>، و{" "}
          <b>مراجعة البعيد</b>.
        </p>
      ),
    },
    {
      icon: <BookOpen className="w-12 h-12 text-f-new" />,
      title: "المقرر اليومي",
      body: (
        <p className="text-muted-foreground leading-relaxed text-lg">
          تحفظ ثُمناً يومياً (ثُمن الحزب — يبدأ من الفاتحة وينتهي بخاتمة الناس). بهذه الوتيرة
          تختم القرآن كاملاً في 480 يوماً بإذن الله، وكل ثُمن له حدوده المعتمدة بالسورة
          والآية.
        </p>
      ),
    },
    {
      icon: <Castle className="w-12 h-12 text-f-prep" />,
      title: "أين أنت من الرحلة؟",
      body: (
        <div className="space-y-4">
          <p className="text-muted-foreground">إذا كنت قد حفظت سابقاً، حدّد آخر ثُمن أتممت حفظه:</p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={479}
              value={startAt}
              onChange={(e) => setStartAt(Number(e.target.value))}
              className="flex-1 accent-[var(--primary)]"
              aria-label="عدد الأثمان المحفوظة سابقاً"
            />
            <span className="font-bold text-lg w-24 text-center">
              {formatNum(startAt, arabic)} ثمناً
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            سنعلّم الأثمان السابقة كمنجزة وتبدأ من الثمن التالي مباشرة.
          </p>
        </div>
      ),
    },
    {
      icon: <Bell className="w-12 h-12 text-f-near" />,
      title: "تذكير يومي",
      body: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            الاستمرار سر الرسوخ. اختر وقتاً يناسبك لنذكّرك بوردك اليومي:
          </p>
          <div className="flex items-center justify-center gap-3">
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="bg-background border border-border rounded-xl px-4 py-2.5 text-lg font-bold"
              aria-label="وقت التذكير"
            />
            <Button
              variant="outline"
              onClick={async () => {
                const ok = await ensureNotificationPermission();
                if (!ok) alert("لم يُسمح بالإشعارات — يمكنك تفعيلها لاحقاً من الإعدادات");
              }}
            >
              تفعيل الإشعارات
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            يعمل التذكير ما دام التطبيق مفتوحاً أو مثبتاً كتطبيق (PWA). تقدر على تغييره في
            الإعدادات متى شئت.
          </p>
        </div>
      ),
    },
    {
      icon: <Flame className="w-12 h-12 text-orange-500" />,
      title: "هل أنت جاهز؟",
      body: (
        <p className="text-muted-foreground leading-relaxed text-lg">
          أكمل حصونك كل يوم وابنِ سلسلة إنجاز متصلة. تتبع تقدمك، واحصل على أوسمة عند كل
          محطة، وشارك فرحة الختمة مع أحبابك.
        </p>
      ),
    },
  ];

  const isLast = step === steps.length - 1;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 relative z-10" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg"
      >
        <div className="surface-card p-8 shadow-2xl border border-primary/15 rounded-[28px] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.3 }}
              className="text-center space-y-6"
            >
              <div className="flex justify-center">{steps[step].icon}</div>
              <h2 className="text-2xl font-bold text-primary">{steps[step].title}</h2>
              {steps[step].body}
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-center gap-2 mt-8 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                aria-hidden
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step ? "w-8 bg-primary" : i < step ? "w-2 bg-primary/50" : "w-2 bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3 justify-center">
            {step > 0 && (
              <Button variant="ghost" onClick={() => setStep(step - 1)} className="gap-2">
                <ArrowRight className="w-4 h-4" aria-hidden />
                السابق
              </Button>
            )}
            <Button
              onClick={() => {
                if (isLast) {
                  void ensureNotificationPermission();
                  completeOnboarding({ startAtDay: startAt, reminderTime });
                } else {
                  setStep(step + 1);
                }
              }}
              className={`gap-2 px-8 ${isLast ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
            >
              {isLast ? (
                <>
                  ابدأ رحلتك <ArrowLeft className="w-4 h-4" aria-hidden />
                </>
              ) : (
                <>
                  التالي <ArrowLeft className="w-4 h-4" aria-hidden />
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
