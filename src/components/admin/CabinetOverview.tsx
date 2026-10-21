import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Building2, ClipboardList, Crown, FileText, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import {
  formatWeek,
  loadReports,
  weekStart,
  type MinistryReport,
  type MinistryRole,
} from "@/lib/ministry";

type Row = Record<string, any>;

/**
 * Muhtasari wa Rais na Waziri Mkuu: kila wizara huonekana na ripoti yake ya
 * wiki pamoja na idadi ya maombi, ili waone kwa haraka nani amefanya kazi.
 */
export function CabinetOverview({
  role,
  depts,
  currentDepartmentId,
}: {
  role: MinistryRole;
  depts: Row[];
  currentDepartmentId: string | null;
}) {
  const { t } = useI18n();
  const [reports, setReports] = useState<MinistryReport[]>([]);
  const [counts, setCounts] = useState<Record<string, { subs: number; challenges: number }>>({});
  const [loading, setLoading] = useState(true);

  const currentWeek = weekStart();

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const all = await loadReports({ all: true });
      if (!alive) return;
      setReports(all);

      const [subsRes, chalsRes] = await Promise.all([
        (supabase.from("department_submissions") as any).select("department_id"),
        (supabase.from("challenges") as any).select("department_id"),
      ]);
      if (!alive) return;
      const map: Record<string, { subs: number; challenges: number }> = {};
      ((subsRes.data ?? []) as Row[]).forEach((r) => {
        if (!r.department_id) return;
        map[r.department_id] = map[r.department_id] ?? { subs: 0, challenges: 0 };
        map[r.department_id].subs += 1;
      });
      ((chalsRes.data ?? []) as Row[]).forEach((r) => {
        if (!r.department_id) return;
        map[r.department_id] = map[r.department_id] ?? { subs: 0, challenges: 0 };
        map[r.department_id].challenges += 1;
      });
      setCounts(map);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const byDept = useMemo(() => {
    const m = new Map<string, MinistryReport>();
    reports.forEach((r) => {
      if (r.week_start !== currentWeek) return;
      if (!m.has(r.department_id)) m.set(r.department_id, r);
    });
    return m;
  }, [reports, currentWeek]);

  const ministries = depts.filter((d) => d.active !== false);
  const reporting = ministries.filter((d) => byDept.has(d.id)).length;
  const totalHandled = Array.from(byDept.values()).reduce(
    (sum, r) => sum + (r.requests_handled ?? 0),
    0,
  );

  return (
    <div className="mw-panel cabinet-panel">
      <div className="mw-panel-head">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          {role.isPresident ? (
            <Crown className="h-5 w-5 text-primary" />
          ) : (
            <BadgeCheck className="h-5 w-5 text-primary" />
          )}
          {t("mw.cabinet_title")}
        </h2>
        <span className="mw-count">{formatWeek(currentWeek)}</span>
      </div>

      <div className="cabinet-kpis">
        <div className="cabinet-kpi">
          <span className="cabinet-kpi-value">
            {reporting}/{ministries.length}
          </span>
          <span className="cabinet-kpi-label">{t("mw.reported_this_week")}</span>
        </div>
        <div className="cabinet-kpi">
          <span className="cabinet-kpi-value">{totalHandled}</span>
          <span className="cabinet-kpi-label">{t("mw.handled_total")}</span>
        </div>
      </div>

      {loading ? (
        <p className="mw-empty">{t("common.loading")}</p>
      ) : ministries.length === 0 ? (
        <p className="mw-empty">{t("mw.no_ministries")}</p>
      ) : (
        <ul className="cabinet-grid">
          {ministries.map((d) => {
            const report = byDept.get(d.id);
            const c = counts[d.id] ?? { subs: 0, challenges: 0 };
            const isMine = d.id === currentDepartmentId;
            return (
              <li key={d.id} className={`cabinet-card ${isMine ? "is-mine" : ""}`}>
                <div className="cabinet-card-head">
                  <Building2 className="h-4 w-4 text-primary" />
                  <h3>{d.name}</h3>
                  {report ? (
                    <span className="cabinet-status is-done">{t("mw.reported")}</span>
                  ) : (
                    <span className="cabinet-status">{t("mw.not_reported")}</span>
                  )}
                </div>
                <div className="cabinet-card-stats">
                  <span>
                    <ClipboardList className="h-3.5 w-3.5" /> {c.subs}
                  </span>
                  <span>
                    <MessageSquare className="h-3.5 w-3.5" /> {c.challenges}
                  </span>
                  {report && (
                    <span>
                      <FileText className="h-3.5 w-3.5" /> {report.requests_handled}
                    </span>
                  )}
                </div>
                {report ? (
                  <p className="cabinet-card-body">{report.summary}</p>
                ) : (
                  <p className="cabinet-card-body is-muted">{t("mw.awaiting_report")}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
