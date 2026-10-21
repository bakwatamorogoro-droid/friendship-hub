import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { resolveStorageUrl } from "@/lib/storage-url";
import { ArrowLeft, CalendarDays, FileText, Megaphone, Share2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  announcementDate,
  isImage,
  loadAnnouncement,
  type Announcement,
} from "@/lib/announcements";

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

function AnnouncementPage() {
  const { t, locale } = useI18n();
  const { id } = Route.useParams();
  const [a, setA] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadAnnouncement(id).then(async (row) => {
      if (row) {
        setA({
          ...row,
          image_url: await resolveStorageUrl(row.image_url),
          attachment_url: await resolveStorageUrl(row.attachment_url),
        });
      }
      setLoading(false);
    });
  }, [id]);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard inaweza kuwa imezuiwa. */
    }
  };

  // Picha inaweza kuwa kwenye `image_url` au kama kiambatisho cha picha.
  const heroImage =
    a?.image_url ?? (isImage(a?.attachment_name ?? a?.attachment_url) ? a?.attachment_url : null);
  const pdf =
    a?.attachment_url && !isImage(a.attachment_name ?? a.attachment_url) ? a.attachment_url : null;

  return (
    <div className="page-shell page-shell-narrow py-10">
      <Link
        to="/matangazo"
        className="inline-flex items-center gap-2 text-sm font-bold text-primary transition hover:-translate-x-0.5"
      >
        <ArrowLeft className="h-4 w-4" /> {t("news.title")}
      </Link>

      {loading ? (
        <p className="empty-state mt-8">{t("common.loading")}</p>
      ) : !a ? (
        <p className="empty-state mt-8">{t("news.not_found")}</p>
      ) : (
        <article className="news-article mt-6">
          {heroImage ? (
            <div className="news-article-media">
              <img src={heroImage} alt={a.title} />
            </div>
          ) : (
            <div className="news-article-media grid h-52 place-items-center">
              <Megaphone className="h-16 w-16 text-primary-foreground/80" />
            </div>
          )}

          <div className="news-article-body">
            <div className="flex flex-wrap items-center gap-3">
              <span className="news-badge">
                <Megaphone className="h-3.5 w-3.5" /> {t("news.badge")}
              </span>
              <span className="news-meta">
                <span className="inline-flex items-center gap-1.5 text-primary">
                  <CalendarDays className="h-4 w-4" />
                  {t("news.published_on")}:{" "}
                  {announcementDate(a).toLocaleDateString(locale, { dateStyle: "long" })}
                </span>
              </span>
              <button
                type="button"
                onClick={share}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-bold text-foreground/80 transition hover:border-primary hover:text-primary"
              >
                <Share2 className="h-3.5 w-3.5" />
                {copied ? t("common.copied") : t("common.copy_link")}
              </button>
            </div>

            <h1 className="mt-5 text-3xl leading-tight font-black text-foreground md:text-4xl">
              {a.title}
            </h1>

            {a.excerpt && (
              <p className="mt-4 border-l-4 border-primary/50 pl-4 text-base font-medium text-muted-foreground italic md:text-lg">
                {a.excerpt}
              </p>
            )}

            <div className="news-prose mt-6">{a.content}</div>

            {pdf && (
              <a
                href={pdf}
                target="_blank"
                rel="noreferrer noopener"
                className="news-attachment mt-8"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <FileText className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-foreground">
                    {a.attachment_name || t("news.attachment")}
                  </span>
                  <span className="block text-xs text-muted-foreground">{t("news.open_pdf")}</span>
                </span>
              </a>
            )}
          </div>
        </article>
      )}
    </div>
  );
}
