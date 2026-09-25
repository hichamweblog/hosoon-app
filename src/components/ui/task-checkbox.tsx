"use client";

import { playDing, vibrateLight } from "@/lib/haptic";
import { CheckCircle2 } from "lucide-react";

interface Props {
  checked?: boolean;
  onToggle: (e: React.MouseEvent) => void;
  size?: "sm" | "md";
  label: string; // accessible name
  glowClass?: string;
}

export default function TaskCheckbox({
  checked,
  onToggle,
  size = "md",
  label,
  glowClass = "shadow-[0_0_12px_rgba(63,129,104,0.45)]",
}: Props) {
  const dim = size === "sm" ? "w-5 h-5" : "w-6 h-6";
  const icon = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={!!checked}
      aria-label={label}
      onClick={(e) => {
        vibrateLight();
        if (!checked) playDing();
        onToggle(e);
      }}
      className={`${dim} rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
        checked
          ? `bg-primary border-primary scale-110 ${glowClass}`
          : "border-muted-foreground/30 hover:border-primary/50 hover:scale-105"
      }`}
    >
      {checked && <CheckCircle2 className={`${icon} text-primary-foreground`} />}
    </button>
  );
}
