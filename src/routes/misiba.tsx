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
import { HeartCrack } from "lucide-react";
import { Countdown } from "@/components/Countdown";
import { useServiceDeadline } from "@/lib/use-deadline";

export const Route = createFileRoute("/misiba")({
  head: () => ({
    meta: [
      { title: "Taarifa za Misiba — MUMSO" },
      { name: "description", content: "Jaza fomu ya kutoa taarifa ya msiba kwa uongozi wa MUMSO." },
      { property: "og:title", content: "Taarifa za Misiba — MUMSO" },
      { property: "og:description", content: "Fomu ya kutoa taarifa ya msiba kwa uongozi wa MUMSO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MisibaPage,
});

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

const empty = {
  deceased_name: "", relationship: "", student_name: "",
  registration_number: "", phone: "", death_date: "", location: "", description: "",
};

function MisibaPage() {
  const identity = useRegisteredStudent();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(empty);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identity.student) { showStatus("error", "Thibitisha REG namba yako kwanza."); return; }
    const parsed = schema.safeParse({ ...form, registration_number: identity.student.registration_number, student_name: identity.student.full_name, phone: identity.student.phone });
    if (!parsed.success) { showStatus("error", "Tafadhali jaza taarifa zote kwa usahihi."); return; }
    setLoading(true);
    const code = newTrackCode();
    const { error } = await (supabase.from("deaths") as any).insert({ ...parsed.data, track_code: code });
    setLoading(false);
    if (error) { showStatus("error", "Hitilafu: " + error.message); return; }
    showStatus({ type: "success", title: "Taarifa imepokelewa", message: trackCodeMessage(code, "Taarifa imepokelewa. Tunakupa pole.") });
    setForm(empty);
  };

  const dl = useServiceDeadline("misiba");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="digital-page-hero hero-3d">
        <h1 className="relative z-10 flex items-center gap-3 text-3xl md:text-4xl font-bold">
          <HeartCrack className="h-8 w-8" /> Taarifa ya Msiba
        </h1>
        <p className="relative z-10 mt-2 text-primary-foreground/85">
          Jaza fomu hii na taarifa yako itafika kwa uongozi wa MUMSO moja kwa moja.
        </p>
      </div>

      <Countdown deadline={dl?.deadline_at} note={dl?.deadline_note} className="mt-6" />

      <form onSubmit={submit} className="mt-8 space-y-4">
        <StudentIdentity identity={identity} />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 digital-field"><Label>Jina la Marehemu</Label><Input value={form.deceased_name} onChange={(e) => setForm({ ...form, deceased_name: e.target.value })} required /></div>
          <div className="space-y-2 digital-field"><Label>Uhusiano (mfano: baba)</Label><Input value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} required /></div>
          <div className="space-y-2 digital-field"><Label>Tarehe ya Msiba</Label><Input type="date" value={form.death_date} onChange={(e) => setForm({ ...form, death_date: e.target.value })} required /></div>
          <div className="space-y-2 md:col-span-2 digital-field"><Label>Mahali</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required /></div>
        </div>
        <div className="space-y-2 digital-field"><Label>Maelezo (hiari)</Label><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <Button type="submit" disabled={loading || !identity.student} size="lg" className="w-full btn-3d">{loading ? "Inatuma..." : "Tuma Taarifa"}</Button>
      </form>
    </div>
  );
}
