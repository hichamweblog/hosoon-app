"use client";

import { useHifzStore } from "@/store/useHifzStore";
import {
  deleteCloudData,
  fetchProgressFromCloud,
  getCurrentUser,
  isSupabaseConfigured,
  mergeProgress,
  signOutUser,
  syncProgressToCloud,
} from "@/lib/supabase";
import { ensureNotificationPermission, scheduleDailyReminder, showReminderNotification } from "@/lib/reminders";
import { HIZB_RECITERS, THUMUN_RECITERS } from "@/lib/quran-audio";
import { validateBackup, BACKUP_VERSION, type BackupFile } from "@/lib/backup";
import { localDateKey } from "@/lib/format";
import { vibrateLight, vibrateSuccess } from "@/lib/haptic";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  Bell,
  Check,
  CheckCircle2,
  Cloud,
  Download,
  Languages,
  LogIn,
  LogOut,
  Palette,
  RefreshCw,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import AuthModal from "./AuthModal";
import { useTheme } from "next-themes";
import { APP_THEMES } from "@/lib/themes";

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const state = useHifzStore();
  const { settings, updateSettings, resetProgress, setLastCloudSync } = state;
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showResetAlert, setShowResetAlert] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    getCurrentUser().then((u) => setUser(u ? { email: u.email } : null));
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const snapshotCloud = () => ({
    current_day: state.currentDay,
    streak: state.streak,
    best_streak: state.bestStreak,
    total_xp: state.totalXp,
    completed_tasks: state.completedTasks,
    daily_log: state.dailyLog,
    session_log: state.sessionLog,
    notes: state.notes,
    thumun_ratings: state.thumunRatings,
    edited_thumuns: state.editedThumuns,
    khatma_completed_at: state.khatmaCompletedAt,
    maintain: state.maintain,
    settings: settings as unknown as Record<string, unknown>,
  });

  const handleManualSync = async () => {
    setSyncing(true);
    vibrateLight();
    // pull → merge → push (never clobber newer remote data)
    const { data } = await fetchProgressFromCloud();
    if (data) {
      const merged = mergeProgress(
        {
          currentDay: state.currentDay,
          streak: state.streak,
          bestStreak: state.bestStreak,
          totalXp: state.totalXp,
          completedTasks: state.completedTasks,
          dailyLog: state.dailyLog as never,
          notes: state.notes,
          thumunRatings: state.thumunRatings as never,
          editedThumuns: state.editedThumuns as never,
        },
        {
          currentDay: data.current_day,
          streak: data.streak,
          bestStreak: data.best_streak,
          totalXp: data.total_xp,
          completedTasks: data.completed_tasks as never,
          dailyLog: data.daily_log as never,
          notes: data.notes as never,
          thumunRatings: data.thumun_ratings as never,
          editedThumuns: data.edited_thumuns as never,
        },
      );
      useHifzStore.getState().hydrateFromCloud(merged as never);
    }
    const { error } = await syncProgressToCloud(snapshotCloud());
    setSyncing(false);
    if (error && typeof error === "object" && "message" in error) {
      toast.error("فشل في المزامنة: " + error.message);
    } else {
      vibrateSuccess();
      setLastCloudSync(new Date().toISOString());
      toast.success("تمت المزامنة السحابية");
    }
  };

  const handleSignOut = async () => {
    vibrateLight();
    await signOutUser();
    setUser(null);
    toast.info("تم تسجيل الخروج — بقي تقدمك محفوظاً على جهازك");
  };

  const handleExport = () => {
    vibrateLight();
    try {
      const file: BackupFile = {
        app: "hosoon",
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        state: {
          currentDay: state.currentDay,
          startDate: state.startDate,
          completedTasks: state.completedTasks,
          khatmaCompletedAt: state.khatmaCompletedAt,
          maintain: state.maintain,
          streak: state.streak,
          bestStreak: state.bestStreak,
          lastActiveDate: state.lastActiveDate,
          dailyLog: state.dailyLog,
          sessionLog: state.sessionLog,
          notes: state.notes,
          thumunRatings: state.thumunRatings,
          editedThumuns: state.editedThumuns,
          totalXp: state.totalXp,
          settings: state.settings,
          lastCloudSyncAt: state.lastCloudSyncAt,
          showOnboarding: state.showOnboarding,
        },
      };
      const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hosoon_backup_${localDateKey()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تصدير نسخة احتياطية");
      vibrateSuccess();
    } catch {
      toast.error("حدث خطأ أثناء التصدير");
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result));
        const res = validateBackup(parsed);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        const s = res.summary;
        const ok = confirm(
          `استيراد نسخة:\nاليوم ${s.currentDay} · ${s.daysCompleted} يوماً منجزاً · ${s.totalXp} نقطة · سلسلة ${s.streak}\nسيُستبدل التقدم المحلي. أكمل؟`,
        );
        if (!ok) return;
        // write as a persist envelope then reload
        const envelope = JSON.stringify({ state: res.file.state, version: res.file.version });
        localStorage.setItem("hifz-storage", envelope);
        vibrateSuccess();
        toast.success("تم الاستيراد — سيتم تحديث الصفحة");
        setTimeout(() => window.location.reload(), 1200);
      } catch {
        toast.error("ملف البيانات غير صالح");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteCloud = async () => {
    const { error } = await deleteCloudData();
    setShowDeleteAlert(false);
    if (error && typeof error === "object" && "message" in error) {
      toast.error("تعذّر الحذف: " + error.message);
    } else {
      toast.success("حُذفت بياناتك السحابية");
    }
    await handleSignOut();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[110] bg-background/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-hidden"
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-label="الإعدادات"
      >
        <div className="bg-surface rounded-3xl w-full max-w-md border border-border shadow-2xl relative animate-in slide-in-from-bottom-10 sm:zoom-in-95 max-h-[90dvh] flex flex-col min-h-0 overflow-hidden my-auto">
          {/* Fixed Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-border/40 shrink-0 bg-surface/95 backdrop-blur-sm">
            <h2 className="font-bold text-xl">الإعدادات</h2>
            <Button variant="ghost" size="icon" onClick={() => { vibrateLight(); onClose(); }} className="rounded-full" aria-label="إغلاق">
              <X className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>

          {/* Scrollable Body */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
            {/* ─── سمة المظهر والألوان ─── */}
            <div className="bg-background rounded-2xl p-4 border border-border">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-sm flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" aria-hidden /> سمة المظهر والألوان
                </p>
                <span className="text-xs font-medium text-muted-foreground">
                  {APP_THEMES.find((t) => t.id === theme)?.name ?? "مخصّص"}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {APP_THEMES.map((th) => {
                  const isSelected = theme === th.id;
                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => {
                        vibrateLight();
                        setTheme(th.id);
                      }}
                      className={`flex flex-col gap-2 p-2.5 rounded-xl border text-right transition-all relative ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                          : "border-border/60 hover:border-primary/40 bg-surface/50"
                      }`}
                      aria-pressed={isSelected}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold leading-tight">{th.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0 shadow-xs"
                          style={{ backgroundColor: th.colors[0] }}
                          title="الخلفية"
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0 shadow-xs"
                          style={{ backgroundColor: th.colors[1] }}
                          title="الأساسي"
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0 shadow-xs"
                          style={{ backgroundColor: th.colors[2] }}
                          title="التمييز"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            {/* ─── التذكير اليومي ─── */}
            <div className="bg-background rounded-2xl p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-sm flex items-center gap-2">
                  <Bell className="w-4 h-4 text-f-near" aria-hidden /> التذكير اليومي
                </p>
                <input
                  type="time"
                  value={settings.reminderTime ?? ""}
                  onChange={async (e) => {
                    const v = e.target.value || null;
                    updateSettings({ reminderTime: v });
                    if (v) {
                      const ok = await ensureNotificationPermission();
                      if (ok) {
                        scheduleDailyReminder(v);
                        toast.success(`سيصلك تذكير يومي عند ${v}`);
                      } else {
                        toast.error("لم يُسمح بالإشعارات على هذا الجهاز");
                      }
                    } else {
                      scheduleDailyReminder(null);
                    }
                  }}
                  className="bg-surface border border-border rounded-lg px-2 py-1 text-sm"
                  aria-label="وقت التذكير"
                />
              </div>
              <button
                onClick={() => showReminderNotification("هكذا سيصلك تذكيرك اليومي من حصون.")}
                className="text-xs text-primary hover:underline"
              >
                جرّب إشعاراً الآن
              </button>
            </div>

            {/* ─── تفضيلات العرض والصوت ─── */}
            <div className="bg-background rounded-2xl p-4 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm flex items-center gap-2">
                  <Languages className="w-4 h-4 text-f-prep" aria-hidden /> الأرقام العربية
                </p>
                <button
                  role="switch"
                  aria-checked={settings.arabicNumerals}
                  onClick={() => updateSettings({ arabicNumerals: !settings.arabicNumerals })}
                  className={`w-11 h-6 rounded-full transition-colors relative ${settings.arabicNumerals ? "bg-primary" : "bg-muted"}`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${settings.arabicNumerals ? "right-0.5" : "right-[22px]"}`}
                  />
                </button>
              </div>
              {/* قارئ سماع الأحزاب */}
              <div className="flex items-center justify-between">
                <label htmlFor="hizb-reciter-select" className="font-bold text-sm">
                  قارئ الأحزاب (الختمة)
                </label>
                <select
                  id="hizb-reciter-select"
                  value={settings.hizbReciterId || "husary"}
                  onChange={(e) => updateSettings({ hizbReciterId: e.target.value })}
                  className="bg-surface border border-border rounded-lg px-2 py-1.5 text-xs max-w-[55%]"
                >
                  {HIZB_RECITERS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* قارئ سماع الأثمان */}
              <div className="flex items-center justify-between">
                <label htmlFor="thumun-reciter-select" className="font-bold text-sm">
                  قارئ الأثمان (الحفظ)
                </label>
                <select
                  id="thumun-reciter-select"
                  value={settings.thumunReciterId || "sayed"}
                  onChange={(e) => updateSettings({ thumunReciterId: e.target.value })}
                  className="bg-surface border border-border rounded-lg px-2 py-1.5 text-xs max-w-[55%]"
                >
                  {THUMUN_RECITERS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {"speedLabel" in r && r.speedLabel ? `(${r.speedLabel})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pace-recite" className="font-bold text-sm">
                    التلاوة: أجزاء في اليوم
                  </label>
                  <select
                    id="pace-recite"
                    value={state.settings.reciteJuzPerDay}
                    onChange={(e) => {
                      state.updateSettings({ reciteJuzPerDay: Number(e.target.value) });
                      vibrateLight();
                    }}
                    className="w-full mt-1 bg-background border border-border rounded-xl px-3 py-2.5 text-sm"
                  >
                    {[1, 2, 3].map((n) => (
                      <option key={n} value={n}>
                        {n} جزء
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="pace-listen" className="font-bold text-sm">
                    الاستماع: أحزاب في اليوم
                  </label>
                  <select
                    id="pace-listen"
                    value={state.settings.listenHizbPerDay}
                    onChange={(e) => {
                      state.updateSettings({ listenHizbPerDay: Number(e.target.value) });
                      vibrateLight();
                    }}
                    className="w-full mt-1 bg-background border border-border rounded-xl px-3 py-2.5 text-sm"
                  >
                    {[1, 2, 3].map((n) => (
                      <option key={n} value={n}>
                        {n} حزب
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground">
                جميع التلاوات برواية ورش عن نافع من طريق المدرسة المغربية
              </p>
            </div>

            {/* ─── المزامنة السحابية ─── */}
            <div className="bg-background rounded-2xl p-4 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm">المزامنة السحابية</p>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        user
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1"
                          : isSupabaseConfigured
                            ? "bg-f-khatma/10 text-f-khatma"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {user ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" aria-hidden /> متزامن
                        </>
                      ) : isSupabaseConfigured ? (
                        "سحابي"
                      ) : (
                        "محلي"
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {user
                      ? `${user.email} · آخر مزامنة ${state.lastCloudSyncAt ? new Date(state.lastCloudSyncAt).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" }) : "—"}`
                      : isSupabaseConfigured
                        ? "سجّل دخولك لحفظ التقدم سحابياً وتجنّب فقده"
                        : "بياناتك محفوظة على هذا الجهاز فقط"}
                  </p>
                </div>
                <div className="w-9 h-9 flex items-center justify-center bg-surface rounded-xl shrink-0">
                  <Cloud className="w-4 h-4 text-primary" aria-hidden />
                </div>
              </div>

              {user ? (
                <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                  <button
                    onClick={handleManualSync}
                    disabled={syncing}
                    className="flex-1 py-2 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} aria-hidden />
                    مزامنة الآن
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="py-2 px-3 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" aria-hidden /> خروج
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    vibrateLight();
                    setShowAuthModal(true);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <LogIn className="w-3.5 h-3.5" aria-hidden /> تسجيل الدخول / إنشاء حساب
                </button>
              )}
            </div>

            {/* ─── نسخ احتياطية ─── */}
            <button
              onClick={handleExport}
              className="w-full text-right bg-background rounded-2xl p-4 border border-border flex items-center justify-between transition-colors hover:bg-muted/50 active:bg-muted"
            >
              <div>
                <p className="font-bold text-sm">تصدير البيانات</p>
                <p className="text-xs text-muted-foreground mt-0.5">ملف JSON يحتوي كل تقدمك</p>
              </div>
              <Download className="w-4 h-4 text-primary" aria-hidden />
            </button>
            <button
              onClick={() => {
                vibrateLight();
                fileInputRef.current?.click();
              }}
              className="w-full text-right bg-background rounded-2xl p-4 border border-border flex items-center justify-between transition-colors hover:bg-muted/50 active:bg-muted"
            >
              <div>
                <p className="font-bold text-sm">استيراد البيانات</p>
                <p className="text-xs text-muted-foreground mt-0.5">مع معاينة قبل التطبيق</p>
              </div>
              <Upload className="w-4 h-4 text-primary" aria-hidden />
            </button>
            <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImport} />

            {/* ─── مناطق الخطر ─── */}
            {user && (
              <button
                onClick={() => setShowDeleteAlert(true)}
                className="w-full text-right bg-red-500/5 rounded-2xl p-4 border border-red-500/10 flex items-center justify-between transition-colors hover:bg-red-500/10"
              >
                <div>
                  <p className="font-bold text-sm text-red-500">حذف البيانات السحابية</p>
                  <p className="text-xs text-red-500/70 mt-0.5">يمسح صف تقدمك من الخادم</p>
                </div>
                <Trash2 className="w-4 h-4 text-red-500" aria-hidden />
              </button>
            )}
            <button
              onClick={() => {
                vibrateLight();
                setShowResetAlert(true);
              }}
              className="w-full text-right bg-red-500/5 rounded-2xl p-4 border border-red-500/10 flex items-center justify-between transition-colors hover:bg-red-500/10 active:bg-red-500/20"
            >
              <div>
                <p className="font-bold text-sm text-red-500">إعادة ضبط المصنع</p>
                <p className="text-xs text-red-500/70 mt-0.5">مسح كل شيء — الخبرة والسلسلة والتصحيحات</p>
              </div>
              <RotateCcw className="w-4 h-4 text-red-500" aria-hidden />
            </button>

            <p className="text-[10px] text-muted-foreground text-center pt-2 leading-relaxed">
              البيانات تُحفظ محلياً على جهازك وتُزامَن سحابياً بحسابك فقط (مشفّرة بتمرير عبر
              TLS، وصفّك محمي بسياسات RLS).
            </p>
          </div>
        </div>
      </div>

      <AlertDialog open={showResetAlert} onOpenChange={setShowResetAlert}>
        <AlertDialogContent dir="rtl" className="rounded-[24px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">تصفير الرحلة؟</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              سيُمسح كل شيء: التقدم، الخبرة، السلسلة، الملاحظات، وتصحيحات الأثمان. لا يمكن
              التراجع!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row items-center gap-2 sm:justify-start">
            <AlertDialogCancel className="mt-0 rounded-xl">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                vibrateSuccess();
                resetProgress();
                setShowResetAlert(false);
                onClose();
              }}
              className="bg-red-500 hover:bg-red-600 rounded-xl"
            >
              نعم، تصفير كل شيء
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent dir="rtl" className="rounded-[24px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">حذف البيانات السحابية؟</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              سيُحذف صف تقدمك من الخادم نهائياً. نسختك المحلية ستبقى على الجهاز.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row items-center gap-2 sm:justify-start">
            <AlertDialogCancel className="mt-0 rounded-xl">إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCloud} className="bg-red-500 hover:bg-red-600 rounded-xl">
              نعم، احذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} onSuccess={() => getCurrentUser().then((u) => setUser(u ? { email: u.email } : null))} />
      )}
    </>
  );
}
