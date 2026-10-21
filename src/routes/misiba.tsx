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
import { HeartCrack, Send, UserRound } from "lucide-react";
import { FormSection } from "@/components/FormSection";
import { Countdown } from "@/components/Countdown";
import { useServiceDeadline } from "@/lib/use-deadline";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/misiba")({
  head: () => ({
    meta: [
      { title: "Taarifa za Misiba — MUMSO" },
      { name: "description", content: "Jaza fomu ya kutoa taarifa ya msiba kwa uongozi wa MUMSO." },
      { property: "og:title", content: "Taarifa za Misiba — MUMSO" },
      {
        property: "og:description",
        content: "Fomu ya kutoa taarifa ya msiba kwa uongozi wa MUMSO.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MisibaPage,
});

const schema = z.object({
  deceased_name: z.string().trim().min(2).max(120),
  relationship: z.string().trim().min(2).max(60),
  student_name: z.string().trim().min(2).max(120),
  registration_number: z.string().trim().min(2).max(60),
  phone: z.string().trim().min(7).max(20),
  death_date: z.string().min(1),
  location: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
});

const empty = {
  deceased_name: "",
  relationship: "",
  student_name: "",
  registration_number: "",
  phone: "",
  death_date: "",
  location: "",
  description: "",
};

function MisibaPage() {
  const { t } = useI18n();
  const identity = useRegisteredStudent();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(empty);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identity.student) {
      showStatus("error", t("form.verify_first"));
      return;
    }
    const parsed = schema.safeParse({
      ...form,
      registration_number: identity.student.registration_number,
      student_name: identity.student.full_name,
      phone: identity.student.phone,
    });
    if (!parsed.success) {
      showStatus("error", t("form.fill_all"));
      return;
    }
    setLoading(true);
    const code = newTrackCode();
    const { error } = await (supabase.from("deaths") as any).insert({
      ...parsed.data,
      track_code: code,
    });
    setLoading(false);
    if (error) {
      showStatus("error", `${t("form.error_prefix")}: ${error.message}`);
      return;
    }
    showStatus({
      type: "success",
      title: t("death.received_title"),
      message: trackCodeMessage(
        code,
        t("death.received"),
        "The notice has been received. Our condolences.",
      ),
    });
    setForm(empty);
  };

  const dl = useServiceDeadline("misiba");

  return (
    <div className="service-form-wrap mx-auto max-w-3xl px-4 py-10">
      <div className="digital-page-hero">
        <h1 className="relative z-10 flex items-center gap-3 text-3xl font-bold md:text-4xl">
          <HeartCrack className="h-8 w-8" /> {t("death.title")}
        </h1>
        <p className="relative z-10 mt-2 text-primary-foreground/85">{t("death.lead")}</p>
      </div>

      <Countdown deadline={dl?.deadline_at} note={dl?.deadline_note} className="mt-6" />

      <form onSubmit={submit} className="digital-card mt-8">
        <FormSection step={1} title={t("form.step_identity")} hint={t("form.step_identity_hint")}>
          <StudentIdentity identity={identity} />
        </FormSection>

        <FormSection step={2} title={t("form.step_request")}>
          <div className="form-grid">
            <div className="space-y-2 digital-field">
              <Label>{t("death.deceased")} *</Label>
              <Input
                value={form.deceased_name}
                onChange={(e) => setForm({ ...form, deceased_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2 digital-field">
              <Label>{t("death.relationship")} *</Label>
              <Input
                value={form.relationship}
                onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2 digital-field">
              <Label>{t("death.date")} *</Label>
              <Input
                type="date"
                value={form.death_date}
                onChange={(e) => setForm({ ...form, death_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2 digital-field">
              <Label>{t("death.location")} *</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                required
              />
            </div>
          </div>
        </FormSection>

        <FormSection step={3} title={t("form.step_details")}>
          <div className="space-y-2 digital-field">
            <Label>
              {t("death.details")} ({t("form.optional")})
            </Label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
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
            {loading ? t("common.sending") : t("death.submit")}
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
