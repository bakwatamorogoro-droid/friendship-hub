import { supabase } from "@/integrations/supabase/client";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

// `%` na `_` ni wildcards za ILIKE; tunaziepusha kabla ya kutafuta kwa jina.
const escapeLike = (s: string) => s.trim().replace(/[%_\\]/g, "\\$&");

/**
 * Huhakikisha kiongozi aliyeidhinishwa ana ukurasa wake wa umma uliounganishwa
 * na akaunti yake (`user_id`), ili aone na kuhariri ukurasa wake mara moja.
 * Menejimenti (admin) ndiye anayeendesha hatua hii; RLS inaruhusu kuandika.
 */
export async function ensureLeaderPage(input: {
  userId: string;
  fullName: string;
  position: string;
  phone?: string | null;
  departmentId?: string | null;
}): Promise<void> {
  const db = supabase as any;
  const { data: linked } = await db
    .from("leaders")
    .select("id")
    .eq("user_id", input.userId)
    .maybeSingle();
  if (linked) return;

  const { data: byName } = await db
    .from("leaders")
    .select("id,user_id")
    .ilike("full_name", escapeLike(input.fullName))
    .limit(1)
    .maybeSingle();

  if (byName) {
    // Wasifu uliopo bila mmiliki — tunaunganisha na akaunti ya kiongozi.
    if (!byName.user_id) {
      await db
        .from("leaders")
        .update({ user_id: input.userId, department_id: input.departmentId ?? null })
        .eq("id", byName.id);
    }
    return;
  }

  const base = slugify(input.fullName) || `kiongozi-${Date.now().toString().slice(-6)}`;
  const { data: clash } = await db.from("leaders").select("id").eq("slug", base).maybeSingle();
  const slug = clash ? `${base}-${Date.now().toString().slice(-4)}` : base;

  await db.from("leaders").insert({
    slug,
    full_name: input.fullName,
    position: input.position,
    phone: input.phone ?? null,
    published: true,
    user_id: input.userId,
    department_id: input.departmentId ?? null,
  });
}
