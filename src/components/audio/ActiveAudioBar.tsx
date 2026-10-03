"use client";
import { Pause, Play, X } from "lucide-react";
import { useAudioStore, pauseAudio, playAudio, stopAudio, retryAudio } from "@/lib/audio-engine";
import { Button } from "../ui/button";
export default function ActiveAudioBar() {
  const audio = useAudioStore();
  if (!audio.track) return null;
  return <aside className="fixed bottom-[4.75rem] left-3 right-3 z-[60] mx-auto max-w-2xl rounded-2xl border border-border bg-card shadow-lg p-2" aria-label="الصوت النشط">
    <div className="flex items-center gap-2">
      <Button size="icon" variant="ghost" onClick={() => { if (audio.playing) pauseAudio(); else void playAudio(); }} aria-label={audio.playing ? "إيقاف الصوت النشط" : "متابعة الصوت النشط"}>{audio.playing ? <Pause className="size-4" /> : <Play className="size-4" />}</Button>
      <p className="text-sm flex-1 min-w-0 truncate">{audio.track.title}</p>
      <Button size="icon" variant="ghost" aria-label="إغلاق الصوت النشط" onClick={stopAudio}><X className="size-4" /></Button>
    </div>
    {audio.error && <div role="alert" className="text-xs text-destructive px-2 pb-1">{audio.error}<button className="font-bold underline ms-2 min-h-8" onClick={retryAudio}>إعادة المحاولة</button></div>}
  </aside>;
}
