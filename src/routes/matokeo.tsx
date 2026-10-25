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
  ClipboardList,
  Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { showStatus } from "@/lib/status";
import {
  trackRequests,
  updateRequest,
  deleteRequest,
  downloadReplyAttachment,
  type TrackedRequest,
} from "@/lib/tracking.functions";

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
        content:
          "Ona hatua na taarifa za ombi lako la MUMSO: mkopo, changamoto, huduma ya idara au taarifa ya msiba.",
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
  const download = useServerFn(downloadReplyAttachment);
  const [downloading, setDownloading] = useState<string | null>(null);
  const openAttachment = async (replyId: string) => {
    setDownloading(replyId);
    try {
      const result = await download({ data: { query, replyId } });
      window.location.assign(result.url);
    } catch {
      showStatus("error", "Faili haijapatikana. Jaribu tena.");
    } finally {
      setDownloading(null);
    }
  };

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
          message:
            "Hakuna ombi lililopatikana. Hakikisha unatumia namba ya simu au namba ya usajili uliyoweka kwenye fomu.",
        });
      }
      return res.items;
    } catch (err: any) {
      showStatus({
        type: "error",
        title: "Imeshindikana",
        message: err?.message ?? "Hitilafu imetokea.",
      });
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
      showStatus({
        type: "error",
        title: "Imeshindikana",
        message: err?.message ?? "Hitilafu imetokea.",
      });
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
      showStatus({
        type: "error",
        title: "Imeshindikana",
        message: err?.message ?? "Hitilafu imetokea.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-shell page-shell-narrow py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
            <Search className="h-6 w-6" /> Matokeo ya Ufuatiliaji
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Taarifa zilizotafutwa kwa:{" "}
            <span className="font-semibold text-foreground">{query || "—"}</span>
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
        <div className="mw-empty-state mt-12">
          <span className="mw-empty-icon">
            <Search className="h-5 w-5" />
          </span>
          <p className="mw-empty-title">Hakuna ombi lililopatikana</p>
          <p className="mw-empty-hint">
            Hakikisha unatumia namba ya simu au namba ya usajili uliyoweka kwenye fomu.
          </p>
          <Button className="mt-3" onClick={() => navigate({ to: "/fuatilia" })}>
            Rudi Kufuatilia
          </Button>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="tk-summary">
          <div className="tk-stat">
            <p className="tk-stat-key">Maombi</p>
            <p className="tk-stat-value">{items.length}</p>
          </div>
          <div className="tk-stat">
            <p className="tk-stat-key">Yanapitiwa</p>
            <p className="tk-stat-value">{items.filter((i) => stageIndex(i.status) < 3).length}</p>
          </div>
          <div className="tk-stat">
            <p className="tk-stat-key">Yamekamilika</p>
            <p className="tk-stat-value">{items.filter((i) => stageIndex(i.status) >= 3).length}</p>
          </div>
          <div className="tk-stat">
            <p className="tk-stat-key">Majibu</p>
            <p className="tk-stat-value">
              {items.reduce((n, i) => n + (i.replies?.length ?? 0), 0)}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-6">
        {items.map((it) => {
          const idx = stageIndex(it.status);
          const rejected = it.status === "rejected";
          const needsFix = it.status === "needs_correction";
          const isEditing = editing === it.id;

          return (
            <article key={it.id} className="tk-card">
              <div className="tk-head">
                <div className="min-w-0">
                  <span className="tk-kind">
                    <ClipboardList className="h-3 w-3" />
                    {it.kindLabel}
                  </span>
                  <h2 className="tk-title">{it.title}</h2>
                </div>
                <span className="tk-date">
                  {new Date(it.createdAt).toLocaleDateString("sw-TZ", { dateStyle: "long" })}
                </span>
              </div>

              {rejected ? (
                <p className="tk-note" style={{ borderLeftColor: "var(--destructive)" }}>
                  <span className="tk-note-title" style={{ color: "var(--destructive)" }}>
                    <XCircle className="h-4 w-4" /> Ombi hili limekataliwa
                  </span>
                  <span className="tk-note-body">
                    Wasiliana na ofisi ya MUMSO kwa maelezo zaidi.
                  </span>
                </p>
              ) : (
                <>
                  <div className="tk-progress">
                    <div className="tk-progress-top">
                      <span>
                        Hatua ya {idx + 1} kati ya {STAGES.length}
                      </span>
                      <span>{STAGES[idx]?.label}</span>
                    </div>
                    <div className="tk-progress-track">
                      <div
                        className="tk-progress-fill"
                        style={{ width: `${((idx + 1) / STAGES.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  <ol className="tk-steps">
                    {STAGES.map((s, i) => {
                      const done = i <= idx;
                      const Icon = done ? CheckCircle2 : s.icon;
                      return (
                        <li key={s.key} className={`tk-step ${done ? "is-done" : ""}`}>
                          <span className="tk-step-dot">
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          {s.label}
                        </li>
                      );
                    })}
                  </ol>
                </>
              )}

              {needsFix && (
                <div className="tk-note" style={{ borderLeftColor: "var(--accent)" }}>
                  <span className="tk-note-title">
                    <AlertTriangle className="h-4 w-4" /> Uongozi umeomba urekebishe taarifa zako
                  </span>
                  <span className="tk-note-body">
                    {it.adminNote || "Tafadhali pitia taarifa zako na urekebishe zilizokosewa."}
                  </span>
                </div>
              )}

              {!needsFix && (
                <div className="tk-note">
                  <span className="tk-note-title">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    {idx >= 3
                      ? "Maelekezo ya uongozi (ombi limekamilika)"
                      : "Maoni / maelekezo ya uongozi"}
                  </span>
                  <span className="tk-note-body">
                    {it.adminNote?.trim()
                      ? it.adminNote
                      : idx >= 3
                        ? "Ombi lako limekamilika. Uongozi haujaacha maelekezo ya ziada — wasiliana na ofisi ya MUMSO kwa msaada zaidi."
                        : "Uongozi haujaacha maoni bado. Maelekezo yatatokea hapa mara ombi lako litakapopitiwa."}
                  </span>
                  {it.updatedAt && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Imehuishwa: {new Date(it.updatedAt).toLocaleString("sw-TZ")}
                    </p>
                  )}
                </div>
              )}

              {Boolean(it.replies?.length) && (
                <section className="mt-6 border-t border-border pt-5" aria-label="Majibu ya wizara">
                  <h3 className="flex items-center gap-2 font-bold">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Majibu ya wizara
                  </h3>
                  <div className="mt-4 space-y-5">
                    {it.replies?.map((reply) => (
                      <div key={reply.id} className="border-l-2 border-primary pl-4">
                        <p className="text-xs font-semibold text-primary">
                          {reply.reply_type === "letter"
                            ? "Barua"
                            : reply.reply_type === "form"
                              ? "Fomu"
                              : "Ujumbe"}{" "}
                          · {new Date(reply.created_at).toLocaleString("sw-TZ")}
                        </p>
                        <h4 className="mt-1 font-semibold">{reply.subject}</h4>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
                          {reply.body}
                        </p>
                        {reply.attachment_path && (
                          <Button
                            className="mt-3 max-w-full whitespace-normal"
                            variant="outline"
                            size="sm"
                            disabled={downloading === reply.id}
                            onClick={() => openAttachment(reply.id)}
                          >
                            {downloading === reply.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Paperclip className="h-4 w-4" />
                            )}
                            {reply.attachment_name ?? "Pakua faili"}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
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
                      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Hifadhi
                      Marekebisho
                    </Button>
                    <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>
                      Acha
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <ul className="tk-fields">
                    {it.fields
                      .filter((f) => f.value)
                      .map((f) => (
                        <li key={f.key} className="tk-field">
                          <p className="tk-field-key">{f.label}</p>
                          <p className="tk-field-value">{f.value}</p>
                        </li>
                      ))}
                  </ul>

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
