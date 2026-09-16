
CREATE OR REPLACE FUNCTION public.track_norm_phone(v text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT right(regexp_replace(coalesce(v,''), '[^0-9]', '', 'g'), 9)
$$;

CREATE OR REPLACE FUNCTION public.track_norm_reg(v text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT lower(regexp_replace(coalesce(v,''), '[^a-zA-Z0-9]', '', 'g'))
$$;

CREATE OR REPLACE FUNCTION public.track_lookup(p_query text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tail text := public.track_norm_phone(p_query);
  reg  text := public.track_norm_reg(p_query);
  byphone boolean;
  res jsonb;
BEGIN
  IF length(coalesce(btrim(p_query), '')) < 3 THEN
    RETURN jsonb_build_object('mikopo','[]'::jsonb,'changamoto','[]'::jsonb,'idara','[]'::jsonb,'misiba','[]'::jsonb);
  END IF;
  byphone := length(tail) >= 7;

  SELECT jsonb_build_object(
    'mikopo', coalesce((
      SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC) FROM public.loan_requests t
      WHERE (byphone AND public.track_norm_phone(t.phone) = tail)
         OR ((NOT byphone) AND public.track_norm_reg(t.registration_number) = reg)
    ), '[]'::jsonb),
    'changamoto', coalesce((
      SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC) FROM public.challenges t
      WHERE (byphone AND public.track_norm_phone(t.phone) = tail)
         OR ((NOT byphone) AND public.track_norm_reg(t.registration_number) = reg)
    ), '[]'::jsonb),
    'idara', coalesce((
      SELECT jsonb_agg(to_jsonb(t) || jsonb_build_object('department_name', d.name) ORDER BY t.created_at DESC)
      FROM public.department_submissions t
      LEFT JOIN public.departments d ON d.id = t.department_id
      WHERE (byphone AND public.track_norm_phone(t.phone) = tail)
         OR ((NOT byphone) AND public.track_norm_reg(t.registration_number) = reg)
    ), '[]'::jsonb),
    'misiba', coalesce((
      SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC) FROM public.deaths t
      WHERE (byphone AND public.track_norm_phone(t.phone) = tail)
         OR ((NOT byphone) AND public.track_norm_reg(t.registration_number) = reg)
    ), '[]'::jsonb)
  ) INTO res;

  RETURN res;
END
$$;

CREATE OR REPLACE FUNCTION public.track_table_for_kind(p_kind text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE p_kind
    WHEN 'mikopo' THEN 'loan_requests'
    WHEN 'changamoto' THEN 'challenges'
    WHEN 'idara' THEN 'department_submissions'
    WHEN 'misiba' THEN 'deaths'
  END
$$;

CREATE OR REPLACE FUNCTION public.track_update(p_id uuid, p_kind text, p_query text, p_values jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tbl text := public.track_table_for_kind(p_kind);
  tail text := public.track_norm_phone(p_query);
  reg  text := public.track_norm_reg(p_query);
  row_phone text;
  row_reg text;
  row_status text;
  has_status boolean;
  allowed text[] := ARRAY['full_name','form_four_index','registration_number','course','year_of_study','gender','phone','email','problem_type','problem_description','challenge_type','category','description','deceased_name','relationship','student_name','death_date','location'];
  sets text[] := ARRAY[]::text[];
  k text;
  v text;
  n int;
BEGIN
  IF tbl IS NULL THEN RAISE EXCEPTION 'Aina ya ombi si sahihi.'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name=tbl AND column_name='status'
  ) INTO has_status;

  EXECUTE format(
    'SELECT phone, registration_number, %s FROM public.%I WHERE id = $1',
    CASE WHEN has_status THEN 'status::text' ELSE 'NULL::text' END, tbl)
  INTO row_phone, row_reg, row_status USING p_id;

  IF row_phone IS NULL AND row_reg IS NULL THEN
    RAISE EXCEPTION 'Ombi hili halipatikani.';
  END IF;

  IF NOT ((length(tail) >= 7 AND public.track_norm_phone(row_phone) = tail)
       OR (reg <> '' AND public.track_norm_reg(row_reg) = reg)) THEN
    RAISE EXCEPTION 'Taarifa hizi hazilingani na ombi lako.';
  END IF;

  IF row_status IN ('approved','rejected') THEN
    RAISE EXCEPTION 'Ombi hili limekamilika, haliwezi kubadilishwa.';
  END IF;

  FOR k, v IN SELECT key, value FROM jsonb_each_text(p_values) LOOP
    IF k = ANY(allowed) AND btrim(coalesce(v,'')) <> '' AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=tbl AND column_name=k
    ) THEN
      sets := sets || format('%I = %L', k, btrim(v));
    END IF;
  END LOOP;

  IF array_length(sets, 1) IS NULL THEN
    RAISE EXCEPTION 'Hakuna taarifa mpya iliyowekwa.';
  END IF;

  IF has_status THEN
    sets := sets || 'status = ''pending''' || 'admin_note = NULL';
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
SET search_path = public
AS $$
DECLARE
  tbl text := public.track_table_for_kind(p_kind);
  tail text := public.track_norm_phone(p_query);
  reg  text := public.track_norm_reg(p_query);
  row_phone text;
  row_reg text;
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
    'SELECT phone, registration_number, %s FROM public.%I WHERE id = $1',
    CASE WHEN has_status THEN 'status::text' ELSE 'NULL::text' END, tbl)
  INTO row_phone, row_reg, row_status USING p_id;

  IF row_phone IS NULL AND row_reg IS NULL THEN
    RAISE EXCEPTION 'Ombi hili halipatikani.';
  END IF;

  IF NOT ((length(tail) >= 7 AND public.track_norm_phone(row_phone) = tail)
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
REVOKE ALL ON FUNCTION public.track_update(uuid, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.track_delete(uuid, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.track_lookup(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.track_update(uuid, text, text, jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.track_delete(uuid, text, text) TO anon, authenticated, service_role;
