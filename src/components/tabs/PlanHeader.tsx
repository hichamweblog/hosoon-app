"use client";

import { HelpCircle } from "lucide-react";
import { useState, type ReactNode } from "react";
import { AppModal } from "../ui/app-modal";

interface Props {
  title: string;
  description?: string;
  children?: ReactNode;
  helpTitle?: string;
  helpText?: string;
}

export default function PlanHeader({ title, description, children, helpTitle = "كيف أستخدم هذه الصفحة؟", helpText = "اختر محطة أو يومًا محفوظًا للمعاينة. المعاينة لا تسجّل إنجازًا ولا تغيّر الخطة؛ ابدأ جلسة من ورد اليوم عندما تريد تسجيل التقدم." }: Props) {
  const [helpOpen, setHelpOpen] = useState(false);
  return <>
    <header className="flex items-start gap-3 px-1">
      <div className="min-w-0 flex-1">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">{description}</p>}
      </div>
      <button type="button" className="size-10 shrink-0 rounded-xl border border-border bg-card text-muted-foreground grid place-items-center hover:text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring" aria-label="مساعدة" onClick={() => setHelpOpen(true)}>
        <HelpCircle className="size-5" aria-hidden />
      </button>
    </header>
    {children}
    {helpOpen && <AppModal title={helpTitle} onClose={() => setHelpOpen(false)} className="max-w-sm">
      <div className="p-5 space-y-4 text-sm leading-relaxed">
        <p>{helpText}</p>
        <button type="button" className="w-full min-h-11 rounded-xl bg-primary text-primary-foreground font-semibold" onClick={() => setHelpOpen(false)}>فهمت</button>
      </div>
    </AppModal>}
  </>;
}
