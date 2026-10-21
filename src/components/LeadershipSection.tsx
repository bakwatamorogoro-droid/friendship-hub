import { Link } from "@tanstack/react-router";
import { ArrowRight, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useResolvedUrl } from "@/lib/storage-url";
import { useLeaders, type Leader } from "@/lib/use-leaders";

function LeaderCard({ leader }: { leader: Leader }) {
  const photo = useResolvedUrl(leader.photo_url);
  const { t } = useI18n();

  return (
    <article className="surface surface-hover group flex flex-col overflow-hidden">
      <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
        {photo ? (
          <img
            src={photo}
            alt={`${leader.full_name} — ${leader.position}`}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary/15 to-accent/20 text-primary">
            <UserRound className="h-16 w-16" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-foreground">
            {leader.position}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-xl font-bold text-foreground transition group-hover:text-primary">
          {leader.full_name}
        </h3>
        {leader.short_message && (
          <p className="mt-3 flex-1 text-base leading-relaxed text-muted-foreground line-clamp-4">
            {leader.short_message}
          </p>
        )}
        <Link to="/viongozi/$slug" params={{ slug: leader.slug }} className="mt-5">
          <Button variant="outline" className="w-full font-semibold">
            {t("home.read")} <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
          </Button>
        </Link>
      </div>
    </article>
  );
}

export function LeadershipSection({ limit = 6 }: { limit?: number }) {
  const { leaders, loading } = useLeaders(limit);
  const { t } = useI18n();

  if (loading || leaders.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <div className="mb-10 text-center">
        <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
          {t("home.leaders_badge")}
        </span>
        <h2 className="mt-4 text-3xl font-bold text-foreground md:text-4xl">{t("home.leaders")}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground md:text-lg">
          {t("home.leaders_sub")}
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {leaders.map((l) => <LeaderCard key={l.id} leader={l} />)}
      </div>
      <div className="mt-10 text-center">
        <Link to="/viongozi">
          <Button size="lg" className="font-semibold">
            {t("home.leaders_all")} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </section>
  );
}

export { LeaderCard };
