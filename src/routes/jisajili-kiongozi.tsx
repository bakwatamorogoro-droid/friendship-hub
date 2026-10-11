import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ShieldCheck, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { submitLeaderApplication } from "@/lib/leader.functions";
import { showStatus } from "@/lib/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/jisajili-kiongozi")({
  head: () => ({
    meta: [
      { title: "Jisajili kama Kiongozi — MUMSO" },
      { name: "description", content: "Viongozi wa MUMSO wanaweza kujisajili hapa; usajili unathibitishwa na Admin (Menejimenti)." },
      { property: "og:title", content: "Jisajili kama Kiongozi — MUMSO" },
      { property: "og:description", content: "Tuma ombi la akaunti ya kiongozi; Admin ataidhinisha." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeaderSignupPage,
});

const POSITIONS = [
  "Rais",
  "Makamu wa Rais",
  "Katibu Mkuu",
  "Naibu Katibu Mkuu",
  "Mweka Hazina",
  "Waziri wa Idara",
  "Naibu Waziri wa Idara",
  "Katibu wa Idara",
  "Mjumbe wa Kamati Kuu",
];

const YEARS = ["Mwaka wa 1", "Mwaka wa 2", "Mwaka wa 3", "Mwaka wa 4", "Mwaka wa 5"];

const schema = z.object({
  full_name: z.string().trim().min(4, "Andika jina kamili").max(120),
  registration_number: z.string().trim().min(4, "Andika REG namba yako").max(60),
  course: z.string().trim().min(2, "Andika kozi unayosomea").max(120),
  year_of_study: z.string().min(1, "Chagua mwaka wa masomo"),
  position: z.string().min(1, "Chagua cheo chako"),
  phone: z.string().trim().regex(/^[+0-9\s-]{7,20}$/, "Namba ya simu si sahihi"),
  password: z.string().min(6, "Nenosiri liwe herufi 6 au zaidi").max(72),
});

function LeaderSignupPage() {
  const [depts, setDepts] = useState<Array<{ id: string; name: string }>>([]);
  const [deptId, setDeptId] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    full_name: "", registration_number: "", course: "", year_of_study: "",
    position: "", phone: "", password: "",
  });

  useEffect(() => {
    supabase.from("departments").select("id,name").eq("active", true).order("sort_order")
      .then(({ data }) => setDepts((data ?? []) as any));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { showStatus("error", parsed.error.issues[0]?.message ?? "Jaza taarifa zote"); return; }
    if (!deptId) { showStatus("error", "Chagua wizara/idara yako"); return; }
    setLoading(true);
    try {
      await submitLeaderApplication({ data: { ...parsed.data, department_id: deptId } });
    } catch (err) {
      setLoading(false);
      showStatus("error", err instanceof Error ? err.message : "Usajili haujakamilika");
      return;
    }
    setLoading(false);
    setDone(true);
    setForm({ full_name: "", registration_number: "", course: "", year_of_study: "", position: "", phone: "", password: "" });
    setDeptId("");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="digital-page-hero">
        <h1 className="relative z-10 flex items-center gap-3 text-3xl md:text-4xl font-bold">
          <UserPlus className="h-8 w-8" /> Jisajili kama Kiongozi
        </h1>
        <p className="relative z-10 mt-2 text-primary-foreground/85 text-base md:text-lg">
          Hakuna uthibitisho wa barua pepe. Ombi lako linathibitishwa na Admin (Menejimenti).
        </p>
      </div>

      {done ? (
        <div className="digital-card mt-8 p-8 text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-3 text-xl font-bold">Ombi lako limepokelewa</h2>
          <p className="mt-2 text-muted-foreground">
            Admin ataidhinisha usajili wako. Baada ya kuidhinishwa, ingia kwa REG namba yako na nenosiri ulilochagua.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link to="/login"><Button>Nenda Kuingia</Button></Link>
            <Button variant="outline" onClick={() => setDone(false)}>Sajili Mwingine</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="digital-card mt-8 space-y-5 p-6">
          <div className="space-y-2"><Label>Jina Kamili *</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>REG Namba ya Chuo *</Label>
              <Input value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} placeholder="MUM2021-04-07625" required /></div>
            <div className="space-y-2"><Label>Namba ya Simu *</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+255 7XX XXX XXX" required /></div>
            <div className="space-y-2"><Label>Kozi Unayosomea *</Label>
              <Input value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} placeholder="Mf. LLB / BBA / BEd" required /></div>
            <div className="space-y-2"><Label>Mwaka wa Masomo *</Label>
              <Select value={form.year_of_study} onValueChange={(v) => setForm({ ...form, year_of_study: v })}>
                <SelectTrigger><SelectValue placeholder="Chagua mwaka" /></SelectTrigger>
                <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select></div>
          </div>
          <div className="space-y-2"><Label>Cheo cha Uongozi *</Label>
            <Select value={form.position} onValueChange={(v) => setForm({ ...form, position: v })}>
              <SelectTrigger><SelectValue placeholder="Chagua cheo chako" /></SelectTrigger>
              <SelectContent>{POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-2"><Label>Wizara / Idara Yako *</Label>
            <Select value={deptId} onValueChange={setDeptId}>
              <SelectTrigger><SelectValue placeholder="Chagua wizara yako" /></SelectTrigger>
              <SelectContent>{depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Baada ya kuidhinishwa na menejimenti, utaingia moja kwa moja kwenye paneli ya wizara hii na kuona changamoto na taarifa za wanafunzi wa wizara yako.
            </p></div>
          <div className="space-y-2"><Label>Nenosiri Unalotaka *</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={6} required /></div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Inatuma..." : "Tuma Ombi la Usajili"}</Button>
          <p className="text-center text-sm text-muted-foreground">
            Tayari umeidhinishwa? <Link to="/login" className="text-primary underline">Ingia hapa</Link>
          </p>
        </form>
      )}
    </div>
  );
}
