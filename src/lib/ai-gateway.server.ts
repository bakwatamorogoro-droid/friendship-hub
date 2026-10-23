import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

const GATEWAY_BASE_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

// Pollinations haihitaji ufunguo wowote. Hutumika kama njia ya mwisho ili MUMSO AI
// ifanye kazi hata bila LOVABLE_API_KEY/GEMINI_API_KEY.
const POLLINATIONS_URL = "https://text.pollinations.ai/openai";
const POLLINATIONS_MODEL = "openai";
// Kikomo cha bure: jibu moja kila sekunde 30 kwa IP.
const POLLINATIONS_WAIT_MS = 30_000;

/**
 * Pollinations hutumia modeli inayoona maelekezo ya "unaweza kutafuta Google" na
 * kujaribu kuita tool ya utafutaji, badala ya kujibu -> maudhui matupu.
 * Sisi tunatafuta wenyewe kabla ya hapa, kwa hivyo tunabadilisha maelekezo hayo.
 */
function forPollinations(instructions: string): string {
  return (
    instructions
      .replace(/You HAVE live Google Search[^\n]*/gi, "")
      .replace(/Unaweza kutafuta Google[^\n]*/gi, "")
      .replace(/ALWAYS search the web first[^\n]*/gi, "") +
    "\n\nTAARIFA ZOTE unazohitaji zimepewa hapo juu. Jibu moja kwa moja kwa maandishi " +
    "kwa lugha ya mtumiaji. USITUMIE tool yoyote na USITAJE uwezo wa kutafuta. " +
    "Tumia TAARIFA ZA MUDA HALISI pekee kwa masuala ya sasa; usibuni tarehe, majina " +
    "wala namba. Kama taarifa haipo, sema haipo."
  );
}

/** Modeli hurudisha `\n` kama maandishi; tuyageuze kuwa mistari halisi. */
function normalize(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function askPollinations(instructions: string, messages: ModelMessage[]) {
  const system = forPollinations(instructions);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, POLLINATIONS_WAIT_MS));

    const res = await fetch(POLLINATIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: POLLINATIONS_MODEL,
        private: true,
        messages: [
          { role: "system", content: system },
          ...messages.map((m) => ({
            role: m.role,
            content: typeof m.content === "string" ? m.content : "",
          })),
        ],
      }),
    });

    if (res.ok) {
      const raw = await res.text();
      const json = JSON.parse(raw) as {
        choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
      };
      const text = normalize(json.choices?.[0]?.message?.content ?? "");
      if (text) return text;
      console.error(
        "pollinations empty content",
        res.status,
        json.choices?.[0]?.finish_reason,
        raw.slice(0, 400),
      );
      lastError = new Error("MUMSO AI haikutoa jibu. Tafadhali jaribu tena.");
      continue;
    }

    const detail = await res.text();
    console.error("pollinations error", res.status, detail.slice(0, 200));
    lastError =
      res.status === 402 || res.status === 429
        ? new Error("Maombi mengi sana kwa sasa. Tafadhali subiri sekunde 30 ujaribu tena.")
        : new Error("Huduma ya AI ina msongamano kwa sasa. Tafadhali jaribu tena baadaye.");
    // 4xx nyingine hazitapona kwa kusubiri; 5xx zinaweza.
    if (res.status < 500 && res.status !== 402 && res.status !== 429) break;
  }

  throw lastError ?? new Error("AI haipatikani kwa muda. Tafadhali jaribu tena baadaye.");
}

export async function askLovableAi(apiKey: string, instructions: string, messages: ModelMessage[]) {
  const lovable = createOpenAI({
    baseURL: GATEWAY_BASE_URL,
    apiKey,
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });

  const result = streamText({
    model: lovable.responses(MODEL),
    instructions,
    messages,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  const text = (await result.text).trim();
  if (!text) {
    throw new Error("MUMSO AI haikutoa jibu. Tafadhali jaribu tena.");
  }
  return text;
}
