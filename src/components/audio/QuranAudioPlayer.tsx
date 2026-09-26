"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  HIZB_RECITERS,
  THUMUN_RECITERS,
  getHizbAudioUrl,
  getThumunAudioUrl,
  thumunToHizbAndPos,
} from "@/lib/quran-audio";
import { useHifzStore } from "@/store/useHifzStore";
import { formatClock, formatNum } from "@/lib/format";
import { vibrateLight } from "@/lib/haptic";
import {
  Headphones,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Gauge,
} from "lucide-react";
import { Button } from "../ui/button";

interface Props {
  mode: "hizb" | "thumun";
  targetId: number; // hizb (1..60) or thumunId (1..480)
  title?: string;
  subtitle?: string;
  compact?: boolean;
  className?: string;
  autoPlay?: boolean;
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 1.75, 2];

export default function QuranAudioPlayer({
  mode,
  targetId,
  title,
  subtitle,
  compact = false,
  className = "",
  autoPlay = false,
}: Props) {
  const settings = useHifzStore((s) => s.settings);
  const updateSettings = useHifzStore((s) => s.updateSettings);
  const arabic = settings.arabicNumerals;

  const currentReciterId =
    mode === "hizb"
      ? settings.hizbReciterId || "husary"
      : settings.thumunReciterId || "sayed";

  const reciterList = mode === "hizb" ? HIZB_RECITERS : THUMUN_RECITERS;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bufferedPercent, setBufferedPercent] = useState(0);

  // Compute audio URL based on mode, targetId, and active reciter
  const audioUrl =
    mode === "hizb"
      ? getHizbAudioUrl(currentReciterId, targetId)
      : getThumunAudioUrl(currentReciterId, targetId);

  // Reciter change
  const handleReciterChange = (newReciterId: string) => {
    vibrateLight();
    if (mode === "hizb") {
      updateSettings({ hizbReciterId: newReciterId });
    } else {
      updateSettings({ thumunReciterId: newReciterId });
    }
  };

  // Actions
  const togglePlay = useCallback(() => {
    vibrateLight();
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {
        setErrorMsg("تعذر بدء التشغيل الصوتي");
      });
    }
  }, [isPlaying]);

  const skip = useCallback((seconds: number) => {
    vibrateLight();
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + seconds));
  }, []);

  const toggleLoop = () => {
    vibrateLight();
    setIsLooping((prev) => !prev);
  };

  const cycleSpeed = () => {
    vibrateLight();
    const currentIndex = SPEED_OPTIONS.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
    setPlaybackRate(SPEED_OPTIONS[nextIndex]);
  };

  const toggleMute = () => {
    vibrateLight();
    setIsMuted((prev) => !prev);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar = progressBarRef.current;
    if (!audio || !bar) return;

    const rect = bar.getBoundingClientRect();
    const isRtl = document.dir === "rtl" || document.documentElement.dir === "rtl";
    const clickX = isRtl ? rect.right - e.clientX : e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));

    audio.currentTime = ratio * (audio.duration || 0);
  };

  // When source URL changes, reload audio element cleanly
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setErrorMsg(null);
    audio.src = audioUrl;
    audio.load();

    if (autoPlay) {
      audio.play().catch(() => {});
    }
  }, [audioUrl, autoPlay]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.buffered.length > 0 && audio.duration > 0) {
        const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
        setBufferedPercent((bufferedEnd / audio.duration) * 100);
      }
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsLoading(false);
      audio.playbackRate = playbackRate;
    };

    const onPlay = () => {
      audio.playbackRate = playbackRate;
      setIsPlaying(true);
      setIsLoading(false);
    };

    const onPause = () => {
      setIsPlaying(false);
    };

    const onWaiting = () => {
      setIsLoading(true);
    };

    const onPlaying = () => {
      setIsLoading(false);
    };

    const onEnded = () => {
      if (!isLooping) {
        setIsPlaying(false);
      }
    };

    const onError = () => {
      setIsLoading(false);
      setIsPlaying(false);
      setErrorMsg("تعذر تحميل المقطع الصوتي — يرجى التحقق من الاتصال");
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [isLooping, playbackRate]);

  // Handle loop, playback rate, volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = isLooping;
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.muted = isMuted;
    }
  }, [isLooping, playbackRate, isMuted]);

  // MediaSession API integration for background/lockscreen controls
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    const currentReciter = reciterList.find((r) => r.id === currentReciterId);
    const displayTitle =
      title || (mode === "hizb" ? `الحزب ${targetId}` : `الثمن ${targetId}`);

    navigator.mediaSession.metadata = new MediaMetadata({
      title: displayTitle,
      artist: currentReciter?.name || "القارئ",
      album: "حصون القرآن (رواية ورش)",
    });

    navigator.mediaSession.setActionHandler("play", togglePlay);
    navigator.mediaSession.setActionHandler("pause", togglePlay);
    navigator.mediaSession.setActionHandler("seekbackward", () => skip(-5));
    navigator.mediaSession.setActionHandler("seekforward", () => skip(5));

    return () => {
      if ("mediaSession" in navigator) {
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
        navigator.mediaSession.setActionHandler("seekbackward", null);
        navigator.mediaSession.setActionHandler("seekforward", null);
      }
    };
  }, [title, currentReciterId, mode, targetId, reciterList, togglePlay, skip]);

  const currentPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Title fallback
  const computedTitle =
    title ||
    (mode === "hizb"
      ? `سماع الحزب ${formatNum(targetId, arabic)}`
      : `سماع الثمن ${formatNum(targetId, arabic)}`);

  const computedSubtitle =
    subtitle ||
    (mode === "thumun"
      ? `الحزب ${formatNum(thumunToHizbAndPos(targetId).hizb, arabic)} · الثمن ${formatNum(
          thumunToHizbAndPos(targetId).pos,
          arabic,
        )}`
      : "رواية ورش عن نافع");

  if (compact) {
    return (
      <div className={`bg-background/70 border border-border/70 rounded-xl p-2.5 ${className}`} dir="rtl">
        <audio ref={audioRef} preload="none" />
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              size="icon"
              onClick={togglePlay}
              disabled={isLoading && !isPlaying}
              className="w-8 h-8 rounded-full shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
              aria-label={isPlaying ? "إيقاف" : "تشغيل"}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </Button>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{computedTitle}</p>
              <p className="text-[10px] text-muted-foreground font-mono">
                {formatClock(currentTime)} / {formatClock(duration)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <select
              value={currentReciterId}
              onChange={(e) => handleReciterChange(e.target.value)}
              className="bg-surface text-foreground border border-border/70 rounded-lg px-2 py-1 text-[11px] font-medium outline-none cursor-pointer"
              aria-label="اختيار القارئ"
            >
              {reciterList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-surface/90 border border-border/80 rounded-2xl shadow-md p-4 transition-all duration-200 ${className}`}
      dir="rtl"
    >
      <audio ref={audioRef} preload="metadata" />

      {/* Header: Title, Reciter Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Headphones className="w-5 h-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-sm text-foreground truncate">{computedTitle}</h4>
            <p className="text-[11px] text-muted-foreground truncate">{computedSubtitle}</p>
          </div>
        </div>

        {/* Reciter Dropdown */}
        <div className="flex items-center gap-1.5 shrink-0">
          <select
            value={currentReciterId}
            onChange={(e) => handleReciterChange(e.target.value)}
            className="bg-background text-foreground border border-border/70 rounded-xl px-2.5 py-1.5 text-xs font-medium outline-none focus:border-primary transition-colors cursor-pointer"
            aria-label="اختيار القارئ"
          >
            {reciterList.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} {"speedLabel" in r && r.speedLabel ? `(${r.speedLabel})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {errorMsg ? (
        <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between gap-2 my-2">
          <span>{errorMsg}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.load();
                audioRef.current.play().catch(() => {});
              }
            }}
            className="h-7 text-xs"
          >
            إعادة المحاولة
          </Button>
        </div>
      ) : null}

      {/* Progress Bar (Scrubber) */}
      <div className="space-y-1 mb-3">
        <div
          ref={progressBarRef}
          onClick={handleSeek}
          className="relative h-2 bg-muted/60 hover:h-2.5 rounded-full overflow-hidden cursor-pointer transition-all"
          title="اضغط للتخطي"
          role="slider"
          aria-valuenow={currentTime}
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-label="شريط التقدم الصوتي"
        >
          {/* Buffered track */}
          <div
            className="absolute top-0 bottom-0 bg-primary/20 rounded-full transition-all"
            style={{ width: `${bufferedPercent}%` }}
          />
          {/* Played track */}
          <div
            className="absolute top-0 bottom-0 bg-primary rounded-full transition-all"
            style={{ width: `${currentPercent}%` }}
          />
        </div>

        {/* Clock timestamps */}
        <div className="flex justify-between items-center text-[11px] font-mono text-muted-foreground px-0.5">
          <span>{formatClock(currentTime)}</span>
          <span>{formatClock(duration)}</span>
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
        {/* Left Side: Loop & Speed */}
        <div className="flex items-center gap-1">
          <Button
            variant={isLooping ? "default" : "ghost"}
            size="sm"
            onClick={toggleLoop}
            className={`h-8 px-2 text-xs rounded-lg transition-colors gap-1 ${
              isLooping
                ? "bg-primary text-primary-foreground font-bold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={isLooping ? "إلغاء التكرار" : "تكرار الورد للحفظ الراسخ"}
            aria-label="تكرار الورد"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLooping ? "animate-spin-slow" : ""}`} />
            <span className="hidden sm:inline">تكرار</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={cycleSpeed}
            className="h-8 px-2 text-xs font-mono font-bold text-muted-foreground hover:text-foreground rounded-lg"
            title="تغيير سرعة القراءة"
            aria-label={`سرعة القراءة ${playbackRate}x`}
          >
            <Gauge className="w-3.5 h-3.5 ml-1 inline text-primary" />
            {playbackRate}x
          </Button>
        </div>

        {/* Center: Skip -5s, Play/Pause, Skip +5s */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => skip(-5)}
            className="w-8 h-8 rounded-full text-foreground/80 hover:text-foreground hover:bg-muted"
            title="ترديد 5 ثوانٍ للخلف (مفيد للحفظ)"
            aria-label="تراجع 5 ثوانٍ"
          >
            <span className="text-[11px] font-bold font-mono">-5s</span>
          </Button>

          <Button
            size="icon"
            onClick={togglePlay}
            disabled={isLoading && !isPlaying}
            className="w-11 h-11 rounded-full shadow-md transition-transform active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90"
            aria-label={isPlaying ? "إيقاف مؤقت" : "تشغيل الاستماع"}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => skip(5)}
            className="w-8 h-8 rounded-full text-foreground/80 hover:text-foreground hover:bg-muted"
            title="تقديم 5 ثوانٍ للأمام"
            aria-label="تقديم 5 ثوانٍ"
          >
            <span className="text-[11px] font-bold font-mono">+5s</span>
          </Button>
        </div>

        {/* Right Side: Volume & Mute */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground"
            title={isMuted ? "إلغاء الكتم" : "كتم الصوت"}
            aria-label={isMuted ? "إلغاء الكتم" : "كتم الصوت"}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-destructive" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
