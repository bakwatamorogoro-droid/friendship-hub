import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { resolveStorageUrl } from "@/lib/storage-url";
import { Megaphone, ArrowRight, CalendarDays } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { announcementDate, loadAnnouncements, type Announcement } from "@/lib/announcements";

export const Route = createFileRoute("/matangazo")({
  head: () => ({
    meta: [
      { title: "Matangazo & Habari — MUMSO" },
      {
        name: "description",
        content: "Matangazo, habari na taarifa rasmi mpya kutoka uongozi wa MUMSO.",
      },
      { property: "og:title", content: "Matangazo & Habari — MUMSO" },
      {
        property: "og:description",
        content: "Matangazo, habari na taarifa rasmi mpya kutoka uongozi wa MUMSO.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MatangazoPage,
});

function MatangazoPage() {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnnouncements({ publishedOnly: true }).then(async (rows) => {
      const withImgs = await Promise.all(
        rows.map(async (r) => ({ ...r, image_url: await resolveStorageUrl(r.image_url) })),
      );
      setItems(withImgs);
      setLoading(false);
    });
  }, []);

  const [lead, ...rest] = items;

  const dateLabel = (a: Announcement) =>
    announcementDate(a).toLocaleDateString(locale, { dateStyle: "long" });

  return (
    <div className="page-shell page-shell-narrow py-12">
      <div className="digital-page-hero">
        <span className="news-badge relative z-10">
          <Megaphone className="h-3.5 w-3.5" /> {t("news.badge")}
        </span>
        <h1 className="relative z-10 mt-4 text-3xl font-black md:text-4xl">{t("news.title")}</h1>
        <p className="relative z-10 mt-2 text-base text-primary-foreground/85 md:text-lg">
          {t("news.lead")}
        </p>
      </div>

      {loading ? (
        <p className="empty-state mt-10">{t("common.loading")}</p>
      ) : items.length === 0 ? (
        <p className="empty-state mt-10">{t("news.empty")}</p>
      ) : (
        <>
          {lead && (
            <Link
              to="/matangazo/$id"
              params={{ id: lead.id }}
              className="news-hero group mt-10"
              aria-label={lead.title}
            >
              <div className="news-hero-media">
                {lead.image_url ? (
                  <img src={lead.image_url} alt={lead.title} loading="lazy" />
                ) : (
                  <div className="grid h-full w-full place-items-center">
                    <Megaphone className="h-16 w-16 text-primary-foreground/80" />
                  </div>
                )}
                <span className="news-badge absolute left-4 top-4">{t("home.news_new")}</span>
              </div>
              <div className="news-hero-body">
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <CalendarDays className="h-4 w-4" /> {dateLabel(lead)}
                </span>
                <h2 className="news-hero-title transition-colors group-hover:text-primary">
                  {lead.title}
                </h2>
                <p className="line-clamp-4 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground md:text-base">
                  {lead.excerpt || lead.content}
                </p>
                <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-primary">
                  {t("common.read_more")}{" "}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          )}

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((a) => (
              <Link
                key={a.id}
                to="/matangazo/$id"
                params={{ id: a.id }}
                className="news-card group"
                aria-label={a.title}
              >
                <div className="news-card-media">
                  {a.image_url ? (
                    <img src={a.image_url} alt={a.title} loading="lazy" />
                  ) : (
                    <div className="grid h-full w-full place-items-center">
                      <Megaphone className="h-12 w-12 text-primary-foreground/80" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <span className="news-card-date">
                      <CalendarDays className="h-3.5 w-3.5" /> {dateLabel(a)}
                    </span>
                  </div>
                </div>
                <div className="news-card-body">
                  <h3 className="news-card-title">{a.title}</h3>
                  <p className="news-card-excerpt">{a.excerpt || a.content}</p>
                  <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-bold text-primary">
                    {t("home.read")}{" "}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
