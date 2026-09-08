import { useEffect } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type StatusState = { type: "success" | "error"; message: string } | null;

/** Ujumbe wa kisasa wa mafanikio (✓) au hitilafu (✕) wenye animation. */
export function StatusOverlay({
  status,
  onClose,
  autoCloseMs = 0,
}: {
  status: StatusState;
  onClose: () => void;
  autoCloseMs?: number;
}) {
  useEffect(() => {
    if (!status || !autoCloseMs) return;
    const t = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(t);
  }, [status, autoCloseMs, onClose]);

  if (!status) return null;
  const ok = status.type === "success";

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      className="fixed inset-0 z-[100] grid place-items-center bg-background/70 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="status-pop panel-3d w-full max-w-sm rounded-3xl border border-border bg-card p-8 text-center shadow-[var(--shadow-elegant)]"
      >
        <div
          className={`status-ring mx-auto grid h-24 w-24 place-items-center rounded-full ${
            ok ? "bg-primary/12 text-primary" : "bg-destructive/12 text-destructive"
          }`}
        >
          {ok ? <Check className="status-mark h-12 w-12" /> : <X className="status-mark h-12 w-12" />}
        </div>
        <h2 className={`mt-5 text-2xl font-black ${ok ? "text-primary" : "text-destructive"}`}>
          {ok ? "Imefanikiwa!" : "Imeshindikana"}
        </h2>
        <p className="mt-2 text-base text-muted-foreground">{status.message}</p>
        <Button className="btn-3d mt-6 w-full" size="lg" onClick={onClose}>
          {ok ? "Nimeelewa" : "Jaribu Tena"}
        </Button>
      </div>
    </div>
  );
}
