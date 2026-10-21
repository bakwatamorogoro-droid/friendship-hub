import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveStorageUrl } from "@/lib/storage-url";
import { GraduationCap } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/mahafa")({
  head: () => ({
    meta: [
      { title: "Mahafali — MUMSO" },
      { name: "description", content: "Taarifa na kumbukumbu za mahafali ya wahitimu wa MUM." },
      { property: "og:title", content: "Mahafali — MUMSO" },
      { property: "og:description", content: "Taarifa na kumbukumbu za mahafali ya wahitimu wa MUM." },
    ],
  }),
  component: MahafaPage,
});

type G = { id: string; title: string; content: string | null; event_date: string | null; image_url: string | null; created_at: string };

function MahafaPage() {
  const { t, locale } = useI18n();
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
    <div className="page-shell page-shell-narrow py-12">
      <div className="digital-page-hero">
        <h1 className="relative z-10 flex items-center gap-3 text-3xl font-black md:text-5xl">
          <GraduationCap className="h-9 w-9" /> {t("grad.title")}
        </h1>
        <p className="relative z-10 mt-3 max-w-3xl text-primary-foreground/90">{t("grad.lead")}</p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {items.length === 0 && (
          <p className="empty-state col-span-full">{t("grad.empty")}</p>
        )}
        {items.map((g) => (
          <article key={g.id} className="surface overflow-hidden surface-hover">
            {g.image_url && (
              <img src={g.image_url} alt={g.title} loading="lazy" className="h-56 w-full object-cover" />
            )}
            <div className="p-6">
              <h2 className="text-xl font-bold tracking-tight text-primary">{g.title}</h2>
              {g.event_date && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("grad.date")}: {new Date(g.event_date).toLocaleDateString(locale, { dateStyle: "long" })}
                </p>
              )}
              {g.content && <p className="mt-3 whitespace-pre-wrap text-foreground/85">{g.content}</p>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
