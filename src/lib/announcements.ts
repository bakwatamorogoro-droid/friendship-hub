import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Slug ya wizara inayochapisha matangazo yote. */
export const NEWS_MINISTRY_SLUG = "habari";

export type AnnouncementStatus = "draft" | "pending" | "published" | "rejected";

export type Announcement = {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  image_url: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  announcement_date: string | null;
  created_at: string;
  status: AnnouncementStatus;
  published: boolean;
  author_id: string | null;
  author_department_id: string | null;
  review_note: string | null;
};

export const ANNOUNCEMENT_SELECT =
  "id,title,content,excerpt,image_url,attachment_url,attachment_name,announcement_date,created_at,status,published,author_id,author_department_id,review_note";

/** Safu zilizopo kabla ya mfumo wa wizara ya habari. */
const LEGACY_SELECT = "id,title,content,excerpt,image_url,created_at,published,author_id";

/** Badilisha safu ya zamani iwe umbo la kawaida. */
function fromLegacy(r: any): Announcement {
  return {
    id: r.id,
    title: r.title,
    content: r.content,
    excerpt: r.excerpt ?? null,
    image_url: r.image_url ?? null,
    attachment_url: null,
    attachment_name: null,
    announcement_date: r.created_at,
    created_at: r.created_at,
    status: r.published ? "published" : "draft",
    published: !!r.published,
    author_id: r.author_id ?? null,
    author_department_id: null,
    review_note: null,
  };
}

type LoadOpts = { publishedOnly?: boolean; limit?: number };

/**
 * Huchukua matangazo; kama migrasheni ya wizara ya habari bado haijatumika,
 * hurudi kwenye safu za zamani ili tovuti isivunjike.
 */
export async function loadAnnouncements(opts: LoadOpts = {}): Promise<Announcement[]> {
  const q = (supabase.from("announcements") as any).select(ANNOUNCEMENT_SELECT);
  if (opts.publishedOnly) q.eq("published", true);
  if (opts.limit) q.limit(opts.limit);
  const { data, error } = await q.order("announcement_date", { ascending: false });
  if (!error) return (data ?? []) as Announcement[];

  const legacy = (supabase.from("announcements") as any).select(LEGACY_SELECT);
  if (opts.publishedOnly) legacy.eq("published", true);
  if (opts.limit) legacy.limit(opts.limit);
  const res = await legacy.order("created_at", { ascending: false });
  return ((res.data ?? []) as any[]).map(fromLegacy);
}

/** Tangazo moja kwa kitambulisho chake (lililochapishwa). */
export async function loadAnnouncement(id: string): Promise<Announcement | null> {
  const { data, error } = await (supabase.from("announcements") as any)
    .select(ANNOUNCEMENT_SELECT)
    .eq("id", id)
    .eq("published", true)
    .maybeSingle();
  if (!error) return (data as Announcement) ?? null;

  const res = await (supabase.from("announcements") as any)
    .select(LEGACY_SELECT)
    .eq("id", id)
    .eq("published", true)
    .maybeSingle();
  return res.data ? fromLegacy(res.data) : null;
}

/**
 * Je, kosa ni la safu ambazo bado hazipo (migrasheni haijatumika)?
 * Hii hutokea kwa `42703` (column haipo) au `PGRST204` (schema cache).
 */
export function isMissingColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42703" || error.code === "PGRST204") return true;
  return /column .* does not exist|schema cache/i.test(error.message ?? "");
}

/** Safu za tangazo zinazopatikana kwenye mfumo wa sasa. */
export type AnnouncementPayload = {
  title: string;
  content: string;
  excerpt?: string | null;
  image_url?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  announcement_date?: string;
  status?: AnnouncementStatus;
  author_id?: string | null;
  author_department_id?: string | null;
};

/**
 * Huhifadhi tangazo. Hujaribu safu kamili za mfumo wa wizara ya habari; kama
 * migrasheni bado haijatumika, hurudi kwenye safu za zamani ili kuchapisha
 * kusiendelee kushindwa.
 */
