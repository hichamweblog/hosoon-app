"use client";

import { formatNum } from "@/lib/format";
import { useXpStore } from "@/store/useXpStore";
import { useHifzStore } from "@/store/useHifzStore";
import { AnimatePresence, motion } from "framer-motion";

export default function FloatingXpOverlay() {
  const { events, removeEvent } = useXpStore();
  const arabic = useHifzStore((s) => s.settings.arabicNumerals);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]" aria-hidden>
      <AnimatePresence>
        {events.map((e) => (
          <motion.div
            key={e.id}
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, y: -100, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            onAnimationComplete={() => removeEvent(e.id)}
            className="absolute font-black text-2xl drop-shadow-[0_0_8px_rgba(184,137,60,0.8)] text-f-gold select-none pointer-events-none"
            style={{
              left: e.x,
              top: e.y,
              transform: "translate(-50%, -50%)",
              textShadow: "0px 2px 4px rgba(0,0,0,0.5)",
            }}
          >
            +{formatNum(e.amount, arabic)} نقطة
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
