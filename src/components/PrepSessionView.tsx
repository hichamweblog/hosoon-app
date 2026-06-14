import { X, Play, Pause, RotateCcw, Minus, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { vibrateSuccess, vibrateLight } from "@/lib/haptic";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";

interface PrepSessionViewProps {
  thumuns: any[];
  onComplete: () => void;
  onClose: () => void;
}

export default function PrepSessionView({
  thumuns,
  onComplete,
  onClose,
}: PrepSessionViewProps) {
  const handleComplete = () => {
    vibrateSuccess();
    onComplete();
  };

  const [initialTime, setInitialTime] = useState(25 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);

  const changeTime = (minutes: number) => {
    if (isActive) return;
    const newTime = Math.max(5 * 60, initialTime + minutes * 60);
    setInitialTime(newTime);
    setTimeLeft(newTime);
    vibrateLight();
  };

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      clearInterval(interval);
      vibrateSuccess();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => {
    vibrateLight();
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    vibrateLight();
    setIsActive(false);
    setTimeLeft(initialTime);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
          <span className="font-semibold text-lg">جلسة التحضير</span>
          <div className="w-10"></div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 mb-8">
          <div className="w-full max-w-sm">
            <h2 className="text-2xl font-bold mb-2">التحضير الأسبوعي</h2>
            
            {thumuns && thumuns.length > 0 && (
              <div className="bg-background/30 rounded-xl p-4 border border-border/50 mb-6 text-sm">
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-border/50">
                  <span className="text-muted-foreground">من:</span>
                  <span className="font-bold">{thumuns[0].surah} (ثمن {thumuns[0].id})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">إلى:</span>
                  <span className="font-bold">{thumuns[thumuns.length - 1].surah} (ثمن {thumuns[thumuns.length - 1].id})</span>
                </div>
              </div>
            )}

            <div className="bg-background/50 rounded-2xl p-6 border border-border mb-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => changeTime(-5)} disabled={isActive || initialTime <= 300}>
                  <Minus className="w-5 h-5" />
                </Button>
                <div className="text-5xl font-mono font-bold tracking-widest text-primary w-40 text-center">
                  {formatTime(timeLeft)}
                </div>
                <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => changeTime(5)} disabled={isActive}>
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex items-center justify-center gap-4">
                <Button variant={isActive ? "outline" : "default"} size="icon" className="w-12 h-12 rounded-full" onClick={toggleTimer}>
                  {isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                </Button>
                <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full" onClick={resetTimer}>
                  <RotateCcw className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            <p className="text-muted-foreground text-sm">
              قم بالاستماع أو التلاوة السريعة لهذه الأثمان لتهيئة العقل لحفظها لاحقاً.
            </p>
          </div>
        </div>

        <div className="p-4 pb-8 space-y-3">
          <Button
            className="w-full h-14 rounded-2xl bg-violet-500 hover:bg-violet-600 text-white font-bold text-lg"
            onClick={handleComplete}>
            إتمام التحضير
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
