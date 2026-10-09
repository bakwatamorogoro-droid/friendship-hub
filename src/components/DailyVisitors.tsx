import { useEffect, useState } from "react";
import { Users, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function VisitorTracker() {
  useEffect(() => {
    const record = async () => {
      try {
        let id = localStorage.getItem("mumso.visitor.id");
        if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
          id = crypto.randomUUID();
          localStorage.setItem("mumso.visitor.id", id);
        }
        const { error } = await supabase.rpc("record_daily_visit", { _visitor: id });
        if (!error) window.dispatchEvent(new Event("mumso:visit-recorded"));
      } catch { /* Do not invent visits if storage or connection is unavailable. */ }
    };
    void record();
    const interval = window.setInterval(() => { if (document.visibilityState === "visible") void record(); }, 60000);
    return () => window.clearInterval(interval);
  }, []);
  return null;
}

function AnimatedNumber({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(value); return; }
    let frame = 0;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / 850, 1);
      setShown(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <span className="tabular-nums">{shown.toLocaleString("en-GB")}</span>;
}

export function DailyVisitors() {
  const [rows, setRows] = useState<{ day: string; visitors: number }[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data, error: failure } = await supabase.rpc("daily_visitor_stats");
        if (!active) return;
        setError(Boolean(failure));
        if (!failure) setRows(data ?? []);
      } catch { if (active) setError(true); }
    };
    void load();
    window.addEventListener("mumso:visit-recorded", load);
    const timer = window.setInterval(load, 60000);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("mumso:visit-recorded", load); };
  }, []);
  const today = rows?.at(-1);
  const max = Math.max(1, ...(rows ?? []).map((r) => Number(r.visitors)));
  return (
    <section aria-label="Takwimu za wageni" className="border-y border-border bg-secondary/30 py-10">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 md:grid-cols-[1fr_1.3fr] md:items-center">
        <div>
          <div className="flex items-center gap-2 text-primary"><Users className="h-5 w-5" /><h2 className="text-lg font-bold">Wageni wa Mfumo</h2></div>
          <div className="mt-4 flex items-end gap-4"><p data-testid="daily-visitors" className="min-w-20 text-5xl font-bold text-foreground">{error ? "—" : today ? <AnimatedNumber value={Number(today.visitors)} /> : "…"}</p><p className="pb-1 text-sm text-muted-foreground">Wageni leo<br /><span className="text-xs">Saa za Afrika Mashariki</span></p></div>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground"><Activity className="h-3.5 w-3.5 text-primary" />{error ? "Takwimu hazipatikani kwa sasa" : "Kivinjari kimoja huhesabiwa mara moja kwa siku"}</p>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-semibold text-foreground">Siku 7 zilizopita</h3>
          <div className="grid h-36 grid-cols-7 items-end gap-2 sm:gap-4">
            {(rows ?? []).map((row) => <div key={row.day} className="flex h-full min-w-0 flex-col items-center justify-end gap-2"><span className="text-xs font-semibold tabular-nums text-foreground">{row.visitors}</span><div className="flex h-24 w-full items-end overflow-hidden rounded-t-md bg-primary/5"><svg viewBox="0 0 10 100" preserveAspectRatio="none" className="visitor-bar h-full w-full text-primary" aria-hidden="true"><rect x="0" y={100 - Number(row.visitors) / max * 100} width="10" height={Number(row.visitors) / max * 100} fill="currentColor" /></svg></div><span className="text-[10px] text-muted-foreground">{new Intl.DateTimeFormat("sw-TZ", { weekday: "short", timeZone: "Africa/Dar_es_Salaam" }).format(new Date(`${row.day}T12:00:00Z`))}</span></div>)}
          </div>
        </div>
      </div>
    </section>
  );
}