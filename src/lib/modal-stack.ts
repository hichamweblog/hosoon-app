"use client";
import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
interface Layer { id: string; close: () => void }
const layers: Layer[] = [], listeners = new Set<() => void>();
let installed = false, ignorePop = false, handlingPop = false;
const emit = () => listeners.forEach((listener) => listener());
const marked = () => window.history.state?.hosoonDialog === true;
function ensureHistoryEntry() {
  if (!layers.length) return;
  const state = { ...window.history.state, hosoonDialog: true, hosoonLayer: layers.at(-1)!.id };
  if (marked()) window.history.replaceState(state, ""); else window.history.pushState(state, "");
}
function onPop() {
  if (ignorePop) {
    ignorePop = false;
    // A different overlay may have opened while a programmatic Back was pending.
    queueMicrotask(ensureHistoryEntry); return;
  }
  const top = layers.at(-1); if (!top) return;
  handlingPop = true; top.close();
  queueMicrotask(() => { handlingPop = false; ensureHistoryEntry(); });
}
function register(layer: Layer) {
  if (!installed) { window.addEventListener("popstate", onPop); installed = true; }
  layers.push(layer); ensureHistoryEntry(); emit();
  return () => {
    const index = layers.findIndex((entry) => entry.id === layer.id);
    if (index !== -1) layers.splice(index, 1);
    emit();
    // One reserved history entry represents the entire modal stack. Reinstating it
    // after a native Back closes only the top layer and eliminates orphan entries.
    queueMicrotask(() => {
      if (layers.length) { ensureHistoryEntry(); return; }
      if (!handlingPop && marked() && !ignorePop) { ignorePop = true; window.history.back(); }
    });
  };
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function useModalLayer(id: string, open: boolean, close: () => void) {
  const callback = useRef(close);
  useLayoutEffect(() => { callback.current = close; }, [close]);
  useLayoutEffect(() => open ? register({ id, close: () => callback.current() }) : undefined, [id, open]);
  const top = useSyncExternalStore(subscribe, () => layers.at(-1)?.id ?? "", () => "");
  const depth = useSyncExternalStore(subscribe, () => layers.findIndex((entry) => entry.id === id), () => 0);
  return { isTop: top === id, zIndex: 100 + Math.max(0, depth) * 10 };
}
