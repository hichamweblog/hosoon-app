import { getMushafPageUrl } from "@/lib/mushaf-mapping";
import { reportDiagnostic } from "@/lib/diagnostics";
export const MUSHAF_CACHE = "hosoon-mushaf-v1";
interface Catalog { edition: string; totalBytes: number; pages: { page: number; bytes: number; sha256: string }[] }
let catalogPromise: Promise<Catalog> | null = null;
export async function mushafCatalog(): Promise<Catalog> {
  if (!catalogPromise) catalogPromise = fetch("/mushaf/catalog.json").then(async (response) => {
    if (!response.ok) throw new Error("تعذر تحميل فهرس التنزيل");
    const value = await response.json() as Catalog;
    if (value.edition !== "warsh-athman-485-v1" || !Array.isArray(value.pages) || value.pages.length !== 485 ||
      value.pages.some((p, i) => p.page !== i + 1 || !Number.isInteger(p.bytes) || p.bytes <= 0 || p.bytes > 1048576 || !/^[a-f0-9]{64}$/.test(p.sha256)) ||
      value.totalBytes !== value.pages.reduce((sum, p) => sum + p.bytes, 0)) throw new Error("فهرس مصحف غير صالح");
    return value;
  }).catch((error) => { catalogPromise = null; throw error; });
  return catalogPromise;
}
export function formatBytes(bytes: number) { return `${(bytes / 1024 / 1024).toFixed(1)} MiB`; }
export async function availableMushafPages(): Promise<Set<number>> {
  if (typeof caches === "undefined") return new Set();
  const cache = await caches.open(MUSHAF_CACHE), requests = await cache.keys();
  return new Set(requests.map((request) => new URL(request.url)).filter((url) => !url.search)
    .map((url) => Number(url.pathname.match(/\/page(\d+)\.jpg$/)?.[1])).filter((page) => page >= 1 && page <= 485));
}
export async function downloadMushafPages(pages: number[], opts: { signal?: AbortSignal; onProgress?: (done: number, total: number) => void } = {}) {
  if (typeof caches === "undefined" || !globalThis.crypto?.subtle) throw new Error("التنزيل دون اتصال يتطلب متصفحًا آمنًا يدعم التخزين");
  const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  if (!registration?.active) throw new Error("العمل دون اتصال لم يجهز بعد. انتظر تهيئة التطبيق وأعد المحاولة؛ التنزيل لا يعمل في نسخة التطوير دون عامل نشط.");
  const ids = [...new Set(pages)].filter((page) => Number.isInteger(page) && page >= 1 && page <= 485);
  if (!ids.length) throw new Error("لا صفحات مختارة");
  const catalog = await mushafCatalog(), available = await availableMushafPages();
  const needed = ids.filter((page) => !available.has(page)), bytes = needed.reduce((sum, page) => sum + catalog.pages[page - 1].bytes, 0);
  const estimate = await navigator.storage?.estimate?.();
  if (estimate?.quota && estimate.usage !== undefined && estimate.quota - estimate.usage < bytes * 1.1) throw new Error("المساحة المتاحة غير كافية. اختر نطاقًا أصغر أو حرّر مساحة.");
  const cache = await caches.open(MUSHAF_CACHE);
  let done = ids.length - needed.length, cursor = 0;
  opts.onProgress?.(done, ids.length);
  const worker = async () => {
    while (cursor < needed.length) {
      if (opts.signal?.aborted) throw new DOMException("Cancelled", "AbortError");
      const page = needed[cursor++], meta = catalog.pages[page - 1], url = getMushafPageUrl(page);
      // Skip the SW's runtime route. Only verified responses enter the explicit download cache.
      const response = await fetch(url, { cache: "no-store", signal: opts.signal });
      if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw new Error(`تعذر تنزيل الصفحة ${page}`);
      const body = await response.clone().arrayBuffer();
      const digest = [...new Uint8Array(await crypto.subtle.digest("SHA-256", body))].map((v) => v.toString(16).padStart(2, "0")).join("");
      if (body.byteLength !== meta.bytes || digest !== meta.sha256) throw new Error(`فشل تحقق صورة الصفحة ${page}؛ لم تُحفظ النسخة المخالفة`);
      if (opts.signal?.aborted) throw new DOMException("Cancelled", "AbortError");
      await cache.put(url, response); done++; opts.onProgress?.(done, ids.length);
    }
  };
  try { await Promise.all([worker(), worker()]); }
  catch (error) { if ((error as Error).name !== "AbortError") reportDiagnostic("mushaf-download-failed"); throw error; }
  return { done, bytes };
}
export async function clearMushafDownloads() { if (typeof caches !== "undefined") await caches.delete(MUSHAF_CACHE); }
