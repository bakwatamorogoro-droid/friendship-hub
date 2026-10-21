-- MUMSO: migrasheni zote ambazo hazijatumika kwenye database.
-- Endesha faili hili lote kwenye Supabase SQL Editor (project gmmidfajxztdfpaogqqf).
-- Ni salama kurudia (idempotent): IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS.

BEGIN;

-- ============================================================
-- 20260918004943_247f8b47-6bbf-40ba-aaf9-328ef0568078.sql
-- ============================================================
ALTER TABLE public.loan_requests ADD COLUMN IF NOT EXISTS track_code text;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS track_code text;
ALTER TABLE public.department_submissions ADD COLUMN IF NOT EXISTS track_code text;
ALTER TABLE public.deaths ADD COLUMN IF NOT EXISTS track_code text;

CREATE OR REPLACE FUNCTION public.track_set_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  c text;
  taken boolean;
  i int := 0;
BEGIN
  IF NEW.track_code IS NOT NULL AND NEW.track_code ~ '^[0-9]{6}$' THEN
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE track_code = $1)', TG_TABLE_NAME)
      INTO taken USING NEW.track_code;
    IF NOT taken THEN RETURN NEW; END IF;
  END IF;
  LOOP
    i := i + 1;
    c := lpad(((floor(random() * 900000))::int + 100000)::text, 6, '0');
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE track_code = $1)', TG_TABLE_NAME)
      INTO taken USING c;
    EXIT WHEN NOT taken OR i > 50;
  END LOOP;
  NEW.track_code := c;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS set_track_code ON public.loan_requests;
CREATE TRIGGER set_track_code BEFORE INSERT ON public.loan_requests FOR EACH ROW EXECUTE FUNCTION public.track_set_code();
DROP TRIGGER IF EXISTS set_track_code ON public.challenges;
CREATE TRIGGER set_track_code BEFORE INSERT ON public.challenges FOR EACH ROW EXECUTE FUNCTION public.track_set_code();
DROP TRIGGER IF EXISTS set_track_code ON public.department_submissions;
CREATE TRIGGER set_track_code BEFORE INSERT ON public.department_submissions FOR EACH ROW EXECUTE FUNCTION public.track_set_code();
DROP TRIGGER IF EXISTS set_track_code ON public.deaths;
CREATE TRIGGER set_track_code BEFORE INSERT ON public.deaths FOR EACH ROW EXECUTE FUNCTION public.track_set_code();

UPDATE public.loan_requests SET track_code = lpad(((floor(random()*900000))::int + 100000)::text,6,'0') WHERE track_code IS NULL;
UPDATE public.challenges SET track_code = lpad(((floor(random()*900000))::int + 100000)::text,6,'0') WHERE track_code IS NULL;
UPDATE public.department_submissions SET track_code = lpad(((floor(random()*900000))::int + 100000)::text,6,'0') WHERE track_code IS NULL;
UPDATE public.deaths SET track_code = lpad(((floor(random()*900000))::int + 100000)::text,6,'0') WHERE track_code IS NULL;

CREATE INDEX IF NOT EXISTS loan_requests_track_code_idx ON public.loan_requests (track_code);
CREATE INDEX IF NOT EXISTS challenges_track_code_idx ON public.challenges (track_code);
CREATE INDEX IF NOT EXISTS department_submissions_track_code_idx ON public.department_submissions (track_code);
CREATE INDEX IF NOT EXISTS deaths_track_code_idx ON public.deaths (track_code);

