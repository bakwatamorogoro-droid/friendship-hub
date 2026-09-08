import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Search, CheckCircle2, Clock, AlertTriangle, Send, ShieldCheck, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trackSubmissions, submitCorrection, type TrackedItem } from "@/lib/track.functions";

export const Route = createFileRoute("/fuatilia")({
  head: () => ({
    meta: [
      { title: "Fuatilia Huduma — MUMSO" },
      { name: "description", content: "Fuatilia hatua ya ombi lako la huduma kwa kutumia namba ya simu uliyoandika kwenye fomu." },
      { property: "og:title", content: "Fuatilia Huduma — MUMSO" },
      { property: "og:description", content: "Angalia hatua ya ombi lako la huduma au mkopo MUMSO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrackPage,
});

const STAGES = [
  { key: "pending", label: "Ombi lako limepokelewa", icon: Clock },
  { key: "needs_correction", label: "Linahitaji marekebisho ya taarifa", icon: AlertTriangle },
  { key: "forwarded", label: "Limepelekwa kwa uongozi", icon: Send },
  { key: "approved", label: "Approval Administrata", icon: ShieldCheck },
];

function stageIndex(status: string) {
  if (status === "approved") return 3;
  if (status === "forwarded" || status === "reviewing") return 2;
  if (status === "needs_correction") return 1;
  return 0;
}

function TrackPage() {
  const track = useServerFn(trackSubmissions);
  const fix = useServerFn(submitCorrection);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [items, setItems] = useState<TrackedItem[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await track({ data: { phone } });
      setItems(res.items);
      setSearched(true);
      setEditing(null);
      if (res.items.length === 0) toast.info("Hakuna ombi lililopatikana kwa namba hii.");
    } catch (err: any) {
      toast.error(err?.message ?? "Imeshindikana kutafuta.");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (it: TrackedItem) => {
    setEditing(it.id);
    const v: Record<string, string> = {};
    it.fields.forEach((f) => { v[f.key] = f.value; });
    setValues(v);
  };

  const saveEdit = async (it: TrackedItem) => {
    setSaving(true);
    try {
      await fix({ data: { id: it.id, kind: it.kind, phone, values } });
      toast.success("Marekebisho yametumwa. Ombi lako limerudi kwa uongozi.");
      setEditing(null);
      const res = await track({ data: { phone } });
      setItems(res.items);
    } catch (err: any) {
      toast.error(err?.message ?? "Imeshindikana kutuma marekebisho.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="digital-page-hero">
        <h1 className="relative z-10 flex items-center gap-3 text-3xl md:text-4xl font-bold">
          <Search className="h-8 w-8" /> Fuatilia Huduma
        </h1>
        <p className="relative z-10 mt-2 text-primary-foreground/85 text-base md:text-lg">
          Weka namba ya simu uliyoandika kwenye fomu ili kuona hatua ya ombi lako.
        </p>
      </div>

      <form onSubmit={search} className="digital-card mt-8 flex flex-col gap-3 p-6 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label>Namba ya Simu *</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="0712 345 678" />
        </div>
        <Button type="submit" disabled={loading} className="sm:w-40">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
          Tafuta
        </Button>
      </form>

      {searched && items.length === 0 && (
        <p className="mt-10 text-center text-muted-foreground">
          Hakuna ombi lililopatikana. Hakikisha unatumia namba ile uliyoandika kwenye fomu.
        </p>
      )}

      <div className="mt-8 space-y-6">
        {items.map((it) => {
          const idx = stageIndex(it.status);
          const rejected = it.status === "rejected";
          return (
            <article key={it.id} className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                    {it.kindLabel}
                  </span>
                  <h2 className="mt-2 text-xl font-bold">{it.title}</h2>
                </div>
                <span className="text-sm text-muted-foreground">
                  {new Date(it.created_at).toLocaleDateString("sw-TZ", { dateStyle: "long" })}
                </span>
              </div>

              {rejected ? (
                <p className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                  <XCircle className="h-4 w-4" /> Ombi hili limekataliwa. Wasiliana na ofisi ya MUMSO.
                </p>
              ) : (
                <ol className="mt-5 space-y-3">
                  {STAGES.filter((s) => s.key !== "needs_correction" || it.status === "needs_correction").map((s) => {
                    const si = stageIndex(s.key);
                    const done = si <= idx;
                    const Icon = done ? (s.key === "needs_correction" ? AlertTriangle : CheckCircle2) : s.icon;
                    return (
                      <li key={s.key} className={`flex items-center gap-3 text-sm ${done ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          done ? (s.key === "needs_correction" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground") : "bg-secondary"
                        }`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        {s.label}
                      </li>
                    );
                  })}
                </ol>
              )}

              {it.status === "needs_correction" && (
                <div className="mt-5 rounded-xl border border-accent/50 bg-accent/10 p-4">
                  <p className="text-sm font-semibold">Ujumbe kutoka uongozi:</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/85">
                    {it.admin_note || "Tafadhali pitia taarifa zako na urekebishe zilizokosewa."}
                  </p>
                  {editing === it.id ? (
                    <div className="mt-4 space-y-3">
                      {it.fields.map((f) => (
                        <div key={f.key} className="space-y-1">
                          <Label className="text-xs">{f.label}</Label>
                          {f.key.includes("description") ? (
                            <Textarea rows={3} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
                          ) : (
                            <Input value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
                          )}
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Button onClick={() => saveEdit(it)} disabled={saving}>
                          {saving ? "Inatuma..." : "Tuma Marekebisho"}
                        </Button>
                        <Button variant="outline" onClick={() => setEditing(null)}>Acha</Button>
                      </div>
                    </div>
                  ) : (
                    <Button className="mt-3" onClick={() => startEdit(it)}>Rekebisha Ombi Lako</Button>
                  )}
                </div>
              )}

              {editing !== it.id && (
                <details className="mt-5">
                  <summary className="cursor-pointer text-sm font-semibold text-primary">Ona taarifa zote za ombi</summary>
                  <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                    {it.fields.filter((f) => f.value).map((f) => (
                      <div key={f.key} className="rounded-lg bg-secondary/40 px-3 py-2">
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">{f.label}</dt>
                        <dd className="whitespace-pre-wrap text-sm">{f.value}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
