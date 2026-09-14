import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type TrackField = { key: string; label: string; value: string; long?: boolean };

export type TrackKind = "mikopo" | "changamoto" | "idara" | "misiba";

export type TrackedRequest = {
  id: string;
  kind: TrackKind;
  kindLabel: string;
  title: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string | null;
  fields: TrackField[];
};

const digits = (v: string) => v.replace(/[^0-9]/g, "");
const phoneTail = (v: string) => digits(v).slice(-9);
const regKey = (v: string) => v.replace(/[^a-z0-9]/gi, "").toLowerCase();

const TABLES = {
  mikopo: "loan_requests",
  changamoto: "challenges",
  idara: "department_submissions",
  misiba: "deaths",
} as const;

/** Jedwali lenye safu ya status / admin_note. */
const HAS_STATUS = new Set(["loan_requests", "challenges", "department_submissions"]);

const EDITABLE = new Set([
  "full_name",
  "form_four_index",
  "registration_number",
  "course",
  "year_of_study",
  "gender",
  "phone",
  "email",
  "problem_type",
  "problem_description",
  "challenge_type",
  "category",
  "description",
  "deceased_name",
  "relationship",
  "student_name",
  "death_date",
  "location",
]);

const field = (key: string, label: string, value: unknown, long = false): TrackField => ({
  key,
  label,
  value: value == null ? "" : String(value),
  long,
});

export const trackRequests = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ query: z.string().trim().min(3).max(60) }).parse(d),
  )
  .handler(async ({ data }): Promise<{ items: TrackedRequest[] }> => {
    const raw = data.query.trim();
    const tail = phoneTail(raw);
    const reg = regKey(raw);
    const byPhone = tail.length >= 7;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const pick = (table: string, extra = "*") => {
      let q = db.from(table).select(extra);
      q = byPhone ? q.ilike("phone", `%${tail}`) : q.ilike("registration_number", `%${raw.replace(/\s+/g, "")}%`);
      return q.order("created_at", { ascending: false }).limit(50);
    };

    const [loans, challenges, dept, deaths] = await Promise.all([
      pick("loan_requests"),
      pick("challenges"),
      pick("department_submissions", "*, departments(name)"),
      pick("deaths"),
    ]);

    const firstError = loans.error || challenges.error || dept.error || deaths.error;
    if (firstError) throw new Error("Imeshindikana kupata taarifa: " + firstError.message);

    const items: TrackedRequest[] = [];

    for (const r of (loans.data ?? []) as any[]) {
      items.push({
        id: r.id,
        kind: "mikopo",
        kindLabel: "Mikopo (HESLB)",
        title: r.problem_type || "Ombi la mkopo",
        status: r.status || "pending",
        adminNote: r.admin_note ?? null,
        createdAt: r.created_at,
        updatedAt: r.updated_at ?? null,
        fields: [
          field("full_name", "Majina kamili", r.full_name),
          field("registration_number", "Namba ya usajili", r.registration_number),
          field("form_four_index", "Namba ya kidato cha nne", r.form_four_index),
          field("course", "Kozi", r.course),
          field("year_of_study", "Mwaka wa masomo", r.year_of_study),
          field("phone", "Namba ya simu", r.phone),
          field("email", "Barua pepe", r.email),
          field("problem_type", "Aina ya tatizo", r.problem_type),
          field("problem_description", "Maelezo", r.problem_description, true),
        ],
      });
    }

    for (const r of (challenges.data ?? []) as any[]) {
      items.push({
        id: r.id,
        kind: "changamoto",
        kindLabel: "Changamoto za Wanafunzi",
        title: r.challenge_type || "Changamoto",
        status: r.status || "pending",
        adminNote: r.admin_note ?? null,
        createdAt: r.created_at,
        updatedAt: r.updated_at ?? null,
        fields: [
          field("full_name", "Majina kamili", r.full_name),
          field("registration_number", "Namba ya usajili", r.registration_number),
          field("course", "Kozi", r.course),
          field("phone", "Namba ya simu", r.phone),
          field("challenge_type", "Aina ya changamoto", r.challenge_type),
          field("description", "Maelezo", r.description, true),
        ],
      });
    }

    for (const r of (dept.data ?? []) as any[]) {
      items.push({
        id: r.id,
        kind: "idara",
        kindLabel: r.departments?.name ? `Huduma: ${r.departments.name}` : "Huduma ya Idara",
        title: r.category || "Ombi la huduma",
        status: r.status || "pending",
        adminNote: r.admin_note ?? null,
        createdAt: r.created_at,
        updatedAt: r.updated_at ?? null,
        fields: [
          field("full_name", "Majina kamili", r.full_name),
          field("registration_number", "Namba ya usajili", r.registration_number),
          field("form_four_index", "Namba ya kidato cha nne", r.form_four_index),
          field("course", "Kozi", r.course),
          field("year_of_study", "Mwaka wa masomo", r.year_of_study),
          field("gender", "Jinsia", r.gender),
          field("phone", "Namba ya simu", r.phone),
          field("category", "Aina ya huduma", r.category),
          field("description", "Maelezo", r.description, true),
        ],
      });
    }

    for (const r of (deaths.data ?? []) as any[]) {
      items.push({
        id: r.id,
        kind: "misiba",
        kindLabel: "Taarifa ya Msiba",
        title: r.deceased_name ? `Msiba: ${r.deceased_name}` : "Taarifa ya msiba",
        status: "reviewing",
        adminNote: null,
        createdAt: r.created_at,
        updatedAt: null,
        fields: [
          field("deceased_name", "Jina la marehemu", r.deceased_name),
          field("relationship", "Uhusiano", r.relationship),
          field("student_name", "Jina la mwanafunzi", r.student_name),
          field("registration_number", "Namba ya usajili", r.registration_number),
          field("phone", "Namba ya simu", r.phone),
          field("death_date", "Tarehe ya msiba", r.death_date),
          field("location", "Mahali", r.location),
          field("description", "Maelezo", r.description, true),
        ],
      });
    }

    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    void reg;
    return { items };
  });

