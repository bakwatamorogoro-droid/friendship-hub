import { useEffect, useState } from "react";
import { FileUp, FolderOpen, Paperclip, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { uploadAttachment, formatBytes, type UploadedFile } from "@/lib/attachments";
import { useResolvedUrl } from "@/lib/storage-url";
import {
  attachFile,
  loadLeaderDirectory,
  loadSentAttachments,
  sendMessage,
  type LeaderContact,
  type MessageAttachment,
} from "@/lib/ministry";

/**
 * Nyaraka: kiongozi hupakia PDF au picha na kuzituma kwa kiongozi mwingine au
 * kwa Wizara ya Habari. Kila faili huhifadhiwa kwenye rekodi ya ujumbe.
 */
export function DocumentsPanel({ canSendNews = true }: { canSendNews?: boolean }) {
  const { t } = useI18n();
  const [userId, setUserId] = useState("");
  const [contacts, setContacts] = useState<LeaderContact[]>([]);
  const [sent, setSent] = useState<MessageAttachment[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipient, setRecipient] = useState("");
  const [channel, setChannel] = useState<"direct" | "news">("direct");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const reload = async (uid: string) => {
    const [cts, own] = await Promise.all([
      loadLeaderDirectory(),
      uid ? loadSentAttachments(uid) : Promise.resolve([] as MessageAttachment[]),
    ]);
    setContacts(cts);
    setSent(own);
  };

  useEffect(() => {
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const uid = user?.id ?? "";
      setUserId(uid);
      await reload(uid);
    })();
  }, []);

  const pick = async (list: FileList | null) => {
    if (!list?.length) return;
    setUploading(true);
    const next: UploadedFile[] = [...files];
    for (const file of Array.from(list)) {
      const res = await uploadAttachment(file, "messages");
      if (!res.ok) {
        toast.error(res.error);
        continue;
      }
      next.push(res.file);
    }
    setUploading(false);
    setFiles(next);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subject.trim().length < 3 || body.trim().length < 5) {
      toast.error(t("mw.message_too_short"));
      return;
    }
    if (channel === "direct" && !recipient) {
      toast.error(t("mw.choose_leader"));
      return;
    }
    setBusy(true);
    const msg = await sendMessage({
      channel: channel === "news" ? "news" : "cabinet",
      recipientId: channel === "direct" ? recipient : null,
      subject,
      body,
    });
    if (!msg.ok || !msg.id) {
      setBusy(false);
      toast.error(msg.error ?? t("common.error"));
      return;
    }
    for (const f of files) {
      const res = await attachFile({
        messageId: msg.id,
        fileUrl: f.url,
        fileName: f.name,
        mimeType: f.mimeType,
        sizeBytes: f.size,
      });
      if (!res.ok) toast.error(res.error ?? t("common.error"));
    }
    setBusy(false);
    toast.success(files.length ? t("mw.attachment_sent") : t("mw.message_sent"));
    setSubject("");
    setBody("");
    setFiles([]);
    setRecipient("");
    await reload(userId);
  };

  return (
    <div className="mw-tools">
      <section className="mw-panel" aria-label={t("mw.attach")}>
        <div className="mw-panel-head">
          <h3 className="mw-subhead">
            <FileUp className="h-4 w-4 text-primary" /> {t("mw.attach")}
          </h3>
          <span className="mw-count">{t("mw.documents")}</span>
        </div>
        <form onSubmit={submit} className="mw-form">
          <p className="mw-form-lead">{t("mw.documents_lead")}</p>

          <div className="mw-channel-row" role="group" aria-label={t("mw.channel")}>
            <button
              type="button"
              onClick={() => setChannel("direct")}
              className={`mw-channel ${channel === "direct" ? "is-active" : ""}`}
            >
              <Paperclip className="h-4 w-4" />
              <span>
                <strong>{t("mw.to_leader")}</strong>
                <small>{t("mw.to_leader_lead")}</small>
              </span>
            </button>
            {canSendNews && (
              <button
                type="button"
                onClick={() => setChannel("news")}
                className={`mw-channel ${channel === "news" ? "is-active" : ""}`}
              >
                <Send className="h-4 w-4" />
                <span>
                  <strong>{t("mw.to_news")}</strong>
                  <small>{t("mw.to_news_lead")}</small>
                </span>
              </button>
            )}
          </div>

          {channel === "direct" && (
            <div className="mw-field">
              <Label className="mw-field-label" htmlFor="doc-recipient">
                {t("mw.choose_leader")}
              </Label>
              <select
                id="doc-recipient"
                className="mw-select w-full"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                required
              >
                <option value="">{t("mw.choose_leader")}</option>
                {contacts.map((c) => (
                  <option key={c.user_id} value={c.user_id}>
                    {c.full_name}
                    {c.position ? ` — ${c.position}` : ""}
                    {c.department_name ? ` (${c.department_name})` : ""}
                  </option>
                ))}
              </select>
              {contacts.length === 0 && (
                <p className="text-xs text-muted-foreground">{t("mw.no_contacts")}</p>
              )}
            </div>
          )}

          <div className="mw-field">
            <Label className="mw-field-label" htmlFor="doc-subject">
              {t("mw.subject")}
            </Label>
            <Input
              id="doc-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              required
            />
          </div>
          <div className="mw-field">
            <Label className="mw-field-label" htmlFor="doc-body">
              {t("mw.message")}
            </Label>
            <Textarea
              id="doc-body"
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={5000}
              required
            />
          </div>

          <div className="mw-drop">
            <label className="inline-flex cursor-pointer items-center gap-2 font-semibold text-primary">
              <Paperclip className="h-4 w-4" />
              {uploading ? t("mw.uploading") : t("mw.attach")}
              <input
                type="file"
                className="hidden"
                accept="application/pdf,image/*"
                multiple
                onChange={(e) => void pick(e.target.files)}
              />
            </label>
            <span>{t("mw.files_only")}</span>
          </div>

          {files.length > 0 && (
            <div className="mw-files">
              {files.map((f, i) => (
                <span key={`${f.name}-${i}`} className="mw-file">
                  <Paperclip className="h-3 w-3" />
                  <span className="mw-file-name">{f.name}</span>
                  <span className="opacity-70">{formatBytes(f.size)}</span>
                  <button
                    type="button"
                    aria-label={`${t("common.delete")} ${f.name}`}
                    onClick={() => setFiles(files.filter((_, x) => x !== i))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div>
            <Button type="submit" disabled={busy || uploading}>
              <Send className="mr-2 h-4 w-4" />
              {busy ? t("common.sending") : t("mw.send_message")}
            </Button>
          </div>
        </form>
      </section>

      <section className="mw-panel" aria-label={t("mw.documents")}>
        <div className="mw-panel-head">
          <h3 className="mw-subhead">
            <FolderOpen className="h-4 w-4 text-primary" /> {t("mw.documents")}
          </h3>
          <span className="mw-count">{sent.length}</span>
        </div>
        {sent.length === 0 ? (
          <div className="mw-empty-state">
            <span className="mw-empty-icon">
              <FolderOpen className="h-5 w-5" />
            </span>
            <p className="mw-empty-title">{t("mw.no_attachments")}</p>
          </div>
        ) : (
          <ul className="mw-list">
            {sent.map((a) => (
              <li key={a.id} className="mw-track-item">
                <div className="min-w-0">
                  <p className="mw-track-item-title">{a.file_name}</p>
                  <p className="mw-track-item-meta">
                    {new Date(a.created_at).toLocaleString("sw-TZ")}
                    {a.size_bytes ? ` · ${formatBytes(a.size_bytes)}` : ""}
                  </p>
                </div>
                <DocumentLink attachment={a} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Kiungo cha kupakua kinachotumia URL ya muda mrefu iliyohifadhiwa. */
function DocumentLink({ attachment }: { attachment: MessageAttachment }) {
  const { t } = useI18n();
  const url = useResolvedUrl(attachment.file_url);
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="mw-file">
      <Paperclip className="h-3 w-3" />
      <span className="mw-file-name">{t("mw.download")}</span>
    </a>
  );
}
