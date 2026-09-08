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
] as const;



function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "sw" ? "en" : "sw")}
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-sm font-semibold text-foreground/80 transition hover:border-primary hover:text-primary ${className}`}
      aria-label="Language"
    >
      <Languages className="h-4 w-4" />
      {lang === "sw" ? "SW" : "EN"}
    </button>
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
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-2">
        <div className="flex items-center justify-between gap-3 md:gap-8 py-2 border-b border-border/60">
          {settings?.logo_url ? (
            <img src={logoUrl ?? settings.logo_url} alt="MUMSO" className="h-14 w-14 md:h-20 md:w-20 shrink-0 rounded-xl object-contain bg-background p-1 shadow-sm" />
          ) : (
            <span className="flex h-14 w-14 md:h-20 md:w-20 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="h-7 w-7" />
            </span>
          )}
          <Link to="/" className="flex-1 text-center font-bold text-primary uppercase tracking-wide leading-tight text-[13px] sm:text-base md:text-xl">
            MUSLIM UNIVERSITY OF MOROGORO<br className="hidden sm:block" />
            <span className="sm:hidden"> </span>STUDENTS ORGANIZATION
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
          <nav className="flex items-center justify-center gap-1">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-lg px-3 py-2 text-base font-medium text-foreground/80 transition hover:text-primary"
                activeProps={{ className: "rounded-lg px-3 py-2 text-base font-semibold bg-accent/60 text-primary" }}
                activeOptions={{ exact: n.to === "/" }}
              >
                {t(n.key)}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 justify-end">
            <LangToggle />
            {userId ? (
              <Link to="/admin"><Button size="sm">{t("nav.dashboard")}</Button></Link>
            ) : (
              <Link to="/login"><Button size="sm">{t("nav.login")}</Button></Link>
            )}
          </div>
        </div>


        <div className="lg:hidden flex items-center justify-between pt-2">
          <Link to="/" className="font-bold text-primary text-base">MUMSO</Link>
          <div className="flex items-center gap-2">
            <LangToggle />
            <button className="p-2" onClick={() => setOpen(!open)} aria-label="Menu">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
      {open && (
        <div className="lg:hidden border-t border-border bg-background px-4 py-3 space-y-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 text-base font-medium hover:bg-secondary"
              activeProps={{ className: "block rounded-md px-3 py-2 text-base font-semibold bg-accent/60 text-primary" }}
              activeOptions={{ exact: n.to === "/" }}
            >
              {t(n.key)}
            </Link>
          ))}
          <Link to={userId ? "/admin" : "/login"} onClick={() => setOpen(false)} className="block">
            <Button className="w-full" size="sm">{userId ? t("nav.dashboard") : t("nav.login")}</Button>
          </Link>
        </div>
      )}
      <AnnouncementsTicker />
    </header>
  );
}
