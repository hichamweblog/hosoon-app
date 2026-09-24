"use client";

import { useHifzStore } from "@/store/useHifzStore";
import { Download, RotateCcw, Upload, X, Cloud, LogIn, LogOut, RefreshCw, CheckCircle2 } from "lucide-react";
import { isSupabaseConfigured, getCurrentUser, signOutUser, syncProgressToCloud } from "@/lib/supabase";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "./ui/alert-dialog";
import { vibrateLight, vibrateSuccess } from "@/lib/haptic";
import AuthModal from "./AuthModal";

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const {
    resetProgress, currentDay, streak, bestStreak, totalXp,
    completedTasks, dailyLog, notes, editedThumuns,
  } = useHifzStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showResetAlert, setShowResetAlert] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    vibrateLight();
    const { error } = await syncProgressToCloud({
      currentDay, streak, bestStreak, totalXp,
      completedTasks, dailyLog, notes, editedThumuns,
    });
    setSyncing(false);
    if (error) {
      toast.error("فشل في المزامنة السحابية: " + (typeof error === 'string' ? error : error.message || ''));
    } else {
      vibrateSuccess();
      toast.success("تمت مزامنة تقدمك سحابياً بنجاح!");
    }
  };

  const handleSignOut = async () => {
    vibrateLight();
    await signOutUser();
    setUser(null);
    toast.info("تم تسجيل الخروج");
  };

  const handleExport = () => {
    vibrateLight();
    try {
      const data = localStorage.getItem("hifz-storage");
      if (!data) throw new Error("No data found");
      
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().split("T")[0];
      a.download = `hosoon_backup_${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("تم تصدير البيانات بنجاح");
      vibrateSuccess();
    } catch (e) {
      toast.error("حدث خطأ أثناء تصدير البيانات");
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        JSON.parse(content);
        
        localStorage.setItem("hifz-storage", content);
        vibrateSuccess();
        toast.success("تم استيراد البيانات بنجاح، سيتم تحديث الصفحة");
        
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (e) {
        toast.error("ملف البيانات غير صالح");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleReset = () => {
    vibrateSuccess();
    resetProgress();
    setShowResetAlert(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 sm:p-0 animate-in fade-in" dir="rtl">
        <div className="bg-surface rounded-3xl p-6 w-full max-w-sm border border-border shadow-2xl relative animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-xl">الإعدادات</h2>
            <Button variant="ghost" size="icon" onClick={() => { vibrateLight(); onClose(); }} className="rounded-full">
              <X className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>

          <div className="space-y-3">
            {/* ─── Cloud Sync (Supabase) ─── */}
            <div className="w-full text-right bg-background rounded-2xl p-4 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm">المزامنة السحابية</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      user ? "bg-emerald-500/10 text-emerald-500 flex items-center gap-1" : isSupabaseConfigured ? "bg-blue-500/10 text-blue-500" : "bg-muted text-muted-foreground"
                    }`}>
                      {user ? <><CheckCircle2 className="w-3 h-3" /> متزامن</> : isSupabaseConfigured ? "سحابي" : "محلي (آمن)"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {user
                      ? user.email
                      : isSupabaseConfigured
                      ? "سجل دخولك لحفظ التقدم سحابياً"
                      : "البيانات محفوظة على هذا الجهاز فقط"}
                  </p>
                </div>
                <div className="w-9 h-9 flex items-center justify-center bg-secondary rounded-xl shrink-0">
                  <Cloud className="w-4 h-4 text-primary" />
                </div>
              </div>

              {/* Action buttons for Cloud Sync */}
              {user ? (
                <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                  <button
                    onClick={handleManualSync}
                    disabled={syncing}
                    className="flex-1 py-2 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                    مزامنة الآن
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="py-2 px-3 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    خروج
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { vibrateLight(); setShowAuthModal(true); }}
                  className="w-full py-2.5 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  تسجيل الدخول / إنشاء حساب للمزامنة
                </button>
              )}
            </div>

            {/* ─── Export ─── */}
            <button onClick={handleExport} className="w-full text-right bg-background rounded-2xl p-4 border border-border flex items-center justify-between transition-colors hover:bg-muted/50 active:bg-muted">
              <div>
                <p className="font-bold text-sm">تصدير البيانات</p>
                <p className="text-xs text-muted-foreground mt-0.5">حفظ نسخة من إنجازاتك</p>
              </div>
              <div className="w-9 h-9 flex items-center justify-center bg-secondary rounded-xl shrink-0">
                <Download className="w-4 h-4 text-primary" />
              </div>
            </button>

            {/* ─── Import ─── */}
            <button onClick={() => { vibrateLight(); fileInputRef.current?.click(); }} className="w-full text-right bg-background rounded-2xl p-4 border border-border flex items-center justify-between transition-colors hover:bg-muted/50 active:bg-muted">
              <div>
                <p className="font-bold text-sm">استيراد البيانات</p>
                <p className="text-xs text-muted-foreground mt-0.5">استرجاع نسخة محفوظة</p>
              </div>
              <div className="w-9 h-9 flex items-center justify-center bg-secondary rounded-xl shrink-0">
                <Upload className="w-4 h-4 text-primary" />
              </div>
            </button>
            <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImport} />

            {/* ─── Reset ─── */}
            <button onClick={() => { vibrateLight(); setShowResetAlert(true); }} className="w-full text-right bg-red-500/5 rounded-2xl p-4 border border-red-500/10 flex items-center justify-between mt-6 transition-colors hover:bg-red-500/10 active:bg-red-500/20">
              <div>
                <p className="font-bold text-sm text-red-500">إعادة ضبط المصنع</p>
                <p className="text-xs text-red-500/70 mt-0.5">مسح كل تقدمك والبدء من جديد</p>
              </div>
              <div className="w-9 h-9 flex items-center justify-center bg-red-500/20 text-red-500 rounded-xl shrink-0">
                <RotateCcw className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      </div>

      <AlertDialog open={showResetAlert} onOpenChange={setShowResetAlert}>
        <AlertDialogContent dir="rtl" className="rounded-[24px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">تصفير الرحلة؟</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              هل أنت متأكد من رغبتك في مسح كل إنجازاتك والبدء من اليوم الأول؟ لا يمكن التراجع عن هذا الإجراء!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row items-center gap-2 sm:justify-start">
            <AlertDialogCancel className="mt-0 rounded-xl">إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} className="bg-red-500 hover:bg-red-600 rounded-xl">
              نعم، تصفير التخزين
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => getCurrentUser().then(setUser)}
        />
      )}
    </>
  );
}
