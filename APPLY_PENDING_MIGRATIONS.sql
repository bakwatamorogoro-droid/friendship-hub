-- MUMSO: migrasheni 5 ambazo HAZIJATUMIKA kwenye database.
-- Project: gmmidfajxztdfpaogqqf
-- Endesha faili hili lote kwenye Supabase SQL Editor.
-- Ni idempotent: ON CONFLICT DO NOTHING / ADD COLUMN IF NOT EXISTS / DROP POLICY IF EXISTS.
--
-- Zilizothibitishwa kuwa ZIMETUMIKA (usizirudie):
--   drizzle/0003 (daily_visitor_events, record_daily_visit, daily_visitor_stats),
--   drizzle/0004 (request_replies, can_manage_request, track_request_replies),
--   drizzle/0005 (students.latitude/longitude), supabase/20260918004943 (track_*).

BEGIN;

-- ============================================================
-- 20261021110000_leader_page_ownership.sql
-- ============================================================
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

-- Kiongozi aliyeidhinishwa huunda ukurasa wake mwenyewe, ukiwa umefungwa
-- (`published = false`) hadi menejimenti iuchapishe. Hii huruhusu ukurasa wake
-- kuonekana bila kuhitaji ufunguo wa seva.
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

-- Kiongozi husoma ombi lake mwenyewe ili mfumo umpatie ukurasa wake hata kama
-- safu `user_id` haijawekwa. SECURITY DEFINER hurudisha mstari wake pekee.
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

-- Cheo huchukuliwa kutoka ombi lililoidhinishwa; kiongozi hawezi kujipa cheo.
-- `SECURITY DEFINER` ni muhimu: RLS ya `leader_applications` huzuia kiongozi
-- kusoma maombi yote, hivyo bila hii utafutaji hurudisha tupu na kiongozi
-- hushindwa kuunda ukurasa wake.
CREATE OR REPLACE FUNCTION public.leaders_force_position()
RETURNS trigger
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
    RAISE EXCEPTION 'Hakuna ombi lililoidhinishwa kwa akaunti hii.' USING ERRCODE = '42501';
  END IF;
  NEW.position := approved_position;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.leaders_force_position() FROM PUBLIC;

DROP TRIGGER IF EXISTS leaders_force_position ON public.leaders;
CREATE TRIGGER leaders_force_position
BEFORE INSERT ON public.leaders
FOR EACH ROW EXECUTE FUNCTION public.leaders_force_position();

-- Ombi jipya lazima lielekee wizara inayofanya kazi, na lianze kama `pending`.
CREATE OR REPLACE FUNCTION public.validate_leader_application()
RETURNS trigger
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

REVOKE ALL ON FUNCTION public.validate_leader_application() FROM PUBLIC;

DROP TRIGGER IF EXISTS validate_leader_application ON public.leader_applications;
CREATE TRIGGER validate_leader_application
BEFORE INSERT ON public.leader_applications
FOR EACH ROW EXECUTE FUNCTION public.validate_leader_application();

-- Picha: kiongozi huhariri/kufuta picha yake mwenyewe.
DROP POLICY IF EXISTS "Leaders update own photo" ON storage.objects;
CREATE POLICY "Leaders update own photo"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'site-assets'
  AND public.has_role(auth.uid(), 'leader')
  AND (storage.foldername(name))[1] = 'leaders'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Leaders delete own photo" ON storage.objects;
CREATE POLICY "Leaders delete own photo"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'site-assets'
  AND public.has_role(auth.uid(), 'leader')
  AND (storage.foldername(name))[1] = 'leaders'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

COMMENT ON COLUMN public.leaders.user_id IS
  'Akaunti ya kiongozi mwenye wasifu huu; humruhusu kuona na kuhariri ukurasa wake mwenyewe.';

-- ============================================================
-- 20261021090000_announcement_newsroom.sql
-- ============================================================
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
DROP POLICY IF EXISTS "Newsroom views announcements" ON public.announcements;
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
DROP POLICY IF EXISTS "Submit announcements" ON public.announcements;
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
DROP POLICY IF EXISTS "Newsroom updates announcements" ON public.announcements;
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
DROP POLICY IF EXISTS "Newsroom deletes announcements" ON public.announcements;
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

