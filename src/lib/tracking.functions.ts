import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
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

/**
 * Ufuatiliaji hautumii ufunguo wa siri wa seva (SERVICE ROLE).
 * Unatumia ufunguo wa umma (publishable) na kazi salama za database
 * (track_lookup / track_update / track_delete), hivyo unafanya kazi
 * kwenye Lovable, GitHub na Vercel bila mipangilio ya ziada.
 */
function publicDb() {
  const url =
    process.env["SUPABASE_URL"] ||
    process.env["VITE_SUPABASE_URL"] ||
    import.meta.env["VITE_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["SUPABASE_ANON_KEY"] ||
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];

  if (!url || !key) {
    throw new Error(
      "Mipangilio ya backend haipo. Weka VITE_SUPABASE_URL na VITE_SUPABASE_PUBLISHABLE_KEY kwenye seva yako.",
    );
  }

  return createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: any, init: any) => {
        const headers = new Headers(init?.headers ?? undefined);
        if (headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

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
    const db = publicDb();
    const { data: res, error } = await db.rpc("track_lookup" as any, { p_query: data.query.trim() } as any);
    if (error) throw new Error("Imeshindikana kupata taarifa: " + error.message);

    const groups = (res ?? {}) as Record<string, any[]>;
    const items: TrackedRequest[] = [];

    for (const r of groups["mikopo"] ?? []) {
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

    for (const r of groups["changamoto"] ?? []) {
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

    for (const r of groups["idara"] ?? []) {
      items.push({
        id: r.id,
        kind: "idara",
        kindLabel: r.department_name ? `Huduma: ${r.department_name}` : "Huduma ya Idara",
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

    for (const r of groups["misiba"] ?? []) {
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
    return { items };
  });

export type RecoveredCode = {
  kind: TrackKind;
  kindLabel: string;
  code: string | null;
  name: string | null;
  created_at: string;
};

/** Nimesahau namba: namba ya simu + jina la mwisho -> namba za kufuatilia. */
export const recoverCodes = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        phone: z.string().trim().min(7).max(25),
        lastName: z.string().trim().min(2).max(60),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ items: RecoveredCode[] }> => {
    const db = publicDb();
    const { data: res, error } = await db.rpc("track_recover_code" as any, {
      p_phone: data.phone.trim(),
      p_last_name: data.lastName.trim(),
    } as any);
    if (error) throw new Error("Imeshindikana: " + error.message);
    return { items: ((res ?? []) as RecoveredCode[]) };
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
    const db = publicDb();
    const { error } = await db.rpc("track_update" as any, {
      p_id: data.id,
      p_kind: data.kind,
      p_query: data.query.trim(),
      p_values: data.values,
    } as any);
    if (error) throw new Error(error.message);
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
    const db = publicDb();
    const { error } = await db.rpc("track_delete" as any, {
      p_id: data.id,
      p_kind: data.kind,
      p_query: data.query.trim(),
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
