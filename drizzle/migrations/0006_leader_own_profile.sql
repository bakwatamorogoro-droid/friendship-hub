-- Kila kiongozi aliyeidhinishwa anaunganishwa na wasifu wake wa umma (leaders.user_id)
-- ili aone na kuhariri ukurasa wake mwenyewe. Wizara yake pia huhifadhiwa hapa.
--
-- Sheria za usalama:
--  * Kiongozi anaweza kuona na kuhariri safu yake pekee (user_id = auth.uid()).
--  * Trigger inamzuia kiongozi kubadili slug, published, sort_order, user_id
--    na department_id — hivyo kuchapishwa kunabaki kwa Menejimenti.
--  * Picha za viongozi zinapakiwa kwenye site-assets chini ya leaders/<user_id>/.

ALTER TABLE public.leaders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS leaders_user_id_key
  ON public.leaders (user_id) WHERE user_id IS NOT NULL;

DROP POLICY IF EXISTS "Leaders view own profile" ON public.leaders;
CREATE POLICY "Leaders view own profile"
ON public.leaders FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Leaders update own profile" ON public.leaders;
CREATE POLICY "Leaders update own profile"
ON public.leaders FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.guard_leader_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Bila JWT ya mtumiaji (service_role, migrasheni, console) hakuna kinachozuiwa:
  -- njia za seva (kuidhinisha kiongozi) na ukarabati wa data zinahitaji uhuru huu.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  -- Menejimenti (admin) anaweza kubadili kila kitu.
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Huwezi kubadili mmiliki wa wasifu' USING ERRCODE = '42501';
  END IF;
  NEW.slug := OLD.slug;
  NEW.published := OLD.published;
  NEW.sort_order := OLD.sort_order;
  NEW.user_id := OLD.user_id;
  NEW.department_id := OLD.department_id;
  NEW.position := OLD.position;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_leader_self_update ON public.leaders;
CREATE TRIGGER guard_leader_self_update
BEFORE UPDATE ON public.leaders
FOR EACH ROW EXECUTE FUNCTION public.guard_leader_self_update();

REVOKE ALL ON FUNCTION public.guard_leader_self_update() FROM PUBLIC;

-- Kiongozi anapakia picha yake kwenye site-assets chini ya leaders/<user_id>/.
DROP POLICY IF EXISTS "Leaders upload own photo" ON storage.objects;
CREATE POLICY "Leaders upload own photo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'site-assets'
  AND public.has_role(auth.uid(), 'leader')
  AND (storage.foldername(name))[1] = 'leaders'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

COMMENT ON COLUMN public.leaders.user_id IS
  'Akaunti ya kiongozi mwenye wasifu huu; humruhusu kuona na kuhariri ukurasa wake mwenyewe.';
