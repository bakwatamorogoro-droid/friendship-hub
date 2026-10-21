import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Star } from "lucide-react";
import { useDepartments } from "@/lib/use-site-settings";
import { useMyMinistry } from "@/lib/my-ministry";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/huduma/")({
  head: () => ({
    meta: [
      { title: "Huduma za Wanafunzi — MUMSO" },
      { name: "description", content: "Wizara na idara za MUMSO — chagua wizara yako ili kupata huduma unayohitaji." },
      { property: "og:title", content: "Huduma za Wanafunzi — MUMSO" },
      { property: "og:description", content: "Wizara na idara za MUMSO — chagua wizara yako ili kupata huduma unayohitaji." },
    ],
  }),
  component: HudumaPage,
});

function HudumaPage() {
  const { t } = useI18n();
  const departments = useDepartments();
  const mySlug = useMyMinistry();

  // Wizara yako ionekane kwanza; nyingine zifuate kwa mpangilio wa kawaida.
  const ordered = mySlug
    ? [...departments].sort((a, b) => Number(b.slug === mySlug) - Number(a.slug === mySlug))
    : departments;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="digital-page-hero">
        <h1 className="relative z-10 text-3xl font-bold md:text-4xl">{t("services.title")}</h1>
        <p className="relative z-10 mt-2 text-primary-foreground/85">{t("services.lead")}</p>
      </div>

      {mySlug && (
        <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
          <Star className="h-4 w-4" /> {t("services.my_ministry_first")}
        </p>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {departments.length === 0 && (
          <p className="col-span-full py-12 text-center text-muted-foreground">{t("services.none")}</p>
        )}
        {ordered.map((d) => (
          <Link
            key={d.id}
            to="/huduma/$slug"
            params={{ slug: d.slug }}
            className={`group rounded-2xl border bg-card p-6 shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-elegant)] ${
              d.slug === mySlug ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
            }`}
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
              <Building2 className="h-6 w-6" />
            </span>
            {d.slug === mySlug && (
              <span className="ml-3 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 align-middle text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
                <Star className="h-3 w-3" /> {t("services.my_ministry")}
              </span>
            )}
            <h3 className="mt-4 text-lg font-semibold text-foreground">{d.name}</h3>
            {d.description && <p className="mt-2 text-sm text-muted-foreground">{d.description}</p>}
            {d.leader_name && (
              <p className="mt-3 text-xs text-muted-foreground">{t("services.dept_leader")}: <span className="font-medium text-foreground/80">{d.leader_name}</span></p>
            )}
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
              {t("services.open_dept")} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
