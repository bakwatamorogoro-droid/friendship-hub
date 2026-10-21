import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, ExternalLink, Save, Upload, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createStorageUrl, useResolvedUrl } from "@/lib/storage-url";
import { FormSection } from "@/components/FormSection";
import { showStatus } from "@/lib/status";
import { useI18n } from "@/lib/i18n";

const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

type Profile = {
  id: string;
  slug: string;
  full_name: string;
  position: string;
  short_message: string | null;
  bio: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  published: boolean;
};

/**
 * Kiongozi huhariri ukurasa wake mwenyewe. Safu zake pekee huruhusiwa na RLS;
 * `slug`, `published`, `position` na `department_id` zinahifadhiwa na trigger.
 */
export function LeaderProfileEditor({ userId }: { userId: string }) {
  const { t } = useI18n();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState({
    full_name: "",
    phone: "",
    email: "",
    short_message: "",
    bio: "",
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const photo = useResolvedUrl(profile?.photo_url ?? null);

  const load = useCallback(async () => {
    const { data } = await (supabase.from("leaders") as any)
      .select("id,slug,full_name,position,short_message,bio,phone,email,photo_url,published")
      .eq("user_id", userId)
      .maybeSingle();
    const row = (data as Profile) ?? null;
    setProfile(row);
    if (row) {
      setDraft({
        full_name: row.full_name ?? "",
        phone: row.phone ?? "",
        email: row.email ?? "",
        short_message: row.short_message ?? "",
        bio: row.bio ?? "",
      });
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (draft.full_name.trim().length < 4) {
      showStatus("error", t("form.fill_all"));
      return;
    }
    setSaving(true);
    const { error } = await (supabase.from("leaders") as any)
      .update({
        full_name: draft.full_name.trim(),
        phone: draft.phone.trim() || null,
        email: draft.email.trim() || null,
        short_message: draft.short_message.trim() || null,
        bio: draft.bio.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id)
      .eq("user_id", userId);
    setSaving(false);
    if (error) {
      showStatus("error", `${t("mgmt.profile_save_failed")} ${error.message}`);
      return;
    }
    showStatus("success", t("mgmt.profile_saved"));
    void load();
  };

  const uploadPhoto = async (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      showStatus("error", t("mgmt.photo_type"));
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      showStatus("error", t("mgmt.photo_too_big"));
      return;
    }
    setUploading(true);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `leaders/${userId}/${Date.now()}-${safe}`;
    const up = await supabase.storage.from("site-assets").upload(path, file, { upsert: true });
    if (up.error) {
      setUploading(false);
      showStatus("error", `${t("mgmt.photo_failed")} ${up.error.message}`);
      return;
    }
    const url = await createStorageUrl("site-assets", path);
    const { error } = await (supabase.from("leaders") as any)
      .update({ photo_url: url, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    setUploading(false);
    if (error) {
      showStatus("error", `${t("mgmt.photo_failed")} ${error.message}`);
      return;
    }
    showStatus("success", t("mgmt.photo_saved"));
    void load();
  };

  if (loading) {
    return <p className="mt-6 text-sm text-muted-foreground">{t("common.loading")}</p>;
  }

  if (!profile) {
    return (
      <div className="panel-3d mt-6 max-w-2xl rounded-2xl p-6">
        <h2 className="font-bold">{t("mgmt.my_profile")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("mgmt.no_public_profile")}</p>
      </div>
    );
  }

  return (
    <div className="mt-6 max-w-3xl space-y-6">
      <div className="panel-3d rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <BadgeCheck className="h-5 w-5 text-primary" />
              {t("mgmt.edit_profile")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("mgmt.edit_profile_lead")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mgmt-chip">{profile.position}</span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                profile.published
                  ? "bg-primary/10 text-primary"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {profile.published ? t("mgmt.profile_visible") : t("mgmt.profile_hidden")}
            </span>
            {profile.published && (
              <Link to="/viongozi/$slug" params={{ slug: profile.slug }}>
                <Button size="sm" variant="outline">
                  {t("mgmt.open")} <ExternalLink className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
        {!profile.published && (
          <p className="mt-4 rounded-lg border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
            {t("mgmt.profile_public_hint")}
          </p>
        )}
      </div>

      <form onSubmit={save} className="digital-card p-5 sm:p-7">
        <FormSection step={1} title={t("mgmt.my_profile")}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            {photo ? (
              <img
                src={photo}
                alt={profile.full_name}
                className="h-28 w-28 shrink-0 rounded-2xl border border-border object-cover"
              />
            ) : (
              <div className="grid h-28 w-28 shrink-0 place-items-center rounded-2xl bg-secondary text-muted-foreground">
                <UserRound className="h-10 w-10" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <Label>{t("mgmt.profile_photo")}</Label>
              <p className="mt-1 text-xs text-muted-foreground">{t("mgmt.profile_photo_hint")}</p>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED.join(",")}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadPhoto(f);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? t("mgmt.uploading") : t("mgmt.upload_photo")}
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Label>{t("common.name")} *</Label>
            <Input
              value={draft.full_name}
              onChange={(e) => setDraft({ ...draft, full_name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{t("mgmt.short_message")}</Label>
            <Textarea
              rows={2}
              maxLength={280}
              value={draft.short_message}
              onChange={(e) => setDraft({ ...draft, short_message: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("mgmt.bio")}</Label>
            <Textarea
              rows={6}
              value={draft.bio}
              onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
            />
          </div>
        </FormSection>

        <FormSection step={2} title={t("mgmt.contact_details")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("form.phone")}</Label>
              <Input
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                inputMode="tel"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("mgmt.email")}</Label>
              <Input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </div>
          </div>
        </FormSection>

        <FormSection step={3} title={t("mgmt.save_profile")}>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" className="btn-3d" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? t("mgmt.saving") : t("mgmt.save_profile")}
            </Button>
            {profile.published && (
              <Link to="/viongozi/$slug" params={{ slug: profile.slug }}>
                <Button type="button" variant="outline">
                  {t("mgmt.open")} <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </FormSection>
      </form>
    </div>
  );
}
