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
export const escapeLike = (s: string) => s.trim().replace(/[%_\\]/g, "\\$&");

/**
 * Jedwali la `leaders` halina safu za umiliki kwenye types zilizotengenezwa kwa
 * otomatiki, hivyo tunatumia mteja asiye na types kama `ministry.ts` hufanya.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const leaderDb = () => supabase as any;
const db = leaderDb;

type OwnApplication = {
  full_name: string;
  position: string;
  phone: string | null;
  department_id: string | null;
};

/**
 * Huhakikisha kiongozi aliyeingia ana ukurasa wake, bila kuhitaji ufunguo wa
 * seva. Ombi lake lililoidhinishwa humpatia jina, cheo na wizara; RLS huruhusu
 * kuunda ukurasa wake ukiwa umefungwa hadi menejimenti iuchapishe.
 */
export async function ensureOwnLeaderPage(userId: string): Promise<{ slug: string } | null> {
  const { data: mine } = await db()
    .from("leaders")
    .select("slug")
    .eq("user_id", userId)
    .maybeSingle();
  if (mine) return mine as { slug: string };

  const { data: rows } = await db().rpc("my_leader_application");
  const app: OwnApplication | null = Array.isArray(rows) ? rows[0] : null;
  if (!app) return null;

  const base = slugify(app.full_name) || `kiongozi-${Date.now().toString().slice(-6)}`;
  const { data: clash } = await db().from("leaders").select("id").eq("slug", base).maybeSingle();
  const slug = clash ? `${base}-${Date.now().toString().slice(-4)}` : base;

  const { data: created, error } = await db()
    .from("leaders")
    .insert({
      slug,
      full_name: app.full_name,
      position: app.position,
      phone: app.phone,
      published: false,
      user_id: userId,
      department_id: app.department_id,
    })
    .select("slug")
    .maybeSingle();
  if (error || !created) return null;
  return created as { slug: string };
}

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
  try {
    await linkOrCreateLeaderPage(input);
  } catch (err) {
    // Kuidhinisha kiongozi ni jambo la muhimu zaidi kuliko ukurasa wake wa umma;
    // kama hatua hii ikishindikana, menejimenti anaweza kuirudia baadaye.
    console.warn("[leader-profile] ukurasa wa kiongozi haujaundwa", err);
  }
}

async function linkOrCreateLeaderPage(input: {
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
    .select("id")
    .ilike("full_name", escapeLike(input.fullName))
    .limit(1)
    .maybeSingle();

  if (byName) {
    // Wasifu uliopo bila mmiliki — tunaunganisha na akaunti ya kiongozi.
    // Safu `user_id` haipo kabla ya migrasheni; kosa hilo halizuii uthibitisho.
    await db
      .from("leaders")
      .update({ user_id: input.userId, department_id: input.departmentId ?? null })
      .eq("id", byName.id)
      .is("user_id", null);
    return;
  }

  const base = slugify(input.fullName) || `kiongozi-${Date.now().toString().slice(-6)}`;
  const { data: clash } = await db.from("leaders").select("id").eq("slug", base).maybeSingle();
  const slug = clash ? `${base}-${Date.now().toString().slice(-4)}` : base;

  const { error } = await db.from("leaders").insert({
    slug,
    full_name: input.fullName,
    position: input.position,
    phone: input.phone ?? null,
    published: true,
    user_id: input.userId,
    department_id: input.departmentId ?? null,
  });
  // Kabla ya migrasheni ya umiliki safu hizo hazipo; wasifu huundwa bila mmiliki
  // na kiongozi hupatana kwa jina kamili hadi migrasheni inatumika.
  if (error?.message?.includes("user_id")) {
    await db.from("leaders").insert({
      slug,
      full_name: input.fullName,
      position: input.position,
      phone: input.phone ?? null,
      published: true,
    });
  }
}
