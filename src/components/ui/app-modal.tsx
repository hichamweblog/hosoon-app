"use client";
import { Dialog } from "@base-ui/react/dialog";
import { useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { useModalLayer } from "@/lib/modal-stack";
import { useAudioStore, pauseAudio, retryAudio } from "@/lib/audio-engine";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface ModalProps {
  title: string;
  description?: string;
  onClose: () => void;
  open?: boolean;
  children: ReactNode;
  className?: string;
  fullScreen?: boolean;
  customHeader?: boolean;
  id?: string;
}
/** All app overlays share history arbitration; Base UI owns focus/inert/scroll locking. */
export function AppModal({ title, description, onClose, children, open = true, className, fullScreen = false, customHeader = false, id }: ModalProps) {
  const generated = useId();
  const layerId = id ?? `dialog-${generated.replace(/[^\w-]/g, "")}`;
  const activeAudio = useAudioStore();
  const { isTop, zIndex } = useModalLayer(layerId, open, onClose);
  return (
    <Dialog.Root open={open} modal={isTop} disablePointerDismissal onOpenChange={(next, details) => {
      if (!next) { details.cancel(); if (isTop) onClose(); }
    }}>
      <Dialog.Portal keepMounted>
        <Dialog.Backdrop style={{ zIndex }} className="fixed inset-0 bg-background/80 backdrop-blur-sm data-closed:hidden" />
        <Dialog.Popup
          dir="rtl" data-modal-layer={layerId}
          style={{ zIndex: zIndex + 1 }}
          className={cn(
            "fixed flex flex-col overflow-hidden outline-none bg-card text-card-foreground border border-border shadow-2xl data-closed:hidden",
            fullScreen ? "inset-0 h-[100dvh] w-full" : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-3xl w-[calc(100%-1.5rem)] max-w-lg max-h-[92dvh]",
            className,
          )}
        >
          {customHeader ? <Dialog.Title className="sr-only">{title}</Dialog.Title> : (
            <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
              <Dialog.Title className="font-bold text-lg">{title}</Dialog.Title>
              <Dialog.Close render={<Button size="icon" variant="ghost" aria-label={`إغلاق ${title}`} />}><X className="size-5" aria-hidden /></Dialog.Close>
            </header>
          )}
          {isTop && activeAudio.track && (activeAudio.playing || activeAudio.error) && <aside className="px-4 py-2 border-b border-border text-xs flex flex-wrap items-center gap-2 shrink-0" aria-label="المسار الصوتي الجاري">
            <span className="flex-1 min-w-0">الصوت النشط: {activeAudio.track.title}</span>
            {activeAudio.playing && <Button size="sm" variant="outline" aria-label="إيقاف الصوت الجاري" onClick={pauseAudio}>إيقاف</Button>}
            {activeAudio.error && <><span role="alert">{activeAudio.error}</span><Button size="sm" variant="outline" onClick={retryAudio}>إعادة محاولة الصوت الجاري</Button></>}
          </aside>}
          {description ? <Dialog.Description className="px-5 pt-3 text-sm text-muted-foreground">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
          {children}
          {customHeader && <Dialog.Close className="sr-only">إغلاق</Dialog.Close>}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ConfirmModal({ title, message, confirmLabel = "تأكيد", onConfirm, onClose, busy = false, destructive = false }: {
  title: string; message: string; confirmLabel?: string; onConfirm: () => void; onClose: () => void; busy?: boolean; destructive?: boolean;
}) {
  return <AppModal title={title} description={message} onClose={() => { if (!busy) onClose(); }} className="max-w-sm">
    <footer className="flex flex-wrap gap-2 p-5">
      <Button variant="outline" onClick={onClose} disabled={busy}>إلغاء</Button>
      <Button variant={destructive ? "destructive" : "default"} onClick={onConfirm} disabled={busy}>{busy ? "جارٍ التنفيذ…" : confirmLabel}</Button>
    </footer>
  </AppModal>;
}
