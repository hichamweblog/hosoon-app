// Task metadata & XP economy (single source of truth).

export type TaskType =
  | "khatma_recite"
  | "khatma_listen"
  | "prep_weekly"
  | "new_hifz"
  | "review_near"
  | "review_far"
  | "maintain_recite";

export const XP_TABLE: Record<TaskType | "day_bonus", number> = {
  khatma_recite: 15,
  khatma_listen: 10,
  prep_weekly: 10,
  new_hifz: 50,
  review_near: 20,
  review_far: 20,
  maintain_recite: 15,
  day_bonus: 25,
};

export interface TaskMeta {
  label: string;
  shortLabel: string;
  fortress: string;
  hint: string;
  tone: "khatma" | "prep" | "new" | "near" | "far";
}

export const TASK_META: Record<TaskType, TaskMeta> = {
  khatma_recite: {
    label: "تلاوة الجزء",
    shortLabel: "التلاوة",
    fortress: "الختمة",
    hint: "تلاوة جزء كامل بصوت مرتل",
    tone: "khatma",
  },
  khatma_listen: {
    label: "سماع الحزب",
    shortLabel: "السماع",
    fortress: "الختمة",
    hint: "الإصغاء لحزب كامل يحفظ ما سبق",
    tone: "khatma",
  },
  prep_weekly: {
    label: "التحضير الأسبوعي",
    shortLabel: "التحضير",
    fortress: "التحضير",
    hint: "تلاوة الأثمان الثمانية القادمة تهيئةً",
    tone: "prep",
  },
  new_hifz: {
    label: "الحفظ الجديد",
    shortLabel: "الجديد",
    fortress: "الحفظ الجديد",
    hint: "حفظ ثمن اليوم جديداً",
    tone: "new",
  },
  review_near: {
    label: "مراجعة القريب",
    shortLabel: "القريب",
    fortress: "مراجعة القريب",
    hint: "آخر ثمانية أثمان (حزب واحد)",
    tone: "near",
  },
  review_far: {
    label: "مراجعة البعيد",
    shortLabel: "البعيد",
    fortress: "مراجعة البعيد",
    hint: "المرور الدوري على المتقدم",
    tone: "far",
  },
  maintain_recite: {
    label: "الورد التثبيتي",
    shortLabel: "التثبيت",
    fortress: "التثبيت",
    hint: "تلاوة جزء من ختمة المراجعة",
    tone: "khatma",
  },
};

// Fortress daily pacing (method of the Five Fortresses)
export const RECITATION_JUZS_PER_DAY = 1;
export const LISTENING_HIZBS_PER_DAY = 1;
export const PREP_WEEKLY_THUMUNS = 8;
export const REVIEW_NEAR_THUMUNS = 8; // 1 hizb

// Milestones (journey progress in أثمان)
export interface Milestone {
  id: string;
  label: string;
  icon: "sprout" | "shield" | "medal" | "award" | "gem" | "crown" | "mountain" | "book";
  threshold: number;
}

export const MILESTONES: Milestone[] = [
  { id: "juz_1", label: "بداية الغيث (جزء 1)", icon: "sprout", threshold: 16 },
  { id: "juz_3", label: "همة المستمر (3 أجزاء)", icon: "mountain", threshold: 48 },
  { id: "juz_5", label: "تأسيس الحصن (5 أجزاء)", icon: "shield", threshold: 80 },
  { id: "juz_10", label: "الثلث الأول (10 أجزاء)", icon: "medal", threshold: 160 },
  { id: "juz_15", label: "منتصف الدرب (15 جزءاً)", icon: "award", threshold: 240 },
  { id: "juz_20", label: "الثلثان (20 جزءاً)", icon: "gem", threshold: 320 },
  { id: "juz_25", label: "قاب قوسين (25 جزءاً)", icon: "book", threshold: 400 },
  { id: "complete", label: "تاج الوقار (ختم القرآن)", icon: "crown", threshold: 480 },
];

export interface Achievement {
  id: string;
  label: string;
  description: string;
  icon: "flame" | "shield" | "castle" | "hammer" | "coins" | "sparkles" | "flower" | "clock";
  check: (s: {
    bestStreak: number;
    perfectDays: number;
    totalXp: number;
    highestDay: number;
    sessionMinutes: number;
  }) => boolean;
}

