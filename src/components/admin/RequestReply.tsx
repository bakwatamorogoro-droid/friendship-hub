import { useEffect, useState } from "react";
import { FileText, MessageSquare, Paperclip, Send, LoaderCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { TrackKind } from "@/lib/tracking.functions";

export function RequestReply({ id, kind, name }: { id: string; kind: TrackKind; name: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("message");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<Array<{ id: string; subject: string; body: string; created_at: string; attachment_name: string | null }>>([]);
  const [error, setError] = useState("");
  const load = async () => {
    const { data, error } = await supabase.from("request_replies").select("id,subject,body,created_at,attachment_name").eq("request_id", id).eq("kind", kind).order("created_at");
    if (error) setError("Majibu hayajapakiwa. Jaribu tena."); else setHistory(data ?? []);
  };
  useEffect(() => { if (open) void load(); }, [open, id, kind]);
  const send = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError("");
    let path: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ingia tena ili kutuma jibu.");
      if (file) {
        if (file.size > 5 * 1024 * 1024) throw new Error("Faili isizidi MB 5.");
        if (!/\.(pdf|docx?|xlsx?|png|jpe?g)$/i.test(file.name)) throw new Error("Chagua PDF, Word, Excel au picha.");
        path = `${user.id}/${kind}/${id}/${crypto.randomUUID()}.${file.name.split(".").pop()?.toLowerCase()}`;
        const { error } = await supabase.storage.from("request-replies").upload(path, file);
        if (error) throw new Error("Faili haijatumwa. Jaribu tena.");
      }
      const { error } = await supabase.from("request_replies").insert({ request_id: id, kind, author_id: user.id, reply_type: type, subject: subject.trim(), body: body.trim(), attachment_path: path, attachment_name: file?.name ?? null });
      if (error) throw new Error("Jibu halijatumwa. Hakikisha ombi ni la wizara yako.");
      setSubject(""); setBody(""); setFile(null); await load(); toast.success("Jibu limetumwa kwa mwombaji");
    } catch (err) {
      if (path) await supabase.storage.from("request-replies").remove([path]);
      setError(err instanceof Error ? err.message : "Jibu halijatumwa.");
    } finally { setBusy(false); }
  };
  return <><Button size="sm" variant="outline" onClick={() => setOpen(true)}><MessageSquare className="h-4 w-4" />Jibu</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto">
      <DialogHeader><DialogTitle>Jibu ombi</DialogTitle><DialogDescription>{name}</DialogDescription></DialogHeader>
      <div className="space-y-3 border-b border-border pb-4">{history.map(r => <div key={r.id} className="border-l-2 border-primary pl-3"><p className="text-sm font-semibold">{r.subject}</p><p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{r.body}</p>{r.attachment_name && <p className="mt-1 flex items-center gap-1 text-xs text-primary"><Paperclip className="h-3 w-3" />{r.attachment_name}</p>}<p className="mt-1 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("sw-TZ")}</p></div>)}</div>
      <form onSubmit={send} className="space-y-4">
        <div className="flex gap-2" aria-label="Aina ya jibu">{[["message","Ujumbe"],["letter","Barua"],["form","Fomu"]].map(([value,label]) => <Button key={value} type="button" variant={type === value ? "default" : "outline"} onClick={() => setType(value)} aria-pressed={type === value}><FileText className="h-4 w-4" />{label}</Button>)}</div>
        <div className="space-y-2"><Label htmlFor={`reply-subject-${id}`}>Kichwa</Label><Input id={`reply-subject-${id}`} value={subject} onChange={e => setSubject(e.target.value)} required maxLength={200} /></div>
        <div className="space-y-2"><Label htmlFor={`reply-body-${id}`}>Jibu / maelekezo</Label><Textarea id={`reply-body-${id}`} value={body} onChange={e => setBody(e.target.value)} rows={5} required maxLength={10000} /></div>
        <div className="space-y-2"><Label htmlFor={`reply-file-${id}`}>Ambatisha barua au fomu</Label><Input key={file ? "selected" : "empty"} id={`reply-file-${id}`} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={e => setFile(e.target.files?.[0] ?? null)} /></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={busy || !subject.trim() || !body.trim()}>{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Tuma jibu</Button>
      </form>
    </DialogContent></Dialog></>;
}