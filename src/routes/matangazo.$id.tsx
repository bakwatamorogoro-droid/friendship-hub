import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveStorageUrl } from "@/lib/storage-url";
import { ArrowLeft, CalendarDays, Megaphone } from "lucide-react";

export const Route = createFileRoute("/matangazo/$id")({
  head: () => ({
    meta: [
      { title: "Tangazo — MUMSO" },
      { name: "description", content: "Soma tangazo rasmi la MUMSO kwa ukamilifu." },
      { property: "og:title", content: "Tangazo — MUMSO" },
      { property: "og:description", content: "Soma tangazo rasmi la MUMSO kwa ukamilifu." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnnouncementPage,
});

type A = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  image_url: string | null;
};

function AnnouncementPage() {
  const { id } = Route.useParams();
  const [a, setA] = useState<A | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (supabase.from("announcements") as any)
      .select("id,title,content,created_at,image_url")
      .eq("id", id)
      .eq("published", true)
      .maybeSingle()
      .then(async ({ data }: any) => {
        if (data) setA({ ...data, image_url: await resolveStorageUrl(data.image_url) });
        setLoading(false);
      });
  }, [id]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link to="/matangazo" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> Matangazo yote
      </Link>

      {loading ? (
        <p className="mt-10 text-muted-foreground">Inapakia...</p>
      ) : !a ? (
        <p className="mt-10 text-muted-foreground">Tangazo hili halipo au limefichwa.</p>
      ) : (
        <article className="mt-6">
          <div className="panel-3d overflow-hidden rounded-3xl border border-border bg-card">
            {a.image_url ? (
              <img src={a.image_url} alt={a.title} className="max-h-[520px] w-full object-cover" />
            ) : (
              <div className="grid h-56 w-full place-items-center bg-gradient-to-br from-primary to-accent/60 text-primary-foreground">
                <Megaphone className="h-14 w-14 opacity-80" />
              </div>
            )}
            <div className="p-6 md:p-9">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                <CalendarDays className="h-3.5 w-3.5" />
                {new Date(a.created_at).toLocaleDateString("sw-TZ", { dateStyle: "long" })}
              </span>
              <h1 className="mt-4 text-3xl md:text-4xl font-black leading-tight text-foreground">{a.title}</h1>
              <div className="mt-6 whitespace-pre-wrap text-base md:text-lg leading-relaxed text-foreground/90">
                {a.content}
              </div>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}