export const SPECIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: "streak_7",
    label: "شعلة لا تنطفئ",
    description: "الاستمرار 7 أيام متتالية",
    icon: "flame",
    check: (s) => s.bestStreak >= 7,
  },
  {
    id: "streak_30",
    label: "أسد الحصون",
    description: "الاستمرار 30 يوماً بلا انقطاع",
    icon: "shield",
    check: (s) => s.bestStreak >= 30,
  },
  {
    id: "streak_100",
    label: "المعسكر المغلق",
    description: "الاستمرار 100 يوم متتالية",
    icon: "castle",
    check: (s) => s.bestStreak >= 100,
  },
  {
    id: "perfect_10",
    label: "درع الالتزام",
    description: "إتمام 10 أيام مثالية",
    icon: "hammer",
    check: (s) => s.perfectDays >= 10,
  },
  {
    id: "perfect_50",
    label: "حصن متين",
    description: "إتمام 50 يوماً مثالياً",
    icon: "castle",
    check: (s) => s.perfectDays >= 50,
  },
  {
    id: "xp_1000",
    label: "جامع الغنائم",
    description: "جمع 1,000 نقطة خبرة",
    icon: "coins",
    check: (s) => s.totalXp >= 1000,
  },
  {
    id: "xp_10000",
    label: "صاحب الألفيات",
    description: "جمع 10,000 نقطة خبرة",
    icon: "sparkles",
    check: (s) => s.totalXp >= 10000,
  },
  {
    id: "baqarah_imran",
    label: "حارس الزهراوين",
    description: "إتمام سورتي البقرة وآل عمران",
    icon: "flower",
    check: (s) => s.highestDay >= 105,
  },
  {
    id: "time_10h",
    label: "سبيل المداومة",
    description: "10 ساعات من الجلسات الموقوتة",
    icon: "clock",
    check: (s) => s.sessionMinutes >= 600,
  },
];

// Motivational quotes (authentic hadiths and verses)
export const MOTIVATIONAL_QUOTES = [
  { text: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ", source: "صحيح البخاري" },
  { text: "اقْرَؤُوا الْقُرْآنَ فَإِنَّهُ يَأْتِي يَوْمَ الْقِيَامَةِ شَفِيعًا لِأَصْحَابِهِ", source: "صحيح مسلم" },
  { text: "الَّذِي يَقْرَأُ الْقُرْآنَ وَهُوَ مَاهِرٌ بِهِ مَعَ السَّفَرَةِ الْكِرَامِ الْبَرَرَةِ", source: "متفق عليه" },
  { text: "إِنَّ اللَّهَ يَرْفَعُ بِهَذَا الْكِتَابِ أَقْوَامًا وَيَضَعُ بِهِ آخَرِينَ", source: "صحيح مسلم" },
  { text: "يُقَالُ لِصَاحِبِ الْقُرْآنِ اقْرَأْ وَارْتَقِ وَرَتِّلْ كَمَا كُنْتَ تُرَتِّلُ فِي الدُّنْيَا", source: "سنن الترمذي" },
  { text: "مَثَلُ الْمُؤْمِنِ الَّذِي يَقْرَأُ الْقُرْآنَ مَثَلُ الْأُتْرُجَّةِ رِيحُهَا طَيِّبٌ وَطَعْمُهَا طَيِّبٌ", source: "متفق عليه" },
  { text: "تَعَاهَدُوا هَذَا الْقُرْآنَ فَوَالَّذِي نَفْسُ مُحَمَّدٍ بِيَدِهِ لَهُوَ أَشَدُّ تَفَلُّتًا مِنَ الْإِبِلِ فِي عُقُلِهَا", source: "متفق عليه" },
  { text: "مَنْ قَرَأَ حَرْفًا مِنْ كِتَابِ اللَّهِ فَلَهُ بِهِ حَسَنَةٌ وَالْحَسَنَةُ بِعَشْرِ أَمْثَالِهَا", source: "سنن الترمذي" },
] as const;
