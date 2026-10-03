"use client";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { ArrowRight, Download, EyeOff, Gauge, Palette, Pause, Play, RotateCcw } from "lucide-react";
import { useSwipeable } from "react-swipeable";
import { useMushafStore } from "@/store/useMushafStore";
import { useHifzStore } from "@/store/useHifzStore";
import { getMushafPageInfo, getMushafPagesForThumun, TOTAL_MUSHAF_PAGES } from "@/lib/mushaf-mapping";
import { formatNum } from "@/lib/format";
import { downloadMushafPages } from "@/lib/offline/mushaf";
import { AppModal } from "../ui/app-modal";
import { Button } from "../ui/button";
import { audioTrackKey, useAudioStore, pauseAudio, playAudio, selectAudio, setAudioLoop, setAudioSpeed } from "@/lib/audio-engine";
import { toast } from "sonner";

export default function ThumunReaderView() {
  const reader = useMushafStore(), settings = useHifzStore((s) => s.settings), arabic = settings.arabicNumerals;
  const [loaded, setLoaded] = useState<number | null>(null), [failed, setFailed] = useState<number | null>(null), [retry, setRetry] = useState(0);
  const [controls, setControls] = useState(false), [downloading, setDownloading] = useState(false);
  const swiped = useRef(false);
  useEffect(() => { const audio = useAudioStore.getState(); if (audio.track?.mode === "thumun" && audio.track.targetId !== reader.thumunId && audio.playing) pauseAudio(); }, [reader.thumunId]);
  const page = getMushafPageInfo(reader.currentPage, reader.thumunId);
  const audio = useAudioStore(), audioKey = audioTrackKey("thumun", reader.thumunId, settings.thumunReciterId);
  const audioActive = audio.track?.key === audioKey;
  const toggleReaderAudio = () => {
    if (audioActive && audio.playing) pauseAudio();
    else {
      if (!audioActive) selectAudio("thumun", reader.thumunId, settings.thumunReciterId, `الثمن ${formatNum(reader.thumunId, arabic)}`);
      void playAudio();
    }
  };
  const swipe = useSwipeable({
    onSwipeStart: () => { swiped.current = false; },
    onSwiping: () => { swiped.current = true; },
    onSwipedLeft: () => reader.prevPage(),
    onSwipedRight: () => reader.nextPage(),
    delta: 50,
    preventScrollOnSwipe: true,
    trackMouse: false,
  });
  const handlePageTap = (event: MouseEvent<HTMLDivElement>) => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    const { left, width } = event.currentTarget.getBoundingClientRect();
    const position = (event.clientX - left) / width;
    if (position < 0.2) reader.prevPage();
    else if (position > 0.8) reader.nextPage();
    else setControls((visible) => !visible);
  };
  const themeClass = reader.theme === "dark" ? "dark" : reader.theme === "light" ? "light" : "warm";
  const download = async () => {
    setDownloading(true);
    try { await downloadMushafPages(getMushafPagesForThumun(reader.thumunId)); toast.success("نُزّلت صفحات هذا الثمن للقراءة دون اتصال"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "تعذر التنزيل"); }
    finally { setDownloading(false); }
  };
  const readerBackground = reader.theme === "dark" ? "bg-[#16181a]" : "bg-[#f6f0e4]";
  return <AppModal id="mushaf-reader" title={`المصحف — الثمن ${reader.thumunId}`} onClose={reader.closeReader} fullScreen customHeader className={`${themeClass} bg-background text-foreground border-0`}>
    <div className={`flex flex-col h-full min-h-0 ${readerBackground}`} onKeyDown={(e) => {
      if ((e.target as HTMLElement).closest("input,select,textarea")) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); reader.nextPage(); }
      if (e.key === "ArrowRight") { e.preventDefault(); reader.prevPage(); }
    }}>
      {controls && <header className="shrink-0 border-b border-border/70 bg-card/95 px-2 py-0 backdrop-blur-sm">
        <div className="flex min-h-8 items-center justify-between gap-0">
          <Button size="icon-xs" variant="ghost" onClick={reader.closeReader} aria-label="إغلاق القارئ" className="!size-7 !min-h-7 !p-0"><ArrowRight className="size-3.5" aria-hidden /></Button>
          <h2 className="min-w-0 truncate px-1 text-center text-xs font-bold">الثمن {formatNum(reader.thumunId, arabic)}</h2>
          <div className="flex shrink-0 items-center gap-0">
            <div className="relative flex size-7 items-center justify-center">
              <button type="button" aria-label={audioActive && audio.playing ? "إيقاف الصوت" : "تشغيل الصوت"} onClick={toggleReaderAudio} className="relative z-10 grid size-7 place-items-center rounded-full text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                {audioActive && audio.playing ? <Pause className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
              </button>
              {audioActive && audio.duration > 0 && <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left rounded-full bg-primary" style={{ transform: `scaleX(${Math.min(1, audio.time / audio.duration)})` }} aria-hidden />}
            </div>
            <Button size="icon-xs" variant={audioActive && audio.loop ? "default" : "ghost"} aria-label="تكرار الثمن باستمرار" aria-pressed={audioActive && audio.loop} onClick={() => { if (!audioActive) selectAudio("thumun", reader.thumunId, settings.thumunReciterId, `الثمن ${formatNum(reader.thumunId, arabic)}`); setAudioLoop(!audio.loop); }} className="!size-7 !min-h-7 !p-0"><RotateCcw className="size-3.5" aria-hidden /></Button>
            <label className="relative grid size-7 place-items-center rounded-md text-primary focus-within:outline focus-within:outline-2 focus-within:outline-primary" aria-label="سرعة التشغيل"><Gauge className="size-3.5 pointer-events-none" aria-hidden /><select aria-label="سرعة التشغيل" value={audio.speed} onChange={(event) => setAudioSpeed(Number(event.target.value))} className="absolute inset-0 cursor-pointer opacity-0">{[0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => <option key={speed} value={speed}>{speed}×</option>)}</select></label>
            <Button size="icon-xs" variant="ghost" aria-label="تنزيل صفحات هذا الثمن" disabled={downloading} onClick={download} className="!size-7 !min-h-7 !p-0"><Download className="size-3.5" aria-hidden /></Button>
            <Button size="icon-xs" variant="ghost" aria-label="تغيير مظهر المصحف" onClick={() => reader.setTheme(reader.theme === "sepia" ? "dark" : reader.theme === "dark" ? "light" : "sepia")} className="!size-7 !min-h-7 !p-0"><Palette className="size-3.5" aria-hidden /></Button>
            <Button size="icon-xs" variant="ghost" aria-label="إخفاء أدوات القارئ" onClick={() => setControls(false)} className="!size-7 !min-h-7 !p-0"><EyeOff className="size-3.5" aria-hidden /></Button>
          </div>
        </div>
      </header>}
      <div {...swipe} onClick={handlePageTap} className={`flex-1 min-h-0 relative overflow-hidden flex items-center justify-center ${readerBackground} touch-pan-x`} aria-label={`صفحة المصحف ${reader.currentPage}`}>
        <button type="button" aria-label="الصفحة التالية" disabled={reader.currentPage >= TOTAL_MUSHAF_PAGES} onClick={(event) => { event.stopPropagation(); reader.nextPage(); }} className="absolute inset-y-0 right-0 z-10 w-10 opacity-0 focus-visible:opacity-100 focus-visible:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" />
        <button type="button" aria-label="الصفحة السابقة" disabled={reader.currentPage <= 1} onClick={(event) => { event.stopPropagation(); reader.prevPage(); }} className="absolute inset-y-0 left-0 z-10 w-10 opacity-0 focus-visible:opacity-100 focus-visible:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" />
        {failed === reader.currentPage ? <div role="alert" className="p-6 text-center space-y-3"><p>تعذّر تحميل صورة هذه الصفحة.</p><p className="text-sm text-muted-foreground">إن كنت دون اتصال، نزّل الصفحات عند توفر الشبكة. ملاحظاتك ومؤقت الجلسة لم يتغيرا.</p><Button variant="outline" onClick={() => { setFailed(null); setLoaded(null); setRetry((r) => r + 1); }}>إعادة تحميل الصورة</Button></div> : <>
          {/* Images are canonical local assets. No generated text replaces a missing Quran page. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={`${reader.currentPage}:${retry}`} src={`${page.imageUrl}${retry ? `?retry=${retry}` : ""}`} alt={`صورة صفحة ${formatNum(reader.currentPage, arabic)} من مصحف الأثمان`} onLoad={() => setLoaded(reader.currentPage)} onError={() => setFailed(reader.currentPage)}
            className="block h-auto w-auto max-h-full max-w-full object-contain select-none" style={{ opacity: loaded === reader.currentPage ? 1 : 0, filter: reader.theme === "dark" ? "invert(0.88) sepia(0.12) saturate(0.7) hue-rotate(180deg)" : undefined }} />
          {loaded !== reader.currentPage && <p role="status" className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">جارٍ تحميل الصفحة…</p>}
        </>}
      </div>
    </div>
  </AppModal>;
}
