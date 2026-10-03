"use client";
import { playDing, vibrateLight } from "@/lib/haptic";
import { Check } from "lucide-react";
interface Props { checked?: boolean; onToggle: (e: React.MouseEvent) => boolean | void; size?: "sm" | "md"; label: string; glowClass?: string }
export default function TaskCheckbox({ checked, onToggle, label }: Props) {
  return <button type="button" role="checkbox" aria-checked={!!checked} aria-label={label} className={`size-11 rounded-full border-2 flex items-center justify-center shrink-0 focus-visible:outline-3 ${checked ? "bg-primary border-primary" : "bg-background border-muted-foreground"}`} onClick={(event) => {
    const changed = onToggle(event); if (changed === false) return;
    vibrateLight(); if (!checked) playDing();
  }}>{checked && <Check className="size-6 text-primary-foreground" aria-hidden />}</button>;
}
