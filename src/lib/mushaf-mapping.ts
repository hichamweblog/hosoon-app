import { getThumun, type Thumun } from "./quran-data";
import mushafTitlesJson from "./mushaf-titles.json";

export const TOTAL_MUSHAF_PAGES = 485;
export const TOTAL_ATHMAN = 480;

const titles: Record<number, string> = mushafTitlesJson as Record<number, string>;

export interface MushafPageInfo {
  pageNumber: number;
  imageUrl: string;
  thumunId: number;
  hizb: number;
  juz: number;
  title: string;
  thumun?: Thumun | null;
  sharedThumunIds: number[];
}

/**
 * Returns the exact list of Mushaf page numbers corresponding to a Thumun (1..480).
 * In this Moroccan Warsh Tajweed Athman Mushaf (485 pages):
 * - Thumun 1 spans 3 pages [1, 2, 3] (Al-Fatihah + start of Al-Baqarah).
 * - Thumuns 2..472 map 1-to-1 to page (thumunId + 2).
 * - Thumuns 473..476 map 1-to-1 to pages 475..478.
 * - Thumun 477 spans pages [479, 480] (Ash-Sharh to Al-Qadr).
 * - Thumun 478 spans pages [480, 481] (Al-Bayyinah to Al-Adiyat 8).
 * - Thumun 479 spans pages [481, 482, 483] (Al-Adiyat 9 to Al-Feel).
 * - Thumun 480 spans pages [483, 484, 485] (Quraysh to An-Nas).
 */
export function getMushafPagesForThumun(thumunId: number): number[] {
  if (thumunId < 1 || thumunId > TOTAL_ATHMAN) return [];
  if (thumunId === 1) return [1, 2, 3];
  if (thumunId >= 2 && thumunId <= 472) return [thumunId + 2];
  if (thumunId === 473) return [475];
  if (thumunId === 474) return [476];
  if (thumunId === 475) return [477];
  if (thumunId === 476) return [478];
  if (thumunId === 477) return [479, 480];
  if (thumunId === 478) return [480, 481];
  if (thumunId === 479) return [481, 482, 483];
  if (thumunId === 480) return [483, 484, 485];
  return [];
}

/**
 * Returns the primary Thumun ID associated with a given Mushaf page (1..485).
 */
export function getThumunFromMushafPage(pageNumber: number): number {
  if (pageNumber <= 0 || pageNumber > TOTAL_MUSHAF_PAGES) return 1;
  if (pageNumber <= 3) return 1;
  if (pageNumber <= 474) return pageNumber - 2;
  if (pageNumber === 475) return 473;
  if (pageNumber === 476) return 474;
  if (pageNumber === 477) return 475;
  if (pageNumber === 478) return 476;
  if (pageNumber === 479) return 477;
  if (pageNumber === 480) return 478; // bridge page between 477 & 478
  if (pageNumber === 481) return 478; // bridge page between 478 & 479
  if (pageNumber === 482) return 479;
  if (pageNumber === 483) return 479; // bridge page between 479 & 480
  if (pageNumber === 484 || pageNumber === 485) return 480;
  return 1;
}

/**
 * Returns static asset URL for the given page image.
 */
export function getMushafPageUrl(pageNumber: number): string {
  if (pageNumber < 0 || pageNumber > TOTAL_MUSHAF_PAGES) {
    return `/mushaf/pages/page0.jpg`;
  }
  return `/mushaf/pages/page${pageNumber}.jpg`;
}

/**
 * Returns the verified, clean title description for a given page.
 */
export function getMushafPageTitle(pageNumber: number): string {
  return titles[pageNumber] || `صفحة ${pageNumber}`;
}

/**
 * Returns complete metadata for a given page.
 */
export function getThumunsOnMushafPage(pageNumber: number): number[] {
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > TOTAL_MUSHAF_PAGES) return [];
  if (pageNumber === 480) return [477, 478];
  if (pageNumber === 481) return [478, 479];
  if (pageNumber === 483) return [479, 480];
  return [getThumunFromMushafPage(pageNumber)];
}

export function getMushafPageInfo(pageNumber: number, selectedThumun?: number): MushafPageInfo {
  const sharedThumunIds = getThumunsOnMushafPage(pageNumber);
  const thumunId = selectedThumun && sharedThumunIds.includes(selectedThumun) ? selectedThumun : getThumunFromMushafPage(pageNumber);
  const thumun = getThumun(thumunId);
  return {
    pageNumber,
    imageUrl: getMushafPageUrl(pageNumber),
    thumunId,
    hizb: thumun?.hizb ?? Math.ceil(thumunId / 8),
    juz: thumun?.juz ?? Math.ceil(thumunId / 16),
    title: getMushafPageTitle(pageNumber),
    thumun,
    sharedThumunIds,
  };
}
