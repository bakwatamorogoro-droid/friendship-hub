import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Deadline = { deadline_at: string | null; deadline_note: string | null };

/** Muda wa mwisho wa huduma kuu (mikopo, misiba, changamoto, huduma...). */
export function useServiceDeadline(key: string) {
  const [d, setD] = useState<Deadline | null>(null);
  useEffect(() => {
    (supabase.from("service_status") as any)
      .select("deadline_at,deadline_note")
      .eq("key", key)
      .maybeSingle()
      .then(({ data }: any) => setD((data as Deadline) ?? null));
  }, [key]);
  return d;
}

/** Muda wa mwisho uliowekwa na kiongozi wa idara. */
export function useDepartmentDeadline(departmentId: string | null | undefined) {
  const [d, setD] = useState<Deadline | null>(null);
  useEffect(() => {
    if (!departmentId) { setD(null); return; }
    (supabase.from("departments") as any)
      .select("deadline_at,deadline_note")
      .eq("id", departmentId)
      .maybeSingle()
      .then(({ data }: any) => setD((data as Deadline) ?? null));
  }, [departmentId]);
  return d;
}
