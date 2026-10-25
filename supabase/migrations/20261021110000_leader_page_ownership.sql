-- Umiliki wa ukurasa wa kiongozi.
--
-- Kila kiongozi aliyeidhinishwa huhusishwa na wasifu wake wa umma
-- (`leaders.user_id`) na wizara yake (`leaders.department_id`), ili aone na
-- kuhariri ukurasa wake mwenyewe.
--
-- MUHIMU: migrasheni hii LAZIMA itumike kabla ya
-- `20261021120000_ministry_workspace.sql`, ambayo `is_cabinet()` na
-- `my_position()` hutegemea `leaders.user_id`. Bila safu hiyo migrasheni ile
-- hushindwa na meza zake zote hukosekana.

ALTER TABLE public.leaders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments (id) ON DELETE SET NULL;

-- Akaunti moja = wasifu mmoja. Sehemu ya kipekee huruhusu `user_id` kuwa NULL
-- kwa wasifu wa zamani wasio na mmiliki.
CREATE UNIQUE INDEX IF NOT EXISTS leaders_user_id_key
  ON public.leaders (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leaders_department ON public.leaders (department_id);

-- Kiongozi husoma wasifu wake hata kabla ya kuchapishwa.
DROP POLICY IF EXISTS "Leaders view own page" ON public.leaders;
CREATE POLICY "Leaders view own page"
ON public.leaders FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Kiongozi huhariri wasifu wake mwenyewe.
DROP POLICY IF EXISTS "Leaders update own page" ON public.leaders;
CREATE POLICY "Leaders update own page"
ON public.leaders FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Kiongozi aliyeidhinishwa huunda ukurasa wake mwenyewe, ukiwa umefungwa
-- (`published = false`) hadi menejimenti iuchapishe. Hii huruhusu ukurasa wake
-- kuonekana bila kuhitaji ufunguo wa seva.
-- Wizara huthibitishwa kwa `user_roles` badala ya `my_department_id()`, ambayo
-- hufafanuliwa kwenye migrasheni inayofuata.
DROP POLICY IF EXISTS "Leaders create own page" ON public.leaders;
CREATE POLICY "Leaders create own page"
ON public.leaders FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND published = false
  AND department_id IS NOT NULL
  AND department_id = (
    SELECT r.department_id FROM public.user_roles r
    WHERE r.user_id = auth.uid() AND r.role = 'leader'
    LIMIT 1
  )
);

-- Safu nyeti hubaki kwa menejimenti: kiongozi hawezi kujipa cheo kipya,
-- kubadilisha wizara, au kujichapisha bila idhini.
CREATE OR REPLACE FUNCTION public.leaders_guard_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- `auth.uid()` ni NULL kwa service_role (seva) na anon. Anon hawezi kuandika
  -- `leaders` hata hivyo (hakuna sera), hivyo hii huruhusu seva pekee.
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.department_id IS DISTINCT FROM OLD.department_id
     OR NEW.slug IS DISTINCT FROM OLD.slug
     OR NEW.position IS DISTINCT FROM OLD.position
     OR NEW.published IS DISTINCT FROM OLD.published
     OR NEW.sort_order IS DISTINCT FROM OLD.sort_order THEN
    RAISE EXCEPTION 'Safu hizi zinahifadhiwa na menejimenti.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leaders_guard_columns ON public.leaders;
CREATE TRIGGER leaders_guard_columns
BEFORE UPDATE ON public.leaders
FOR EACH ROW EXECUTE FUNCTION public.leaders_guard_columns();

-- Kiongozi hawezi kujipa cheo anachokitaka: cheo huchukuliwa kutoka ombi lake
-- lililoidhinishwa. Hii hufunga ughushi wa `position` kwenye uundaji wa ukurasa.
-- `SECURITY DEFINER` ni muhimu: RLS ya `leader_applications` huzuia kiongozi
-- kusoma maombi yote, hivyo bila hii utafutaji hurudisha tupu na kiongozi
-- hushindwa kuunda ukurasa wake.
CREATE OR REPLACE FUNCTION public.leaders_force_position()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  approved_position text;
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  SELECT a.position INTO approved_position
  FROM public.leader_applications a
  WHERE a.approved_user_id = NEW.user_id AND a.status = 'approved'
  LIMIT 1;
  IF approved_position IS NULL THEN
    RAISE EXCEPTION 'Hakuna ombi lililoidhinishwa kwa akaunti hii.';
  END IF;
  NEW.position := approved_position;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leaders_force_position ON public.leaders;
CREATE TRIGGER leaders_force_position
BEFORE INSERT ON public.leaders
FOR EACH ROW EXECUTE FUNCTION public.leaders_force_position();

-- Kiongozi husoma ombi lake mwenyewe ili mfumo umpatie ukurasa wake hata kama
-- safu `user_id` haijawekwa (mfano kabla ya uthibitisho kukamilika).
-- SECURITY DEFINER huhakikisha mstari wake pekee hurudishwa.
CREATE OR REPLACE FUNCTION public.my_leader_application()
RETURNS TABLE (
  full_name text,
  "position" text,
  phone text,
  department_id uuid,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.full_name, a.position, a.phone, a.department_id, a.status
  FROM public.leader_applications a
  WHERE a.approved_user_id = auth.uid()
  ORDER BY a.updated_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.my_leader_application() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_leader_application() TO authenticated;

-- Ombi jipya lazima lielekee wizara inayofanya kazi, na lianze kama `pending`.
-- Uthibitisho huu hufanyika hapa, sio kwenye kienyeji (browser) pekee.
CREATE OR REPLACE FUNCTION public.validate_leader_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.departments d WHERE d.id = NEW.department_id AND d.active
  ) THEN
    RAISE EXCEPTION 'Wizara uliyochagua haipatikani.';
  END IF;
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Ombi jipya huanza kama linasubiri idhini.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_leader_application ON public.leader_applications;
CREATE TRIGGER validate_leader_application
BEFORE INSERT ON public.leader_applications
FOR EACH ROW EXECUTE FUNCTION public.validate_leader_application();

-- Kiongozi hupakia picha yake mwenyewe chini ya `leaders/<user_id>/`. Bila hii,
-- RLS ya bucket ya `site-assets` (admin pekee) humzuia kupakia picha.
DROP POLICY IF EXISTS "Leaders upload own photo" ON storage.objects;
CREATE POLICY "Leaders upload own photo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'site-assets'
  AND (storage.foldername(name))[1] = 'leaders'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Leaders update own photo" ON storage.objects;
CREATE POLICY "Leaders update own photo"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'site-assets'
  AND (storage.foldername(name))[1] = 'leaders'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Leaders delete own photo" ON storage.objects;
CREATE POLICY "Leaders delete own photo"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'site-assets'
  AND (storage.foldername(name))[1] = 'leaders'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
