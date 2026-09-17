import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";

import appCss from "../styles.css?url";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MumAiWidget } from "@/components/MumAiWidget";
import { Toaster } from "@/components/ui/sonner";
import { StatusHost } from "@/lib/status";
import { supabase } from "@/integrations/supabase/client";
import { resolveStorageUrl } from "@/lib/storage-url";
import { LanguageProvider } from "@/lib/i18n";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
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
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const FORM_ONLY_PATHS = ["/misiba", "/mikopo", "/changamoto", "/matokeo"];

function isFormOnlyPath(pathname: string) {
  if (FORM_ONLY_PATHS.includes(pathname)) return true;
  // /huduma/<slug> ni fomu ya idara; /huduma pekee ni orodha
  return /^\/huduma\/[^/]+$/.test(pathname);
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const formOnly = isFormOnlyPath(pathname);
  const isResults = pathname === "/matokeo";

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ThemeInjector />
        <div className="flex min-h-screen flex-col bg-background">
          <RouteLoadingBar />
          <PageLoadingOverlay />
          <MaintenanceGate />
          {formOnly ? (
            <div className="border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
              <div className="mx-auto flex max-w-5xl items-center justify-between">
                <Link
                  to={isResults ? "/fuatilia" : "/huduma"}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm font-semibold text-foreground/80 transition hover:border-primary hover:text-primary"
                >
                  {isResults ? "← Rudi Kufuatilia" : "← Rudi kwa Huduma"}
                </Link>
                <span className="text-sm font-bold uppercase tracking-wide text-primary">MUMSO</span>
              </div>
            </div>
          ) : (
            <Header />
          )}
          <main className="flex-1">
            <RouteFade />
          </main>
          {!formOnly && <Footer />}
          {!formOnly && <MumAiWidget />}
          <Toaster />
          <StatusHost />
        </div>
      </LanguageProvider>
    </QueryClientProvider>
  );
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
        <p className="mt-4 text-sm text-muted-foreground font-medium tracking-wide">Inapakia ukurasa...</p>
      </div>
    </div>
  );
}

function RouteFade() {
  const location = useRouterState({ select: (s) => s.location.pathname });
  return <div key={location} className="page-enter"><Outlet /></div>;
}

function MaintenanceGate() {
  const location = useRouterState({ select: (s) => s.location.pathname });
  const [status, setStatus] = useState<{ enabled: boolean; message: string | null } | null>(null);
  useEffect(() => {
    supabase.from("site_settings")
      .select("system_enabled,maintenance_message").limit(1).maybeSingle()
      .then(({ data }) => setStatus({
        enabled: (data as any)?.system_enabled ?? true,
        message: (data as any)?.maintenance_message ?? null,
      }));
  }, []);
  if (!status || status.enabled) return null;
  if (location.startsWith("/admin") || location.startsWith("/login")) return null;
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-background/95 backdrop-blur-md px-4">
      <div className="max-w-md text-center rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-elegant)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
        </div>
        <h1 className="text-xl font-semibold text-foreground">Mfumo Umefungwa kwa Muda</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {status.message ?? "Huduma za MUMSO zimefungwa kwa muda kwa matengenezo. Tafadhali jaribu tena baadaye."}
        </p>
      </div>
    </div>
  );
}
