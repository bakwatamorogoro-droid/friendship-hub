import { useEffect, useState } from "react";
import { StatusOverlay, type StatusState } from "@/components/StatusOverlay";

type Listener = (s: StatusState) => void;
const listeners = new Set<Listener>();

export type StatusInput = {
  type: "success" | "error";
  title?: string;
  message: string;
  autoCloseMs?: number;
};

/** Onyesha ujumbe wa kisasa wa mafanikio (✓) au hitilafu (✕). */
export function showStatus(input: StatusInput): void;
export function showStatus(type: "success" | "error", message: string): void;
export function showStatus(a: StatusInput | "success" | "error", message?: string): void {
  const s: StatusState =
    typeof a === "string" ? { type: a, message: message ?? "" } : { ...a };
  listeners.forEach((l) => l(s));
}

/** Inawekwa mara moja kwenye mzizi wa mfumo. */
export function StatusHost() {
  const [status, setStatus] = useState<StatusState>(null);
  useEffect(() => {
    const l: Listener = (s) => setStatus(s);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return (
    <StatusOverlay
      status={status}
      autoCloseMs={status?.autoCloseMs ?? 0}
      onClose={() => setStatus(null)}
    />
  );
}
