import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Inbox,
  Mail,
  Megaphone,
  MessageSquare,
  Paperclip,
  Save,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useResolvedUrl } from "@/lib/storage-url";
import { useI18n } from "@/lib/i18n";
import {
  formatWeek,
  loadCabinetContacts,
  loadMessages,
  loadNewsInbox,
  loadReports,
  loadStageHistory,
  markMessageRead,
  saveReport,
  sendMessage,
  weekStart,
  type InternalMessage,
  type MinistryReport,
  type MinistryRole,
  type StageEvent,
} from "@/lib/ministry";
import { CabinetOverview } from "@/components/admin/CabinetOverview";

type Row = Record<string, any>;

const STAGES: Array<{ key: string; label: string }> = [
  { key: "pending", label: "Limepokelewa" },
  { key: "needs_correction", label: "Linahitaji marekebisho" },
  { key: "forwarded", label: "Limepelekwa kwa uongozi" },
  { key: "approved", label: "Limekamilika" },
  { key: "rejected", label: "Limekataliwa" },
];

const stageIndex = (status: string) => {
  switch (status) {
    case "approved":
    case "completed":
      return 3;
    case "forwarded":
      return 2;
    case "needs_correction":
      return 1;
    default:
      return 0;
  }
};

type Section = "huduma" | "changamoto" | "ripoti" | "mawasiliano";

/**
 * Paneli ya kisasa ya wizara: huduma za wanafunzi, changamoto, hatua zao,
 * ripoti ya wiki, na mawasiliano ya ndani (Waziri Mkuu na Wizara ya Habari).
 */
export function MinistryWorkspace({
  role,
  deptSubs,
  challenges,
  depts,
  userId,
  onSaved,
}: {
  role: MinistryRole;
  deptSubs: Row[];
  challenges: Row[];
  depts: Row[];
  userId: string;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [section, setSection] = useState<Section>("huduma");
  const deptName = role.departmentName ?? t("mw.my_ministry");

  const sections: Array<{
    key: Section;
    label: string;
    icon: typeof ClipboardList;
    count?: number;
  }> = [
    { key: "huduma", label: t("mw.services"), icon: ClipboardList, count: deptSubs.length },
    { key: "changamoto", label: t("mw.challenges"), icon: MessageSquare, count: challenges.length },
    { key: "ripoti", label: t("mw.report"), icon: FileText },
    { key: "mawasiliano", label: t("mw.messages"), icon: Mail },
  ];

  return (
    <div className="mw-shell">
      <section className="mgmt-hero">
        <div className="mgmt-hero-inner flex flex-wrap items-center gap-5">
          <span className="mgmt-avatar">
            {role.displayName
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase())
              .join("") || "KG"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground/75">
              {role.position ?? t("mgmt.leader")}
            </p>
            <h1 className="mt-1 truncate text-2xl font-black md:text-3xl">{deptName}</h1>
            <p className="mt-1 text-sm text-primary-foreground/85">
              {role.displayName || t("mgmt.leader")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="mgmt-chip">
              <ClipboardList className="h-3.5 w-3.5" /> {deptSubs.length} {t("mw.services_short")}
            </span>
            <span className="mgmt-chip">
              <MessageSquare className="h-3.5 w-3.5" /> {challenges.length}{" "}
              {t("mw.challenges_short")}
            </span>
            {role.isNewsMinistry && (
              <span className="mgmt-chip">
                <Megaphone className="h-3.5 w-3.5" /> {t("news.newsroom")}
              </span>
            )}
          </div>
        </div>
      </section>

      <nav className="mw-tabs" aria-label={t("mw.sections")}>
        {sections.map((s) => {
          const Icon = s.icon;
          const active = section === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setSection(s.key)}
              aria-current={active ? "page" : undefined}
              className={`mw-tab ${active ? "is-active" : ""}`}
            >
              <Icon className="h-4 w-4" />
              <span>{s.label}</span>
              {s.count !== undefined && <span className="mw-tab-count">{s.count}</span>}
            </button>
          );
        })}
      </nav>

      {section === "huduma" && (
        <RequestWorklist
          rows={deptSubs}
          kind="idara"
          depts={depts}
          showDepartment={false}
          emptyLabel={t("mw.no_services")}
          onSaved={onSaved}
        />
      )}

      {section === "changamoto" && (
        <RequestWorklist
          rows={challenges}
          kind="changamoto"
          depts={depts}
          showDepartment={false}
          emptyLabel={t("mw.no_challenges")}
          onSaved={onSaved}
        />
      )}

      {section === "ripoti" && (
        <WeeklyReportPanel role={role} deptSubs={deptSubs} challenges={challenges} depts={depts} />
      )}

      {section === "mawasiliano" && <MessagingPanel role={role} userId={userId} depts={depts} />}

      {role.isCabinet && (
        <CabinetOverview role={role} depts={depts} currentDepartmentId={role.departmentId} />
      )}
    </div>
  );
}

