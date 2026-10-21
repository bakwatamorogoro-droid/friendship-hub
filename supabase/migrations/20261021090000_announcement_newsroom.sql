-- Matangazo: wizara ya Habari na Mawasiliano ndiyo inayochapisha.
--
-- Sheria kuu:
--  * Wizara nyingine hutuma tangazo kwenye mfumo (status 'pending') likiwa na
--    picha au PDF; Wizara ya Habari na Mawasiliano huhariri na kuchapisha.
--  * Kiongozi wa kawaida hawezi kuchapisha wala kubadili wizara ya tangazo.
--  * `published` hubaki sawa na (status = 'published') ili maswali ya umma
--    yanayotumia `.eq('published', true)` yasiendelee kubadilika.

-- Wizara ya Habari na Mawasiliano.
INSERT INTO public.departments (name, slug, description, sort_order)
VALUES (
  'Idara ya Habari na Mawasiliano',
  'habari',
  'Uratibu wa matangazo, habari na mawasiliano rasmi ya MUMSO. Wizara hii ndiyo inachapisha matangazo yote.',
  90
)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS author_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS announcement_date timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS review_note text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

DO $$
BEGIN
  ALTER TABLE public.announcements
    ADD CONSTRAINT announcements_status_check
    CHECK (status IN ('draft', 'pending', 'published', 'rejected'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Safu za zamani zilizopo zilikuwa zimechapishwa.
UPDATE public.announcements
SET status = CASE WHEN published THEN 'published' ELSE 'draft' END
WHERE status IS NULL OR status = 'published';

-- Kutuma huanza kama 'pending'; kuchapisha ni uamuzi wa waziwazi wa wizara ya habari.
ALTER TABLE public.announcements ALTER COLUMN status SET DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_announcements_status_created
  ON public.announcements (status, created_at DESC);

/** Je, mtumiaji ni kiongozi wa Wizara ya Habari na Mawasiliano? */
CREATE OR REPLACE FUNCTION public.is_news_ministry(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.departments d ON d.id = ur.department_id
    WHERE ur.user_id = _user_id
      AND ur.role = 'leader'
      AND d.slug = 'habari'
  );
$$;

REVOKE ALL ON FUNCTION public.is_news_ministry(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_news_ministry(uuid) TO authenticated;

/** Wizara ya kiongozi aliyeingia. */
CREATE OR REPLACE FUNCTION public.my_department_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id
  FROM public.user_roles
  WHERE user_id = auth.uid()
    AND role = 'leader'
    AND department_id IS NOT NULL
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.my_department_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_department_id() TO authenticated;

-- ===== RLS: kuona =====
-- Umma unaona yaliyochapishwa pekee.
DROP POLICY IF EXISTS "Anyone views announcements" ON public.announcements;
CREATE POLICY "Anyone views announcements"
ON public.announcements FOR SELECT
USING (published = true AND status = 'published');

-- Wizara ya Habari, menejimenti, mwandishi na wizara yake wanaona yote.
DROP POLICY IF EXISTS "Admins view all announcements" ON public.announcements;
CREATE POLICY "Newsroom views announcements"
ON public.announcements FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.is_news_ministry(auth.uid())
  OR author_id = auth.uid()
  OR (author_department_id IS NOT NULL AND author_department_id = public.my_department_id())
);

-- ===== RLS: kutuma =====
DROP POLICY IF EXISTS "Admins create announcements" ON public.announcements;
CREATE POLICY "Submit announcements"
ON public.announcements FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.is_news_ministry(auth.uid())
  OR (
    author_id = auth.uid()
    AND author_department_id = public.my_department_id()
    AND author_department_id IS NOT NULL
    AND status IN ('draft', 'pending')
  )
);

-- ===== RLS: kuhariri =====
DROP POLICY IF EXISTS "Admins update announcements" ON public.announcements;
CREATE POLICY "Newsroom updates announcements"
ON public.announcements FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.is_news_ministry(auth.uid()))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_news_ministry(auth.uid()));

DROP POLICY IF EXISTS "Authors update own drafts" ON public.announcements;
CREATE POLICY "Authors update own drafts"
ON public.announcements FOR UPDATE TO authenticated
USING (author_id = auth.uid() AND status IN ('draft', 'pending'))
WITH CHECK (
  author_id = auth.uid()
  AND author_department_id = public.my_department_id()
  AND status IN ('draft', 'pending')
);

-- ===== RLS: kufuta =====
DROP POLICY IF EXISTS "Admins delete announcements" ON public.announcements;
CREATE POLICY "Newsroom deletes announcements"
ON public.announcements FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.is_news_ministry(auth.uid()));

-- ===== Trigger: mipaka ya kiongozi wa kawaida =====
CREATE OR REPLACE FUNCTION public.guard_announcement_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role / migrasheni / console hazina JWT: zina uhuru kamili.
  IF auth.uid() IS NULL THEN
    NEW.published := (NEW.status = 'published');
    RETURN NEW;
  END IF;

  -- Menejimenti na Wizara ya Habari zinaweza kuchapisha na kuhariri vyote.
  IF public.has_role(auth.uid(), 'admin') OR public.is_news_ministry(auth.uid()) THEN
    NEW.published := (NEW.status = 'published');
    RETURN NEW;
  END IF;

  -- Kiongozi wa kawaida: anaweza kutuma tu, si kuchapisha.
  NEW.author_id := auth.uid();
  NEW.author_department_id := public.my_department_id();
  IF NEW.status NOT IN ('draft', 'pending') THEN
    RAISE EXCEPTION 'Kuchapisha matangazo ni kazi ya Wizara ya Habari na Mawasiliano.'
      USING ERRCODE = '42501';
  END IF;
  NEW.published := false;
  NEW.review_note := NULL;
  NEW.reviewed_at := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_announcement_workflow ON public.announcements;
CREATE TRIGGER guard_announcement_workflow
BEFORE INSERT OR UPDATE ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.guard_announcement_workflow();

REVOKE ALL ON FUNCTION public.guard_announcement_workflow() FROM PUBLIC;

-- ===== Hifadhi: picha na PDF za matangazo =====
-- Viongozi hupakia chini ya announcements/<user_id>/ kwenye bucket iliyopo.
DROP POLICY IF EXISTS "Leaders upload announcement assets" ON storage.objects;
CREATE POLICY "Leaders upload announcement assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'site-assets'
  AND public.has_role(auth.uid(), 'leader')
  AND (storage.foldername(name))[1] = 'announcements'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

COMMENT ON COLUMN public.announcements.author_department_id IS
  'Wizara iliyotuma tangazo; Wizara ya Habari na Mawasiliano ndiyo inayochapisha.';
COMMENT ON COLUMN public.announcements.status IS
  'draft | pending | published | rejected. `published` husawazishwa na hii.';
COMMENT ON COLUMN public.announcements.announcement_date IS
  'Tarehe rasmi ya tangazo inayoonyeshwa kwa umma.';
