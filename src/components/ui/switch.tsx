"use client";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";
export function Switch({ className, size: _size, ...props }: SwitchPrimitive.Root.Props & { size?: "sm" | "default" }) {
  void _size;
  return <SwitchPrimitive.Root data-slot="switch" className={cn("group/switch relative inline-flex shrink-0 items-center h-11 w-14 rounded-full border-2 border-muted-foreground bg-input px-1 outline-none data-checked:bg-primary data-checked:border-primary data-disabled:opacity-60", className)} {...props}>
    <SwitchPrimitive.Thumb data-slot="switch-thumb" className="pointer-events-none block size-7 rounded-full bg-foreground group-data-checked/switch:bg-primary-foreground transition-transform group-data-checked/switch:-translate-x-5" />
  </SwitchPrimitive.Root>;
}
