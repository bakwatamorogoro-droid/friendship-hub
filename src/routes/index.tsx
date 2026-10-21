import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Wallet,
  HeartCrack,
  Megaphone,
  ArrowRight,
  Users,
  CheckCircle2,
  HandHeart,
  Link2 as LinkIcon,
  ExternalLink,
  CalendarDays,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveStorageUrl, useResolvedUrl } from "@/lib/storage-url";
import { useServiceEnabled, useSiteSettings, useOfficialLinks } from "@/lib/use-site-settings";
import { useI18n } from "@/lib/i18n";
import { announcementDate, loadAnnouncements, type Announcement } from "@/lib/announcements";
import { DailyVisitors } from "@/components/DailyVisitors";
import { LeadershipSection } from "@/components/LeadershipSection";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MUMSO — Huduma na Taarifa za Wanafunzi" },
      {
        name: "description",
        content: "Usajili, huduma za wanafunzi, mikopo na matangazo ya MUMSO.",
      },
      { property: "og:title", content: "MUMSO — Huduma na Taarifa za Wanafunzi" },
      {
        property: "og:description",
        content: "Ungana na viongozi wako na pata huduma na taarifa za MUMSO.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const services = [
  {
    to: "/huduma",
    icon: MessageSquare,
    titleKey: "home.service_1_title",
    descKey: "home.service_1_desc",
  },
  { to: "/mikopo", icon: Wallet, titleKey: "home.service_2_title", descKey: "home.service_2_desc" },
  {
    to: "/misiba",
    icon: HeartCrack,
    titleKey: "home.service_3_title",
    descKey: "home.service_3_desc",
  },
  {
    to: "/matangazo",
    icon: Megaphone,
    titleKey: "home.service_4_title",
    descKey: "home.service_4_desc",
  },
] as const;

const PHRASE_KEYS = [
  "home.typewriter_1",
  "home.typewriter_2",
  "home.typewriter_3",
  "home.typewriter_4",
] as const;

function Typewriter() {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const full = t(PHRASE_KEYS[i]);
    const speed = deleting ? 35 : 70;
    const timer = setTimeout(() => {
      if (!deleting) {
        const next = full.slice(0, text.length + 1);
        setText(next);
        if (next === full) setTimeout(() => setDeleting(true), 1600);
      } else {
        const next = full.slice(0, text.length - 1);
        setText(next);
        if (next === "") {
          setDeleting(false);
          setI((p) => (p + 1) % PHRASE_KEYS.length);
        }
      }
    }, speed);
    return () => clearTimeout(timer);
  }, [text, deleting, i, t]);

  return (
    <span className="inline-block min-h-[1.2em]">
      {text}
      <span
        className="ml-1 inline-block h-[0.9em] w-[3px] -mb-1 animate-caret bg-accent"
        aria-hidden
      />
    </span>
  );
}

