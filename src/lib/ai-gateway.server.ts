import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

const GATEWAY_BASE_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

// Pollinations haihitaji ufunguo wowote. Hutumika kama njia ya mwisho ili MUMSO AI
// ifanye kazi hata bila LOVABLE_API_KEY/GEMINI_API_KEY.
const POLLINATIONS_URL = "https://text.pollinations.ai/openai";
// `openai-fast` na `openai` huelekea modeli ile ile (gpt-oss-20b) yenye uwezo wa
// kufikiri. Kufikiri ni chanzo kikubwa cha ucheleweshaji (sekunde 8-30), kwa hivyo
// tunaiweka chini ili jibu litoke haraka. Ubora unabaki sawa kwa maswali ya kawaida.
const POLLINATIONS_MODEL = "openai-fast";
const POLLINATIONS_REASONING = "low";
const POLLINATIONS_TIMEOUT_MS = 20_000;
// Kurasa nyingi hutumia endpoint ile ile; majibu yanayorudiwa huhifadhiwa kwa muda
// mfupi ili swali lile lile lisigonge kikomo cha Pollinations.
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_MAX = 300;

type CacheEntry = { text: string; at: number };
const replyCache = new Map<string, CacheEntry>();
// Maombi yanayofanana yanayotokea kwa wakati mmoja hutumia ombi moja la Pollinations.
const inFlight = new Map<string, Promise<string>>();

function cacheGet(key: string): string | null {
  const hit = replyCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    replyCache.delete(key);
    return null;
  }
  return hit.text;
}

function cacheSet(key: string, text: string) {
  if (replyCache.size >= CACHE_MAX) {
    const oldest = replyCache.keys().next().value;
    if (oldest) replyCache.delete(oldest);
  }
  replyCache.set(key, { text, at: Date.now() });
}

/** Kikomo cha bure cha Pollinations ni jibu 1 kila sekunde 30 kwa IP. */
function isRateLimited(status: number, body: string): boolean {
  return status === 402 || status === 429 || /FREE_LIMIT|rate limit/i.test(body);
}

/**
 * Pollinations hurudisha "Retry after Ns" kwenye kikomo. Kikomo chake halisi ni
 * sekunde 30, lakini kusubiri kwa muda mrefu humfanya mtumiaji asubiri bure;
 * tunasubiri kwa muda mfupi tu kisha tumjulishe ajaribu tena.
 */
function retryAfterMs(body: string): number | null {
  const m = /retry after (\d+)\s*s/i.exec(body);
  if (!m) return null;
  return Math.min(Number(m[1]) * 1000, 2_500);
}

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
  const payload = {
    model: POLLINATIONS_MODEL,
    private: true,
    reasoning_effort: POLLINATIONS_REASONING,
    messages: [
      { role: "system", content: system },
      ...messages.map((m) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : "",
      })),
    ],
  };

  const cacheKey = JSON.stringify([system, payload.messages.slice(-4)]);
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const pending = inFlight.get(cacheKey);
  if (pending) return pending;

  const task = requestPollinations(cacheKey, payload).finally(() => inFlight.delete(cacheKey));
  inFlight.set(cacheKey, task);
  return task;
}

async function requestPollinations(cacheKey: string, payload: object): Promise<string> {
  let lastError: Error | null = null;
  const backoff = [0, 1_500, 3_000, 5_000];

  for (let attempt = 0; attempt < backoff.length; attempt += 1) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, backoff[attempt]));

    let res: Response;
    try {
      res = await fetch(POLLINATIONS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(POLLINATIONS_TIMEOUT_MS),
      });
    } catch (error) {
      // Muda umeisha au mtandao umekatika: jaribu tena haraka.
      lastError = error instanceof Error ? error : new Error("Ombi la AI limeshindikana.");
      continue;
    }

    const raw = await res.text();

    if (res.ok) {
      let json: {
        choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
      };
      try {
        json = JSON.parse(raw);
      } catch {
        lastError = new Error("MUMSO AI haikutoa jibu. Tafadhali jaribu tena.");
        continue;
      }
      const text = normalize(json.choices?.[0]?.message?.content ?? "");
      if (text) {
        cacheSet(cacheKey, text);
        return text;
      }
      console.error(
        "pollinations empty content",
        res.status,
        json.choices?.[0]?.finish_reason,
        raw.slice(0, 400),
      );
      lastError = new Error("MUMSO AI haikutoa jibu. Tafadhali jaribu tena.");
      continue;
    }

    console.error("pollinations error", res.status, raw.slice(0, 200));
    if (isRateLimited(res.status, raw)) {
      // Kikomo ni cha muda mfupi; subiri kwa muda ulioonyeshwa (ukiwa mfupi).
      const wait = retryAfterMs(raw);
      if (wait !== null && attempt < backoff.length - 1) {
        await new Promise((r) => setTimeout(r, wait));
      }
      lastError = new Error(
        "Maombi mengi kwa sekunde hii. Tafadhali jaribu tena baada ya sekunde chache.",
      );
      continue;
    }
    lastError = new Error("Huduma ya AI ina msongamano kwa sasa. Tafadhali jaribu tena baadaye.");
    if (res.status < 500) break;
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
