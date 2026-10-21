import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Mail,
  Phone,
  UserRound,
  Quote,
  Share2,
  Building2,
  BadgeCheck,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useResolvedUrl } from "@/lib/storage-url";
import { useLeader } from "@/lib/use-leaders";
import { useDepartments } from "@/lib/use-site-settings";
import { showStatus } from "@/lib/status";

export const Route = createFileRoute("/viongozi/$slug")({
  head: () => ({
    meta: [
      { title: "Wasifu wa Kiongozi — MUMSO" },
      {
        name: "description",
        content: "Wasifu kamili wa kiongozi wa MUMSO pamoja na neno lake kwa wanafunzi.",
      },
      { property: "og:title", content: "Wasifu wa Kiongozi — MUMSO" },
      {
        property: "og:description",
        content: "Wasifu kamili wa kiongozi wa MUMSO pamoja na neno lake kwa wanafunzi.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LeaderProfilePage,
});

function LeaderProfilePage() {
  const { slug } = Route.useParams();
  const { leader, loading } = useLeader(slug);
  const departments = useDepartments();
  const photo = useResolvedUrl(leader?.photo_url);
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  if (loading) {
    return <div className="p-16 text-center text-muted-foreground">{t("common.loading")}</div>;
  }

  if (!leader) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-foreground">{t("leaders.not_found")}</h1>
        <Link to="/viongozi" className="mt-6 inline-block">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("leaders.back")}
          </Button>
        </Link>
      </div>
    );
  }

  const initials = leader.full_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  const ministry = leader.department_id
    ? departments.find((d) => d.id === leader.department_id)
    : departments.find((d) => d.leader_name === leader.full_name);

  const share = async () => {
    const url = `${window.location.origin}/viongozi/${leader.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${leader.full_name} — ${leader.position}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showStatus("success", t("common.copied"));
    } catch {
      /* mtumiaji ameghairi */
    }
  };

  return (
    <div>
      <section className="leader-profile-hero">
        <div className="page-shell page-shell-narrow relative z-10 grid gap-8 py-14 md:grid-cols-[280px_1fr] md:items-center">
          <div className="mx-auto md:mx-0">
            {photo ? (
              <img
                src={photo}
                alt={`${leader.full_name} — ${leader.position}`}
                className="leader-photo h-64 w-64 md:h-72 md:w-72"
              />
            ) : (
              <div className="leader-photo grid h-64 w-64 place-items-center bg-white/10 md:h-72 md:w-72">
                {initials ? (
                  <span className="text-6xl font-black tracking-wide opacity-90">{initials}</span>
                ) : (
                  <UserRound className="h-24 w-24 opacity-80" />
                )}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-foreground">
              <BadgeCheck className="h-3.5 w-3.5" />
              {leader.position}
            </span>
            <h1 className="mt-4 text-3xl font-black leading-tight md:text-5xl">
              {leader.full_name}
            </h1>
            {leader.short_message && (
              <blockquote className="mt-5 flex gap-3 border-l-4 border-accent pl-4 text-base leading-relaxed text-primary-foreground/95 md:text-lg">
                <Quote className="mt-0.5 h-5 w-5 shrink-0 opacity-70" aria-hidden />
                <span>{leader.short_message}</span>
              </blockquote>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              {leader.phone && (
                <a
                  href={`tel:${leader.phone}`}
                  className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/25"
                >
                  <Phone className="h-4 w-4" /> {leader.phone}
                </a>
              )}
              {leader.email && (
                <a
                  href={`mailto:${leader.email}`}
                  className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/25"
                >
                  <Mail className="h-4 w-4" /> {leader.email}
                </a>
              )}
              <button
                type="button"
                onClick={share}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:brightness-105"
              >
                <Share2 className="h-4 w-4" />{" "}
                {copied ? t("common.copied") : t("leaders.share_profile")}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell page-shell-narrow section-y-sm">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="leader-fact">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <BadgeCheck className="h-3.5 w-3.5" />
              {t("leaders.role_label")}
            </p>
            <p className="mt-1.5 font-semibold text-foreground">{leader.position}</p>
          </div>
          <div className="leader-fact">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              {t("leaders.duty_label")}
            </p>
            {ministry ? (
              <Link
                to="/huduma/$slug"
                params={{ slug: ministry.slug }}
                className="mt-1.5 inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-4"
              >
                {ministry.name} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <p className="mt-1.5 font-semibold text-foreground">{t("leaders.duty_value")}</p>
            )}
          </div>
          <div className="leader-fact">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              {t("leaders.contact_label")}
            </p>
            <p className="mt-1.5 truncate font-semibold text-foreground">
              {leader.phone ?? leader.email ?? "—"}
            </p>
          </div>
        </div>

        <h2 className="mt-12 text-2xl font-bold text-foreground md:text-3xl">{t("leaders.bio")}</h2>
        <div className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-muted-foreground md:text-lg">
          {leader.bio ?? leader.short_message ?? "—"}
        </div>
        <Link to="/viongozi" className="mt-10 inline-block">
          <Button variant="outline" className="font-semibold">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("leaders.back")}
          </Button>
        </Link>
      </section>
    </div>
  );
}
