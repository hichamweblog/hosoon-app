// Quran structure constants
export const TOTAL_THUMUNS = 480;
export const THUMUNS_PER_HIZB = 8;
export const THUMUNS_PER_JUZ = 16;
export const TOTAL_HIZBS = 60;
export const TOTAL_JUZS = 30;
export const TOTAL_SURAHS = 114;

// Fortress daily assignments
export const RECITATION_JUZS_PER_DAY = 1;
export const LISTENING_HIZBS_PER_DAY = 1;
export const PREP_WEEKLY_THUMUNS = 8;
export const REVIEW_NEAR_THUMUNS = 8; // 1 hizb

// Milestones
export const MILESTONES = [
  { id: 'first_thumun', label: 'أول ثمن', icon: '🌱', threshold: 1 },
  { id: 'first_hizb', label: 'أول حزب', icon: '📖', threshold: 8 },
  { id: 'first_juz', label: 'أول جزء', icon: '⭐', threshold: 16 },
  { id: 'five_juz', label: '5 أجزاء', icon: '🏅', threshold: 80 },
  { id: 'ten_juz', label: '10 أجزاء', icon: '🎖️', threshold: 160 },
  { id: 'quarter', label: 'ربع القرآن', icon: '🌙', threshold: 120 },
  { id: 'half', label: 'نصف القرآن', icon: '🌟', threshold: 240 },
  { id: 'three_quarter', label: 'ثلاثة أرباع القرآن', icon: '💎', threshold: 360 },
  { id: 'complete', label: 'ختم القرآن كاملاً', icon: '👑', threshold: 480 },
] as const;

// Motivational quotes (authentic hadiths and verses)
export const MOTIVATIONAL_QUOTES = [
  { text: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ', source: 'صحيح البخاري' },
  { text: 'اقْرَؤُوا الْقُرْآنَ فَإِنَّهُ يَأْتِي يَوْمَ الْقِيَامَةِ شَفِيعًا لِأَصْحَابِهِ', source: 'صحيح مسلم' },
  { text: 'الَّذِي يَقْرَأُ الْقُرْآنَ وَهُوَ مَاهِرٌ بِهِ مَعَ السَّفَرَةِ الْكِرَامِ الْبَرَرَةِ', source: 'متفق عليه' },
  { text: 'إِنَّ اللَّهَ يَرْفَعُ بِهَذَا الْكِتَابِ أَقْوَامًا وَيَضَعُ بِهِ آخَرِينَ', source: 'صحيح مسلم' },
  { text: 'يُقَالُ لِصَاحِبِ الْقُرْآنِ اقْرَأْ وَارْتَقِ وَرَتِّلْ كَمَا كُنْتَ تُرَتِّلُ فِي الدُّنْيَا', source: 'سنن الترمذي' },
  { text: 'مَثَلُ الْمُؤْمِنِ الَّذِي يَقْرَأُ الْقُرْآنَ مَثَلُ الْأُتْرُجَّةِ رِيحُهَا طَيِّبٌ وَطَعْمُهَا طَيِّبٌ', source: 'متفق عليه' },
  { text: 'تَعَاهَدُوا هَذَا الْقُرْآنَ فَوَالَّذِي نَفْسُ مُحَمَّدٍ بِيَدِهِ لَهُوَ أَشَدُّ تَفَلُّتًا مِنَ الْإِبِلِ فِي عُقُلِهَا', source: 'متفق عليه' },
  { text: 'مَنْ قَرَأَ حَرْفًا مِنْ كِتَابِ اللَّهِ فَلَهُ بِهِ حَسَنَةٌ وَالْحَسَنَةُ بِعَشْرِ أَمْثَالِهَا', source: 'سنن الترمذي' },
] as const;

// Fortress colors for theming
export const FORTRESS_COLORS = {
  khatma: { accent: 'sky', hex: '#38BDF8', label: 'الختمة' },
  prep: { accent: 'violet', hex: '#A78BFA', label: 'التحضير' },
  newHifz: { accent: 'amber', hex: '#FBBF24', label: 'الجديد' },
  reviewNear: { accent: 'emerald', hex: '#34D399', label: 'مراجعة القريب' },
  reviewFar: { accent: 'indigo', hex: '#818CF8', label: 'مراجعة البعيد' },
} as const;
