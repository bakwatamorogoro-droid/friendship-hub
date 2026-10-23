// Utafutaji wa taarifa za muda halisi BILA ufunguo wowote:
// - Google News RSS (habari halisi zenye tarehe na chanzo)
// - Wikipedia (Kiswahili kwanza, kisha Kiingereza)
// Matokeo huingizwa kwenye maelekezo ya AI ili ijibu kwa ukweli wa sasa.

export type LiveHit = { title: string; source: string; date: string; link: string };

const TIME_SENSITIVE =
  /habari|hivi\s?karibuni|sasa hivi|leo|jana|wiki hii|mwaka|20\d{2}|tarehe|muda|deadline|matokeo|bei|nauli|lini|nani|ratiba|tangazo|msimu|news|latest|current|today|yesterday|this (week|month|year)|when|who|price|cost|deadline|result|update|announce/i;

export function looksTimeSensitive(text: string): boolean {
  return TIME_SENSITIVE.test(text);
}

// Maneno ya kawaida yasiyo na maana kwenye utafutaji wa habari.
const STOPWORDS = new Set([
  "habari",
  "hivi",
  "karibuni",
  "sasa",
  "leo",
  "jana",
  "wiki",
  "mwaka",
  "tarehe",
  "muda",
  "matokeo",
  "bei",
  "nauli",
  "lini",
  "nani",
  "ratiba",
  "tangazo",
  "taarifa",
  "kuhusu",
  "kwa",
  "na",
  "ya",
  "wa",
  "za",
  "la",
  "ni",
  "nini",
  "gani",
  "vipi",
  "je",
  "kama",
  "au",
  "hii",
  "hilo",
  "hiyo",
  "huyo",
  "yule",
  "kuna",
  "zipo",
  "ipo",
  "nataka",
  "naomba",
  "nipe",
  "niambie",
  "tafadhali",
  "unaweza",
  "news",
  "latest",
  "current",
  "today",
  "yesterday",
  "about",
  "the",
  "for",
  "and",
  "what",
  "when",
  "who",
  "how",
  "where",
  "this",
  "that",
  "update",
  "please",
  "tell",
  "give",
  "me",
  "is",
  "are",
  "of",
  "in",
  "on",
  "to",
  "my",
  "our",
  "can",
  "you",
  "new",
]);

/**
 * Google News RSS hurudisha feed TUPU kwa maswali marefu (sentensi kamili),
 * lakini hurudisha vitu vingi kwa maneno muhimu. Kwa hivyo tunatoa maneno muhimu.
 */
export function keywords(question: string): string {
  const words = question
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  // Maneno yenye herufi kubwa (HESLB, TCU, MUMSO) ni muhimu zaidi.
  const caps = [...question.matchAll(/\b[A-Z]{2,}\b/g)].map((m) => m[0]);
  const picked = [...new Set([...caps, ...words])].slice(0, 5);
  return picked.join(" ") || question.slice(0, 40);
}

function decode(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(item: string, name: string): string {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`).exec(item);
  return m ? decode(m[1]) : "";
}

/** Habari halisi kutoka Google News RSS. Hakuna ufunguo unaohitajika. */
export async function googleNewsSearch(query: string, limit = 8): Promise<LiveHit[]> {
  const run = async (q: string) => {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=sw&gl=TZ&ceid=TZ:sw`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MUMSO-AI/1.0)" },
      redirect: "follow",
    });
    if (!res.ok) return [] as LiveHit[];
    const xml = await res.text();
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => ({
      title: tag(m[1], "title"),
      source: tag(m[1], "source"),
      date: tag(m[1], "pubDate"),
      link: tag(m[1], "link"),
    }));
  };

  const kw = keywords(query);
  // `when:` huchuja kwa tarehe upande wa Google; maneno muhimu hurudisha vitu.
  const [recent, broad, fallback] = await Promise.all([
    run(`${kw} when:30d`).catch(() => [] as LiveHit[]),
    run(kw).catch(() => [] as LiveHit[]),
    run(query).catch(() => [] as LiveHit[]),
  ]);

  const seen = new Set<string>();
  return [...recent, ...broad, ...fallback]
    .filter((h) => h.title && !seen.has(h.title) && seen.add(h.title))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, limit)
    .map((h) => ({ ...h, date: h.date.slice(0, 16) }));
}

/** Muhtasari wa Wikipedia (Kiswahili kwanza). Hakuna ufunguo unaohitajika. */
export async function wikipediaSearch(query: string, lang: "sw" | "en" = "sw"): Promise<LiveHit[]> {
  const url =
    `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search` +
    `&gsrsearch=${encodeURIComponent(keywords(query))}&gsrlimit=2&prop=extracts&exintro=1` +
    `&explaintext=1&format=json&origin=*`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; MUMSO-AI/1.0)" },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    query?: { pages?: Record<string, { title?: string; extract?: string }> };
  };
  return Object.values(json.query?.pages ?? {})
    .map((p) => ({
      title: p.title ?? "",
      source: `${lang}.wikipedia.org`,
      date: "",
      link: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(p.title ?? "")}`,
    }))
    .filter((h) => h.title);
}

/**
 * Mchanganyiko wa vyanzo: habari za Google + Wikipedia.
 * Hurudisha maandishi tayari kuingizwa kwenye maelekezo ya AI, au "" kama hakuna.
 */
export async function searchLive(query: string): Promise<string> {
  const [news, wiki] = await Promise.all([
    googleNewsSearch(query).catch(() => [] as LiveHit[]),
    wikipediaSearch(query, "sw")
      .then((r) => (r.length ? r : wikipediaSearch(query, "en")))
      .catch(() => [] as LiveHit[]),
  ]);

  const blocks: string[] = [];
  if (news.length) {
    blocks.push(
      "HABARI (Google News, Tanzania):\n" +
        news.map((h) => `- [${h.date}] ${h.title}${h.source ? ` — ${h.source}` : ""}`).join("\n"),
    );
  }
  if (wiki.length) {
    blocks.push("WIKIPEDIA:\n" + wiki.map((h) => `- ${h.title} (${h.link})`).join("\n"));
  }
  return blocks.join("\n\n");
}
