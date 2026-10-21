import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";

import appCss from "../styles.css?url";
import { VisitorTracker } from "@/components/DailyVisitors";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MumAiWidget } from "@/components/MumAiWidget";
import { useServiceEnabled } from "@/lib/use-site-settings";
import { Toaster } from "@/components/ui/sonner";
import { StatusHost } from "@/lib/status";
import { supabase } from "@/integrations/supabase/client";
import { resolveStorageUrl } from "@/lib/storage-url";
import { LanguageProvider, useI18n } from "@/lib/i18n";

function NotFoundComponent() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="surface surface-pad max-w-md text-center">
        <h1 className="text-7xl font-black tracking-tight text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("common.page_not_found")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("common.page_not_found_sub")}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("common.go_home")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  const { t } = useI18n();
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="surface surface-pad max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("common.page_failed")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("common.page_failed_sub")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("common.try_again")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("common.go_home")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MUMSO — Mfumo wa Wanafunzi" },
      { name: "description", content: "Tovuti rasmi ya MUMSO: huduma za wanafunzi, mikopo, misiba na matangazo." },
      { name: "author", content: "MUMSO" },
      { property: "og:title", content: "MUMSO — Mfumo wa Wanafunzi" },
      { property: "og:description", content: "Huduma za wanafunzi, mikopo, misiba na matangazo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <LanguageProvider>{children}</LanguageProvider>
        <Scripts />
      </body>
    </html>
  );
}

const FORM_ONLY_PATHS = ["/misiba", "/mikopo", "/changamoto", "/matokeo", "/jisajili", "/jisajili-kiongozi", "/fuatilia", "/login"];

function isFormOnlyPath(pathname: string) {
  if (FORM_ONLY_PATHS.includes(pathname)) return true;
  // /huduma/<slug> ni fomu ya idara; /huduma pekee ni orodha
  return /^\/huduma\/[^/]+$/.test(pathname);
}

function RootComponent() {
  const { t } = useI18n();
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const formOnly = isFormOnlyPath(pathname);
  const isResults = pathname === "/matokeo";
  const management = pathname === "/admin";

  return (
    <QueryClientProvider client={queryClient}>
      <>
        <ThemeInjector />
        <VisitorTracker />
        <div className={`flex min-h-screen flex-col bg-background ${formOnly ? "service-form-page" : ""}`}>
          <RouteLoadingBar />
          <PageLoadingOverlay />
          <MaintenanceGate />
          {management ? null : formOnly ? (
            <div className="border-b border-border bg-background/85 py-3 backdrop-blur-xl">
              <div className="page-shell page-shell-narrow flex items-center justify-between">
                <Link
                  to={isResults ? "/fuatilia" : pathname === "/jisajili" || pathname === "/login" ? "/" : "/huduma"}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3.5 py-1.5 text-sm font-semibold text-foreground/80 transition hover:-translate-x-0.5 hover:border-primary hover:text-primary"
                >
                  {isResults ? `← ${t("results.back_track")}` : `← ${t("common.back_services")}`}
                </Link>
                <span className="text-sm font-bold uppercase tracking-[0.14em] text-primary">MUMSO</span>
              </div>
            </div>
          ) : (
            <Header />
          )}
          <main className="flex-1">
            <RouteFade />
          </main>
          {!formOnly && !management && <Footer />}
          {!formOnly && !management && <AiWidgetGate />}
          <Toaster />
          <StatusHost />
        </div>
      </>
    </QueryClientProvider>
  );
}

function AiWidgetGate() {
  const services = useServiceEnabled();
  if (services["ai"] === false) return null;
  return <MumAiWidget />;
}

function ThemeInjector() {
  useEffect(() => {
    let mounted = true;
    const set = (value: string | null, name: string) => {
      const root = document.documentElement;
      if (value) root.style.setProperty(name, value);
      else root.style.removeProperty(name);
    };
    (supabase.from("site_settings") as any)
      .select("theme_primary,theme_accent,theme_background,logo_url").limit(1).maybeSingle()
      .then(async ({ data }: any) => {
        if (!mounted || !data) return;
        set(data.theme_primary ?? null, "--primary");
        set(data.theme_accent ?? null, "--accent");
        set(data.theme_background ?? null, "--background");
        if (data.logo_url) {
          const href = await resolveStorageUrl(data.logo_url);
          if (!mounted || !href) return;
          let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
          if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            document.head.appendChild(link);
          }
          link.href = href;
        }
      });
    return () => { mounted = false; };
  }, []);
  return null;
}

