import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  ShieldCheck,
  XCircle,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { showStatus } from "@/lib/status";
import { trackRequests, updateRequest, deleteRequest, type TrackedRequest } from "@/lib/tracking.functions";

export const Route = createFileRoute("/fuatilia")({
  head: () => ({
    meta: [
      { title: "Fuatilia Ombi Lako — MUMSO" },
      {
        name: "description",
        content:
          "Fuatilia hatua ya ombi lako la mkopo, changamoto au huduma ya idara MUMSO kwa kutumia namba ya simu au namba ya usajili.",
      },
      { property: "og:title", content: "Fuatilia Ombi Lako — MUMSO" },
      {
        property: "og:description",
        content: "Angalia hatua ya ombi lako, rekebisha taarifa au futa ombi lako MUMSO.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrackPage,
});

const STAGES = [
  { key: "pending", label: "Ombi limepokelewa", icon: Clock },
  { key: "reviewing", label: "Linapitiwa na kiongozi", icon: Send },
  { key: "forwarded", label: "Limepelekwa kwa menejimenti", icon: Send },
  { key: "approved", label: "Limekubaliwa / limekamilika", icon: ShieldCheck },
];

const stageIndex = (status: string) => {
  switch (status) {
    case "approved":
    case "completed":
      return 3;
    case "forwarded":
      return 2;
    case "reviewing":
      return 1;
    default:
      return 0;
  }
};

function TrackPage() {
  const search = useServerFn(trackRequests);
  const save = useServerFn(updateRequest);
  const remove = useServerFn(deleteRequest);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [items, setItems] = useState<TrackedRequest[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const runSearch = async (q: string) => {
    const res = await search({ data: { query: q } });
    setItems(res.items);
    setSearched(true);
    return res.items;
  };

  const onSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    const form = e.currentTarget;
    const raw =
      (new FormData(form).get("track-query") as string | null)?.trim() || query.trim();
    const q = raw;
    if (q !== query) setQuery(q);
    if (q.length < 4) {
      showStatus({
        type: "error",
        title: "Taarifa pungufu",
        message: "Tafadhali weka namba ya simu au namba ya usajili kamili (angalau herufi/namba 4).",
      });
      return;
    }
    setLoading(true);
    setEditing(null);

    try {
      const found = await runSearch(q);
      if (found.length === 0) {
        showStatus({
          type: "error",
          title: "Hakuna ombi",
          message: "Hakuna ombi lililopatikana. Hakikisha unatumia namba ya simu au namba ya usajili uliyoweka kwenye fomu.",
        });
      }
    } catch (err: any) {
      showStatus({ type: "error", title: "Imeshindikana", message: err?.message ?? "Hitilafu imetokea." });
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (it: TrackedRequest) => {
    setEditing(it.id);
    const v: Record<string, string> = {};
    it.fields.forEach((f) => {
      v[f.key] = f.value;
    });
    setValues(v);
  };

  const onSave = async (it: TrackedRequest) => {
    setBusy(true);
    try {
      await save({ data: { id: it.id, kind: it.kind, query: query.trim(), values } });
      setEditing(null);
      await runSearch(query.trim());
      showStatus({
        type: "success",
        title: "Imefanikiwa",
        message: "Marekebisho yako yamehifadhiwa na ombi lako limerudi kwa uongozi kwa ukaguzi.",
        autoCloseMs: 4000,
      });
    } catch (err: any) {
      showStatus({ type: "error", title: "Imeshindikana", message: err?.message ?? "Hitilafu imetokea." });
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (it: TrackedRequest) => {
    if (!window.confirm("Una uhakika unataka kufuta ombi hili?")) return;
    setBusy(true);
    try {
      await remove({ data: { id: it.id, kind: it.kind, query: query.trim() } });
      await runSearch(query.trim());
      showStatus({
        type: "success",
        title: "Ombi limefutwa",
        message: "Ombi lako limefutwa kwenye mfumo.",
        autoCloseMs: 3500,
      });
    } catch (err: any) {
      showStatus({ type: "error", title: "Imeshindikana", message: err?.message ?? "Hitilafu imetokea." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="digital-page-hero">
        <h1 className="relative z-10 flex items-center gap-3 text-3xl font-bold md:text-4xl">
          <Search className="h-8 w-8" /> Fuatilia Ombi Lako
        </h1>
        <p className="relative z-10 mt-2 text-base text-primary-foreground/85 md:text-lg">
          Weka namba ya simu <span className="font-semibold">au</span> namba ya usajili uliyotumia kwenye fomu.
        </p>
      </div>

      <form onSubmit={onSearch} className="digital-card mt-8 flex flex-col gap-3 p-6 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="track-query">Namba ya simu au namba ya usajili *</Label>
          <Input
            id="track-query"
            name="track-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            required
            minLength={4}
            placeholder="0712 345 678 au MUM/BCS/2024/001"
          />
        </div>
        <Button type="submit" disabled={loading} className="sm:w-40">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
          Tafuta
        </Button>
      </form>

      {searched && items.length === 0 && !loading && (
        <p className="mt-10 text-center text-muted-foreground">
          Hakuna ombi lililopatikana kwa taarifa hizi.
        </p>
      )}

      <div className="mt-8 space-y-6">
        {items.map((it) => {
          const idx = stageIndex(it.status);
          const rejected = it.status === "rejected";
          const needsFix = it.status === "needs_correction";
          const isEditing = editing === it.id;

          return (
            <article key={it.id} className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                    {it.kindLabel}
                  </span>
                  <h2 className="mt-2 text-xl font-bold">{it.title}</h2>
                </div>
                <span className="text-sm text-muted-foreground">
                  {new Date(it.createdAt).toLocaleDateString("sw-TZ", { dateStyle: "long" })}
                </span>
              </div>

              {rejected ? (
                <p className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                  <XCircle className="h-4 w-4" /> Ombi hili limekataliwa. Wasiliana na ofisi ya MUMSO.
                </p>
              ) : (
                <ol className="mt-5 space-y-3">
                  {STAGES.map((s, i) => {
                    const done = i <= idx;
                    const Icon = done ? CheckCircle2 : s.icon;
                    return (
                      <li
                        key={s.key}
                        className={`flex items-center gap-3 text-sm ${done ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                      >
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            done ? "bg-primary text-primary-foreground" : "bg-secondary"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        {s.label}
                      </li>
                    );
                  })}
                </ol>
              )}

              {needsFix && (
                <div className="mt-5 rounded-xl border border-accent/50 bg-accent/10 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <AlertTriangle className="h-4 w-4" /> Uongozi umeomba urekebishe taarifa zako
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/85">
                    {it.adminNote || "Tafadhali pitia taarifa zako na urekebishe zilizokosewa."}
                  </p>
                </div>
              )}

              {isEditing ? (
                <div className="mt-5 space-y-3 rounded-xl border border-border bg-secondary/30 p-4">
                  {it.fields.map((f) => (
                    <div key={f.key} className="space-y-1">
                      <Label className="text-xs" htmlFor={`${it.id}-${f.key}`}>
                        {f.label}
                      </Label>
                      {f.long ? (
                        <Textarea
                          id={`${it.id}-${f.key}`}
                          rows={3}
                          value={values[f.key] ?? ""}
                          onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                        />
                      ) : (
                        <Input
                          id={`${it.id}-${f.key}`}
                          value={values[f.key] ?? ""}
                          onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                        />
                      )}
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => onSave(it)} disabled={busy}>
                      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Hifadhi Marekebisho
                    </Button>
                    <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>
                      Acha
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <details className="mt-5">
                    <summary className="cursor-pointer text-sm font-semibold text-primary">
                      Ona taarifa zote za ombi
                    </summary>
                    <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                      {it.fields
                        .filter((f) => f.value)
                        .map((f) => (
                          <div key={f.key} className="rounded-lg bg-secondary/40 px-3 py-2">
                            <dt className="text-xs uppercase tracking-wide text-muted-foreground">{f.label}</dt>
                            <dd className="whitespace-pre-wrap text-sm">{f.value}</dd>
                          </div>
                        ))}
                    </dl>
                  </details>

                  {it.status !== "approved" && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => startEdit(it)} disabled={busy}>
                        <Pencil className="mr-2 h-4 w-4" /> Rekebisha Taarifa
                      </Button>
                      <Button variant="destructive" onClick={() => onDelete(it)} disabled={busy}>
                        <Trash2 className="mr-2 h-4 w-4" /> Futa Ombi
                      </Button>
                    </div>
                  )}
                </>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
