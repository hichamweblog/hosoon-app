'use client';

import { useState } from 'react';
import { useHifzStore } from '@/store/useHifzStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Shield, Star, ArrowRight, Sparkles } from 'lucide-react';

const steps = [
  {
    icon: <Sparkles className="w-12 h-12 text-[#D4A853]" />,
    title: 'بسم الله الرحمن الرحيم',
    description: 'مرحباً بك في تطبيق حصون لتنظيم حفظ القرآن الكريم بطريقة الحصون الخمسة للشيخ سعيد أبو العلا حمزة.',
  },
  {
    icon: <Shield className="w-12 h-12 text-[#38BDF8]" />,
    title: 'ما هي الحصون الخمسة؟',
    description: 'خمسة حصون تحمي حفظك من النسيان: الختمة (تلاوة واستماع)، التحضير (أسبوعي وليلي وقبلي)، الحفظ الجديد، مراجعة القريب، ومراجعة البعيد.',
  },
  {
    icon: <BookOpen className="w-12 h-12 text-[#FBBF24]" />,
    title: 'المقرر اليومي',
    description: 'ستحفظ ثُمن حزب يومياً (⅛ حزب). بهذه الوتيرة ستختم القرآن كاملاً في حوالي 480 يوماً بإذن الله تعالى.',
  },
  {
    icon: <Star className="w-12 h-12 text-[#34D399]" />,
    title: 'هل أنت جاهز؟',
    description: 'أكمل حصونك الخمسة كل يوم واحصل على سلسلة إنجاز متصلة. تتبع تقدمك واحصل على أوسمة عند كل إنجاز!',
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const completeOnboarding = useHifzStore((s) => s.completeOnboarding);

  const isLast = step === steps.length - 1;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg"
      >
        <Card className="border-primary/20 shadow-2xl overflow-hidden">
          <CardContent className="p-8">
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
                <h2 className="text-2xl font-bold text-primary">
                  {steps[step].title}
                </h2>
                <p className="text-muted-foreground leading-relaxed text-lg">
                  {steps[step].description}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Step indicators */}
            <div className="flex justify-center gap-2 mt-8 mb-6">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === step
                      ? 'w-8 bg-primary'
                      : i < step
                      ? 'w-2 bg-primary/50'
                      : 'w-2 bg-muted'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-3 justify-center">
              {step > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => setStep(step - 1)}
                  className="gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  السابق
                </Button>
              )}
              <Button
                onClick={() => {
                  if (isLast) {
                    completeOnboarding();
                  } else {
                    setStep(step + 1);
                  }
                }}
                className={`gap-2 px-8 ${
                  isLast
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : ''
                }`}
              >
                {isLast ? '🏰 ابدأ رحلتك' : 'التالي'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
