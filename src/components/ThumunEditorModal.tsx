"use client";
import type { Thumun } from "@/lib/quran-data";
import ThumunEditor from "./ThumunEditor";
// Legacy entry point now uses the same proposal-only, history-aware editor.
export default function ThumunEditorModal({ thumun, onClose }: { thumun: Thumun; onClose: () => void }) {
  return <ThumunEditor thumunId={thumun.id} onClose={onClose} />;
}
