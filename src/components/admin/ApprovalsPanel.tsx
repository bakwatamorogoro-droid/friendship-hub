import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardCheck, Clock, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import {
  decideApproval,
  loadApprovals,
  submitApproval,
  type ApprovalRequest,
} from "@/lib/ministry";
import { APPROVAL_KINDS, kindLabel } from "@/lib/request-stage";

const FILTERS = ["all", "submitted", "approved", "rejected"] as const;
type Filter = (typeof FILTERS)[number];

function approvalTone(status: ApprovalRequest["status"]): string {
  switch (status) {
    case "approved":
      return "mw-badge-approved";
    case "rejected":
      return "mw-badge-rejected";
    default:
      return "mw-badge-pending";
  }
}

/**
 * Sehemu ya idhini: viongozi huwasilisha maombi, na Wizara ya Habari
 * (pamoja na menejimenti) huyaidhinisha au kuyakataa.
 */
export function ApprovalsPanel({ canDecide, userId }: { canDecide: boolean; userId: string }) {
  const { t } = useI18n();
  const [rows, setRows] = useState<ApprovalRequest[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    kind: "mikopo" as ApprovalRequest["kind"],
    registrationNumber: "",
    studentName: "",
    title: "",
    summary: "",
  });
  const [sending, setSending] = useState(false);

  const reload = async () => {
    setLoading(true);
    setRows(await loadApprovals());
    setLoading(false);
  };

  useEffect(() => {
    void reload();
  }, [userId]);

  const decide = async (row: ApprovalRequest, status: "approved" | "rejected") => {
    setBusy(row.id);
    const res = await decideApproval(row.id, status, notes[row.id]);
    setBusy(null);
    if (!res.ok) {
      toast.error(res.error ?? t("common.error"));
      return;
    }
    toast.success(t("mw.approval_decided"));
    await reload();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.title.trim().length < 3) {
      toast.error(t("mw.message_too_short"));
      return;
    }
    setSending(true);
    const res = await submitApproval(form);
    setSending(false);
    if (!res.ok) {
      toast.error(res.error ?? t("common.error"));
      return;
    }
    toast.success(t("mw.approval_sent"));
    setForm({ kind: "mikopo", registrationNumber: "", studentName: "", title: "", summary: "" });
    await reload();
  };

  const visible = filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const pendingCount = rows.filter(
    (r) => r.status === "submitted" || r.status === "pending",
  ).length;

  return (
    <div className="mw-tools">
      <section className="mw-panel" aria-label={t("mw.new_approval")}>
        <div className="mw-panel-head">
          <h3 className="mw-subhead">
            <Send className="h-4 w-4 text-primary" /> {t("mw.new_approval")}
          </h3>
          <span className="mw-count">{t("mw.waiting_news")}</span>
        </div>
        <form onSubmit={submit} className="mw-form">
          <p className="mw-form-lead">{t("mw.approvals_lead")}</p>
          <div className="mw-channel-row">
            <div className="mw-field">
              <Label className="mw-field-label" htmlFor="ap-kind">
                {t("mw.approval_kind")}
              </Label>
              <select
                id="ap-kind"
                className="mw-select w-full"
                value={form.kind}
                onChange={(e) =>
                  setForm({ ...form, kind: e.target.value as ApprovalRequest["kind"] })
                }
              >
                {APPROVAL_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {kindLabel(k, t)}
                  </option>
                ))}
              </select>
            </div>
            <div className="mw-field">
              <Label className="mw-field-label" htmlFor="ap-reg">
                {t("mw.reg_number")}
              </Label>
              <Input
                id="ap-reg"
                value={form.registrationNumber}
                onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
                className="font-mono uppercase"
              />
            </div>
            <div className="mw-field">
              <Label className="mw-field-label" htmlFor="ap-student">
                {t("mw.student_found")}
              </Label>
              <Input
                id="ap-student"
                value={form.studentName}
                onChange={(e) => setForm({ ...form, studentName: e.target.value })}
              />
            </div>
          </div>
          <div className="mw-field">
            <Label className="mw-field-label" htmlFor="ap-title">
              {t("mw.approval_title")}
            </Label>
            <Input
              id="ap-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={200}
              required
            />
          </div>
          <div className="mw-field">
            <Label className="mw-field-label" htmlFor="ap-summary">
              {t("mw.approval_summary")}
            </Label>
            <Textarea
              id="ap-summary"
              rows={3}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              maxLength={2000}
            />
          </div>
          <div>
            <Button type="submit" disabled={sending}>
              <Send className="mr-2 h-4 w-4" />
              {t("mw.submit_approval")}
            </Button>
          </div>
        </form>
      </section>

      <section className="mw-panel" aria-label={t("mw.approvals")}>
        <div className="mw-panel-head">
          <h3 className="mw-subhead">
            <ClipboardCheck className="h-4 w-4 text-primary" /> {t("mw.approvals")}
          </h3>
          <div className="mw-filters">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`mw-chip ${filter === f ? "is-active" : ""}`}
              >
                {f === "all"
                  ? t("mw.all")
                  : f === "submitted"
                    ? t("mw.status_submitted")
                    : f === "approved"
                      ? t("mw.status_approved")
                      : t("mw.status_rejected")}
                {f === "submitted" && pendingCount > 0 && (
                  <span className="mw-chip-n">{pendingCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="mw-empty">{t("common.loading")}</p>
        ) : visible.length === 0 ? (
          <div className="mw-empty-state">
            <span className="mw-empty-icon">
              <Clock className="h-5 w-5" />
            </span>
            <p className="mw-empty-title">{t("mw.no_approvals")}</p>
          </div>
        ) : (
          <ul className="mw-list">
            {visible.map((row) => (
              <li key={row.id} className="mw-approval">
                <div className="mw-approval-top">
                  <div className="min-w-0">
                    <p className="mw-approval-title">{row.title}</p>
                    <p className="mw-approval-meta">
                      {kindLabel(row.kind, t)}
                      {row.registration_number ? ` · ${row.registration_number}` : ""}
                      {row.student_name ? ` · ${row.student_name}` : ""}
                    </p>
                    <p className="mw-approval-meta">
                      {new Date(row.created_at).toLocaleString("sw-TZ")}
                    </p>
                  </div>
                  <span className={`mw-badge ${approvalTone(row.status)}`}>
                    {row.status === "approved"
                      ? t("mw.status_approved")
                      : row.status === "rejected"
                        ? t("mw.status_rejected")
                        : t("mw.status_submitted")}
                  </span>
                </div>

                {row.summary && <p className="mw-approval-summary">{row.summary}</p>}

                {row.decision_note && (
                  <p className="mw-approval-meta mt-2">
                    {t("mw.decision_note")}: {row.decision_note}
                  </p>
                )}

                {canDecide && row.status !== "approved" && row.status !== "rejected" && (
                  <div className="mw-approval-actions">
                    <Input
                      aria-label={t("mw.decision_note")}
                      placeholder={t("mw.decision_note")}
                      value={notes[row.id] ?? ""}
                      onChange={(e) => setNotes({ ...notes, [row.id]: e.target.value })}
                      maxLength={500}
                      className="max-w-sm"
                    />
                    <Button
                      size="sm"
                      disabled={busy === row.id}
                      onClick={() => decide(row, "approved")}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {t("mw.approve")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === row.id}
                      onClick={() => decide(row, "rejected")}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      {t("mw.reject")}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
