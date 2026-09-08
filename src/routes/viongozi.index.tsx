import { createFileRoute } from "@tanstack/react-router";
import { LeaderCard } from "@/components/LeadershipSection";
import { useI18n } from "@/lib/i18n";
import { useLeaders } from "@/lib/use-leaders";

export const Route = createFileRoute("/viongozi/")({
  head: () => ({
    meta: [
      { title: "Uongozi wa MUMSO — Kutana na Viongozi Wetu" },
      { name: "description", content: "Kutana na viongozi wa MUMSO: majina, nafasi zao na neno lao kwa wanafunzi wa Muslim University of Morogoro." },
      { property: "og:title", content: "Uongozi wa MUMSO — Kutana na Viongozi Wetu" },
      { property: "og:description", content: "Viongozi wa MUMSO, nafasi zao na maneno yao kwa wanafunzi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LeadersPage,
});

function LeadersPage() {
  const { leaders, loading } = useLeaders();
  const { t } = useI18n();

  return (
    <div>
      <section className="border-b border-border bg-gradient-to-br from-primary via-primary to-[oklch(0.32_0.11_155)] py-14 text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <span className="inline-block rounded-full bg-accent/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-foreground">
            {t("home.leaders_badge")}
          </span>
          <h1 className="mt-4 text-4xl font-black md:text-5xl">{t("home.leaders")}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-primary-foreground/90 md:text-lg">{t("home.leaders_sub")}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        {loading ? (
          <p className="text-center text-muted-foreground">Inapakia...</p>
        ) : leaders.length === 0 ? (
          <p className="text-center text-muted-foreground">{t("leaders.empty")}</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {leaders.map((l) => <LeaderCard key={l.id} leader={l} />)}
          </div>
        )}
      </section>
    </div>
  );
}
