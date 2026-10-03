"use client";
import { create } from "zustand";
import { HIZB_RECITERS, THUMUN_RECITERS, getHizbAudioUrl, getThumunAudioUrl } from "./quran-audio";

export interface AudioTrack { key: string; mode: "hizb" | "thumun"; targetId: number; reciterId: string; title: string; url: string }
interface AudioState {
  track: AudioTrack | null; playing: boolean; loading: boolean; time: number; duration: number;
  error: string | null; loop: boolean; loopStart: number | null; loopEnd: number | null; speed: number; muted: boolean;
}
const initial: AudioState = { track: null, playing: false, loading: false, time: 0, duration: 0, error: null, loop: false, loopStart: null, loopEnd: null, speed: 1, muted: false };
export const useAudioStore = create<AudioState>(() => initial);
let audio: HTMLAudioElement | null = null;
let generation = 0;
const set = (patch: Partial<AudioState>) => useAudioStore.setState(patch);
const finite = (value: number) => Number.isFinite(value) ? value : 0;
export function audioTrackKey(mode: "hizb" | "thumun", targetId: number, reciterId: string) { return `${mode}:${targetId}:${reciterId}`; }

function mediaSession() {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  const track = useAudioStore.getState().track;
  if (!track) return;
  try {
    if (typeof MediaMetadata !== "undefined") navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title, artist: [...HIZB_RECITERS, ...THUMUN_RECITERS].find((r) => r.id === track.reciterId)?.name ?? "القارئ",
      album: "حصون — رواية ورش",
    });
    navigator.mediaSession.setActionHandler("play", () => { void playAudio(); });
    navigator.mediaSession.setActionHandler("pause", () => pauseAudio());
    navigator.mediaSession.setActionHandler("seekbackward", (details) => seekAudio((audio?.currentTime ?? 0) - (details.seekOffset ?? 5)));
    navigator.mediaSession.setActionHandler("seekforward", (details) => seekAudio((audio?.currentTime ?? 0) + (details.seekOffset ?? 5)));
    navigator.mediaSession.setActionHandler("seekto", (details) => seekAudio(details.seekTime ?? 0));
    navigator.mediaSession.playbackState = audio?.paused ? "paused" : "playing";
  } catch { /* Some mobile engines only support a subset of action handlers. */ }
}
function element(): HTMLAudioElement {
  if (audio) return audio;
  const el = document.createElement("audio");
  el.id = "hosoon-shared-audio"; el.preload = "none"; el.hidden = true;
  document.body.appendChild(el); audio = el;
  el.addEventListener("timeupdate", () => {
    const { loopStart, loopEnd } = useAudioStore.getState();
    if (loopStart !== null && loopEnd !== null && el.currentTime >= loopEnd) el.currentTime = loopStart;
    set({ time: finite(el.currentTime) });
    try {
      if ("mediaSession" in navigator && finite(el.duration) > 0) navigator.mediaSession.setPositionState({ duration: el.duration, playbackRate: el.playbackRate, position: Math.min(el.duration, el.currentTime) });
    } catch { /* Unsupported position-state API. */ }
  });
  el.addEventListener("loadedmetadata", () => set({ duration: finite(el.duration), loading: false }));
  el.addEventListener("play", () => { set({ playing: true, error: null }); mediaSession(); });
  el.addEventListener("playing", () => set({ playing: true, loading: false }));
  el.addEventListener("pause", () => { set({ playing: false, loading: false }); if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused"; });
  el.addEventListener("waiting", () => set({ loading: true }));
  el.addEventListener("ended", () => set({ playing: false, loading: false }));
  el.addEventListener("error", () => set({ playing: false, loading: false, error: navigator.onLine ? "تعذّر تحميل الصوت. تحقق من الاتصال أو جرّب قارئًا آخر." : "الصوت غير منزّل ولا يتاح دون اتصال. تقدم الجلسة محفوظ محليًا." }));
  return el;
}
export function selectAudio(mode: "hizb" | "thumun", targetId: number, reciterId: string, title: string) {
  if (!Number.isInteger(targetId) || targetId < 1 || targetId > (mode === "hizb" ? 60 : 480)) return;
  const key = audioTrackKey(mode, targetId, reciterId), current = useAudioStore.getState();
  if (current.track?.key === key) return;
  generation++;
  const el = element(); el.pause();
  const url = mode === "hizb" ? getHizbAudioUrl(reciterId, targetId) : getThumunAudioUrl(reciterId, targetId);
  el.src = url; el.loop = false; el.playbackRate = current.speed; el.muted = current.muted;
  set({ track: { key, mode, targetId, reciterId, title, url }, time: 0, duration: 0, playing: false, loading: false, error: null, loop: false, loopStart: null, loopEnd: null });
  mediaSession();
}
export async function playAudio() {
  if (!audio || !useAudioStore.getState().track) return;
  const request = generation;
  set({ loading: true, error: null });
  try { await audio.play(); if (request === generation) set({ playing: true, loading: false }); }
  catch {
    if (request === generation) set({ playing: false, loading: false, error: "تعذّر بدء التشغيل. اضغط إعادة المحاولة أو اختر قارئًا آخر." });
  }
}
export function pauseAudio() { audio?.pause(); }
export function seekAudio(seconds: number) {
  if (!audio || !Number.isFinite(seconds) || !Number.isFinite(audio.duration)) return;
  audio.currentTime = Math.max(0, Math.min(audio.duration, seconds)); set({ time: audio.currentTime });
}
export function setAudioSpeed(speed: number) {
  if (![0.75, 1, 1.25, 1.5, 1.75, 2].includes(speed)) return;
  if (audio) audio.playbackRate = speed; set({ speed });
}
export function setAudioMuted(muted: boolean) { if (audio) audio.muted = muted; set({ muted }); }
export function setAudioLoop(loop: boolean) { if (audio) audio.loop = loop; set({ loop, loopStart: null, loopEnd: null }); }
export function setLoopPoint(point: "start" | "end"): boolean {
  const state = useAudioStore.getState();
  if (!audio || !state.duration) return false;
  if (point === "start") { audio.loop = false; set({ loopStart: state.time, loopEnd: null, loop: false }); return true; }
  if (state.loopStart === null || state.time <= state.loopStart + 0.5) return false;
  set({ loopEnd: state.time }); return true;
}
export function clearAudioSegment() { set({ loopStart: null, loopEnd: null }); }
export function retryAudio() { audio?.load(); void playAudio(); }
export function stopAudio() {
  generation++; audio?.pause();
  if (audio) { audio.removeAttribute("src"); audio.load(); }
  set(initial);
  if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
    navigator.mediaSession.metadata = null; navigator.mediaSession.playbackState = "none";
    for (const action of ["play", "pause", "seekbackward", "seekforward", "seekto"] as MediaSessionAction[]) {
      try { navigator.mediaSession.setActionHandler(action, null); } catch { /* Unsupported. */ }
    }
  }
}
