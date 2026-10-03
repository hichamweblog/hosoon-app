"use client";
import { useState } from "react";
import { getThumun, getAllSurahs, getSurah } from "@/lib/quran-data";
import { correctionFieldsSchema } from "@/lib/progress/schema";
import { useHifzStore } from "@/store/useHifzStore";
import { useAuthStore } from "@/store/useAuthStore";
import { submitThumunCorrection } from "@/lib/supabase";
import { thumunRangeLabel } from "@/lib/quran-labels";
import { useAppStatusStore } from "@/store/useAppStatusStore";
import { AppModal } from "./ui/app-modal";
import { Button } from "./ui/button";
import AuthModal from "./AuthModal";
import { toast } from "sonner";
export default function ThumunEditor({ thumunId, onClose }: { thumunId: number; onClose: () => void }) {
  const state = useHifzStore(), user = useAuthStore((s) => s.user), base = getThumun(thumunId)!;
  const original = state.editedThumuns[thumunId];
  const [fields, setFields] = useState({ startSura: original?.startSura ?? base.startSura, startAya: original?.startAya ?? base.startAya, endSura: original?.endSura ?? base.endSura, endAya: original?.endAya ?? base.endAya, text: original?.text ?? base.text });
  const [note, setNote] = useState(original?.note ?? ""), [source, setSource] = useState(original?.source ?? ""), [busy, setBusy] = useState(false), [auth, setAuth] = useState(false), [error, setError] = useState<string | null>(null);
  const save = () => {
    const status = useAppStatusStore.getState();
    if (status.storageError || (state.ownerId && !status.cloudReadReady)) { setError("لا يمكن تأكيد حفظ المسودة حتى تصبح مساحة البيانات قابلة للكتابة"); return false; }
    const parsed = correctionFieldsSchema.safeParse(fields);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "حقول غير صالحة"); return false; }
    state.editThumun(thumunId, { ...parsed.data, note, source }); setError(null); return true;
  };
  const submit = async () => {
    if (!save()) return;
    if (!user) { setAuth(true); return; }
    if (note.trim().length < 10 || !source.trim()) { setError("أضف سببًا واضحًا (10 أحرف على الأقل) ومصدرًا للتحقق"); return; }
    setBusy(true);
    try {
      const { error } = await submitThumunCorrection({ thumunId, fields, note, source, expectedOwnerId: state.ownerId! });
      if (error) setError("تعذّر إرسال الاقتراح. المسودة محفوظة؛ تحقق من إعداد الخادم أو الاتصال وحاول لاحقًا.");
      else { toast.success("أُرسل الاقتراح للمراجعة. المصدر المعتمد لم يتغير والمسودة باقية."); onClose(); }
    } catch { setError("تعذر الاتصال؛ بقي الاقتراح مسودة فقط"); } finally { setBusy(false); }
  };
  return <AppModal title={`اقتراح تصحيح للثمن ${thumunId}`} onClose={() => { if (!busy) onClose(); }}>
    <div className="p-5 space-y-4 overflow-y-auto min-h-0">
      <p className="text-sm text-muted-foreground">هذا اقتراح للمراجعة وليس تحريرًا للمصحف. حدود القراءة المعتمدة: {thumunRangeLabel(base, state.settings.arabicNumerals)}.</p>
      {original && <p className="rounded-xl bg-primary/10 p-3 text-sm">لديك مسودة محفوظة. التعديل السابق لا يغيّر المصدر القرآني، ولم يُحذف عند الترحيل.</p>}
      <div className="grid grid-cols-2 gap-3">{(["start", "end"] as const).map((side) => {
        const sura = side === "start" ? "startSura" : "endSura", aya = side === "start" ? "startAya" : "endAya";
        return <fieldset key={side} className="space-y-2 min-w-0"><legend className="font-bold text-sm">{side === "start" ? "البداية المقترحة" : "النهاية المقترحة"}</legend><label className="block text-sm">السورة<select aria-label={`سورة ${side === "start" ? "البداية" : "النهاية"}`} value={fields[sura]} className="w-full p-2 mt-1 rounded-xl bg-background border border-border" onChange={(e) => setFields({ ...fields, [sura]: Number(e.target.value), [aya]: 1 })}>{getAllSurahs().map((s) => <option value={s.number} key={s.number}>{s.name}</option>)}</select></label><label className="block text-sm">الآية<input type="number" min={1} max={getSurah(fields[sura])?.verses ?? 286} value={fields[aya]} aria-label={`آية ${side === "start" ? "البداية" : "النهاية"}`} className="w-full p-2 mt-1 rounded-xl bg-background border border-border" onChange={(e) => setFields({ ...fields, [aya]: Number(e.target.value) })} /></label></fieldset>;
      })}</div>
      <label className="block text-sm">المطلع أو الوصف المقترح (لا يغيّر نص القراءة)<textarea value={fields.text} maxLength={3000} rows={3} className="w-full mt-1 p-3 rounded-xl bg-background border border-border font-quran leading-loose" onChange={(e) => setFields({ ...fields, text: e.target.value })} /></label>
      <label className="block text-sm">سبب الاقتراح<textarea value={note} maxLength={2000} rows={3} className="w-full mt-1 p-3 rounded-xl bg-background border border-border" onChange={(e) => setNote(e.target.value)} placeholder="اشرح المشكلة بوضوح…" /></label>
      <label className="block text-sm">مصدر التحقق<input value={source} maxLength={1000} className="w-full mt-1 p-3 rounded-xl bg-background border border-border" onChange={(e) => setSource(e.target.value)} placeholder="اسم المصحف، الطبعة، الصفحة أو الرابط" /></label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => { if (save()) toast.success("حُفظت الحقول والسبب والمصدر كمسودة محلية فقط"); }}>حفظ المسودة</Button><Button disabled={busy} onClick={submit}>{busy ? "جارٍ الإرسال…" : user ? "إرسال للمراجعة" : "دخول لإرسال الاقتراح"}</Button></div>
      <p className="text-xs text-muted-foreground">قرار الاعتماد لمراجع مخوّل ومختص؛ لن تطبق الواجهة الاقتراح أو تعتمد تصحيحًا بنفسها.</p>
    </div>
    {auth && <AuthModal onClose={() => setAuth(false)} />}
  </AppModal>;
}
