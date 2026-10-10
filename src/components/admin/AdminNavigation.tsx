import { Link } from "@tanstack/react-router";
import { ClipboardList, MessageSquare, Landmark, HeartHandshake, Megaphone, Image, Building2, GraduationCap, Phone, Link2, Settings2, ListChecks, Users, ShieldCheck, UserCheck, KeyRound, PanelLeftClose, PanelLeftOpen, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

const items = [
  ["deptsubs", "Huduma za Wanafunzi", ClipboardList, false], ["challenges", "Changamoto", MessageSquare, false],
  ["loans", "Mikopo", Landmark, true], ["deaths", "Misiba", HeartHandshake, true],
  ["announce", "Matangazo", Megaphone, false], ["banner", "Picha za Mwanzo", Image, true],
  ["departments", "Wizara / Idara", Building2, false], ["graduations", "Mahafali", GraduationCap, true],
  ["settings", "Mawasiliano", Phone, true], ["links", "Tovuti Muhimu", Link2, true],
  ["services", "Mipangilio ya Huduma", Settings2, true], ["categories", "Fomu za Idara", ListChecks, false],
  ["users", "Watumiaji", Users, true], ["leaders", "Viongozi", ShieldCheck, true],
  ["leaderapps", "Usajili wa Viongozi", UserCheck, true], ["password", "Nenosiri", KeyRound, false],
] as const;

export function AdminNavigation({ isAdmin, collapsed, toggle, counts }: { isAdmin: boolean; collapsed: boolean; toggle: () => void; counts: Record<string, number> }) {
  return <aside className={`management-sidebar ${collapsed ? "is-collapsed" : ""}`}>
    <div className="flex h-20 items-center gap-3 border-b border-sidebar-border px-4"><img src="/favicon.png" alt="MUMSO" className="h-9 w-9 shrink-0 object-contain" />{!collapsed && <div><p className="text-lg font-bold">MUMSO</p><p className="text-xs text-sidebar-foreground/60">{isAdmin ? "Menejimenti" : "Kiongozi"}</p></div>}</div>
    <div className="flex items-center justify-between px-3 py-3">{!collapsed && <span className="text-xs font-semibold text-sidebar-foreground/60">MENU</span>}<Button type="button" size="icon" variant="ghost" onClick={toggle} title={collapsed ? "Fungua menyu" : "Funga menyu"} aria-label={collapsed ? "Fungua menyu" : "Funga menyu"}>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</Button></div>
    <TabsList aria-label="Menyu ya menejimenti" className="management-nav" >{items.filter(([, , , admin]) => !admin || isAdmin).map(([value, label, Icon]) => <TabsTrigger key={value} value={value} title={label} aria-label={label} className="management-nav-item"><Icon className="h-[18px] w-[18px] shrink-0" />{!collapsed && <><span className="min-w-0 flex-1 whitespace-normal text-left">{value === "departments" && !isAdmin ? "Wizara Yangu" : label}</span>{counts[value] !== undefined && <span className="text-xs tabular-nums opacity-70">{counts[value]}</span>}</>}</TabsTrigger>)}</TabsList>
    <Link to="/" className="mt-auto flex items-center gap-3 border-t border-sidebar-border px-5 py-5 text-sm text-sidebar-foreground/70" title="Tovuti ya MUMSO"><Home className="h-4 w-4 shrink-0" />{!collapsed && "Tovuti ya MUMSO"}</Link>
  </aside>;
}