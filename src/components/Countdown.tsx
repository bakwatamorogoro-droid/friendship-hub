import { useEffect, useState } from "react";
import { Clock, CalendarClock } from "lucide-react";
import { useI18n } from "@/lib/i18n";

function diff(target: number) {
  const ms = target - Date.now();
  const clamped = Math.max(0, ms);
  return {
    over: ms <= 0,
    days: Math.floor(clamped / 86400000),
    hours: Math.floor((clamped % 86400000) / 3600000),
    minutes: Math.floor((clamped % 3600000) / 60000),
    seconds: Math.floor((clamped % 60000) / 1000),
  };
}

export function Countdown({
  deadline,
  note,
  className = "",
}: {
  deadline: string | null | undefined;
  note?: string | null;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const target = deadline ? new Date(deadline).getTime() : null;
  const [tick, setTick] = useState(() => (target ? diff(target) : null));

  useEffect(() => {
    if (!target) { setTick(null); return; }
    setTick(diff(target));
    const id = setInterval(() => setTick(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!deadline || !tick) return null;

  const boxes = [
    { v: tick.days, l: t("countdown.days") },
    { v: tick.hours, l: t("countdown.hours") },
    { v: tick.minutes, l: t("countdown.minutes") },
    { v: tick.seconds, l: t("countdown.seconds") },
  ];

  return (
    <div className={`panel-3d rounded-2xl border border-border bg-card p-4 sm:p-5 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
          <Clock className="h-3.5 w-3.5" /> {tick.over ? t("countdown.over") : t("countdown.remaining")}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          {new Date(deadline).toLocaleString(locale, { dateStyle: "long", timeStyle: "short" })}
        </span>
      </div>

      {tick.over ? (
        <p className="mt-3 text-sm font-semibold text-destructive">{t("countdown.closed")}</p>
      ) : (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
          {boxes.map((b) => (
            <div
              key={b.l}
              className="rounded-xl border border-border bg-gradient-to-b from-primary/10 to-background px-2 py-3 text-center shadow-[var(--shadow-card)]"
            >
              <div className="text-xl font-black tabular-nums text-foreground sm:text-3xl">
                {String(b.v).padStart(2, "0")}
              </div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">
                {b.l}
              </div>
            </div>
          ))}
        </div>
      )}

      {note && <p className="mt-3 text-sm text-muted-foreground">{note}</p>}
    </div>
  );
}
