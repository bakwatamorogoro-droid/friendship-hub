import { createFileRoute } from "@tanstack/react-router";
import { Users, Target, Eye } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Kuhusu MUMSO" },
      { name: "description", content: "MUMSO ni shirika la wanafunzi linaloratibu huduma na uongozi wa chuo." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { t } = useI18n();
  const cards = [
    { icon: Target, title: t("about.goal"), desc: t("about.goal_desc") },
    { icon: Eye, title: t("about.vision"), desc: t("about.vision_desc") },
    { icon: Users, title: t("about.duty"), desc: t("about.duty_desc") },
  ];
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-4xl font-bold text-foreground">{t("about.title")}</h1>
      <p className="mt-4 text-lg text-muted-foreground">{t("about.lead")}</p>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.title} className="rounded-xl border border-border bg-card p-6 transition hover:border-primary/40 hover:shadow-[var(--shadow-card)]">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20 text-accent-foreground">
              <c.icon className="h-6 w-6" />
            </span>
            <h3 className="mt-4 font-semibold">{c.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
