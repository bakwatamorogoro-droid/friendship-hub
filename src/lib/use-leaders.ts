import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Leader = {
  id: string;
  slug: string;
  full_name: string;
  position: string;
  short_message: string | null;
  bio: string | null;
  photo_url: string | null;
  phone: string | null;
  email: string | null;
  sort_order: number;
  published: boolean;
  department_id: string | null;
};

export function useLeaders(limit?: number) {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    let q = (supabase.from("leaders") as any)
      .select("*")
      .eq("published", true)
      .order("sort_order", { ascending: true });
    if (limit) q = q.limit(limit);
    q.then(({ data }: any) => {
      if (!alive) return;
      setLeaders((data ?? []) as Leader[]);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [limit]);

  return { leaders, loading };
}

/**
 * Wasifu mmoja kwa slug. Hatuweki kichujio cha `published` kwa sababu RLS
 * inaruhusu kiongozi kuona wasifu wake mwenyewe hata kabla ya kuchapishwa.
 */
export function useLeader(slug: string) {
  const [leader, setLeader] = useState<Leader | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (supabase.from("leaders") as any)
      .select("*")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }: any) => {
        if (!alive) return;
        setLeader((data as Leader) ?? null);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  return { leader, loading };
}
