"use client";
import { useId, useRef, useState } from "react";
import { Gauge, Headphones, Loader2, Pause, Play, RotateCcw, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { HIZB_RECITERS, THUMUN_RECITERS } from "@/lib/quran-audio";
import { getThumun } from "@/lib/quran-data";
import { surahName } from "@/lib/quran-labels";
import { useHifzStore } from "@/store/useHifzStore";
import { formatClock, formatNum } from "@/lib/format";
import { audioTrackKey, useAudioStore, selectAudio, playAudio, pauseAudio, seekAudio, setAudioSpeed, setAudioLoop, setAudioMuted, retryAudio } from "@/lib/audio-engine";
import { Button } from "../ui/button";

interface Props { mode: "hizb" | "thumun"; targetId: number; title?: string; subtitle?: string; currentAyah?: number; compact?: boolean; minimal?: boolean; floating?: boolean; className?: string; autoPlay?: boolean }
export default function QuranAudioPlayer({ mode, targetId, title, subtitle, currentAyah, compact = false, minimal = false, floating = false, className = "" }: Props) {
  const settings = useHifzStore((s) => s.settings), updateSettings = useHifzStore((s) => s.updateSettings);
  const audio = useAudioStore(), controlId = useId();
  const [expanded, setExpanded] = useState(false);
  const touchStart = useRef<number | null>(null);
  const reciterId = mode === "hizb" ? settings.hizbReciterId : settings.thumunReciterId;
  const key = audioTrackKey(mode, targetId, reciterId), active = audio.track?.key === key;
  const reciters = mode === "hizb" ? HIZB_RECITERS : THUMUN_RECITERS;
  const reciterName = reciters.find((reciter) => reciter.id === reciterId)?.name ?? "القارئ";
  const display = title ?? `${mode === "hizb" ? "الحزب" : "الثمن"} ${formatNum(targetId, settings.arabicNumerals)}`;
  const readerTitle = mode === "thumun" ? `${surahName(getThumun(targetId)?.startSura ?? 1)} — ${display}` : display;
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
  return <section {...touchHandlers} className={`${floating ? "fixed bottom-3 left-1/2 z-40 w-[min(calc(100%-1rem),24rem)] -translate-x-1/2 rounded-full border border-border/80 bg-card/95 px-2 py-1 shadow-lg backdrop-blur-md" : minimal ? "px-1 py-0.5" : `rounded-2xl border border-border bg-surface ${compact ? "p-2" : "p-3"} shadow-sm`} ${className}`} aria-label={`مشغل ${readerTitle}`} data-audio-target={`${mode}:${targetId}`}>
    {!minimal && !floating && <div className="flex items-center gap-2 min-w-0">
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Headphones className="size-4" aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold" title={subtitle ? `${readerTitle} — ${subtitle}` : readerTitle}>{readerTitle}</p>
        <p className="truncate text-[10px] text-muted-foreground">{reciterName}</p>
      </div>
    </div>}
    {!floating && !minimal && <div className="mt-3 min-w-0">
      <input type="range" className="w-full accent-primary min-h-8" dir="ltr" min={0} max={duration || 1} step={0.1} value={Math.min(time, duration || 1)} disabled={!active || !duration}
        aria-label="موضع التشغيل الصوتي" aria-valuetext={`${formatClock(time)} من ${formatClock(duration)}`} onChange={(e) => seekAudio(Number(e.target.value))} />
      <p className="font-mono text-muted-foreground text-center text-xs" dir="ltr">{formatClock(time)} / {formatClock(duration)}</p>
    </div>}
    <div className={`${floating || minimal ? "flex items-center gap-1" : "mt-2 flex items-center justify-center gap-1"}`}>
      <Button size="icon" className={`rounded-full shrink-0 shadow-sm ${floating || minimal ? "size-8 [&_svg]:size-4" : "size-9 [&_svg]:size-4"}`} onClick={toggle} aria-label={active && audio.playing ? "إيقاف مؤقت" : `تشغيل ${readerTitle}`}>
        {active && audio.loading ? <Loader2 className="size-5 animate-spin" aria-hidden /> : active && audio.playing ? <Pause className="size-5" aria-hidden /> : <Play className="size-5" aria-hidden />}
      </Button>
      {!floating && !minimal && <Button variant="ghost" size="icon" className="size-8 rounded-xl text-muted-foreground hover:text-foreground" aria-label="تراجع خمس ثوانٍ" disabled={!active} onClick={() => seekAudio(time - 5)}><SkipForward className="size-4" aria-hidden /></Button>}
      {floating && <button type="button" className="min-w-0 flex-1 text-right text-xs" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
        <span className="block font-mono text-[11px] text-muted-foreground" dir="ltr">{formatClock(time)} / {formatClock(duration)}</span>
        <span className="block truncate text-[11px] text-primary">{currentAyah ? `الآية ${formatNum(currentAyah, false)}` : display}</span>
      </button>}
      {!floating && !minimal && <Button variant="ghost" size="icon" className="size-8 rounded-xl text-muted-foreground hover:text-foreground" aria-label="تقدم خمس ثوانٍ" disabled={!active} onClick={() => seekAudio(time + 5)}><SkipBack className="size-4" aria-hidden /></Button>}
      {floating && <span className="text-[10px] text-muted-foreground" aria-hidden>↑</span>}
      {!floating && !minimal && <Button variant={active && audio.loop ? "default" : "ghost"} size="icon" className="size-8 shrink-0 rounded-xl" aria-label="تكرار التلاوة" aria-pressed={active && audio.loop} onClick={() => { activate(); setAudioLoop(!useAudioStore.getState().loop); }}><RotateCcw className="size-4" aria-hidden /></Button>}
      {!floating && !minimal && <label className="relative flex h-8 min-w-8 items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground focus-within:ring-2 focus-within:ring-primary" aria-label="سرعة التشغيل"><Gauge className="size-3.5" aria-hidden /><span dir="ltr">{audio.speed}×</span><select aria-label="سرعة التشغيل" className="absolute inset-0 cursor-pointer opacity-0" value={audio.speed} onChange={(e) => setAudioSpeed(Number(e.target.value))}>{[0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => <option key={speed} value={speed}>{speed}×</option>)}</select></label>}
      {!floating && !minimal && <Button variant="ghost" size="icon" className="size-8 rounded-xl" aria-label={audio.muted ? "إلغاء الكتم" : "كتم الصوت"} onClick={() => setAudioMuted(!audio.muted)}>{audio.muted ? <VolumeX className="size-4" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}</Button>}
    </div>
    {active && audio.error && <div role="alert" className="text-sm text-destructive bg-destructive/10 rounded-xl p-2">
      <p>{audio.error}</p><Button size="sm" variant="outline" className="mt-2" onClick={retryAudio}>إعادة المحاولة</Button>
    </div>}
    {!minimal && !floating && <div id={controlId} className="mt-3 border-t border-border pt-3">
      <label className="sr-only" htmlFor={`${controlId}-reciter`}>القارئ</label>
      <select id={`${controlId}-reciter`} className="w-full rounded-xl border border-border bg-background p-2 text-sm" value={reciterId} aria-label="اختيار القارئ" onChange={(e) => changeReciter(e.target.value)}>
          {reciters.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
    </div>}
    {floating && expanded && <div className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl border border-border bg-card p-3 shadow-lg">
      <div className="flex items-center justify-between gap-2">
        <Button variant={audio.loop ? "default" : "outline"} size="icon" className="size-9" aria-label="تكرار التلاوة" aria-pressed={audio.loop} onClick={() => { activate(); setAudioLoop(!useAudioStore.getState().loop); }}><RotateCcw className="size-4" aria-hidden /></Button>
        <label className="relative grid size-9 place-items-center rounded-xl border border-border bg-background text-muted-foreground" aria-label="سرعة التلاوة"><Gauge className="size-4" aria-hidden /><select aria-label="سرعة التلاوة" className="absolute inset-0 cursor-pointer opacity-0" value={audio.speed} onChange={(e) => setAudioSpeed(Number(e.target.value))}>{[0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => <option key={speed} value={speed}>{speed}×</option>)}</select></label>
      </div>
    </div>}
  </section>;
}
