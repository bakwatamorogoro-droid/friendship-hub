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

export const Route = createFileRoute("/changamoto")({
  head: () => ({
    meta: [
      { title: "Huduma — MUMSO" },
      { name: "description", content: "Tuma huduma yoyote unayoipitia — kitaaluma, kifedha, afya, kufiwa na ushauri." },
      { property: "og:title", content: "Huduma — MUMSO" },
      { property: "og:description", content: "Tuma huduma yoyote unayoipitia moja kwa moja kwa viongozi wa MUMSO." },
    ],
  }),
  component: ChangamotoPage,
});

const schema = z.object({
  full_name: z.string().trim().min(2).max(120),
  registration_number: z.string().trim().min(2).max(60),
  course: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(20),
  challenge_type: z.string().min(1),
  description: z.string().trim().min(10).max(2000),
});

function ChangamotoPage() {
  const types = useFormCategories("huduma");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "", registration_number: "", course: "", phone: "",
    challenge_type: "", description: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error("Tafadhali jaza taarifa zote kwa usahihi."); return; }
    setLoading(true);
    const { error } = await supabase.from("challenges").insert(parsed.data);
    setLoading(false);
    if (error) { toast.error("Hitilafu: " + error.message); return; }
    toast.success("Ombi lako la huduma limepokelewa. Asante!");
    setForm({ full_name: "", registration_number: "", course: "", phone: "", challenge_type: "", description: "" });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="digital-page-hero">
        <h1 className="text-3xl md:text-4xl font-bold relative z-10">Huduma</h1>
        <p className="mt-2 text-primary-foreground/85 relative z-10">Tuma huduma yoyote — kitaaluma, kifedha, afya, kufiwa na ushauri — moja kwa moja kwa viongozi wa MUMSO.</p>
      </div>
      <form onSubmit={submit} className="digital-card mt-8 p-6 space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 digital-field"><Label>Jina Kamili</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></div>
          <div className="space-y-2 digital-field"><Label>Registration Number</Label><Input value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} required /></div>
          <div className="space-y-2 digital-field"><Label>Kozi</Label><Input value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} required /></div>
          <div className="space-y-2 digital-field"><Label>Simu</Label><Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
        </div>
        <div className="space-y-2 digital-field">
          <Label>Aina ya Huduma</Label>
          <Select value={form.challenge_type} onValueChange={(v) => setForm({ ...form, challenge_type: v })}>
            <SelectTrigger><SelectValue placeholder="Chagua aina" /></SelectTrigger>
            <SelectContent>
              {types.map((t) => <SelectItem key={t.id} value={t.label}>{t.label}</SelectItem>)}
              <SelectItem value="Kufiwa (Msiba)">Kufiwa (Msiba)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 digital-field">
          <Label>Maelezo</Label>
          <Textarea rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        </div>
        <Button type="submit" disabled={loading} size="lg" className="w-full digital-field">
          {loading ? "Inatuma..." : "Tuma Ombi la Huduma"}
        </Button>
      </form>
    </div>
  );
}