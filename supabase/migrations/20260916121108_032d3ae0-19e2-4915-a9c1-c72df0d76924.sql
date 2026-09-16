
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
      sets := array_append(sets, format('%I = %L', k, btrim(v)));
    END IF;
  END LOOP;

  IF array_length(sets, 1) IS NULL THEN
    RAISE EXCEPTION 'Hakuna taarifa mpya iliyowekwa.';
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

REVOKE ALL ON FUNCTION public.track_update(uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_update(uuid, text, text, jsonb) TO anon, authenticated, service_role;
