import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useRegisteredStudent } from "@/lib/student-registration";
import { StudentIdentity } from "@/components/StudentIdentity";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { showStatus } from "@/lib/status";
import { newTrackCode, trackCodeMessage } from "@/lib/track-code";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/changamoto")({
  head: () => ({
    meta: [
      { title: "Huduma — MUMSO" },
      {
        name: "description",
        content:
          "Andika REG namba yako, taarifa zako zitatoka moja kwa moja — kisha tuma changamoto yako kwa wizara husika.",
      },
      { property: "og:title", content: "Huduma — MUMSO" },
      {
        property: "og:description",
        content: "Tuma changamoto yako moja kwa moja kwa wizara husika ya MUMSO.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChangamotoPage,
});

type Dept = { id: string; name: string };

const schema = z.object({
  registration_number: z.string().trim().min(4).max(60),
  challenge_type: z.string().min(1),
  department_id: z.string().min(1),
  description: z.string().trim().min(10).max(2000),
});

function ChangamotoPage() {
  const { t } = useI18n();
  const types = useFormCategories("huduma");
  const [loading, setLoading] = useState(false);
  const identity = useRegisteredStudent();
  const student = identity.student;
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [form, setForm] = useState({
    registration_number: "",
    challenge_type: "",
    department_id: "",
    description: "",
  });

  useEffect(() => {
    (supabase.from("departments") as any)
      .select("id,name")
      .eq("active", true)
      .order("name")
      .then(({ data }: any) => setDepartments((data as Dept[]) ?? []));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) {
      showStatus("error", t("form.verify_first"));
      return;
    }
    const parsed = schema.safeParse({ ...form, registration_number: student.registration_number });
    if (!parsed.success) {
      showStatus("error", t("form.fill_all"));
      return;
    }
    setLoading(true);
    const code = newTrackCode();
    const { error } = await (supabase.from("challenges") as any).insert({
      full_name: student.full_name,
      registration_number: student.registration_number,
      course: student.course,
      phone: student.phone,
      challenge_type: parsed.data.challenge_type,
      department_id: parsed.data.department_id,
      description: parsed.data.description,
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
        t("chal.received"),
        "Your request has reached the relevant ministry. Thank you!",
      ),
    });
    setForm({ registration_number: "", challenge_type: "", department_id: "", description: "" });
  };

  const dl = useServiceDeadline("changamoto");

  return (
    <div className="service-form-wrap page-shell page-shell-form form-page section-y-sm">
      <div className="digital-page-hero">
        <h1 className="relative z-10 text-3xl font-bold md:text-4xl">{t("chal.title")}</h1>
        <p className="relative z-10 mt-2 text-primary-foreground/85">{t("chal.lead")}</p>
      </div>
      <Countdown deadline={dl?.deadline_at} note={dl?.deadline_note} />

      <form onSubmit={submit} className="digital-card">
        <FormSection step={1} title={t("form.step_identity")} hint={t("form.step_identity_hint")}>
          <StudentIdentity identity={identity} />
        </FormSection>

        <FormSection step={2} title={t("form.step_request")}>
          <div className="form-grid">
            <div className="space-y-2 digital-field">
              <Label>{t("chal.department")} *</Label>
              <Select
                value={form.department_id}
                onValueChange={(v) => setForm({ ...form, department_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("chal.department_placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 digital-field">
              <Label>{t("chal.type")} *</Label>
              <Select
                value={form.challenge_type}
                onValueChange={(v) => setForm({ ...form, challenge_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("chal.type_placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {types.map((ty) => (
                    <SelectItem key={ty.id} value={ty.label}>
                      {ty.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="Kufiwa (Msiba)">{t("chal.bereavement")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </FormSection>

        <FormSection step={3} title={t("form.step_details")}>
          <div className="space-y-2 digital-field">
            <Label>{t("chal.details")} *</Label>
            <Textarea
              rows={6}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t("chal.details_placeholder")}
              required
            />
          </div>
        </FormSection>

        <FormSection step={4} title={t("form.step_submit")} hint={t("form.step_submit_hint")}>
          <Button type="submit" disabled={loading || !student} size="lg" className="form-submit">
            <Send className="mr-2 h-5 w-5" />
            {loading ? t("common.sending") : t("chal.submit")}
          </Button>
          {!student && (
            <p className="form-footnote mt-3">
              <UserRound className="h-4 w-4" /> {t("form.verify_first_hint")}
            </p>
          )}
        </FormSection>
      </form>
    </div>
  );
}
