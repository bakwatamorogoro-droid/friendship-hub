import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { BadgeCheck, Search, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showStatus } from "@/lib/status";
import { newTrackCode, trackCodeMessage } from "@/lib/track-code";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFormCategories } from "@/lib/use-site-settings";
import { Countdown } from "@/components/Countdown";
import { useServiceDeadline } from "@/lib/use-deadline";

export const Route = createFileRoute("/changamoto")({
  head: () => ({
    meta: [
      { title: "Huduma — MUMSO" },
      { name: "description", content: "Andika REG namba yako, taarifa zako zitatoka moja kwa moja — kisha tuma changamoto yako kwa wizara husika." },
      { property: "og:title", content: "Huduma — MUMSO" },
      { property: "og:description", content: "Tuma changamoto yako moja kwa moja kwa wizara husika ya MUMSO." },
    ],
  }),
  component: ChangamotoPage,
});

type Student = { full_name: string; phone: string; course: string; year_of_study: string };
type Dept = { id: string; name: string };

const schema = z.object({
  registration_number: z.string().trim().min(4).max(60),
  challenge_type: z.string().min(1),
  department_id: z.string().min(1),
  description: z.string().trim().min(10).max(2000),
});

function ChangamotoPage() {
  const types = useFormCategories("huduma");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [form, setForm] = useState({
    registration_number: "", challenge_type: "", department_id: "", description: "",
  });

  useEffect(() => {
    (supabase.from("departments") as any)
      .select("id,name")
      .eq("active", true)
      .order("name")
      .then(({ data }: any) => setDepartments((data as Dept[]) ?? []));
  }, []);

  const lookup = async (reg: string) => {
    const clean = reg.trim();
    if (clean.length < 4) { setStudent(null); return; }
    setSearching(true);
    const { data, error } = await (supabase.rpc as any)("student_lookup", { _reg: clean });
    setSearching(false);
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) {
      setStudent(null);
      if (!error) showStatus("error", "REG namba hii haijajisajiliwa. Jisajili kwanza kwenye ukurasa wa Jisajili.");
      return;
    }
    setStudent(row as Student);
    showStatus("success", `Karibu ${row.full_name} — taarifa zako zimepatikana.`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) { showStatus("error", "Andika REG namba yako kwanza ili taarifa zako zitoke."); return; }
    const parsed = schema.safeParse(form);
    if (!parsed.success) { showStatus("error", "Tafadhali jaza changamoto yako kwa usahihi."); return; }
    setLoading(true);
    const code = newTrackCode();
    const { error } = await (supabase.from("challenges") as any).insert({
      full_name: student.full_name,
      registration_number: form.registration_number.trim(),
      course: student.course,
      phone: student.phone,
      challenge_type: parsed.data.challenge_type,
      department_id: parsed.data.department_id,
      description: parsed.data.description,
      track_code: code,
    });
    setLoading(false);
    if (error) { showStatus("error", "Hitilafu: " + error.message); return; }
    showStatus({ type: "success", title: "Ombi limepokelewa", message: trackCodeMessage(code, "Ombi lako limefikia wizara husika. Asante!") });
    setForm({ registration_number: "", challenge_type: "", department_id: "", description: "" });
    setStudent(null);
  };

  const dl = useServiceDeadline("changamoto");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="digital-page-hero">
        <h1 className="text-3xl md:text-4xl font-bold relative z-10">Huduma</h1>
        <p className="mt-2 text-primary-foreground/85 relative z-10">
          Andika REG namba yako — taarifa zako zitatoka moja kwa moja, kisha tuma changamoto yako kwa wizara husika.
        </p>
      </div>
      <Countdown deadline={dl?.deadline_at} note={dl?.deadline_note} className="mt-6" />

      <form onSubmit={submit} className="digital-card mt-8 p-6 space-y-5">
        <div className="space-y-2 digital-field">
          <Label>REG Namba ya Chuo</Label>
          <div className="flex gap-2">
            <Input
              value={form.registration_number}
              onChange={(e) => { setForm({ ...form, registration_number: e.target.value }); setStudent(null); }}
              onBlur={(e) => lookup(e.target.value)}
              placeholder="Mf. MUM2021-04-07625"
              required
            />
            <Button type="button" variant="outline" onClick={() => lookup(form.registration_number)} disabled={searching}>
              <Search className="h-4 w-4" /> {searching ? "Inatafuta..." : "Tafuta"}
            </Button>
          </div>
        </div>

        {student && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <BadgeCheck className="h-5 w-5" /> Mwanafunzi amepatikana
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
              <div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-muted-foreground" /> <span><b>{student.full_name}</b></span></div>
              <div><span className="text-muted-foreground">Simu:</span> {student.phone}</div>
              <div><span className="text-muted-foreground">Kozi:</span> {student.course}</div>
              <div><span className="text-muted-foreground">Mwaka:</span> {student.year_of_study}</div>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 digital-field">
            <Label>Wizara / Idara Husika</Label>
            <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
              <SelectTrigger><SelectValue placeholder="Chagua wizara" /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 digital-field">
            <Label>Aina ya Changamoto</Label>
            <Select value={form.challenge_type} onValueChange={(v) => setForm({ ...form, challenge_type: v })}>
              <SelectTrigger><SelectValue placeholder="Chagua aina" /></SelectTrigger>
              <SelectContent>
                {types.map((t) => <SelectItem key={t.id} value={t.label}>{t.label}</SelectItem>)}
                <SelectItem value="Kufiwa (Msiba)">Kufiwa (Msiba)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2 digital-field">
          <Label>Maelezo ya Changamoto Yako</Label>
          <Textarea rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Eleza changamoto yako kwa ufupi..." required />
        </div>

        <Button type="submit" disabled={loading || !student} size="lg" className="w-full digital-field">
          {loading ? "Inatuma..." : "Tuma kwa Wizara Husika"}
        </Button>
        {!student && (
          <p className="text-center text-sm text-muted-foreground">
            Andika REG namba yako hapo juu — taarifa zako zitatoka moja kwa moja.
          </p>
        )}
      </form>
    </div>
  );
}