/** Orodha ya maombi ya wizara pamoja na hatua na historia yake. */
function RequestWorklist({
  rows,
  kind,
  depts,
  showDepartment,
  emptyLabel,
  onSaved,
}: {
  rows: Row[];
  kind: "idara" | "changamoto";
  depts: Row[];
  showDepartment: boolean;
  emptyLabel: string;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [history, setHistory] = useState<StageEvent[]>([]);
  const [filter, setFilter] = useState("all");
  const deptMap = useMemo(() => new Map(depts.map((d) => [d.id, d.name] as const)), [depts]);

  useEffect(() => {
    let alive = true;
    loadStageHistory([kind]).then((h) => {
      if (alive) setHistory(h);
    });
    return () => {
      alive = false;
    };
  }, [kind, rows.length]);

  const byRequest = useMemo(() => {
    const m = new Map<string, StageEvent[]>();
    history.forEach((e) => {
      const list = m.get(e.request_id) ?? [];
      list.push(e);
      m.set(e.request_id, list);
    });
    return m;
  }, [history]);

  const visible = filter === "all" ? rows : rows.filter((r) => (r.status ?? "pending") === filter);

  return (
    <div className="mw-panel">
      <div className="mw-panel-head">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <ClipboardList className="h-5 w-5 text-primary" />
          {kind === "idara" ? t("mw.services") : t("mw.challenges")}
          <span className="mw-count">{rows.length}</span>
        </h2>
        <div className="mw-filters" role="group" aria-label={t("mw.filter_stage")}>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`mw-chip ${filter === "all" ? "is-active" : ""}`}
          >
            {t("mw.all")}
          </button>
          {STAGES.map((s) => {
            const n = rows.filter((r) => (r.status ?? "pending") === s.key).length;
            if (!n) return null;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setFilter(s.key)}
                className={`mw-chip ${filter === s.key ? "is-active" : ""}`}
              >
                {s.label} <span className="mw-chip-n">{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="mw-empty">{emptyLabel}</p>
      ) : (
        <ul className="mw-list">
          {visible.map((r) => (
            <li key={r.id} className="mw-request">
              <div className="mw-request-top">
                <div className="min-w-0">
                  <h3 className="mw-request-name">{r.full_name ?? t("mgmt.applicant")}</h3>
                  <p className="mw-request-meta">
                    <span className="font-mono">{r.registration_number ?? "-"}</span>
                    {r.phone && <span>· {r.phone}</span>}
                    {r.course && <span>· {r.course}</span>}
                    {showDepartment && <span>· {deptMap.get(r.department_id) ?? "-"}</span>}
                  </p>
                </div>
                <StatusBadge status={r.status ?? "pending"} />
              </div>

              {r.challenge_type && (
                <p className="mw-request-type">
                  <AlertTriangle className="h-3.5 w-3.5" /> {r.challenge_type}
                </p>
              )}
              {(r.description ?? r.problem_description) && (
                <p className="mw-request-desc">{r.description ?? r.problem_description}</p>
              )}
              {r.category && <p className="mw-request-type">{r.category}</p>}
              {r.attachment_url && (
                <ResolvedAttachment url={r.attachment_url} name={r.attachment_name} />
              )}

              <StageTimeline status={r.status ?? "pending"} events={byRequest.get(r.id) ?? []} />
              <StageControl id={r.id} kind={kind} row={r} onSaved={onSaved} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    pending: "mw-badge-pending",
    needs_correction: "mw-badge-fix",
    forwarded: "mw-badge-forwarded",
    approved: "mw-badge-approved",
    rejected: "mw-badge-rejected",
  };
  const label = STAGES.find((s) => s.key === status)?.label ?? status;
  return <span className={`mw-badge ${tone[status] ?? "mw-badge-pending"}`}>{label}</span>;
}

/** Hatua nne zinazoonyesha ombi lilipofikia, pamoja na tarehe za historia. */
function StageTimeline({ status, events }: { status: string; events: StageEvent[] }) {
  const { t } = useI18n();
  const rejected = status === "rejected";
  const idx = stageIndex(status);
  const steps = [
    { label: t("mw.stage_received"), icon: Clock },
    { label: t("mw.stage_review"), icon: FileText },
    { label: t("mw.stage_forwarded"), icon: Send },
    { label: t("mw.stage_done"), icon: ShieldCheckIcon },
  ];
  const dateFor = (i: number) => events[i]?.created_at;

  return (
    <div className="mw-stages">
      {rejected && (
        <p className="mw-rejected">
          <XCircle className="h-4 w-4" /> {t("mw.rejected_note")}
        </p>
      )}
      <ol className="mw-stage-track">
        {steps.map((s, i) => {
          const done = i <= idx;
          const Icon = done ? CheckCircle2 : s.icon;
          const at = dateFor(i);
          return (
            <li key={s.label} className={`mw-stage ${done ? "is-done" : ""}`}>
              <span className="mw-stage-dot">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="mw-stage-label">{s.label}</span>
              {at && (
                <span className="mw-stage-date">
                  {new Date(at).toLocaleDateString("sw-TZ", { day: "numeric", month: "short" })}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ShieldCheckIcon(props: { className?: string }) {
  return <BadgeCheck {...props} />;
}

/** Kiongozi hubadili hatua ya ombi na kuandika maelezo kwa mwombaji. */
function StageControl({
  id,
  kind,
  row,
  onSaved,
}: {
  id: string;
  kind: "idara" | "changamoto";
  row: Row;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [status, setStatus] = useState<string>(row.status ?? "pending");
  const [note, setNote] = useState<string>(row.admin_note ?? "");
  const [busy, setBusy] = useState(false);
  const dirty = status !== (row.status ?? "pending") || note !== (row.admin_note ?? "");

  const table = kind === "idara" ? "department_submissions" : "challenges";

  const save = async () => {
    setBusy(true);
    const { error } = await (supabase.from(table) as any)
      .update({ status, admin_note: note.trim() || null })
      .eq("id", id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("mw.stage_saved"));
    onSaved();
  };

  return (
    <div className="mw-control">
      <div className="mw-control-row">
        <Label htmlFor={`stage-${id}`} className="mw-control-label">
          {t("mw.change_stage")}
        </Label>
        <select
          id={`stage-${id}`}
          className="mw-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <Textarea
        rows={2}
        className="text-sm"
        placeholder={t("mw.note_placeholder")}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <Button size="sm" disabled={!dirty || busy} onClick={save} className="self-start">
        <Save className="mr-2 h-4 w-4" />
        {t("mw.save_stage")}
      </Button>
    </div>
  );
}

function ResolvedAttachment({ url, name }: { url: string; name?: string | null }) {
  const resolved = useResolvedUrl(url);
  return (
    <a href={resolved ?? url} target="_blank" rel="noreferrer" className="mw-attachment">
      <Paperclip className="h-3.5 w-3.5" /> {name || "Fungua faili"}
      <ArrowUpRight className="h-3.5 w-3.5" />
    </a>
  );
}

/** Ripoti ya wiki: kiongozi huandika kazi alizofanya kila wiki. */
function WeeklyReportPanel({
  role,
  deptSubs,
  challenges,
  depts,
}: {
  role: MinistryRole;
  deptSubs: Row[];
  challenges: Row[];
  depts: Row[];
}) {
  const { t } = useI18n();
  const currentWeek = weekStart();
  const [reports, setReports] = useState<MinistryReport[]>([]);
  const [summary, setSummary] = useState("");
  const [challengesText, setChallengesText] = useState("");
  const [nextWeek, setNextWeek] = useState("");
  const [busy, setBusy] = useState(false);
  const deptMap = useMemo(() => new Map(depts.map((d) => [d.id, d.name] as const)), [depts]);

  const handled = useMemo(() => {
    const inWeek = (r: Row) => {
      const created = new Date(String(r.created_at ?? ""));
      const start = new Date(`${currentWeek}T00:00:00Z`);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 7);
      return created >= start && created < end;
    };
    return [...deptSubs, ...challenges].filter(inWeek).length;
  }, [deptSubs, challenges, currentWeek]);

  const reload = () => {
    const scope = role.isCabinet ? {} : { departmentId: role.departmentId };
    loadReports(scope).then(setReports);
  };

  useEffect(() => {
    reload();
  }, [role.departmentId, role.isCabinet]);

  const mine = reports.find(
    (r) => r.week_start === currentWeek && r.department_id === role.departmentId,
  );

  useEffect(() => {
    if (mine) {
      setSummary(mine.summary);
      setChallengesText(mine.challenges ?? "");
      setNextWeek(mine.next_week ?? "");
    }
  }, [mine?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role.departmentId) {
      toast.error(t("mw.no_ministry"));
      return;
    }
    if (summary.trim().length < 10) {
      toast.error(t("mw.report_too_short"));
      return;
    }
    setBusy(true);
    const res = await saveReport({
      departmentId: role.departmentId,
      weekStart: currentWeek,
      summary,
      challenges: challengesText,
      nextWeek,
      requestsHandled: handled,
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error ?? t("common.error"));
      return;
    }
    toast.success(t("mw.report_saved"));
    reload();
  };

  const history = reports.filter((r) => r.department_id === role.departmentId);

  return (
    <div className="mw-panel">
      <div className="mw-panel-head">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <FileText className="h-5 w-5 text-primary" /> {t("mw.report")}
        </h2>
        <span className="mw-count">{formatWeek(currentWeek)}</span>
      </div>

      <form onSubmit={submit} className="mw-form">
        <p className="mw-form-lead">{t("mw.report_lead")}</p>
        <div className="mw-metric">
          <Sparkles className="h-4 w-4 text-primary" />
          {t("mw.handled_auto")}: <strong>{handled}</strong>
        </div>
        <div className="space-y-2">
          <Label htmlFor="report-summary">{t("mw.report_summary")} *</Label>
          <Textarea
            id="report-summary"
            rows={5}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={t("mw.report_summary_ph")}
            required
            maxLength={4000}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="report-challenges">{t("mw.report_challenges")}</Label>
            <Textarea
              id="report-challenges"
              rows={3}
              value={challengesText}
              onChange={(e) => setChallengesText(e.target.value)}
              maxLength={2000}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-next">{t("mw.report_next")}</Label>
            <Textarea
              id="report-next"
              rows={3}
              value={nextWeek}
              onChange={(e) => setNextWeek(e.target.value)}
              maxLength={2000}
            />
          </div>
        </div>
        <Button type="submit" disabled={busy}>
          <Save className="mr-2 h-4 w-4" />
          {mine ? t("mw.report_update") : t("mw.report_submit")}
        </Button>
      </form>

      <div className="mw-report-history">
        <h3 className="mw-subhead">{t("mw.report_history")}</h3>
        {history.length === 0 ? (
          <p className="mw-empty">{t("mw.no_reports")}</p>
        ) : (
          <ul className="mw-list">
            {history.map((r) => (
              <li key={r.id} className="mw-report">
                <div className="mw-report-top">
                  <strong>{formatWeek(r.week_start)}</strong>
                  <span className="mw-count">
                    {r.requests_handled} {t("mw.services_short")}
                  </span>
                </div>
                <p className="mw-report-body">{r.summary}</p>
                {role.isCabinet && (
                  <p className="mw-report-dept">{deptMap.get(r.department_id) ?? "-"}</p>
                )}
                {r.challenges && (
                  <p className="mw-report-sub">
                    <AlertTriangle className="h-3.5 w-3.5" /> {r.challenges}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Mawasiliano: Waziri Mkuu na Wizara ya Habari, pamoja na kikasha. */
function MessagingPanel({
  role,
  userId,
  depts,
}: {
  role: MinistryRole;
  userId: string;
  depts: Row[];
}) {
  const { t } = useI18n();
  const [box, setBox] = useState<"inbox" | "sent">("inbox");
  const [inbox, setInbox] = useState<InternalMessage[]>([]);
  const [sent, setSent] = useState<InternalMessage[]>([]);
  const [newsInbox, setNewsInbox] = useState<InternalMessage[]>([]);
  const [contacts, setContacts] = useState<
    Array<{ user_id: string; full_name: string; position: string }>
  >([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipient, setRecipient] = useState("");
  const [channel, setChannel] = useState<"cabinet" | "news">("cabinet");
  const [busy, setBusy] = useState(false);
  const deptMap = useMemo(() => new Map(depts.map((d) => [d.id, d.name] as const)), [depts]);

  const reload = async () => {
    const [inb, snt, news, cts] = await Promise.all([
      loadMessages({ userId, box: "inbox" }),
      loadMessages({ userId, box: "sent" }),
      role.isNewsMinistry && role.departmentId
        ? loadNewsInbox(role.departmentId)
        : Promise.resolve([] as InternalMessage[]),
      loadCabinetContacts(),
    ]);
    setInbox(inb);
    setSent(snt);
    setNewsInbox(news);
    setContacts(cts);
  };

  useEffect(() => {
    void reload();
  }, [userId, role.isNewsMinistry, role.departmentId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subject.trim().length < 3 || body.trim().length < 5) {
      toast.error(t("mw.message_too_short"));
      return;
    }
    if (channel === "cabinet" && !recipient) {
      toast.error(t("mw.choose_recipient"));
      return;
    }
    setBusy(true);
    const res = await sendMessage({
      channel,
      recipientId: channel === "cabinet" ? recipient : null,
      subject,
      body,
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error ?? t("common.error"));
      return;
    }
    toast.success(t("mw.message_sent"));
    setSubject("");
    setBody("");
    setBox("sent");
    await reload();
  };

  const openMessage = async (m: InternalMessage) => {
    if (box === "inbox" && !m.read_at) {
      await markMessageRead(m.id);
      setInbox((list) =>
        list.map((x) => (x.id === m.id ? { ...x, read_at: new Date().toISOString() } : x)),
      );
    }
  };

  const list = box === "inbox" ? inbox : sent;

  return (
    <div className="mw-panel">
      <div className="mw-panel-head">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Mail className="h-5 w-5 text-primary" /> {t("mw.messages")}
        </h2>
        <div className="mw-filters">
          <button
            type="button"
            onClick={() => setBox("inbox")}
            className={`mw-chip ${box === "inbox" ? "is-active" : ""}`}
          >
            <Inbox className="h-3.5 w-3.5" /> {t("mw.inbox")}
            {inbox.some((m) => !m.read_at) && <span className="mw-dot" />}
          </button>
          <button
            type="button"
            onClick={() => setBox("sent")}
            className={`mw-chip ${box === "sent" ? "is-active" : ""}`}
          >
            <Send className="h-3.5 w-3.5" /> {t("mw.sent")}
          </button>
        </div>
      </div>

      <div className="mw-compose">
        <form onSubmit={submit} className="mw-form">
          <h3 className="mw-subhead">{t("mw.compose")}</h3>
          <div className="mw-channel-row" role="group" aria-label={t("mw.channel")}>
            <button
              type="button"
              onClick={() => setChannel("cabinet")}
              className={`mw-channel ${channel === "cabinet" ? "is-active" : ""}`}
            >
              <BadgeCheck className="h-4 w-4" />
              <span>
                <strong>{t("mw.to_pm")}</strong>
                <small>{t("mw.to_pm_lead")}</small>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setChannel("news")}
              className={`mw-channel ${channel === "news" ? "is-active" : ""}`}
            >
              <Megaphone className="h-4 w-4" />
              <span>
                <strong>{t("mw.to_news")}</strong>
                <small>{t("mw.to_news_lead")}</small>
              </span>
            </button>
          </div>

          {channel === "cabinet" && (
            <div className="space-y-2">
              <Label htmlFor="msg-recipient">{t("mw.recipient")} *</Label>
              <select
                id="msg-recipient"
                className="mw-select w-full"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                required
              >
                <option value="">{t("mw.choose_recipient")}</option>
                {contacts.map((c) => (
                  <option key={c.user_id} value={c.user_id}>
                    {c.position} — {c.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="msg-subject">{t("mw.subject")} *</Label>
            <Input
              id="msg-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="msg-body">{t("mw.message")} *</Label>
            <Textarea
              id="msg-body"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              maxLength={5000}
            />
          </div>
          <Button type="submit" disabled={busy}>
            <Send className="mr-2 h-4 w-4" />
            {t("mw.send_message")}
          </Button>
        </form>
      </div>

      {role.isNewsMinistry && newsInbox.length > 0 && (
        <div className="mw-news-inbox">
          <h3 className="mw-subhead">
            <Megaphone className="h-4 w-4" /> {t("mw.news_requests")}
          </h3>
          <ul className="mw-list">
            {newsInbox.map((m) => (
              <li key={m.id} className="mw-message">
                <div className="mw-message-top">
                  <strong>{m.subject}</strong>
                  <span className="mw-count">
                    {new Date(m.created_at).toLocaleDateString("sw-TZ")}
                  </span>
                </div>
                <p className="mw-message-body">{m.body}</p>
                <p className="mw-message-dept">
                  {t("mw.from_ministry")}:{" "}
                  {deptMap.get(m.sender_department_id ?? "") ?? t("mw.unknown_ministry")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mw-messages">
        {list.length === 0 ? (
          <p className="mw-empty">{box === "inbox" ? t("mw.no_inbox") : t("mw.no_sent")}</p>
        ) : (
          <ul className="mw-list">
            {list.map((m) => (
              <li
                key={m.id}
                className={`mw-message ${box === "inbox" && !m.read_at ? "is-unread" : ""}`}
              >
                <div className="mw-message-top">
                  <strong>{m.subject}</strong>
                  <span className="mw-count">
                    {new Date(m.created_at).toLocaleDateString("sw-TZ")}
                  </span>
                </div>
                <p className="mw-message-body">{m.body}</p>
                <p className="mw-message-dept">
                  {m.channel === "news"
                    ? t("mw.channel_news")
                    : (deptMap.get(m.sender_department_id ?? "") ?? t("mw.channel_direct"))}
                </p>
                {box === "inbox" && !m.read_at && (
                  <Button size="sm" variant="outline" onClick={() => openMessage(m)}>
                    {t("mw.mark_read")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
