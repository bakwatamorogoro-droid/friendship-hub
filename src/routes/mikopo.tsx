import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFormCategories } from "@/lib/use-site-settings";

export const Route = createFileRoute("/mikopo")({
  head: () => ({
    meta: [
      { title: "Huduma ya Mikopo — MUMSO" },
      { name: "description", content: "Omba huduma za mikopo: disbursement, allocation, appeal na zaidi." },
      { property: "og:title", content: "Huduma ya Mikopo — MUMSO" },
      { property: "og:description", content: "Jaza fomu ya mkopo wa HESLB na omba huduma ya mkopo kwa MUMSO." },
    ],
  }),
  component: MikopoPage,
});

const years = ["Mwaka 1", "Mwaka 2", "Mwaka 3", "Mwaka 4", "Mwaka 5"];

const schema = z.object({
  full_name: z.string().trim().min(5, "Andika majina matatu kamili").max(120)
    .refine((v) => v.split(/\s+/).filter(Boolean).length >= 3, "Andika majina matatu (mf. Juma Ally Hassan)"),
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
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "", form_four_index: "", registration_number: "", course: "",
    year_of_study: "", phone: "", problem_type: "", problem_description: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Tafadhali jaza taarifa zote kwa usahihi."); return; }
    setLoading(true);
    const { error } = await supabase.from("loan_requests").insert({ ...parsed.data, email: "" });
    setLoading(false);
    if (error) { toast.error("Hitilafu: " + error.message); return; }
    toast.success("Ombi lako limepokelewa. Tutawasiliana nawe.");
    setForm({ full_name: "", form_four_index: "", registration_number: "", course: "", year_of_study: "", phone: "", problem_type: "", problem_description: "" });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="digital-page-hero">
        <h1 className="text-3xl md:text-4xl font-bold relative z-10">Huduma ya Mikopo</h1>
        <p className="mt-2 text-primary-foreground/85 relative z-10">Jaza fomu hii kuomba huduma yoyote inayohusu mkopo wako wa HESLB.</p>
      </div>

      <form onSubmit={submit} className="digital-card mt-8 p-6 space-y-5">
        <div className="space-y-2 digital-field">
          <Label>Chagua Aina ya Huduma *</Label>
          <Select value={form.problem_type} onValueChange={(v) => setForm({ ...form, problem_type: v })}>
            <SelectTrigger><SelectValue placeholder="Chagua aina ya huduma" /></SelectTrigger>

            <SelectContent>
              {problems.map((p) => <SelectItem key={p.id} value={p.label}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 digital-field md:col-span-2">
            <Label>Majina Matatu Kamili *</Label>
            <Input placeholder="Mf. Juma Ally Hassan" value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          </div>
          <div className="space-y-2 digital-field">
            <Label>Namba ya Kidato cha Nne *</Label>
            <Input placeholder="Mf. S2325.0982.2020" value={form.form_four_index}
              onChange={(e) => setForm({ ...form, form_four_index: e.target.value })} required />
          </div>
          <div className="space-y-2 digital-field">
            <Label>REG Namba yako ya Chuo *</Label>
            <Input placeholder="Mf. MUM2021-04-07625" value={form.registration_number}
              onChange={(e) => setForm({ ...form, registration_number: e.target.value })} required />
          </div>
          <div className="space-y-2 digital-field">
            <Label>Kozi ya Masomo *</Label>
            <Input placeholder="Mf. LLB" value={form.course}
              onChange={(e) => setForm({ ...form, course: e.target.value })} required />
          </div>
          <div className="space-y-2 digital-field">
            <Label>Mwaka wa Masomo *</Label>
            <Select value={form.year_of_study} onValueChange={(v) => setForm({ ...form, year_of_study: v })}>
              <SelectTrigger><SelectValue placeholder="Mf. Mwaka 2" /></SelectTrigger>
              <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2 digital-field md:col-span-2">
            <Label>Namba ya Simu *</Label>
            <Input type="tel" placeholder="+255 7XX XXX XXX" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </div>
        </div>
        <div className="space-y-2 digital-field">
          <Label>Maelezo ya Ombi *</Label>
          <Textarea rows={6} value={form.problem_description}
            onChange={(e) => setForm({ ...form, problem_description: e.target.value })} required />
        </div>
        <Button type="submit" disabled={loading} size="lg" className="w-full digital-field">
          {loading ? "Inatuma..." : "Tuma Ombi"}
        </Button>
      </form>
    </div>
  );
}
