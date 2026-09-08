import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Wallet, HeartCrack, Megaphone, ArrowRight, Users, CheckCircle2, HandHeart, Link2 as LinkIcon, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveStorageUrl, useResolvedUrl } from "@/lib/storage-url";
import { useServiceEnabled, useSiteSettings, useOfficialLinks } from "@/lib/use-site-settings";
import { useI18n } from "@/lib/i18n";
import { LeadershipSection } from "@/components/LeadershipSection";


export const Route = createFileRoute("/")({
  component: Index,
});

const services = [
  { to: "/huduma", icon: MessageSquare, title: "Huduma za Wanafunzi", desc: "Tuma huduma za kitaaluma, kifedha, afya na ushauri." },
  { to: "/mikopo", icon: Wallet, title: "Huduma ya Mikopo", desc: "Ripoti matatizo ya disbursement, allocation, appeal na zaidi." },
  { to: "/misiba", icon: HeartCrack, title: "Taarifa za Misiba", desc: "Toa taarifa ya msiba na pokea pole kutoka kwa wanafunzi wenzio." },
  { to: "/matangazo", icon: Megaphone, title: "Matangazo", desc: "Pata taarifa muhimu na matangazo ya MUMSO." },
] as const;

const phrases = [
  "Sauti ya Mwanafunzi, Suluhisho la Pamoja.",
  "Karibu MUMSO — Tuma Huduma Yako.",
  "Fuatilia Mikopo Yako Kwa Wakati.",
  "Pata Matangazo Mapya Moja Kwa Moja.",
];

