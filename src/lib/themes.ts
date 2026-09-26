export interface ThemeOption {
  id: string;
  name: string;
  description: string;
  colors: [string, string, string]; // [background, primary, accent]
  isDark: boolean;
}

export const APP_THEMES: ThemeOption[] = [
  {
    id: "dark",
    name: "الداكن الزمردي",
    description: "أخضر قرآني عميق ومريح للعين",
    colors: ["#0c1512", "#4fa383", "#d4a853"],
    isDark: true,
  },
  {
    id: "ocean",
    name: "المحيطي النقي",
    description: "أمواج المحيط الهادئة برائحة النقاء",
    colors: ["#def3f6", "#0d7ea9", "#1da2d8"],
    isDark: false,
  },
  {
    id: "ocean-dark",
    name: "محيط الليل",
    description: "أعماق البحر ليلاً ببريق سيان حيوي",
    colors: ["#041829", "#1da2d8", "#7fcdff"],
    isDark: true,
  },
  {
    id: "warm",
    name: "الرِّقّ الدافئ",
    description: "أناقة المخطوطات والورق الكلاسيكي",
    colors: ["#f6f1e7", "#8a6426", "#a97c34"],
    isDark: false,
  },
  {
    id: "light",
    name: "الفاتح الكلاسيكي",
    description: "بياض ناصع مع خضرة زاهية",
    colors: ["#faf7f1", "#3c8268", "#b8893c"],
    isDark: false,
  },
];
