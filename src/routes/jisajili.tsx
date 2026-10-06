import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showStatus } from "@/lib/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/jisajili")({
  head: () => ({
    meta: [
      { title: "Jisajili Mwanafunzi — MUMSO" },
      { name: "description", content: "Kila mwanafunzi wa MUM anatakiwa kujisajili hapa: majina, simu, REG namba, mwaka wa masomo na kozi." },
      { property: "og:title", content: "Jisajili Mwanafunzi — MUMSO" },
      { property: "og:description", content: "Sajili taarifa zako za mwanafunzi kwenye mfumo wa MUMSO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentSignupPage,
});

const YEARS = ["Mwaka wa 1", "Mwaka wa 2", "Mwaka wa 3", "Mwaka wa 4", "Mwaka wa 5"];

const schema = z.object({
  full_name: z.string().trim().min(4, "Andika majina yako kamili").max(120),
  phone: z.string().trim().regex(/^[+0-9\s-]{7,20}$/, "Namba ya simu si sahihi"),
  registration_number: z.string().trim().min(4, "Andika REG namba yako").max(60),
  year_of_study: z.string().min(1, "Chagua mwaka wa masomo"),
  course: z.string().trim().min(2, "Andika kozi yako").max(120),
});

function StudentSignupPage() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    full_name: "", phone: "", registration_number: "", year_of_study: "", course: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { showStatus("error", parsed.error.issues[0]?.message ?? "Jaza taarifa zote"); return; }
    setLoading(true);
    const { error } = await (supabase.from("students") as any).insert(parsed.data);
    setLoading(false);
    if (error) {
      showStatus("error", error.message.includes("duplicate") || error.code === "23505"
        ? "REG namba hii imeshasajiliwa tayari."
        : "Hitilafu: " + error.message);
      return;
    }
    setDone(true);
    setForm({ full_name: "", phone: "", registration_number: "", year_of_study: "", course: "" });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="digital-page-hero">
        <h1 className="relative z-10 flex items-center gap-3 text-3xl md:text-4xl font-bold">
          <GraduationCap className="h-8 w-8" /> Usajili wa Mwanafunzi
        </h1>
        <p className="relative z-10 mt-2 text-primary-foreground/85 text-base md:text-lg">
          Kila mwanafunzi anatakiwa kujisajili: majina, simu, REG namba, mwaka wa masomo na kozi yake.
        </p>
      </div>

      {done ? (
        <div className="digital-card mt-8 p-8 text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-3 text-xl font-bold">Umejisajili kikamilifu</h2>
          <p className="mt-2 text-muted-foreground">
            Taarifa zako zimepokelewa na MUMSO. Asante!
          </p>
          <Button className="mt-5" variant="outline" onClick={() => setDone(false)}>Sajili Mwanafunzi Mwingine</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="digital-card mt-8 space-y-5 p-6">
          <div className="space-y-2"><Label>Majina Kamili *</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Mf. Juma Ally Hassan" required /></div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Namba ya Simu *</Label>
              <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+255 7XX XXX XXX" required /></div>
            <div className="space-y-2"><Label>REG Namba ya Chuo *</Label>
              <Input value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} placeholder="MUM2021-04-07625" required /></div>
            <div className="space-y-2"><Label>Mwaka wa Masomo *</Label>
              <Select value={form.year_of_study} onValueChange={(v) => setForm({ ...form, year_of_study: v })}>
                <SelectTrigger><SelectValue placeholder="Chagua mwaka" /></SelectTrigger>
                <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-2"><Label>Kozi Unayosomea *</Label>
              <Input value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} placeholder="Mf. LLB / BBA / BEd" required /></div>
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Inatuma..." : "Jisajili Sasa"}
          </Button>
        </form>
      )}
    </div>
  );
}
