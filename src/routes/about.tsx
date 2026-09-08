import { createFileRoute } from "@tanstack/react-router";
import { Users, Target, Eye } from "lucide-react";

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
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-4xl font-bold text-foreground">Kuhusu MUMSO</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        MUMSO (Mtandao wa Wanafunzi) ni chombo rasmi cha uongozi wa wanafunzi kinachofanya kazi kuhakikisha sauti za wanafunzi zinasikika, huduma zinapatikana kwa urahisi, na huduma zinashughulikiwa kwa wakati.
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20 text-accent-foreground">
            <Target className="h-6 w-6" />
          </span>
          <h3 className="mt-4 font-semibold">Lengo</h3>
          <p className="mt-2 text-sm text-muted-foreground">Kuwa daraja madhubuti kati ya wanafunzi, uongozi wa chuo, na taasisi za mikopo.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20 text-accent-foreground">
            <Eye className="h-6 w-6" />
          </span>
          <h3 className="mt-4 font-semibold">Dira</h3>
          <p className="mt-2 text-sm text-muted-foreground">Mwanafunzi anayejiamini, anayepata haki na huduma kwa wakati popote alipo.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20 text-accent-foreground">
            <Users className="h-6 w-6" />
          </span>
          <h3 className="mt-4 font-semibold">Wajibu Wetu</h3>
          <p className="mt-2 text-sm text-muted-foreground">Kuratibu huduma, kushughulikia mikopo, na kutoa taarifa muhimu kwa wanafunzi wote.</p>
        </div>
      </div>
    </div>
  );
}