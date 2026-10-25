import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NEWS_MINISTRY_SLUG } from "@/lib/announcements";

export type Position =
  | "Rais"
  | "Makamu wa Rais"
  | "Katibu Mkuu"
  | "Naibu Katibu Mkuu"
  | "Mweka Hazina"
  | "Waziri wa Idara"
  | "Naibu Waziri wa Idara"
  | "Katibu wa Idara"
  | "Mjumbe wa Kamati Kuu";

/** Nyadhifa zinazoongoza wizara (Rais, Makamu, Waziri Mkuu na Naibu wake). */
const CABINET: string[] = ["Rais", "Makamu wa Rais", "Katibu Mkuu", "Naibu Katibu Mkuu"];

export const PRESIDENT_POSITION = "Rais";
/** "Waziri Mkuu" ni cheo cha Katibu Mkuu katika mfumo huu. */
export const PRIME_MINISTER_POSITION = "Katibu Mkuu";

export type MinistryReport = {
  id: string;
  department_id: string;
  author_id: string | null;
  week_start: string;
  summary: string;
  challenges: string | null;
  next_week: string | null;
  requests_handled: number;
  created_at: string;
  updated_at: string;
};

export type InternalMessage = {
  id: string;
  sender_id: string;
  sender_department_id: string | null;
  recipient_id: string | null;
  recipient_department_id: string | null;
  channel: "direct" | "news" | "cabinet";
  subject: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type StageEvent = {
  id: string;
  request_id: string;
  kind: string;
  status: string;
  note: string | null;
  created_at: string;
};

export type MinistryRole = {
  ready: boolean;
  isAdmin: boolean;
  isLeader: boolean;
  position: string | null;
  departmentId: string | null;
  departmentName: string | null;
  departmentSlug: string | null;
  isNewsMinistry: boolean;
  isCabinet: boolean;
  isPresident: boolean;
  isPrimeMinister: boolean;
  displayName: string;
};

/**
 * Meza mpya hazipo kwenye types zilizotengenezwa kwa otomatiki, hivyo tunatumia
 * mteja asiye na types. Hii hubadilika mara tu migrasheni inatumika.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabase as any;

const REPORT_SELECT =
  "id,department_id,author_id,week_start,summary,challenges,next_week,requests_handled,created_at,updated_at";
const MESSAGE_SELECT =
  "id,sender_id,sender_department_id,recipient_id,recipient_department_id,channel,subject,body,read_at,created_at";

/** Jumatatu ya wiki ya tarehe husika (ISO week). */
export function weekStart(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (day - 1));
  return d.toISOString().slice(0, 10);
}

