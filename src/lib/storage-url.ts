import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

/** Bucket zetu ni private, hivyo tunatumia signed URLs za muda mrefu. */
export async function createStorageUrl(bucket: string, path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, TEN_YEARS);
  if (error || !data?.signedUrl) {
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }
  return data.signedUrl;
}

/** Rekebisha URL za zamani (public URLs) ziwe signed ili picha zionekane. */
export async function resolveStorageUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (url.includes("/object/sign/")) return url;
  const m = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!m) return url;
  const [, bucket, rawPath] = m;
  const path = decodeURIComponent(rawPath.split("?")[0]);
  return await createStorageUrl(bucket, path);
}

export function useResolvedUrl(url: string | null | undefined) {
  const [out, setOut] = useState<string | null>(url ?? null);
  useEffect(() => {
    let alive = true;
    resolveStorageUrl(url).then((u) => { if (alive) setOut(u); });
    return () => { alive = false; };
  }, [url]);
  return out;
}

export function useResolvedUrls(urls: string[]) {
  const [out, setOut] = useState<string[]>(urls);
  const key = urls.join("|");
  useEffect(() => {
    let alive = true;
    Promise.all(urls.map((u) => resolveStorageUrl(u))).then((list) => {
      if (alive) setOut(list.filter(Boolean) as string[]);
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return out;
}
