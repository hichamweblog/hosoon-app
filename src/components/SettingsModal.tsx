"use client";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Bell, Cloud, Download, FileUp, LogOut, Shield, Trash2 } from "lucide-react";
import { useHifzStore, forgetVolatileOwner } from "@/store/useHifzStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useAppStatusStore } from "@/store/useAppStatusStore";
import { createBackup, validateBackup, MAX_BACKUP_BYTES, type BackupFile, type BackupSummary } from "@/lib/backup";
import { recoveryCopies, originalWorkspaceRaw, forgetWorkspace } from "@/lib/progress/storage";
import { memorizedIds } from "@/lib/progress/plan";
import { downloadJson, downloadText } from "@/lib/download";
import { formatNum, localDateKey } from "@/lib/format";
import { ensureNotificationPermission, showReminderNotification } from "@/lib/reminders";
import { synchronizeNow, replaceAllProgress, stopCloudSync, transferGuestProgress } from "@/lib/sync/service";
import { signOutUser, deleteAccount, clearDeletedLocalSession, fetchCloudRecoveries, isSupabaseConfigured } from "@/lib/supabase";
import { diagnosticReport } from "@/lib/diagnostics";
import AuthModal from "./AuthModal";
import PriorSelection from "./PriorSelection";
import OfflineDownloads from "./OfflineDownloads";
import { AppModal, ConfirmModal } from "./ui/app-modal";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { toast } from "sonner";
import { stopAudio } from "@/lib/audio-engine";

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const state = useHifzStore(), user = useAuthStore((s) => s.user), status = useAppStatusStore(), { theme, setTheme } = useTheme();
  const arabic = state.settings.arabicNumerals, editable = !status.storageError && (!state.ownerId || status.cloudReadReady);
  const [auth, setAuth] = useState(false), [busy, setBusy] = useState(false), [confirm, setConfirm] = useState<"reset" | "local" | "delete" | "transfer" | null>(null);
  const [pending, setPending] = useState<{ file: BackupFile; summary: BackupSummary } | null>(null), [deleteText, setDeleteText] = useState("");
  const [prior, setPrior] = useState<Set<number> | null>(null), [reminder, setReminder] = useState(state.settings.reminderTime ?? "18:00");
  const fileInput = useRef<HTMLInputElement>(null), live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  const run = async (task: () => Promise<void>, success?: string) => {
    setBusy(true);
    try { await task(); if (success) toast.success(success); }
    catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تنفيذ العملية؛ بقيت بياناتك دون استبدال"); }
    finally { if (live.current) setBusy(false); }
  };
  const pickBackup = async (file?: File) => {
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) { toast.error("الملف أكبر من 8 MiB"); return; }
    try {
      const result = validateBackup(JSON.parse(await file.text()));
      if (!result.ok) toast.error(result.error);
      else setPending({ file: result.file, summary: result.summary });
    } catch { toast.error("ملف JSON غير صالح؛ لم يتغير شيء"); }
  };
  const exportData = () => {
    try { downloadJson(createBackup(state), `hosoon-${state.ownerId ? "account" : "guest"}-${localDateKey()}.json`); }
    catch (error) { toast.error(error instanceof Error ? error.message : "تعذر التصدير"); }
  };
  const enableReminder = async () => {
    const owner = state.ownerId;
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(reminder)) { toast.error("اختر وقتًا صالحًا"); return; }
    const granted = await ensureNotificationPermission();
    if (!live.current || useHifzStore.getState().ownerId !== owner) return;
    if (!granted) { toast.info("الإشعارات غير متاحة أو مرفوضة. لم نفعّل التذكير؛ يمكنك تعديل إذن الموقع في المتصفح."); return; }
    state.updateSettings({ reminderTime: reminder }); toast.success("فُعّل تذكير محلي أثناء فتح التطبيق، دون ضمان وصوله في الخلفية");
  };
  const logout = async () => {
    const owner = state.ownerId;
    if (!owner || useHifzStore.getState().ownerId !== owner) throw new Error("تغيّر الحساب؛ أُلغيت عملية الخروج القديمة");
    const result = await signOutUser(owner);
    if (result.error) throw new Error("تعذر إنهاء الجلسة؛ حاول مرة أخرى");
    if (useHifzStore.getState().ownerId !== owner && useHifzStore.getState().ownerId !== null) return;
    stopCloudSync(); stopAudio(); useHifzStore.getState().switchOwner(null);
    useAuthStore.getState().setAuth({ user: null });
  };
  const executeConfirmation = () => run(async () => {
    const action = confirm;
    if (action === "reset") await replaceAllProgress();
    if (action === "transfer") await transferGuestProgress();
    if (action === "local") {
      const owner = state.ownerId;
      if (!owner) useHifzStore.getState().resetProgress();
      else { await logout(); forgetWorkspace(owner); forgetVolatileOwner(owner); }
    }
    if (action === "delete") {
      if (deleteText !== "احذف") throw new Error("اكتب احذف للتأكيد");
      const owner = state.ownerId;
      if (!owner || useHifzStore.getState().ownerId !== owner) throw new Error("تغيّر الحساب؛ لم ننفذ الحذف");
      const result = await deleteAccount(owner);
      if (result.error) throw new Error(result.error.message);
      try { await logout(); } catch { await clearDeletedLocalSession(owner); }
      if (useHifzStore.getState().ownerId === owner) { stopCloudSync(); stopAudio(); useHifzStore.getState().switchOwner(null); useAuthStore.getState().setAuth({ user: null }); }
      forgetWorkspace(owner); forgetVolatileOwner(owner);
    }
    setConfirm(null);
  }, confirm === "reset" ? "أُكدت إعادة الضبط ونُسخة الرجوع محفوظة" : confirm === "transfer" ? "نُقل تقدم الضيف بموافقتك والمزامنة مؤكدة" : confirm === "local" ? "أُزيلت نسخة هذه المساحة من الجهاز" : "أُكد حذف الحساب وبياناته من الخادم");
  const copies = recoveryCopies(state.ownerId);
  return <AppModal title="الإعدادات" onClose={() => { if (!busy) onClose(); }}>
    <div className="p-5 space-y-6 overflow-y-auto min-h-0" tabIndex={0} aria-label="خيارات الإعدادات">
      <section className="space-y-3"><h2 className="font-bold text-lg flex items-center gap-2"><Cloud className="size-5 text-primary" aria-hidden /> الحساب والحفظ</h2>
        <p className="text-sm text-muted-foreground">{user ? <span dir="ltr">{user.email}</span> : "وضع الضيف · مساحة مستقلة على هذا الجهاز"}</p>
        <p className="text-sm">{status.syncPhase === "synced" ? `مزامنة مؤكدة ${status.syncedAt ? new Date(status.syncedAt).toLocaleTimeString("ar-DZ") : ""}` : status.syncPhase === "syncing" ? "جارٍ الاتصال بالخادم…" : status.syncPhase === "pending" ? "تعديلات محفوظة محليًا تنتظر الرفع" : status.syncPhase === "error" ? "المزامنة تحتاج إعادة محاولة" : "حفظ محلي؛ صدّر نسخة بين حين وآخر"}</p>
        {status.syncError && <p role="alert" className="text-sm text-destructive">{status.syncError}</p>}
        {user ? <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => run(synchronizeNow, "المزامنة مؤكدة دون تكرار الرفع")}><Cloud className="size-4" aria-hidden /> مزامنة الآن</Button><Button variant="ghost" disabled={busy} onClick={() => run(logout)}><LogOut className="size-4" aria-hidden /> خروج إلى الضيف</Button></div> : <Button className="w-full min-h-12" onClick={() => setAuth(true)}>{isSupabaseConfigured ? "دخول لحفظ نسخة سحابية" : "الحساب (المزامنة غير مهيأة)"}</Button>}
        {state.ownerId && status.guestTransferAvailable && <div className="rounded-xl bg-primary/10 p-3 space-y-2"><p className="text-sm">توجد بيانات في مساحة الضيف. لم نرفعها إلى هذا الحساب. تأكد أنها تخصك قبل نقلها.</p><Button variant="outline" onClick={() => setConfirm("transfer")} disabled={busy}>نقل بيانات الضيف إلى حسابي</Button></div>}
        <p className="text-xs text-muted-foreground">خروجك لا يحذف المحفوظ. الحسابات لا تتشارك الملاحظات أو الإنجاز، وقراءة الخادم الفاشلة تمنع أي كتابة.</p>
      </section>
      <fieldset disabled={!editable} className="space-y-3 border-t border-border pt-4"><legend className="font-bold text-lg">المظهر والقراءة</legend>
        <div className="flex flex-wrap gap-2" aria-label="مظهر التطبيق">{([["dark", "داكن"], ["ocean-dark", "محيط داكن"], ["ocean", "محيط"], ["warm", "دافئ"], ["light", "فاتح"]] as const).map(([id, label]) => <button key={id} aria-pressed={theme === id} className={`rounded-xl min-h-11 px-3 text-sm border ${theme === id ? "border-primary bg-primary/10 text-primary font-bold" : "border-border"}`} onClick={() => setTheme(id)}>{label}</button>)}</div>
        <div className="flex items-center justify-between gap-3"><label htmlFor="arabic-numerals" className="text-sm">الأرقام العربية (١٢٣)</label><Switch aria-label="الأرقام العربية" id="arabic-numerals" checked={arabic} onCheckedChange={(value) => state.updateSettings({ arabicNumerals: value })} /></div>
        <div className="flex items-center justify-between gap-3"><label htmlFor="quiet-mode" className="text-sm">وضع هادئ — تقليل الحركة والاهتزاز والصوت</label><Switch aria-label="الوضع الهادئ" id="quiet-mode" checked={state.settings.quietMode} onCheckedChange={(value) => state.updateSettings({ quietMode: value })} /></div>
        <label className="block text-sm">حجم الواجهة: {Math.round(state.settings.fontScale * 100)}%<input type="range" min={1} max={1.3} step={0.05} value={state.settings.fontScale} aria-label="تكبير حجم النص" className="w-full min-h-11 accent-[var(--primary)]" onChange={(e) => state.updateSettings({ fontScale: Number(e.target.value) })} /></label>
      </fieldset>
      <fieldset disabled={!editable} className="space-y-3 border-t border-border pt-4"><legend className="font-bold text-lg">الوتيرة والمحفوظ</legend>
        <label className="block text-sm">التلاوة اليومية<select value={state.settings.reciteJuzPerDay} aria-label="عدد أجزاء التلاوة" className="w-full mt-1 p-3 rounded-xl bg-background border border-border" onChange={(e) => state.updateSettings({ reciteJuzPerDay: Number(e.target.value) })}>{[1, 2, 3].map((n) => <option value={n} key={n}>{formatNum(n, arabic)} جزء / يوم</option>)}</select></label>
        <label className="block text-sm">الاستماع اليومي<select value={state.settings.listenHizbPerDay} aria-label="عدد أحزاب الاستماع" className="w-full mt-1 p-3 rounded-xl bg-background border border-border" onChange={(e) => state.updateSettings({ listenHizbPerDay: Number(e.target.value) })}>{[1, 2, 3].map((n) => <option value={n} key={n}>{formatNum(n, arabic)} حزب / يوم</option>)}</select></label>
        <p className="text-xs text-muted-foreground">تغيير الوتيرة يبدأ بخطة اليوم التالي؛ مواد الأيام المسجلة لا تُفسّر من جديد.</p>
        <Button variant="outline" className="w-full min-h-11" onClick={() => setPrior(new Set(memorizedIds(state)))}>تحديد المحفوظ السابق أو تصحيحه</Button>
        <p className="text-xs text-muted-foreground">التصريح بالمحفوظ لا يولّد أورادًا ماضية، ويمكن أن يكون سورًا غير متصلة.</p>
      </fieldset>
      <fieldset disabled={!editable} className="space-y-3 border-t border-border pt-4"><legend className="font-bold text-lg flex items-center gap-2"><Bell className="size-5 text-f-gold" aria-hidden /> تذكير محلي اختياري</legend>
        <p className="text-sm text-muted-foreground leading-relaxed">أفضل جهد أثناء فتح التطبيق فقط. لا خدمة Push في الخلفية؛ قد يعلّق الهاتف المؤقت. تعطيل التذكير يلغي الموعد السابق.</p>
        <label className="block text-sm">الوقت المحلي<input type="time" value={reminder} aria-label="وقت التذكير" onChange={(e) => setReminder(e.target.value)} className="w-full mt-1 p-3 rounded-xl bg-background border border-border" /></label>
        <p className="text-sm">{state.settings.reminderTime ? `مفعّل عند ${state.settings.reminderTime}` : "غير مفعّل — لم يُطلب إذن تلقائيًا"}</p>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={enableReminder}>فعّل بهذا الوقت</Button><Button variant="outline" onClick={() => run(async () => { const granted = await ensureNotificationPermission(); if (!granted || !await showReminderNotification("هذا اختبار محلي؛ التذكير المجدول يحتاج إبقاء التطبيق مفتوحًا.")) throw new Error("الإشعارات غير متاحة هنا؛ تحقق من إذن الموقع أو تثبيت التطبيق"); }, "أُرسل تذكير تجريبي محلي")}>اختبار التذكير</Button><Button variant="ghost" onClick={() => state.updateSettings({ reminderTime: null })} disabled={!state.settings.reminderTime}>تعطيل</Button></div>
      </fieldset>
      <section className="space-y-3 border-t border-border pt-4"><h2 className="font-bold text-lg">النسخ الاحتياطي والاسترجاع</h2>
        <p className="text-sm text-muted-foreground">ملف البيانات يشمل الملاحظات والتقييمات والمسودات؛ احفظه في مكان خاص. تُنشأ نسخة رجوع محلية قبل أي استبدال.</p>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={exportData}><Download className="size-4" aria-hidden /> تصدير بياناتي</Button><Button variant="outline" disabled={busy} onClick={() => fileInput.current?.click()}><FileUp className="size-4" aria-hidden /> معاينة نسخة للاستيراد</Button></div>
        {state.ownerId && <Button variant="outline" disabled={busy} onClick={() => run(async () => {
          const owner = state.ownerId!; const records = await fetchCloudRecoveries(owner);
          if (useHifzStore.getState().ownerId !== owner) throw new Error("تغيّر الحساب؛ لم نعرض نسخ حساب آخر");
          if (!records.length) { toast.info("لا نسخ رجوع سحابية متاحة بعد"); return; }
          const latest = records[0];
          downloadJson(latest.snapshot ? { app: "hosoon", version: 4, exportedAt: latest.created_at, state: latest.snapshot } : { app: "hosoon-cloud-legacy-row", revision: latest.revision, row: latest.legacy_row }, `hosoon-cloud-recovery-${latest.revision}.json`);
        })}>تصدير آخر نسخة رجوع سحابية</Button>}
        <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" aria-label="ملف النسخة الاحتياطية" onChange={(e) => { void pickBackup(e.target.files?.[0]); e.currentTarget.value = ""; }} />
        {status.storageError && <Button variant="outline" onClick={() => { const raw = originalWorkspaceRaw(state.ownerId); if (raw) downloadText(raw, `hosoon-original-${localDateKey()}.json`); else toast.info("لا نسخة أصلية متاحة في تخزين المتصفح"); }}>تصدير الملف المحلي الأصلي دون تعديله</Button>}
        {copies.length > 0 && <details className="rounded-xl bg-surface p-3"><summary className="text-sm font-semibold cursor-pointer min-h-8">نسخ الرجوع المحلية ({copies.length})</summary><ul className="space-y-2 mt-2">{copies.map((copy, index) => <li key={copy.key} className="flex flex-wrap items-center gap-2"><span className="text-xs flex-1">نسخة {index + 1}</span><Button size="sm" variant="outline" onClick={() => downloadText(copy.raw, `hosoon-recovery-${index + 1}.json`)}>تصدير</Button><Button size="sm" variant="ghost" onClick={() => { try { const result = validateBackup(JSON.parse(copy.raw)); if (!result.ok) toast.error(result.error); else setPending({ file: result.file, summary: result.summary }); } catch { toast.error("نسخة رجوع غير صالحة؛ صدّرها للفحص"); } }}>معاينة الاسترجاع</Button></li>)}</ul></details>}
      </section>
      <OfflineDownloads />
      <section className="space-y-3 border-t border-border pt-4"><h2 className="font-bold text-lg flex items-center gap-2"><Shield className="size-5" aria-hidden /> الخصوصية والمصدر</h2><p className="text-sm text-muted-foreground leading-relaxed">مصدر القرآن المعتمد ثابت. التعديلات السابقة محفوظة كمسودات؛ أي تصحيح جديد اقتراح يحتاج سببًا ومصدرًا ومراجعة مختص، ولا يغيّر نص القراءة.</p><p className="text-sm text-muted-foreground">الصوت يأتي من مزودي التسجيلات؛ لا نسجل صوتك ولا نطلب الميكروفون. سجل التشخيص محلي ولا يحتوي البريد أو الملاحظات أو الرموز السرية.</p><Button variant="ghost" size="sm" onClick={() => downloadJson(diagnosticReport(), "hosoon-local-diagnostics.json")}>تصدير تشخيص محلي اختياري</Button></section>
      <section className="space-y-3 border-t border-border pt-4"><h2 className="font-bold text-lg text-destructive">عمليات تحتاج تأكيدًا</h2>
        <Button variant="outline" className="w-full justify-start min-h-11 text-destructive" disabled={busy} onClick={() => setConfirm("reset")}><Trash2 className="size-4" aria-hidden />{state.ownerId ? "تصفير تقدم الحساب على كل الأجهزة" : "إعادة ضبط تقدم الضيف على هذا الجهاز"}</Button>
        {state.ownerId && <><Button variant="outline" className="w-full min-h-11" disabled={busy} onClick={() => setConfirm("local")}>خروج وإزالة نسخة الحساب من هذا الجهاز فقط</Button><Button variant="destructive" className="w-full min-h-11" disabled={busy} onClick={() => { setDeleteText(""); setConfirm("delete"); }}>حذف الحساب نهائيًا</Button></>}
        <p className="text-xs text-muted-foreground">إزالة النسخة المحلية لا تصفّر السحابة. الحساب يتطلب تأكيد الخادم قبل التصفير، ولا تُحذف صور المصحف معه.</p>
      </section>
    </div>
    {auth && <AuthModal onClose={() => setAuth(false)} />}
    {prior && <AppModal title="المحفوظ السابق" onClose={() => setPrior(null)}><div className="p-5 overflow-y-auto space-y-4"><PriorSelection selected={prior} onChange={setPrior} arabic={arabic} /><Button className="w-full min-h-12" onClick={() => { state.declarePriorMemorization([...prior]); setPrior(null); toast.success("حُدث المحفوظ فقط، دون إنشاء أيام نشاط أو إنجازات تاريخية"); }}>احفظ تصريح المحفوظ</Button></div></AppModal>}
    {pending && <AppModal title="معاينة الاستيراد" onClose={() => { if (!busy) setPending(null); }}><div className="p-5 space-y-3 overflow-y-auto"><p className="text-sm text-muted-foreground">سيستبدل هذا الملف مساحة {state.ownerId ? "الحساب الحالية عبر حقبة خادم جديدة لكل الأجهزة" : "الضيف على هذا الجهاز"}. راجع الأرقام قبل الموافقة.</p><dl className="grid grid-cols-2 text-sm gap-2"><dt>الأثمان المحفوظة</dt><dd>{pending.summary.memorized}</dd><dt>الأيام المكتملة المؤرخة</dt><dd>{pending.summary.daysCompleted}</dd><dt>الملاحظات</dt><dd>{pending.summary.notes}</dd><dt>الجلسات</dt><dd>{pending.summary.sessions}</dd><dt>الرصيد</dt><dd>{pending.summary.totalXp}</dd></dl>{pending.file.state.ownerId !== state.ownerId && <p className="text-sm text-f-gold">الملف من مساحة أخرى؛ موافقتك تعني نقل محتواه إلى المساحة الحالية.</p>}<p className="text-xs text-muted-foreground">المسودات لا تغيّر القرآن. إذا تعذرت نسخة الرجوع أو تأكيد الخادم، لا يجري الاستبدال.</p><Button className="w-full min-h-12" disabled={busy} onClick={() => run(async () => { await replaceAllProgress(pending.file.state); setPending(null); }, "أُكد الاستيراد ونسخة الرجوع محفوظة")}>{busy ? "جارٍ التحقق…" : "أوافق على الاستبدال"}</Button><Button variant="outline" className="w-full min-h-11" disabled={busy} onClick={() => setPending(null)}>إلغاء</Button></div></AppModal>}
    {confirm && confirm !== "delete" && <ConfirmModal title={confirm === "reset" ? "تأكيد إعادة الضبط" : confirm === "transfer" ? "نقل بيانات الضيف؟" : "إزالة نسخة هذا الجهاز؟"} message={confirm === "reset" ? state.ownerId ? "سيُصفّر التقدم والملاحظات والمسودات في الحساب. يلزم الاتصال وتأكيد الخادم؛ الأجهزة القديمة لن تعيد إحياء البيانات المحذوفة. نسخة رجوع محفوظة هنا." : "سيُصفّر تقدم الضيف والملاحظات والمسودات على هذا الجهاز فقط، مع نسخة رجوع محلية." : confirm === "transfer" ? "لنقل بيانات الضيف يجب أن تكون تخصك. ستُدمج مع حسابك بعد قراءة موثقة؛ مساحة الضيف الأصلية تبقى نسخة مستقلة." : "سيجري الخروج وإزالة النسخة المحلية لهذا الحساب ونسخ الرجوع. السحابة لا تتغير، وقد تستعيدها عند الدخول. صدّر التعديلات غير المرفوعة أولًا."} confirmLabel={confirm === "transfer" ? "انقل بياناتي" : "أؤكد"} destructive={confirm !== "transfer"} busy={busy} onClose={() => setConfirm(null)} onConfirm={executeConfirmation} />}
    {confirm === "delete" && <AppModal title="حذف الحساب نهائيًا" onClose={() => { if (!busy) setConfirm(null); }}><div className="p-5 space-y-4"><p className="text-sm text-destructive">سيُحذف حسابك وتقدم الخادم واقتراحاتك، ونسخة الحساب من هذا الجهاز. لا يمكننا حذف ملفات التصدير أو نسخ أجهزة غير متصلة عن بعد. بيانات الضيف المستقلة لا تتغير.</p><label className="block text-sm">اكتب «احذف» للتأكيد<input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} className="w-full mt-2 p-3 rounded-xl bg-background border border-border" aria-label="تأكيد حذف الحساب" /></label><Button variant="destructive" className="w-full min-h-12" disabled={busy || deleteText !== "احذف"} onClick={executeConfirmation}>{busy ? "جارٍ التحقق…" : "احذف الحساب وبياناته"}</Button></div></AppModal>}
  </AppModal>;
}
