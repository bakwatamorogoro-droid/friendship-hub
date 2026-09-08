import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mail, Phone, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useResolvedUrl } from "@/lib/storage-url";
import { useLeader } from "@/lib/use-leaders";

export const Route = createFileRoute("/viongozi/$slug")({
  head: () => ({
    meta: [
      { title: "Wasifu wa Kiongozi — MUMSO" },
      { name: "description", content: "Wasifu kamili wa kiongozi wa MUMSO pamoja na neno lake kwa wanafunzi." },
      { property: "og:title", content: "Wasifu wa Kiongozi — MUMSO" },
      { property: "og:description", content: "Wasifu kamili wa kiongozi wa MUMSO pamoja na neno lake kwa wanafunzi." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LeaderProfilePage,
});

function LeaderProfilePage() {
  const { slug } = Route.useParams();
  const { leader, loading } = useLeader(slug);
  const photo = useResolvedUrl(leader?.photo_url);
  const { t } = useI18n();

  if (loading) {
    return <div className="p-16 text-center text-muted-foreground">Inapakia...</div>;
  }

  if (!leader) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-foreground">{t("leaders.not_found")}</h1>
        <Link to="/viongozi" className="mt-6 inline-block">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />{t("leaders.back")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <section className="bg-gradient-to-br from-primary via-primary to-[oklch(0.32_0.11_155)] py-12 text-primary-foreground">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 md:grid-cols-[260px_1fr] md:items-center">
          <div className="mx-auto md:mx-0">
            {photo ? (
              <img src={photo} alt={`${leader.full_name} — ${leader.position}`}
                className="h-60 w-60 rounded-3xl border-4 border-white/25 object-cover shadow-2xl" />
            ) : (
              <div className="grid h-60 w-60 place-items-center rounded-3xl border-4 border-white/25 bg-white/10">
                <UserRound className="h-20 w-20 opacity-80" />
              </div>
            )}
          </div>
          <div>
            <span className="inline-block rounded-full bg-accent/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-foreground">
              {leader.position}
            </span>
            <h1 className="mt-4 text-3xl font-black leading-tight md:text-5xl">{leader.full_name}</h1>
            {leader.short_message && (
              <blockquote className="mt-5 border-l-4 border-accent pl-4 text-base leading-relaxed text-primary-foreground/95 md:text-lg">
                “{leader.short_message}”
              </blockquote>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              {leader.phone && (
                <a href={`tel:${leader.phone}`} className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/25">
                  <Phone className="h-4 w-4" /> {leader.phone}
                </a>
              )}
              {leader.email && (
                <a href={`mailto:${leader.email}`} className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/25">
                  <Mail className="h-4 w-4" /> {leader.email}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14">
        <h2 className="text-2xl font-bold text-foreground md:text-3xl">{t("leaders.bio")}</h2>
        <div className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-muted-foreground md:text-lg">
          {leader.bio ?? leader.short_message ?? "—"}
        </div>
        <Link to="/viongozi" className="mt-10 inline-block">
          <Button variant="outline" className="font-semibold">
            <ArrowLeft className="mr-2 h-4 w-4" />{t("leaders.back")}
          </Button>
        </Link>
      </section>
    </div>
  );
}
