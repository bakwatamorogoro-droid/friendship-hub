import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const regToEmail = (reg: string) =>
  `${reg.toLowerCase().replace(/[^a-z0-9]/g, "-")}@leader.mumso.local`;

const PENDING = "PENDING_APPROVAL";

const signupSchema = z.object({
  full_name: z.string().trim().min(4).max(120),
  registration_number: z.string().trim().min(4).max(60),
  course: z.string().trim().min(2).max(120),
  year_of_study: z.string().trim().min(1).max(40),
  position: z.string().trim().min(1).max(80),
  phone: z.string().trim().regex(/^[+0-9\s-]{7,20}$/),
  department_id: z.string().uuid(),
  password: z.string().min(6).max(72),
});

// Usajili mpya wa kiongozi: akaunti inaundwa ikiwa imefungwa hadi Admin Mkuu aidhinishe.
// Nenosiri halihifadhiwi kwenye jedwali la maombi.
export const submitLeaderApplication = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => signupSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const reg = data.registration_number.toUpperCase();
    const { data: dept } = await supabaseAdmin.from("departments").select("id").eq("id", data.department_id).eq("active", true).maybeSingle();
    if (!dept) throw new Error("Wizara uliyochagua haipatikani.");
    const { data: existing } = await (supabaseAdmin.from("leader_applications") as any)
      .select("id,status").eq("registration_number", reg).in("status", ["pending", "approved"]).maybeSingle();
    if (existing) throw new Error(existing.status === "approved" ? "REG hii tayari ina akaunti ya kiongozi. Ingia." : "Ombi la REG hii tayari linasubiri idhini.");

    const email = regToEmail(reg);
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email, password: data.password, email_confirm: true,
      ban_duration: "876000h",
      user_metadata: { full_name: data.full_name, registration_number: reg, position: data.position },
    });
    if (error || !created.user) {
      const m = (error?.message ?? "").toLowerCase();
      if (m.includes("already") || m.includes("exists") || m.includes("registered")) throw new Error("REG hii tayari ina akaunti. Wasiliana na menejimenti.");
      throw new Error("Usajili haujakamilika. Jaribu tena.");
    }
    const { error: insErr } = await (supabaseAdmin.from("leader_applications") as any).insert({
      full_name: data.full_name, registration_number: reg, course: data.course,
      year_of_study: data.year_of_study, position: data.position, phone: data.phone,
      department_id: data.department_id, password_hash: PENDING, status: "pending",
      approved_user_id: created.user.id,
    });
    if (insErr) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error("Usajili haujakamilika. Jaribu tena.");
    }
    return { ok: true };
  });

async function assertAdmin(context: any) {
  const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
  if (!(roles ?? []).some((r: any) => r.role === "admin")) throw new Error("Huna ruhusa. Admin Mkuu tu ndiye anayeidhinisha viongozi.");
}

export const approveLeaderApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ applicationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: app } = await (supabaseAdmin.from("leader_applications") as any)
      .select("*").eq("id", data.applicationId).maybeSingle();
    if (!app) throw new Error("Ombi halijapatikana");
    if (app.status === "approved") throw new Error("Ombi hili tayari limeidhinishwa");
    if (!app.department_id) throw new Error("Ombi halina wizara.");

    const email = regToEmail(app.registration_number);
    let userId: string | null = app.approved_user_id ?? null;
    if (userId) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: "none" });
      if (error) throw new Error("Akaunti haijafunguliwa: " + error.message);
    } else {
      // Maombi ya zamani (kabla ya mfumo mpya)
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email, password: app.password_hash, email_confirm: true,
        user_metadata: { full_name: app.full_name, registration_number: app.registration_number },
      });
      if (error || !created.user) throw new Error(error?.message ?? "Imeshindikana kuunda akaunti");
      userId = created.user.id;
    }

    await (supabaseAdmin.from("profiles") as any).upsert({ id: userId, full_name: app.full_name, phone: app.phone ?? null }, { onConflict: "id" });
    await (supabaseAdmin.from("user_roles") as any).delete().eq("user_id", userId).eq("role", "leader");
    const { error: rErr } = await (supabaseAdmin.from("user_roles") as any).insert({ user_id: userId, role: "leader", department_id: app.department_id });
    if (rErr) throw new Error(rErr.message);

    await (supabaseAdmin.from("leader_applications") as any).update({
      status: "approved", approved_user_id: userId, password_hash: PENDING, updated_at: new Date().toISOString(),
    }).eq("id", app.id);
    return { ok: true, email };
  });

export const rejectLeaderApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ applicationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: app } = await (supabaseAdmin.from("leader_applications") as any)
      .select("approved_user_id,status").eq("id", data.applicationId).maybeSingle();
    if (app?.approved_user_id) {
      await (supabaseAdmin.from("user_roles") as any).delete().eq("user_id", app.approved_user_id).eq("role", "leader");
      await supabaseAdmin.auth.admin.deleteUser(app.approved_user_id);
    }
    const { error } = await (supabaseAdmin.from("leader_applications") as any)
      .update({ status: "rejected", approved_user_id: null, password_hash: PENDING, updated_at: new Date().toISOString() })
      .eq("id", data.applicationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
