"use client";

import { formatNum } from "@/lib/format";
import { useXpStore } from "@/store/useXpStore";
import { AnimatePresence, motion } from "framer-motion";

export default function FloatingXpOverlay() {
  const events = useXpStore((s) => s.events);
  const removeEvent = useXpStore((s) => s.removeEvent);
  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]" aria-live="polite">
      <AnimatePresence>
        {events.map((e) => (
          <motion.div
            key={e.id}
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, y: -100, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            onAnimationComplete={() => removeEvent(e.id)}
            className="absolute font-bold text-lg drop-shadow-[0_0_6px_rgba(184,137,60,0.65)] text-f-gold select-none pointer-events-none"
            style={{
              left: e.x,
              top: e.y,
              transform: "translate(-50%, -50%)",
              textShadow: "0px 1px 3px rgba(0,0,0,0.45)",
            }}
          >
            +{formatNum(e.amount, false)} XP
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
