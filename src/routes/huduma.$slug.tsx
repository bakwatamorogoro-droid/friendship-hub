import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
  ArrowLeft,
  Building2,
  FileText,
  Paperclip,
  Send,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { FormSection } from "@/components/FormSection";
import {
  useDepartmentBySlug,
  useDepartmentCategories,
  useFormCategories,
} from "@/lib/use-site-settings";
import { rememberMinistry } from "@/lib/my-ministry";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Countdown } from "@/components/Countdown";
import { useDepartmentDeadline } from "@/lib/use-deadline";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/huduma/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Idara — MUMSO (${params.slug})` },
      {
        name: "description",
        content: "Tuma ombi la huduma moja kwa moja kwa kiongozi wa idara hii ya MUMSO.",
      },
      { property: "og:title", content: "Idara ya MUMSO" },
      {
        property: "og:description",
        content: "Tuma ombi la huduma moja kwa moja kwa kiongozi wa idara.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DepartmentPage,
});

const ALLOWED = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
/** Kikomo cha faili: MB 5. */
const MAX_SIZE = 5 * 1024 * 1024;

const schema = z.object({
  full_name: z.string().trim().min(2).max(120),
  registration_number: z.string().trim().min(2).max(60),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9\s-]{7,20}$/i),
  gender: z.string().min(1),
  course: z.string().trim().min(2).max(120),
  category: z.string().optional().or(z.literal("")),
  description: z.string().trim().max(3000).optional().or(z.literal("")),
});

function DepartmentPage() {
  const { t } = useI18n();
  const identity = useRegisteredStudent();
  const { slug } = Route.useParams();
  const dept = useDepartmentBySlug(slug);
  const deptCats = useDepartmentCategories(dept?.id);
  const legacyCats = useFormCategories(/mkopo|mikopo|fedha|loan/i.test(slug) ? "mikopo" : "huduma");
  const cats = deptCats.length > 0 ? deptCats : legacyCats;
  const dl = useDepartmentDeadline(dept?.id);
  const fileRef = useRef<HTMLInputElement>(null);

  // Kumbuka wizara aliyochagua mwanafunzi ili aione kwanza kila atakapoingia.
  useEffect(() => {
    if (dept?.slug) rememberMinistry(dept.slug);
  }, [dept?.slug]);

  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    registration_number: "",
    phone: "",
    gender: "",
    course: "",
    category: "",
    description: "",
  });

  const genders = [t("form.gender_male"), t("form.gender_female")];

  const pickFile = (f: File | null) => {
    if (!f) {
      setFile(null);
      return;
    }
    if (!ALLOWED.includes(f.type)) {
      showStatus("error", t("form.file_type_error"));
      return;
    }
    if (f.size > MAX_SIZE) {
      showStatus("error", t("form.file_too_big"));
      return;
    }
    setFile(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dept) return;
    if (!identity.student) {
      showStatus("error", t("form.verify_first"));
      return;
    }
    const parsed = schema.safeParse({ ...form, ...identity.student });
    if (!parsed.success) {
      showStatus("error", parsed.error.issues[0]?.message ?? t("form.fill_all"));
      return;
    }
    if (!parsed.data.description && !file) {
      showStatus("error", t("form.description_or_file"));
      return;
    }
    setLoading(true);

    let attachment_url: string | null = null;
    let attachment_name: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${dept.slug}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("submissions").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) {
        setLoading(false);
        showStatus("error", `${t("form.upload_failed")}: ${upErr.message}`);
        return;
      }
      attachment_url = supabase.storage.from("submissions").getPublicUrl(path).data.publicUrl;
      attachment_name = file.name;
    }

    const code = newTrackCode();
    const { error } = await (supabase.from("department_submissions") as any).insert({
      track_code: code,
      department_id: dept.id,
      full_name: parsed.data.full_name,
      registration_number: parsed.data.registration_number,
      phone: parsed.data.phone,
      gender: parsed.data.gender,
      course: parsed.data.course,
      category: parsed.data.category || null,
      description: parsed.data.description || null,
      attachment_url,
      attachment_name,
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
        `Ombi lako limepokelewa na ${dept.name}.`,
        `Your request has been received by ${dept.name}.`,
      ),
    });
    setForm({
      full_name: "",
      registration_number: "",
      phone: "",
      gender: "",
      course: "",
      category: "",
      description: "",
    });
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  if (!dept) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-muted-foreground">{t("dept.loading")}</p>
        <Link to="/huduma" className="mt-4 inline-flex items-center gap-1 text-sm text-primary">
          <ArrowLeft className="h-4 w-4" /> {t("dept.all_depts")}
        </Link>
      </div>
    );
  }

  return (
    <div className="service-form-wrap mx-auto max-w-3xl px-4 py-10">
      <Link
        to="/huduma"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> {t("dept.all_depts")}
      </Link>

      <div className="digital-page-hero">
        <div className="relative z-10 flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15 text-primary-foreground">
            <Building2 className="h-7 w-7" />
          </span>
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">{dept.name}</h1>
            {dept.description && (
              <p className="mt-2 text-primary-foreground/85">{dept.description}</p>
            )}
            {dept.leader_name && (
              <p className="mt-3 text-sm text-primary-foreground/80">
                {t("dept.leader_of")}: <strong>{dept.leader_name}</strong>
                {dept.leader_contact && <span> • {dept.leader_contact}</span>}
              </p>
            )}
          </div>
        </div>
      </div>

      <Countdown deadline={dl?.deadline_at} note={dl?.deadline_note} className="mt-6" />

      <form onSubmit={submit} className="digital-card mt-8">
        <FormSection step={1} title={t("form.step_identity")} hint={t("form.step_identity_hint")}>
          <StudentIdentity identity={identity} />
        </FormSection>

        <FormSection
          step={2}
          title={t("form.step_request")}
          hint={t("dept.only_notice") + " " + dept.name + " " + t("dept.only_notice_end")}
        >
          <div className="form-grid">
            <div className="space-y-2 digital-field">
              <Label>{t("form.gender")} *</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("form.gender")} />
                </SelectTrigger>
                <SelectContent>
                  {genders.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {cats.length > 0 && (
              <div className="space-y-2 digital-field">
                <Label>
                  {t("form.category")} ({t("form.optional")})
                </Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("form.category_placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {cats.map((c) => (
                      <SelectItem key={c.id} value={c.label}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </FormSection>

        <FormSection step={3} title={t("form.step_details")}>
          <div className="space-y-2 digital-field">
            <Label>{t("form.description")}</Label>
            <Textarea
              rows={5}
              maxLength={3000}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t("form.description_placeholder")}
            />
          </div>
        </FormSection>

        <FormSection step={4} title={t("form.step_attachment")}>
          <div className="space-y-2 digital-field">
            <Label className="flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-primary" /> {t("form.attachment")}
            </Label>
            {file ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
                <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{file.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  aria-label={t("form.remove_file")}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/40 px-4 py-6 text-center transition hover:border-primary/50 hover:bg-secondary/70"
              >
                <Upload className="h-6 w-6 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  {t("form.choose_file")}
                </span>
                <span className="text-xs text-muted-foreground">{t("form.attachment_hint")}</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            {file && <p className="text-xs text-muted-foreground">{t("form.attachment_hint")}</p>}
          </div>
        </FormSection>

        <FormSection step={5} title={t("form.step_submit")} hint={t("form.step_submit_hint")}>
          <Button
            type="submit"
            disabled={loading || !identity.student}
            size="lg"
            className="form-submit"
          >
            <Send className="mr-2 h-5 w-5" />
            {loading ? t("common.sending") : `${t("dept.send_to")} ${dept.name}`}
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
