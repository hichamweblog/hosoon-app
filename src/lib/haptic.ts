export const vibrate = (pattern: number | number[] = 50) => {
  if (typeof window !== "undefined" && "navigator" in window && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

export const vibrateSuccess = () => vibrate([30, 50, 30]);
export const vibrateLight = () => vibrate(20);

let audioCtx: AudioContext | null = null;

export const playDing = () => {
  if (typeof window === "undefined") return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx ?? new Ctx();
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1); // A4

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  } catch {
    // Ignore audio errors
  }
};
