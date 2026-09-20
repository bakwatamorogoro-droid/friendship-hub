import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askMumAI } from "@/lib/mum-ai.functions";
import logoAsset from "@/assets/mumso-ai-logo.jpeg.asset.json";

export function MumAiWidget() {
  const ask = useServerFn(askMumAI);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    { role: "assistant", content: "Karibu! Mimi ni msaidizi wa MUM/MUMSO. Niulize kuhusu historia ya MUM, uongozi, au huduma za MUMSO." },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || loading) return;
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await ask({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch (err: any) {
      toast.error(err?.message ?? "Hitilafu imetokea");
      setMessages(next.slice(0, -1));
      setInput(q);
    } finally {
      setLoading(false);
    }
  };

  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col items-start gap-3">
      {open && (
        <div className="w-[min(92vw,22rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-elegant)]">
          <div className="flex items-center justify-between gap-2 bg-primary px-4 py-3 text-primary-foreground">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <img
                src={logoAsset.url}
                alt="MUMSO"
                className="h-7 w-7 rounded-full bg-primary-foreground object-cover ring-2 ring-primary-foreground/60"
              />
              MUMSO AI
            </span>
            <button onClick={() => setOpen(false)} aria-label="Funga" className="rounded-full p-1 hover:bg-primary-foreground/15">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div ref={scrollRef} className="h-72 overflow-y-auto space-y-3 bg-secondary/30 p-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"
                }`}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Naandika...
                </div>
              </div>
            )}
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-border bg-card p-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Uliza kuhusu MUM/MUMSO..."
              disabled={loading}
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Fungua MUMSO AI"
        className="group flex items-center gap-2 rounded-full bg-primary py-1.5 pl-1.5 pr-4 text-primary-foreground shadow-[var(--shadow-elegant)] ring-4 ring-accent/30 transition-transform hover:scale-105"
      >
        <img src={logoAsset.url} alt="MUMSO AI" className="h-11 w-11 rounded-full bg-primary-foreground object-cover" />
        <span className="text-sm font-bold">MUMSO AI</span>
      </button>
    </div>
  );
}
