"use client";
import { useState } from "react";
import { isSupabaseConfigured, sendPasswordReset, signInWithEmailPassword, signInWithMagicLink, signUpWithEmailPassword } from "@/lib/supabase";
import { AppModal } from "./ui/app-modal";
import { Button } from "./ui/button";
import { toast } from "sonner";
interface Props { onClose: () => void; onSuccess?: () => void }
type Mode = "signin" | "signup" | "magic";
export default function AuthModal({ onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>("signin"), [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false), [confirmation, setConfirmation] = useState(false), [error, setError] = useState<string | null>(null);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null);
    if (!isSupabaseConfigured) { setError("المزامنة غير مهيأة في هذه النسخة. يمكنك متابعة الحفظ محليًا وتصدير نسخة."); return; }
    setBusy(true);
    try {
      if (mode === "magic") {
        const { error } = await signInWithMagicLink(email); if (error) throw error;
        toast.success("أُرسل رابط الدخول إلى بريدك. بيانات الضيف لا تُنقل تلقائيًا."); onClose();
      } else {
        const result = mode === "signin" ? await signInWithEmailPassword(email, password) : await signUpWithEmailPassword(email, password);
        if (result.error) throw result.error;
        if (mode === "signup" && !result.data?.session) setConfirmation(true);
        else { onSuccess?.(); onClose(); toast.success("تم الدخول. فُتحت مساحة حسابك المستقلة؛ يمكنك نقل بيانات الضيف باختيار صريح."); }
      }
    } catch (value) {
      const code = value && typeof value === "object" && "code" in value ? String(value.code) : "";
      setError(code === "invalid_credentials" ? "البريد أو كلمة المرور غير صحيحين" : code === "email_not_confirmed" ? "فعّل بريدك أولًا ثم سجّل الدخول" : "تعذّر الدخول. تحقق من البيانات والاتصال وحاول لاحقًا.");
    } finally { setBusy(false); }
  };
  const forgot = async () => {
    if (!email.trim()) { setError("اكتب بريدك الإلكتروني أولًا"); return; }
    setBusy(true);
    try { const { error } = await sendPasswordReset(email); if (error) setError("تعذّر إرسال رابط الاستعادة"); else toast.success("تحقق من بريدك لرابط تغيير كلمة المرور"); }
    catch { setError("تعذّر الاتصال"); } finally { setBusy(false); }
  };
  return <AppModal title={confirmation ? "تأكيد بريدك" : "الحساب والمزامنة"} onClose={() => { if (!busy) onClose(); }}>
    <div className="p-5 space-y-4 overflow-y-auto">
      {!isSupabaseConfigured && <p className="rounded-xl bg-muted p-3 text-sm">المزامنة السحابية غير مهيأة في هذه النسخة. جميع وظائف الحفظ المحلي متاحة.</p>}
      {confirmation ? <><p className="leading-relaxed">أُرسل رابط التفعيل إلى <b dir="ltr">{email}</b>. فعّل حسابك ثم عد لتسجيل الدخول.</p><Button onClick={onClose}>فهمت</Button></> : <>
        <div className="flex flex-wrap gap-2" aria-label="طريقة الدخول">{([["signin", "دخول"], ["signup", "حساب جديد"], ["magic", "رابط سحري"]] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={mode === value} disabled={busy} className={`flex-1 rounded-xl p-3 text-sm border ${mode === value ? "border-primary bg-primary/10 text-primary" : "border-border"}`} onClick={() => setMode(value)}>{label}</button>)}</div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm" htmlFor="auth-email">البريد الإلكتروني<input id="auth-email" type="email" dir="ltr" required autoComplete="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mt-2 p-3 rounded-xl bg-background border border-border" /></label>
          {mode !== "magic" && <label className="block text-sm" htmlFor="auth-password">كلمة المرور<input id="auth-password" type="password" dir="ltr" required minLength={8} maxLength={128} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mt-2 p-3 rounded-xl bg-background border border-border" /></label>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={busy || !isSupabaseConfigured} className="w-full min-h-12">{busy ? "جارٍ الاتصال…" : mode === "signin" ? "تسجيل الدخول" : mode === "signup" ? "إنشاء حساب" : "إرسال رابط الدخول"}</Button>
          {mode === "signin" && <button type="button" className="w-full text-primary text-sm min-h-11" onClick={forgot} disabled={busy || !isSupabaseConfigured}>نسيت كلمة المرور؟</button>}
        </form>
      </>}
      <p className="text-xs text-muted-foreground leading-relaxed">حسابك والضيف لهما مساحتان منفصلتان. لن ندمج تقدمًا أو نرفعه عند فشل قراءة الخادم. أي نقل يحتاج موافقتك.</p>
    </div>
  </AppModal>;
}
