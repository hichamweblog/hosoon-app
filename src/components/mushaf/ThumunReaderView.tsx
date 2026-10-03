"use client";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { ArrowRight, Download, Eye, EyeOff, Headphones, Maximize2, Minimize2, Palette } from "lucide-react";
import { useSwipeable } from "react-swipeable";
import { useMushafStore } from "@/store/useMushafStore";
import { useHifzStore } from "@/store/useHifzStore";
import { getMushafPageInfo, getMushafPagesForThumun, TOTAL_MUSHAF_PAGES } from "@/lib/mushaf-mapping";
import { formatNum } from "@/lib/format";
import { thumunRangeLabel, getThumunIncipit } from "@/lib/quran-labels";
import { downloadMushafPages } from "@/lib/offline/mushaf";
import { AppModal } from "../ui/app-modal";
import { Button } from "../ui/button";
import QuranAudioPlayer from "../audio/QuranAudioPlayer";
import { useAudioStore, pauseAudio } from "@/lib/audio-engine";
import { toast } from "sonner";

export default function ThumunReaderView() {
  const reader = useMushafStore(), arabic = useHifzStore((s) => s.settings.arabicNumerals);
  const [loaded, setLoaded] = useState<number | null>(null), [failed, setFailed] = useState<number | null>(null), [retry, setRetry] = useState(0);
  const [controls, setControls] = useState(false), [details, setDetails] = useState(false), [downloading, setDownloading] = useState(false);
  const swiped = useRef(false);
  useEffect(() => { const audio = useAudioStore.getState(); if (audio.track?.mode === "thumun" && audio.track.targetId !== reader.thumunId && audio.playing) pauseAudio(); }, [reader.thumunId]);
  const page = getMushafPageInfo(reader.currentPage, reader.thumunId), t = page.thumun;
  const swipe = useSwipeable({
    onSwipeStart: () => { swiped.current = false; },
    onSwiping: () => { swiped.current = true; },
    onSwipedLeft: () => { if (!reader.isZoomed) reader.nextPage(); },
    onSwipedRight: () => { if (!reader.isZoomed) reader.prevPage(); },
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
  return <AppModal id="mushaf-reader" title={`المصحف — الثمن ${reader.thumunId}`} onClose={reader.closeReader} fullScreen customHeader className={`${themeClass} bg-background text-foreground border-0`}>
    <div className="flex flex-col h-full min-h-0 bg-[#f6f0e4]" onKeyDown={(e) => {
      if ((e.target as HTMLElement).closest("input,select,textarea")) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); reader.nextPage(); }
      if (e.key === "ArrowRight") { e.preventDefault(); reader.prevPage(); }
    }}>
      <header className={`shrink-0 border-b border-border/70 bg-card/95 px-2 backdrop-blur-sm ${controls ? "py-0" : "py-0.5"}`}>
        <div className={`flex items-center justify-between gap-0.5 ${controls ? "min-h-8" : "min-h-8"}`}>
          {controls ? <Button size="icon-xs" variant="ghost" onClick={reader.closeReader} aria-label="إغلاق القارئ"><ArrowRight className="size-3.5" aria-hidden /></Button> : <Button variant="ghost" onClick={() => setControls(true)} aria-label="إظهار أدوات القارئ" className="shrink-0 min-h-8 px-2 text-xs text-primary"><Eye className="size-3.5" aria-hidden /> الأدوات</Button>}
          <h2 className="font-bold text-xs text-center whitespace-nowrap">الثمن {formatNum(reader.thumunId, arabic)} <span className="font-normal text-muted-foreground">· {formatNum(t?.juz ?? 1, arabic)}/{formatNum(t?.hizb ?? 1, arabic)}</span></h2>
          {controls ? <div className="flex items-center gap-0.5">
            <Button size="icon-xs" variant="ghost" aria-label="مطلع الثمن وحدوده" aria-expanded={details} onClick={() => setDetails(!details)}><span className="text-[10px] font-bold">نص</span></Button>
            <Button size="icon-xs" variant="ghost" aria-label={reader.isZoomed ? "ملاءمة الصفحة" : "تكبير الصفحة"} onClick={reader.toggleZoom}>{reader.isZoomed ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}</Button>
            <Button size="icon-xs" variant="ghost" aria-label="تنزيل صفحات هذا الثمن" disabled={downloading} onClick={download}><Download className="size-3.5" aria-hidden /></Button>
            <Button size="icon-xs" variant="ghost" aria-label="إخفاء أدوات القارئ" onClick={() => setControls(false)}><EyeOff className="size-3.5" aria-hidden /></Button>
            <Button size="icon-xs" variant="ghost" aria-label="تغيير مظهر المصحف" onClick={() => reader.setTheme(reader.theme === "sepia" ? "dark" : reader.theme === "dark" ? "light" : "sepia")}><Palette className="size-3.5" aria-hidden /></Button>
            <Button size="icon-xs" variant="ghost" aria-label="الاستماع إلى الثمن المحدد" aria-pressed={reader.showAudio} onClick={reader.toggleAudio}><Headphones className="size-3.5" aria-hidden /></Button>
          </div> : <span className="text-xs text-muted-foreground">{formatNum(reader.currentPage, arabic)} / {formatNum(TOTAL_MUSHAF_PAGES, arabic)}</span>}
        </div>
        {controls && details && <div className="rounded-xl bg-surface p-2 space-y-1 max-h-[18dvh] overflow-y-auto" tabIndex={0}><p className="font-quran text-base">{getThumunIncipit(reader.thumunId)}</p>{t && <p className="text-xs leading-relaxed">{thumunRangeLabel(t, arabic)}</p>}</div>}
        {controls && page.sharedThumunIds.length > 1 && <p className="text-xs text-muted-foreground leading-relaxed" data-testid="shared-page-context">صفحة مشتركة للأثمان {page.sharedThumunIds.map((id) => formatNum(id, arabic)).join(" و")}. العنوان والصوت للثمن المحدد {formatNum(reader.thumunId, arabic)}.</p>}
      </header>
      <div {...swipe} onClick={handlePageTap} className="flex-1 min-h-0 relative overflow-hidden flex items-center justify-center bg-[#f6f0e4] touch-pan-x" aria-label={`صفحة المصحف ${reader.currentPage}`}>
        <button type="button" aria-label="الصفحة التالية" disabled={reader.currentPage >= TOTAL_MUSHAF_PAGES} onClick={(event) => { event.stopPropagation(); reader.nextPage(); }} className="absolute inset-y-0 right-0 z-10 w-10 opacity-0 focus-visible:opacity-100 focus-visible:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" />
        <button type="button" aria-label="الصفحة السابقة" disabled={reader.currentPage <= 1} onClick={(event) => { event.stopPropagation(); reader.prevPage(); }} className="absolute inset-y-0 left-0 z-10 w-10 opacity-0 focus-visible:opacity-100 focus-visible:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" />
        {failed === reader.currentPage ? <div role="alert" className="p-6 text-center space-y-3"><p>تعذّر تحميل صورة هذه الصفحة.</p><p className="text-sm text-muted-foreground">إن كنت دون اتصال، نزّل الصفحات عند توفر الشبكة. ملاحظاتك ومؤقت الجلسة لم يتغيرا.</p><Button variant="outline" onClick={() => { setFailed(null); setLoaded(null); setRetry((r) => r + 1); }}>إعادة تحميل الصورة</Button></div> : <>
          {/* Images are canonical local assets. No generated text replaces a missing Quran page. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={`${reader.currentPage}:${retry}`} src={`${page.imageUrl}${retry ? `?retry=${retry}` : ""}`} alt={`صورة صفحة ${formatNum(reader.currentPage, arabic)} من مصحف الأثمان`} onLoad={() => setLoaded(reader.currentPage)} onError={() => setFailed(reader.currentPage)}
            className={`block w-full h-full object-fill select-none ${reader.isZoomed ? "scale-150" : ""}`} style={{ opacity: loaded === reader.currentPage ? 1 : 0, filter: reader.theme === "dark" ? "invert(0.92) hue-rotate(180deg)" : undefined }} />
          {loaded !== reader.currentPage && <p role="status" className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">جارٍ تحميل الصفحة…</p>}
        </>}
      </div>
      {controls && <footer className="shrink-0 bg-card/95 border-t border-border/70 px-2 py-0.5 pb-safe backdrop-blur-sm">
        {reader.showAudio && <div className="mx-auto max-w-lg border-b border-border/60 pb-0.5" aria-label="صوت الثمن المحدد">
          <QuranAudioPlayer mode="thumun" targetId={reader.thumunId} title={`الثمن ${formatNum(reader.thumunId, arabic)}`} currentAyah={t?.startAya} compact minimal />
        </div>}
        <div className="flex items-center justify-between gap-1 max-w-lg mx-auto">
          <Button variant="ghost" className="min-h-9 px-2 text-xs" disabled={reader.thumunId <= 1} onClick={reader.prevThumun}>ثمن سابق</Button>
          <span className="text-xs font-bold">صفحة {formatNum(reader.currentPage, arabic)} / {formatNum(TOTAL_MUSHAF_PAGES, arabic)}</span>
          <Button variant="ghost" className="min-h-9 px-2 text-xs" disabled={reader.thumunId >= 480} onClick={reader.nextThumun}>ثمن تالٍ</Button>
        </div>
      </footer>}
    </div>
  </AppModal>;
}