-- ============================================================
-- 20261021120000_ministry_workspace.sql
-- ============================================================
-- Paneli ya wizara: ripoti za wiki, mawasiliano ya ndani, na historia ya hatua.
--
-- Sheria kuu:
--  * Kila wizara huwasilisha ripoti ya wiki kwa menejimenti; Rais na Waziri Mkuu
--    (Katibu Mkuu) huona ripoti za wizara zote.
--  * Viongozi huwasiliana kwa mfumo: waziri -> waziri mkuu, na waziri -> wizara
--    ya habari kuhusu matangazo.
--  * Kila mabadiliko ya hatua (status) huhifadhiwa ili mwanafunzi aone hatua
--    zote, na kiongozi aone historia ya ombi la wizara yake.

-- ===== Nyadhifa =====
-- Nyadhifa za kitaifa zinazohusika na ufuatiliaji wa wizara zote.
CREATE OR REPLACE FUNCTION public.is_cabinet(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.leaders l
    WHERE l.user_id = _user_id
      AND l.position IN ('Rais', 'Makamu wa Rais', 'Katibu Mkuu', 'Naibu Katibu Mkuu')
  );
$$;

REVOKE ALL ON FUNCTION public.is_cabinet(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_cabinet(uuid) TO authenticated;

-- Nyadhifa ya mtumiaji aliyeingia (kutoka wasifu wake).
CREATE OR REPLACE FUNCTION public.my_position()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.position FROM public.leaders l
  WHERE l.user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.my_position() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_position() TO authenticated;

-- ===== Historia ya hatua za maombi =====
CREATE TABLE IF NOT EXISTS public.request_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('mikopo', 'changamoto', 'idara', 'misiba')),
  status text NOT NULL,
  note text,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stage_history_request
  ON public.request_stage_history (request_id, created_at DESC);

GRANT SELECT, INSERT ON public.request_stage_history TO authenticated;
GRANT ALL ON public.request_stage_history TO service_role;
ALTER TABLE public.request_stage_history ENABLE ROW LEVEL SECURITY;

-- Wizara husoma historia ya maombi ya wizara yake; menejimenti husoma yote.
DROP POLICY IF EXISTS "Ministry reads own stage history" ON public.request_stage_history;
CREATE POLICY "Ministry reads own stage history"
ON public.request_stage_history FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR actor_id = auth.uid()
  OR public.is_cabinet(auth.uid())
  OR (
    actor_department_id IS NOT NULL
    AND actor_department_id = public.my_department_id()
  )
);

DROP POLICY IF EXISTS "Staff records stage history" ON public.request_stage_history;
CREATE POLICY "Staff records stage history"
ON public.request_stage_history FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'leader')
);

-- ===== Ripoti za wiki za wizara =====
CREATE TABLE IF NOT EXISTS public.ministry_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  week_start date NOT NULL,
  summary text NOT NULL,
  challenges text,
  next_week text,
  requests_handled int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_ministry_report_week
  ON public.ministry_reports (department_id, week_start);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ministry_reports TO authenticated;
GRANT ALL ON public.ministry_reports TO service_role;
ALTER TABLE public.ministry_reports ENABLE ROW LEVEL SECURITY;

-- Wizara husoma ripoti zake; Rais/Waziri Mkuu/menejimenti husoma zote.
DROP POLICY IF EXISTS "Ministry reads reports" ON public.ministry_reports;
CREATE POLICY "Ministry reads reports"
ON public.ministry_reports FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.is_cabinet(auth.uid())
  OR department_id = public.my_department_id()
);

DROP POLICY IF EXISTS "Ministry writes own reports" ON public.ministry_reports;
CREATE POLICY "Ministry writes own reports"
ON public.ministry_reports FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR department_id = public.my_department_id()
);

DROP POLICY IF EXISTS "Ministry updates own reports" ON public.ministry_reports;
CREATE POLICY "Ministry updates own reports"
ON public.ministry_reports FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR department_id = public.my_department_id()
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR department_id = public.my_department_id()
);

-- Wizara haiwezi kubadili wizara ya ripoti yake.
CREATE OR REPLACE FUNCTION public.guard_ministry_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  -- Kiongozi huripoti kwa niaba ya wizara yake pekee.
  NEW.department_id := public.my_department_id();
  NEW.author_id := auth.uid();
  IF NEW.department_id IS NULL THEN
    RAISE EXCEPTION 'Akaunti yako haijaunganishwa na wizara.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_ministry_report ON public.ministry_reports;
CREATE TRIGGER guard_ministry_report
BEFORE INSERT OR UPDATE ON public.ministry_reports
FOR EACH ROW EXECUTE FUNCTION public.guard_ministry_report();

REVOKE ALL ON FUNCTION public.guard_ministry_report() FROM PUBLIC;

