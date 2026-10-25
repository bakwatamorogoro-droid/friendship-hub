import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createStorageUrl, resolveStorageUrl } from "@/lib/storage-url";
import {
  announcementDate,
  deleteAnnouncement,
  isImage,
  isPdf,
  loadAnnouncements,
  saveAnnouncement,
  setAnnouncementStatus,
  statusKey,
  type Announcement,
} from "@/lib/announcements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";
import {
  CalendarDays,
  CheckCircle2,
  FileText,
  ImagePlus,
  Loader2,
  Megaphone,
  Pencil,
  Send,
  Trash2,
  Undo2,
} from "lucide-react";

const MAX_BYTES = 10 * 1024 * 1024;

type Draft = {
  id: string | null;
  title: string;
  excerpt: string;
  content: string;
  announcement_date: string;
  image_url: string;
  attachment_url: string;
  attachment_name: string;
  status: "draft" | "pending" | "published" | "rejected";
};

const emptyDraft = (): Draft => ({
  id: null,
  title: "",
  excerpt: "",
  content: "",
  announcement_date: new Date().toISOString().slice(0, 16),
  image_url: "",
  attachment_url: "",
  attachment_name: "",
  status: "pending",
});

/** Hali ya tangazo kama chip yenye rangi ya mfumo. */
export function StatusChip({ status }: { status: Announcement["status"] }) {
  const { t } = useI18n();
  const icon =
    status === "published" ? (
      <CheckCircle2 className="h-3 w-3" />
    ) : status === "rejected" ? (
      <Undo2 className="h-3 w-3" />
    ) : status === "draft" ? (
      <Pencil className="h-3 w-3" />
    ) : (
      <Loader2 className="h-3 w-3" />
    );
  return (
    <span className={`news-chip news-chip-${status}`}>
      {icon}
      {t(statusKey(status))}
    </span>
  );
}

/**
 * Usimamizi wa matangazo.
 *  - Wizara yoyote: kutuma tangazo (picha au PDF) kwa Wizara ya Habari.
 *  - Wizara ya Habari / menejimenti: kuhariri, kuchapisha, kurejesha, kufuta.
 */
