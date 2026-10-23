-- MUMSO: migrasheni 4 ambazo HAZIJATUMIKA kwenye database.
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

-- Cheo huchukuliwa kutoka ombi lililoidhinishwa; kiongozi hawezi kujipa cheo.
CREATE OR REPLACE FUNCTION public.leaders_force_position()
RETURNS trigger
LANGUAGE plpgsql
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
-- 20261021140000_enable_mum_ai.sql
-- ============================================================
-- Washa MUMSO AI. Widget hufanya kazi bila ufunguo wowote (Pollinations).
UPDATE public.service_status SET enabled = true WHERE key = 'ai';

COMMIT;
