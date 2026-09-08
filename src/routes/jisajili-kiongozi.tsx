import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ShieldCheck, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

const schema = z.object({
  full_name: z.string().trim().min(4, "Andika jina kamili").max(120),
  registration_number: z.string().trim().min(4, "Andika REG namba yako").max(60),
  position: z.string().trim().min(2, "Andika nafasi yako ya uongozi").max(120),
  phone: z.string().trim().regex(/^[+0-9\s-]{7,20}$/, "Namba ya simu si sahihi"),
  password: z.string().min(6, "Nenosiri liwe herufi 6 au zaidi").max(72),
});

function LeaderSignupPage() {
  const [depts, setDepts] = useState<Array<{ id: string; name: string }>>([]);
  const [deptId, setDeptId] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ full_name: "", registration_number: "", position: "", phone: "", password: "" });

  useEffect(() => {
    supabase.from("departments").select("id,name").eq("active", true).order("sort_order")
      .then(({ data }) => setDepts((data ?? []) as any));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { showStatus("error", parsed.error.issues[0]?.message ?? "Jaza taarifa zote"); return; }
    setLoading(true);
    const { error } = await (supabase.from("leader_applications") as any).insert({
      full_name: parsed.data.full_name,
      registration_number: parsed.data.registration_number,
      position: parsed.data.position,
      phone: parsed.data.phone,
      password_hash: parsed.data.password,
      department_id: deptId || null,
    });
    setLoading(false);
    if (error) { showStatus("error", "Hitilafu: " + error.message); return; }
    setDone(true);
    setForm({ full_name: "", registration_number: "", position: "", phone: "", password: "" });
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
          <div className="space-y-2"><Label>REG Namba ya Chuo *</Label>
            <Input value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} placeholder="MUM2021-04-07625" required /></div>
          <div className="space-y-2"><Label>Nafasi ya Uongozi *</Label>
            <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Mfano: Katibu Mkuu" required /></div>
          <div className="space-y-2"><Label>Idara / Wizara</Label>
            <Select value={deptId} onValueChange={setDeptId}>
              <SelectTrigger><SelectValue placeholder="Chagua idara (si lazima)" /></SelectTrigger>
              <SelectContent>{depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-2"><Label>Namba ya Simu *</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
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