function RouteLoadingBar() {
  const isLoading = useRouterState({ select: (s) => s.status === "pending" || s.isLoading });
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !isLoading) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1 overflow-hidden">
      <div className="h-full w-1/3 animate-[routeloader_1.1s_ease-in-out_infinite] bg-gradient-to-r from-primary via-accent to-primary shadow-[0_0_12px_hsl(var(--primary))]" />
    </div>
  );
}

function PageLoadingOverlay() {
  const { t } = useI18n();
  const isPending = useRouterState({ select: (s) => s.status === "pending" });
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!isPending) { setVisible(false); return; }
    const t = setTimeout(() => setVisible(true), 120);
    return () => clearTimeout(t);
  }, [isPending]);
  if (!visible) return null;
  return (
    <div className="page-loader-overlay">
      <div className="flex flex-col items-center">
        <div className="page-loader-ring" />
        <div className="page-loader-dots"><span /><span /><span /></div>
        <p className="mt-4 text-sm font-medium tracking-wide text-muted-foreground">{t("common.loading_page")}</p>
      </div>
    </div>
  );
}

function RouteFade() {
  const location = useRouterState({ select: (s) => s.location.pathname });
  return <div key={location} className="page-enter"><Outlet /></div>;
}

function MaintenanceGate() {
  const { t, locale } = useI18n();
  const location = useRouterState({ select: (s) => s.location.pathname });
  const [now, setNow] = useState(() => Date.now());
  const [status, setStatus] = useState<{
    enabled: boolean;
    message: string | null;
    endsAt: string | null;
  } | null>(null);
  useEffect(() => {
    supabase.from("site_settings")
      .select("system_enabled,maintenance_message,maintenance_ends_at").limit(1).maybeSingle()
      .then(({ data }) => setStatus({
        enabled: (data as any)?.system_enabled ?? true,
        message: (data as any)?.maintenance_message ?? null,
        endsAt: (data as any)?.maintenance_ends_at ?? null,
      }));
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (!status || status.enabled) return null;
  if (location.startsWith("/admin") || location.startsWith("/login")) return null;
  const endTime = status.endsAt ? new Date(status.endsAt).getTime() : null;
  const remaining = endTime ? Math.max(0, endTime - now) : null;
  const days = remaining === null ? "--" : Math.floor(remaining / 86_400_000);
  const hours = remaining === null ? "--" : Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = remaining === null ? "--" : Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = remaining === null ? "--" : Math.floor((remaining % 60_000) / 1000);
  const currentDate = new Intl.DateTimeFormat(locale, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(now);
  const currentTime = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    timeZone: "Africa/Dar_es_Salaam",
  }).format(now);
  return (
    <div className="maintenance-screen fixed inset-0 z-[95] flex items-center justify-center overflow-hidden bg-background px-4 py-8">
      <div className="maintenance-wave maintenance-wave-one" aria-hidden="true" />
      <div className="maintenance-wave maintenance-wave-two" aria-hidden="true" />
      <div className="maintenance-wave maintenance-wave-three" aria-hidden="true" />
      <main className="maintenance-panel relative z-10 w-full max-w-2xl text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
        </div>
        <p className="text-xs font-semibold uppercase text-primary">{t("maint.notice")}</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">{t("maint.title")}</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground md:text-base">
          {status.message ?? t("maint.default")}
        </p>
        <div className="mt-7 grid grid-cols-4 gap-2 md:gap-3" aria-label={t("maint.remaining")}>
          {[
            [days, t("maint.days")], [hours, t("maint.hours")], [minutes, t("maint.minutes")], [seconds, t("maint.seconds")],
          ].map(([value, label]) => (
            <div key={label} className="maintenance-time-block">
              <strong className="block text-2xl font-bold text-foreground md:text-4xl">{value}</strong>
              <span className="mt-1 block text-[10px] font-semibold uppercase text-muted-foreground md:text-xs">{label}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 border-t border-border/70 pt-5">
          <p className="text-sm font-semibold capitalize text-foreground">{currentDate}</p>
          <p className="mt-1 font-mono text-xl font-bold text-primary">{currentTime} EAT</p>
          {endTime && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("maint.reopen")} {new Date(endTime).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Dar_es_Salaam" })}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
