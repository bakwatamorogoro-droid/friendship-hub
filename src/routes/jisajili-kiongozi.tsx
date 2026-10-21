import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { BadgeCheck, Send, ShieldCheck, UserPlus } from "lucide-react";
import { FormSection } from "@/components/FormSection";
import { supabase } from "@/integrations/supabase/client";
const regToEmail = (reg: string) =>
  `${reg.toLowerCase().replace(/[^a-z0-9]/g, "-")}@leader.mumso.local`;
import { showStatus } from "@/lib/status";
import { useI18n } from "@/lib/i18n";
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

export const Route = createFileRoute("/jisajili-kiongozi")({
  head: () => ({
    meta: [
      { title: "Jisajili kama Kiongozi — MUMSO" },
      {
        name: "description",
        content:
          "Viongozi wa MUMSO wanaweza kujisajili hapa; usajili unathibitishwa na Admin (Menejimenti).",
      },
      { property: "og:title", content: "Jisajili kama Kiongozi — MUMSO" },
      {
        property: "og:description",
        content: "Tuma ombi la akaunti ya kiongozi; Admin ataidhinisha.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeaderSignupPage,
});

// Thamani za Kiswahili zinaingia kwenye database; lebo zinabadilika kwa lugha.
const POSITIONS = [
  "Rais",
  "Makamu wa Rais",
  "Katibu Mkuu",
  "Naibu Katibu Mkuu",
  "Mweka Hazina",
  "Waziri wa Idara",
  "Naibu Waziri wa Idara",
  "Katibu wa Idara",
  "Mjumbe wa Kamati Kuu",
] as const;

const YEARS = ["Mwaka wa 1", "Mwaka wa 2", "Mwaka wa 3", "Mwaka wa 4", "Mwaka wa 5"] as const;

const schema = z.object({
  full_name: z.string().trim().min(4, "Andika jina kamili").max(120),
  registration_number: z.string().trim().min(4, "Andika REG namba yako").max(60),
  course: z.string().trim().min(2, "Andika kozi unayosomea").max(120),
  year_of_study: z.string().min(1, "Chagua mwaka wa masomo"),
  position: z.string().min(1, "Chagua cheo chako"),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9\s-]{7,20}$/, "Namba ya simu si sahihi"),
  password: z
    .string()
    .min(8, "Nenosiri liwe herufi 8 au zaidi")
    .max(72)
    .regex(/[A-Za-z]/, "Nenosiri liwe na herufi")
    .regex(/[0-9]/, "Nenosiri liwe na namba angalau moja"),
});

function LeaderSignupPage() {
  const { t } = useI18n();
  const [depts, setDepts] = useState<Array<{ id: string; name: string }>>([]);
  const [deptId, setDeptId] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    registration_number: "",
    course: "",
    year_of_study: "",
    position: "",
    phone: "",
    password: "",
  });

  useEffect(() => {
    supabase
      .from("departments")
      .select("id,name")
      .eq("active", true)
      .order("sort_order")
      .then(({ data }) => setDepts((data ?? []) as any));
  }, []);

  const steps = [
    {
      label: t("lsignup.step1"),
      done: !!(form.full_name && form.registration_number && form.phone),
    },
    { label: t("lsignup.step2"), done: !!(form.course && form.year_of_study) },
    { label: t("lsignup.step3"), done: !!(form.position && deptId) },
    { label: t("lsignup.step4"), done: form.password.length >= 8 },
  ];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      showStatus("error", t("form.fill_all"));
      return;
    }
    if (!deptId) {
      showStatus("error", t("lsignup.choose_dept"));
      return;
    }
    setLoading(true);
    try {
      const d = parsed.data;
      const reg = d.registration_number.toUpperCase();
      const { data: su, error } = await supabase.auth.signUp({
        email: regToEmail(reg),
        password: d.password,
        options: {
          data: { full_name: d.full_name, registration_number: reg, position: d.position },
        },
      });
      if (error || !su.user) {
        const m = (error?.message ?? "").toLowerCase();
        if (m.includes("already") || m.includes("registered"))
          throw new Error(t("lsignup.err_exists"));
        if (m.includes("weak") || m.includes("guess") || m.includes("password"))
          throw new Error(t("lsignup.err_weak"));
        throw new Error(`${t("lsignup.err_generic")} ${error?.message ?? ""}`);
      }
      const { error: insErr } = await (supabase.from("leader_applications") as any).insert({
        full_name: d.full_name,
        registration_number: reg,
        course: d.course,
        year_of_study: d.year_of_study,
        position: d.position,
        phone: d.phone,
        department_id: deptId,
        password_hash: "PENDING_APPROVAL",
        status: "pending",
        approved_user_id: su.user.id,
      });
      await supabase.auth.signOut();
      if (insErr) throw new Error(`${t("lsignup.err_save")}: ${insErr.message}`);
    } catch (err) {
      setLoading(false);
      showStatus("error", err instanceof Error ? err.message : t("lsignup.err_generic"));
      return;
    }
    setLoading(false);
    setDone(true);
    setForm({
      full_name: "",
      registration_number: "",
      course: "",
      year_of_study: "",
      position: "",
      phone: "",
      password: "",
    });
    setDeptId("");
  };

  return (
    <div className="service-form-wrap page-shell page-shell-form form-page section-y-sm">
      <div className="mgmt-hero">
        <div className="mgmt-hero-inner">
          <span className="mgmt-chip">
            <UserPlus className="h-3.5 w-3.5" />
            {t("lsignup.badge")}
          </span>
          <h1 className="mt-3 text-3xl font-black leading-tight md:text-4xl">
            {t("lsignup.title")}
          </h1>
          <p className="mt-2 text-sm text-primary-foreground/85 md:text-base">
            {t("lsignup.lead")}
          </p>
          <div className="signup-steps">
            {steps.map((s, i) => (
              <div key={s.label} className="flex flex-1 items-center gap-2">
                <span className="signup-step-dot" data-done={s.done}>
                  {s.done ? "✓" : i + 1}
                </span>
                {i < steps.length - 1 && <span className="signup-step-line" aria-hidden />}
              </div>
            ))}
          </div>
          <div className="mt-2 hidden justify-between text-xs font-medium text-primary-foreground/75 sm:flex">
            {steps.map((s) => (
              <span key={s.label}>{s.label}</span>
            ))}
          </div>
        </div>
      </div>

      {done ? (
        <div className="digital-card text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-3 text-xl font-bold">{t("lsignup.done_title")}</h2>
          <p className="mt-2 text-muted-foreground">{t("lsignup.done_msg")}</p>
          <p className="mx-auto mt-4 flex max-w-md items-start gap-2 rounded-xl border border-primary/25 bg-primary/5 p-3 text-left text-sm text-primary">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
            {t("lsignup.page_note")}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link to="/login">
              <Button>{t("lsignup.go_login")}</Button>
            </Link>
            <Button variant="outline" onClick={() => setDone(false)}>
              {t("lsignup.register_another")}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="digital-card">
          <FormSection step={1} title={t("lsignup.s1")}>
            <div className="space-y-2">
              <Label>{t("form.full_name")} *</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("form.reg_number")} *</Label>
                <Input
                  value={form.registration_number}
                  onChange={(e) => setForm({ ...form, registration_number: e.target.value })}
                  placeholder={t("form.reg_placeholder")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("form.phone")} *</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+255 7XX XXX XXX"
                  required
                />
              </div>
            </div>
          </FormSection>

          <FormSection step={2} title={t("lsignup.s2")}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("lsignup.course_label")} *</Label>
                <Input
                  value={form.course}
                  onChange={(e) => setForm({ ...form, course: e.target.value })}
                  placeholder={t("lsignup.course_placeholder")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("lsignup.year_label")} *</Label>
                <Select
                  value={form.year_of_study}
                  onValueChange={(v) => setForm({ ...form, year_of_study: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("lsignup.year_placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y, i) => (
                      <SelectItem key={y} value={y}>
                        {t(`lsignup.year${i + 1}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FormSection>

          <FormSection step={3} title={t("lsignup.s3")}>
            <div className="space-y-2">
              <Label>{t("lsignup.position")} *</Label>
              <Select
                value={form.position}
                onValueChange={(v) => setForm({ ...form, position: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("lsignup.position_placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((p, i) => (
                    <SelectItem key={p} value={p}>
                      {t(`lsignup.pos${i + 1}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("lsignup.department")} *</Label>
              <Select value={deptId} onValueChange={setDeptId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("lsignup.department_placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {depts.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("lsignup.department_hint")}</p>
            </div>
          </FormSection>

          <FormSection step={4} title={t("lsignup.s4")}>
            <div className="space-y-2">
              <Label>{t("lsignup.password")} *</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={8}
                required
              />
              <p className="text-xs text-muted-foreground">{t("lsignup.password_hint")}</p>
            </div>
          </FormSection>

          <FormSection step={5} title={t("form.step_submit")} hint={t("lsignup.done_msg")}>
            <Button type="submit" size="lg" className="form-submit" disabled={loading}>
              <Send className="mr-2 h-5 w-5" />
              {loading ? t("common.sending") : t("lsignup.submit")}
            </Button>
            <p className="form-footnote mt-3">
              {t("lsignup.already")}{" "}
              <Link to="/login" className="text-primary underline">
                {t("lsignup.login_here")}
              </Link>
            </p>
          </FormSection>
        </form>
      )}
    </div>
  );
}
