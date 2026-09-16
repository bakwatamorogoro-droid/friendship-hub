
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
  usephone boolean;
  usereg boolean;
  res jsonb;
BEGIN
  IF length(coalesce(btrim(p_query), '')) < 3 THEN
    RETURN jsonb_build_object('mikopo','[]'::jsonb,'changamoto','[]'::jsonb,'idara','[]'::jsonb,'misiba','[]'::jsonb);
  END IF;
  usephone := length(tail) >= 7;
  usereg := length(reg) >= 3;

  SELECT jsonb_build_object(
    'mikopo', coalesce((
      SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC) FROM public.loan_requests t
      WHERE (usephone AND public.track_norm_phone(t.phone) = tail)
         OR (usereg AND public.track_norm_reg(t.registration_number) = reg)
    ), '[]'::jsonb),
    'changamoto', coalesce((
      SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC) FROM public.challenges t
      WHERE (usephone AND public.track_norm_phone(t.phone) = tail)
         OR (usereg AND public.track_norm_reg(t.registration_number) = reg)
    ), '[]'::jsonb),
    'idara', coalesce((
      SELECT jsonb_agg(to_jsonb(t) || jsonb_build_object('department_name', d.name) ORDER BY t.created_at DESC)
      FROM public.department_submissions t
      LEFT JOIN public.departments d ON d.id = t.department_id
      WHERE (usephone AND public.track_norm_phone(t.phone) = tail)
         OR (usereg AND public.track_norm_reg(t.registration_number) = reg)
    ), '[]'::jsonb),
    'misiba', coalesce((
      SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC) FROM public.deaths t
      WHERE (usephone AND public.track_norm_phone(t.phone) = tail)
         OR (usereg AND public.track_norm_reg(t.registration_number) = reg)
    ), '[]'::jsonb)
  ) INTO res;

  RETURN res;
END
$$;

REVOKE ALL ON FUNCTION public.track_lookup(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_lookup(text) TO anon, authenticated, service_role;
