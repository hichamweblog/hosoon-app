/**
 * Quran Audio Service (رواية ورش عن نافع)
 * 
 * أحزاب الختمة (60 حزباً):
 * - محمود خليل الحصري
 * - عبدالباسط عبدالصمد
 * - عبد المجيب بنكيران
 * - محمد مقاتلي الإبراهيمي
 * - محمد الكنتاوي
 * - رشيد بلعشيه
 * - العيون الكوشي
 * - حسن محمد صالح
 * - معاذ الخلطي
 * - عبد العلي أعنون
 * - محمد الإيراوي
 * - مصطفى غربي
 * - ياسين الجزائري
 * - مصطفى بن مالك
 * - إبراهيم الدوسري
 * 
 * أثمان الحفظ (480 ثمناً):
 * - تلاوة معتادة / تعليمية (للتحضير والحفظ):
 *   - محمد سايد
 *   - عبد الحميد حساين
 *   - محمود خليل الحصري
 *   - عبدالباسط عبدالصمد
 *   - محمد إيراوي
 *   - محمد الطيب حمدان
 *   - عبد الرحيم النبولسي
 *   - عمر القزابري
 *   - ياسين الجزائري
 *   - العيون الكوشي
 */

export interface HizbReciter {
  id: string;
  name: string;
  archiveId: string;
  getUrl: (hizb: number) => string;
}

export type ReciterPace = "normal" | "fast";

export interface ThumunReciter {
  id: string;
  name: string;
  pace: ReciterPace;
  paceLabel: string;
  badgeLabel: string;
  description: string;
  speedLabel?: string;
  archiveId: string;
  getUrl: (thumunId: number) => string;
}

