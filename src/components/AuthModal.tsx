"use client";

import { Button } from "./ui/button";
import { vibrateLight, vibrateSuccess } from "@/lib/haptic";
import {
  fetchProgressFromCloud,
  isSupabaseConfigured,
  mergeProgress,
  sendPasswordReset,
  signInWithEmailPassword,
  signInWithMagicLink,
  signUpWithEmailPassword,
  syncProgressToCloud,
} from "@/lib/supabase";
import { useHifzStore } from "@/store/useHifzStore";
import { Loader2, Lock, Mail, Send, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

type Mode = "signin" | "signup" | "magic";

export default function AuthModal({ onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);


  const syncAfterLogin = async () => {
    try {
      const { data: cloudData } = await fetchProgressFromCloud();
      const s = useHifzStore.getState();
      const localShaped = {
        currentDay: s.currentDay,
        streak: s.streak,
        bestStreak: s.bestStreak,
        totalXp: s.totalXp,
        completedTasks: s.completedTasks,
        dailyLog: s.dailyLog as never,
        notes: s.notes,
        thumunRatings: s.thumunRatings as never,
        editedThumuns: s.editedThumuns as never,
      };
      if (cloudData) {
        const merged = mergeProgress(localShaped, {
          currentDay: cloudData.current_day,
          streak: cloudData.streak,
          bestStreak: cloudData.best_streak,
          totalXp: cloudData.total_xp,
          completedTasks: cloudData.completed_tasks as never,
          dailyLog: cloudData.daily_log as never,
          notes: cloudData.notes as never,
          thumunRatings: cloudData.thumun_ratings as never,
          editedThumuns: cloudData.edited_thumuns as never,
        });
        s.hydrateFromCloud(merged as never);
      }
      const { error } = await syncProgressToCloud({
        current_day: s.currentDay,
        streak: s.streak,
        best_streak: s.bestStreak,
        total_xp: s.totalXp,
        completed_tasks: s.completedTasks,
        daily_log: s.dailyLog,
        session_log: s.sessionLog,
        notes: s.notes,
        thumun_ratings: s.thumunRatings,
        edited_thumuns: s.editedThumuns,
        khatma_completed_at: s.khatmaCompletedAt,
        maintain: s.maintain,
        settings: s.settings as unknown as Record<string, unknown>,
      });
      if (error && typeof error === "object" && "message" in error) {
        toast.error("تعذّرت المزامنة: " + error.message);
      } else {
        s.setLastCloudSync(new Date().toISOString());
        toast.success(cloudData ? "تم دمج تقدمك ومزامنته" : "حُفظ تقدمك في السحابة");
      }
    } catch {
      /* keep local */
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("يرجى إدخال البريد الإلكتروني");
      return;
    }
    if (mode !== "magic" && password.length < 8) {
      toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    if (!isSupabaseConfigured) {
      toast.error("المزامنة السحابية غير مهيأة — أضف مفاتيح Supabase في متغيرات البيئة");
      return;
    }

    setLoading(true);
    vibrateLight();
    try {
      if (mode === "signin") {
        const { error } = await signInWithEmailPassword(email, password);
        if (error) throw error;
        vibrateSuccess();
        toast.success("أهلاً بعودتك!");
        await syncAfterLogin();
        onSuccess?.();
        onClose();
      } else if (mode === "signup") {
        const { data, error } = await signUpWithEmailPassword(email, password);
        if (error) throw error;
        vibrateSuccess();
        if (data?.session) {
          await syncAfterLogin();
          onSuccess?.();
          onClose();
        } else {
          // email confirmation pending
          setAwaitingConfirm(true);
        }
      } else if (mode === "magic") {
        const { error } = await signInWithMagicLink(email);
        if (error) throw error;
        vibrateSuccess();
        toast.success("أرسلنا رابط الدخول إلى بريدك", {
          description: "اضغط الرابط لتفعيل الجلسة على هذا الجهاز.",
        });
        onClose();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "حدث خطأ أثناء الاتصال";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!email.trim()) {
      toast.error("اكتب بريدك الإلكتروني أولاً");
      return;
    }
    const { error } = await sendPasswordReset(email);
    if (error && typeof error === "object" && "message" in error) {
      toast.error(error.message);
    } else {
      toast.success("أرسلنا رابط استعادة كلمة المرور إلى بريدك");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="الحساب والمزامنة"
    >
      <div className="bg-surface rounded-3xl p-6 sm:p-8 w-full max-w-md border border-border shadow-2xl relative space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" aria-hidden />
            </div>
            <div>
              <h2 className="font-bold text-lg text-foreground">
                {awaitingConfirm
                  ? "تأكيد بريدك"
                  : mode === "signin"
                    ? "تسجيل الدخول"
                    : mode === "signup"
                      ? "إنشاء حساب جديد"
                      : "رابط سحري سريع"}
              </h2>
              <p className="text-xs text-muted-foreground">للمزامنة بين أجهزتك وحفظ تقدمك</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => { vibrateLight(); onClose(); }} className="rounded-full" aria-label="إغلاق">
            <X className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>

        {awaitingConfirm ? (
          <div className="text-center space-y-4 py-4">
            <Mail className="w-10 h-10 text-primary mx-auto" aria-hidden />
            <p className="leading-relaxed">
              أرسلنا رابط التفعيل إلى <b>{email}</b>. فعّل حسابك ثم سجّل الدخول لتبدأ المزامنة.
            </p>
            <Button className="w-full" onClick={onClose}>
              فهمت
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 p-1 bg-muted/50 rounded-2xl gap-1" role="tablist" aria-label="طريقة الدخول">
              {(
                [
                  ["signin", "كلمة مرور"],
                  ["signup", "حساب جديد"],
                  ["magic", "رابط سحري"],
                ] as [Mode, string][]
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => { vibrateLight(); setMode(m); }}
                  className={`py-2 text-xs font-bold rounded-xl transition-all ${
                    mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5" htmlFor="auth-email">
                  <Mail className="w-3.5 h-3.5" aria-hidden /> البريد الإلكتروني
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors text-right"
                  dir="ltr"
                  autoComplete="email"
                />
              </div>

              {mode !== "magic" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5" htmlFor="auth-pass">
                    <Lock className="w-3.5 h-3.5" aria-hidden /> كلمة المرور (8 أحرف فأكثر)
                  </label>
                  <input
                    id="auth-pass"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors text-right"
                    dir="ltr"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl text-md font-bold mt-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" aria-label="جارٍ" />
                ) : mode === "signin" ? (
                  "دخول ومزامنة الحفظ"
                ) : mode === "signup" ? (
                  "إنشاء الحساب والمزامنة"
                ) : (
                  "إرسال الرابط السريع"
                )}
              </Button>

              {mode === "signin" && (
                <div className="text-center">
                  <button type="button" onClick={handleForgot} className="text-xs text-muted-foreground hover:underline">
                    نسيت كلمة المرور؟
                  </button>
                </div>
              )}

              {mode !== "magic" && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setMode("magic")}
                    className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" aria-hidden /> الدخول برابط سحري بدون كلمة مرور
                  </button>
                </div>
              )}
            </form>
          </>
        )}

        <p className="text-[11px] text-muted-foreground/80 text-center leading-relaxed">
          تقدمك محفوظ محلياً أولاً، وتُزامَن نسخة إلى حسابك عند تسجيل الدخول. لا نشارك
          بياناتك مع أحد.
        </p>
      </div>
    </div>
  );
}
