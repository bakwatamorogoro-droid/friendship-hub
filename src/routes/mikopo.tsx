import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useRegisteredStudent } from "@/lib/student-registration";
import { StudentIdentity } from "@/components/StudentIdentity";
import { z } from "zod";
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

export const Route = createFileRoute("/mikopo")({
  head: () => ({
    meta: [
      { title: "Huduma ya Mikopo — MUMSO" },
      { name: "description", content: "Omba huduma za mikopo: disbursement, allocation, appeal na zaidi." },
      { property: "og:title", content: "Huduma ya Mikopo — MUMSO" },
      { property: "og:description", content: "Jaza fomu ya mkopo wa HESLB na omba huduma ya mkopo kwa MUMSO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MikopoPage,
});

const years = ["Mwaka 1", "Mwaka 2", "Mwaka 3", "Mwaka 4", "Mwaka 5"];

const schema = z.object({
  full_name: z.string().trim().min(4, "Andika majina kamili").max(120),
  form_four_index: z.string().trim().min(4, "Andika namba ya kidato cha nne").max(40),
  registration_number: z.string().trim().min(4, "Andika REG namba yako ya chuo").max(60),
  course: z.string().trim().min(2, "Andika kozi yako").max(120),
  year_of_study: z.string().min(1, "Chagua mwaka wa masomo"),
  phone: z.string().trim().regex(/^[+0-9\s-]{7,20}$/, "Namba ya simu si sahihi"),
  problem_type: z.string().min(1, "Chagua aina ya huduma"),
  problem_description: z.string().trim().min(10, "Andika maelezo ya ombi lako").max(2000),
});

function MikopoPage() {
  const problems = useFormCategories("mikopo");
  const identity = useRegisteredStudent();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "", form_four_index: "", registration_number: "", course: "",
    year_of_study: "", phone: "", problem_type: "", problem_description: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identity.student) { showStatus("error", "Thibitisha REG namba yako kwanza."); return; }
    const parsed = schema.safeParse({ ...form, ...identity.student });
    if (!parsed.success) { showStatus("error", parsed.error.issues[0]?.message ?? "Tafadhali jaza taarifa zote kwa usahihi."); return; }
    setLoading(true);
    const code = newTrackCode();
    const { error } = await (supabase.from("loan_requests") as any).insert({ ...parsed.data, email: "", track_code: code });
    setLoading(false);
    if (error) { showStatus("error", "Hitilafu: " + error.message); return; }
    showStatus({ type: "success", title: "Ombi limepokelewa", message: trackCodeMessage(code, "Ombi lako la mkopo limepokelewa. Tutawasiliana nawe.") });
    setForm({ full_name: "", form_four_index: "", registration_number: "", course: "", year_of_study: "", phone: "", problem_type: "", problem_description: "" });
  };

  const dl = useServiceDeadline("mikopo");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="digital-page-hero">
        <h1 className="text-3xl md:text-4xl font-bold relative z-10">Huduma ya Mikopo</h1>
        <p className="mt-2 text-primary-foreground/85 relative z-10">Jaza fomu hii kuomba huduma yoyote inayohusu mkopo wako wa HESLB.</p>
      </div>

      <Countdown deadline={dl?.deadline_at} note={dl?.deadline_note} className="mt-6" />

      <form onSubmit={submit} className="mt-8 space-y-5">
        <StudentIdentity identity={identity} />
        <div className="space-y-2 digital-field">
          <Label>Chagua Aina ya Huduma *</Label>
          <Select value={form.problem_type} onValueChange={(v) => setForm({ ...form, problem_type: v })}>
            <SelectTrigger><SelectValue placeholder="Chagua aina ya huduma" /></SelectTrigger>

            <SelectContent>
              {problems.map((p) => <SelectItem key={p.id} value={p.label}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 digital-field">
          <Label htmlFor="form-four">Namba ya Kidato cha Nne *</Label>
          <Input id="form-four" placeholder="Mf. S2325.0982.2020" value={form.form_four_index} onChange={(e) => setForm({ ...form, form_four_index: e.target.value })} required />
        </div>
        <div className="space-y-2 digital-field">
          <Label>Maelezo ya Ombi *</Label>
          <Textarea rows={6} value={form.problem_description}
            onChange={(e) => setForm({ ...form, problem_description: e.target.value })} required />
        </div>
        <Button type="submit" disabled={loading || !identity.student} size="lg" className="w-full digital-field">
          {loading ? "Inatuma..." : "Tuma Ombi"}
        </Button>
      </form>
    </div>
  );
}
