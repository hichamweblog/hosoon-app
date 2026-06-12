import { X } from "lucide-react";
import { motion } from "framer-motion";
import { vibrateSuccess } from "@/lib/haptic";
import { Button } from "./ui/button";

interface SessionViewProps {
  surah: any;
  juz?: any;
  hizb?: any;
  id?: any;
  startAyah?: any;
  endAyah?: any;
  startText?: any;
  onComplete: () => void;
  onClose: () => void;
}

export default function SessionView({
  surah,
  juz,
  hizb,
  id,
  startText,
  onComplete,
  onClose,
}: SessionViewProps) {
  const handleComplete = () => {
    vibrateSuccess();
    onComplete();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-sm flex items-center justify-center p-4" 
      dir="rtl">
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="bg-surface rounded-3xl p-8 w-full max-w-md text-center border border-border shadow-2xl relative overflow-hidden"
      >
        <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-6 h-6" />
          </Button>
          <span className="font-semibold text-lg">جلسة الحفظ</span>
          <div className="w-10"></div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 mb-8">
          <div className="w-full max-w-sm">
            <h2 className="text-2xl font-bold mb-2">{String(surah)}</h2>
            <p className="text-muted-foreground mb-6">
              الجزء {String(juz ?? "")} · الحزب {String(hizb ?? "")} · الثمن {String(id ?? "")}
            </p>
            {!!startText && (
              <p className="font-quran text-2xl leading-loose">
                &quot;{String(startText)}...&quot;
              </p>
            )}
          </div>
        </div>

        <div className="p-4 pb-8">
          <Button
            size="lg"
            className="w-full text-lg font-bold h-14 rounded-xl"
            onClick={handleComplete}>
            تم إنجاز الحفظ
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
