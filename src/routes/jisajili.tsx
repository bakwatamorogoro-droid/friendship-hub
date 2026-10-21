import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { GraduationCap, MapPin, Send, ShieldCheck } from "lucide-react";
import { FormSection } from "@/components/FormSection";
import { rememberStudentReg } from "@/lib/student-registration";
import { CAMPUS_RADIUS_M, useCampusGate } from "@/lib/geofence";
import { supabase } from "@/integrations/supabase/client";
import { showStatus } from "@/lib/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/jisajili")({
  head: () => ({
    meta: [
      { title: "Jisajili Mwanafunzi — MUMSO" },
      {
        name: "description",
        content:
          "Kila mwanafunzi wa MUM anatakiwa kujisajili hapa: majina, simu, REG namba, mwaka wa masomo na kozi.",
      },
      { property: "og:title", content: "Jisajili Mwanafunzi — MUMSO" },
      {
        property: "og:description",
        content: "Sajili taarifa zako za mwanafunzi kwenye mfumo wa MUMSO.",
      },
      { property: "og:type", content: "website" },
      { property: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentSignupPage,
});

const YEARS = ["1", "2", "3", "4", "5"];

const schema = z.object({
  full_name: z.string().trim().min(4).max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9\s-]{7,20}$/),
  registration_number: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9/._ -]{3,59}$/),
  year_of_study: z.string().min(1),
  course: z.string().trim().min(2).max(120),
});

function StudentSignupPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const gate = useCampusGate();
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    registration_number: "",
    year_of_study: "",
    course: "",
  });

  const years = YEARS.map((y) => `${t("form.year")} ${y}`);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      showStatus("error", t("form.fill_all"));
      return;
    }
    if (gate.status !== "inside") {
      showStatus("error", t("form.verify_first"));
      return;
    }
    setLoading(true);
    const { error } = await (supabase.from("students") as any).insert({
      ...parsed.data,
      latitude: gate.lat,
      longitude: gate.lng,
    });
    setLoading(false);
    if (error) {
      showStatus(
        "error",
        error.message.includes("duplicate") || error.code === "23505"
          ? t("form.reg_verified")
          : `${t("form.error_prefix")}: ${error.message}`,
      );
      return;
    }
    rememberStudentReg(parsed.data.registration_number);
    setDone(true);
    setForm({ full_name: "", phone: "", registration_number: "", year_of_study: "", course: "" });
  };

  return (
    <div className="service-form-wrap mx-auto max-w-2xl px-4 py-12">
      <div className="digital-page-hero">
        <h1 className="relative z-10 flex items-center gap-3 text-3xl font-bold md:text-4xl">
          <GraduationCap className="h-8 w-8" /> {t("signup.title")}
        </h1>
        <p className="relative z-10 mt-2 text-base text-primary-foreground/85 md:text-lg">
          {t("signup.lead")}
        </p>
      </div>

      {done ? (
        <div className="digital-card mt-8 p-8 text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-3 text-xl font-bold">{t("common.success")}</h2>
          <p className="mt-2 text-muted-foreground">{t("signup.lead")}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/huduma">{t("home.cta_service")}</Link>
            </Button>
            <Button variant="outline" onClick={() => setDone(false)}>
              {t("signup.title")}
            </Button>
          </div>
        </div>
      ) : gate.status !== "inside" ? (
        <div className="digital-card mt-8 p-8 text-center">
          <MapPin className="mx-auto h-12 w-12 text-primary" />
          {gate.status === "checking" && (
            <>
              <h2 className="mt-3 text-xl font-bold">{t("common.loading")}</h2>
              <p className="mt-2 text-muted-foreground">{t("form.verify_first_hint")}</p>
            </>
          )}
          {gate.status === "outside" && (
            <>
              <h2 className="mt-3 text-xl font-bold">{t("common.not_found")}</h2>
              <p className="mt-2 text-muted-foreground">
                {gate.distance.toLocaleString()} m / {CAMPUS_RADIUS_M} m
              </p>
              <Button className="mt-5" onClick={() => window.location.reload()}>
                {t("common.try_again")}
              </Button>
            </>
          )}
          {(gate.status === "denied" || gate.status === "unsupported") && (
            <>
              <h2 className="mt-3 text-xl font-bold">{t("common.not_found")}</h2>
              <p className="mt-2 text-muted-foreground">{t("form.verify_first_hint")}</p>
              <Button className="mt-5" onClick={() => window.location.reload()}>
                {t("common.try_again")}
              </Button>
            </>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="digital-card mt-8">
          <FormSection step={1} title={t("form.step_identity")} hint={t("form.step_identity_hint")}>
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
              <MapPin className="h-4 w-4" /> {gate.distance} m
            </div>
            <div className="form-grid">
              <div className="space-y-2 digital-field">
                <Label>{t("form.full_name")} *</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2 digital-field">
                <Label>{t("form.phone")} *</Label>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+255 7XX XXX XXX"
                  required
                />
              </div>
              <div className="space-y-2 digital-field">
                <Label>{t("form.reg_number")} *</Label>
                <Input
                  value={form.registration_number}
                  onChange={(e) => setForm({ ...form, registration_number: e.target.value })}
                  placeholder={t("form.reg_placeholder")}
                  required
                />
              </div>
              <div className="space-y-2 digital-field">
                <Label>{t("lsignup.year_label")} *</Label>
                <Select
                  value={form.year_of_study}
                  onValueChange={(v) => setForm({ ...form, year_of_study: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("lsignup.year_placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 digital-field">
                <Label>{t("lsignup.course_label")} *</Label>
                <Input
                  value={form.course}
                  onChange={(e) => setForm({ ...form, course: e.target.value })}
                  placeholder={t("lsignup.course_placeholder")}
                  required
                />
              </div>
            </div>
          </FormSection>

          <FormSection step={2} title={t("form.step_submit")}>
            <Button type="submit" size="lg" className="form-submit" disabled={loading}>
              <Send className="mr-2 h-5 w-5" />
              {loading ? t("common.sending") : t("signup.title")}
            </Button>
          </FormSection>
        </form>
      )}
    </div>
  );
}