export function AnnouncementManager({
  canPublish,
  departmentId,
  departmentName,
}: {
  canPublish: boolean;
  departmentId: string | null;
  departmentName: string | null;
}) {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState<Announcement[]>([]);
  const [deptNames, setDeptNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reviewNote, setReviewNote] = useState("");

  const load = useCallback(async () => {
    const [raw, { data: depts }] = await Promise.all([
      loadAnnouncements(),
      supabase.from("departments").select("id,name"),
    ]);
    const names: Record<string, string> = {};
    (depts ?? []).forEach((d: any) => {
      names[d.id] = d.name;
    });
    setDeptNames(names);
    const withUrls = await Promise.all(
      raw.map(async (r) => ({
        ...r,
        image_url: await resolveStorageUrl(r.image_url),
        attachment_url: await resolveStorageUrl(r.attachment_url),
      })),
    );
    setRows(withUrls);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pending = useMemo(() => rows.filter((r) => r.status === "pending"), [rows]);
  const published = useMemo(() => rows.filter((r) => r.status === "published"), [rows]);
  const mine = useMemo(
    () => rows.filter((r) => r.author_department_id && r.author_department_id === departmentId),
    [rows, departmentId],
  );

  const reset = () => {
    setDraft(emptyDraft());
    setReviewNote("");
  };

  const upload = async (file: File, prefix: string): Promise<string | null> => {
    if (file.size > MAX_BYTES) {
      toast.error("Faili ni kubwa mno (kiwango ni 10MB).");
      return null;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Ingia tena ili kupakia faili.");
      return null;
    }
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `announcements/${user.id}/${Date.now()}-${safe}`;
    const up = await supabase.storage.from("site-assets").upload(path, file, { upsert: false });
    if (up.error) {
      toast.error(up.error.message);
      return null;
    }
    return await createStorageUrl("site-assets", path);
  };

  const onPickImage = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    const url = await upload(file, "image");
    setUploading(false);
    if (url) setDraft((d) => ({ ...d, image_url: url }));
  };

  const onPickAttachment = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    const url = await upload(file, "attachment");
    setUploading(false);
    if (url) {
      // Picha iliyopakiwa kama kiambatisho inaonekana pia kama picha ya tangazo.
      setDraft((d) => ({
        ...d,
        attachment_url: url,
        attachment_name: file.name,
        image_url: isImage(file.name) && !d.image_url ? url : d.image_url,
      }));
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim() || !draft.content.trim()) {
      toast.error("Kichwa na maelezo yanahitajika.");
      return;
    }
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const res = await saveAnnouncement(
      {
        title: draft.title.trim(),
        content: draft.content,
        excerpt: draft.excerpt.trim() || null,
        image_url: draft.image_url || null,
        attachment_url: draft.attachment_url || null,
        attachment_name: draft.attachment_name || null,
        announcement_date: draft.announcement_date
          ? new Date(draft.announcement_date).toISOString()
          : new Date().toISOString(),
        status: canPublish ? draft.status : "pending",
        author_id: user?.id ?? null,
        author_department_id: departmentId,
      },
      draft.id,
    );
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error ?? "Imeshindikana kuhifadhi tangazo.");
      return;
    }
    toast.success(draft.id ? "Tangazo limehifadhiwa" : t("news.submitted"));
    reset();
    load();
  };

  const setStatus = async (row: Announcement, status: Announcement["status"], note?: string) => {
    const res = await setAnnouncementStatus(row, status, note);
    if (!res.ok) {
      toast.error(res.error ?? t("common.error"));
      return;
    }
    toast.success(status === "published" ? t("news.published_ok") : t("common.success"));
    load();
  };

  const remove = async (row: Announcement) => {
    if (!confirm("Futa tangazo hili?")) return;
    const res = await deleteAnnouncement(row.id);
    if (!res.ok) {
      toast.error(res.error ?? t("common.error"));
      return;
    }
    toast.success("Tangazo limefutwa");
    load();
  };

  const startEdit = (row: Announcement) => {
    setDraft({
      id: row.id,
      title: row.title,
      excerpt: row.excerpt ?? "",
      content: row.content,
      announcement_date: new Date(row.announcement_date ?? row.created_at)
        .toISOString()
        .slice(0, 16),
      image_url: row.image_url ?? "",
      attachment_url: row.attachment_url ?? "",
      attachment_name: row.attachment_name ?? "",
      status: row.status,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const dateLabel = (a: Announcement) =>
    announcementDate(a).toLocaleDateString(locale, { dateStyle: "long" });

  return (
    <Tabs defaultValue={canPublish ? "review" : "submit"} className="space-y-6">
      <TabsList className="flex w-full flex-wrap gap-2 rounded-2xl border border-border bg-card p-1.5">
        {canPublish && (
          <TabsTrigger value="review" className="flex-1 gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            {t("news.st_pending")}
            {pending.length > 0 && (
              <span className="ml-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
        )}
        <TabsTrigger value="submit" className="flex-1 gap-2 font-semibold">
          <Send className="h-4 w-4" /> {t("news.submit")}
        </TabsTrigger>
        <TabsTrigger value="all" className="flex-1 gap-2 font-semibold">
          <Megaphone className="h-4 w-4" /> {t("mgmt.tab_announce")}
        </TabsTrigger>
      </TabsList>

      {/* ===== Uhariri na uchapishaji (Wizara ya Habari / menejimenti) ===== */}
      {canPublish && (
        <TabsContent value="review" className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Megaphone className="h-5 w-5 text-primary" /> {t("news.newsroom")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("news.submit_lead")}</p>
          </div>

          {pending.length === 0 ? (
            <p className="empty-state">{t("news.empty")}</p>
          ) : (
            pending.map((row) => (
              <article key={row.id} className="surface surface-pad space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusChip status={row.status} />
                  <span className="news-meta">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" /> {dateLabel(row)}
                    </span>
                    {row.author_department_id && (
                      <span>
                        {t("news.author_ministry")}: {deptNames[row.author_department_id] ?? "—"}
                      </span>
                    )}
                  </span>
                </div>
                <h3 className="text-lg font-bold">{row.title}</h3>
                {row.image_url && (
                  <img
                    src={row.image_url}
                    alt={row.title}
                    className="max-h-72 w-full rounded-xl border border-border object-contain bg-secondary/40"
                  />
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/85">
                  {row.content}
                </p>
                {row.attachment_url && !isImage(row.attachment_name ?? row.attachment_url) && (
                  <a
                    href={row.attachment_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="news-attachment"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                      <FileText className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {row.attachment_name || t("news.attachment")}
                    </span>
                  </a>
                )}
                <Input
                  placeholder={t("news.review_note")}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setStatus(row, "published")} className="font-semibold">
                    <CheckCircle2 className="mr-2 h-4 w-4" /> {t("news.publish")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setStatus(row, "rejected", reviewNote.trim() || undefined)}
                  >
                    <Undo2 className="mr-2 h-4 w-4" /> {t("news.return")}
                  </Button>
                  <Button variant="ghost" onClick={() => startEdit(row)}>
                    <Pencil className="mr-2 h-4 w-4" /> {t("common.edit")}
                  </Button>
                  <Button variant="ghost" onClick={() => remove(row)}>
                    <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </article>
            ))
          )}
        </TabsContent>
      )}

      {/* ===== Kutuma tangazo ===== */}
      <TabsContent value="submit">
        <form onSubmit={save} className="surface surface-pad max-w-3xl space-y-4">
          <div>
            <h2 className="text-lg font-bold">{draft.id ? t("common.edit") : t("news.submit")}</h2>
            {!canPublish && (
              <p className="mt-1 text-sm text-muted-foreground">{t("news.submit_lead")}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Kichwa cha habari</Label>
            <Input
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              required
              maxLength={200}
              placeholder="Kichwa cha tangazo"
            />
          </div>

          <div className="space-y-2">
            <Label>Muhtasari mfupi (hiari)</Label>
            <Input
              value={draft.excerpt}
              onChange={(e) => setDraft((d) => ({ ...d, excerpt: e.target.value }))}
              maxLength={300}
              placeholder="Sentensi moja ya kuvutia"
            />
          </div>

          <div className="space-y-2">
            <Label>Tarehe ya tangazo</Label>
            <Input
              type="datetime-local"
              value={draft.announcement_date}
              onChange={(e) => setDraft((d) => ({ ...d, announcement_date: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Picha ya tangazo</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => onPickImage(e.target.files?.[0])}
                />
                {draft.image_url && (
                  <img
                    src={draft.image_url}
                    alt=""
                    className="h-14 w-14 rounded-lg border border-border object-cover"
                  />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <ImagePlus className="h-3.5 w-3.5" /> {t("news.attachment_hint")}
              </Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                disabled={uploading}
                onChange={(e) => onPickAttachment(e.target.files?.[0])}
              />
              {draft.attachment_name && (
                <p className="truncate text-xs text-muted-foreground">{draft.attachment_name}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Maelezo marefu</Label>
            <Textarea
              value={draft.content}
              onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
              required
              rows={10}
              placeholder="Andika tangazo kwa ukamilifu…"
            />
          </div>

          {canPublish && (
            <div className="space-y-2">
              <Label>{t("news.status")}</Label>
              <div className="flex flex-wrap gap-2">
                {(["draft", "pending", "published"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, status: s }))}
                    className={`news-chip news-chip-${s} transition ${
                      draft.status === s ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    {t(statusKey(s))}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving || uploading} className="font-semibold">
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {draft.id ? t("common.edit") : t("news.submit")}
            </Button>
            {draft.id && (
              <Button type="button" variant="outline" onClick={reset}>
                {t("common.cancel")}
              </Button>
            )}
          </div>
        </form>
      </TabsContent>

      {/* ===== Matangazo yote ===== */}
      <TabsContent value="all" className="space-y-4">
        {loading ? (
          <p className="empty-state">{t("common.loading")}</p>
        ) : rows.length === 0 ? (
          <p className="empty-state">{t("news.empty")}</p>
        ) : (
          <div className="space-y-3">
            {!canPublish && mine.length > 0 && (
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                {t("news.my_submissions")} ({mine.length})
              </h3>
            )}
            {rows.map((row) => (
              <div key={row.id} className="surface flex flex-wrap items-center gap-4 p-4">
                {row.image_url ? (
                  <img
                    src={row.image_url}
                    alt=""
                    className="h-16 w-24 rounded-lg border border-border object-cover"
                  />
                ) : (
                  <span className="grid h-16 w-24 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Megaphone className="h-6 w-6" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{row.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <StatusChip status={row.status} />
                    <span className="text-xs text-muted-foreground">{dateLabel(row)}</span>
                    {row.attachment_name && isPdf(row.attachment_name) && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <FileText className="h-3 w-3" /> PDF
                      </span>
                    )}
                  </div>
                  {row.review_note && (
                    <p className="mt-1 text-xs text-destructive">
                      {t("news.review_note")}: {row.review_note}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canPublish && row.status !== "published" && (
                    <Button size="sm" onClick={() => setStatus(row, "published")}>
                      <CheckCircle2 className="mr-1.5 h-4 w-4" /> {t("news.publish")}
                    </Button>
                  )}
                  {canPublish && row.status === "published" && (
                    <Button size="sm" variant="outline" onClick={() => setStatus(row, "draft")}>
                      {t("news.unpublish")}
                    </Button>
                  )}
                  {(canPublish || row.author_department_id === departmentId) && (
                    <Button size="sm" variant="outline" onClick={() => startEdit(row)}>
                      {t("common.edit")}
                    </Button>
                  )}
                  {canPublish && (
                    <Button size="icon" variant="ghost" onClick={() => remove(row)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
