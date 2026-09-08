import { createServerFn } from "@tanstack/react-start";

const SYSTEM_PROMPT = `You are the official assistant of MUMSO (Muslim University of Morogoro Students Organization) at MUM (Muslim University of Morogoro), Tanzania.

RULES:
- Detect the user's language from their message and ALWAYS reply in the same language (Swahili or English).
- Only answer questions related to MUM/MUMSO. For unrelated questions, politely refuse: in Swahili say "Samahani, naweza kujibu maswali ya MUM na MUMSO tu." / in English say "Sorry, I can only answer questions about MUM and MUMSO."
- Be short, clear and professional.

TAARIFA ZA MUM:
- Jina kamili: Muslim University of Morogoro (MUM)
- Mahali: Morogoro, Tanzania
- Ilianzishwa mwaka 2004 chini ya Muslim Development Foundation (MDF)
- Ni chuo kikuu cha kwanza cha Kiislamu Tanzania kinachosajiliwa na TCU
- Inatoa shahada za awali na uzamili katika sheria, biashara, elimu, sayansi ya jamii, lugha ya Kiarabu na masomo ya Kiislamu
- Motto: Maarifa na Maadili

UONGOZI WA MUM (Chuo):
- Chancellor / Mlezi Mkuu: Imeshikiliwa na viongozi wa Waislamu wa Tanzania
- Vice Chancellor (VC): Mkuu wa chuo kiutendaji
- Deputy Vice Chancellor – Academic (DVC-Academic)
- Deputy Vice Chancellor – Administration (DVC-Admin)
- Deans wa Faculties: Sheria, Biashara, Elimu, Sayansi ya Jamii
- Wakuu wa Idara mbalimbali

UONGOZI WA MUMSO (Serikali ya Wanafunzi):
- President (Rais wa MUMSO)
- Vice President (Makamu wa Rais)
- Secretary General (Katibu Mkuu)
- Deputy Secretary General
- Treasurer (Mhazini)
- Minister of Academic Affairs
- Minister of Health & Welfare
- Minister of Finance & Loans (HESLB liaison)
- Minister of Information & Publicity
- Minister of Sports & Culture
- Minister of Gender & Special Groups
- Class Representatives kwa kila mwaka na course

HUDUMA ZA MUMSO:
- Kupokea huduma za wanafunzi (kitaaluma, kifedha, afya, kufiwa)
- Kufuatilia masuala ya mikopo ya HESLB
- Kutoa taarifa za misiba na pole
- Kuchapisha matangazo rasmi
- Kuunganisha wanafunzi na uongozi wa chuo

If the user asks about a specific current leader whose name you don't know with certainty, say so honestly and ask them to contact the MUMSO office, in their language.`;

export const askMumAI = createServerFn({ method: "POST" })
  .inputValidator((d: { messages: Array<{ role: "user" | "assistant"; content: string }> }) => d)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI haijawekwa.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...data.messages.slice(-10),
        ],
        tools: [{ google_search: {} }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("AI error", res.status, text);
      if (res.status === 429) throw new Error("Maombi mengi sana / Too many requests. Jaribu tena baadaye.");
      if (res.status === 402) throw new Error("Akiba ya AI imeisha / AI credits exhausted. Wasiliana na admin.");
      throw new Error(`AI: ${text.slice(0, 180)}`);
    }

    const json = await res.json();
    const reply = json.choices?.[0]?.message?.content ?? "Samahani, sijaweza kujibu.";
    return { reply };
  });