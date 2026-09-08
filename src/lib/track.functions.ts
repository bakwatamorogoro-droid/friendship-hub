import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const normalizePhone = (p: string) => p.replace(/[^0-9]/g, "").slice(-9);

export type TrackedItem = {
  id: string;
  kind: "mikopo" | "huduma" | "idara";
  kindLabel: string;
  title: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  updated_at: string | null;
  fields: Array<{ key: string; label: string; value: string }>;
};

const STATUS_ORDER = ["pending", "needs_correction", "forwarded", "approved", "rejected"];

export const trackSubmissions = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ phone: z.string().trim().min(7).max(20) }).parse(d))
  .handler(async ({ data }): Promise<{ items: TrackedItem[] }> => {
    const tail = normalizePhone(data.phone);
    if (tail.length < 7) throw new Error("Namba ya simu si sahihi.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [loans, challenges, dept] = await Promise.all([
      (supabaseAdmin.from("loan_requests") as any).select("*").ilike("phone", `%${tail}`),
      (supabaseAdmin.from("challenges") as any).select("*").ilike("phone", `%${tail}`),
      (supabaseAdmin.from("department_submissions") as any)
        .select("*, departments(name)").ilike("phone", `%${tail}`),
    ]);

    const items: TrackedItem[] = [];

    for (const r of (loans.data ?? []) as any[]) {
      items.push({
        id: r.id, kind: "mikopo", kindLabel: "Huduma ya Mikopo",
        title: r.problem_type ?? "Ombi la mkopo",
        status: r.status ?? "pending", admin_note: r.admin_note ?? null,
        created_at: r.created_at, updated_at: r.updated_at ?? null,
        fields: [
          { key: "full_name", label: "Majina matatu", value: r.full_name ?? "" },
          { key: "form_four_index", label: "Namba ya kidato cha nne", value: r.form_four_index ?? "" },
          { key: "registration_number", label: "REG namba", value: r.registration_number ?? "" },
          { key: "course", label: "Kozi", value: r.course ?? "" },
          { key: "year_of_study", label: "Mwaka wa masomo", value: r.year_of_study ?? "" },
          { key: "problem_type", label: "Aina ya huduma", value: r.problem_type ?? "" },
          { key: "problem_description", label: "Maelezo", value: r.problem_description ?? "" },
        ],
      });
    }

    for (const r of (challenges.data ?? []) as any[]) {
      items.push({
        id: r.id, kind: "huduma", kindLabel: "Ombi la Huduma",
        title: r.challenge_type ?? "Ombi la huduma",
        status: r.status ?? "pending", admin_note: r.admin_note ?? null,
        created_at: r.created_at, updated_at: r.updated_at ?? null,
        fields: [
          { key: "full_name", label: "Majina kamili", value: r.full_name ?? "" },
          { key: "registration_number", label: "REG namba", value: r.registration_number ?? "" },
          { key: "course", label: "Kozi", value: r.course ?? "" },
          { key: "challenge_type", label: "Aina ya huduma", value: r.challenge_type ?? "" },
          { key: "description", label: "Maelezo", value: r.description ?? "" },
        ],
      });
    }

    for (const r of (dept.data ?? []) as any[]) {
      items.push({
        id: r.id, kind: "idara", kindLabel: r.departments?.name ? `Idara: ${r.departments.name}` : "Huduma ya Idara",
        title: r.category ?? "Ombi la huduma",
        status: r.status ?? "pending", admin_note: r.admin_note ?? null,
        created_at: r.created_at, updated_at: r.updated_at ?? null,
        fields: [
          { key: "full_name", label: "Majina kamili", value: r.full_name ?? "" },
          { key: "form_four_index", label: "Namba ya kidato cha nne", value: r.form_four_index ?? "" },
          { key: "registration_number", label: "REG namba", value: r.registration_number ?? "" },
          { key: "course", label: "Kozi", value: r.course ?? "" },
          { key: "year_of_study", label: "Mwaka wa masomo", value: r.year_of_study ?? "" },
          { key: "gender", label: "Jinsia", value: r.gender ?? "" },
          { key: "category", label: "Aina ya huduma", value: r.category ?? "" },
          { key: "description", label: "Maelezo", value: r.description ?? "" },
        ],
      });
    }

    items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return { items };
  });

const TABLES: Record<string, string> = {
  mikopo: "loan_requests",
  huduma: "challenges",
  idara: "department_submissions",
};

export const submitCorrection = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      kind: z.enum(["mikopo", "huduma", "idara"]),
      phone: z.string().trim().min(7).max(20),
      values: z.record(z.string(), z.string().max(4000)),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const tail = normalizePhone(data.phone);
    if (tail.length < 7) throw new Error("Namba ya simu si sahihi.");
    const table = TABLES[data.kind]!;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await (supabaseAdmin as any).from(table)
      .select("id,phone,status").eq("id", data.id).maybeSingle();
    if (!row || normalizePhone(row.phone ?? "") !== tail) throw new Error("Ombi hili halipatikani kwa namba hii ya simu.");
    if (row.status !== "needs_correction") throw new Error("Ombi hili haliruhusiwi kubadilishwa kwa sasa.");

    const allowed = new Set([
      "full_name", "form_four_index", "registration_number", "course", "year_of_study",
      "gender", "problem_type", "problem_description", "challenge_type", "category", "description",
    ]);
    const patch: Record<string, string> = {};
    for (const [k, v] of Object.entries(data.values)) if (allowed.has(k) && v.trim()) patch[k] = v.trim();
    if (Object.keys(patch).length === 0) throw new Error("Hakuna taarifa mpya.");

    const { error } = await (supabaseAdmin as any).from(table)
      .update({ ...patch, status: "pending", admin_note: null }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const STATUS_STEPS = STATUS_ORDER;
