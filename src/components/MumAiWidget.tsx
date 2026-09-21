import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { askMumAI } from "@/lib/mum-ai.functions";
import mumsoAiLogo from "@/assets/mumso-ai-logo.jpeg";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function MumAiWidget() {
  const ask = useServerFn(askMumAI);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Karibu! Mimi ni msaidizi wa MUM/MUMSO. Niulize kuhusu historia ya MUM, uongozi, au huduma za MUMSO." },
  ]);

  const send = async ({ text }: { text: string }) => {
    const q = text.trim();
    if (!q || loading) return;
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setError(null);
    setLoading(true);
    try {
      const res = await ask({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "AI haipatikani kwa muda. Jaribu tena.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col items-start gap-3">
      {open && (
        <section aria-label="MUMSO AI" className="flex h-[min(78vh,35rem)] w-[min(92vw,23rem)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-elegant)]">
          <div className="flex items-center justify-between gap-2 bg-primary px-4 py-3 text-primary-foreground">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <img
                src={mumsoAiLogo}
                alt="MUMSO"
                className="h-9 w-9 rounded-full bg-primary-foreground object-contain ring-2 ring-primary-foreground/60"
              />
              <span><span className="block font-bold">MUMSO AI</span><span className="block text-xs font-normal text-primary-foreground/75">Msaidizi wa wanafunzi</span></span>
            </span>
            <Button onClick={() => setOpen(false)} aria-label="Funga MUMSO AI" size="icon-sm" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Conversation className="min-h-0 bg-secondary/30">
            <ConversationContent className="gap-4 p-4">
            {messages.map((m, i) => (
              <Message from={m.role} key={`${m.role}-${i}`}>
                <MessageContent className={m.role === "user" ? "bg-primary text-primary-foreground" : undefined}>
                  <MessageResponse>{m.content}</MessageResponse>
                </MessageContent>
              </Message>
            ))}
            {loading && (
              <Message from="assistant"><MessageContent><Shimmer>Inatafuta taarifa...</Shimmer></MessageContent></Message>
            )}
            {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
          <div className="border-t border-border bg-card p-3">
            <PromptInput onSubmit={send} className="bg-background">
              <PromptInputTextarea
              placeholder="Uliza kuhusu MUM/MUMSO..."
              disabled={loading}
              className="min-h-14"
              />
              <PromptInputFooter className="justify-end pb-2 pr-2">
                <PromptInputSubmit status={loading ? "submitted" : "ready"} disabled={loading} />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </section>
      )}
      <Button
        onClick={() => setOpen((v) => !v)}
        aria-label="Fungua MUMSO AI"
        className="h-auto rounded-full py-1.5 pl-1.5 pr-4 shadow-[var(--shadow-elegant)] ring-4 ring-accent/30 transition-transform hover:scale-105"
      >
        <img src={mumsoAiLogo} alt="" className="h-11 w-11 rounded-full bg-primary-foreground object-contain" />
        <span className="text-sm font-bold">MUMSO AI</span>
      </Button>
    </div>
  );
}
