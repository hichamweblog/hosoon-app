/**
 * Quran Audio Service (رواية ورش عن نافع)
 * 
 * أحزاب الختمة (60 حزباً):
 * - محمود خليل الحصري
 * - عبدالباسط عبدالصمد
 * - عبد المجيب بنكيران
 * 
 * أثمان الحفظ (480 ثمناً):
 * - محمد سايد
 * - عبد الحميد حساين
 * - عمر القزابري (مسرع)
 * - محمد سايد (مسرع)
 * - عبد المجيب بنكيران (مسرع)
 */

export interface HizbReciter {
  id: "husary" | "abdulbasit" | "benkiran";
  name: string;
  archiveId: string;
  getUrl: (hizb: number) => string;
}

export interface ThumunReciter {
  id: "sayed" | "hassaine" | "qazabri_fast" | "sayed_fast" | "benkiran_fast";
  name: string;
  speedLabel?: string;
  archiveId: string;
  getUrl: (thumunId: number) => string;
}

/** Reciters for Ahzab (Khatma listening) */
export const HIZB_RECITERS: HizbReciter[] = [
  {
    id: "husary",
    name: "محمود خليل الحصري",
    archiveId: "06_20220525vvv",
    getUrl: (hizb: number) => {
      const hStr = String(Math.max(1, Math.min(60, hizb))).padStart(2, "0");
      return `https://archive.org/download/06_20220525vvv/${hStr}.mp3`;
    },
  },
  {
    id: "abdulbasit",
    name: "عبدالباسط عبدالصمد",
    archiveId: "rabi3246234623632146234623462364",
    getUrl: (hizb: number) => {
      const hStr = String(Math.max(1, Math.min(60, hizb))).padStart(2, "0");
      return `https://archive.org/download/rabi3246234623632146234623462364/${hStr}.mp3`;
    },
  },
  {
    id: "benkiran",
    name: "عبد المجيب بنكيران",
    archiveId: "kirane2013",
    getUrl: (hizb: number) => {
      const hStr = String(Math.max(1, Math.min(60, hizb))).padStart(2, "0");
      return `https://archive.org/download/kirane2013/${hStr}.mp3`;
    },
  },
];

/**
 * Given a global thumun ID (1..480), calculates:
 * - hizb (1..60)
 * - pos (1..8) within that hizb
 */
export function thumunToHizbAndPos(thumunId: number): { hizb: number; pos: number } {
  const safeId = Math.max(1, Math.min(480, thumunId));
  const hizb = Math.floor((safeId - 1) / 8) + 1;
  const pos = ((safeId - 1) % 8) + 1;
  return { hizb, pos };
}

/** Reciters for Athman (Hifz listening) */
export const THUMUN_RECITERS: ThumunReciter[] = [
  {
    id: "sayed",
    name: "محمد سايد",
    archiveId: "hxxxxxxxxxz",
    getUrl: (thumunId: number) => {
      const { hizb, pos } = thumunToHizbAndPos(thumunId);
      const hStr = String(hizb).padStart(2, "0");
      const tStr = String(pos).padStart(2, "0");
      return `https://archive.org/download/hxxxxxxxxxz/H${hStr}-T${tStr}.mp3`;
    },
  },
  {
    id: "hassaine",
    name: "عبد الحميد حساين",
    archiveId: "vh-45-t-0v4v",
    getUrl: (thumunId: number) => {
      const { hizb, pos } = thumunToHizbAndPos(thumunId);
      const hStr = String(hizb).padStart(2, "0");
      const tStr = String(pos).padStart(2, "0");
      return `https://archive.org/download/vh-45-t-0v4v/H${hStr}_T${tStr}.mp3`;
    },
  },
  {
    id: "qazabri_fast",
    name: "عمر القزابري",
    speedLabel: "مسرع",
    archiveId: "nhna-01-t-01nnna",
    getUrl: (thumunId: number) => {
      const { hizb, pos } = thumunToHizbAndPos(thumunId);
      const hStr = String(hizb).padStart(2, "0");
      const tStr = String(pos).padStart(2, "0");
      return `https://archive.org/download/nhna-01-t-01nnna/H${hStr}_T${tStr}.mp3`;
    },
  },
  {
    id: "sayed_fast",
    name: "محمد سايد",
    speedLabel: "مسرع",
    archiveId: "z240405xxxz",
    getUrl: (thumunId: number) => {
      const { hizb, pos } = thumunToHizbAndPos(thumunId);
      const hStr = String(hizb).padStart(2, "0");
      const tStr = String(pos).padStart(2, "0");
      return `https://archive.org/download/z240405xxxz/H${hStr}-T${tStr}.mp3`;
    },
  },
  {
    id: "benkiran_fast",
    name: "عبد المجيب بنكيران",
    speedLabel: "مسرع",
    archiveId: "ssss435-8",
    getUrl: (thumunId: number) => {
      const { hizb, pos } = thumunToHizbAndPos(thumunId);
      if (hizb === 1 && pos === 1) {
        return `https://archive.org/download/ssss435-8/01%201-8.mp3`;
      }
      const hStr = String(hizb).padStart(2, "0");
      return `https://archive.org/download/ssss435-8/${hStr}${pos}-8.mp3`;
    },
  },
];

export function getHizbAudioUrl(reciterId: string, hizb: number): string {
  const reciter = HIZB_RECITERS.find((r) => r.id === reciterId) ?? HIZB_RECITERS[0];
  return reciter.getUrl(hizb);
}

export function getThumunAudioUrl(reciterId: string, thumunId: number): string {
  const reciter = THUMUN_RECITERS.find((r) => r.id === reciterId) ?? THUMUN_RECITERS[0];
  return reciter.getUrl(thumunId);
}

export function getHizbReciter(id: string): HizbReciter {
  return HIZB_RECITERS.find((r) => r.id === id) ?? HIZB_RECITERS[0];
}

export function getThumunReciter(id: string): ThumunReciter {
  return THUMUN_RECITERS.find((r) => r.id === id) ?? THUMUN_RECITERS[0];
}
