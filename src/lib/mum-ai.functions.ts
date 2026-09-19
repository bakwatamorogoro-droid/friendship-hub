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
    const lovableKey = process.env["LOVABLE_API_KEY"];
    // Ufunguo wa Gemini umewekwa moja kwa moja ili AI ifanye kazi kwenye seva yoyote
    // (GitHub/Vercel) bila mipangilio ya ziada. Ukitaka kuubadilisha, weka GEMINI_API_KEY.
    const geminiKey =
      process.env["GEMINI_API_KEY"] || "AQ.Ab8RN6IzdIlNndg_TnDQr-NWhVKWIRjyc8c-kLmCAFPToDoLKg";
    if (!lovableKey && !geminiKey)
      throw new Error("AI haipatikani: ufunguo wa AI haujawekwa kwenye seva (LOVABLE_API_KEY au GEMINI_API_KEY).");
    // Kwenye Lovable: gateway ya Lovable. Kwenye seva nyingine (GitHub/self-host): Gemini moja kwa moja.
    const aiUrl = lovableKey
      ? "https://ai.gateway.lovable.dev/v1/chat/completions"
      : "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    const aiModel = lovableKey ? "google/gemini-3.8-flash" : "gemini-3.6-flash";
    const apiKey = lovableKey ?? geminiKey!;

    // Maarifa ya mfumo (jedwali la ai_knowledge + huduma, idara, viongozi, matangazo)
    let knowledge = "";
    try {
      const { createClient } = await import("@supabase/supabase-js");
      // Ufunguo wa umma pekee (kama sehemu ya kufuatilia) — hakuna ufunguo wa siri wa seva.
      const key = (process.env["SUPABASE_PUBLISHABLE_KEY"] ||
        process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
        process.env["SUPABASE_ANON_KEY"] ||
        import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]) as string;
      const url = (process.env["SUPABASE_URL"] ||
        process.env["VITE_SUPABASE_URL"] ||
        import.meta.env["VITE_SUPABASE_URL"]) as string;
      const sb = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: (input: any, init: any) => {
            const h = new Headers(init?.headers);
            if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
            h.set("apikey", key);
            return fetch(input, { ...init, headers: h });
          },
        },
      });
      const [kn, deps, leaders, anns, svcs] = await Promise.all([
        (sb.from("ai_knowledge") as any).select("title,content,kind").eq("published", true).limit(80),
        (sb.from("departments") as any).select("name,slug,description,leader_name,leader_contact,deadline_at").eq("active", true).limit(60),
        (sb.from("leaders") as any).select("full_name,position,short_message,phone,email").eq("published", true).limit(60),
        (sb.from("announcements") as any).select("title,excerpt,content,created_at").eq("published", true).order("created_at", { ascending: false }).limit(15),
        (sb.from("service_status") as any).select("key,label,enabled,deadline_at,deadline_note").limit(30),
      ]);
      const parts: string[] = [];
      if (kn.data?.length) parts.push("MAARIFA YA MUMSO:\n" + kn.data.map((r: any) => `- [${r.kind}] ${r.title}: ${r.content}`).join("\n"));
      if (deps.data?.length) parts.push("IDARA / HUDUMA ZILIZOPO:\n" + deps.data.map((r: any) => `- ${r.name} (/huduma/${r.slug}): ${r.description ?? ""} | Kiongozi: ${r.leader_name ?? "-"} ${r.leader_contact ?? ""} | Mwisho: ${r.deadline_at ?? "hakuna"}`).join("\n"));
      if (svcs.data?.length) parts.push("HALI YA HUDUMA:\n" + svcs.data.map((r: any) => `- ${r.label} (${r.key}): ${r.enabled ? "inafanya kazi" : "imefungwa"} | Mwisho: ${r.deadline_at ?? "hakuna"} ${r.deadline_note ?? ""}`).join("\n"));
      if (leaders.data?.length) parts.push("VIONGOZI WA MUMSO (wa sasa):\n" + leaders.data.map((r: any) => `- ${r.position}: ${r.full_name} ${r.phone ?? ""} ${r.email ?? ""} ${r.short_message ?? ""}`).join("\n"));
      if (anns.data?.length) parts.push("MATANGAZO YA HIVI KARIBUNI:\n" + anns.data.map((r: any) => `- (${String(r.created_at).slice(0, 10)}) ${r.title}: ${r.excerpt ?? String(r.content ?? "").slice(0, 300)}`).join("\n"));
      knowledge = parts.join("\n\n");
    } catch (e) {
      console.error("knowledge load failed", e);
    }

    const res = await fetch(aiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: knowledge ? `${SYSTEM_PROMPT}\n\n=== TAARIFA HALISI KUTOKA MFUMO WA MUMSO (tumia hizi kwanza) ===\n${knowledge}` : SYSTEM_PROMPT },
          ...data.messages.slice(-10),
        ],
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