export async function saveAnnouncement(
  payload: AnnouncementPayload,
  id?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const full = { ...payload };
  const run = async (body: Record<string, unknown>) =>
    id
      ? await (supabase.from("announcements") as any).update(body).eq("id", id)
      : await (supabase.from("announcements") as any).insert(body);

  const first = await run(full);
  if (!first.error) return { ok: true };
  if (!isMissingColumn(first.error)) return { ok: false, error: first.error.message };

  // Safu za zamani pekee: `published` ndiyo hali inayowakilisha uchapishaji.
  const legacy: Record<string, unknown> = {
    title: payload.title,
    content: payload.content,
    published: payload.status === "published",
  };
  if (payload.image_url) legacy.image_url = payload.image_url;
  if (!id && payload.author_id) legacy.author_id = payload.author_id;
  const second = await run(legacy);
  return second.error ? { ok: false, error: second.error.message } : { ok: true };
}

/** Huchapisha, hurejesha au hubadilisha hali ya tangazo. */
export async function setAnnouncementStatus(
  row: Pick<Announcement, "id" | "status">,
  status: AnnouncementStatus,
  note?: string,
): Promise<{ ok: boolean; error?: string }> {
  const body: Record<string, unknown> = {
    status,
    review_note: note ?? null,
    reviewed_at: status === "pending" ? null : new Date().toISOString(),
  };
  const first = await (supabase.from("announcements") as any).update(body).eq("id", row.id);
  if (!first.error) return { ok: true };
  if (!isMissingColumn(first.error)) return { ok: false, error: first.error.message };

  const legacy = await (supabase.from("announcements") as any)
    .update({ published: status === "published" })
    .eq("id", row.id);
  return legacy.error ? { ok: false, error: legacy.error.message } : { ok: true };
}

export async function deleteAnnouncement(id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await (supabase.from("announcements") as any).delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Tarehe ya kuonyesha: tarehe rasmi ya tangazo, la sivyo tarehe ya kuundwa. */
export function announcementDate(a: Pick<Announcement, "announcement_date" | "created_at">): Date {
  return new Date(a.announcement_date ?? a.created_at);
}

export function statusKey(status: AnnouncementStatus): string {
  return `news.st_${status}`;
}

export function isImage(nameOrUrl: string | null | undefined): boolean {
  if (!nameOrUrl) return false;
  return /\.(png|jpe?g|gif|webp|avif|svg|bmp)$/i.test(nameOrUrl.split("?")[0]);
}

export function isPdf(nameOrUrl: string | null | undefined): boolean {
  if (!nameOrUrl) return false;
  return /\.pdf$/i.test(nameOrUrl.split("?")[0]);
}

export type NewsroomRole = {
  ready: boolean;
  isAdmin: boolean;
  isNewsMinistry: boolean;
  departmentId: string | null;
  departmentName: string | null;
};

/**
 * Huamua uwezo wa mtumiaji aliyeingia kuhusu matangazo.
 * Kuchapisha ni kazi ya Wizara ya Habari na Mawasiliano au menejimenti.
 */
export function useNewsroomRole(): NewsroomRole {
  const [state, setState] = useState<NewsroomRole>({
    ready: false,
    isAdmin: false,
    isNewsMinistry: false,
    departmentId: null,
    departmentName: null,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (alive) setState((s) => ({ ...s, ready: true }));
        return;
      }
      const { data: roles } = await (supabase.from("user_roles") as any)
        .select("role,department_id")
        .eq("user_id", user.id);
      const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
      const leaderRow = (roles ?? []).find((r: any) => r.role === "leader");
      const departmentId: string | null = leaderRow?.department_id ?? null;

      let departmentName: string | null = null;
      let isNewsMinistry = false;
      if (departmentId) {
        const { data: dept } = await (supabase.from("departments") as any)
          .select("name,slug")
          .eq("id", departmentId)
          .maybeSingle();
        departmentName = dept?.name ?? null;
        isNewsMinistry = dept?.slug === NEWS_MINISTRY_SLUG;
      }
      if (alive) {
        setState({ ready: true, isAdmin, isNewsMinistry, departmentId, departmentName });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
