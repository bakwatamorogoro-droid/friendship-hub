import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createStorageUrl, useResolvedUrl } from "@/lib/storage-url";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Download, LogOut, Search, Trash2, Upload, UserPlus, Plus, Power, KeyRound } from "lucide-react";
import { toCSV, downloadCSV } from "@/lib/csv";
import { useServerFn } from "@tanstack/react-start";
import { adminCreateUser } from "@/lib/admin.functions";
import { approveLeaderApplication, rejectLeaderApplication } from "@/lib/leader.functions";
import { Switch } from "@/components/ui/switch";
import { LeadersManager } from "@/components/admin/LeadersManager";


export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Dashboard — MUMSO" }] }),
  component: AdminPage,
});

type Row = Record<string, any>;

function AdminPage() {
  const nav = useNavigate();
  const createUser = useServerFn(adminCreateUser);
  const approveLeader = useServerFn(approveLeaderApplication);
  const rejectLeader = useServerFn(rejectLeaderApplication);
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [challenges, setChallenges] = useState<Row[]>([]);
  const [loans, setLoans] = useState<Row[]>([]);
  const [deaths, setDeaths] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [heroImgs, setHeroImgs] = useState<Row[]>([]);
  const [uploading, setUploading] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", fullName: "", role: "leader" as "admin" | "leader" | "student" });
  const [settings, setSettings] = useState<Row | null>(null);
  const [services, setServices] = useState<Row[]>([]);
  const [cats, setCats] = useState<Row[]>([]);
  const [newCat, setNewCat] = useState<{ service_key: string; label: string; department_id: string }>({ service_key: "huduma", label: "", department_id: "" });
  const [logoUploading, setLogoUploading] = useState(false);
  const [mumLogoUploading, setMumLogoUploading] = useState(false);
  const [presUploading, setPresUploading] = useState(false);
  const [depts, setDepts] = useState<Row[]>([]);
  const [newDept, setNewDept] = useState({ name: "", slug: "", description: "", leader_name: "", leader_contact: "" });
  const [grads, setGrads] = useState<Row[]>([]);
  const [newGrad, setNewGrad] = useState({ title: "", content: "", event_date: "", image_url: "" });
  const [gradUploading, setGradUploading] = useState(false);
  const [pwd, setPwd] = useState({ next: "", confirm: "" });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [deptSubs, setDeptSubs] = useState<Row[]>([]);
  const [leaderApps, setLeaderApps] = useState<Row[]>([]);
  const [subFilterDept, setSubFilterDept] = useState<string>("all");
  const [myDeptId, setMyDeptId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("deptsubs");
  const [links, setLinks] = useState<Row[]>([]);
  const [newLink, setNewLink] = useState({ label: "", url: "", description: "", image_url: "" });
  const [anns, setAnns] = useState<Row[]>([]);
  const [annImage, setAnnImage] = useState<string>("");
  const [annExcerpt, setAnnExcerpt] = useState<string>("");
  const [annUploading, setAnnUploading] = useState(false);
  const [editAnn, setEditAnn] = useState<Row | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { nav({ to: "/login" }); return; }
      const { data: roles } = await supabase.from("user_roles").select("role,department_id").eq("user_id", session.user.id);
      const admin = (roles ?? []).some((r: any) => r.role === "admin");
      const ok = admin || (roles ?? []).some((r: any) => r.role === "leader");
      setIsAdmin(admin);
      const leaderRow = (roles ?? []).find((r: any) => r.role === "leader");
      setMyDeptId(admin ? null : (leaderRow?.department_id ?? null));
      setAuthorized(ok);
      setReady(true);
      if (ok) loadAll(admin ? null : (leaderRow?.department_id ?? null));
    })();
  }, [nav]);

  const loadAll = async (leaderDeptId: string | null = myDeptId) => {
    const deptSubsQuery = (supabase.from("department_submissions") as any).select("*").order("created_at", { ascending: false });
    if (leaderDeptId) deptSubsQuery.eq("department_id", leaderDeptId);
    const [c, l, d, h, st, sv, ct, dp, gr, ds, la] = await Promise.all([
      supabase.from("challenges").select("*").order("created_at", { ascending: false }),
      supabase.from("loan_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("deaths").select("*").order("created_at", { ascending: false }),
      supabase.from("hero_images").select("*").order("sort_order", { ascending: true }),
      supabase.from("site_settings").select("*").limit(1).maybeSingle(),
      supabase.from("service_status").select("*").order("key"),
      supabase.from("form_categories").select("*").order("service_key").order("sort_order"),
      supabase.from("departments").select("*").order("sort_order", { ascending: true }),
      supabase.from("graduations").select("*").order("event_date", { ascending: false }),
      deptSubsQuery,
      (supabase.from("leader_applications") as any).select("*").order("created_at", { ascending: false }),
    ]);
    setChallenges(c.data ?? []);
    setLoans(l.data ?? []);
    setDeaths(d.data ?? []);
    setHeroImgs(h.data ?? []);
    setSettings(st.data ?? null);
    setServices(sv.data ?? []);
    const allCats = ct.data ?? [];
    const allDepts = dp.data ?? [];
    setCats(leaderDeptId ? allCats.filter((c: any) => c.department_id === leaderDeptId) : allCats);
    setDepts(leaderDeptId ? allDepts.filter((d: any) => d.id === leaderDeptId) : allDepts);
    setGrads(gr.data ?? []);
    setDeptSubs((ds as any)?.data ?? []);
    setLeaderApps((la as any)?.data ?? []);
    const { data: an } = await (supabase.from("announcements") as any)
      .select("*").order("created_at", { ascending: false });
    setAnns((an as any) ?? []);
    const { data: lk } = await (supabase.from("official_links") as any)
      .select("*").order("sort_order", { ascending: true });
    setLinks((lk as any) ?? []);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    nav({ to: "/" });
  };

  const filter = (rows: Row[]) => {
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(s));
  };

  const exportCSV = (rows: Row[], name: string) => {
    if (!rows.length) { toast.error("Hakuna data"); return; }
    downloadCSV(`${name}-${new Date().toISOString().slice(0,10)}.csv`, toCSV(rows));
  };

  const exportLoansCSV = () => {
    if (!loans.length) { toast.error("Hakuna data"); return; }
    // Namba ya simu haihifadhiwi kwenye Excel kwa sababu za usiri.
    const mapped = loans.map((r: any) => ({
      "MAJINA MATATU": r.full_name ?? "",
      "NAMBA YA KIDATO CHA NNE": r.form_four_index ?? "",
      "REG NAMBA YA CHUO": r.registration_number ?? "",
      "KOZI YA MASOMO": r.course ?? "",
      "MWAKA WA MASOMO": r.year_of_study ?? "",
      "AINA YA TATIZO": r.problem_type ?? "",
      "MAELEZO": r.problem_description ?? "",
      "STATUS": r.status ?? "",
      "TAREHE": r.created_at ?? "",
    }));
    downloadCSV(`mikopo-${new Date().toISOString().slice(0,10)}.csv`, toCSV(mapped));
  };

  const exportDeptSubsCSV = (rows: Row[]) => {
    if (!rows.length) { toast.error("Hakuna data"); return; }
    const deptMap = new Map(depts.map((d) => [d.id, d.name] as const));
    const mapped = rows.map((r: any) => ({
      "FULL NAME": r.full_name ?? "",
      "REG NUMBER": r.registration_number ?? "",
      "GENDER": r.gender ?? "",
      "COURSE OF STUDY": r.course ?? "",
      "DEPARTMENT": deptMap.get(r.department_id) ?? "",
      "CATEGORY": r.category ?? "",
      "DESCRIPTION": r.description ?? "",
      "ATTACHMENT": r.attachment_url ?? "",
      "STATUS": r.status ?? "",
      "SUBMITTED AT": r.created_at ?? "",
    }));
    downloadCSV(`huduma-wanafunzi-${new Date().toISOString().slice(0,10)}.csv`, toCSV(mapped));
  };

  const deleteDeptSub = async (id: string) => {
    if (!confirm("Futa taarifa hii?")) return;
    const { error } = await (supabase.from("department_submissions") as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Imefutwa"); loadAll();
  };

  const onApproveLeader = async (id: string) => {
    try {
      const res: any = await approveLeader({ data: { applicationId: id } });
      toast.success(`Kiongozi ameidhinishwa. Username: ${res?.email ?? "-"}`);
      loadAll();
    } catch (e: any) { toast.error(e?.message ?? "Imeshindikana"); }
  };
  const onRejectLeader = async (id: string) => {
    if (!confirm("Kataa ombi hili?")) return;
    try {
      await rejectLeader({ data: { applicationId: id } });
      toast.success("Ombi limekataliwa"); loadAll();
    } catch (e: any) { toast.error(e?.message ?? "Imeshindikana"); }
  };

  const remove = async (table: "challenges" | "loan_requests" | "deaths", id: string) => {
    if (!confirm("Una uhakika unataka kufuta?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Imefutwa");
    loadAll();
  };

  const saveStatus = async (
    table: "challenges" | "loan_requests" | "department_submissions",
    id: string,
    status: string,
    note: string,
  ) => {
    const { error } = await (supabase.from(table) as any)
      .update({ status, admin_note: note.trim() ? note.trim() : null })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Hatua ya ombi imehifadhiwa");
    loadAll();
  };


  const addLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLink.label.trim() || !newLink.url.trim()) return;
    const url = /^https?:\/\//i.test(newLink.url) ? newLink.url : `https://${newLink.url}`;
    const { error } = await (supabase.from("official_links") as any).insert({
      label: newLink.label.trim(), url, sort_order: links.length,
      description: newLink.description.trim() || null,
      image_url: newLink.image_url || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Kiungo kimeongezwa");
    setNewLink({ label: "", url: "", description: "", image_url: "" });
    loadAll();
  };
  const toggleLink = async (id: string, v: boolean) => {
    await (supabase.from("official_links") as any).update({ active: v }).eq("id", id);
    setLinks((prev) => prev.map((l) => l.id === id ? { ...l, active: v } : l));
  };
  const deleteLink = async (id: string) => {
    if (!confirm("Futa kiungo hiki?")) return;
    await (supabase.from("official_links") as any).delete().eq("id", id);
    toast.success("Kimefutwa"); loadAll();
  };
  const updateLinkField = async (id: string, field: string, value: string | null) => {
    await (supabase.from("official_links") as any).update({ [field]: value }).eq("id", id);
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  /** Pakia picha kwenye bucket ya site-assets na rudisha URL. */
  const uploadAsset = async (file: File, prefix: string): Promise<string | null> => {
    const path = `${prefix}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const up = await supabase.storage.from("site-assets").upload(path, file, { upsert: false });
    if (up.error) { toast.error(up.error.message); return null; }
    return await createStorageUrl("site-assets", path);
  };

  const postAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (editAnn) {
      const { error } = await (supabase.from("announcements") as any).update({
        title, content, excerpt: annExcerpt.trim() || null, image_url: annImage || null,
      }).eq("id", editAnn.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Tangazo limehaririwa");
    } else {
      const { error } = await (supabase.from("announcements") as any).insert({
        title, content, author_id: session?.user.id,
        excerpt: annExcerpt.trim() || null, image_url: annImage || null,
      });
      if (error) { toast.error(error.message); return; }
      toast.success("Tangazo limechapishwa");
    }
    setTitle(""); setContent(""); setAnnExcerpt(""); setAnnImage(""); setEditAnn(null);
    loadAll();
  };

  const startEditAnn = (a: Row) => {
    setEditAnn(a);
    setTitle(a.title ?? "");
    setContent(a.content ?? "");
    setAnnExcerpt(a.excerpt ?? "");
    setAnnImage(a.image_url ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const cancelEditAnn = () => {
    setEditAnn(null); setTitle(""); setContent(""); setAnnExcerpt(""); setAnnImage("");
  };
  const toggleAnnPublished = async (id: string, v: boolean) => {
    const { error } = await (supabase.from("announcements") as any).update({ published: v }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setAnns((p) => p.map((a) => (a.id === id ? { ...a, published: v } : a)));
  };
  const deleteAnn = async (id: string) => {
    if (!confirm("Futa tangazo hili?")) return;
    const { error } = await (supabase.from("announcements") as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Tangazo limefutwa");
    if (editAnn?.id === id) cancelEditAnn();
    loadAll();
  };

  /** Weka muda wa mwisho wa huduma / idara. */
  const saveDeadline = async (
    table: "service_status" | "departments",
    idField: "key" | "id",
    id: string,
    field: "deadline_at" | "deadline_note",
    value: string,
  ) => {
    const val = value.trim() === "" ? null : field === "deadline_at" ? new Date(value).toISOString() : value;
    const { error } = await (supabase.from(table) as any).update({ [field]: val }).eq(idField, id);
    if (error) { toast.error(error.message); return; }
    toast.success("Muda umehifadhiwa");
    if (table === "service_status") {
      setServices((p) => p.map((s) => (s.key === id ? { ...s, [field]: val } : s)));
    } else {
      setDepts((p) => p.map((d) => (d.id === id ? { ...d, [field]: val } : d)));
    }
  };

  const uploadHero = async (file: File) => {
    setUploading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const path = `${session?.user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const up = await supabase.storage.from("hero-images").upload(path, file, { upsert: false });
    if (up.error) { setUploading(false); toast.error(up.error.message); return; }
    const url = await createStorageUrl("hero-images", path);
    const { error } = await supabase.from("hero_images").insert({
      url, sort_order: heroImgs.length, created_by: session?.user.id,
    });
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Picha imeongezwa kwenye banner");
    loadAll();
  };

  const deleteHero = async (id: string, url: string) => {
    if (!confirm("Futa picha hii?")) return;
    const path = decodeURIComponent((url.split("/hero-images/")[1] ?? "").split("?")[0]);
    if (path) await supabase.storage.from("hero-images").remove([path]);
    await supabase.from("hero_images").delete().eq("id", id);
    toast.success("Picha imefutwa"); loadAll();
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings?.id) return;
    const { error } = await (supabase.from("site_settings") as any).update({
      phone: settings.phone, email: settings.email, address: settings.address,
      logo_url: settings.logo_url, mum_logo_url: settings.mum_logo_url,
      president_name: settings.president_name ?? null,
      president_title: settings.president_title ?? null,
      president_message: settings.president_message ?? null,
    }).eq("id", settings.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Mawasiliano yamehifadhiwa");
  };

  const uploadPresidentPhoto = async (file: File) => {
    setPresUploading(true);
    const path = `president-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const up = await supabase.storage.from("site-assets").upload(path, file, { upsert: true });
    if (up.error) { setPresUploading(false); toast.error(up.error.message); return; }
    const url = await createStorageUrl("site-assets", path);
    await (supabase.from("site_settings") as any).update({ president_photo_url: url }).eq("id", settings?.id);
    setPresUploading(false);
    toast.success("Picha ya Rais imehifadhiwa");
    loadAll();
  };

  const uploadLogo = async (file: File) => {
    setLogoUploading(true);
    const path = `logo-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const up = await supabase.storage.from("site-assets").upload(path, file, { upsert: true });
    if (up.error) { setLogoUploading(false); toast.error(up.error.message); return; }
    const url = await createStorageUrl("site-assets", path);
    await supabase.from("site_settings").update({ logo_url: url }).eq("id", settings?.id);
    setLogoUploading(false);
    toast.success("Logo imehifadhiwa");
    loadAll();
  };

  const uploadMumLogo = async (file: File) => {
    setMumLogoUploading(true);
    const path = `mum-logo-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const up = await supabase.storage.from("site-assets").upload(path, file, { upsert: true });
    if (up.error) { setMumLogoUploading(false); toast.error(up.error.message); return; }
    const url = await createStorageUrl("site-assets", path);
    await supabase.from("site_settings").update({ mum_logo_url: url }).eq("id", settings?.id);
    setMumLogoUploading(false);
    toast.success("Logo ya MUM imehifadhiwa");
    loadAll();
  };

  const slugify = (s: string) => s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");

  const addDept = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = newDept.slug.trim() || slugify(newDept.name);
    if (!newDept.name || !slug) { toast.error("Jaza jina la idara"); return; }
    const sort_order = depts.length + 1;
    const { error } = await supabase.from("departments").insert({ ...newDept, slug, sort_order });
    if (error) { toast.error(error.message); return; }
    toast.success("Idara imeongezwa");
    setNewDept({ name: "", slug: "", description: "", leader_name: "", leader_contact: "" });
    loadAll();
  };
  const toggleDept = async (id: string, active: boolean) => {
    await supabase.from("departments").update({ active }).eq("id", id);
    setDepts((p) => p.map((d) => d.id === id ? { ...d, active } : d));
  };
  const deleteDept = async (id: string) => {
    if (!confirm("Futa idara hii? Maombi zilizounganishwa zitabaki lakini hazitaonyesha idara.")) return;
    await supabase.from("departments").delete().eq("id", id);
    loadAll();
  };
  const updateDeptField = async (id: string, field: string, value: string) => {
    await supabase.from("departments").update({ [field]: value } as any).eq("id", id);
  };

  const uploadGradImage = async (file: File): Promise<string | null> => {
    setGradUploading(true);
    const path = `mahafa-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const up = await supabase.storage.from("site-assets").upload(path, file, { upsert: false });
    setGradUploading(false);
    if (up.error) { toast.error(up.error.message); return null; }
    return await createStorageUrl("site-assets", path);
  };
  const addGrad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGrad.title.trim()) return;
    const { error } = await supabase.from("graduations").insert({
      title: newGrad.title,
      content: newGrad.content || null,
      event_date: newGrad.event_date || null,
      image_url: newGrad.image_url || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Mahafa yameongezwa");
    setNewGrad({ title: "", content: "", event_date: "", image_url: "" });
    loadAll();
  };
  const deleteGrad = async (id: string) => {
    if (!confirm("Futa mahafa haya?")) return;
    await supabase.from("graduations").delete().eq("id", id);
    loadAll();
  };

  const toggleService = async (key: string, enabled: boolean) => {
    const { error } = await supabase.from("service_status").update({ enabled }).eq("key", key);
    if (error) { toast.error(error.message); return; }
    setServices((prev) => prev.map((s) => s.key === key ? { ...s, enabled } : s));
    toast.success(`Huduma ${enabled ? "imewashwa" : "imezimwa"}`);
  };

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.label.trim()) return;
    const deptId = isAdmin ? (newCat.department_id || null) : myDeptId;
    if (!isAdmin && !deptId) { toast.error("Huna idara iliyounganishwa na akaunti yako."); return; }
    const sort_order = cats.filter((c) => (c.department_id ?? null) === deptId).length + 1;
    const { error } = await supabase.from("form_categories").insert({
      service_key: newCat.service_key || "huduma",
      label: newCat.label.trim(),
      department_id: deptId,
      sort_order,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Fomu/kategori imeongezwa");
    setNewCat({ ...newCat, label: "" }); loadAll();
  };

  const toggleCat = async (id: string, active: boolean) => {
    await supabase.from("form_categories").update({ active }).eq("id", id);
    setCats((p) => p.map((c) => c.id === id ? { ...c, active } : c));
  };
  const deleteCat = async (id: string) => {
    if (!confirm("Futa kategori hii?")) return;
    await supabase.from("form_categories").delete().eq("id", id);
    loadAll();
  };

  const submitNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUser({ data: newUser });
      toast.success(`Mtumiaji ${newUser.email} ameundwa`);
      setNewUser({ email: "", password: "", fullName: "", role: "leader" });
    } catch (err: any) {
      toast.error(err?.message ?? "Imeshindikana");
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.next.length < 6) { toast.error("Nenosiri liwe na herufi 6 au zaidi"); return; }
    if (pwd.next !== pwd.confirm) { toast.error("Manenosiri hayafanani"); return; }
    setPwdSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwd.next });
    setPwdSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Nenosiri limebadilishwa");
    setPwd({ next: "", confirm: "" });
  };

  if (!ready) return <div className="p-12 text-center text-muted-foreground">Inapakia...</div>;

  if (!authorized) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Huna ruhusa</h1>
        <p className="mt-2 text-muted-foreground">Akaunti yako haijapewa nafasi ya admin au leader. Wasiliana na msimamizi.</p>
        <Button onClick={signOut} className="mt-6"><LogOut className="mr-2 h-4 w-4" />Toka</Button>
      </div>
    );
  }

  const menuCls =
    "lift-menu-item justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="panel-3d flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
        <div>
          <h1 className="text-3xl font-bold">{isAdmin ? "Management System" : "Paneli ya Kiongozi"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin
              ? "Menejimenti inadhibiti mfumo wote na kuidhinisha viongozi."
              : "Hii ni paneli yako binafsi — unaona maombi ya idara yako pekee."}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tafuta..." className="pl-9 w-64" />
          </div>
          <Button variant="outline" className="btn-3d" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Toka</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="mt-6 flex flex-col lg:flex-row gap-6 items-start">
        <TabsList className="lift-menu flex lg:flex-col h-auto w-full lg:w-64 shrink-0 items-stretch justify-start gap-1.5 rounded-2xl p-2.5 overflow-x-auto lg:overflow-visible lg:sticky lg:top-24">
          <TabsTrigger value="deptsubs" className={menuCls}>Huduma za Wanafunzi ({deptSubs.length})</TabsTrigger>
          {isAdmin && <TabsTrigger value="challenges" className={menuCls}>Maombi ya Huduma ({challenges.length})</TabsTrigger>}
          {isAdmin && <TabsTrigger value="loans" className={menuCls}>Mikopo ({loans.length})</TabsTrigger>}
          {isAdmin && <TabsTrigger value="deaths" className={menuCls}>Misiba ({deaths.length})</TabsTrigger>}
          <TabsTrigger value="announce" className={menuCls}>Tangaza</TabsTrigger>
          {isAdmin && <TabsTrigger value="banner" className={menuCls}>Banner</TabsTrigger>}
          <TabsTrigger value="departments" className={menuCls}>{isAdmin ? `Idara (${depts.length})` : "Wizara Yangu"}</TabsTrigger>
          {isAdmin && <TabsTrigger value="graduations" className={menuCls}>Mahafali ({grads.length})</TabsTrigger>}
          {isAdmin && <TabsTrigger value="settings" className={menuCls}>Mawasiliano</TabsTrigger>}
          {isAdmin && <TabsTrigger value="links" className={menuCls}>Tovuti Muhimu ({links.length})</TabsTrigger>}
          {isAdmin && <TabsTrigger value="services" className={menuCls}>Huduma</TabsTrigger>}
          <TabsTrigger value="categories" className={menuCls}>Fomu za Idara ({cats.length})</TabsTrigger>
          {isAdmin && <TabsTrigger value="users" className={menuCls}>Watumiaji</TabsTrigger>}
          {isAdmin && <TabsTrigger value="leaders" className={menuCls}>Viongozi</TabsTrigger>}
          {isAdmin && <TabsTrigger value="leaderapps" className={menuCls}>Maombi ya Viongozi ({leaderApps.filter((a: any) => a.status === "pending").length})</TabsTrigger>}
          <TabsTrigger value="password" className={menuCls}>Nenosiri</TabsTrigger>
        </TabsList>

        <div className="flex-1 min-w-0 w-full">

        <TabsContent value="challenges">
          <DataTable
            rows={filter(challenges)}
            columns={["full_name","registration_number","course","phone","challenge_type","description","created_at"]}
            onExport={() => exportCSV(challenges, "changamoto")}
            onDelete={(id) => remove("challenges", id)}
            onStatusSave={(id, status, note) => saveStatus("challenges", id, status, note)}
          />
        </TabsContent>


        <TabsContent value="deptsubs">
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={subFilterDept}
              onChange={(e) => setSubFilterDept(e.target.value)}
            >
              <option value="all">Idara zote ({deptSubs.length})</option>
              {depts.map((d) => {
                const n = deptSubs.filter((s: any) => s.department_id === d.id).length;
                return <option key={d.id} value={d.id}>{d.name} ({n})</option>;
              })}
            </select>
            <span className="text-xs text-muted-foreground">
              Excel/CSV inatunza otomatiki: FULL NAME, REG NUMBER, PHONE, GENDER, COURSE, DEPARTMENT, CATEGORY, DESCRIPTION, ATTACHMENT.
            </span>
          </div>
          {(() => {
            const scoped = subFilterDept === "all"
              ? deptSubs
              : deptSubs.filter((s: any) => s.department_id === subFilterDept);
            const rows = filter(scoped).map((r: any) => ({
              ...r,
              department: depts.find((d) => d.id === r.department_id)?.name ?? "-",
            }));
            return (
              <DataTable
                rows={rows}
                columns={["full_name","registration_number","phone","gender","course","department","category","description","attachment_url","created_at"]}
                onExport={() => exportDeptSubsCSV(scoped)}
                onDelete={deleteDeptSub}
                onStatusSave={(id, status, note) => saveStatus("department_submissions", id, status, note)}

              />
            );
          })()}
        </TabsContent>

        <TabsContent value="loans">
          <DataTable
            rows={filter(loans)}
            columns={["full_name","form_four_index","registration_number","course","year_of_study","phone","problem_type","problem_description","created_at"]}
            onExport={exportLoansCSV}
            onDelete={(id) => remove("loan_requests", id)}
            onStatusSave={(id, status, note) => saveStatus("loan_requests", id, status, note)}

          />
        </TabsContent>

        <TabsContent value="deaths">
          <DataTable
            rows={filter(deaths)}
            columns={["deceased_name","relationship","student_name","registration_number","phone","death_date","location","description","created_at"]}
            onExport={() => exportCSV(deaths, "misiba")}
            onDelete={(id) => remove("deaths", id)}
          />
        </TabsContent>

        <TabsContent value="announce">
          <div className="max-w-3xl mt-6 space-y-6">
            <form onSubmit={postAnnouncement} className="space-y-4 rounded-xl border border-border bg-card p-6">
              <h2 className="font-semibold text-lg">{editAnn ? "Hariri Tangazo" : "Chapisha Tangazo"}</h2>
              <div className="space-y-2"><Label>Kichwa</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} /></div>
              <div className="space-y-2"><Label>Muhtasari mfupi (hiari)</Label><Input value={annExcerpt} onChange={(e) => setAnnExcerpt(e.target.value)} maxLength={300} /></div>
              <div className="space-y-2">
                <Label>Picha ya tangazo</Label>
                <div className="flex items-center gap-3">
                  <Input type="file" accept="image/*" disabled={annUploading}
                    onChange={async (e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      setAnnUploading(true);
                      const url = await uploadAsset(f, "announcement");
                      setAnnUploading(false);
                      if (url) setAnnImage(url);
                    }} />
                  {annImage && <img src={annImage} alt="" className="h-14 w-14 rounded-lg border object-cover" />}
                </div>
              </div>
              <div className="space-y-2"><Label>Maudhui yote</Label><Textarea value={content} onChange={(e) => setContent(e.target.value)} required rows={8} /></div>
              <div className="flex gap-2">
                <Button type="submit" disabled={annUploading}>{editAnn ? "Hifadhi Mabadiliko" : "Chapisha"}</Button>
                {editAnn && <Button type="button" variant="outline" onClick={cancelEditAnn}>Ghairi</Button>}
              </div>
            </form>

            <div className="space-y-3">
              <h3 className="font-semibold">Matangazo Yote ({anns.length})</h3>
              {anns.length === 0 && <p className="text-sm text-muted-foreground">Hakuna matangazo bado.</p>}
              {anns.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
                  {a.image_url
                    ? <img src={a.image_url} alt="" className="h-16 w-24 rounded-lg border object-cover" />
                    : <span className="grid h-16 w-24 place-items-center rounded-lg bg-primary/10 text-xs text-primary">Hakuna picha</span>}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString("sw-TZ", { dateStyle: "long" })} · {a.published ? "Imechapishwa" : "Rasimu"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={!!a.published} onCheckedChange={(v) => toggleAnnPublished(a.id, v)} />
                    <Button size="sm" variant="outline" onClick={() => startEditAnn(a)}>Hariri</Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteAnn(a.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="banner">
          <div className="max-w-3xl mt-6 space-y-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-semibold text-lg">Ongeza Picha ya Banner</h2>
              <p className="text-sm text-muted-foreground mt-1">Picha zinaonekana kwenye ukurasa wa nyumbani kama carousel.</p>
              <Label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">
                <Upload className="h-4 w-4" /> {uploading ? "Inapakia..." : "Chagua Picha"}
                <input type="file" accept="image/*" className="hidden" disabled={uploading}
                  onChange={(e) => e.target.files?.[0] && uploadHero(e.target.files[0])} />
              </Label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {heroImgs.length === 0 && <p className="text-sm text-muted-foreground col-span-full">Hakuna picha bado.</p>}
              {heroImgs.map((h) => (
                <div key={h.id} className="relative rounded-lg overflow-hidden border border-border group">
                  <img src={h.url} alt="" className="w-full h-40 object-cover" />
                  <Button size="icon" variant="destructive" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                    onClick={() => deleteHero(h.id, h.url)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <form onSubmit={saveSettings} className="max-w-3xl space-y-6 mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div>
              <h2 className="font-semibold text-lg">Nembo (Logo) & Mawasiliano</h2>
              <p className="text-sm text-muted-foreground">Pakia nembo za MUMSO na MUM. Zinaonekana kwenye header ya mfumo mzima.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { title: "Logo ya MUMSO", hint: "Inaonekana upande wa kushoto", url: settings?.logo_url, busy: logoUploading, up: uploadLogo, fallback: "MUMSO" },
                { title: "Logo ya MUM", hint: "Inaonekana upande wa kulia", url: settings?.mum_logo_url, busy: mumLogoUploading, up: uploadMumLogo, fallback: "MUM" },
              ].map((it) => (
                <div key={it.fallback} className="group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-muted/40 to-background p-5">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative">
                      {it.url ? (
                        <img src={it.url} alt={it.title} className="h-24 w-24 rounded-2xl border border-border bg-background object-contain p-2 shadow-sm" />
                      ) : (
                        <div className="grid h-24 w-24 place-items-center rounded-2xl border-2 border-dashed border-border bg-background text-xs text-muted-foreground">
                          {it.fallback}
                        </div>
                      )}
                      {it.busy && (
                        <div className="absolute inset-0 grid place-items-center rounded-2xl bg-background/70 text-xs font-medium">Inapakia...</div>
                      )}
                    </div>
                    <p className="mt-3 text-sm font-semibold">{it.title}</p>
                    <p className="text-xs text-muted-foreground">{it.hint}</p>
                    <Label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground">
                      <Upload className="h-3.5 w-3.5" /> {it.url ? "Badilisha picha" : "Pakia picha"}
                      <input type="file" accept="image/*" className="hidden" disabled={it.busy}
                        onChange={(e) => e.target.files?.[0] && it.up(e.target.files[0])} />
                    </Label>
                    <p className="mt-2 text-[11px] text-muted-foreground">PNG au JPG • bora mraba (1:1)</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Namba ya Simu</Label>
                <Input value={settings?.phone ?? ""} onChange={(e) => setSettings({ ...settings!, phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label>
                <Input type="email" value={settings?.email ?? ""} onChange={(e) => setSettings({ ...settings!, email: e.target.value })} /></div>
              <div className="space-y-2 md:col-span-2"><Label>Anwani</Label>
                <Input value={settings?.address ?? ""} onChange={(e) => setSettings({ ...settings!, address: e.target.value })} /></div>
            </div>

            <div className="rounded-2xl border border-border bg-muted/30 p-5 space-y-4">
              <div>
                <h3 className="font-semibold">Profile ya Rais wa MUMSO</h3>
                <p className="text-sm text-muted-foreground">Inaonekana kwenye ukurasa wa nyumbani juu ya Huduma Kuu.</p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                {settings?.president_photo_url ? (
                  <img src={settings.president_photo_url} alt="Rais" className="h-24 w-24 rounded-2xl border border-border object-cover" />
                ) : (
                  <div className="grid h-24 w-24 place-items-center rounded-2xl border-2 border-dashed border-border text-xs text-muted-foreground">RAIS</div>
                )}
                <Label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-medium text-primary hover:bg-primary hover:text-primary-foreground">
                  <Upload className="h-3.5 w-3.5" /> {presUploading ? "Inapakia..." : "Pakia picha ya Rais"}
                  <input type="file" accept="image/*" className="hidden" disabled={presUploading}
                    onChange={(e) => e.target.files?.[0] && uploadPresidentPhoto(e.target.files[0])} />
                </Label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>Jina la Rais</Label>
                  <Input value={settings?.president_name ?? ""} onChange={(e) => setSettings({ ...settings!, president_name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Cheo</Label>
                  <Input placeholder="Rais wa MUMSO" value={settings?.president_title ?? ""} onChange={(e) => setSettings({ ...settings!, president_title: e.target.value })} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Neno la Rais</Label>
                  <Textarea rows={5} value={settings?.president_message ?? ""} onChange={(e) => setSettings({ ...settings!, president_message: e.target.value })} /></div>
              </div>
            </div>
            <Button type="submit">Hifadhi</Button>
          </form>


          <div className="max-w-3xl space-y-5 mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div>
              <h2 className="font-semibold text-lg">Muonekano wa Mfumo (Theme)</h2>
              <p className="text-sm text-muted-foreground">Chagua rangi kuu, rangi ya msisitizo na rangi ya background. Mfumo mzima unabadilika mara moja.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {([
                { key: "theme_primary", label: "Rangi Kuu (Primary)", def: "#0f5b3a", ph: "#0f5b3a" },
                { key: "theme_accent", label: "Rangi ya Msisitizo (Accent)", def: "#f4d35e", ph: "#f4d35e" },
                { key: "theme_background", label: "Rangi ya Background", def: "#ffffff", ph: "#ffffff" },
              ] as const).map((f) => (
                <div key={f.key} className="space-y-2 rounded-xl border border-border p-3">
                  <Label>{f.label}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="h-10 w-12 shrink-0 cursor-pointer rounded border border-border"
                      value={/^#/.test(settings?.[f.key] ?? "") ? (settings![f.key] as string) : f.def}
                      onChange={(e) => setSettings({ ...settings!, [f.key]: e.target.value })}
                    />
                    <Input
                      value={settings?.[f.key] ?? ""}
                      placeholder={f.ph}
                      onChange={(e) => setSettings({ ...settings!, [f.key]: e.target.value })}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div
              className="rounded-xl border border-border p-4"
              style={{ background: settings?.theme_background || undefined }}
            >
              <p className="text-xs text-muted-foreground mb-2">Mfano (preview)</p>
              <div className="flex items-center gap-2">
                <span className="rounded-md px-3 py-1.5 text-sm font-medium text-white" style={{ background: settings?.theme_primary || "#0f5b3a" }}>Batani Kuu</span>
                <span className="rounded-md px-3 py-1.5 text-sm font-medium" style={{ background: settings?.theme_accent || "#f4d35e" }}>Msisitizo</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={async () => {
                if (!settings?.id) return;
                const { error } = await (supabase.from("site_settings") as any).update({
                  theme_primary: settings.theme_primary || null,
                  theme_accent: settings.theme_accent || null,
                  theme_background: settings.theme_background || null,
                }).eq("id", settings.id);
                if (error) { toast.error(error.message); return; }
                const root = document.documentElement;
                const set = (v: string | null, name: string) => v ? root.style.setProperty(name, v) : root.style.removeProperty(name);
                set(settings.theme_primary || null, "--primary");
                set(settings.theme_accent || null, "--accent");
                set(settings.theme_background || null, "--background");
                toast.success("Muonekano umehifadhiwa — rangi mpya zimeanza kutumika");
              }}>Hifadhi Muonekano</Button>
              <Button variant="outline" onClick={async () => {
                if (!settings?.id) return;
                await (supabase.from("site_settings") as any)
                  .update({ theme_primary: null, theme_accent: null, theme_background: null }).eq("id", settings.id);
                ["--primary", "--accent", "--background"].forEach((v) => document.documentElement.style.removeProperty(v));
                setSettings({ ...settings, theme_primary: null, theme_accent: null, theme_background: null });
                toast.success("Muonekano umerejeshwa");
              }}>Rudisha Default</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="departments">
          <div className="max-w-4xl mt-6 space-y-6">
            <form onSubmit={addDept} className="rounded-xl border border-border bg-card p-6 space-y-3">
              <h2 className="font-semibold text-lg">Ongeza Idara / Wizara</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1"><Label>Jina la Idara</Label>
                  <Input value={newDept.name} onChange={(e) => setNewDept({ ...newDept, name: e.target.value })} required /></div>
                <div className="space-y-1"><Label>Slug (URL — hiari)</Label>
                  <Input placeholder="mfano: taaluma" value={newDept.slug} onChange={(e) => setNewDept({ ...newDept, slug: e.target.value })} /></div>
                <div className="space-y-1 md:col-span-2"><Label>Maelezo</Label>
                  <Textarea rows={2} value={newDept.description} onChange={(e) => setNewDept({ ...newDept, description: e.target.value })} /></div>
                <div className="space-y-1"><Label>Jina la Kiongozi</Label>
                  <Input value={newDept.leader_name} onChange={(e) => setNewDept({ ...newDept, leader_name: e.target.value })} /></div>
                <div className="space-y-1"><Label>Mawasiliano ya Kiongozi</Label>
                  <Input value={newDept.leader_contact} onChange={(e) => setNewDept({ ...newDept, leader_contact: e.target.value })} /></div>
              </div>
              <Button type="submit"><Plus className="mr-1 h-4 w-4" />Ongeza Idara</Button>
            </form>
            <div className="space-y-3">
              {depts.map((d) => (
                <div key={d.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{d.name}</p>
                      <p className="text-xs text-muted-foreground">/huduma/{d.slug}</p>
                      {d.description && <p className="text-sm text-muted-foreground mt-2 max-w-xl">{d.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={d.active} onCheckedChange={(v) => toggleDept(d.id, v)} />
                      <Button size="icon" variant="ghost" onClick={() => deleteDept(d.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="space-y-1"><Label className="text-xs">Kiongozi</Label>
                      <Input defaultValue={d.leader_name ?? ""} onBlur={(e) => updateDeptField(d.id, "leader_name", e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">Mawasiliano</Label>
                      <Input defaultValue={d.leader_contact ?? ""} onBlur={(e) => updateDeptField(d.id, "leader_contact", e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">Muda wa mwisho (countdown)</Label>
                      <Input type="datetime-local"
                        defaultValue={d.deadline_at ? new Date(d.deadline_at).toISOString().slice(0, 16) : ""}
                        onBlur={(e) => saveDeadline("departments", "id", d.id, "deadline_at", e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">Maelezo ya muda</Label>
                      <Input defaultValue={d.deadline_note ?? ""}
                        onBlur={(e) => saveDeadline("departments", "id", d.id, "deadline_note", e.target.value)} /></div>
                    <div className="space-y-1 md:col-span-2"><Label className="text-xs">Picha ya idara</Label>
                      <div className="flex items-center gap-2">
                        <Input type="file" accept="image/*"
                          onChange={async (e) => {
                            const f = e.target.files?.[0]; if (!f) return;
                            const url = await uploadAsset(f, "dept");
                            if (url) { await updateDeptField(d.id, "image_url", url); toast.success("Picha imehifadhiwa"); loadAll(); }
                          }} />
                        {d.image_url && <img src={d.image_url} alt="" className="h-10 w-10 rounded object-cover border" />}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="graduations">
          <div className="max-w-4xl mt-6 space-y-6">
            <form onSubmit={addGrad} className="rounded-xl border border-border bg-card p-6 space-y-3">
              <h2 className="font-semibold text-lg">Ongeza Mahafa</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1 md:col-span-2"><Label>Kichwa</Label>
                  <Input value={newGrad.title} onChange={(e) => setNewGrad({ ...newGrad, title: e.target.value })} required /></div>
                <div className="space-y-1"><Label>Tarehe</Label>
                  <Input type="date" value={newGrad.event_date} onChange={(e) => setNewGrad({ ...newGrad, event_date: e.target.value })} /></div>
                <div className="space-y-1"><Label>Picha</Label>
                  <div className="flex items-center gap-2">
                    <Input type="file" accept="image/*" disabled={gradUploading}
                      onChange={async (e) => {
                        const f = e.target.files?.[0]; if (!f) return;
                        const url = await uploadGradImage(f);
                        if (url) setNewGrad((p) => ({ ...p, image_url: url }));
                      }} />
                    {newGrad.image_url && <img src={newGrad.image_url} alt="" className="h-10 w-10 rounded object-cover border" />}
                  </div>
                </div>
                <div className="space-y-1 md:col-span-2"><Label>Maudhui</Label>
                  <Textarea rows={4} value={newGrad.content} onChange={(e) => setNewGrad({ ...newGrad, content: e.target.value })} /></div>
              </div>
              <Button type="submit" disabled={gradUploading}><Plus className="mr-1 h-4 w-4" />Chapisha Mahafa</Button>
            </form>
            <div className="grid gap-4 md:grid-cols-2">
              {grads.map((g) => (
                <div key={g.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  {g.image_url && <img src={g.image_url} alt="" className="w-full h-40 object-cover" />}
                  <div className="p-4">
                    <div className="flex justify-between gap-2">
                      <div>
                        <p className="font-semibold">{g.title}</p>
                        {g.event_date && <p className="text-xs text-muted-foreground">{new Date(g.event_date).toLocaleDateString("sw-TZ")}</p>}
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => deleteGrad(g.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                    {g.content && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{g.content}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="services">
          <div className="max-w-2xl mt-6 rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="rounded-lg border-2 border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold flex items-center gap-2"><Power className="h-4 w-4 text-destructive" />Funga / Fungua Mfumo Mzima</p>
                  <p className="text-xs text-muted-foreground mt-1">Ukizima, wanafunzi hawataona huduma yoyote. Admin bado ataingia.</p>
                </div>
                <Switch checked={settings?.system_enabled ?? true}
                  onCheckedChange={async (v) => {
                    if (!settings?.id) return;
                    const { error } = await supabase.from("site_settings").update({ system_enabled: v }).eq("id", settings.id);
                    if (error) { toast.error(error.message); return; }
                    setSettings({ ...settings, system_enabled: v });
                    toast.success(v ? "Mfumo umefunguliwa" : "Mfumo umefungwa");
                  }} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ujumbe wa Matengenezo (unaonekana mfumo ukiwa umefungwa)</Label>
                <Textarea rows={2} defaultValue={settings?.maintenance_message ?? ""}
                  onBlur={async (e) => {
                    if (!settings?.id) return;
                    await supabase.from("site_settings").update({ maintenance_message: e.target.value }).eq("id", settings.id);
                    setSettings({ ...settings, maintenance_message: e.target.value });
                  }} placeholder="Mf. Tunafanya matengenezo, tafadhali jaribu tena baadaye." />
              </div>
            </div>
            <h2 className="font-semibold text-lg flex items-center gap-2"><Power className="h-5 w-5 text-primary" />Washa / Zima Huduma</h2>
            <p className="text-sm text-muted-foreground">Huduma zilizozimwa hazitakubali maombi mapya kutoka kwa wanafunzi.</p>
            <div className="space-y-2">
              {services.map((s) => (
                <div key={s.key} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="font-medium">{s.label}</p>
                    <p className="text-xs text-muted-foreground">/{s.key}</p>
                  </div>
                  <Switch checked={s.enabled} onCheckedChange={(v) => toggleService(s.key, v)} />
                </div>
              ))}
              <div className="pt-4 space-y-3">
                <h3 className="font-semibold">Muda wa Mwisho wa Kila Huduma</h3>
                <p className="text-xs text-muted-foreground">Weka tarehe na saa ya mwisho — wanafunzi wataona siku, masaa, dakika na sekunde zilizobaki.</p>
                {services.map((s) => (
                  <div key={`dl-${s.key}`} className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[1fr_1fr]">
                    <div className="space-y-1">
                      <Label className="text-xs">{s.label} — muda wa mwisho</Label>
                      <Input type="datetime-local"
                        defaultValue={s.deadline_at ? new Date(s.deadline_at).toISOString().slice(0, 16) : ""}
                        onBlur={(e) => saveDeadline("service_status", "key", s.key, "deadline_at", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Maelezo ya muda</Label>
                      <Input placeholder="Mf. Maombi yanafungwa saa 11 jioni"
                        defaultValue={s.deadline_note ?? ""}
                        onBlur={(e) => saveDeadline("service_status", "key", s.key, "deadline_note", e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="categories">
          <div className="max-w-4xl mt-6 space-y-6">
            <form onSubmit={addCategory} className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div>
                <h2 className="font-semibold text-lg">Tengeneza Fomu ya Idara</h2>
                <p className="text-sm text-muted-foreground">
                  Kila fomu unayoongeza hapa inaonekana kwa mwanafunzi kwenye ukurasa wa idara yako
                  (<code>/huduma/&lt;idara&gt;</code>) na maombi yanaingia moja kwa moja ndani ya mfumo — hakuna WhatsApp.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {isAdmin ? (
                  <div className="space-y-1">
                    <Label>Idara</Label>
                    <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={newCat.department_id}
                      onChange={(e) => setNewCat({ ...newCat, department_id: e.target.value })}>
                      <option value="">— Fomu ya jumla (bila idara) —</option>
                      {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label>Idara</Label>
                    <div className="flex h-10 items-center rounded-md border border-border bg-muted/50 px-3 text-sm">
                      {depts.find((d) => d.id === myDeptId)?.name ?? "Idara yako"}
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <Label>Huduma inayohusika</Label>
                  <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={newCat.service_key} onChange={(e) => setNewCat({ ...newCat, service_key: e.target.value })}>
                    {services.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Jina la Fomu / Aina ya Huduma</Label>
                  <Input placeholder="Mf. Ombi la Mkopo, Malalamiko ya Bweni..." value={newCat.label}
                    onChange={(e) => setNewCat({ ...newCat, label: e.target.value })} />
                </div>
              </div>
              <Button type="submit"><Plus className="mr-1 h-4 w-4" />Ongeza Fomu</Button>
            </form>

            {(() => {
              const groups: { key: string; name: string; list: Row[] }[] = [];
              const visibleDepts = isAdmin ? depts : depts.filter((d) => d.id === myDeptId);
              visibleDepts.forEach((d) => {
                const list = cats.filter((c) => c.department_id === d.id);
                groups.push({ key: d.id, name: d.name, list });
              });
              if (isAdmin) {
                groups.push({ key: "global", name: "Fomu za Jumla (bila idara)", list: cats.filter((c) => !c.department_id) });
              }
              return groups.map((g) => (
                <div key={g.key} className="rounded-xl border border-border bg-card p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-medium">{g.name}</h3>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">{g.list.length} fomu</span>
                  </div>
                  {g.list.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Hakuna fomu bado. Tengeneza moja hapo juu.</p>
                  ) : (
                    <div className="space-y-2">
                      {g.list.map((c) => (
                        <div key={c.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                          <div>
                            <span className={c.active ? "font-medium" : "line-through text-muted-foreground"}>{c.label}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              {services.find((s) => s.key === c.service_key)?.label ?? c.service_key}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch checked={c.active} onCheckedChange={(v) => toggleCat(c.id, v)} />
                            <Button size="icon" variant="ghost" onClick={() => deleteCat(c.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ));
            })()}
          </div>
        </TabsContent>


        {isAdmin && (
          <TabsContent value="users">
            <form onSubmit={submitNewUser} className="max-w-xl space-y-4 mt-6 rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" /><h2 className="font-semibold text-lg">Sajili Mtumiaji Mpya</h2></div>
              <div className="space-y-2"><Label>Jina Kamili</Label><Input value={newUser.fullName} onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Nenosiri (angalau 6)</Label><Input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required minLength={6} /></div>
              <div className="space-y-2"><Label>Nafasi</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}>
                  <option value="leader">Leader (Kiongozi)</option>
                  <option value="admin">Admin</option>
                  <option value="student">Student (Mwanafunzi)</option>
                </select>
              </div>
              <Button type="submit"><UserPlus className="mr-2 h-4 w-4" />Unda Mtumiaji</Button>
            </form>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="leaders">
            <LeadersManager />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="leaderapps">
            <div className="mt-6 max-w-4xl space-y-4">
              <div className="panel-3d rounded-2xl p-5">
                <h2 className="font-semibold text-lg">Maombi ya Usajili wa Viongozi</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Hakuna uthibitisho wa barua pepe — Menejimenti ndiyo inaidhinisha. Baada ya kuidhinisha,
                  kiongozi anaingia kwa REG namba na nenosiri lake na anapata paneli yake.
                </p>
              </div>
              {leaderApps.length === 0 && <p className="text-sm text-muted-foreground">Hakuna maombi bado.</p>}
              {leaderApps.map((a: any) => (
                <div key={a.id} className="panel-3d flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5">
                  <div className="min-w-0">
                    <p className="font-semibold">{a.full_name} — {a.position}</p>
                    <p className="text-xs text-muted-foreground">
                      REG: {a.registration_number} • Simu: {a.phone ?? "-"} •{" "}
                      Idara: {depts.find((d) => d.id === a.department_id)?.name ?? "—"}
                    </p>
                    <p className="mt-1 text-xs font-medium text-primary">Hali: {a.status}</p>
                  </div>
                  {a.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" className="btn-3d" onClick={() => onApproveLeader(a.id)}>Idhinisha</Button>
                      <Button size="sm" variant="outline" className="btn-3d" onClick={() => onRejectLeader(a.id)}>Kataa</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        )}


        <TabsContent value="password">
          <form onSubmit={changePassword} className="max-w-md space-y-4 mt-6 rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /><h2 className="font-semibold text-lg">Badili Nenosiri</h2></div>
            <p className="text-sm text-muted-foreground">Weka nenosiri jipya kwa akaunti yako.</p>
            <div className="space-y-2"><Label>Nenosiri Jipya</Label>
              <Input type="password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} required minLength={6} /></div>
            <div className="space-y-2"><Label>Thibitisha Nenosiri</Label>
              <Input type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} required minLength={6} /></div>
            <Button type="submit" disabled={pwdSaving}>
              {pwdSaving ? "Inahifadhi..." : (<><KeyRound className="mr-2 h-4 w-4" />Hifadhi Nenosiri</>)}
            </Button>
          </form>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="links">
            <div className="max-w-3xl mt-6 space-y-6">
              <form onSubmit={addLink} className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div>
                  <h2 className="font-semibold text-lg">Tovuti Muhimu (Official Links)</h2>
                  <p className="text-sm text-muted-foreground mt-1">Ongeza viungo vya tovuti rasmi (mfano: MUM website, HESLB, TCU). Vinaonekana kama kadi zenye picha kwenye ukurasa wa nyumbani.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input placeholder="Jina la kiungo" value={newLink.label}
                    onChange={(e) => setNewLink({ ...newLink, label: e.target.value })} required />
                  <Input placeholder="https://mum.ac.tz" value={newLink.url}
                    onChange={(e) => setNewLink({ ...newLink, url: e.target.value })} required />
                  <Input placeholder="Maelezo mafupi (hiari)" value={newLink.description}
                    onChange={(e) => setNewLink({ ...newLink, description: e.target.value })} />
                  <div className="flex items-center gap-2">
                    <Input type="file" accept="image/*"
                      onChange={async (e) => {
                        const f = e.target.files?.[0]; if (!f) return;
                        const url = await uploadAsset(f, "link");
                        if (url) setNewLink((p) => ({ ...p, image_url: url }));
                      }} />
                    {newLink.image_url && <img src={newLink.image_url} alt="" className="h-10 w-10 rounded object-cover border" />}
                  </div>
                </div>
                <Button type="submit"><Plus className="mr-1 h-4 w-4" />Ongeza</Button>
              </form>
              <div className="space-y-2">
                {links.length === 0 && <p className="text-sm text-muted-foreground">Hakuna viungo bado.</p>}
                {links.map((l) => (
                  <div key={l.id} className="rounded-lg border border-border bg-card px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {l.image_url
                          ? <img src={l.image_url} alt="" className="h-11 w-11 rounded-lg border object-cover" />
                          : <span className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary text-xs font-bold">{(l.label ?? "?").slice(0, 2).toUpperCase()}</span>}
                        <div className="min-w-0">
                          <p className={`font-medium truncate ${l.active ? "" : "line-through text-muted-foreground"}`}>{l.label}</p>
                          <a href={l.url} target="_blank" rel="noreferrer noopener" className="text-xs text-primary hover:underline break-all">{l.url}</a>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={l.active} onCheckedChange={(v) => toggleLink(l.id, v)} />
                        <Button size="icon" variant="ghost" onClick={() => deleteLink(l.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="space-y-1"><Label className="text-xs">Maelezo</Label>
                        <Input defaultValue={l.description ?? ""} onBlur={(e) => updateLinkField(l.id, "description", e.target.value || null)} /></div>
                      <div className="space-y-1"><Label className="text-xs">Badilisha picha</Label>
                        <Input type="file" accept="image/*"
                          onChange={async (e) => {
                            const f = e.target.files?.[0]; if (!f) return;
                            const url = await uploadAsset(f, "link");
                            if (url) { await updateLinkField(l.id, "image_url", url); toast.success("Picha imebadilishwa"); }
                          }} /></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        )}
        </div>
      </Tabs>
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Ombi limepokelewa" },
  { value: "needs_correction", label: "Linahitaji marekebisho" },
  { value: "forwarded", label: "Limepelekwa kwa uongozi" },
  { value: "approved", label: "Approval Administrata" },
  { value: "rejected", label: "Limekataliwa" },
];

function StatusEditor({ row, onSave }: { row: Row; onSave: (id: string, status: string, note: string) => void }) {
  const [status, setStatus] = useState<string>(row.status ?? "pending");
  const [note, setNote] = useState<string>(row.admin_note ?? "");
  const dirty = status !== (row.status ?? "pending") || note !== (row.admin_note ?? "");
  return (
    <div className="min-w-[230px] space-y-2">
      <select
        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <Textarea
        rows={2}
        className="text-xs"
        placeholder="Ujumbe wa marekebisho kwa mwombaji..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <Button size="sm" className="w-full" disabled={!dirty} onClick={() => onSave(row.id, status, note)}>
        Hifadhi
      </Button>
    </div>
  );
}

function DataTable({ rows, columns, onExport, onDelete, onStatusSave }: {
  rows: Row[]; columns: string[]; onExport: () => void; onDelete: (id: string) => void;
  onStatusSave?: (id: string, status: string, note: string) => void;
}) {
  return (
    <div className="mt-6 rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <span className="text-sm text-muted-foreground">{rows.length} matokeo</span>
        <Button size="sm" onClick={onExport}><Download className="mr-2 h-4 w-4" />Pakua CSV</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {columns.map((c) => <th key={c} className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">{c.replace(/_/g," ")}</th>)}
              {onStatusSave && <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Hatua &amp; Ujumbe</th>}
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={columns.length + (onStatusSave ? 2 : 1)} className="p-8 text-center text-muted-foreground">Hakuna taarifa</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                {columns.map((c) => (
                  <td key={c} className="p-3 align-top max-w-[240px] truncate" title={String(r[c] ?? "")}>
                    {c === "attachment_url"
                      ? (r[c] ? <AttachmentLink url={r[c]} name={r.attachment_name} /> : "")
                      : c === "created_at" || c === "death_date"
                        ? (r[c] ? new Date(r[c]).toLocaleDateString("sw-TZ") : "")
                        : String(r[c] ?? "")}
                  </td>
                ))}
                {onStatusSave && (
                  <td className="p-3 align-top">
                    <StatusEditor key={`${r.id}-${r.status}-${r.admin_note ?? ""}`} row={r} onSave={onStatusSave} />
                  </td>
                )}
                <td className="p-3">
                  <Button size="icon" variant="ghost" onClick={() => onDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>

            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function AttachmentLink({ url, name }: { url: string; name?: string | null }) {
  const resolved = useResolvedUrl(url);
  return (
    <a href={resolved ?? url} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
      {name || "Fungua faili"}
    </a>
  );
}
