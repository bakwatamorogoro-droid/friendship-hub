import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Search, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showStatus } from "@/lib/status";
import { recoverCodes, type RecoveredCode } from "@/lib/tracking.functions";

export const Route = createFileRoute("/fuatilia")({
  head: () => ({
    meta: [
      { title: "Fuatilia Ombi Lako — MUMSO" },
      {
        name: "description",
        content:
          "Fuatilia hatua ya ombi lako la mkopo, changamoto au huduma ya idara MUMSO kwa kutumia namba ya simu au namba ya usajili.",
      },
      { property: "og:title", content: "Fuatilia Ombi Lako — MUMSO" },
      {
        property: "og:description",
        content: "Angalia hatua ya ombi lako, rekebisha taarifa au futa ombi lako MUMSO.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrackPage,
});

function TrackPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const recover = useServerFn(recoverCodes);
  const [showRecover, setShowRecover] = useState(false);
  const [rPhone, setRPhone] = useState("");
  const [rLast, setRLast] = useState("");
  const [rLoading, setRLoading] = useState(false);
  const [found, setFound] = useState<RecoveredCode[] | null>(null);

  const onRecover = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (rLoading) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const phone = ((fd.get("r-phone") as string | null) ?? rPhone).trim();
    const lastName = ((fd.get("r-last") as string | null) ?? rLast).trim();
    if (phone.replace(/\D/g, "").length < 7 || lastName.length < 2) {
      showStatus({
        type: "error",
        title: "Taarifa pungufu",
        message: "Weka namba yako ya simu na jina lako la mwisho kama ulivyojaza kwenye fomu.",
      });
      return;
    }
    setRLoading(true);
    try {
      const res = await recover({ data: { phone, lastName } });
      setFound(res.items);
      if (!res.items.length) {
        showStatus({
          type: "error",
          title: "Hakuna namba",
          message: "Hatukupata ombi lenye namba hii ya simu na jina hili la mwisho.",
        });
      }
    } catch (err: any) {
      showStatus({ type: "error", title: "Hitilafu", message: err?.message ?? "Imeshindikana." });
    } finally {
      setRLoading(false);
    }
  };

  const onSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    const form = e.currentTarget;
    const raw = (new FormData(form).get("track-query") as string | null)?.trim() || query.trim();
    if (raw !== query) setQuery(raw);
    if (raw.length < 3) {
      showStatus({
        type: "error",
        title: "Taarifa pungufu",
        message: "Weka namba ya simu au namba ya usajili uliyotumia kwenye fomu.",
      });
      return;
    }
    setLoading(true);
    await navigate({ to: "/matokeo", search: { q: raw } });
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="digital-page-hero">
        <h1 className="relative z-10 flex items-center gap-3 text-3xl font-bold md:text-4xl">
          <Search className="h-8 w-8" /> Fuatilia Ombi Lako
        </h1>
        <p className="relative z-10 mt-2 text-base text-primary-foreground/85 md:text-lg">
          Weka namba ya simu <span className="font-semibold">au</span> namba ya usajili uliyotumia kwenye fomu.
        </p>
      </div>

      <form onSubmit={onSearch} className="digital-card mt-8 flex flex-col gap-3 p-6 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="track-query">Namba ya simu au namba ya usajili *</Label>
          <Input
            id="track-query"
            name="track-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            required
            minLength={3}
            placeholder="0712 345 678 au MUM/BCS/2024/001"
          />
        </div>
        <Button type="submit" disabled={loading} className="sm:w-40">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
          Tafuta
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Matokeo yatafunguka kwenye ukurasa wake mwenyewe.
      </p>
    </div>
  );
}
