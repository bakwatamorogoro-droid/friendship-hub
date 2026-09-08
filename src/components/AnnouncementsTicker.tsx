import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Item = { id: string; title: string; content: string };

export function AnnouncementsTicker() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    supabase
      .from("announcements")
      .select("id,title,content")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(15)
      .then(({ data }) => setItems((data as Item[]) ?? []));
  }, []);
  if (items.length === 0) return null;
  const loop = [...items, ...items];
  return (
    <div className="announce-ticker" role="status" aria-label="Matangazo">
      <div className="mx-auto max-w-7xl px-4 flex items-center gap-3">
        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider bg-white/15 rounded-full px-2.5 py-1">
          <Megaphone className="h-3.5 w-3.5" /> Matangazo
        </span>
        <div className="flex-1 overflow-hidden">
          <div className="announce-ticker-track">
            {loop.map((a, i) => (
              <span key={`${a.id}-${i}`} className="announce-ticker-item">
                <strong className="font-semibold">{a.title}</strong>
                <span className="opacity-90">— {a.content.slice(0, 140)}{a.content.length > 140 ? "…" : ""}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}