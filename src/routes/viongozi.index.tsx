import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Users, UserPlus } from "lucide-react";
import { LeaderCard } from "@/components/LeadershipSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { useLeaders } from "@/lib/use-leaders";

export const Route = createFileRoute("/viongozi/")({
  head: () => ({
    meta: [
      { title: "Uongozi wa MUMSO — Kutana na Viongozi Wetu" },
      {
        name: "description",
        content:
          "Kutana na viongozi wa MUMSO: majina, nafasi zao na neno lao kwa wanafunzi wa Muslim University of Morogoro.",
      },
      { property: "og:title", content: "Uongozi wa MUMSO — Kutana na Viongozi Wetu" },
      {
        property: "og:description",
        content: "Viongozi wa MUMSO, nafasi zao na maneno yao kwa wanafunzi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LeadersPage,
});

function LeadersPage() {
  const { leaders, loading } = useLeaders();
  const { t } = useI18n();
  const [q, setQ] = useState("");

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return leaders;
    return leaders.filter((l) =>
      `${l.full_name} ${l.position} ${l.short_message ?? ""}`.toLowerCase().includes(s),
    );
  }, [leaders, q]);

  return (
    <div>
      <section className="leader-profile-hero">
        <div className="page-shell relative z-10 py-14 text-center">
          <span className="inline-block rounded-full bg-accent/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-foreground">
            {t("home.leaders_badge")}
          </span>
          <h1 className="mt-4 text-4xl font-black md:text-5xl">{t("home.leaders")}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-primary-foreground/90 md:text-lg">
            {t("home.leaders_sub")}
          </p>
          {!loading && leaders.length > 0 && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold backdrop-blur">
              <Users className="h-4 w-4" />
              {leaders.length} {t("leaders.count")}
            </p>
          )}
        </div>
      </section>

      <section className="page-shell section-y-sm">
        {loading ? (
          <p className="text-center text-muted-foreground">{t("common.loading")}</p>
        ) : leaders.length === 0 ? (
          <p className="text-center text-muted-foreground">{t("leaders.empty")}</p>
        ) : (
          <>
            <div className="mx-auto mb-8 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label={t("leaders.search")}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("leaders.search")}
                  className="bg-card pl-9"
                />
              </div>
            </div>
            {shown.length === 0 ? (
              <p className="text-center text-muted-foreground">
                {t("leaders.none_match")} “{q}”.
              </p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {shown.map((l) => (
                  <LeaderCard key={l.id} leader={l} />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <section className="page-shell pb-16">
        <div className="panel-3d flex flex-col items-center gap-4 rounded-2xl p-6 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <h2 className="text-lg font-bold">{t("leaders.signup_cta_title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("leaders.signup_cta_sub")}</p>
          </div>
          <Link to="/jisajili-kiongozi" className="shrink-0">
            <Button className="btn-3d">
              <UserPlus className="mr-2 h-4 w-4" />
              {t("lsignup.title")}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