export function formatWeek(start: string): string {
  const from = new Date(`${start}T00:00:00Z`);
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("sw-TZ", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${fmt(from)} – ${fmt(to)}`;
}

/**
 * Huchukua ripoti za wiki. Kama migrasheni bado haijatumika, hurudi tupu ili
 * paneli isivunjike.
 */
export async function loadReports(opts: { departmentId?: string | null; all?: boolean } = {}) {
  let q = db()
    .from("ministry_reports")
    .select(REPORT_SELECT)
    .order("week_start", { ascending: false });
  if (!opts.all && opts.departmentId) q = q.eq("department_id", opts.departmentId);
  const { data, error } = await q;
  if (error) return [] as MinistryReport[];
  return (data ?? []) as MinistryReport[];
}

export async function loadMessages(opts: {
  userId: string;
  box: "inbox" | "sent";
}): Promise<InternalMessage[]> {
  const column = opts.box === "inbox" ? "recipient_id" : "sender_id";
  const { data, error } = await db()
    .from("internal_messages")
    .select(MESSAGE_SELECT)
    .eq(column, opts.userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return [];
  return (data ?? []) as InternalMessage[];
}

/** Ujumbe wa matangazo uliotumwa kwa wizara ya habari. */
export async function loadNewsInbox(departmentId: string): Promise<InternalMessage[]> {
  const { data, error } = await db()
    .from("internal_messages")
    .select(MESSAGE_SELECT)
    .eq("channel", "news")
    .eq("recipient_department_id", departmentId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return [];
  return (data ?? []) as InternalMessage[];
}

/** Historia ya hatua za maombi ya aina fulani. */
export async function loadStageHistory(kinds: string[]): Promise<StageEvent[]> {
  if (!kinds.length) return [];
  const { data, error } = await db()
    .from("request_stage_history")
    .select("id,request_id,kind,status,note,created_at")
    .in("kind", kinds)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []) as StageEvent[];
}

export async function saveReport(input: {
  departmentId: string;
  weekStart: string;
  summary: string;
  challenges: string;
  nextWeek: string;
  requestsHandled: number;
}): Promise<{ ok: boolean; error?: string }> {
  const payload = {
    department_id: input.departmentId,
    week_start: input.weekStart,
    summary: input.summary.trim(),
    challenges: input.challenges.trim() || null,
    next_week: input.nextWeek.trim() || null,
    requests_handled: input.requestsHandled,
    updated_at: new Date().toISOString(),
  };
  const { error } = await db().from("ministry_reports").upsert(payload, {
    onConflict: "department_id,week_start",
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function sendMessage(input: {
  channel: "direct" | "news" | "cabinet";
  recipientId?: string | null;
  subject: string;
  body: string;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const { data, error } = await db()
    .from("internal_messages")
    .insert({
      channel: input.channel,
      recipient_id: input.recipientId ?? null,
      subject: input.subject.trim(),
      body: input.body.trim(),
    })
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: (data as { id: string } | null)?.id };
}

export async function markMessageRead(id: string): Promise<void> {
  await db()
    .from("internal_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
}

/** Akaunti za Rais na Waziri Mkuu, kwa kuwasiliana kwa mfumo. */
export async function loadCabinetContacts(): Promise<
  Array<{ user_id: string; full_name: string; position: string }>
> {
  const { data, error } = await db()
    .from("leaders")
    .select("user_id,full_name,position")
    .in("position", CABINET)
    .not("user_id", "is", null);
  if (error) return [];
  return (data ?? []) as Array<{ user_id: string; full_name: string; position: string }>;
}

// ===== Kituo cha kazi cha viongozi =====

export type LeaderContact = {
  user_id: string;
  full_name: string;
  position: string | null;
  department_id: string | null;
  department_name: string | null;
};

export type MessageAttachment = {
  id: string;
  message_id: string;
  file_url: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

export type ApprovalRequest = {
  id: string;
  kind: "mikopo" | "changamoto" | "idara" | "misiba" | "mengine";
  request_id: string | null;
  registration_number: string | null;
  student_name: string | null;
  title: string;
  summary: string | null;
  status: "submitted" | "pending" | "approved" | "rejected";
  submitted_by: string | null;
  submitted_department_id: string | null;
  target_department_id: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentRequest = {
  kind: string;
  id: string;
  title: string;
  status: string;
  description: string | null;
  created_at: string;
  department_id: string | null;
};

export type StudentOverview = {
  student: {
    id: string;
    full_name: string;
    phone: string;
    registration_number: string;
    year_of_study: string;
    course: string;
  } | null;
  requests: StudentRequest[];
  history: StageEvent[];
  approvals: ApprovalRequest[];
};

const ATTACHMENT_SELECT = "id,message_id,file_url,file_name,mime_type,size_bytes,created_at";
const APPROVAL_SELECT =
  "id,kind,request_id,registration_number,student_name,title,summary,status,submitted_by,submitted_department_id,target_department_id,decided_by,decided_at,decision_note,created_at,updated_at";

/** Orodha ya viongozi wengine, kwa mawasiliano ya moja kwa moja. */
export async function loadLeaderDirectory(): Promise<LeaderContact[]> {
  const { data, error } = await db().rpc("leader_directory");
  if (error) return [];
  return (data ?? []) as LeaderContact[];
}

/** Nyaraka za ujumbe mmoja. */
export async function loadMessageAttachments(messageIds: string[]): Promise<MessageAttachment[]> {
  if (!messageIds.length) return [];
  const { data, error } = await db()
    .from("message_attachments")
    .select(ATTACHMENT_SELECT)
    .in("message_id", messageIds)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []) as MessageAttachment[];
}

export async function attachFile(input: {
  messageId: string;
  fileUrl: string;
  fileName: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await db()
    .from("message_attachments")
    .insert({
      message_id: input.messageId,
      file_url: input.fileUrl,
      file_name: input.fileName,
      mime_type: input.mimeType ?? null,
      size_bytes: input.sizeBytes ?? null,
    });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Nyaraka zote zilizotumwa na mtumiaji (kwa sehemu ya nyaraka). */
export async function loadSentAttachments(userId: string): Promise<MessageAttachment[]> {
  const { data, error } = await db()
    .from("message_attachments")
    .select(ATTACHMENT_SELECT)
    .eq("uploaded_by", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return [];
  return (data ?? []) as MessageAttachment[];
}

export async function loadApprovals(opts: { mine?: boolean } = {}): Promise<ApprovalRequest[]> {
  let q = db().from("request_approvals").select(APPROVAL_SELECT).order("created_at", {
    ascending: false,
  });
  if (opts.mine) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) q = q.eq("submitted_by", user.id);
  }
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []) as ApprovalRequest[];
}

export async function submitApproval(input: {
  kind: ApprovalRequest["kind"];
  registrationNumber?: string | null;
  studentName?: string | null;
  title: string;
  summary?: string | null;
  requestId?: string | null;
  targetDepartmentId?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await db()
    .from("request_approvals")
    .insert({
      kind: input.kind,
      registration_number: input.registrationNumber?.trim() || null,
      student_name: input.studentName?.trim() || null,
      title: input.title.trim(),
      summary: input.summary?.trim() || null,
      request_id: input.requestId ?? null,
      target_department_id: input.targetDepartmentId ?? null,
    });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function decideApproval(
  id: string,
  status: "approved" | "rejected",
  note?: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await db()
    .from("request_approvals")
    .update({ status, decision_note: note?.trim() || null })
    .eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Taarifa za mwanafunzi, maombi yake na hatua iliyofikiwa. */
export async function loadStudentOverview(
  registrationNumber: string,
): Promise<StudentOverview | null> {
  const { data, error } = await db().rpc("student_overview", {
    _registration_number: registrationNumber,
  });
  if (error || !data) return null;
  return data as StudentOverview;
}

/**
 * Huamua uwezo wa kiongozi: wizara yake, cheo chake, na kama ni Rais au
 * Waziri Mkuu (Katibu Mkuu).
 */
export function useMinistryRole(): MinistryRole {
  const [state, setState] = useState<MinistryRole>({
    ready: false,
    isAdmin: false,
    isLeader: false,
    position: null,
    departmentId: null,
    departmentName: null,
    departmentSlug: null,
    isNewsMinistry: false,
    isCabinet: false,
    isPresident: false,
    isPrimeMinister: false,
    displayName: "",
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
      const displayName: string = user.user_metadata?.full_name ?? "";
      const { data: roles } = await db()
        .from("user_roles")
        .select("role,department_id")
        .eq("user_id", user.id);
      const roleRows = (roles ?? []) as Array<{ role: string; department_id: string | null }>;
      const isAdmin = roleRows.some((r) => r.role === "admin");
      const leaderRow = roleRows.find((r) => r.role === "leader");
      const departmentId: string | null = leaderRow?.department_id ?? null;

      let departmentName: string | null = null;
      let departmentSlug: string | null = null;
      if (departmentId) {
        const { data: dept } = await db()
          .from("departments")
          .select("name,slug")
          .eq("id", departmentId)
          .maybeSingle();
        departmentName = dept?.name ?? null;
        departmentSlug = dept?.slug ?? null;
      }

      // Cheo hutoka kwenye wasifu wa umma uliounganishwa na akaunti hii.
      let position: string | null = user.user_metadata?.position ?? null;
      const { data: profile } = await db()
        .from("leaders")
        .select("position")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile?.position) position = profile.position;

      if (alive) {
        setState({
          ready: true,
          isAdmin,
          isLeader: !!leaderRow,
          position,
          departmentId,
          departmentName,
          departmentSlug,
          isNewsMinistry: departmentSlug === NEWS_MINISTRY_SLUG,
          isCabinet: CABINET.includes(position ?? ""),
          isPresident: position === PRESIDENT_POSITION,
          isPrimeMinister: position === PRIME_MINISTER_POSITION,
          displayName,
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
