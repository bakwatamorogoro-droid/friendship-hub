import { useEffect, useState } from "react";
import { StatusOverlay, type StatusState } from "@/components/StatusOverlay";

type Listener = (s: StatusState) => void;
const listeners = new Set<Listener>();

/** Onyesha ujumbe wa kisasa wa mafanikio (✓) au hitilafu (✕). */
export function showStatus(type: "success" | "error", message: string) {
  listeners.forEach((l) => l({ type, message }));
}

/** Inawekwa mara moja kwenye mzizi wa mfumo. */
export function StatusHost() {
  const [status, setStatus] = useState<StatusState>(null);
  useEffect(() => {
    const l: Listener = (s) => setStatus(s);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return <StatusOverlay status={status} onClose={() => setStatus(null)} />;
}
