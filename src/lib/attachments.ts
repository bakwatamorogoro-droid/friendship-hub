import { supabase } from "@/integrations/supabase/client";
import { createStorageUrl } from "@/lib/storage-url";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export type UploadedFile = {
  url: string;
  name: string;
  mimeType: string;
  size: number;
};

const PDF_OR_IMAGE = /^(application\/pdf|image\/)/;

export function isAllowedFile(file: File): boolean {
  return PDF_OR_IMAGE.test(file.type) || /\.(pdf|png|jpe?g|webp)$/i.test(file.name);
}

/**
 * Hupakia faili kwenye bucket ya `site-assets` chini ya folda ya mtumiaji.
 * Hurudisha URL ya muda mrefu inayoweza kuhifadhiwa kwenye rekodi.
 */
export async function uploadAttachment(
  file: File,
  folder: string,
): Promise<{ ok: true; file: UploadedFile } | { ok: false; error: string }> {
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: "Faili ni kubwa mno (kiwango ni 10MB)." };
  }
  if (!isAllowedFile(file)) {
    return { ok: false, error: "Chagua PDF au picha." };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Ingia tena ili kupakia faili." };

  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${folder}/${user.id}/${Date.now()}-${safe}`;
  const up = await supabase.storage.from("site-assets").upload(path, file, { upsert: false });
  if (up.error) return { ok: false, error: up.error.message };

  return {
    ok: true,
    file: {
      url: await createStorageUrl("site-assets", path),
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    },
  };
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