function Index() {
  const [slide, setSlide] = useState(0);
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const enabled = useServiceEnabled();
  const settings = useSiteSettings();
  const logo = useResolvedUrl(settings?.logo_url);
  const mumLogo = useResolvedUrl(settings?.mum_logo_url);
  const { t } = useI18n();

  useEffect(() => {
    supabase
      .from("hero_images")
      .select("url")
      .order("sort_order", { ascending: true })
      .then(async ({ data }) => {
        const urls = await Promise.all((data ?? []).map((r: any) => resolveStorageUrl(r.url)));
        setHeroImages(urls.filter(Boolean) as string[]);
      });
  }, []);

  useEffect(() => {
    if (heroImages.length < 2) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % heroImages.length), 5000);
    return () => clearInterval(t);
  }, [heroImages.length]);

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-[oklch(0.32_0.11_155)]">
        <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="page-shell relative grid items-center gap-10 py-14 md:py-20 lg:grid-cols-2">
          <div className="text-primary-foreground">
            <span className="mb-4 inline-block rounded-full bg-accent/90 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-accent-foreground shadow-lg backdrop-blur">
              {t("home.welcome")}
            </span>
            <h1 className="text-[2.6rem] font-black leading-[1.04] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              {t("home.hero_1")} <br />
              <span className="text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.35)]">MUMSO</span>
            </h1>
            <div className="mt-4 text-lg md:text-xl font-medium text-primary-foreground/95 max-w-xl min-h-[3rem]">
              <Typewriter />
            </div>
            <p className="mt-4 text-primary-foreground/85 max-w-xl">{t("home.intro")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/huduma">
                <Button size="lg" variant="secondary" className="font-semibold shadow-lg">
                  {t("home.cta_service")} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/mikopo">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-primary-foreground/50 text-primary-foreground hover:bg-primary-foreground hover:text-primary"
                >
                  {t("home.cta_loan")}
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="cine-sheen relative aspect-[4/3] rounded-3xl overflow-hidden border-4 border-white/20 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)]">
              {heroImages.length === 0 && (
                <div className="absolute inset-0 bg-gradient-to-br from-accent/40 to-primary" />
              )}
              {heroImages.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt="MUM Campus"
                  className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-[1400ms] ease-in-out ${
                    i === slide ? `opacity-100 cine-${i % 3}` : "opacity-0"
                  }`}
                />
              ))}
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20 pointer-events-none" />
              <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-red-500 avatar-ring" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-white">
                  MUMSO LIVE
                </span>
              </div>
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                {logo && (
                  <img
                    src={logo}
                    alt="MUMSO"
                    className="h-11 w-11 rounded-xl border-2 border-white/60 bg-white/90 object-contain p-0.5 shadow-lg"
                  />
                )}
                {mumLogo && (
                  <img
                    src={mumLogo}
                    alt="MUM"
                    className="h-11 w-11 rounded-xl border-2 border-white/60 bg-white/90 object-contain p-0.5 shadow-lg"
                  />
                )}
              </div>
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/40 backdrop-blur rounded-full px-3 py-1.5">
              {heroImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  aria-label={`Slide ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${i === slide ? "w-8 bg-white" : "w-3 bg-white/40"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <LoanQuickLink />

      <PresidentBanner />

      <LeadershipSection />

      <section className="page-shell section-y">
        <div className="section-head">
          <h2 className="section-title">{t("home.services")}</h2>
          <p className="section-sub">{t("home.services_sub")}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {services
            .filter((s) => {
              const key = s.to.replace("/", "");
              return enabled[key] !== false;
            })
            .map((s) => (
              <Link
                key={s.to}
                to={s.to}
                className="surface surface-pad surface-hover group flex flex-col"
              >
                <span className="icon-badge">
                  <s.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{t(s.titleKey)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(s.descKey)}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  {t("home.read")}{" "}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
        </div>
      </section>

      <NewsSection />

      <LinksSection />

      <DailyVisitors />
    </div>
  );
}

function LoanQuickLink() {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const path = "/mikopo";
  const copy = async () => {
    const full = typeof window !== "undefined" ? window.location.origin + path : path;
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };
  return (
    <section className="page-shell pt-12">
      <div className="surface surface-pad flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <span className="icon-badge">
            <Wallet className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">
              {t("home.loan_form_title")}
            </h2>
            <p className="mt-1 text-sm md:text-base text-muted-foreground">
              {t("home.loan_form_sub")}
            </p>
            <code className="mt-2 inline-block rounded-md bg-secondary px-2 py-1 text-xs text-foreground/80">
              {path}
            </code>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/mikopo">
            <Button size="lg" className="font-semibold">
              {t("home.loan_open")} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Button size="lg" variant="outline" onClick={copy} className="font-semibold">
            <LinkIcon className="mr-2 h-4 w-4" />{" "}
            {copied ? t("common.copied") : t("common.copy_link")}
          </Button>
        </div>
      </div>
    </section>
  );
}

function PresidentBanner() {
  const s = useSiteSettings();
  const photo = useResolvedUrl(s?.president_photo_url);
  const { t } = useI18n();
  if (!s?.president_name && !s?.president_message) return null;

  return (
    <section className="page-shell pt-14">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary via-primary to-[oklch(0.32_0.11_155)] text-primary-foreground shadow-[var(--shadow-elegant)]">
        <div className="absolute inset-0 opacity-[0.10] bg-[radial-gradient(circle_at_85%_15%,white_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="relative grid gap-8 p-7 md:p-10 md:grid-cols-[220px_1fr] items-center">
          <div className="mx-auto md:mx-0">
            {photo ? (
              <img
                src={photo}
                alt={s?.president_name ?? "Rais wa MUMSO"}
                className="avatar-ring h-44 w-44 rounded-3xl border-4 border-white/25 object-cover shadow-2xl"
              />
            ) : (
              <div className="grid h-44 w-44 place-items-center rounded-3xl border-4 border-white/25 bg-white/10">
                <Users className="h-14 w-14 opacity-80" />
              </div>
            )}
          </div>
          <div>
            <span className="inline-block rounded-full bg-accent/90 text-accent-foreground px-3 py-1 text-xs font-bold uppercase tracking-wider">
              {t("home.president_word")}
            </span>
            <h2 className="mt-4 text-2xl md:text-4xl font-black leading-tight">
              {s?.president_name}
            </h2>
            <p className="mt-1 text-primary-foreground/85 font-medium">
              {s?.president_title ?? t("home.president")}
            </p>
            {s?.president_message && (
              <blockquote className="mt-5 border-l-4 border-accent pl-4 text-base md:text-lg leading-relaxed text-primary-foreground/95 whitespace-pre-wrap">
                “{s.president_message}”
              </blockquote>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function NewsSection() {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<Announcement[]>([]);
  useEffect(() => {
    loadAnnouncements({ publishedOnly: true, limit: 6 }).then(async (rows) => {
      const withImgs = await Promise.all(
        rows.map(async (r) => ({ ...r, image_url: await resolveStorageUrl(r.image_url) })),
      );
      setItems(withImgs);
    });
  }, []);

  return (
    <section className="border-y border-border bg-secondary/40 section-y">
      <div className="page-shell">
        <div className="section-head section-head-row">
          <div>
            <span className="news-badge">
              <Megaphone className="h-3.5 w-3.5" /> {t("news.badge")}
            </span>
            <h2 className="section-title mt-3 flex items-center gap-3">
              <Megaphone className="h-7 w-7 shrink-0 text-primary md:h-8 md:w-8" /> {t("home.news")}
            </h2>
            <p className="section-sub mt-2">{t("home.news_sub")}</p>
          </div>
          <Link to="/matangazo">
            <Button variant="outline" className="font-semibold btn-3d">
              {t("home.news_all")} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        {items.length === 0 ? (
          <p className="empty-state">{t("home.news_empty")}</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((a, i) => (
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
                  {i === 0 && (
                    <span className="news-badge absolute left-3 top-3">{t("home.news_new")}</span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <span className="news-card-date">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {announcementDate(a).toLocaleDateString(locale, { dateStyle: "long" })}
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
        )}
      </div>
    </section>
  );
}

function LinkCard({ l }: { l: any }) {
  const img = useResolvedUrl(l.image_url);
  return (
    <a href={l.url} target="_blank" rel="noreferrer noopener" className="link-card group">
      <div className="link-card-media">
        {img ? (
          <img src={img} alt={l.label} loading="lazy" />
        ) : (
          <div className="grid h-full w-full place-items-center text-primary-foreground">
            <LinkIcon className="h-10 w-10 opacity-90" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
      </div>
      <div className="link-card-body">
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-foreground transition group-hover:text-primary">
            {l.label}
          </p>
          {l.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{l.description}</p>
          )}
        </div>
        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
      </div>
    </a>
  );
}

function LinksSection() {
  const links = useOfficialLinks();
  const { t } = useI18n();
  if (links.length === 0) return null;
  return (
    <section className="page-shell section-y">
      <div className="section-head">
        <h2 className="section-title">{t("home.links")}</h2>
        <p className="section-sub">{t("home.links_sub")}</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l: any) => (
          <LinkCard key={l.id} l={l} />
        ))}
      </div>
    </section>
  );
}
