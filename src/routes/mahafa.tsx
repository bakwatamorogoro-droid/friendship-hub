import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveStorageUrl } from "@/lib/storage-url";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/mahafa")({
  head: () => ({
    meta: [
      { title: "Mahafa — MUMSO" },
      { name: "description", content: "Taarifa na kumbukumbu za mahafa ya wahitimu wa MUM." },
      { property: "og:title", content: "Mahafa — MUMSO" },
      { property: "og:description", content: "Taarifa na kumbukumbu za mahafa ya wahitimu wa MUM." },
    ],
  }),
  component: MahafaPage,
});

type G = { id: string; title: string; content: string | null; event_date: string | null; image_url: string | null; created_at: string };

function MahafaPage() {
  const [items, setItems] = useState<G[]>([]);
  useEffect(() => {
    supabase.from("graduations").select("id,title,content,event_date,image_url,created_at")
      .eq("published", true)
      .order("event_date", { ascending: false })
      .then(async ({ data }) => {
        const rows = (data ?? []) as G[];
        const resolved = await Promise.all(
          rows.map(async (r) => ({ ...r, image_url: await resolveStorageUrl(r.image_url) })),
        );
        setItems(resolved as G[]);
      });
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-accent/70 p-8 md:p-10 text-primary-foreground shadow-[var(--shadow-elegant)]">
        <h1 className="text-3xl md:text-5xl font-bold flex items-center gap-3">
          <GraduationCap className="h-9 w-9" /> MAHAFALI YA CHUO
        </h1>
        <p className="mt-3 text-primary-foreground/90 max-w-3xl">
          Karibu kwenye ukurasa rasmi wa <span className="font-semibold">Mahafali ya Chuo Kikuu cha Kiislamu cha Morogoro (MUM)</span>. Hapa utapata kumbukumbu, picha na taarifa za mahafali mbalimbali ya wahitimu wetu — sherehe ya mafanikio, elimu na maadili.
        </p>
      </div>

      <h2 className="mt-10 text-2xl md:text-3xl font-bold text-foreground">Kumbukumbu za Mahafali</h2>
      <p className="mt-1 text-muted-foreground">Historia ya mahafali yaliyopita ya Chuo Kikuu cha Kiislamu cha Morogoro.</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {items.length === 0 && <p className="text-center text-muted-foreground py-12 col-span-full">Hakuna taarifa za mahafa kwa sasa.</p>}
        {items.map((g) => (
          <article key={g.id} className="rounded-2xl border border-border bg-card overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elegant)] transition">
            {g.image_url && (
              <img src={g.image_url} alt={g.title} className="w-full h-56 object-cover" />
            )}
            <div className="p-6">
              <h2 className="text-xl font-semibold text-primary">{g.title}</h2>
              {g.event_date && (
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(g.event_date).toLocaleDateString("sw-TZ", { dateStyle: "long" })}
                </p>
              )}
              {g.content && <p className="mt-3 text-foreground/85 whitespace-pre-wrap">{g.content}</p>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}