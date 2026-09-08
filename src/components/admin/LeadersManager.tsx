import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createStorageUrl, useResolvedUrl } from "@/lib/storage-url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Upload, UserRound } from "lucide-react";

type Row = Record<string, any>;

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");

function LeaderPhoto({ url }: { url: string | null }) {
  const src = useResolvedUrl(url);
  if (!src) {
    return (
      <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-secondary text-muted-foreground">
        <UserRound className="h-8 w-8" />
      </div>
    );
  }
  return <img src={src} alt="" className="h-20 w-20 shrink-0 rounded-2xl border border-border object-cover" />;
}

export function LeadersManager() {
  const [leaders, setLeaders] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "", position: "", short_message: "", bio: "", phone: "", email: "", sort_order: 0,
  });

  const load = async () => {
    const { data } = await (supabase.from("leaders") as any)
      .select("*").order("sort_order", { ascending: true });
    setLeaders((data as Row[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.position.trim()) {
      toast.error("Jina na nafasi zinahitajika"); return;
    }
    setSaving(true);
    const base = slugify(form.full_name) || `kiongozi-${Date.now()}`;
    const slug = leaders.some((l) => l.slug === base) ? `${base}-${Date.now().toString().slice(-4)}` : base;
    const { error } = await (supabase.from("leaders") as any).insert({
      slug,
      full_name: form.full_name.trim(),
      position: form.position.trim(),
      short_message: form.short_message.trim() || null,
      bio: form.bio.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      sort_order: Number(form.sort_order) || leaders.length,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Kiongozi amesajiliwa");
    setForm({ full_name: "", position: "", short_message: "", bio: "", phone: "", email: "", sort_order: 0 });
    load();
  };

  const updateField = async (id: string, field: string, value: any) => {
    const { error } = await (supabase.from("leaders") as any).update({ [field]: value }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setLeaders((p) => p.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const uploadPhoto = async (id: string, file: File) => {
    setUploadingId(id);
    const path = `leader-${id}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const up = await supabase.storage.from("site-assets").upload(path, file, { upsert: true });
    if (up.error) { setUploadingId(null); toast.error(up.error.message); return; }
    const url = await createStorageUrl("site-assets", path);
    await (supabase.from("leaders") as any).update({ photo_url: url }).eq("id", id);
    setUploadingId(null);
    toast.success("Picha imehifadhiwa");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Futa kiongozi huyu?")) return;
    const { error } = await (supabase.from("leaders") as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <div className="mt-6 max-w-4xl space-y-6">
      <form onSubmit={add} className="space-y-4 rounded-xl border border-border bg-card p-6">
        <div>
          <h2 className="text-lg font-semibold">Sajili Kiongozi (Menejimenti)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Viongozi wanasajiliwa hapa na menejimenti. Wanaonekana kwenye ukurasa wa nyumbani na ukurasa wa Uongozi.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Majina Kamili *</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></div>
          <div className="space-y-2"><Label>Nafasi / Cheo *</Label>
            <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Rais wa MUMSO" required /></div>
          <div className="space-y-2"><Label>Namba ya Simu</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="space-y-2"><Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        </div>
        <div className="space-y-2"><Label>Neno Fupi (linaonekana kwenye kadi)</Label>
          <Textarea rows={2} value={form.short_message} onChange={(e) => setForm({ ...form, short_message: e.target.value })} /></div>
        <div className="space-y-2"><Label>Wasifu Kamili (ukurasa wake)</Label>
          <Textarea rows={5} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
        <div className="space-y-2 max-w-[180px]"><Label>Mpangilio (0 = juu)</Label>
          <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
        <Button type="submit" disabled={saving}>
          <Plus className="mr-2 h-4 w-4" />{saving ? "Inahifadhi..." : "Sajili Kiongozi"}
        </Button>
      </form>

      {leaders.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">Hakuna viongozi bado.</p>
      ) : (
        <div className="space-y-4">
          {leaders.map((l) => (
            <div key={l.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-col gap-4 sm:flex-row">
                <LeaderPhoto url={l.photo_url ?? null} />
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5"><Label>Majina</Label>
                      <Input defaultValue={l.full_name} onBlur={(e) => updateField(l.id, "full_name", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label>Nafasi</Label>
                      <Input defaultValue={l.position} onBlur={(e) => updateField(l.id, "position", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label>Simu</Label>
                      <Input defaultValue={l.phone ?? ""} onBlur={(e) => updateField(l.id, "phone", e.target.value || null)} /></div>
                    <div className="space-y-1.5"><Label>Email</Label>
                      <Input defaultValue={l.email ?? ""} onBlur={(e) => updateField(l.id, "email", e.target.value || null)} /></div>
                  </div>
                  <div className="space-y-1.5"><Label>Neno Fupi</Label>
                    <Textarea rows={2} defaultValue={l.short_message ?? ""} onBlur={(e) => updateField(l.id, "short_message", e.target.value || null)} /></div>
                  <div className="space-y-1.5"><Label>Wasifu Kamili</Label>
                    <Textarea rows={4} defaultValue={l.bio ?? ""} onBlur={(e) => updateField(l.id, "bio", e.target.value || null)} /></div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="space-y-1.5 w-28"><Label>Mpangilio</Label>
                      <Input type="number" defaultValue={l.sort_order} onBlur={(e) => updateField(l.id, "sort_order", Number(e.target.value))} /></div>
                    <label className="flex items-center gap-2 text-sm">
                      <Switch checked={!!l.published} onCheckedChange={(v) => updateField(l.id, "published", v)} />
                      Onekana kwenye tovuti
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                      <Upload className="h-4 w-4" />
                      {uploadingId === l.id ? "Inapakia..." : "Badili Picha"}
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(l.id, f); }} />
                    </label>
                    <Button size="icon" variant="ghost" onClick={() => remove(l.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Ukurasa wake: /viongozi/{l.slug}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
