"use client";
import { useEffect, useRef, useState } from "react";
import { BookOpen } from "lucide-react";
import { useSessionTimer } from "@/hooks/useSessionTimer";
import { formatNum, localDateKey } from "@/lib/format";
import { getThumun } from "@/lib/quran-data";
import { juzThumunRange } from "@/lib/fortress-calculator";
import { surahSpan, thumunRangeLabel } from "@/lib/quran-labels";
import { useHifzStore, type ThumunRating } from "@/store/useHifzStore";
import { useSessionStore, type SessionPayload } from "@/store/useSessionStore";
import { useMushafStore } from "@/store/useMushafStore";
import { useAppStatusStore } from "@/store/useAppStatusStore";
import { AppModal, ConfirmModal } from "./ui/app-modal";
import { Button } from "./ui/button";
import QuranAudioPlayer from "./audio/QuranAudioPlayer";
import { toast } from "sonner";

const TITLES = { new_hifz: "جلسة الحفظ", extra_hifz: "حفظ ثمن إضافي", review_near: "مراجعة القريب", review_far: "مراجعة البعيد", free_review: "تثبيت حر", prep: "جلسة التحضير", khatma: "ورد التلاوة والاستماع", khatma_recite: "جلسة التلاوة", khatma_listen: "جلسة الاستماع", maintain_recite: "ورد التثبيت" };
export default function SessionOverlay() {
  const payload = useSessionStore((s) => s.payload);
  return payload ? <SessionInner key={payload.id} payload={payload} /> : null;
}
function SessionInner({ payload }: { payload: SessionPayload }) {
  const state = useHifzStore(), close = useSessionStore((s) => s.close), openReader = useMushafStore((s) => s.openReader);
  const timer = useSessionTimer(), [confirmAdopt, setConfirmAdopt] = useState(false), [step, setStep] = useState(0);
  const status = useAppStatusStore();
  const readonly = !!status.storageError || (!!state.ownerId && !status.cloudReadReady);
  const finishing = useRef(false), arabic = state.settings.arabicNumerals;
  const reviewing = ["review_near", "review_far", "free_review"].includes(payload.kind);
  const preparing = payload.kind === "prep";
  const preview = readonly || payload.preview || payload.planDate !== localDateKey();
  const target = reviewing ? payload.thumuns[step] : null;
  const prepTarget = preparing ? payload.thumuns[step] : null;
  const ratedAll = payload.thumuns.length > 0 && payload.thumuns.every((t) => state.reviewAttempts[`${payload.id}:${t.id}`]);
  useEffect(() => { useSessionStore.getState().setElapsed(payload.id, timer.elapsed); }, [payload.id, timer.elapsed]);
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => {
      const active = useSessionStore.getState();
      if (active.payload?.id !== payload.id || !active.elapsed || useHifzStore.getState().ownerId !== payload.ownerId) return;
      useHifzStore.getState().logSession("free_review", payload.day, active.elapsed, { id: payload.id, thumunIds: payload.thumuns.map((t) => t.id), abandoned: true });
      event.preventDefault(); event.returnValue = "";
    };
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, [payload]);
  const closeCurrent = () => { if (useSessionStore.getState().payload?.id === payload.id) close(); };
  const seconds = () => timer.elapsed;
  const leave = () => {
    if (seconds() > 0) state.logSession(preview ? "free_review" : payload.kind === "extra_hifz" ? "new_hifz" : payload.kind === "prep" ? "prep_weekly" : payload.kind === "khatma" ? "khatma_recite" : payload.kind, payload.day, seconds(), { id: payload.id, thumunIds: payload.thumuns.map((t) => t.id), abandoned: true });
    closeCurrent();
  };
  const requestClose = () => {
    if (useSessionStore.getState().payload?.id !== payload.id) return;
    leave();
  };
  const finish = () => {
    if (finishing.current) return;
    if (payload.kind === "extra_hifz") { setConfirmAdopt(true); return; }
    finishing.current = true;
    state.finishSession(payload, seconds());
    if (readonly) toast.error("لم نؤكد حفظ الجلسة؛ مساحة البيانات غير قابلة للكتابة الآن");
    else if (preview) toast.info(useHifzStore.getState().sessions[payload.id] ? "حُفظ وقت الدراسة فقط؛ المعاينة لا تسجّل إنجازًا مخططًا" : "أُغلقت المعاينة دون إنشاء وقت أو إنجاز وهمي");
    else if (payload.kind === "free_review") toast.success("حُفظ التثبيت الفردي — المراجعة المخططة لم تتغير");
    else toast.success("حُفظ إنجازك");
    closeCurrent();
  };
  const adopt = () => {
    finishing.current = true;
    if (readonly) {
      toast.error("لا يمكن اعتماد الثمن؛ مساحة البيانات غير قابلة للكتابة الآن");
      finishing.current = false;
      return;
    }
    const adopted = state.adoptExtraMemorization(payload.thumuns[0]?.id ?? 0, payload.id, seconds());
    if (adopted) toast.success("اعتمدت الثمن الإضافي — حُدّثت محطة الحفظ وخطط التحضير والمراجعة القادمة");
    else toast.error("تعذر اعتماد الثمن؛ لم يعد هو الثمن التالي المتاح");
    closeCurrent();
  };
  const rate = (rating: ThumunRating) => {
    if (!target || preview) return;
    state.recordReviewAttempt(target.id, rating, payload.id);
    setStep((value) => value + 1);
  };
  const nextPreparation = () => {
    if (step < payload.thumuns.length - 1) setStep((value) => value + 1);
    else finish();
  };
  const recite = payload.reciteJuzs ?? [];
  const reading = ["khatma_recite", "maintain_recite", "khatma"].includes(payload.kind);
  return <AppModal id={`session-${payload.id}`} title={TITLES[payload.kind]} onClose={requestClose}>
    <div className="p-5 space-y-4 overflow-y-auto min-h-0 flex-1 overscroll-contain" tabIndex={0} aria-label="مواد الجلسة">
      {preview && payload.kind !== "extra_hifz" && <p className="rounded-xl bg-muted p-3 text-sm">معاينة مواد فقط. لا تقييم محفوظ ولا إنجاز محطة مستقبلية؛ وقت الدراسة الفعلي يمكن حفظه كتعلّم حر.</p>}
      {payload.kind === "extra_hifz" && <p className="rounded-xl bg-primary/10 p-3 text-sm leading-relaxed">هذا ثمن اختياري خارج ورد اليوم. لا يغيّر الخطة إلا إذا صرّحت باعتماده محفوظًا.</p>}
      {payload.kind === "free_review" && <p className="text-sm text-muted-foreground">جلسة إضافية بحد {formatNum(payload.minutes ?? 15, arabic)} دقيقة؛ لا تُكمل مراجعة القريب أو البعيد. يمكنك التوقف وحفظ ما راجعته.</p>}
      {reading && recite.map((juz) => {
        const [a, b] = juzThumunRange(juz), from = getThumun(a)!, to = getThumun(b)!;
        return <section key={juz} className="rounded-2xl bg-surface p-4 space-y-3"><h2 className="font-bold">تلاوة الجزء {formatNum(juz, arabic)}</h2><ul className="text-sm space-y-2">{surahSpan(from, to).map((row) => <li key={`${row.sura}:${row.fromAya}`}>{row.name}: {formatNum(row.fromAya, arabic)}–{formatNum(row.toAya, arabic)}</li>)}</ul><Button variant="outline" className="w-full min-h-11" onClick={() => openReader(a)}><BookOpen className="size-4" aria-hidden /> اقرأ الجزء من المصحف</Button></section>;
      })}
      {["khatma_listen", "khatma"].includes(payload.kind) && (payload.listenHizbs ?? []).map((hizb) => <QuranAudioPlayer key={hizb} mode="hizb" targetId={hizb} title={`الحزب ${formatNum(hizb, arabic)}`} />)}
      {reviewing ? target ? <>
        <p className="text-sm font-semibold text-primary">الثمن {formatNum(step + 1, arabic)} من {formatNum(payload.thumuns.length, arabic)}</p>
        {!preview && <ThumunStudy key={target.id} id={target.id} />}
      </> : <div className="rounded-2xl bg-primary/10 p-4 space-y-3"><h2 className="font-bold">نتائج هذه الجلسة</h2><ul className="text-sm space-y-2">{payload.thumuns.map((t) => {
        const rating = state.reviewAttempts[`${payload.id}:${t.id}`]?.rating;
        return <li key={t.id}>الثمن {formatNum(t.id, arabic)}: {rating === "weak" ? "يحتاج تثبيتًا" : rating === "good" ? "جيد" : rating === "strong" ? "متقن" : "لم يُقيّم"}</li>;
      })}</ul></div> : preparing && prepTarget ? <><p className="text-sm font-semibold text-primary">الثمن {formatNum(step + 1, arabic)} من {formatNum(payload.thumuns.length, arabic)}</p><ThumunStudy key={prepTarget.id} id={prepTarget.id} audio /></> : payload.thumuns.map((t) => <ThumunStudy key={t.id} id={t.id} audio={payload.kind === "new_hifz" || payload.kind === "extra_hifz"} />)}
      {preview && reviewing && payload.thumuns.map((t) => <ThumunStudy key={`preview-${t.id}`} id={t.id} />)}
      <p className="text-center text-xs text-muted-foreground">يُحسب وقت الدراسة تلقائيًا أثناء نشاطك</p>
    </div>
    <footer className="border-t border-border p-4 space-y-2 shrink-0">
      {preparing && step > 0 && <Button variant="ghost" className="w-full" onClick={() => setStep((value) => value - 1)}>السابق</Button>}
      {reviewing && target && !preview ? <>
        <p className="text-sm text-muted-foreground text-center">قيّم هذا الثمن وحده ثم انتقل للتالي</p>
        <div className="grid grid-cols-3 gap-2">{([["weak", "ضعيف"], ["good", "جيد"], ["strong", "متقن"]] as const).map(([rating, label]) => <Button key={rating} variant="outline" className="min-h-12" onClick={() => rate(rating)}>{label}</Button>)}</div>
        {payload.kind === "free_review" && step > 0 && <Button variant="ghost" className="w-full" onClick={finish}>اكتفِ بما راجعته واحفظ الجلسة</Button>}
      </> : <Button className="w-full min-h-12 text-base font-bold" disabled={reviewing && !preview && !ratedAll} onClick={preparing ? nextPreparation : finish}>{preparing ? step < payload.thumuns.length - 1 ? "التالي" : "إنهاء جلسة التحضير" : preview ? "حفظ وقت الدراسة الحرة" : reviewing ? payload.kind === "free_review" ? "حفظ التثبيت الحر" : "أتممت مراجعة جميع المواد" : payload.kind === "extra_hifz" ? "أنهيت دراسة الثمن" : payload.kind === "new_hifz" ? "أتممت حفظ الثمن" : "أتممت الورد"}</Button>}
    </footer>
    {confirmAdopt && <ConfirmModal title="اعتماد الثمن المحفوظ؟" message="سيصبح هذا الثمن جزءًا من محفوظاتك، وتتغير محطة الحفظ التالية وخطط التحضير والمراجعة القادمة. سيبقى ورد اليوم كما هو." confirmLabel="اعتمد الثمن" onClose={() => setConfirmAdopt(false)} onConfirm={adopt} />}
  </AppModal>;
}
function ThumunStudy({ id, audio = false }: { id: number; audio?: boolean }) {
  const state = useHifzStore(), openReader = useMushafStore((s) => s.openReader), t = getThumun(id)!;
  const arabic = state.settings.arabicNumerals;
  return <section className="rounded-2xl bg-surface p-4 space-y-3">
    <h2 className="font-bold text-base break-words">الثمن {id}</h2><p className="text-sm text-muted-foreground">{thumunRangeLabel(t, arabic)}</p>
    <p className="font-quran text-xl leading-loose">{t.partialStart ? "…" : ""}{t.text}</p>
    <Button variant="outline" className="w-full min-h-11" onClick={() => openReader(id)}><BookOpen className="size-4" aria-hidden /> قراءة من المصحف</Button>
    {audio && <QuranAudioPlayer mode="thumun" targetId={id} compact />}
  </section>;
}