/** Reciters for Ahzab (Khatma listening - 60 Hizbs) */
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
  {
    id: "moukatili",
    name: "محمد مقاتلي الإبراهيمي",
    archiveId: "alfirdwsiy1433_gmail_5777777777777777779997",
    getUrl: (hizb: number) => {
      const hStr = String(Math.max(1, Math.min(60, hizb))).padStart(2, "0");
      return `https://archive.org/download/alfirdwsiy1433_gmail_5777777777777777779997/${hStr}.mp3`;
    },
  },
  {
    id: "kentaoui",
    name: "محمد الكنتاوي",
    archiveId: "alfirdwsiy1433_g469667976946974696494699il_02",
    getUrl: (hizb: number) => {
      const hStr = String(Math.max(1, Math.min(60, hizb))).padStart(2, "0");
      return `https://archive.org/download/alfirdwsiy1433_g469667976946974696494699il_02/${hStr}.mp3`;
    },
  },
  {
    id: "belaachia",
    name: "رشيد بلعشيه",
    archiveId: "full_____--------quran_____--60-part--hezb-full-ahzab--by-rasheed-bel3asheyyah",
    getUrl: (hizb: number) => {
      const hStr = String(Math.max(1, Math.min(60, hizb))).padStart(2, "0");
      return `https://archive.org/download/full_____--------quran_____--60-part--hezb-full-ahzab--by-rasheed-bel3asheyyah/H${hStr}.mp3`;
    },
  },
  {
    id: "kouchi_hizb",
    name: "العيون الكوشي",
    archiveId: "alfirdwsiy4696666666666666666467967gmail_60",
    getUrl: (hizb: number) => {
      const hStr = String(Math.max(1, Math.min(60, hizb))).padStart(2, "0");
      return `https://archive.org/download/alfirdwsiy4696666666666666666467967gmail_60/${hStr}.mp3`;
    },
  },
  {
    id: "hassan_saleh",
    name: "حسن محمد صالح",
    archiveId: "alfirdwsiy146777777777777777777777774467964679_gmail_16",
    getUrl: (hizb: number) => {
      const hStr = String(Math.max(1, Math.min(60, hizb))).padStart(2, "0");
      return `https://archive.org/download/alfirdwsiy146777777777777777777777774467964679_gmail_16/${hStr}.mp3`;
    },
  },
  {
    id: "kholti",
    name: "معاذ الخلطي",
    archiveId: "alfirdwsiy1433_g66676777777777777777777777779679946mail_06",
    getUrl: (hizb: number) => {
      const hStr = String(Math.max(1, Math.min(60, hizb))).padStart(2, "0");
      return `https://archive.org/download/alfirdwsiy1433_g66676777777777777777777777779679946mail_06/${hStr}.mp3`;
    },
  },
  {
    id: "aanoun",
    name: "عبد العلي أعنون",
    archiveId: "alfirdwsiy1433_gmail_466666666666666666666666666666694679",
    getUrl: (hizb: number) => {
      const hStr = String(Math.max(1, Math.min(60, hizb))).padStart(2, "0");
      return `https://archive.org/download/alfirdwsiy1433_gmail_466666666666666666666666666666694679/${hStr}.mp3`;
    },
  },
  {
    id: "irawi_hizb",
    name: "محمد الإيراوي",
    archiveId: "alfirdwsiy4669649679469469696494679gmail_54",
    getUrl: (hizb: number) => {
      const hStr = String(Math.max(1, Math.min(60, hizb))).padStart(2, "0");
      return `https://archive.org/download/alfirdwsiy4669649679469469696494679gmail_54/${hStr}.mp3`;
    },
  },
  {
    id: "gharbi",
    name: "مصطفى غربي",
    archiveId: "alfirdwsiy1433469777976796464967674679ail_55",
    getUrl: (hizb: number) => {
      const hStr = String(Math.max(1, Math.min(60, hizb))).padStart(2, "0");
      return `https://archive.org/download/alfirdwsiy1433469777976796464967674679ail_55/${hStr}.mp3`;
    },
  },
  {
    id: "yassine_hizb",
    name: "ياسين الجزائري",
    archiveId: "alfirdwsiy14335686565856356565685368565_60",
    getUrl: (hizb: number) => {
      const hStr = String(Math.max(1, Math.min(60, hizb))).padStart(2, "0");
      return `https://archive.org/download/alfirdwsiy14335686565856356565685368565_60/${hStr}.mp3`;
    },
  },
  {
    id: "benmalek",
    name: "مصطفى بن مالك",
    archiveId: "alfirdwsiy1433565866556568536358536536563563568568gmail_60",
    getUrl: (hizb: number) => {
      const hStr = String(Math.max(1, Math.min(60, hizb))).padStart(2, "0");
      return `https://archive.org/download/alfirdwsiy1433565866556568536358536536563563568568gmail_60/${hStr}.mp3`;
    },
  },
  {
    id: "dossari",
    name: "إبراهيم الدوسري",
    archiveId: "alfirdwsiy1433_gmail_35685668565653565363535356568563860",
    getUrl: (hizb: number) => {
      const hStr = String(Math.max(1, Math.min(60, hizb))).padStart(2, "0");
      return `https://archive.org/download/alfirdwsiy1433_gmail_35685668565653565363535356568563860/${hStr}.mp3`;
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

/** Reciters for Athman (Hifz listening - 480 Athman) */
export const THUMUN_RECITERS: ThumunReciter[] = [
  // ─── تلاوة معتادة / تعليمية ───
  {
    id: "sayed",
    name: "محمد سايد",
    pace: "normal",
    paceLabel: "تلاوة",
    badgeLabel: "🌿 تلاوة",
    description: "تلاوة تعليمية معتادة هادئة ومتقنة مناسبة للتحضير والحفظ الجديد",
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
    pace: "normal",
    paceLabel: "تلاوة",
    badgeLabel: "🌿 تلاوة",
    description: "تلاوة مغربية معتادة للضبط والإتقان",
    archiveId: "vh-45-t-0v4v",
    getUrl: (thumunId: number) => {
      const { hizb, pos } = thumunToHizbAndPos(thumunId);
      const hStr = String(hizb).padStart(2, "0");
      const tStr = String(pos).padStart(2, "0");
      return `https://archive.org/download/vh-45-t-0v4v/H${hStr}_T${tStr}.mp3`;
    },
  },
  {
    id: "husary_thumun",
    name: "محمود خليل الحصري",
    pace: "normal",
    paceLabel: "تلاوة",
    badgeLabel: "🌿 تلاوة",
    description: "المصحف المعلم المرتل للشيخ الحصري مقسم أثماناً للضبط والإتقان",
    archiveId: "426-t-02-h-54_zzzz",
    getUrl: (thumunId: number) => {
      const { hizb, pos } = thumunToHizbAndPos(thumunId);
      const idStr = String(Math.max(1, Math.min(480, thumunId))).padStart(3, "0");
      const hStr = String(hizb).padStart(2, "0");
      const tStr = String(pos).padStart(2, "0");
      return `https://archive.org/download/426-t-02-h-54_zzzz/${idStr}_t${tStr}_h${hStr}.mp3`;
    },
  },
  {
    id: "abdulbasit_thumun",
    name: "عبدالباسط عبدالصمد",
    pace: "normal",
    paceLabel: "تلاوة",
    badgeLabel: "🌿 تلاوة",
    description: "تلاوة مرتلة برواية ورش للشيخ عبدالباسط عبدالصمد مقسمة أثماناً",
    archiveId: "zzzzzzzzzzzzzzz28-1-8z",
    getUrl: (thumunId: number) => {
      const { hizb, pos } = thumunToHizbAndPos(thumunId);
      const hStr = String(hizb).padStart(2, "0");
      return `https://archive.org/download/zzzzzzzzzzzzzzz28-1-8z/${hStr}%20${pos}-8.mp3`;
    },
  },
  {
    id: "irawi_normal",
    name: "محمد إيراوي",
    pace: "normal",
    paceLabel: "تلاوة",
    badgeLabel: "🌿 تلاوة",
    description: "تلاوة مغربية متأنية للشيخ محمد إيراوي مناسبة للحفظ والتحضير",
    archiveId: "h-137nnnnnnn",
    getUrl: (thumunId: number) => {
      const { hizb, pos } = thumunToHizbAndPos(thumunId);
      const hStr = String(hizb).padStart(2, "0");
      return `https://archive.org/download/h-137nnnnnnn/H_${hStr}${pos}.mp3`;
    },
  },
  {
    id: "hamdan_thumun",
    name: "محمد الطيب حمدان",
    pace: "normal",
    paceLabel: "تلاوة",
    badgeLabel: "🌿 تلاوة",
    description: "تلاوة متقنة برواية ورش للشيخ محمد الطيب حمدان",
    archiveId: "x0220516xxxxxxxxxxxxx",
    getUrl: (thumunId: number) => {
      const idStr = String(Math.max(1, Math.min(480, thumunId))).padStart(3, "0");
      return `https://archive.org/download/x0220516xxxxxxxxxxxxx/${idStr}.mp3`;
    },
  },
  {
    id: "naboulsi_normal",
    name: "عبد الرحيم النبولسي",
    pace: "normal",
    paceLabel: "تلاوة",
    badgeLabel: "🌿 تلاوة",
    description: "تلاوة رواية ورش للشيخ عبد الرحيم النبولسي مقسمة أثماناً",
    archiveId: "z426-542z",
    getUrl: (thumunId: number) => {
      const { hizb, pos } = thumunToHizbAndPos(thumunId);
      const idStr = String(Math.max(1, Math.min(480, thumunId))).padStart(3, "0");
      const hStr = String(hizb).padStart(2, "0");
      const filename = `${idStr} ---مصحف عبد الرحيم نبولسي رواية  ورش   مقسم أثمان ثمن رقم  ${hStr}${pos}.mp3`;
      return `https://archive.org/download/z426-542z/${encodeURIComponent(filename)}`;
    },
  },
  {
    id: "qazabri_normal",
    name: "عمر القزابري",
    pace: "normal",
    paceLabel: "تلاوة",
    badgeLabel: "🌿 تلاوة",
    description: "تلاوة رواية ورش للشيخ عمر القزابري بسرعة معتادة",
    archiveId: "omar-alqazabri-480--thomn-part-athmaan--quran-warsh-128kb",
    getUrl: (thumunId: number) => {
      const { hizb, pos } = thumunToHizbAndPos(thumunId);
      const hStr = String(hizb).padStart(2, "0");
      const tStr = String(pos).padStart(2, "0");
      return `https://archive.org/download/omar-alqazabri-480--thomn-part-athmaan--quran-warsh-128kb/H${hStr}_T${tStr}.mp3`;
    },
  },
  {
    id: "yassine_normal",
    name: "ياسين الجزائري",
    pace: "normal",
    paceLabel: "تلاوة",
    badgeLabel: "🌿 تلاوة",
    description: "تلاوة رواية ورش للشيخ ياسين الجزائري بسرعة معتادة",
    archiveId: "way2sona_20160210_1428",
    getUrl: (thumunId: number) => {
      const { hizb, pos } = thumunToHizbAndPos(thumunId);
      const hStr = String(hizb).padStart(2, "0");
      const tStr = String(pos).padStart(2, "0");
      return `https://archive.org/download/way2sona_20160210_1428/H${hStr}-T${tStr}.mp3`;
    },
  },
  {
    id: "kouchi_thumun",
    name: "العيون الكوشي",
    pace: "normal",
    paceLabel: "تلاوة",
    badgeLabel: "🌿 تلاوة",
    description: "تلاوة مغربية خاشعة برواية ورش للشيخ العيون الكوشي",
    archiveId: "way2sona_20160210_1431",
    getUrl: (thumunId: number) => {
      const { hizb, pos } = thumunToHizbAndPos(thumunId);
      const idStr = String(Math.max(1, Math.min(480, thumunId))).padStart(3, "0");
      const hStr = String(hizb).padStart(2, "0");
      const tStr = String(pos).padStart(2, "0");
      return `https://archive.org/download/way2sona_20160210_1431/${idStr}_t${tStr}_h${hStr}.mp3`;
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

export const NORMAL_THUMUN_RECITERS = THUMUN_RECITERS.filter((r) => r.pace === "normal");
