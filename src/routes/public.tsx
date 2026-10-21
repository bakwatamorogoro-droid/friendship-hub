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
    supabase
      .from("announcements")
      .select("id,title,content,created_at")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => setItems((data ?? []) as A[]));
  }, []);

  return (
    <div className="page-shell page-shell-narrow section-y">
      <div className="section-head">
        <span className="eyebrow">
          <Megaphone className="h-3.5 w-3.5" /> Umma
        </span>
        <h1 className="section-title">Matangazo ya Umma</h1>
        <p className="section-sub">Taarifa rasmi za umma kutoka MUMSO.</p>
      </div>

      <div className="grid gap-5">
        {items.length === 0 && (
          <div className="empty-state">
            <Megaphone className="h-6 w-6" />
            <p className="font-semibold text-foreground">Hakuna matangazo kwa sasa.</p>
            <p className="text-sm">Taarifa mpya zitaonekana hapa mara zitakapochapishwa.</p>
          </div>
        )}
        {items.map((a) => (
          <article key={a.id} className="surface surface-pad">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="text-lg font-bold text-foreground md:text-xl">{a.title}</h2>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {new Date(a.created_at).toLocaleDateString("sw-TZ", { dateStyle: "long" })}
              </span>
            </div>
            <p className="mt-3 whitespace-pre-wrap leading-relaxed text-foreground/85">
              {a.content}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