CREATE OR REPLACE FUNCTION public.track_code_of(p_query text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE WHEN regexp_replace(coalesce(p_query,''), '[^0-9]', '', 'g') ~ '^[0-9]{6}$'
              THEN regexp_replace(coalesce(p_query,''), '[^0-9]', '', 'g') END
$$;

CREATE OR REPLACE FUNCTION public.track_lookup(p_query text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tail text := public.track_norm_phone(p_query);
  reg  text := public.track_norm_reg(p_query);
  code text := public.track_code_of(p_query);
  usephone boolean;
  usereg boolean;
  usecode boolean;
  res jsonb;
BEGIN
  IF length(coalesce(btrim(p_query), '')) < 3 THEN
    RETURN jsonb_build_object('mikopo','[]'::jsonb,'changamoto','[]'::jsonb,'idara','[]'::jsonb,'misiba','[]'::jsonb);
  END IF;
  usecode := code IS NOT NULL;
  usephone := (NOT usecode) AND length(tail) >= 7;
  usereg := (NOT usecode) AND length(reg) >= 3;

  SELECT jsonb_build_object(
    'mikopo', coalesce((
      SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC) FROM public.loan_requests t
      WHERE (usecode AND t.track_code = code)
         OR (usephone AND public.track_norm_phone(t.phone) = tail)
         OR (usereg AND public.track_norm_reg(t.registration_number) = reg)
    ), '[]'::jsonb),
    'changamoto', coalesce((
      SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC) FROM public.challenges t
      WHERE (usecode AND t.track_code = code)
         OR (usephone AND public.track_norm_phone(t.phone) = tail)
         OR (usereg AND public.track_norm_reg(t.registration_number) = reg)
    ), '[]'::jsonb),
    'idara', coalesce((
      SELECT jsonb_agg(to_jsonb(t) || jsonb_build_object('department_name', d.name) ORDER BY t.created_at DESC)
      FROM public.department_submissions t
      LEFT JOIN public.departments d ON d.id = t.department_id
      WHERE (usecode AND t.track_code = code)
         OR (usephone AND public.track_norm_phone(t.phone) = tail)
         OR (usereg AND public.track_norm_reg(t.registration_number) = reg)
    ), '[]'::jsonb),
    'misiba', coalesce((
      SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC) FROM public.deaths t
      WHERE (usecode AND t.track_code = code)
         OR (usephone AND public.track_norm_phone(t.phone) = tail)
         OR (usereg AND public.track_norm_reg(t.registration_number) = reg)
    ), '[]'::jsonb)
  ) INTO res;

  RETURN res;
END
$$;

CREATE OR REPLACE FUNCTION public.track_recover_code(p_phone text, p_last_name text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tail text := public.track_norm_phone(p_phone);
  ln text := lower(btrim(coalesce(p_last_name,'')));
  res jsonb;
BEGIN
  IF length(tail) < 7 OR length(ln) < 2 THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT coalesce(jsonb_agg(x ORDER BY x->>'created_at' DESC), '[]'::jsonb) INTO res FROM (
    SELECT jsonb_build_object('kind','mikopo','kindLabel','Mikopo (HESLB)','code',t.track_code,'name',t.full_name,'created_at',t.created_at) AS x
    FROM public.loan_requests t
    WHERE public.track_norm_phone(t.phone) = tail AND lower(coalesce(t.full_name,'')) LIKE '%' || ln
    UNION ALL
    SELECT jsonb_build_object('kind','changamoto','kindLabel','Changamoto za Wanafunzi','code',t.track_code,'name',t.full_name,'created_at',t.created_at)
    FROM public.challenges t
    WHERE public.track_norm_phone(t.phone) = tail AND lower(coalesce(t.full_name,'')) LIKE '%' || ln
    UNION ALL
    SELECT jsonb_build_object('kind','idara','kindLabel','Huduma ya Idara','code',t.track_code,'name',t.full_name,'created_at',t.created_at)
    FROM public.department_submissions t
    WHERE public.track_norm_phone(t.phone) = tail AND lower(coalesce(t.full_name,'')) LIKE '%' || ln
    UNION ALL
    SELECT jsonb_build_object('kind','misiba','kindLabel','Taarifa ya Msiba','code',t.track_code,'name',t.student_name,'created_at',t.created_at)
    FROM public.deaths t
    WHERE public.track_norm_phone(t.phone) = tail AND lower(coalesce(t.student_name,'')) LIKE '%' || ln
  ) s;

  RETURN res;
END
$$;

CREATE OR REPLACE FUNCTION public.track_update(p_id uuid, p_kind text, p_query text, p_values jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tbl text := public.track_table_for_kind(p_kind);
  tail text := public.track_norm_phone(p_query);
  reg  text := public.track_norm_reg(p_query);
  code text := public.track_code_of(p_query);
  row_phone text;
  row_reg text;
  row_code text;
  row_status text;
  has_status boolean;
  sets text[] := '{}';
  k text;
  v text;
  okcol boolean;
  n int;
BEGIN
  IF tbl IS NULL THEN RAISE EXCEPTION 'Aina ya ombi si sahihi.'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name=tbl AND column_name='status'
  ) INTO has_status;

  EXECUTE format(
    'SELECT phone, registration_number, track_code, %s FROM public.%I WHERE id = $1',
    CASE WHEN has_status THEN 'status::text' ELSE 'NULL::text' END, tbl)
  INTO row_phone, row_reg, row_code, row_status USING p_id;

  IF row_phone IS NULL AND row_reg IS NULL AND row_code IS NULL THEN
    RAISE EXCEPTION 'Ombi hili halipatikani.';
  END IF;

  IF NOT ((code IS NOT NULL AND row_code = code)
       OR (length(tail) >= 7 AND public.track_norm_phone(row_phone) = tail)
       OR (reg <> '' AND public.track_norm_reg(row_reg) = reg)) THEN
    RAISE EXCEPTION 'Taarifa hizi hazilingani na ombi lako.';
  END IF;

  IF row_status IN ('approved','rejected') THEN
    RAISE EXCEPTION 'Ombi hili haliwezi kubadilishwa tena.';
  END IF;

  FOR k, v IN SELECT key, value FROM jsonb_each_text(p_values) LOOP
    IF k IN ('id','created_at','updated_at','status','admin_note','track_code','user_id','department_id') THEN
      CONTINUE;
    END IF;
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=tbl AND column_name=k
    ) INTO okcol;
    IF okcol THEN
      sets := array_append(sets, format('%I = %L', k, btrim(v)));
    END IF;
  END LOOP;

  IF array_length(sets, 1) IS NULL THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  IF has_status THEN
    sets := array_append(sets, 'status = ''pending''');
    sets := array_append(sets, 'admin_note = NULL');
  END IF;

  EXECUTE format('UPDATE public.%I SET %s WHERE id = $1', tbl, array_to_string(sets, ', ')) USING p_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN jsonb_build_object('ok', n > 0);
