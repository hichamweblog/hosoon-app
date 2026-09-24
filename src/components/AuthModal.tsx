"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { X, Mail, Lock, Sparkles, Loader2, Send } from "lucide-react";
import {
  signInWithEmailPassword,
  signUpWithEmailPassword,
  signInWithMagicLink,
  fetchProgressFromCloud,
  syncProgressToCloud,
  isSupabaseConfigured,
} from "@/lib/supabase";
import { useHifzStore } from "@/store/useHifzStore";
import { toast } from "sonner";
import { vibrateLight, vibrateSuccess } from "@/lib/haptic";

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AuthModal({ onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<"signin" | "signup" | "magic">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    currentDay, streak, bestStreak, totalXp,
    completedTasks, dailyLog, notes, editedThumuns,
    hydrateFromCloud,
  } = useHifzStore();

  const handleSyncAfterLogin = async () => {
    try {
      const { data: cloudData } = await fetchProgressFromCloud();
      if (cloudData) {
        // If cloud data has higher day or local has default day 1, merge from cloud
        if (cloudData.current_day >= currentDay) {
          hydrateFromCloud({
            currentDay: cloudData.current_day,
            streak: cloudData.streak,
            bestStreak: cloudData.best_streak,
            totalXp: cloudData.total_xp,
            completedTasks: cloudData.completed_tasks,
            dailyLog: cloudData.daily_log,
            notes: cloudData.notes,
            editedThumuns: cloudData.edited_thumuns,
          });
          toast.success("تم استرجاع تقدمك من السحابة بنجاح!");
        } else {
          // Local has more progress, push to cloud
          await syncProgressToCloud({
            currentDay, streak, bestStreak, totalXp,
            completedTasks, dailyLog, notes, editedThumuns,
          });
          toast.success("تم رفع تقدمك الحالي إلى السحابة بنجاح!");
        }
      } else {
        // No cloud data yet, save current local progress to cloud
        await syncProgressToCloud({
          currentDay, streak, bestStreak, totalXp,
          completedTasks, dailyLog, notes, editedThumuns,
        });
        toast.success("تم إنشاء نسختك السحابية الأولى بنجاح!");
      }
    } catch (e) {
      console.error("Sync error:", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("يرجى إدخال البريد الإلكتروني");
      return;
    }

    if (mode !== "magic" && !password) {
      toast.error("يرجى إدخال كلمة المرور");
      return;
    }

    if (!isSupabaseConfigured) {
      toast.error("مفاتيح Supabase غير مهيأة بعد في إعدادات البيئة (Environment Variables)");
      return;
    }

    setLoading(true);
    vibrateLight();

    try {
      if (mode === "signin") {
        const { error } = await signInWithEmailPassword(email, password);
        if (error) throw error;
        vibrateSuccess();
        toast.success("تم تسجيل الدخول بنجاح!");
        await handleSyncAfterLogin();
        onSuccess?.();
        onClose();
      } else if (mode === "signup") {
        const { error } = await signUpWithEmailPassword(email, password);
        if (error) throw error;
        vibrateSuccess();
        toast.success("تم إنشاء الحساب بنجاح!", {
          description: "تم ربط حسابك لحفظ تقدمك سحابياً.",
        });
        await handleSyncAfterLogin();
        onSuccess?.();
        onClose();
      } else if (mode === "magic") {
        const { error } = await signInWithMagicLink(email);
        if (error) throw error;
        vibrateSuccess();
        toast.success("تم إرسال رابط الدخول السريع!", {
          description: "يرجى فحص صندوق الوارد في بريدك الإلكتروني.",
        });
        onClose();
      }
    } catch (err: any) {
      toast.error(err?.message || "حدث خطأ أثناء الاتصال");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" dir="rtl">
      <div className="bg-surface rounded-3xl p-6 sm:p-8 w-full max-w-md border border-border shadow-2xl relative space-y-6 animate-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-foreground">
                {mode === "signin" ? "تسجيل الدخول" : mode === "signup" ? "إنشاء حساب جديد" : "رابط سحري سريع"}
              </h2>
              <p className="text-xs text-muted-foreground">للحفظ والمزامنة السحابية بين جميع أجهزتك</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => { vibrateLight(); onClose(); }} className="rounded-full">
            <X className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 p-1 bg-muted/50 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => { vibrateLight(); setMode("signin"); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              mode === "signin" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => { vibrateLight(); setMode("signup"); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              mode === "signup" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            حساب جديد
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> البريد الإلكتروني
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors text-right"
              dir="ltr"
            />
          </div>

          {mode !== "magic" && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> كلمة المرور
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors text-right"
                dir="ltr"
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl text-md font-bold mt-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : mode === "signin" ? (
              "دخول ومزامنة الحفظ"
            ) : mode === "signup" ? (
              "إنشاء الحساب والمزامنة"
            ) : (
              "إرسال الرابط السريع"
            )}
          </Button>

          {/* Magic link toggle */}
          <div className="text-center pt-2">
            {mode !== "magic" ? (
              <button
                type="button"
                onClick={() => setMode("magic")}
                className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
              >
                <Send className="w-3 h-3" /> الدخول برابط سحري بدون كلمة مرور
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="text-xs text-muted-foreground hover:underline font-medium"
              >
                العودة لتسجيل الدخول بكلمة المرور
              </button>
            )}
          </div>
        </form>

        <p className="text-[11px] text-muted-foreground/70 text-center leading-relaxed">
          جميع بيانات حفظك اليومية وأورادك مشفرة ومحفوظة بأمان تام وفق أعلى معايير الخصوصية.
        </p>
      </div>
    </div>
  );
}
