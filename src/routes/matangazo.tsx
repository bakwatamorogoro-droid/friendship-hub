import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveStorageUrl } from "@/lib/storage-url";
import { Megaphone, ArrowRight, CalendarDays } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/matangazo")({
  head: () => ({
    meta: [
      { title: "Matangazo & Habari — MUMSO" },
      { name: "description", content: "Matangazo, habari na taarifa rasmi mpya kutoka uongozi wa MUMSO." },
      { property: "og:title", content: "Matangazo & Habari — MUMSO" },
      { property: "og:description", content: "Matangazo, habari na taarifa rasmi mpya kutoka uongozi wa MUMSO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MatangazoPage,
});

type A = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  image_url: string | null;
  excerpt: string | null;
};

function MatangazoPage() {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<A[]>([]);

  useEffect(() => {
    (supabase.from("announcements") as any)
      .select("id,title,content,created_at,image_url,excerpt")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .then(async ({ data }: any) => {
        const rows = (data ?? []) as A[];
        const withImgs = await Promise.all(
          rows.map(async (r) => ({ ...r, image_url: await resolveStorageUrl(r.image_url) })),
        );
        setItems(withImgs);
      });
  }, []);

  return (
    <div className="page-shell page-shell-narrow py-12">
      <div className="digital-page-hero">
        <h1 className="relative z-10 flex items-center gap-3 text-3xl font-black md:text-4xl">
          <Megaphone className="h-8 w-8" /> {t("news.title")}
        </h1>
        <p className="relative z-10 mt-2 text-base text-primary-foreground/85 md:text-lg">{t("news.lead")}</p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 && (
          <p className="empty-state col-span-full">{t("news.empty")}</p>
        )}
        {items.map((a, i) => (
          <Link
            key={a.id}
            to="/matangazo/$id"
            params={{ id: a.id }}
            className={`group digital-card flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)] ${i === 0 ? "sm:col-span-2" : ""}`}
          >
            <div className="relative mx-auto grid aspect-square w-full max-w-[300px] place-items-center overflow-hidden bg-secondary/40 p-2">
              {a.image_url ? (
                <img
                  src={a.image_url}
                  alt={a.title}
                  loading="lazy"
                  width={300}
                  height={300}
                  className="max-h-[300px] max-w-[300px] h-full w-full object-contain transition duration-700 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary to-accent/60 text-primary-foreground">
                  <Megaphone className="h-12 w-12 opacity-80" />
                </div>
              )}
              {i === 0 && (
                <span className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-foreground">
                  {t("home.news_new")}
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col p-5">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                <CalendarDays className="h-3.5 w-3.5" />
                {new Date(a.created_at).toLocaleDateString(locale, { dateStyle: "long" })}
              </span>
              <h2 className={`mt-2 font-bold text-foreground group-hover:text-primary transition ${i === 0 ? "text-2xl" : "text-lg"}`}>
                {a.title}
              </h2>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground whitespace-pre-wrap">
                {a.excerpt || a.content}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                {t("home.read")} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
