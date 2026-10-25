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
