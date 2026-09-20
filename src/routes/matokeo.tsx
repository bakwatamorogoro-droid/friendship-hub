import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { showStatus } from "@/lib/status";
import { trackRequests, updateRequest, deleteRequest, type TrackedRequest } from "@/lib/tracking.functions";

export const Route = createFileRoute("/matokeo")({
  validateSearch: (search: Record<string, unknown>) => {
    const raw = search["q"];
    return { q: raw == null ? "" : String(raw).trim() };
  },
  head: () => ({
    meta: [
      { title: "Matokeo ya Ufuatiliaji — MUMSO" },
      {
        name: "description",
        content: "Ona hatua na taarifa za ombi lako la MUMSO: mkopo, changamoto, huduma ya idara au taarifa ya msiba.",
      },
      { property: "og:title", content: "Matokeo ya Ufuatiliaji — MUMSO" },
      { property: "og:description", content: "Hatua na taarifa za ombi lako MUMSO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResultsPage,
});

const STAGES = [
  { key: "pending", label: "Limepokelewa", icon: Clock },
  { key: "reviewing", label: "Linapitiwa", icon: Send },
  { key: "forwarded", label: "Kwa menejimenti", icon: Send },
  { key: "approved", label: "Limekamilika", icon: ShieldCheck },
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

function ResultsPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const search = useServerFn(trackRequests);
  const save = useServerFn(updateRequest);
  const remove = useServerFn(deleteRequest);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TrackedRequest[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const query = (q ?? "").trim();

  const runSearch = async (silent = false) => {
    if (query.length < 3) {
      setLoading(false);
      return [];
    }
    if (!silent) setLoading(true);
    try {
      const res = await search({ data: { query } });
      setItems(res.items);
      if (!silent && res.items.length === 0) {
        showStatus({
          type: "error",
          title: "Hakuna ombi",
          message: "Hakuna ombi lililopatikana. Hakikisha unatumia namba ya simu au namba ya usajili uliyoweka kwenye fomu.",
        });
      }
      return res.items;
    } catch (err: any) {
      showStatus({ type: "error", title: "Imeshindikana", message: err?.message ?? "Hitilafu imetokea." });
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

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
      await save({ data: { id: it.id, kind: it.kind, query, values } });
      setEditing(null);
      await runSearch(true);
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
      await remove({ data: { id: it.id, kind: it.kind, query } });
      await runSearch(true);
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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
            <Search className="h-6 w-6" /> Matokeo ya Ufuatiliaji
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Taarifa zilizotafutwa kwa: <span className="font-semibold text-foreground">{query || "—"}</span>
          </p>
        </div>
        <Link
          to="/fuatilia"
          className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-semibold transition hover:border-primary hover:text-primary"
        >
          Tafuta tena
        </Link>
      </div>

      {loading && (
        <div className="mt-16 flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Inatafuta ombi lako...
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">Hakuna ombi lililopatikana kwa taarifa hizi.</p>
          <Button className="mt-4" onClick={() => navigate({ to: "/fuatilia" })}>
            Rudi Kufuatilia
          </Button>
        </div>
      )}

      <div className="mt-8 space-y-6">
        {items.map((it) => {
          const idx = stageIndex(it.status);
          const rejected = it.status === "rejected";
          const needsFix = it.status === "needs_correction";
          const isEditing = editing === it.id;

          return (
            <article key={it.id} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                    {it.kindLabel}
                  </span>
                  <h2 className="mt-2 text-lg font-bold md:text-xl">{it.title}</h2>
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
                <ol className="mt-5 flex items-stretch gap-2 overflow-x-auto pb-2">
                  {STAGES.map((s, i) => {
                    const done = i <= idx;
                    const Icon = done ? CheckCircle2 : s.icon;
                    return (
                      <li key={s.key} className="flex flex-1 min-w-[130px] items-center gap-2">
                        <div
                          className={`flex w-full flex-col items-center gap-2 rounded-xl border px-3 py-3 text-center text-xs font-semibold ${
                            done
                              ? "border-primary/40 bg-primary/10 text-foreground"
                              : "border-border bg-secondary/40 text-muted-foreground"
                          }`}
                        >
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-full ${
                              done ? "bg-primary text-primary-foreground" : "bg-secondary"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          {s.label}
                        </div>
                        {i < STAGES.length - 1 && (
                          <span className={`hidden h-0.5 w-4 shrink-0 sm:block ${i < idx ? "bg-primary" : "bg-border"}`} />
                        )}
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

              {!needsFix && (
                <div
                  className={`mt-5 rounded-xl border p-4 ${
                    idx >= 3
                      ? "border-primary/40 bg-primary/10"
                      : rejected
                        ? "border-destructive/40 bg-destructive/10"
                        : "border-border bg-secondary/40"
                  }`}
                >
                  <p className="flex items-center gap-2 text-sm font-bold">
                    <MessageSquare className="h-4 w-4" />
                    {idx >= 3 ? "Maelekezo ya uongozi (ombi limekamilika)" : "Maoni / maelekezo ya uongozi"}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/85">
                    {it.adminNote?.trim()
                      ? it.adminNote
                      : idx >= 3
                        ? "Ombi lako limekamilika. Uongozi haujaacha maelekezo ya ziada — wasiliana na ofisi ya MUMSO kwa msaada zaidi."
                        : "Uongozi haujaacha maoni bado. Maelekezo yatatokea hapa mara ombi lako litakapopitiwa."}
                  </p>
                  {it.updatedAt && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Imehuishwa: {new Date(it.updatedAt).toLocaleString("sw-TZ")}
                    </p>
                  )}
                </div>
              )}

              {isEditing ? (
                <div className="mt-5 grid gap-3 rounded-xl border border-border bg-secondary/30 p-4 sm:grid-cols-2">
                  {it.fields.map((f) => (
                    <div key={f.key} className={`space-y-1 ${f.long ? "sm:col-span-2" : ""}`}>
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
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
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
                  <div className="mt-5 -mx-1 overflow-x-auto px-1 pb-2">
                    <dl className="flex min-w-full gap-3">
                      {it.fields
                        .filter((f) => f.value)
                        .map((f) => (
                          <div
                            key={f.key}
                            className="min-w-[180px] max-w-[280px] shrink-0 rounded-xl border border-border bg-secondary/40 px-4 py-3"
                          >
                            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{f.label}</dt>
                            <dd className="mt-1 whitespace-pre-wrap text-sm font-medium">{f.value}</dd>
                          </div>
                        ))}
                    </dl>
                  </div>

                  {it.status !== "approved" && (
                    <div className="mt-4 flex flex-wrap gap-2">
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
