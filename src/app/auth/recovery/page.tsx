"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, updatePassword } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";

export default function RecoveryPage() {
  const router = useRouter(), [phase, setPhase] = useState<"checking" | "valid" | "invalid">("checking");
  const [password, setPassword] = useState(""), [repeat, setRepeat] = useState(""), [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    let live = true;
    const inspect = async () => {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const query = new URLSearchParams(window.location.search);
      if (params.has("error") || params.has("error_code") || query.has("error") || query.has("error_code")) { if (live) setPhase("invalid"); return; }
      const { data, error } = await supabase!.auth.getSession();
      if (live) setPhase(data.session && !error ? "valid" : "invalid");
    };
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session && live) queueMicrotask(() => { if (live) setPhase("valid"); });
    });
    void inspect();
    return () => { live = false; data.subscription.unsubscribe(); };
  }, []);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null);
    if (password !== repeat) { setError("كلمتا المرور لا تتطابقان"); return; }
    setBusy(true);
    try {
      const { error } = await updatePassword(password);
      if (error) setError("تعذّر تحديث كلمة المرور؛ قد يكون الرابط منتهيًا. اطلب رابطًا جديدًا.");
      else { useAuthStore.getState().setAuth({ recovery: false }); window.history.replaceState(null, "", "/auth/recovery"); router.replace("/"); }
    } catch { setError("تعذّر الاتصال. حاول مجددًا."); } finally { setBusy(false); }
  };
  return <main className="min-h-[100dvh] grid place-items-center p-4" dir="rtl"><section className="surface-card max-w-md w-full p-6 space-y-4"><h1 className="text-2xl font-bold">كلمة مرور جديدة</h1>
    {!supabase ? <p className="text-sm text-muted-foreground">استعادة الحساب غير مهيأة في هذه النسخة.</p> : phase === "checking" ? <p role="status">جارٍ التحقق من الرابط…</p> : phase === "invalid" ? <p role="alert" className="text-sm text-destructive">الرابط غير صالح أو منتهي. عد إلى الحساب واطلب رابط استعادة جديدًا.</p> : <form onSubmit={save} className="space-y-4">
      <label className="block text-sm">كلمة المرور الجديدة<input type="password" required minLength={8} maxLength={128} dir="ltr" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mt-2 p-3 rounded-xl bg-background border border-border" /></label>
      <label className="block text-sm">تأكيد كلمة المرور<input type="password" required minLength={8} maxLength={128} dir="ltr" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} className="w-full mt-2 p-3 rounded-xl bg-background border border-border" /></label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full min-h-12" disabled={busy}>{busy ? "جارٍ الحفظ…" : "حفظ كلمة المرور والعودة"}</Button>
    </form>}
    <Link href="/" onClick={() => useAuthStore.getState().setAuth({ recovery: false })} className="block text-sm text-primary min-h-11 py-3">العودة إلى حصون</Link>
  </section></main>;
}
