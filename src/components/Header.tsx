import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, GraduationCap, Languages } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useResolvedUrl } from "@/lib/storage-url";
import { useSiteSettings } from "@/lib/use-site-settings";
import { AnnouncementsTicker } from "@/components/AnnouncementsTicker";
import { useI18n } from "@/lib/i18n";

const nav = [
  { to: "/", key: "nav.home" },
  { to: "/about", key: "nav.about" },
  { to: "/viongozi", key: "nav.leaders" },
  { to: "/huduma", key: "nav.services" },
  { to: "/mikopo", key: "nav.loans" },
  { to: "/misiba", key: "nav.deaths" },
  { to: "/matangazo", key: "nav.news" },
  { to: "/mahafa", key: "nav.grad" },
  { to: "/fuatilia", key: "nav.track" },
  { to: "/jisajili", key: "nav.register" },
] as const;



function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-full border border-border bg-secondary p-0.5 ${className}`}
      role="group"
      aria-label={t("nav.language")}
    >
      <Languages className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      {(["sw", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase transition ${
            lang === code
              ? "bg-primary text-primary-foreground"
              : "text-foreground/70 hover:text-primary"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const settings = useSiteSettings();
  const logoUrl = useResolvedUrl(settings?.logo_url);
  const mumLogoUrl = useResolvedUrl(settings?.mum_logo_url);
  const { t } = useI18n();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="page-shell py-2">
        <div className="brand-strip flex items-center justify-between gap-3 py-2 md:gap-8">
          {settings?.logo_url ? (
            <img src={logoUrl ?? settings.logo_url} alt="MUMSO" className="h-14 w-14 md:h-20 md:w-20 shrink-0 rounded-xl object-contain bg-background p-1 shadow-sm" />
          ) : (
            <span className="flex h-14 w-14 md:h-20 md:w-20 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="h-7 w-7" />
            </span>
          )}
          <Link to="/" className="flex-1 text-center font-bold text-primary uppercase tracking-wide leading-tight text-[13px] sm:text-base md:text-xl">
            {t("site.org_line1")}<br className="hidden sm:block" />
            <span className="sm:hidden"> </span>{t("site.org_line2")}
          </Link>
          {settings?.mum_logo_url ? (
            <img src={mumLogoUrl ?? settings.mum_logo_url} alt="MUM" className="h-14 w-14 md:h-20 md:w-20 shrink-0 rounded-xl object-contain bg-background p-1 border border-border shadow-sm" />
          ) : (
            <span className="flex h-14 w-14 md:h-20 md:w-20 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground border border-border">
              <GraduationCap className="h-7 w-7" />
            </span>
          )}
        </div>

        <div className="hidden lg:grid grid-cols-[auto_1fr_auto] items-center gap-4 pt-2">
          <Link to="/" className="text-base font-bold text-primary tracking-wide">
            <span className="inline-flex items-center gap-2">
              <GraduationCap className="h-5 w-5" /> MUMSO
            </span>
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-1">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="nav-link"
                activeProps={{ className: "nav-link nav-link-active" }}
                activeOptions={{ exact: n.to === "/" }}
              >
                {t(n.key)}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 justify-end">
            <LangToggle />
          </div>

        </div>


        <div className="lg:hidden flex items-center justify-between pt-2">
          <Link to="/" className="font-bold text-primary text-base">MUMSO</Link>
          <div className="flex items-center gap-2">
            <LangToggle />
            <button className="rounded-lg p-2 transition hover:bg-secondary" onClick={() => setOpen(!open)} aria-label={t("nav.menu")} aria-expanded={open}>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
      {open && (
        <div className="mobile-drawer lg:hidden border-t border-border bg-background px-4 py-3 space-y-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className="nav-link nav-link-block"
              activeProps={{ className: "nav-link nav-link-block nav-link-active" }}
              activeOptions={{ exact: n.to === "/" }}
            >
              {t(n.key)}
            </Link>
          ))}
          {userId && (
            <Link to="/admin" onClick={() => setOpen(false)} className="block pt-2">
              <Button className="w-full" size="sm">{t("nav.dashboard")}</Button>
            </Link>
          )}

        </div>
      )}
      <AnnouncementsTicker />
    </header>
  );
}
