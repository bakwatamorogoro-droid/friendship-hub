import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useRegisteredStudent } from "@/lib/student-registration";
import { StudentIdentity } from "@/components/StudentIdentity";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { showStatus } from "@/lib/status";
import { newTrackCode, trackCodeMessage } from "@/lib/track-code";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSection } from "@/components/FormSection";
import { Send, UserRound } from "lucide-react";
import { useFormCategories } from "@/lib/use-site-settings";
import { Countdown } from "@/components/Countdown";
import { useServiceDeadline } from "@/lib/use-deadline";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/mikopo")({
  head: () => ({
    meta: [
      { title: "Huduma ya Mikopo — MUMSO" },
      {
        name: "description",
        content: "Omba huduma za mikopo: disbursement, allocation, appeal na zaidi.",
      },
      { property: "og:title", content: "Huduma ya Mikopo — MUMSO" },
      {
        property: "og:description",
        content: "Jaza fomu ya mkopo wa HESLB na omba huduma ya mkopo kwa MUMSO.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MikopoPage,
});

const schema = z.object({
  full_name: z.string().trim().min(4).max(120),
  form_four_index: z.string().trim().min(4).max(40),
  registration_number: z.string().trim().min(4).max(60),
  course: z.string().trim().min(2).max(120),
  year_of_study: z.string().min(1),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9\s-]{7,20}$/),
  problem_type: z.string().min(1),
  problem_description: z.string().trim().min(10).max(2000),
});

function MikopoPage() {
  const { t } = useI18n();
  const problems = useFormCategories("mikopo");
  const identity = useRegisteredStudent();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    form_four_index: "",
    registration_number: "",
    course: "",
    year_of_study: "",
    phone: "",
    problem_type: "",
    problem_description: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identity.student) {
      showStatus("error", t("form.verify_first"));
      return;
    }
    const parsed = schema.safeParse({ ...form, ...identity.student });
    if (!parsed.success) {
      showStatus("error", t("form.fill_all"));
      return;
    }
    setLoading(true);
    const code = newTrackCode();
    const { error } = await (supabase.from("loan_requests") as any).insert({
      ...parsed.data,
      email: "",
      track_code: code,
    });
    setLoading(false);
    if (error) {
      showStatus("error", `${t("form.error_prefix")}: ${error.message}`);
      return;
    }
    showStatus({
      type: "success",
      title: t("form.received_title"),
      message: trackCodeMessage(
        code,
        t("loan.received"),
        "Your loan request has been received. We will get back to you.",
      ),
    });
    setForm({
      full_name: "",
      form_four_index: "",
      registration_number: "",
      course: "",
      year_of_study: "",
      phone: "",
      problem_type: "",
      problem_description: "",
    });
  };

  const dl = useServiceDeadline("mikopo");

  return (
    <div className="service-form-wrap page-shell page-shell-form form-page section-y-sm">
      <div className="digital-page-hero">
        <h1 className="relative z-10 text-3xl font-bold md:text-4xl">{t("loan.title")}</h1>
        <p className="relative z-10 mt-2 text-primary-foreground/85">{t("loan.lead")}</p>
      </div>

      <Countdown deadline={dl?.deadline_at} note={dl?.deadline_note} />

      <form onSubmit={submit} className="digital-card">
        <FormSection step={1} title={t("form.step_identity")} hint={t("form.step_identity_hint")}>
          <StudentIdentity identity={identity} />
        </FormSection>

        <FormSection step={2} title={t("form.step_request")}>
          <div className="form-grid">
            <div className="space-y-2 digital-field">
              <Label>{t("loan.type")} *</Label>
              <Select
                value={form.problem_type}
                onValueChange={(v) => setForm({ ...form, problem_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("form.category_placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {problems.map((p) => (
                    <SelectItem key={p.id} value={p.label}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 digital-field">
              <Label htmlFor="form-four">{t("loan.form_four")} *</Label>
              <Input
                id="form-four"
                placeholder={t("loan.form_four_placeholder")}
                value={form.form_four_index}
                onChange={(e) => setForm({ ...form, form_four_index: e.target.value })}
                required
              />
            </div>
          </div>
        </FormSection>

        <FormSection step={3} title={t("form.step_details")}>
          <div className="space-y-2 digital-field">
            <Label>{t("loan.details")} *</Label>
            <Textarea
              rows={6}
              value={form.problem_description}
              onChange={(e) => setForm({ ...form, problem_description: e.target.value })}
              required
            />
          </div>
        </FormSection>

        <FormSection step={4} title={t("form.step_submit")} hint={t("form.step_submit_hint")}>
          <Button
            type="submit"
            disabled={loading || !identity.student}
            size="lg"
            className="form-submit"
          >
            <Send className="mr-2 h-5 w-5" />
            {loading ? t("common.sending") : t("form.submit_generic")}
          </Button>
          {!identity.student && (
            <p className="form-footnote mt-3">
              <UserRound className="h-4 w-4" /> {t("form.verify_first_hint")}
            </p>
          )}
        </FormSection>
      </form>
    </div>
  );
}
