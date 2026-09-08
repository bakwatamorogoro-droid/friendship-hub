import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Building2 } from "lucide-react";
import { useDepartments } from "@/lib/use-site-settings";

export const Route = createFileRoute("/huduma/")({
  head: () => ({
    meta: [
      { title: "Huduma za Wanafunzi — MUMSO" },
      { name: "description", content: "Idara na wizara za MUMSO — chagua idara ili kupata huduma unayohitaji." },
      { property: "og:title", content: "Huduma za Wanafunzi — MUMSO" },
      { property: "og:description", content: "Idara na wizara za MUMSO — chagua idara ili kupata huduma unayohitaji." },
    ],
  }),
  component: HudumaPage,
});

function HudumaPage() {
  const departments = useDepartments();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="digital-page-hero">
        <h1 className="text-3xl md:text-4xl font-bold relative z-10">Huduma za Wanafunzi</h1>
        <p className="mt-2 text-primary-foreground/85 relative z-10">MUMSO imepangwa kama serikali ndogo yenye Idara/Wizara. Chagua idara husika ili kutuma ombi lako moja kwa moja kwa kiongozi wa idara hiyo.</p>
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {departments.length === 0 && (
          <p className="text-muted-foreground col-span-full text-center py-12">Hakuna idara zilizosajiliwa bado.</p>
        )}
        {departments.map((d) => (
          <Link
            key={d.id}
            to="/huduma/$slug"
            params={{ slug: d.slug }}
            className="group rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)]"
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition">
              <Building2 className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-lg font-semibold text-foreground">{d.name}</h3>
            {d.description && <p className="mt-2 text-sm text-muted-foreground">{d.description}</p>}
            {d.leader_name && (
              <p className="mt-3 text-xs text-muted-foreground">Kiongozi: <span className="text-foreground/80 font-medium">{d.leader_name}</span></p>
            )}
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Ingia kwenye idara <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}