import { useState } from "react";
import { KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

/**
 * Kubadilisha nenosiri la akaunti ya kiongozi.
 * Supabase huhitaji nenosiri la sasa linapothibitisha mabadiliko, hivyo
 * tunaliomba wazi badala ya kutuma tupu.
 */
export function PasswordPanel() {
  const { t } = useI18n();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 6) {
      toast.error(t("pw.too_short"));
      return;
    }
    if (next !== confirm) {
      toast.error(t("pw.mismatch"));
      return;
    }
    if (next === current) {
      toast.error(t("pw.same"));
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      password: next,
      // Supabase huthibitisha kwa nenosiri la sasa pale mradi umeiwezesha;
      // tunalituma tu kama mtumiaji amelijaza.
      ...(current ? { current_password: current } : {}),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("pw.changed"));
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  return (
    <form onSubmit={submit} className="mw-panel pw-form">
      <div className="mw-panel-head">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <KeyRound className="h-5 w-5 text-primary" /> {t("pw.title")}
        </h2>
      </div>
      <div className="mw-form">
        <p className="mw-form-lead flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> {t("pw.lead")}
        </p>
        <div className="space-y-2">
          <Label htmlFor="pw-current">{t("pw.current")} *</Label>
          <Input
            id="pw-current"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw-next">{t("pw.new")} *</Label>
          <Input
            id="pw-next"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw-confirm">{t("pw.confirm")} *</Label>
          <Input
            id="pw-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <Button type="submit" disabled={saving} className="self-start">
          {saving ? (
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <KeyRound className="mr-2 h-4 w-4" />
          )}
          {t("pw.save")}
        </Button>
      </div>
    </form>
  );
}