END
$$;

CREATE OR REPLACE FUNCTION public.track_delete(p_id uuid, p_kind text, p_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tbl text := public.track_table_for_kind(p_kind);
  tail text := public.track_norm_phone(p_query);
  reg  text := public.track_norm_reg(p_query);
  code text := public.track_code_of(p_query);
  row_phone text;
  row_reg text;
  row_code text;
  row_status text;
  has_status boolean;
  n int;
BEGIN
  IF tbl IS NULL THEN RAISE EXCEPTION 'Aina ya ombi si sahihi.'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name=tbl AND column_name='status'
  ) INTO has_status;

  EXECUTE format(
    'SELECT phone, registration_number, track_code, %s FROM public.%I WHERE id = $1',
    CASE WHEN has_status THEN 'status::text' ELSE 'NULL::text' END, tbl)
  INTO row_phone, row_reg, row_code, row_status USING p_id;

  IF row_phone IS NULL AND row_reg IS NULL AND row_code IS NULL THEN
    RAISE EXCEPTION 'Ombi hili halipatikani.';
  END IF;

  IF NOT ((code IS NOT NULL AND row_code = code)
       OR (length(tail) >= 7 AND public.track_norm_phone(row_phone) = tail)
       OR (reg <> '' AND public.track_norm_reg(row_reg) = reg)) THEN
    RAISE EXCEPTION 'Taarifa hizi hazilingani na ombi lako.';
  END IF;

  IF row_status = 'approved' THEN
    RAISE EXCEPTION 'Ombi lililokamilika haliwezi kufutwa.';
  END IF;

  EXECUTE format('DELETE FROM public.%I WHERE id = $1', tbl) USING p_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN jsonb_build_object('ok', n > 0);
END
$$;

