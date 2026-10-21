import { useCallback, useEffect, useState } from "react";

const KEY = "mumso.ministry.slug";
const EVT = "mumso:ministry-changed";

/** Wizara aliyochagua mwanafunzi — huhifadhiwa kivinjari ili aone wizara yake kwanza. */
export function rememberMinistry(slug: string) {
  try {
    sessionStorage.setItem(KEY, slug);
    window.dispatchEvent(new Event(EVT));
  } catch {
    /* Hifadhi inaweza kuwa imezuiwa. */
  }
}

export function useMyMinistry() {
  const [slug, setSlug] = useState<string | null>(null);

  const read = useCallback(() => {
    try {
      setSlug(sessionStorage.getItem(KEY));
    } catch {
      setSlug(null);
    }
  }, []);

  useEffect(() => {
    read();
    window.addEventListener(EVT, read);
    return () => window.removeEventListener(EVT, read);
  }, [read]);

  return slug;
}
