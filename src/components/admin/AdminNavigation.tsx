import { Link } from "@tanstack/react-router";
import {
  ClipboardList,
  MessageSquare,
  Landmark,
  HeartHandshake,
  Megaphone,
  Image,
  Building2,
  GraduationCap,
  Phone,
  Link2,
  Settings2,
  ListChecks,
  Users,
  ShieldCheck,
  UserCheck,
  KeyRound,
  PanelLeftClose,
  PanelLeftOpen,
  Home,
  LayoutDashboard,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";

type Scope = "all" | "admin" | "leader";
type Item = readonly [value: string, labelKey: string, Icon: typeof Home, scope: Scope];

const OVERVIEW: Item[] = [["dashibodi", "mgmt.tab_dashboard", LayoutDashboard, "all"]];

const REQUESTS: Item[] = [
  ["deptsubs", "mgmt.tab_student_services", ClipboardList, "all"],
  ["challenges", "mgmt.tab_challenges", MessageSquare, "all"],
  ["loans", "mgmt.tab_loans", Landmark, "admin"],
  ["deaths", "mgmt.tab_deaths", HeartHandshake, "admin"],
];

const CONTENT: Item[] = [
  ["announce", "mgmt.tab_announce", Megaphone, "all"],
  ["banner", "mgmt.tab_banner", Image, "admin"],
  ["graduations", "mgmt.tab_grad", GraduationCap, "admin"],
  ["links", "mgmt.tab_links", Link2, "admin"],
];

const SETUP: Item[] = [
  ["myprofile", "mgmt.tab_my_profile", UserRound, "leader"],
  ["departments", "mgmt.tab_departments", Building2, "all"],
  ["categories", "mgmt.tab_categories", ListChecks, "all"],
  ["services", "mgmt.tab_services", Settings2, "admin"],
  ["settings", "mgmt.tab_contact", Phone, "admin"],
];

const PEOPLE: Item[] = [
  ["leaderapps", "mgmt.tab_leader_apps", UserCheck, "admin"],
  ["leaders", "mgmt.tab_leaders", ShieldCheck, "admin"],
  ["users", "mgmt.tab_users", Users, "admin"],
  ["password", "mgmt.tab_password", KeyRound, "all"],
];

export function AdminNavigation({
  isAdmin,
  collapsed,
  toggle,
  counts,
}: {
  isAdmin: boolean;
  collapsed: boolean;
  toggle: () => void;
  counts: Record<string, number>;
}) {
  const { t } = useI18n();

  const groups: Array<{ label: string; items: Item[] }> = [
    { label: "", items: OVERVIEW },
    { label: t("mgmt.group_requests"), items: REQUESTS },
    { label: t("mgmt.group_content"), items: CONTENT },
    { label: t("mgmt.group_settings"), items: SETUP },
    { label: t("mgmt.group_people"), items: PEOPLE },
  ];

  const renderItem = ([value, labelKey, Icon]: Item) => {
    const label = value === "departments" && !isAdmin ? t("mgmt.tab_my_department") : t(labelKey);
    return (
      <TabsTrigger
        key={value}
        value={value}
        title={label}
        aria-label={label}
        className="management-nav-item"
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 whitespace-normal text-left">{label}</span>
            {counts[value] !== undefined && (
              <span className="text-xs tabular-nums opacity-70">{counts[value]}</span>
            )}
          </>
        )}
      </TabsTrigger>
    );
  };

  return (
    <aside className={`management-sidebar ${collapsed ? "is-collapsed" : ""}`}>
      <div className="flex h-20 items-center gap-3 border-b border-sidebar-border px-4">
        <img src="/favicon.png" alt="MUMSO" className="h-9 w-9 shrink-0 object-contain" />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">MUMSO</p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {isAdmin ? t("mgmt.management") : t("mgmt.leader")}
            </p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-3 py-3">
        {!collapsed && (
          <span className="text-xs font-semibold text-sidebar-foreground/60">{t("mgmt.menu")}</span>
        )}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={toggle}
          title={t("mgmt.menu")}
          aria-label={t("mgmt.menu")}
        >
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        </Button>
      </div>
      <TabsList aria-label={t("mgmt.menu")} className="management-nav">
        {groups.map((g) => {
          const items = g.items.filter(
            ([, , , scope]) => scope === "all" || (scope === "admin" ? isAdmin : !isAdmin),
          );
          if (!items.length) return null;
          return (
            <div key={g.label || "overview"} className="contents">
              {g.label && !collapsed && <p className="management-nav-group">{g.label}</p>}
              {g.label && collapsed && <div className="my-2 h-px bg-sidebar-border" aria-hidden />}
              {items.map(renderItem)}
            </div>
          );
        })}
      </TabsList>
      <div className="mt-auto border-t border-sidebar-border">
        <Link
          to="/"
          className="flex items-center gap-3 px-5 py-5 text-sm text-sidebar-foreground/70 transition hover:text-sidebar-foreground"
          title={t("mgmt.site")}
        >
          <Home className="h-4 w-4 shrink-0" />
          {!collapsed && t("mgmt.site")}
        </Link>
      </div>
    </aside>
  );
}
