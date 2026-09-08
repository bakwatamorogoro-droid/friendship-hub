import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const regToEmail = (reg: string) =>
  `${reg.toLowerCase().replace(/[^a-z0-9]/g, "-")}@leader.mumso.local`;

export const approveLeaderApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ applicationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) throw new Error("Huna ruhusa. Admin Mkuu tu ndiye anayeidhinisha viongozi.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: app, error: appErr } = await (supabaseAdmin.from("leader_applications") as any)
      .select("*").eq("id", data.applicationId).maybeSingle();
    if (appErr || !app) throw new Error(appErr?.message ?? "Ombi halijapatikana");
    if (app.status === "approved") throw new Error("Ombi hili tayari limeidhinishwa");

    const email = regToEmail(app.registration_number);

    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: app.password_hash,
      email_confirm: true,
      user_metadata: {
        full_name: app.full_name,
        registration_number: app.registration_number,
        position: app.position,
      },
    });

    let userId = created?.user?.id ?? null;

    // Kama akaunti ilikuwa tayari ipo, tumia ile iliyopo badala ya kufeli.
    if (!userId) {
      const msg = (cErr?.message ?? "").toLowerCase();
      const exists = msg.includes("already") || msg.includes("registered") || msg.includes("exists");
      if (!exists) throw new Error(cErr?.message ?? "Imeshindikana kuunda akaunti");
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = (list?.users ?? []).find((u: any) => u.email === email);
      if (!found) throw new Error(cErr?.message ?? "Imeshindikana kuunda akaunti");
      userId = found.id;
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: app.password_hash,
        email_confirm: true,
      });
    }

    await (supabaseAdmin.from("profiles") as any).upsert(
      { id: userId, full_name: app.full_name, phone: app.phone ?? null },
      { onConflict: "id" },
    );

    const { error: rErr } = await (supabaseAdmin.from("user_roles") as any).upsert(
      { user_id: userId, role: "leader", department_id: app.department_id },
      { onConflict: "user_id,role" },
    );
    if (rErr) throw new Error(rErr.message);

    await (supabaseAdmin.from("leader_applications") as any).update({
      status: "approved",
      approved_user_id: userId,
      updated_at: new Date().toISOString(),
    }).eq("id", app.id);

    return { ok: true, email };
  });

export const rejectLeaderApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ applicationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) throw new Error("Huna ruhusa");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin.from("leader_applications") as any)
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", data.applicationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });