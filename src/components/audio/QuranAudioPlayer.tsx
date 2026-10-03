"use client";
import { useId, useRef, useState } from "react";
import { Headphones, Loader2, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { HIZB_RECITERS, THUMUN_RECITERS } from "@/lib/quran-audio";
import { useHifzStore } from "@/store/useHifzStore";
import { formatClock, formatNum } from "@/lib/format";
import { audioTrackKey, useAudioStore, selectAudio, playAudio, pauseAudio, seekAudio, setAudioSpeed, setAudioLoop, setAudioMuted, retryAudio, setLoopPoint, clearAudioSegment } from "@/lib/audio-engine";
import { Button } from "../ui/button";
import { toast } from "sonner";

interface Props { mode: "hizb" | "thumun"; targetId: number; title?: string; subtitle?: string; currentAyah?: number; compact?: boolean; minimal?: boolean; floating?: boolean; className?: string; autoPlay?: boolean }
export default function QuranAudioPlayer({ mode, targetId, title, subtitle, currentAyah, compact = false, minimal = false, floating = false, className = "" }: Props) {
  const settings = useHifzStore((s) => s.settings), updateSettings = useHifzStore((s) => s.updateSettings);
  const audio = useAudioStore(), controlId = useId();
  const [details, setDetails] = useState(!compact);
  const [expanded, setExpanded] = useState(false);
  const touchStart = useRef<number | null>(null);
  const reciterId = mode === "hizb" ? settings.hizbReciterId : settings.thumunReciterId;
  const key = audioTrackKey(mode, targetId, reciterId), active = audio.track?.key === key;
  const reciters = mode === "hizb" ? HIZB_RECITERS : THUMUN_RECITERS;
  const display = title ?? `${mode === "hizb" ? "الحزب" : "الثمن"} ${formatNum(targetId, settings.arabicNumerals)}`;
  const activate = () => selectAudio(mode, targetId, reciterId, display);
  const toggle = () => { if (active && audio.playing) pauseAudio(); else { activate(); void playAudio(); } };
  const changeReciter = (id: string) => {
    const resume = active && audio.playing;
    updateSettings(mode === "hizb" ? { hizbReciterId: id } : { thumunReciterId: id });
    if (active) { selectAudio(mode, targetId, id, display); if (resume) void playAudio(); }
  };
  const time = active ? audio.time : 0, duration = active ? audio.duration : 0;
  const touchHandlers = floating ? {
    onTouchStart: (event: React.TouchEvent) => { touchStart.current = event.touches[0]?.clientY ?? null; },
    onTouchEnd: (event: React.TouchEvent) => {
      if (touchStart.current === null) return;
      const delta = (event.changedTouches[0]?.clientY ?? touchStart.current) - touchStart.current;
      if (delta < -24) setExpanded(true);
      else if (delta > 24) setExpanded(false);
      touchStart.current = null;
    },
  } : {};
  return <section {...touchHandlers} className={`${floating ? "fixed bottom-3 left-1/2 z-40 w-[min(calc(100%-1rem),24rem)] -translate-x-1/2 rounded-full border border-border/80 bg-card/95 px-2 py-1 shadow-lg backdrop-blur-md" : minimal ? "px-1 py-0.5" : "rounded-2xl border border-border bg-surface p-3 space-y-2"} ${className}`} aria-label={`مشغل ${display}`} data-audio-target={`${mode}:${targetId}`}>
    {!minimal && !floating && <div className="flex items-center gap-2 min-w-0">
      <Headphones className="size-4 text-primary shrink-0" aria-hidden />
      <div className="flex-1 min-w-0"><p className="font-bold text-sm break-words">{display}</p>{subtitle && !compact && <p className="text-xs text-muted-foreground">{subtitle}</p>}</div>
      {!minimal && <button className="min-h-11 px-2 text-xs text-primary" aria-expanded={details} aria-controls={controlId} onClick={() => setDetails((v) => !v)}>الأدوات</button>}
    </div>}
    <div className="flex items-center gap-1">
      <Button size="icon" className={`rounded-full shrink-0 ${floating || minimal ? "size-8 [&_svg]:size-4" : "size-11"}`} onClick={toggle} aria-label={active && audio.playing ? "إيقاف مؤقت" : `تشغيل ${display}`}>
        {active && audio.loading ? <Loader2 className="size-5 animate-spin" aria-hidden /> : active && audio.playing ? <Pause className="size-5" aria-hidden /> : <Play className="size-5" aria-hidden />}
      </Button>
      {floating ? <button type="button" className="min-w-0 flex-1 text-right text-xs" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
        <span className="block font-mono text-[11px] text-muted-foreground" dir="ltr">{formatClock(time)} / {formatClock(duration)}</span>
        <span className="block truncate text-[11px] text-primary">{currentAyah ? `الآية ${formatNum(currentAyah, false)}` : display}</span>
      </button> : <div className="min-w-0 flex-1">
        <input type="range" className={`w-full accent-[var(--primary)] ${minimal ? "min-h-5" : "min-h-8"}`} dir="ltr" min={0} max={duration || 1} step={0.1} value={Math.min(time, duration || 1)} disabled={!active || !duration}
          aria-label="موضع التشغيل الصوتي" aria-valuetext={`${formatClock(time)} من ${formatClock(duration)}`} onChange={(e) => seekAudio(Number(e.target.value))} />
        <p className={`font-mono text-muted-foreground text-center ${minimal ? "text-[10px] leading-none" : "text-xs"}`} dir="ltr">{formatClock(time)} / {formatClock(duration)}</p>
      </div>}
      {floating && <span className="text-[10px] text-muted-foreground" aria-hidden>↑</span>}
      {!minimal && <Button variant="ghost" size="icon" className="shrink-0" aria-label="تراجع خمس ثوانٍ" disabled={!active} onClick={() => seekAudio(time - 5)}>−5</Button>}
    </div>
    {active && audio.error && <div role="alert" className="text-sm text-destructive bg-destructive/10 rounded-xl p-2">
      <p>{audio.error}</p><Button size="sm" variant="outline" className="mt-2" onClick={retryAudio}>إعادة المحاولة</Button>
    </div>}
    {(details || expanded) && !minimal && <div id={controlId} className="space-y-2 pt-2 border-t border-border">
      <label className="flex flex-wrap items-center gap-2 text-xs">القارئ
        <select className="flex-1 min-w-0 rounded-xl bg-background border border-border p-2 text-sm" value={reciterId} aria-label="اختيار القارئ" onChange={(e) => changeReciter(e.target.value)}>
          {reciters.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={active && audio.loop ? "default" : "outline"} size="sm" aria-pressed={active && audio.loop} onClick={() => { activate(); setAudioLoop(!useAudioStore.getState().loop); }}><RotateCcw className="size-4" aria-hidden /> تكرار كامل</Button>
        <label className="text-xs flex items-center gap-1">السرعة<select aria-label="سرعة التشغيل" className="p-2 rounded-lg bg-background border border-border" value={audio.speed} onChange={(e) => setAudioSpeed(Number(e.target.value))}>{[0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => <option key={speed} value={speed}>{speed}×</option>)}</select></label>
        <Button variant="ghost" size="icon" aria-label={audio.muted ? "إلغاء الكتم" : "كتم الصوت"} onClick={() => setAudioMuted(!audio.muted)}>{audio.muted ? <VolumeX className="size-4" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}</Button>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <Button variant="outline" size="sm" disabled={!active || !duration} onClick={() => setLoopPoint("start")}>بداية المقطع A</Button>
        <Button variant="outline" size="sm" disabled={!active || audio.loopStart === null} onClick={() => { if (!setLoopPoint("end")) toast.info("اختر نهاية بعد البداية بنصف ثانية على الأقل"); }}>نهاية المقطع B</Button>
        {active && audio.loopStart !== null && <><span className="text-xs" dir="ltr">A {formatClock(audio.loopStart)} · B {audio.loopEnd !== null ? formatClock(audio.loopEnd) : "—"}</span><button className="text-xs text-primary min-h-11" onClick={clearAudioSegment}>إلغاء المقطع</button></>}
      </div>
      <p className="text-xs text-muted-foreground">مصادر صوت خارجية؛ قد يتطلب التشغيل اتصالًا.</p>
    </div>}
    {floating && expanded && <div className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl border border-border bg-card p-3 shadow-lg">
      <div className="flex items-center justify-between gap-2">
        <Button variant={audio.loop ? "default" : "outline"} size="sm" aria-pressed={audio.loop} onClick={() => { activate(); setAudioLoop(!useAudioStore.getState().loop); }}><RotateCcw className="size-4" aria-hidden /> تكرار</Button>
        <label className="text-xs flex items-center gap-1">السرعة<select aria-label="سرعة التلاوة" className="rounded-lg border border-border bg-background p-1" value={audio.speed} onChange={(e) => setAudioSpeed(Number(e.target.value))}>{[0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => <option key={speed} value={speed}>{speed}×</option>)}</select></label>
      </div>
    </div>}
  </section>;
}
