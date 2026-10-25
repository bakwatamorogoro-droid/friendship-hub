import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Landmark,
  Search,
  Send,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { kindLabel, stageIndex, STAGE_STEPS, statusTone } from "@/lib/request-stage";
import {
  loadStudentOverview,
  submitApproval,
  type ApprovalRequest,
  type StudentOverview,
  type StudentRequest,
} from "@/lib/ministry";

/**
 * Ufuatiliaji wa mwanafunzi: taarifa zake, maombi yake yote, hatua iliyofikiwa
 * na historia kamili ya mabadiliko.
 */
export function StudentTracker({ depts }: { depts: Array<{ id?: string; name?: string }> }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<StudentOverview | null>(null);
  const [searched, setSearched] = useState(false);
  const [approvalFor, setApprovalFor] = useState<StudentRequest | null>(null);
  const [approvalOpen, setApprovalOpen] = useState(false);

  const deptMap = useMemo(
    () =>
      new Map(
        depts.filter((d) => d.id && d.name).map((d) => [d.id as string, d.name as string] as const),
      ),
    [depts],
  );

  const run = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const reg = query.trim();
    if (reg.length < 3) {
      toast.error(t("mw.student_missing"));
      return;
    }
    setLoading(true);
    const res = await loadStudentOverview(reg);
    setLoading(false);
    setSearched(true);
    setOverview(res);
    if (!res?.student) {
      toast.error(t("mw.student_missing"));
    }
  };

  return (
    <div className="mw-tools">
      <form onSubmit={run} className="mw-searchbar">
        <div className="mw-field">
          <Label className="mw-field-label" htmlFor="student-reg">
            {t("mw.reg_number")}
          </Label>
          <Input
            id="student-reg"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("mw.reg_placeholder")}
            className="font-mono uppercase tracking-wide"
            autoComplete="off"
          />
        </div>
        <Button type="submit" disabled={loading} className="font-semibold">
          <Search className="mr-2 h-4 w-4" />
          {t("mw.track_student")}
        </Button>
        <p className="w-full text-xs text-muted-foreground">{t("mw.track_student_lead")}</p>
      </form>

      {searched && !overview?.student && (
        <div className="mw-empty-state">
          <span className="mw-empty-icon">
            <UserRound className="h-5 w-5" />
          </span>
          <p className="mw-empty-title">{t("mw.student_missing")}</p>
        </div>
      )}

      {overview?.student && (
        <>
          <section className="mw-student" aria-label={t("mw.student_found")}>
            <div className="mw-student-id">
              <span className="mw-student-avatar">
                {overview.student.full_name
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase())
                  .join("") || "MW"}
              </span>
              <div className="min-w-0">
                <p className="mw-student-name">{overview.student.full_name}</p>
                <p className="mw-student-reg">{overview.student.registration_number}</p>
                <span className="mw-tag mt-2">
                  <GraduationCap className="h-3 w-3" /> {overview.student.course}
                </span>
              </div>
            </div>
            <div className="mw-stats">
              <div className="mw-stat">
                <p className="mw-stat-key">{t("mw.yos")}</p>
                <p className="mw-stat-value">{overview.student.year_of_study}</p>
              </div>
              <div className="mw-stat">
                <p className="mw-stat-key">{t("mw.phone")}</p>
                <p className="mw-stat-value">{overview.student.phone}</p>
              </div>
              <div className="mw-stat">
                <p className="mw-stat-key">{t("mw.student_requests")}</p>
                <p className="mw-stat-value">{overview.requests.length}</p>
              </div>
              <div className="mw-stat">
                <p className="mw-stat-key">{t("mw.approvals")}</p>
                <p className="mw-stat-value">{overview.approvals.length}</p>
              </div>
            </div>
          </section>

          <section className="mw-panel" aria-label={t("mw.student_requests")}>
            <div className="mw-panel-head">
              <h3 className="mw-subhead">
                <ClipboardList className="h-4 w-4 text-primary" /> {t("mw.student_requests")}
              </h3>
              <span className="mw-count">{overview.requests.length}</span>
            </div>
            {overview.requests.length === 0 ? (
              <p className="mw-empty">{t("mw.no_student_requests")}</p>
            ) : (
              <ul className="mw-list">
                {overview.requests.map((r) => (
                  <li key={`${r.kind}-${r.id}`} className="mw-request">
                    <div className="mw-request-top">
                      <div className="min-w-0">
                        <p className="mw-request-name">{r.title}</p>
                        <p className="mw-request-meta">
                          {new Date(r.created_at).toLocaleDateString("sw-TZ", {
                            dateStyle: "long",
                          })}
                          {r.department_id && deptMap.get(r.department_id)
                            ? ` · ${deptMap.get(r.department_id)}`
                            : ""}
                        </p>
                      </div>
                      <span className={`mw-badge ${statusTone(r.status)}`}>
                        {STAGE_STEPS[stageIndex(r.status)] &&
                          t(STAGE_STEPS[stageIndex(r.status)].labelKey)}
                      </span>
                    </div>

                    {r.description && <p className="mw-request-desc">{r.description}</p>}

                    <span className="mw-request-type">
                      {r.kind === "mikopo" ? (
                        <Landmark className="h-3 w-3" />
                      ) : r.kind === "changamoto" ? (
                        <AlertTriangle className="h-3 w-3" />
                      ) : (
                        <ClipboardList className="h-3 w-3" />
                      )}
                      {kindLabel(r.kind, t)}
                    </span>

                    <div className="mw-progress">
                      <div className="mw-progress-track">
                        <div
                          className="mw-progress-fill"
                          style={{ width: `${((stageIndex(r.status) + 1) / 4) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="mw-approval-actions">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setApprovalFor(r);
                          setApprovalOpen(true);
                        }}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        {t("mw.submit_approval")}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mw-panel" aria-label={t("mw.history")}>
            <div className="mw-panel-head">
              <h3 className="mw-subhead">
                <CalendarClock className="h-4 w-4 text-primary" /> {t("mw.history")}
              </h3>
              <span className="mw-count">{overview.history.length}</span>
            </div>
            {overview.history.length === 0 ? (
              <p className="mw-empty">{t("mw.no_history")}</p>
            ) : (
              <ul className="mw-timeline mw-list">
                {overview.history.map((h) => (
                  <li key={h.id} className="mw-timeline-item">
                    <span className="mw-timeline-dot">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                    <div className="mw-timeline-body">
                      <p className="mw-timeline-title">
                        {kindLabel(h.kind, t)} ·{" "}
                        {STAGE_STEPS[stageIndex(h.status)]
                          ? t(STAGE_STEPS[stageIndex(h.status)].labelKey)
                          : h.status}
                      </p>
                      {h.note && <p className="mw-timeline-note">{h.note}</p>}
                      <p className="mw-timeline-note">
                        {new Date(h.created_at).toLocaleString("sw-TZ")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {approvalOpen && approvalFor && overview?.student && (
        <ApprovalDialog
          request={approvalFor}
          student={overview.student}
          onClose={() => setApprovalOpen(false)}
          onDone={() => {
            setApprovalOpen(false);
            void run();
          }}
        />
      )}
    </div>
  );
}

/** Ombi la idhini la kiongozi kwa Wizara ya Habari. */
function ApprovalDialog({
  request,
  student,
  onClose,
  onDone,
}: {
  request: StudentRequest;
  student: NonNullable<StudentOverview["student"]>;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState(request.title);
  const [summary, setSummary] = useState(request.description ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3) {
      toast.error(t("mw.message_too_short"));
      return;
    }
    setBusy(true);
    const res = await submitApproval({
      kind: (["mikopo", "changamoto", "idara", "misiba", "mengine"] as const).includes(
        request.kind as ApprovalRequest["kind"],
      )
        ? (request.kind as ApprovalRequest["kind"])
        : "mengine",
      registrationNumber: student.registration_number,
      studentName: student.full_name,
      title,
      summary,
      requestId: request.id,
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error ?? t("common.error"));
      return;
    }
    toast.success(t("mw.approval_sent"));
    onDone();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("mw.new_approval")}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="mw-panel w-full max-w-lg"
      >
        <div className="mw-panel-head">
          <h3 className="mw-subhead">
            <Send className="h-4 w-4 text-primary" /> {t("mw.new_approval")}
          </h3>
          <span className="mw-count">{kindLabel(request.kind, t)}</span>
        </div>
        <div className="mw-form">
          <div className="mw-field">
            <Label className="mw-field-label" htmlFor="ap-title">
              {t("mw.approval_title")}
            </Label>
            <Input
              id="ap-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
          </div>
          <div className="mw-field">
            <Label className="mw-field-label" htmlFor="ap-summary">
              {t("mw.approval_summary")}
            </Label>
            <textarea
              id="ap-summary"
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              maxLength={2000}
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <p className="mw-form-lead">
            {student.full_name} · {student.registration_number}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              <Send className="mr-2 h-4 w-4" />
              {t("mw.submit_approval")}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
