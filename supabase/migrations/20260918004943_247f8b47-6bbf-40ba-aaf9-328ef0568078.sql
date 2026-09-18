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