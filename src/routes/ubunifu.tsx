import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Ban,
  BellRing,
  BriefcaseBusiness,
  Building2,
  ClipboardCheck,
  FileText,
  Lightbulb,
  Lock,
  Rocket,
  Send,
  Sparkles,
  UserRound,
} from "lucide-react";
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
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/ubunifu")({
  head: () => ({
    meta: [
      { title: "Ubunifu na Fursa za Kujiajiri — MUMSO" },
      {
        name: "description",
        content:
          "Fomu ya kuwasilisha mawazo ya ubunifu na fursa za kujiajiri kwa wanachuo wa MUMSO. Inakuja hivi karibuni.",
      },
      { property: "og:title", content: "Ubunifu na Fursa za Kujiajiri — MUMSO" },
      {
        property: "og:description",
        content:
          "Wasilisha wazo la ubunifu na changamoto inayotatuliwa. Fomu inakuja hivi karibuni.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UbunifuPage,
});

const AREAS = [
  "inn.area_self",
  "inn.area_tech",
  "inn.area_field",
  "inn.area_agri",
  "inn.area_dev",
  "inn.area_other",
] as const;

const FLOW = [
  { title: "inn.flow_1_title", body: "inn.flow_1_body", Icon: Lightbulb },
  { title: "inn.flow_2_title", body: "inn.flow_2_body", Icon: ClipboardCheck },
  { title: "inn.flow_3_title", body: "inn.flow_3_body", Icon: Building2 },
  { title: "inn.flow_4_title", body: "inn.flow_4_body", Icon: BellRing },
] as const;

/** Sehemu ya onyesho: haitumiki, haiwasilishi na haiwezi kuhaririwa. */
function LockedField({
  label,
  placeholder,
  multiline,
  rows = 4,
}: {
  label: string;
  placeholder: string;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <div className="space-y-2 digital-field">
      <Label>{label}</Label>
      {multiline ? (
        <Textarea rows={rows} placeholder={placeholder} disabled readOnly aria-disabled />
      ) : (
        <Input placeholder={placeholder} disabled readOnly aria-disabled />
      )}
    </div>
  );
}

function LockedSelect({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div className="space-y-2 digital-field">
      <Label>{label}</Label>
      <Select disabled>
        <SelectTrigger aria-disabled>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="locked">{placeholder}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function UbunifuPage() {
  const { t } = useI18n();

  return (
    <div className="page-shell page-shell-form form-page section-y-sm">
      <div className="digital-page-hero">
        <span className="relative z-10 inline-flex items-center gap-2 rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]">
          <Sparkles className="h-3.5 w-3.5" /> {t("inn.soon_badge")}
        </span>
        <h1 className="relative z-10 mt-4 text-3xl font-black md:text-4xl">{t("inn.title")}</h1>
        <p className="relative z-10 mt-2 text-primary-foreground/85">{t("inn.lead")}</p>
      </div>

      <div className="inn-shell mt-8">
        <section className="inn-soon-card">
          <span className="inn-preview-tag">
            <Lock className="h-3.5 w-3.5" /> {t("inn.soon_badge")}
          </span>
          <h2 className="mt-4 text-xl font-bold text-foreground md:text-2xl">
            {t("inn.soon_title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("inn.soon_body")}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button type="button" disabled title={t("inn.soon_badge")}>
              <BellRing className="mr-2 h-4 w-4" />
              {t("inn.soon_cta")}
            </Button>
            <Link
              to="/huduma"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              {t("inn.soon_note")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="inn-locked">
          <div className="inn-lock-veil" aria-hidden>
            <div>
              <Lock className="h-4 w-4" /> {t("inn.soon_badge")}
            </div>
          </div>
          <div className="inn-lockable inn-preview">
            <span className="inn-preview-tag">
              <FileText className="h-3.5 w-3.5" /> {t("inn.preview_tag")}
            </span>

            <fieldset disabled className="mt-5">
              <FormSection
                step={1}
                title={t("inn.step_student")}
                hint={t("inn.step_student_hint")}
                icon={UserRound}
              >
                <div className="form-grid">
                  <LockedField label={t("inn.full_name")} placeholder={t("inn.full_name_ph")} />
                  <LockedField label={t("inn.college")} placeholder={t("inn.college_ph")} />
                  <LockedField label={t("inn.field")} placeholder={t("inn.field_ph")} />
                </div>
              </FormSection>

              <FormSection
                step={2}
                title={t("inn.step_idea")}
                hint={t("inn.step_idea_hint")}
                icon={Lightbulb}
              >
                <div className="space-y-5">
                  <div className="form-grid">
                    <LockedSelect label={t("inn.area")} placeholder={t("inn.area_ph")} />
                    <LockedField label={t("inn.idea_title")} placeholder={t("inn.idea_title_ph")} />
                  </div>
                  <LockedField
                    label={t("inn.problem")}
                    placeholder={t("inn.problem_ph")}
                    multiline
                    rows={4}
                  />
                  <LockedField
                    label={t("inn.script")}
                    placeholder={t("inn.script_ph")}
                    multiline
                    rows={6}
                  />
                  <LockedField
                    label={t("inn.jobs")}
                    placeholder={t("inn.jobs_ph")}
                    multiline
                    rows={4}
                  />
                  <LockedField
                    label={t("inn.resources")}
                    placeholder={t("inn.resources_ph")}
                    multiline
                    rows={3}
                  />
                  <LockedField
                    label={t("inn.support")}
                    placeholder={t("inn.support_ph")}
                    multiline
                    rows={3}
                  />
                  <div className="space-y-2 digital-field">
                    <Label>{t("inn.area")}</Label>
                    <div className="flex flex-wrap gap-2">
                      {AREAS.map((k) => (
                        <span
                          key={k}
                          className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground"
                        >
                          {t(k)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </FormSection>

              <FormSection step={3} title={t("inn.flow_title")} icon={BriefcaseBusiness}>
                <div className="inn-flow">
                  {FLOW.map((f, i) => (
                    <article key={f.title} className="inn-flow-item">
                      <span className="inn-flow-num" aria-hidden>
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <h3 className="inn-flow-title flex items-center gap-2">
                          <f.Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                          {t(f.title)}
                        </h3>
                        <p className="inn-flow-body">{t(f.body)}</p>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="inn-important mt-5">
                  <p className="inn-important-title">
                    <Ban className="h-4 w-4 text-accent-foreground" aria-hidden />
                    {t("inn.important_title")}
                  </p>
                  <p className="inn-important-body">{t("inn.important_body")}</p>
                </div>
              </FormSection>

              <FormSection step={4} title={t("inn.submit")} icon={Rocket}>
                <Button type="button" size="lg" className="form-submit" disabled aria-disabled>
                  <Send className="mr-2 h-5 w-5" />
                  {t("inn.submit")}
                </Button>
                <p className="form-footnote mt-3">
                  <Lock className="h-4 w-4" /> {t("inn.soon_title")}
                </p>
              </FormSection>
            </fieldset>
          </div>
        </section>
      </div>
    </div>
  );
}
