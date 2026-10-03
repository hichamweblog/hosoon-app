import { useHifzStore } from "@/store/useHifzStore";
export function effectsAllowed() {
  return !useHifzStore.getState().settings.quietMode &&
    (typeof window === "undefined" || !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}
export async function celebrate() {
  if (!effectsAllowed()) return;
  const { default: confetti } = await import("canvas-confetti");
  if (effectsAllowed()) void confetti({ particleCount: 80, spread: 65, origin: { y: 0.6 }, colors: ["#3C8268", "#B8893C", "#FFFFFF"], disableForReducedMotion: true });
}
