"use client";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Download, Headphones, Maximize2, Minimize2, Palette } from "lucide-react";
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
  const [controls, setControls] = useState(true), [details, setDetails] = useState(false), [downloading, setDownloading] = useState(false);
  useEffect(() => { const audio = useAudioStore.getState(); if (audio.track?.mode === "thumun" && audio.track.targetId !== reader.thumunId && audio.playing) pauseAudio(); }, [reader.thumunId]);
  const page = getMushafPageInfo(reader.currentPage, reader.thumunId), t = page.thumun;
  const swipe = useSwipeable({ onSwipedLeft: () => { if (!reader.isZoomed) reader.nextPage(); }, onSwipedRight: () => { if (!reader.isZoomed) reader.prevPage(); }, delta: 50, preventScrollOnSwipe: false });
  const themeClass = reader.theme === "dark" ? "dark" : reader.theme === "light" ? "light" : "warm";
  const download = async () => {
    setDownloading(true);
    try { await downloadMushafPages(getMushafPagesForThumun(reader.thumunId)); toast.success("نُزّلت صفحات هذا الثمن للقراءة دون اتصال"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "تعذر التنزيل"); }
    finally { setDownloading(false); }
  };
  return <AppModal id="mushaf-reader" title={`المصحف — الثمن ${reader.thumunId}`} onClose={reader.closeReader} fullScreen customHeader className={`${themeClass} bg-background text-foreground border-0`}>
    <div className="flex flex-col h-full min-h-0" onKeyDown={(e) => {
      if ((e.target as HTMLElement).closest("input,select,textarea")) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); reader.nextPage(); }
      if (e.key === "ArrowRight") { e.preventDefault(); reader.prevPage(); }
    }}>
      {controls && <header className="shrink-0 border-b border-border bg-card px-3 py-2 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={reader.closeReader} aria-label="إغلاق القارئ" className="shrink-0 min-h-11 px-2"><ArrowRight className="size-4" aria-hidden /> رجوع</Button>
          <h2 className="font-bold text-sm text-center">الثمن {formatNum(reader.thumunId, arabic)}<span className="block text-xs font-normal text-muted-foreground mt-1">الجزء {formatNum(t?.juz ?? 1, arabic)} · الحزب {formatNum(t?.hizb ?? 1, arabic)}</span></h2>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" aria-label="تغيير مظهر المصحف" onClick={() => reader.setTheme(reader.theme === "sepia" ? "dark" : reader.theme === "dark" ? "light" : "sepia")}><Palette className="size-4" aria-hidden /></Button>
            <Button size="icon" variant="ghost" aria-label="الاستماع إلى الثمن المحدد" aria-pressed={reader.showAudio} onClick={reader.toggleAudio}><Headphones className="size-4" aria-hidden /></Button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <button className="text-primary min-h-8 text-right min-w-0 flex-1" aria-expanded={details} onClick={() => setDetails(!details)}>مطلع الثمن وحدوده</button>
          <Button size="icon" variant="ghost" aria-label={reader.isZoomed ? "ملاءمة الصفحة" : "تكبير الصفحة"} onClick={reader.toggleZoom}>{reader.isZoomed ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}</Button>
          <Button size="icon" variant="ghost" aria-label="تنزيل صفحات هذا الثمن" disabled={downloading} onClick={download}><Download className="size-4" aria-hidden /></Button>
        </div>
        {details && <div className="rounded-xl bg-surface p-3 space-y-1 max-h-[25dvh] overflow-y-auto" tabIndex={0}><p className="font-quran text-lg">{getThumunIncipit(reader.thumunId)}</p>{t && <p className="text-xs leading-relaxed">{thumunRangeLabel(t, arabic)}</p>}<p className="text-xs text-muted-foreground">صور مصحف الأثمان (485 صفحة)؛ ترقيم الصور مستقل عن ترقيم مصدر بيانات الحدود.</p></div>}
        {page.sharedThumunIds.length > 1 && <p className="text-xs text-muted-foreground leading-relaxed" data-testid="shared-page-context">صفحة مشتركة للأثمان {page.sharedThumunIds.map((id) => formatNum(id, arabic)).join(" و")}. العنوان والصوت للثمن المحدد {formatNum(reader.thumunId, arabic)}.</p>}
      </header>}
      <div {...swipe} className={`flex-1 min-h-0 relative ${reader.isZoomed ? "overflow-auto" : "overflow-hidden flex items-center justify-center"}`} aria-label={`صفحة المصحف ${reader.currentPage}`}>
        <button className="absolute top-2 left-2 z-10 rounded-full border border-border bg-card/90 text-foreground px-3 min-h-11 text-xs" onClick={() => setControls(!controls)}>{controls ? "إخفاء الأدوات" : "إظهار الأدوات"}</button>
        {failed === reader.currentPage ? <div role="alert" className="p-6 text-center space-y-3"><p>تعذّر تحميل صورة هذه الصفحة.</p><p className="text-sm text-muted-foreground">إن كنت دون اتصال، نزّل الصفحات عند توفر الشبكة. ملاحظاتك ومؤقت الجلسة لم يتغيرا.</p><Button variant="outline" onClick={() => { setFailed(null); setLoaded(null); setRetry((r) => r + 1); }}>إعادة تحميل الصورة</Button></div> : <>
          {/* Images are canonical local assets. No generated text replaces a missing Quran page. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={`${reader.currentPage}:${retry}`} src={`${page.imageUrl}${retry ? `?retry=${retry}` : ""}`} alt={`صورة صفحة ${formatNum(reader.currentPage, arabic)} من مصحف الأثمان`} onLoad={() => setLoaded(reader.currentPage)} onError={() => setFailed(reader.currentPage)}
            className={reader.isZoomed ? "w-full h-auto max-w-4xl mx-auto" : "max-w-full max-h-full object-contain"} style={{ opacity: loaded === reader.currentPage ? 1 : 0, filter: reader.theme === "dark" ? "invert(0.92) hue-rotate(180deg)" : undefined }} />
          {loaded !== reader.currentPage && <p role="status" className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">جارٍ تحميل الصفحة…</p>}
        </>}
      </div>
      {reader.showAudio && controls && <div className="shrink-0 px-3 pt-2 max-h-[32dvh] overflow-y-auto bg-card" tabIndex={0} aria-label="صوت الثمن المحدد"><QuranAudioPlayer mode="thumun" targetId={reader.thumunId} title={`الثمن ${formatNum(reader.thumunId, arabic)}`} compact /></div>}
      {controls && <footer className="shrink-0 bg-card border-t border-border p-2 pb-safe space-y-1">
        <div className="flex items-center justify-between gap-1 max-w-lg mx-auto">
          <Button size="icon" variant="ghost" aria-label="الصفحة السابقة" disabled={reader.currentPage <= 1} onClick={reader.prevPage}><ChevronRight className="size-5" /></Button>
          <span className="text-sm font-bold">صفحة {formatNum(reader.currentPage, arabic)} / {formatNum(TOTAL_MUSHAF_PAGES, arabic)}</span>
          <Button size="icon" variant="ghost" aria-label="الصفحة التالية" disabled={reader.currentPage >= TOTAL_MUSHAF_PAGES} onClick={reader.nextPage}><ChevronLeft className="size-5" /></Button>
        </div>
        <div className="flex justify-between gap-2 max-w-lg mx-auto"><Button variant="outline" className="flex-1 min-h-11 text-sm" disabled={reader.thumunId <= 1} onClick={reader.prevThumun}>ثمن سابق</Button><Button variant="outline" className="flex-1 min-h-11 text-sm" disabled={reader.thumunId >= 480} onClick={reader.nextThumun}>ثمن تالٍ</Button></div>
      </footer>}
    </div>
  </AppModal>;
}