export const updateRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        kind: z.enum(["mikopo", "changamoto", "idara", "misiba"]),
        query: z.string().trim().min(3).max(60),
        values: z.record(z.string(), z.string().max(4000)),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const table = TABLES[data.kind];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const { data: row, error } = await db
      .from(table)
      .select(HAS_STATUS.has(table) ? "id, phone, registration_number, status" : "id, phone, registration_number")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Ombi hili halipatikani.");

    const tail = phoneTail(data.query);
    const matches =
      (tail.length >= 7 && phoneTail(row.phone ?? "") === tail) ||
      (regKey(row.registration_number ?? "") !== "" && regKey(row.registration_number ?? "") === regKey(data.query));
    if (!matches) throw new Error("Taarifa hizi hazilingani na ombi lako.");

    if (row.status === "approved" || row.status === "rejected") {
      throw new Error("Ombi hili limekamilika, haliwezi kubadilishwa.");
    }

    const patch: Record<string, string> = {};
    for (const [k, v] of Object.entries(data.values)) {
      if (EDITABLE.has(k) && v.trim()) patch[k] = v.trim();
    }
    if (Object.keys(patch).length === 0) throw new Error("Hakuna taarifa mpya iliyowekwa.");

    const { error: upErr } = await db
      .from(table)
      .update(HAS_STATUS.has(table) ? { ...patch, status: "pending", admin_note: null } : patch)
      .eq("id", data.id);
    if (upErr) throw new Error(upErr.message);
    return { ok: true as const };
  });

export const deleteRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        kind: z.enum(["mikopo", "changamoto", "idara", "misiba"]),
        query: z.string().trim().min(3).max(60),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const table = TABLES[data.kind];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const { data: row, error } = await db
      .from(table)
      .select(HAS_STATUS.has(table) ? "id, phone, registration_number, status" : "id, phone, registration_number")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Ombi hili halipatikani.");

    const tail = phoneTail(data.query);
    const matches =
      (tail.length >= 7 && phoneTail(row.phone ?? "") === tail) ||
      (regKey(row.registration_number ?? "") !== "" && regKey(row.registration_number ?? "") === regKey(data.query));
    if (!matches) throw new Error("Taarifa hizi hazilingani na ombi lako.");
    if (row.status === "approved") throw new Error("Ombi lililokamilika haliwezi kufutwa.");

    const { error: delErr } = await db.from(table).delete().eq("id", data.id);
    if (delErr) throw new Error(delErr.message);
    return { ok: true as const };
  });
