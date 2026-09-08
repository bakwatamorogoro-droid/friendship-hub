import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HeartCrack, Plus } from "lucide-react";

export const Route = createFileRoute("/misiba")({
  head: () => ({
    meta: [
      { title: "Taarifa za Misiba — MUMSO" },
      { name: "description", content: "Toa taarifa ya msiba na uone misiba iliyotangazwa." },
    ],
  }),
  component: MisibaPage,
});

type Death = {
  id: string; deceased_name: string; relationship: string; student_name: string;
  registration_number: string; phone: string; death_date: string; location: string;
  description: string | null; created_at: string;
};

const schema = z.object({
  deceased_name: z.string().trim().min(2).max(120),
  relationship: z.string().trim().min(2).max(60),
  student_name: z.string().trim().min(2).max(120),
  registration_number: z.string().trim().min(2).max(60),
  phone: z.string().trim().min(7).max(20),
  death_date: z.string().min(1),
  location: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
});

function MisibaPage() {
  const [list, setList] = useState<Death[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    deceased_name: "", relationship: "", student_name: "",
    registration_number: "", phone: "", death_date: "", location: "", description: "",
  });

  const load = async () => {
    const { data } = await supabase.from("deaths").select("*").order("created_at", { ascending: false }).limit(50);
    setList((data ?? []) as Death[]);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error("Tafadhali jaza taarifa zote kwa usahihi."); return; }
    setLoading(true);
    const { error } = await supabase.from("deaths").insert(parsed.data);
    setLoading(false);
    if (error) { toast.error("Hitilafu: " + error.message); return; }
    toast.success("Taarifa imepokelewa. Tunakupa pole.");
    setOpen(false);
    setForm({ deceased_name: "", relationship: "", student_name: "", registration_number: "", phone: "", death_date: "", location: "", description: "" });
    load();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Taarifa za Misiba</h1>
          <p className="mt-2 text-muted-foreground">Tunatuma pole zetu kwa familia za waliopotelewa.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg"><Plus className="mr-2 h-4 w-4" /> Toa Taarifa</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Tuma Taarifa ya Msiba</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="digital-card p-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 digital-field"><Label>Jina la Marehemu</Label><Input value={form.deceased_name} onChange={(e) => setForm({ ...form, deceased_name: e.target.value })} required /></div>
                <div className="space-y-2 digital-field"><Label>Uhusiano (mfano: baba)</Label><Input value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} required /></div>
                <div className="space-y-2 digital-field"><Label>Jina la Mwanafunzi</Label><Input value={form.student_name} onChange={(e) => setForm({ ...form, student_name: e.target.value })} required /></div>
                <div className="space-y-2 digital-field"><Label>Reg Number</Label><Input value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} required /></div>
                <div className="space-y-2 digital-field"><Label>Simu</Label><Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
                <div className="space-y-2 digital-field"><Label>Tarehe ya Msiba</Label><Input type="date" value={form.death_date} onChange={(e) => setForm({ ...form, death_date: e.target.value })} required /></div>
                <div className="space-y-2 md:col-span-2 digital-field"><Label>Mahali</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required /></div>
              </div>
              <div className="space-y-2 digital-field"><Label>Maelezo (hiari)</Label><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <Button type="submit" disabled={loading} className="w-full digital-field">{loading ? "Inatuma..." : "Tuma"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-10 space-y-4">
        {list.length === 0 && <p className="text-center text-muted-foreground py-12">Hakuna taarifa za misiba kwa sasa.</p>}
        {list.map((d) => (
          <article key={d.id} className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <HeartCrack className="h-6 w-6" />
              </span>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Marehemu {d.deceased_name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {d.relationship} wa <strong>{d.student_name}</strong> ({d.registration_number})
                </p>
                <p className="text-sm text-muted-foreground">Tarehe: {new Date(d.death_date).toLocaleDateString("sw-TZ")} • {d.location}</p>
                {d.description && <p className="mt-3 text-sm text-foreground/80">{d.description}</p>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}