-- ===== Mawasiliano ya ndani (viongozi kwa viongozi) =====
CREATE TABLE IF NOT EXISTS public.internal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'direct' CHECK (channel IN ('direct', 'news', 'cabinet')),
  subject text NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_internal_messages_recipient
  ON public.internal_messages (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_internal_messages_news
  ON public.internal_messages (channel, recipient_department_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.internal_messages TO authenticated;
GRANT ALL ON public.internal_messages TO service_role;
ALTER TABLE public.internal_messages ENABLE ROW LEVEL SECURITY;

-- Mtumaji na mpokeaji huona ujumbe; wizara ya habari huona channel ya 'news';
-- Rais/Waziri Mkuu/menejimenti huona channel ya 'cabinet'.
DROP POLICY IF EXISTS "Participants read messages" ON public.internal_messages;
CREATE POLICY "Participants read messages"
ON public.internal_messages FOR SELECT TO authenticated
USING (
  sender_id = auth.uid()
  OR recipient_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR (channel = 'news' AND public.is_news_ministry(auth.uid()))
  OR (
    channel = 'news'
    AND recipient_department_id IS NOT NULL
    AND recipient_department_id = public.my_department_id()
  )
  OR (channel = 'cabinet' AND public.is_cabinet(auth.uid()))
);

DROP POLICY IF EXISTS "Staff send messages" ON public.internal_messages;
CREATE POLICY "Staff send messages"
ON public.internal_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND (public.has_role(auth.uid(), 'leader') OR public.has_role(auth.uid(), 'admin'))
);

-- Mpokeaji pekee anaweza kuweka alama ya kusomwa.
DROP POLICY IF EXISTS "Recipient marks read" ON public.internal_messages;
CREATE POLICY "Recipient marks read"
ON public.internal_messages FOR UPDATE TO authenticated
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

-- Mtumaji na wizara yake huhifadhiwa kutoka akaunti, si kutoka browser.
CREATE OR REPLACE FUNCTION public.guard_internal_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  NEW.sender_id := auth.uid();
  NEW.sender_department_id := public.my_department_id();
  -- Wizara ya habari huhifadhi ujumbe wa matangazo kwenye kikasha chake.
  IF NEW.channel = 'news' THEN
    SELECT d.id INTO NEW.recipient_department_id
    FROM public.departments d WHERE d.slug = 'habari' LIMIT 1;
    NEW.recipient_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_internal_message ON public.internal_messages;
CREATE TRIGGER guard_internal_message
BEFORE INSERT ON public.internal_messages
FOR EACH ROW EXECUTE FUNCTION public.guard_internal_message();

REVOKE ALL ON FUNCTION public.guard_internal_message() FROM PUBLIC;

-- ===== Historia ya hatua: rekodi kila mabadiliko ya status =====
CREATE OR REPLACE FUNCTION public.log_request_stage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  kind_name text;
BEGIN
  kind_name := CASE TG_TABLE_NAME
    WHEN 'loan_requests' THEN 'mikopo'
    WHEN 'challenges' THEN 'changamoto'
    WHEN 'department_submissions' THEN 'idara'
    WHEN 'deaths' THEN 'misiba'
    ELSE NULL
  END;
  IF kind_name IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.request_stage_history (request_id, kind, status, note, actor_id, actor_department_id)
    VALUES (NEW.id, kind_name, COALESCE(NEW.status, 'pending'), NULL, auth.uid(), public.my_department_id());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.request_stage_history (request_id, kind, status, note, actor_id, actor_department_id)
    VALUES (NEW.id, kind_name, NEW.status, NULL, auth.uid(), public.my_department_id());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_loan_stage ON public.loan_requests;
CREATE TRIGGER log_loan_stage
AFTER INSERT OR UPDATE ON public.loan_requests
FOR EACH ROW EXECUTE FUNCTION public.log_request_stage();

DROP TRIGGER IF EXISTS log_challenge_stage ON public.challenges;
CREATE TRIGGER log_challenge_stage
AFTER INSERT OR UPDATE ON public.challenges
FOR EACH ROW EXECUTE FUNCTION public.log_request_stage();

DROP TRIGGER IF EXISTS log_submission_stage ON public.department_submissions;
CREATE TRIGGER log_submission_stage
AFTER INSERT OR UPDATE ON public.department_submissions
FOR EACH ROW EXECUTE FUNCTION public.log_request_stage();

REVOKE ALL ON FUNCTION public.log_request_stage() FROM PUBLIC;

COMMENT ON TABLE public.ministry_reports IS
  'Ripoti ya wiki ya wizara; Rais na Waziri Mkuu huona za wizara zote.';
COMMENT ON TABLE public.internal_messages IS
  'Mawasiliano ya ndani ya viongozi: waziri -> waziri mkuu, na waziri -> wizara ya habari.';
COMMENT ON TABLE public.request_stage_history IS
  'Historia ya hatua za ombi; mwanafunzi na kiongozi huona hatua zote.';

-- ============================================================
-- 20261021160000_leader_stationery_workspace.sql
-- ============================================================
-- Kituo cha kazi cha viongozi: kufuatilia wanafunzi, ujumbe, nyaraka na idhini.
--
-- Sheria kuu:
--  * Kiongozi hufuatilia wanafunzi na maombi yao kwa namba ya usajili.
--  * Viongozi huwasiliana wenyewe kwa wenyewe na Wizara ya Habari.
--  * Nyaraka (PDF/picha) huambatanishwa na ujumbe na huhifadhiwa kwenye historia.
--  * Ombi la mwanafunzi huwasilishwa kwa Wizara ya Habari kwa idhini, na hali
--    yake (submitted/pending/approved/rejected) hubaki wazi kwa wote.
--  * Kila hatua hurekodiwa kwenye request_stage_history; hakuna kinachofutwa.

-- ===== Wizara ya Habari na Mawasiliano =====
-- Kiongozi wa wizara hii ndiye anayechapisha matangazo na kuidhinisha maombi.
INSERT INTO public.departments (name, slug, description, sort_order)
VALUES (
  'Idara ya Habari na Mawasiliano',
  'habari',
  'Uratibu wa matangazo, habari na mawasiliano rasmi ya MUMSO.',
  90
)
ON CONFLICT (slug) DO NOTHING;

-- ===== Nyaraka zinazoambatana na ujumbe =====
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.internal_messages(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message
  ON public.message_attachments (message_id, created_at);

GRANT SELECT, INSERT ON public.message_attachments TO authenticated;
GRANT ALL ON public.message_attachments TO service_role;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

/**
 * Je, mtumiaji aliyeingia anaweza kuona ujumbe huu?
 * Hurudisha true kwa mtumaji, mpokeaji, menejimenti, wizara ya habari na baraza.
 */
CREATE OR REPLACE FUNCTION public.can_read_message(_message_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.internal_messages m
    WHERE m.id = _message_id
      AND (
        m.sender_id = auth.uid()
        OR m.recipient_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR (m.channel = 'news' AND public.is_news_ministry(auth.uid()))
        OR (m.channel = 'news' AND m.recipient_department_id = public.my_department_id())
        OR (m.channel = 'cabinet' AND public.is_cabinet(auth.uid()))
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_read_message(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_message(uuid) TO authenticated;

DROP POLICY IF EXISTS "Participants read attachments" ON public.message_attachments;
CREATE POLICY "Participants read attachments"
ON public.message_attachments FOR SELECT TO authenticated
USING (public.can_read_message(message_id));

DROP POLICY IF EXISTS "Senders attach files" ON public.message_attachments;
CREATE POLICY "Senders attach files"
ON public.message_attachments FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND (public.has_role(auth.uid(), 'leader') OR public.has_role(auth.uid(), 'admin'))
);

-- Mmiliki huhifadhiwa kutoka akaunti, si kutoka browser.
CREATE OR REPLACE FUNCTION public.guard_message_attachment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  NEW.uploaded_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_message_attachment ON public.message_attachments;
CREATE TRIGGER guard_message_attachment
BEFORE INSERT ON public.message_attachments
FOR EACH ROW EXECUTE FUNCTION public.guard_message_attachment();

REVOKE ALL ON FUNCTION public.guard_message_attachment() FROM PUBLIC;

-- ===== Maombi ya idhini (kiongozi -> Wizara ya Habari) =====
CREATE TABLE IF NOT EXISTS public.request_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'mengine'
    CHECK (kind IN ('mikopo', 'changamoto', 'idara', 'misiba', 'mengine')),
  request_id uuid,
  registration_number text,
  student_name text,
  title text NOT NULL,
  summary text,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'pending', 'approved', 'rejected')),
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  target_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_approvals_status
  ON public.request_approvals (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_approvals_submitter
  ON public.request_approvals (submitted_by, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.request_approvals TO authenticated;
GRANT ALL ON public.request_approvals TO service_role;
ALTER TABLE public.request_approvals ENABLE ROW LEVEL SECURITY;

-- Mwombaji, wizara inayohusika, Wizara ya Habari na menejimenti huona ombi.
DROP POLICY IF EXISTS "Parties read approval requests" ON public.request_approvals;
CREATE POLICY "Parties read approval requests"
ON public.request_approvals FOR SELECT TO authenticated
USING (
  submitted_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.is_news_ministry(auth.uid())
  OR public.is_cabinet(auth.uid())
  OR submitted_department_id = public.my_department_id()
  OR target_department_id = public.my_department_id()
);

DROP POLICY IF EXISTS "Leaders submit approval requests" ON public.request_approvals;
CREATE POLICY "Leaders submit approval requests"
ON public.request_approvals FOR INSERT TO authenticated
WITH CHECK (
  submitted_by = auth.uid()
  AND (public.has_role(auth.uid(), 'leader') OR public.has_role(auth.uid(), 'admin'))
);

-- Mwombaji huhariri ombi lake tu; mwisho wa idhini ni wa Wizara ya Habari.
DROP POLICY IF EXISTS "Owners update approval requests" ON public.request_approvals;
CREATE POLICY "Owners update approval requests"
ON public.request_approvals FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.is_news_ministry(auth.uid())
  OR submitted_by = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.is_news_ministry(auth.uid())
  OR submitted_by = auth.uid()
);

-- Mwombaji huhifadhiwa kutoka akaunti, na hali hurudi nyuma kwa idhini pekee.
CREATE OR REPLACE FUNCTION public.guard_request_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.submitted_by := auth.uid();
    NEW.submitted_department_id := public.my_department_id();
    NEW.status := 'submitted';
    NEW.decided_by := NULL;
    NEW.decided_at := NULL;
    RETURN NEW;
  END IF;

  -- Menejimenti na Wizara ya Habari huruhusiwa kuamua.
  IF public.has_role(auth.uid(), 'admin') OR public.is_news_ministry(auth.uid()) THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status IN ('approved', 'rejected') THEN
      NEW.decided_by := auth.uid();
      NEW.decided_at := now();
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  -- Mwombaji hawezi kuidhinisha ombi lake wala kubadili mmiliki.
  NEW.submitted_by := OLD.submitted_by;
  NEW.submitted_department_id := OLD.submitted_department_id;
  NEW.decided_by := OLD.decided_by;
  NEW.decided_at := OLD.decided_at;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('submitted', 'pending') THEN
    RAISE EXCEPTION 'Kuidhinisha ombi ni kazi ya Wizara ya Habari na Mawasiliano.'
      USING ERRCODE = '42501';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_request_approval ON public.request_approvals;
CREATE TRIGGER guard_request_approval
BEFORE INSERT OR UPDATE ON public.request_approvals
FOR EACH ROW EXECUTE FUNCTION public.guard_request_approval();

REVOKE ALL ON FUNCTION public.guard_request_approval() FROM PUBLIC;

-- ===== Hifadhi: nyaraka za ujumbe na maombi =====
-- Kila mtumiaji hupakia chini ya messages/<user_id>/ pekee.
DROP POLICY IF EXISTS "Leaders upload message files" ON storage.objects;
CREATE POLICY "Leaders upload message files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'site-assets'
  AND public.has_role(auth.uid(), 'leader')
  AND (storage.foldername(name))[1] = 'messages'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- ===== Ufuatiliaji wa mwanafunzi kwa kiongozi =====
/**
 * Taarifa za mwanafunzi, maombi yake yote na hatua iliyofikiwa.
 * Hurudisha JSON moja; hupatikana kwa viongozi na menejimenti pekee.
 */
CREATE OR REPLACE FUNCTION public.student_overview(_registration_number text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reg text := upper(trim(_registration_number));
  result jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'leader') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Ufuatiliaji wa wanafunzi ni kazi ya viongozi.'
      USING ERRCODE = '42501';
  END IF;

  IF reg IS NULL OR length(reg) < 3 THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'student', (
      SELECT to_jsonb(s) FROM public.students s
      WHERE upper(s.registration_number) = reg
      LIMIT 1
    ),
    'requests', COALESCE((
      SELECT jsonb_agg(entry ORDER BY entry->>'created_at' DESC)
      FROM (
        SELECT jsonb_build_object(
          'kind', 'idara',
          'id', r.id,
          'title', COALESCE(r.category, 'Huduma ya idara'),
          'status', COALESCE(r.status, 'pending'),
          'description', r.description,
          'created_at', r.created_at,
          'department_id', r.department_id
        ) AS entry
        FROM public.department_submissions r
        WHERE upper(r.registration_number) = reg

        UNION ALL

        SELECT jsonb_build_object(
          'kind', 'mikopo',
          'id', r.id,
          'title', COALESCE(r.problem_type, 'Ombi la mkopo'),
          'status', COALESCE(r.status, 'pending'),
          'description', r.problem_description,
          'created_at', r.created_at,
          'department_id', NULL
        )
        FROM public.loan_requests r
        WHERE upper(r.registration_number) = reg

        UNION ALL

        SELECT jsonb_build_object(
          'kind', 'changamoto',
          'id', r.id,
          'title', COALESCE(r.challenge_type, 'Changamoto'),
          'status', COALESCE(r.status, 'pending'),
          'description', r.description,
          'created_at', r.created_at,
          'department_id', NULL
        )
        FROM public.challenges r
        WHERE upper(r.registration_number) = reg
      ) all_requests
    ), '[]'::jsonb),
    'history', COALESCE((
      SELECT jsonb_agg(to_jsonb(h) ORDER BY h.created_at)
      FROM public.request_stage_history h
      WHERE h.request_id IN (
        SELECT r.id FROM public.department_submissions r
        WHERE upper(r.registration_number) = reg
        UNION ALL
        SELECT r.id FROM public.loan_requests r
        WHERE upper(r.registration_number) = reg
        UNION ALL
        SELECT r.id FROM public.challenges r
        WHERE upper(r.registration_number) = reg
      )
    ), '[]'::jsonb),
    'approvals', COALESCE((
      SELECT jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC)
      FROM public.request_approvals a
      WHERE upper(COALESCE(a.registration_number, '')) = reg
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.student_overview(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_overview(text) TO authenticated;

/**
 * Orodha ya viongozi wengine kwa mawasiliano ya moja kwa moja.
 * Haionyeshi barua pepe wala namba za simu za faragha.
 */
CREATE OR REPLACE FUNCTION public.leader_directory()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  "position" text,
  department_id uuid,
  department_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.user_id, l.full_name, l.position, l.department_id, d.name
  FROM public.leaders l
  LEFT JOIN public.departments d ON d.id = l.department_id
  WHERE l.user_id IS NOT NULL
    AND l.user_id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    AND (public.has_role(auth.uid(), 'leader') OR public.has_role(auth.uid(), 'admin'))
  ORDER BY d.name NULLS LAST, l.full_name;
$$;

REVOKE ALL ON FUNCTION public.leader_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leader_directory() TO authenticated;

-- ===== Historia: rekodi maombi ya idhini pia =====
CREATE OR REPLACE FUNCTION public.log_approval_stage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- request_stage_history huruhusu aina nne pekee; 'mengine' huchukuliwa kama 'idara'.
  history_kind text := CASE WHEN NEW.kind = 'mengine' THEN 'idara' ELSE NEW.kind END;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.request_stage_history
      (request_id, kind, status, note, actor_id, actor_department_id)
    VALUES (NEW.id, history_kind, NEW.status, NEW.title, auth.uid(), public.my_department_id());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.request_stage_history
      (request_id, kind, status, note, actor_id, actor_department_id)
    VALUES (NEW.id, history_kind, NEW.status, COALESCE(NEW.decision_note, NEW.title),
            auth.uid(), public.my_department_id());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_approval_stage ON public.request_approvals;
CREATE TRIGGER log_approval_stage
AFTER INSERT OR UPDATE ON public.request_approvals
FOR EACH ROW EXECUTE FUNCTION public.log_approval_stage();

REVOKE ALL ON FUNCTION public.log_approval_stage() FROM PUBLIC;

COMMENT ON TABLE public.request_approvals IS
  'Ombi la mwanafunzi lililowasilishwa na kiongozi kwa Wizara ya Habari kwa idhini.';
COMMENT ON TABLE public.message_attachments IS
  'Nyaraka (PDF/picha) zinazoambatana na ujumbe wa viongozi.';
COMMENT ON FUNCTION public.student_overview(text) IS
  'Taarifa za mwanafunzi, maombi yake na historia ya hatua kwa viongozi.';

-- ============================================================
-- 20261021140000_enable_mum_ai.sql
-- ============================================================
-- Washa MUMSO AI. Widget hufanya kazi bila ufunguo wowote (Pollinations).
UPDATE public.service_status SET enabled = true WHERE key = 'ai';

COMMIT;