REVOKE ALL ON FUNCTION public.track_lookup(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.track_recover_code(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.track_update(uuid, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.track_delete(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.track_code_of(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_lookup(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.track_recover_code(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.track_update(uuid, text, text, jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.track_delete(uuid, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.track_code_of(text) TO anon, authenticated, service_role;

INSERT INTO public.service_status (key, label, enabled)
VALUES ('ai', 'MUM AI (msaidizi wa mfumo)', true)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 0003_registered_student_forms_daily_visitors.sql
-- ============================================================
CREATE INDEX IF NOT EXISTS students_registration_normalized_idx ON public.students (upper(btrim(registration_number)));
CREATE OR REPLACE FUNCTION public.validate_student_registration() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 NEW.registration_number := upper(btrim(NEW.registration_number));
 IF NEW.registration_number !~ '^[A-Z0-9][A-Z0-9/._ -]{3,59}$' THEN RAISE EXCEPTION 'REG namba si sahihi'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.registration_number, 0));
 IF EXISTS (SELECT 1 FROM public.students WHERE upper(btrim(registration_number)) = NEW.registration_number AND id <> NEW.id) THEN RAISE EXCEPTION 'REG namba hii imeshasajiliwa tayari' USING ERRCODE = '23505'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER validate_student_registration_before_write BEFORE INSERT OR UPDATE OF registration_number ON public.students FOR EACH ROW EXECUTE FUNCTION public.validate_student_registration();
CREATE OR REPLACE FUNCTION public.fill_registered_student_request() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.students%ROWTYPE;
BEGIN
 SELECT * INTO s FROM public.students WHERE upper(btrim(registration_number)) = upper(btrim(NEW.registration_number)) LIMIT 1;
 IF NOT FOUND THEN RAISE EXCEPTION 'REG namba haijasajiliwa. Jisajili kwanza.'; END IF;
 NEW.registration_number := s.registration_number;
 NEW.phone := s.phone;
 IF TG_TABLE_NAME = 'deaths' THEN NEW.student_name := s.full_name;
 ELSE NEW.full_name := s.full_name; NEW.course := s.course;
 END IF;
 IF TG_TABLE_NAME = 'loan_requests' THEN NEW.year_of_study := s.year_of_study; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER registered_student_challenge BEFORE INSERT ON public.challenges FOR EACH ROW EXECUTE FUNCTION public.fill_registered_student_request();
CREATE TRIGGER registered_student_loan BEFORE INSERT ON public.loan_requests FOR EACH ROW EXECUTE FUNCTION public.fill_registered_student_request();
CREATE TRIGGER registered_student_death BEFORE INSERT ON public.deaths FOR EACH ROW EXECUTE FUNCTION public.fill_registered_student_request();
CREATE TRIGGER registered_student_department BEFORE INSERT ON public.department_submissions FOR EACH ROW EXECUTE FUNCTION public.fill_registered_student_request();
REVOKE ALL ON FUNCTION public.validate_student_registration() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fill_registered_student_request() FROM PUBLIC;
CREATE TABLE public.daily_visitor_events (visit_day date NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date, visitor_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (visit_day, visitor_id));
GRANT ALL ON public.daily_visitor_events TO service_role;
ALTER TABLE public.daily_visitor_events ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.record_daily_visit(_visitor uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
 INSERT INTO public.daily_visitor_events (visitor_id) VALUES (_visitor) ON CONFLICT DO NOTHING;
$$;
REVOKE ALL ON FUNCTION public.record_daily_visit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_daily_visit(uuid) TO anon, authenticated;
CREATE OR REPLACE FUNCTION public.daily_visitor_stats() RETURNS TABLE(day date, visitors bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT d::date, count(e.visitor_id) FROM generate_series((now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date - 6, (now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date, interval '1 day') d LEFT JOIN public.daily_visitor_events e ON e.visit_day = d::date GROUP BY d ORDER BY d;
$$;
REVOKE ALL ON FUNCTION public.daily_visitor_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.daily_visitor_stats() TO anon, authenticated;
COMMENT ON TABLE public.daily_visitor_events IS 'Unique browser visitors per EAT calendar day, measured from rollout; no fabricated historical counts or personal student data.';

-- ============================================================
-- 0004_department_scoped_request_replies.sql
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_manage_request(p_kind text,p_id uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ DECLARE dep uuid; BEGIN IF auth.uid() IS NULL THEN RETURN false; END IF; IF public.has_role(auth.uid(),'admin') THEN RETURN CASE p_kind WHEN 'changamoto' THEN EXISTS(SELECT 1 FROM public.challenges WHERE id=p_id) WHEN 'idara' THEN EXISTS(SELECT 1 FROM public.department_submissions WHERE id=p_id) WHEN 'mikopo' THEN EXISTS(SELECT 1 FROM public.loan_requests WHERE id=p_id) WHEN 'misiba' THEN EXISTS(SELECT 1 FROM public.deaths WHERE id=p_id) ELSE false END; END IF; IF p_kind='changamoto' THEN SELECT department_id INTO dep FROM public.challenges WHERE id=p_id; ELSIF p_kind='idara' THEN SELECT department_id INTO dep FROM public.department_submissions WHERE id=p_id; ELSE RETURN false; END IF; RETURN EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='leader' AND department_id=dep AND dep IS NOT NULL); END $$;
REVOKE ALL ON FUNCTION public.can_manage_request(text,uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.can_manage_request(text,uuid) TO authenticated;
ALTER POLICY "Admins view challenges" ON public.challenges USING(public.can_manage_request('changamoto',id));
ALTER POLICY "Admins update challenges" ON public.challenges USING(public.can_manage_request('changamoto',id)) WITH CHECK(public.has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='leader' AND department_id=challenges.department_id));
ALTER POLICY "Admins and leaders view" ON public.department_submissions USING(public.can_manage_request('idara',id));
ALTER POLICY "Admins and leaders update" ON public.department_submissions USING(public.can_manage_request('idara',id)) WITH CHECK(public.has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='leader' AND department_id=department_submissions.department_id));
ALTER POLICY "Admins view loans" ON public.loan_requests USING(public.has_role(auth.uid(),'admin'));
ALTER POLICY "Admins update loans" ON public.loan_requests USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
ALTER POLICY "Anyone can view deaths" ON public.deaths USING(public.has_role(auth.uid(),'admin'));
ALTER POLICY "Admins update deaths" ON public.deaths USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.request_replies(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),request_id uuid NOT NULL,kind text NOT NULL CHECK(kind IN ('changamoto','idara','mikopo','misiba')),author_id uuid NOT NULL DEFAULT auth.uid(),reply_type text NOT NULL DEFAULT 'message' CHECK(reply_type IN ('message','letter','form')),subject text NOT NULL,body text NOT NULL,attachment_path text,attachment_name text,created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT ON public.request_replies TO authenticated; GRANT ALL ON public.request_replies TO service_role;
ALTER TABLE public.request_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Department reply read" ON public.request_replies FOR SELECT TO authenticated USING(public.can_manage_request(kind,request_id));
CREATE POLICY "Department reply send" ON public.request_replies FOR INSERT TO authenticated WITH CHECK(author_id=auth.uid() AND public.can_manage_request(kind,request_id) AND (attachment_path IS NULL OR attachment_path LIKE auth.uid()::text||'/'||kind||'/'||request_id::text||'/%'));
CREATE POLICY "Reply attachment upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='request-replies' AND (storage.foldername(name))[1]=auth.uid()::text AND public.can_manage_request((storage.foldername(name))[2],((storage.foldername(name))[3])::uuid));
CREATE POLICY "Reply attachment read" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='request-replies' AND public.can_manage_request((storage.foldername(name))[2],((storage.foldername(name))[3])::uuid));
CREATE POLICY "Reply attachment cleanup" ON storage.objects FOR DELETE TO authenticated USING(bucket_id='request-replies' AND (storage.foldername(name))[1]=auth.uid()::text AND public.can_manage_request((storage.foldername(name))[2],((storage.foldername(name))[3])::uuid));
CREATE OR REPLACE FUNCTION public.track_request_replies(p_query text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ DECLARE matches jsonb; BEGIN matches:=public.track_lookup(p_query); RETURN COALESCE((SELECT jsonb_agg(to_jsonb(r)-'author_id') FROM public.request_replies r WHERE EXISTS(SELECT 1 FROM jsonb_each(matches) g CROSS JOIN LATERAL jsonb_array_elements(g.value) item WHERE g.key=r.kind AND item->>'id'=r.request_id::text)),'[]'::jsonb); END $$;
REVOKE ALL ON FUNCTION public.track_request_replies(text) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.track_request_replies(text) TO anon,authenticated,service_role;

-- ============================================================
-- 0005_students_gps_geofence.sql
-- ============================================================
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS longitude double precision;

CREATE OR REPLACE FUNCTION public.validate_student_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  campus_lat constant double precision := -6.8278;
  campus_lng constant double precision := 37.6591;
  radius_m constant double precision := 800;
  dist double precision;
BEGIN
  IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
    RAISE EXCEPTION 'GPS haijawashwa au hairuhusiwi. Washa GPS kisha ujaribu tena.';
  END IF;
  dist := 6371000 * 2 * asin(sqrt(
    power(sin(radians(NEW.latitude - campus_lat) / 2), 2) +
    cos(radians(campus_lat)) * cos(radians(NEW.latitude)) *
    power(sin(radians(NEW.longitude - campus_lng) / 2), 2)
  ));
  IF dist > radius_m THEN
    RAISE EXCEPTION 'Uko nje ya eneo la chuo (mita %). Usajili unafanyika ndani ya chuo tu.', round(dist)::int;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_student_location ON public.students;
CREATE TRIGGER check_student_location
BEFORE INSERT ON public.students
FOR EACH ROW EXECUTE FUNCTION public.validate_student_location();

-- ============================================================
-- 0006_leader_own_profile.sql
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

COMMIT;

-- ============================================================
-- BAADA ya hapo juu: weka akaunti yako kama Admin Mkuu
-- ============================================================
-- Badilisha email hapa chini na email uliyotumia kujisajili, kisha endesha
-- mistari hii peke yake (sio ndani ya muamala wa juu).
--
--   INSERT INTO public.user_roles (user_id, role)
--   SELECT id, 'admin'::public.app_role
--   FROM auth.users
--   WHERE email = 'BADILISHA_EMAIL_YAKO_HAPA'
--   ON CONFLICT (user_id, role) DO NOTHING;
--
-- Kisha ingia kwenye /login uone paneli ya Menejimenti.
