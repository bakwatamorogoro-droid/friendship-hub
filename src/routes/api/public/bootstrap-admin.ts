import { createFileRoute } from "@tanstack/react-router";

// One-shot public endpoint to (re)create the management super-admin account.
export const Route = createFileRoute("/api/public/bootstrap-admin")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const email = "mumso@leader.mumso.local";
        const password = "HASSANI";
        const { data: list } = await supabaseAdmin.auth.admin.listUsers();
        const found = list?.users?.find((u: any) => (u.email ?? "").toLowerCase() === email);
        let userId = found?.id ?? null;
        if (!userId) {
          const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
            email, password, email_confirm: true,
            user_metadata: { full_name: "Management System" },
          });
          if (error || !created.user) {
            return new Response(JSON.stringify({ ok: false, error: error?.message }), { status: 500 });
          }
          userId = created.user.id;
        } else {
          await supabaseAdmin.auth.admin.updateUserById(userId, { password, email_confirm: true });
        }
        const { data: roles } = await (supabaseAdmin.from("user_roles") as any)
          .select("id").eq("user_id", userId).eq("role", "admin").limit(1);
        if (!roles || roles.length === 0) {
          await (supabaseAdmin.from("user_roles") as any).insert({ user_id: userId, role: "admin" });
        }
        return new Response(JSON.stringify({ ok: true, username: "MUMSO" }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
