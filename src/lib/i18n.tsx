import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Lang = "sw" | "en";

const dict: Record<string, { sw: string; en: string }> = {
  "nav.home": { sw: "Nyumbani", en: "Home" },
  "nav.about": { sw: "Kuhusu MUMSO", en: "About MUMSO" },
  "nav.services": { sw: "Huduma za Wanafunzi", en: "Student Services" },
  "nav.loans": { sw: "Mikopo", en: "Loans" },
  "nav.deaths": { sw: "Misiba", en: "Obituaries" },
  "nav.news": { sw: "Matangazo", en: "Announcements" },
  "nav.grad": { sw: "Mahafali", en: "Graduation" },
  "nav.login": { sw: "Ingia", en: "Sign in" },
  "nav.leaders": { sw: "Uongozi", en: "Leadership" },
  "nav.dashboard": { sw: "Dashboard", en: "Dashboard" },
  "nav.track": { sw: "Fuatilia Huduma", en: "Track Request" },
  "nav.leader_signup": { sw: "Jisajili Kiongozi", en: "Leader Registration" },



  "home.welcome": { sw: "Karibu MUMSO", en: "Welcome to MUMSO" },
  "home.intro": {
    sw: "Mfumo rasmi wa MUMSO unaokuunganisha na viongozi wako — tuma huduma, fuatilia mikopo, na pata habari kwa wakati.",
    en: "The official MUMSO platform connecting you with your leaders — request services, follow up loans and get timely news.",
  },
  "home.cta_service": { sw: "Tuma Huduma", en: "Request a Service" },
  "home.cta_loan": { sw: "Ripoti Tatizo la Mkopo", en: "Report a Loan Issue" },
  "home.president": { sw: "Rais wa MUMSO", en: "MUMSO President" },
  "home.president_word": { sw: "Neno la Rais", en: "President's Message" },
  "home.services": { sw: "Huduma Kuu", en: "Main Services" },
  "home.services_sub": {
    sw: "Chagua huduma uitakayo. Kila ombi linafikishwa moja kwa moja kwa viongozi.",
    en: "Choose the service you need. Every request goes straight to the leaders.",
  },
  "home.news": { sw: "Habari & Matangazo", en: "News & Announcements" },
  "home.news_sub": { sw: "Taarifa mpya kutoka kwa uongozi wa MUMSO.", en: "Latest updates from the MUMSO leadership." },
  "home.news_all": { sw: "Matangazo yote", en: "All announcements" },
  "home.news_empty": { sw: "Hakuna matangazo kwa sasa.", en: "No announcements yet." },
  "home.links": { sw: "Viungo Muhimu", en: "Useful Links" },
  "home.links_sub": { sw: "Bofya kufungua tovuti rasmi.", en: "Click to open the official website." },
  "home.read": { sw: "Soma zaidi", en: "Read more" },
  "home.leaders_badge": { sw: "Uongozi Wetu", en: "Our Leadership" },
  "home.leaders": { sw: "Kutana na Viongozi Wetu", en: "Meet Our Leaders" },
  "home.leaders_sub": {
    sw: "Viongozi wa MUMSO wanaowatumikia wanafunzi kwa uaminifu na uwazi.",
    en: "The MUMSO leaders serving students with dedication and transparency.",
  },
  "home.leaders_all": { sw: "Ona viongozi wote", en: "View all leaders" },
  "leaders.empty": { sw: "Hakuna viongozi walioongezwa bado.", en: "No leaders published yet." },
  "leaders.not_found": { sw: "Kiongozi huyu hajapatikana.", en: "This leader was not found." },
  "leaders.back": { sw: "Rudi kwa viongozi", en: "Back to leaders" },
  "leaders.bio": { sw: "Wasifu na Neno Lake", en: "Biography & Message" },

};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string };
const LangCtx = createContext<Ctx>({ lang: "sw", setLang: () => {}, t: (k) => dict[k]?.sw ?? k });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("sw");

  useEffect(() => {
    const saved = window.localStorage.getItem("mumso-lang");
    if (saved === "en" || saved === "sw") setLangState(saved);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { window.localStorage.setItem("mumso-lang", l); } catch { /* ignore */ }
  }, []);

  const t = useCallback((k: string) => dict[k]?.[lang] ?? k, [lang]);

  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}

export function useI18n() {
  return useContext(LangCtx);
}
