import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone } from "lucide-react";

export const Route = createFileRoute("/public")({
  head: () => ({
    meta: [
      { title: "Public — Matangazo ya MUMSO" },
      { name: "description", content: "Matangazo rasmi ya umma kutoka MUMSO." },
      { property: "og:title", content: "Public — Matangazo ya MUMSO" },
      { property: "og:description", content: "Matangazo rasmi ya umma kutoka MUMSO." },
    ],
  }),
  component: PublicPage,
});

type A = { id: string; title: string; content: string; created_at: string };

function PublicPage() {
  const [items, setItems] = useState<A[]>([]);
  useEffect(() => {
    supabase.from("announcements").select("id,title,content,created_at")
      .eq("published", true).order("created_at", { ascending: false })
      .then(({ data }) => setItems((data ?? []) as A[]));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-bold text-foreground flex items-center gap-3">
        <Megaphone className="h-8 w-8 text-accent" /> Public — Matangazo
      </h1>
      <p className="mt-2 text-muted-foreground">Taarifa rasmi za umma kutoka MUMSO.</p>
      <div className="mt-8 space-y-4">
        {items.length === 0 && <p className="text-center text-muted-foreground py-12">Hakuna matangazo kwa sasa.</p>}
        {items.map((a) => (
          <article key={a.id} className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <h2 className="text-xl font-semibold text-primary">{a.title}</h2>
            <p className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleDateString("sw-TZ", { dateStyle: "long" })}</p>
            <p className="mt-3 text-foreground/85 whitespace-pre-wrap">{a.content}</p>
          </article>
        ))}
      </div>
    </div>
  );
}