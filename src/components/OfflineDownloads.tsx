"use client";
import { useEffect, useRef, useState } from "react";
import { availableMushafPages, clearMushafDownloads, downloadMushafPages, formatBytes, mushafCatalog } from "@/lib/offline/mushaf";
import { getMushafPagesForThumun } from "@/lib/mushaf-mapping";
import { useHifzStore } from "@/store/useHifzStore";
import { Button } from "./ui/button";
import { ConfirmModal } from "./ui/app-modal";
import { toast } from "sonner";
export default function OfflineDownloads() {
  const current = useHifzStore((s) => s.currentDay);
  const [scope, setScope] = useState("near"), [saved, setSaved] = useState(0), [size, setSize] = useState("—"), [busy, setBusy] = useState(false), [progress, setProgress] = useState({ done: 0, total: 0 }), [clear, setClear] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const pages = scope === "all" ? Array.from({ length: 485 }, (_, i) => i + 1) : [...new Set(Array.from({ length: Math.min(8, 481 - current) }, (_, i) => current + i).flatMap(getMushafPagesForThumun))];
  const pageKey = pages.join(",");
  useEffect(() => {
    let live = true;
    void availableMushafPages().then((p) => { if (live) setSaved(p.size); }).catch(() => {});
    void mushafCatalog().then((c) => { if (live) setSize(formatBytes(pageKey.split(",").reduce((n, p) => n + c.pages[Number(p) - 1].bytes, 0))); }).catch(() => { if (live) setSize("غير متاح دون اتصال"); });
    return () => { live = false; };
  }, [pageKey]);
  useEffect(() => () => abort.current?.abort(), []);
  const start = async () => {
    const controller = new AbortController(); abort.current = controller; setBusy(true);
    try { await downloadMushafPages(pages, { signal: controller.signal, onProgress: (done, total) => setProgress({ done, total }) }); toast.success("نُزّلت الصفحات وتُحقق من سلامتها"); }
    catch (error) { toast.error((error as Error).name === "AbortError" ? "أُلغي التنزيل؛ الصفحات المكتملة بقيت محفوظة" : error instanceof Error ? error.message : "تعذر التنزيل"); }
    finally { setBusy(false); setSaved((await availableMushafPages()).size); abort.current = null; }
  };
  return <section className="rounded-2xl border border-border p-4 space-y-3"><h3 className="font-bold text-base">المصحف دون اتصال</h3><p className="text-sm text-muted-foreground">متاح محليًا: {saved} / 485 صفحة. حفظ التقدم لا يحتاج الصور؛ الصوت الخارجي غير منزّل في هذه النسخة.</p>
    <label className="text-sm flex flex-wrap gap-2 items-center">نطاق التنزيل<select value={scope} disabled={busy} aria-label="نطاق تنزيل المصحف" className="p-2 bg-background rounded-xl border border-border flex-1" onChange={(e) => setScope(e.target.value)}><option value="near">الثمن الحالي وما يليه (حتى 8)</option><option value="all">كل المصحف</option></select></label>
    <p className="text-xs text-muted-foreground">حجم النطاق: {size}. قد يزيل المتصفح الملفات عند نقص المساحة؛ أعد فحص توفرها.</p>
    {busy && <p role="status" className="text-sm">التنزيل: {progress.done} / {progress.total} صفحة</p>}
    <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={start} disabled={busy}>تنزيل الصفحات</Button>{busy && <Button variant="outline" onClick={() => abort.current?.abort()}>إلغاء التنزيل</Button>}<Button variant="ghost" disabled={busy || !saved} onClick={() => setClear(true)}>حذف الصور المنزّلة</Button></div>
    {clear && <ConfirmModal title="حذف الصور فقط؟" message="سيُزال مخزون صور المصحف، لا التقدم أو الملاحظات أو النسخ الاحتياطية." onClose={() => setClear(false)} onConfirm={() => { void clearMushafDownloads().then(() => { setSaved(0); setClear(false); }); }} />}
  </section>;
}
