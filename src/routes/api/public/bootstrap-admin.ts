import { createFileRoute } from "@tanstack/react-router";

// One-shot public endpoint to create the super-admin account when none exists.
// Safe: only runs if there is no admin row yet.
export const Route = createFileRoute("/api/public/bootstrap-admin")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: existing } = await (supabaseAdmin.from("user_roles") as any)
          .select("id").eq("role", "admin").limit(1);
        if (existing && existing.length > 0) {
          return new Response(JSON.stringify({ ok: true, created: false }), {
            headers: { "content-type": "application/json" },
          });
        }
        const email = "leemiju639@gmail.com";
        const password = "Mkopo@12";
        const { data: list } = await supabaseAdmin.auth.admin.listUsers();
        const found = list?.users?.find((u: any) => (u.email ?? "").toLowerCase() === email);
        let userId = found?.id ?? null;
        if (!userId) {
          const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
            email, password, email_confirm: true,
            user_metadata: { full_name: "Admin Mkuu" },
          });
          if (error || !created.user) {
            return new Response(JSON.stringify({ ok: false, error: error?.message }), { status: 500 });
          }
          userId = created.user.id;
        } else {
          await supabaseAdmin.auth.admin.updateUserById(userId, { password, email_confirm: true });
        }
        await (supabaseAdmin.from("user_roles") as any).insert({ user_id: userId, role: "admin" });
        return new Response(JSON.stringify({ ok: true, created: true, email }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
