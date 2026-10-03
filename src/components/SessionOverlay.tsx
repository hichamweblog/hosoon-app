"use client";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Minus, Pause, Play, Plus, RotateCcw } from "lucide-react";
import { useSessionTimer } from "@/hooks/useSessionTimer";
import { formatClock, formatNum, localDateKey } from "@/lib/format";
import { getThumun } from "@/lib/quran-data";
import { juzThumunRange } from "@/lib/fortress-calculator";
import { surahSpan, thumunRangeLabel, thumunTitle } from "@/lib/quran-labels";
import { useHifzStore, type ThumunRating } from "@/store/useHifzStore";
import { useSessionStore, type SessionPayload } from "@/store/useSessionStore";
import { useMushafStore } from "@/store/useMushafStore";
import { useAppStatusStore } from "@/store/useAppStatusStore";
import { AppModal, ConfirmModal } from "./ui/app-modal";
import { Button } from "./ui/button";
import QuranAudioPlayer from "./audio/QuranAudioPlayer";
import { toast } from "sonner";

const TITLES = { new_hifz: "جلسة الحفظ", review_near: "مراجعة القريب", review_far: "مراجعة البعيد", free_review: "تثبيت حر", prep: "جلسة التحضير", khatma: "ورد التلاوة والاستماع", khatma_recite: "جلسة التلاوة", khatma_listen: "جلسة الاستماع", maintain_recite: "ورد التثبيت" };
export default function SessionOverlay() {
  const payload = useSessionStore((s) => s.payload);
  return payload ? <SessionInner key={payload.id} payload={payload} /> : null;
}
function SessionInner({ payload }: { payload: SessionPayload }) {
  const state = useHifzStore(), close = useSessionStore((s) => s.close), openReader = useMushafStore((s) => s.openReader);
  const timer = useSessionTimer(payload.minutes ?? 25), [confirmLeave, setConfirmLeave] = useState(false), [step, setStep] = useState(0);
  const status = useAppStatusStore();
  const readonly = !!status.storageError || (!!state.ownerId && !status.cloudReadReady);
  const finishing = useRef(false), arabic = state.settings.arabicNumerals;
  const reviewing = ["review_near", "review_far", "free_review"].includes(payload.kind);
  const preview = readonly || payload.preview || payload.planDate !== localDateKey();
  const target = reviewing ? payload.thumuns[step] : null;
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
  const seconds = () => payload.kind === "free_review" ? Math.min(timer.elapsed, (payload.minutes ?? 15) * 60) : timer.elapsed;
  const leave = () => {
    if (seconds() > 0) state.logSession(preview ? "free_review" : payload.kind === "prep" ? "prep_weekly" : payload.kind === "khatma" ? "khatma_recite" : payload.kind, payload.day, seconds(), { id: payload.id, thumunIds: payload.thumuns.map((t) => t.id), abandoned: true });
    closeCurrent();
  };
  const requestClose = () => {
    if (useSessionStore.getState().payload?.id !== payload.id) return;
    if (timer.isActive || timer.elapsed > 0 || step > 0) setConfirmLeave(true); else closeCurrent();
  };
  const finish = () => {
    if (finishing.current) return;
    finishing.current = true;
    const before = useHifzStore.getState().totalXp;
    state.finishSession(payload, seconds());
    const gained = useHifzStore.getState().totalXp - before;
    if (readonly) toast.error("لم نؤكد حفظ الجلسة؛ مساحة البيانات غير قابلة للكتابة الآن");
    else if (preview) toast.info(useHifzStore.getState().sessions[payload.id] ? "حُفظ وقت الدراسة فقط؛ المعاينة لا تسجّل إنجازًا مخططًا" : "أُغلقت المعاينة دون إنشاء وقت أو إنجاز وهمي");
    else if (payload.kind === "free_review") toast.success("حُفظ التثبيت الفردي — المراجعة المخططة لم تتغير");
    else toast.success(gained > 0 ? `حُفظ إنجازك · +${formatNum(gained, arabic)} نقطة` : "حُفظت الجلسة دون تكرار النقاط");
    closeCurrent();
  };
  const rate = (rating: ThumunRating) => {
    if (!target || preview) return;
    state.recordReviewAttempt(target.id, rating, payload.id);
    setStep((value) => value + 1);
  };
  const recite = payload.reciteJuzs ?? [];
  const reading = ["khatma_recite", "maintain_recite", "khatma"].includes(payload.kind);
  return <AppModal id={`session-${payload.id}`} title={TITLES[payload.kind]} onClose={requestClose}>
    <div className="p-5 space-y-4 overflow-y-auto min-h-0 flex-1 overscroll-contain" tabIndex={0} aria-label="مواد الجلسة">
      {preview && <p className="rounded-xl bg-muted p-3 text-sm">معاينة مواد فقط. لا تقييم محفوظ ولا إنجاز محطة مستقبلية؛ وقت الدراسة الفعلي يمكن حفظه كتعلّم حر.</p>}
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
      })}</ul></div> : payload.thumuns.map((t) => <ThumunStudy key={t.id} id={t.id} audio={payload.kind === "prep" || payload.kind === "new_hifz"} />)}
      {preview && reviewing && payload.thumuns.map((t) => <ThumunStudy key={`preview-${t.id}`} id={t.id} />)}
      <section className="rounded-2xl border border-border p-4 space-y-3" aria-label="مؤقت الجلسة">
        <p className="text-sm text-muted-foreground text-center">وقت المؤقت · الدراسة الفعلية {formatNum(Math.floor(timer.elapsed / 60), arabic)} دقيقة</p>
        <p role="timer" className="text-4xl font-mono font-bold text-primary text-center" dir="ltr" aria-label={`متبقي ${formatClock(timer.remaining)}`}>{formatClock(timer.remaining)}</p>
        <div className="flex items-center justify-center gap-2">
          <Button size="icon" variant="ghost" aria-label="إنقاص خمس دقائق" disabled={timer.isActive || timer.duration <= 300 || payload.kind === "free_review"} onClick={() => timer.changeDuration(-5)}><Minus className="size-4" /></Button>
          <Button size="icon" className="rounded-full size-12" aria-label={timer.isActive ? "إيقاف المؤقت مؤقتًا" : "بدء المؤقت"} disabled={timer.done} onClick={() => timer.isActive ? timer.pause() : timer.start()}>{timer.isActive ? <Pause className="size-5" /> : <Play className="size-5" />}</Button>
          <Button size="icon" variant="ghost" aria-label="زيادة خمس دقائق" disabled={timer.isActive || timer.duration >= 7200 || payload.kind === "free_review"} onClick={() => timer.changeDuration(5)}><Plus className="size-4" /></Button>
          <Button size="icon" variant="ghost" aria-label="إعادة المؤقت مع الاحتفاظ بوقت الدراسة" disabled={payload.kind === "free_review" && timer.done} onClick={timer.reset}><RotateCcw className="size-4" /></Button>
        </div>
        {timer.done && <p role="status" className="text-sm text-primary text-center">انتهى وقت المؤقت؛ لا يُسجّل الإنجاز حتى تؤكده.</p>}
      </section>
    </div>
    <footer className="border-t border-border p-4 space-y-2 shrink-0">
      {reviewing && target && !preview ? <>
        <p className="text-sm text-muted-foreground text-center">قيّم هذا الثمن وحده ثم انتقل للتالي</p>
        <div className="grid grid-cols-3 gap-2">{([["weak", "ضعيف"], ["good", "جيد"], ["strong", "متقن"]] as const).map(([rating, label]) => <Button key={rating} variant="outline" className="min-h-12" onClick={() => rate(rating)}>{label}</Button>)}</div>
        {payload.kind === "free_review" && step > 0 && <Button variant="ghost" className="w-full" onClick={finish}>اكتفِ بما راجعته واحفظ الجلسة</Button>}
      </> : <Button className="w-full min-h-12 text-base font-bold" disabled={reviewing && !preview && !ratedAll} onClick={finish}>{preview ? "حفظ وقت الدراسة الحرة" : reviewing ? payload.kind === "free_review" ? "حفظ التثبيت الحر" : "أتممت مراجعة جميع المواد" : payload.kind === "new_hifz" ? "أتممت حفظ الثمن" : payload.kind === "prep" ? "أتممت تحضير جميع المواد" : "أتممت الورد"}</Button>}
    </footer>
    {confirmLeave && <ConfirmModal title="إنهاء الجلسة؟" message="سيُحفظ الوقت الفعلي والمحاولات التي قيّمتها، دون إتمام بقية الورد أو إعادة ضبط المؤقت عند فتح المصحف." confirmLabel="احفظ الوقت وأنهِ" onClose={() => setConfirmLeave(false)} onConfirm={leave} />}
  </AppModal>;
}
function ThumunStudy({ id, audio = false }: { id: number; audio?: boolean }) {
  const state = useHifzStore(), status = useAppStatusStore(), openReader = useMushafStore((s) => s.openReader), t = getThumun(id)!;
  const arabic = state.settings.arabicNumerals;
  return <section className="rounded-2xl bg-surface p-4 space-y-3">
    <h2 className="font-bold text-base break-words">{thumunTitle(t, arabic)}</h2><p className="text-sm text-muted-foreground">{thumunRangeLabel(t, arabic)}</p>
    <p className="font-quran text-xl leading-loose">{t.partialStart ? "…" : ""}{t.text}</p>
    <Button variant="outline" className="w-full min-h-11" onClick={() => openReader(id)}><BookOpen className="size-4" aria-hidden /> قراءة من المصحف</Button>
    {audio && <QuranAudioPlayer mode="thumun" targetId={id} compact />}
    <label className="text-sm block">ملاحظتك (تُحفظ محليًا)<textarea disabled={!!status.storageError || (!!state.ownerId && !status.cloudReadReady)} value={state.notes[id] ?? ""} maxLength={10000} onChange={(e) => state.setNote(id, e.target.value)} className="w-full mt-1 rounded-xl bg-background border border-border p-3 text-sm resize-y" rows={2} aria-label={`ملاحظتي على الثمن ${id}`} placeholder="موضع التباس أو تذكير…" /></label>
  </section>;
}
