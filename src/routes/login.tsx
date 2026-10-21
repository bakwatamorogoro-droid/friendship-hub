import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, UserPlus } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const regToEmail = (reg: string) =>
  `${reg.toLowerCase().replace(/[^a-z0-9]/g, "-")}@leader.mumso.local`;

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Ingia — MUMSO" },
      { name: "description", content: "Kuingia kwa viongozi na Menejimenti ya MUMSO." },
      { property: "og:title", content: "Ingia — MUMSO" },
      { property: "og:description", content: "Kuingia kwa viongozi na Menejimenti ya MUMSO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Viongozi wanaingia kwa REG namba (bila `@`)
    const identifier = email.includes("@") ? email : regToEmail(email);
    const { data: si, error } = await supabase.auth.signInWithPassword({
      email: identifier,
      password,
    });
    if (error) {
      setLoading(false);
      const m = error.message.toLowerCase();
      toast.error(
        m.includes("banned")
          ? t("login.pending")
          : m.includes("invalid")
            ? t("login.bad_credentials")
            : error.message,
      );
      return;
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role,department_id")
      .eq("user_id", si.user.id);
    setLoading(false);
    if (!(roles ?? []).length) {
      await supabase.auth.signOut();
      toast.error(t("login.pending"));
      return;
    }
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    const isLeader = (roles ?? []).some((r: any) => r.role === "leader" && r.department_id);
    if (!isAdmin && !isLeader) {
      await supabase.auth.signOut();
      toast.error(t("login.no_department"));
      return;
    }
    toast.success(isAdmin ? t("login.welcome_admin") : t("login.welcome_leader"));
    nav({ to: "/admin" });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="mgmt-hero mb-6">
        <div className="mgmt-hero-inner text-center">
          <span className="mgmt-chip mx-auto">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t("login.badge")}
          </span>
          <h1 className="mt-3 text-2xl font-black md:text-3xl">{t("login.title")}</h1>
          <p className="mt-2 text-sm text-primary-foreground/85">{t("login.lead")}</p>
        </div>
      </div>
      <div className="panel-3d rounded-2xl p-6">
        <form onSubmit={signIn} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("login.identifier")}</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@mfano.com au MUM/BA/2023/001"
            />
          </div>
          <div className="space-y-2">
            <Label>{t("login.password")}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full btn-3d" disabled={loading}>
            {loading ? "..." : t("login.submit")}
          </Button>
        </form>
        <div className="mt-5 space-y-3 border-t border-border pt-5 text-center text-sm">
          <p className="flex items-center justify-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" /> {t("login.note")}
          </p>
          <Link to="/jisajili-kiongozi" className="block">
            <Button variant="outline" className="w-full">
              <UserPlus className="mr-2 h-4 w-4" />
              {t("login.leader_signup")}
            </Button>
          </Link>
          <Link
            to="/fuatilia"
            className="inline-block font-medium text-primary underline underline-offset-4"
          >
            {t("login.track")}
          </Link>
        </div>
      </div>
    </div>
  );
}
