import { useEffect, useState } from "react";
import { Clock, CalendarClock } from "lucide-react";

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
  const target = deadline ? new Date(deadline).getTime() : null;
  const [t, setT] = useState(() => (target ? diff(target) : null));

  useEffect(() => {
    if (!target) { setT(null); return; }
    setT(diff(target));
    const id = setInterval(() => setT(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!deadline || !t) return null;

  const boxes = [
    { v: t.days, l: "Siku" },
    { v: t.hours, l: "Masaa" },
    { v: t.minutes, l: "Dakika" },
    { v: t.seconds, l: "Sekunde" },
  ];

  return (
    <div className={`panel-3d rounded-2xl border border-border bg-card p-4 sm:p-5 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
          <Clock className="h-3.5 w-3.5" /> {t.over ? "Muda umeisha" : "Muda uliobaki"}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          {new Date(deadline).toLocaleString("sw-TZ", { dateStyle: "long", timeStyle: "short" })}
        </span>
      </div>

      {t.over ? (
        <p className="mt-3 text-sm font-semibold text-destructive">
          Muda wa kutuma maombi kwa huduma hii umefungwa.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
          {boxes.map((b) => (
            <div
              key={b.l}
              className="rounded-xl border border-border bg-gradient-to-b from-primary/10 to-background px-2 py-3 text-center shadow-[var(--shadow-card)]"
            >
              <div className="text-xl sm:text-3xl font-black tabular-nums text-foreground">
                {String(b.v).padStart(2, "0")}
              </div>
              <div className="mt-0.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