function Typewriter() {
  const [i, setI] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const full = phrases[i];
    const speed = deleting ? 35 : 70;
    const t = setTimeout(() => {
      if (!deleting) {
        const next = full.slice(0, text.length + 1);
        setText(next);
        if (next === full) setTimeout(() => setDeleting(true), 1600);
      } else {
        const next = full.slice(0, text.length - 1);
        setText(next);
        if (next === "") {
          setDeleting(false);
          setI((p) => (p + 1) % phrases.length);
        }
      }
    }, speed);
    return () => clearTimeout(t);
  }, [text, deleting, i]);

  return (
    <span className="inline-block min-h-[1.2em]">
      {text}
      <span className="ml-1 inline-block w-[3px] h-[0.9em] -mb-1 bg-accent animate-caret" aria-hidden />
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
    supabase.from("hero_images").select("url").order("sort_order", { ascending: true })
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
        <div className="relative mx-auto max-w-7xl px-4 py-12 md:py-20 grid gap-10 lg:grid-cols-2 items-center">
          <div className="text-primary-foreground">
            <span className="inline-block rounded-full bg-accent/90 text-accent-foreground px-3 py-1 text-xs font-semibold mb-4 backdrop-blur">
              Karibu MUMSO
            </span>
            <h1 className="text-5xl md:text-7xl font-black leading-[1.05] tracking-tight">
              Karibu <br/>
              <span className="text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.35)]">MUMSO</span>
            </h1>
            <div className="mt-4 text-lg md:text-xl font-medium text-primary-foreground/95 max-w-xl min-h-[3rem]">
              <Typewriter />
            </div>
            <p className="mt-4 text-primary-foreground/85 max-w-xl">
              Mfumo rasmi wa MUMSO unaokuunganisha na viongozi wako — tuma huduma, fuatilia mikopo, na pata habari kwa wakati.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/huduma">
                <Button size="lg" variant="secondary" className="font-semibold shadow-lg">
                  Tuma Huduma <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/mikopo">
                <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground/50 text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                  Ripoti Tatizo la Mkopo
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
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1400ms] ease-in-out ${
                    i === slide ? `opacity-100 cine-${i % 3}` : "opacity-0"
                  }`}
                />
              ))}
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20 pointer-events-none" />
              <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-red-500 avatar-ring" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-white">MUMSO LIVE</span>
              </div>
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                {logo && <img src={logo} alt="MUMSO" className="h-11 w-11 rounded-xl border-2 border-white/60 bg-white/90 object-contain p-0.5 shadow-lg" />}
                {mumLogo && <img src={mumLogo} alt="MUM" className="h-11 w-11 rounded-xl border-2 border-white/60 bg-white/90 object-contain p-0.5 shadow-lg" />}
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


      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">{t("home.services")}</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto text-base md:text-lg">
            {t("home.services_sub")}
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {services.filter((s) => {
            const key = s.to.replace("/", "");
            return enabled[key] !== false;
          }).map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="group rounded-xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)]"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition">
                <s.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                {t("home.read")} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <NewsSection />

      <LinksSection />



      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Users, value: "5,000+", label: "Wanafunzi wanaotumia mfumo" },
            { icon: CheckCircle2, value: "1,200+", label: "Mikopo iliyoshughulikiwa" },
            { icon: Megaphone, value: "120+", label: "Matangazo" },
            { icon: HandHeart, value: "350+", label: "Huduma zinazoendelea" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elegant)] transition">
              <span className="h-12 w-12 grid place-items-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-6 w-6" />
              </span>
              <div>
                <div className="text-2xl font-bold text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function LoanQuickLink() {
  const [copied, setCopied] = useState(false);
  const path = "/mikopo";
  const copy = async () => {
    const full = typeof window !== "undefined" ? window.location.origin + path : path;
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };
  return (
    <section className="mx-auto max-w-7xl px-4 pt-12">
      <div className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-[var(--shadow-card)] flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Wallet className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Fomu ya Mkopo (HESLB)</h2>
            <p className="mt-1 text-sm md:text-base text-muted-foreground">
              Kiungo cha ndani cha fomu ya mkopo — bofya kufungua au nakili kiungo kushirikisha wanafunzi wenzio.
            </p>
            <code className="mt-2 inline-block rounded-md bg-secondary px-2 py-1 text-xs text-foreground/80">{path}</code>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/mikopo">
            <Button size="lg" className="font-semibold">
              Fungua Fomu ya Mkopo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Button size="lg" variant="outline" onClick={copy} className="font-semibold">
            <LinkIcon className="mr-2 h-4 w-4" /> {copied ? "Imenakiliwa!" : "Nakili Kiungo"}
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
    <section className="mx-auto max-w-7xl px-4 pt-14">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary via-primary to-[oklch(0.32_0.11_155)] text-primary-foreground shadow-[var(--shadow-elegant)]">
        <div className="absolute inset-0 opacity-[0.10] bg-[radial-gradient(circle_at_85%_15%,white_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="relative grid gap-8 p-7 md:p-10 md:grid-cols-[220px_1fr] items-center">
          <div className="mx-auto md:mx-0">
            {photo ? (
              <img src={photo} alt={s?.president_name ?? "Rais wa MUMSO"}
                className="avatar-ring h-44 w-44 rounded-3xl border-4 border-white/25 object-cover shadow-2xl" />
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
            <h2 className="mt-4 text-2xl md:text-4xl font-black leading-tight">{s?.president_name}</h2>
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

type NewsItem = { id: string; title: string; content: string; created_at: string };

function NewsSection() {
  const { t, lang } = useI18n();
  const [items, setItems] = useState<NewsItem[]>([]);
  useEffect(() => {
    supabase.from("announcements")
      .select("id,title,content,created_at")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => setItems((data ?? []) as NewsItem[]));
  }, []);

  return (
    <section className="bg-secondary/40 border-y border-border py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground flex items-center gap-3">
              <Megaphone className="h-8 w-8 text-primary" /> {t("home.news")}
            </h2>
            <p className="mt-2 text-muted-foreground text-base md:text-lg">{t("home.news_sub")}</p>
          </div>
          <Link to="/matangazo">
            <Button variant="outline" className="font-semibold">
              {t("home.news_all")} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        {items.length === 0 ? (
          <p className="text-muted-foreground">{t("home.news_empty")}</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((a, i) => (
              <Link
                key={a.id}
                to="/matangazo"
                className={`group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)] ${i === 0 ? "lg:col-span-2 lg:flex-row lg:gap-6" : ""}`}
              >
                <div className="flex-1">
                  <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                    {new Date(a.created_at).toLocaleDateString(lang === "sw" ? "sw-TZ" : "en-GB", { dateStyle: "long" })}
                  </span>
                  <h3 className="mt-3 text-xl font-bold text-foreground group-hover:text-primary transition">{a.title}</h3>
                  <p className="mt-2 text-base text-muted-foreground line-clamp-3 whitespace-pre-wrap">{a.content}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    {t("home.read")} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
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

function LinksSection() {
  const links = useOfficialLinks();
  const { t } = useI18n();
  if (links.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">{t("home.links")}</h2>
        <p className="mt-2 text-muted-foreground text-base md:text-lg">{t("home.links_sub")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l) => (
          <a
            key={l.id}
            href={l.url}
            target="_blank"
            rel="noreferrer noopener"
            className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-primary hover:shadow-[var(--shadow-elegant)]"
          >
            <span className="flex items-center gap-3 min-w-0">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition">
                <LinkIcon className="h-5 w-5" />
              </span>
              <span className="truncate text-base font-semibold text-foreground group-hover:text-primary transition">{l.label}</span>
            </span>
            <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
          </a>
        ))}
      </div>
    </section>
  );
}
