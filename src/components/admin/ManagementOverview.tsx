import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock,
  HeartHandshake,
  Landmark,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useResolvedUrl } from "@/lib/storage-url";
import { useI18n } from "@/lib/i18n";

type Row = Record<string, any>;

const STATUS_KEY: Record<string, string> = {
  pending: "status.pending",
  needs_correction: "status.needs_correction",
  forwarded: "status.forwarded",
  approved: "status.approved",
  rejected: "status.rejected",
};

const STATUS_TONE: Record<string, string> = {
  pending: "var(--accent)",
  needs_correction: "var(--destructive)",
  forwarded: "var(--primary)",
  approved: "var(--primary)",
  rejected: "var(--muted-foreground)",
};

export type ManagementOverviewProps = {
  isAdmin: boolean;
  displayName: string;
  departmentName: string | null;
  deptSubs: Row[];
  challenges: Row[];
  loans: Row[];
  deaths: Row[];
  leaderApps: Row[];
  onOpenTab: (tab: string) => void;
};

/**
 * Dashibodi ya muhtasari ya menejimenti na viongozi.
 * Kila kiongozi anayeidhinishwa huona hapa paneli yake yenye takwimu za idara yake.
 */
export function ManagementOverview(props: ManagementOverviewProps) {
  const { t } = useI18n();
  const { isAdmin, displayName, departmentName, onOpenTab } = props;
  const [meta, setMeta] = useState<{ position: string | null; registrationNumber: string | null }>({
    position: null,
    registrationNumber: null,
  });
  const [ownProfile, setOwnProfile] = useState<Row | null>(null);
  const photo = useResolvedUrl(ownProfile?.photo_url ?? null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !alive) return;
      const name: string = user.user_metadata?.full_name ?? "";
      setMeta({
        position: user.user_metadata?.position ?? null,
        registrationNumber: user.user_metadata?.registration_number ?? null,
      });
      if (isAdmin) return;
      // Wasifu wa umma huundwa na menejimenti; tunauunganisha kwa jina kamili.
      // `%` na `_` ni wildcards za ILIKE, hivyo tunaziepusha.
      const { data: linked } = await (supabase.from("leaders") as any)
        .select("id,slug,full_name,position,photo_url,published")
        .eq("user_id", user.id)
        .maybeSingle();
      if (linked || !name) {
        if (alive) setOwnProfile(linked ?? null);
        return;
      }
      // Wasifu wa zamani haujaunganishwa na akaunti; tunaulinganisha kwa jina kamili.
      // `%` na `_` ni wildcards za ILIKE, hivyo tunaziepusha.
      const pattern = name.trim().replace(/[%_\\]/g, "\\$&");
      const { data } = await (supabase.from("leaders") as any)
        .select("id,slug,full_name,position,photo_url,published")
        .ilike("full_name", pattern)
        .limit(1)
        .maybeSingle();
      if (alive) setOwnProfile(data ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [isAdmin]);

  const requests = isAdmin
    ? [...props.deptSubs, ...props.challenges, ...props.loans, ...props.deaths]
    : [...props.deptSubs, ...props.challenges];

  const byStatus = requests.reduce<Record<string, number>>((acc, r) => {
    const k = String(r.status ?? "pending");
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const pending = byStatus.pending ?? 0;
  const completed = (byStatus.approved ?? 0) + (byStatus.forwarded ?? 0);
  const rejected = byStatus.rejected ?? 0;
  const total = requests.length || 1;

  const recent = [...requests]
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
    .slice(0, 6);

  const kpis = [
    {
      label: t("mgmt.kpi_total"),
      value: requests.length,
      icon: ClipboardList,
      accent: "var(--primary)",
    },
    { label: t("status.pending"), value: pending, icon: Clock, accent: "var(--accent)" },
    {
      label: t("mgmt.kpi_completed"),
      value: completed,
      icon: CheckCircle2,
      accent: "oklch(0.55 0.14 155)",
    },
    { label: t("status.rejected"), value: rejected, icon: XCircle, accent: "var(--destructive)" },
  ];

  const actions = isAdmin
    ? [
        { label: t("mgmt.tab_student_services"), tab: "deptsubs", icon: ClipboardList },
        { label: t("mgmt.tab_challenges"), tab: "challenges", icon: MessageSquare },
        { label: t("mgmt.tab_loans"), tab: "loans", icon: Landmark },
        { label: t("mgmt.tab_deaths"), tab: "deaths", icon: HeartHandshake },
        { label: t("mgmt.tab_announce"), tab: "announce", icon: MessageSquare },
        { label: t("mgmt.tab_departments"), tab: "departments", icon: Building2 },
        { label: t("mgmt.tab_leaders"), tab: "leaders", icon: ShieldCheck },
        { label: t("mgmt.tab_leader_apps"), tab: "leaderapps", icon: UserCheck },
      ]
    : [
        { label: t("mgmt.tab_my_dept_subs"), tab: "deptsubs", icon: ClipboardList },
        { label: t("mgmt.tab_my_dept_challenges"), tab: "challenges", icon: MessageSquare },
        { label: t("mgmt.tab_categories"), tab: "categories", icon: BadgeCheck },
        { label: t("mgmt.tab_my_department"), tab: "departments", icon: Building2 },
        { label: t("mgmt.tab_password"), tab: "password", icon: ShieldCheck },
      ];

  const pendingApps = props.leaderApps.filter((a) => a.status === "pending").length;
  const initials = (displayName || (isAdmin ? t("mgmt.management") : t("mgmt.leader")))
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div className="mt-6 space-y-6">
      <section className="mgmt-hero">
        <div className="mgmt-hero-inner flex flex-wrap items-center gap-5">
          <div className="mgmt-avatar">
            {photo ? <img src={photo} alt={displayName} /> : <span>{initials || "MU"}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <span className="mgmt-chip">
              <BadgeCheck className="h-3.5 w-3.5" />
              {isAdmin ? t("mgmt.management") : t("mgmt.leader_approved")}
            </span>
            <h2 className="mt-3 text-2xl font-black leading-tight md:text-3xl">
              {t("mgmt.welcome")},{" "}
              {displayName || (isAdmin ? t("mgmt.management") : t("mgmt.leader"))}
            </h2>
            <p className="mt-2 text-sm text-primary-foreground/85 md:text-base">
              {isAdmin
                ? t("mgmt.overview_sub_admin")
                : `Paneli yako ya ${departmentName ?? "idara"} — shughulikia maombi ya wanafunzi wa idara yako.`}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {!isAdmin && meta.position && (
                <span className="mgmt-chip">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {meta.position}
                </span>
              )}
              {departmentName && (
                <span className="mgmt-chip">
                  <Building2 className="h-3.5 w-3.5" />
                  {departmentName}
                </span>
              )}
              {meta.registrationNumber && (
                <span className="mgmt-chip">REG: {meta.registrationNumber}</span>
              )}
              {isAdmin && pendingApps > 0 && (
                <span className="mgmt-chip">
                  <UserCheck className="h-3.5 w-3.5" />
                  {pendingApps} maombi ya viongozi
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <button
            key={k.label}
            type="button"
            onClick={() => onOpenTab("deptsubs")}
            className="mgmt-kpi text-left"
            style={{ ["--kpi-accent" as string]: k.accent }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{k.label}</p>
                <p className="mgmt-kpi-value mt-2 text-foreground">{k.value}</p>
              </div>
              <span className="mgmt-kpi-icon">
                <k.icon className="h-5 w-5" />
              </span>
            </div>
          </button>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section className="mgmt-panel">
          <div className="mgmt-panel-head">
            <div>
              <h3 className="font-bold">Maombi ya Hivi Karibuni</h3>
              <p className="text-xs text-muted-foreground">
                {isAdmin
                  ? t("mgmt.from_all")
                  : `${t("mgmt.from")} ${departmentName ?? t("mgmt.your_dept")}`}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => onOpenTab("deptsubs")}>
              Ona yote <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
          <div className="p-2">
            {recent.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                Hakuna maombi bado.
              </p>
            ) : (
              recent.map((r) => {
                const status = String(r.status ?? "pending");
                const who = r.full_name ?? r.student_name ?? r.deceased_name ?? t("mgmt.applicant");
                return (
                  <div key={r.id} className="mgmt-row">
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold"
                      style={{
                        background: `color-mix(in oklab, ${STATUS_TONE[status] ?? "var(--primary)"} 16%, transparent)`,
                        color: STATUS_TONE[status] ?? "var(--primary)",
                      }}
                    >
                      {String(who).slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{who}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {r.registration_number ?? "—"} •{" "}
                        {r.category ?? r.challenge_type ?? r.problem_type ?? t("mgmt.request")}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-semibold">
                        {t(STATUS_KEY[status] ?? "") || status}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString("sw-TZ") : ""}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="mgmt-panel">
            <div className="mgmt-panel-head">
              <h3 className="font-bold">Hali ya Maombi</h3>
            </div>
            <div className="space-y-4 p-4">
              {(["pending", "forwarded", "approved", "rejected"] as const).map((k) => {
                const value = byStatus[k] ?? 0;
                const pct = Math.round((value / total) * 100);
                return (
                  <div key={k}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium">{t(STATUS_KEY[k] ?? "") || k}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {value} ({pct}%)
                      </span>
                    </div>
                    <div className="mgmt-bar">
                      <span style={{ width: `${pct}%`, background: STATUS_TONE[k] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mgmt-panel">
            <div className="mgmt-panel-head">
              <h3 className="font-bold">Njia za Haraka</h3>
            </div>
            <div className="grid gap-2 p-4 sm:grid-cols-2">
              {actions.map((a) => (
                <button
                  key={a.tab}
                  type="button"
                  className="mgmt-action"
                  onClick={() => onOpenTab(a.tab)}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <a.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{a.label}</span>
                </button>
              ))}
            </div>
          </section>

          {!isAdmin && (
            <section className="mgmt-panel">
              <div className="mgmt-panel-head">
                <h3 className="font-bold">{t("mgmt.my_profile")}</h3>
                <div className="flex flex-wrap items-center gap-2">
                  {ownProfile?.slug && ownProfile.published && (
                    <Link to="/viongozi/$slug" params={{ slug: ownProfile.slug }}>
                      <Button size="sm" variant="outline">
                        {t("mgmt.open")} <ArrowRight className="ml-1.5 h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                  <Button size="sm" className="btn-3d" onClick={() => onOpenTab("myprofile")}>
                    {t("mgmt.edit_profile")}
                  </Button>
                </div>
              </div>
              <div className="p-4 text-sm">
                {ownProfile ? (
                  <dl className="space-y-2.5">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{t("common.name")}</dt>
                      <dd className="text-right font-medium">{ownProfile.full_name}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{t("leaders.role_label")}</dt>
                      <dd className="text-right font-medium">{ownProfile.position}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{t("common.status")}</dt>
                      <dd className="text-right font-medium">
                        {ownProfile.published
                          ? t("mgmt.profile_visible")
                          : t("mgmt.profile_hidden")}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <div className="space-y-3">
                    <p className="text-muted-foreground">{t("mgmt.no_profile")}</p>
                    <Button size="sm" variant="outline" onClick={() => onOpenTab("myprofile")}>
                      {t("mgmt.edit_profile")} <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
