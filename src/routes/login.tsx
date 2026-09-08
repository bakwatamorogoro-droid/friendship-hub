import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";

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
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Viongozi wanaingia kwa REG namba (bila `@`)
    const identifier = email.includes("@") ? email : regToEmail(email);
    const { error } = await supabase.auth.signInWithPassword({ email: identifier, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Karibu!");
    nav({ to: "/admin" });
  };


  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="panel-3d rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-center">MUMSO Ingia</h1>
        <p className="text-sm text-muted-foreground text-center mt-1">Kwa viongozi na Menejimenti (Admin) pekee.</p>
        <form onSubmit={signIn} className="space-y-4 mt-6">
          <div className="space-y-2"><Label>Email au REG Namba</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@mfano.com au MUM/BA/2023/001" /></div>
          <div className="space-y-2"><Label>Nenosiri</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <Button type="submit" className="w-full btn-3d" disabled={loading}>{loading ? "..." : "Ingia"}</Button>
          <p className="mt-2 flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Akaunti zinathibitishwa na Menejimenti (Admin) — hakuna uthibitisho wa barua pepe.
            </span>
            <Link to="/jisajili-kiongozi" className="font-semibold text-primary underline underline-offset-4">
              Jisajili kama Kiongozi
            </Link>
            <Link to="/fuatilia" className="text-primary underline underline-offset-4">
              Fuatilia Huduma yako
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
