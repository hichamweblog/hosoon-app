import { X } from "lucide-react";
import { motion } from "framer-motion";
import { vibrateSuccess } from "@/lib/haptic";
import { Button } from "./ui/button";

interface ReviewSessionViewProps {
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

export default function ReviewSessionView({
  surah,
  juz,
  hizb,
  id,
  startText,
  onComplete,
  onClose,
}: ReviewSessionViewProps) {
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
          <span className="font-semibold text-lg">جلسة المراجعة</span>
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

        <div className="p-4 pb-8 space-y-3">
          <h3 className="font-medium text-muted-foreground text-center">
            كيف كان مستوى الحفظ؟
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              className="h-12 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-600 border-red-500/20"
              onClick={handleComplete}>
              ضعيف
            </Button>
            <Button
              variant="outline"
              className="h-12 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 hover:text-amber-600 border-amber-500/20"
              onClick={handleComplete}>
              جيد
            </Button>
            <Button
              variant="outline"
              className="h-12 bg-green-500/10 text-green-500 hover:bg-green-500/20 hover:text-green-600 border-green-500/20"
              onClick={handleComplete}>
              ممتاز
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
