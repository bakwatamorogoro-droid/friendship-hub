import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Building2, Paperclip, X } from "lucide-react";
import { useDepartmentBySlug, useDepartmentCategories, useFormCategories } from "@/lib/use-site-settings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/huduma/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Idara — MUMSO (${params.slug})` },
      { name: "description", content: "Tuma ombi la huduma moja kwa moja kwa kiongozi wa idara hii ya MUMSO." },
      { property: "og:title", content: "Idara ya MUMSO" },
      { property: "og:description", content: "Tuma ombi la huduma moja kwa moja kwa kiongozi wa idara." },
    ],
  }),
  component: DepartmentPage,
});

const genders = ["Mwanaume", "Mwanamke"];

const ALLOWED = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE = 25 * 1024 * 1024;

const schema = z.object({
  full_name: z.string().trim().min(2, "Andika majina kamili").max(120),
  registration_number: z.string().trim().min(2, "Andika REG namba").max(60),
  phone: z.string().trim().regex(/^[+0-9\s-]{7,20}$/i, "Namba ya simu si sahihi"),
  gender: z.string().min(1, "Chagua jinsia"),
  course: z.string().trim().min(2, "Andika kozi").max(120),
  category: z.string().optional().or(z.literal("")),
  description: z.string().trim().max(3000).optional().or(z.literal("")),
});

function DepartmentPage() {
  const { slug } = Route.useParams();
  const dept = useDepartmentBySlug(slug);
  const deptCats = useDepartmentCategories(dept?.id);
  const legacyCats = useFormCategories(/mkopo|mikopo|fedha|loan/i.test(slug) ? "mikopo" : "huduma");
  const cats = deptCats.length > 0 ? deptCats : legacyCats;

  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    full_name: "", registration_number: "", phone: "",
    gender: "", course: "", category: "", description: "",
  });

  const pickFile = (f: File | null) => {
    if (!f) { setFile(null); return; }
    if (!ALLOWED.includes(f.type)) {
      toast.error("Faili linaruhusiwa: PDF, picha (JPG/PNG) au Word.");
      return;
    }
    if (f.size > MAX_SIZE) { toast.error("Faili ni kubwa mno (kikomo MB 25)."); return; }
    setFile(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dept) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Tafadhali jaza taarifa zote.");
      return;
    }
    if (!parsed.data.description && !file) {
      toast.error("Andika maelezo ya huduma unayohitaji au ambatanisha faili.");
      return;
    }
    setLoading(true);

    let attachment_url: string | null = null;
    let attachment_name: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${dept.slug}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("submissions").upload(path, file, {
        contentType: file.type, upsert: false,
      });
      if (upErr) {
        setLoading(false);
        toast.error("Imeshindikana kupakia faili: " + upErr.message);
        return;
      }
      attachment_url = supabase.storage.from("submissions").getPublicUrl(path).data.publicUrl;
      attachment_name = file.name;
    }

    const { error } = await (supabase.from("department_submissions") as any).insert({
      department_id: dept.id,
      full_name: parsed.data.full_name,
      registration_number: parsed.data.registration_number,
      phone: parsed.data.phone,
      gender: parsed.data.gender,
      course: parsed.data.course,
      category: parsed.data.category || null,
      description: parsed.data.description || null,
      attachment_url,
      attachment_name,
    });
    setLoading(false);
    if (error) { toast.error("Hitilafu: " + error.message); return; }
    toast.success(`Ombi lako limepokelewa na ${dept.name}.`);
    setForm({ full_name: "", registration_number: "", phone: "", gender: "", course: "", category: "", description: "" });
    setFile(null);
  };

  if (!dept) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-muted-foreground">Inapakia idara...</p>
        <Link to="/huduma" className="mt-4 inline-flex items-center gap-1 text-primary text-sm">
          <ArrowLeft className="h-4 w-4" /> Rudi kwenye Idara
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link to="/huduma" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
        <ArrowLeft className="h-4 w-4" /> Idara zote
      </Link>
      <div className="digital-page-hero">
        <div className="relative z-10 flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15 text-primary-foreground">
            <Building2 className="h-7 w-7" />
          </span>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">{dept.name}</h1>
            {dept.description && <p className="mt-2 text-primary-foreground/85">{dept.description}</p>}
            {dept.leader_name && (
              <p className="mt-3 text-sm text-primary-foreground/80">
                Kiongozi wa Idara: <strong>{dept.leader_name}</strong>
                {dept.leader_contact && <span> • {dept.leader_contact}</span>}
              </p>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="digital-card mt-8 p-6 space-y-5">
        <p className="text-sm text-muted-foreground">
          Fomu hii inaenda moja kwa moja kwa <strong className="text-foreground">{dept.name}</strong> pekee.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 digital-field md:col-span-2">
            <Label>Majina Kamili *</Label>
            <Input required minLength={2} maxLength={120} value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="Mf. Juma Ally Hassan" />
          </div>
          <div className="space-y-2 digital-field">
            <Label>REG Namba (Namba ya Chuo) *</Label>
            <Input required minLength={2} maxLength={60} value={form.registration_number}
              onChange={(e) => setForm({ ...form, registration_number: e.target.value })}
              placeholder="Mf. MUM/BA/2023/001" />
          </div>
          <div className="space-y-2 digital-field">
            <Label>Namba ya Simu *</Label>
            <Input required type="tel" pattern="[+0-9\s\-]{7,20}" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+255 7XX XXX XXX" />
          </div>
          <div className="space-y-2 digital-field">
            <Label>Jinsia *</Label>
            <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
              <SelectTrigger><SelectValue placeholder="Chagua jinsia" /></SelectTrigger>
              <SelectContent>{genders.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2 digital-field">
            <Label>Kozi Unayosomea *</Label>
            <Input required minLength={2} maxLength={120} value={form.course}
              onChange={(e) => setForm({ ...form, course: e.target.value })}
              placeholder="Mf. LLB / BBA / BEd" />
          </div>
        </div>

        {cats.length > 0 && (
          <div className="space-y-2 digital-field">
            <Label>Aina ya Huduma (hiari)</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue placeholder="Chagua aina ya huduma" /></SelectTrigger>
              <SelectContent>
                {cats.map((c) => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2 digital-field">
          <Label>Maelezo ya Huduma Unayohitaji</Label>
          <Textarea rows={5} maxLength={3000} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Andika maelezo yako hapa..." />
        </div>

        <div className="space-y-2">
          <Label>Au ambatanisha faili (PDF, picha au Word)</Label>
          <div className="flex flex-wrap items-center gap-3">
            <Label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-secondary">
              <Paperclip className="h-4 w-4" /> Chagua faili
              <input
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
            </Label>
            {file && (
              <span className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-1.5 text-sm">
                {file.name}
                <button type="button" onClick={() => setFile(null)} aria-label="Ondoa faili">
                  <X className="h-4 w-4" />
                </button>
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Kikomo: MB 25 kwa faili moja.</p>
        </div>

        <Button type="submit" disabled={loading} size="lg" className="w-full digital-field">
          {loading ? "Inatuma..." : `Tuma kwa ${dept.name}`}
        </Button>
      </form>
    </div>
  );
}
