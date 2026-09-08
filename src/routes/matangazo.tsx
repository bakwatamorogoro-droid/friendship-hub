import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone } from "lucide-react";

export const Route = createFileRoute("/matangazo")({
  head: () => ({
    meta: [
      { title: "Matangazo — MUMSO" },
      { name: "description", content: "Matangazo na taarifa muhimu kutoka MUMSO." },
    ],
  }),
  component: MatangazoPage,
});

type A = { id: string; title: string; content: string; created_at: string };

function MatangazoPage() {
  const [items, setItems] = useState<A[]>([]);
  useEffect(() => {
    supabase.from("announcements").select("id,title,content,created_at").eq("published", true).order("created_at", { ascending: false }).then(({ data }) => {
      setItems((data ?? []) as A[]);
    });
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="digital-page-hero">
        <h1 className="relative z-10 text-3xl md:text-4xl font-bold flex items-center gap-3">
          <Megaphone className="h-8 w-8" /> Matangazo
        </h1>
        <p className="relative z-10 mt-2 text-primary-foreground/85 text-base md:text-lg">
          Taarifa rasmi na habari mpya kutoka kwa uongozi wa MUMSO.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {items.length === 0 && (
          <p className="md:col-span-2 text-center text-muted-foreground py-12">Hakuna matangazo kwa sasa.</p>
        )}
        {items.map((a, i) => (
          <article
            key={a.id}
            className={`group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)] ${i === 0 ? "md:col-span-2 border-primary/40" : ""}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                {new Date(a.created_at).toLocaleDateString("sw-TZ", { dateStyle: "long" })}
              </span>
              {i === 0 && (
                <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-foreground">
                  Jipya
                </span>
              )}
            </div>
            <h2 className={`mt-3 font-bold text-foreground ${i === 0 ? "text-2xl md:text-3xl" : "text-xl"}`}>{a.title}</h2>
            <p className="mt-3 text-base leading-relaxed text-foreground/85 whitespace-pre-wrap">{a.content}</p>
          </article>
        ))}
      </div>
    </div>
  );
}