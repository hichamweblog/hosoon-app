export const vibrate = (pattern: number | number[] = 50) => {
  if (typeof window !== "undefined" && "navigator" in window && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

export const vibrateSuccess = () => vibrate([30, 50, 30]);
export const vibrateLight = () => vibrate(20);
