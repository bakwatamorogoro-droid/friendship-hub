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
