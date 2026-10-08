CREATE OR REPLACE FUNCTION public.student_lookup(_reg text)
RETURNS TABLE(full_name text, phone text, course text, year_of_study text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.full_name, s.phone, s.course, s.year_of_study
  FROM public.students s
  WHERE upper(trim(s.registration_number)) = upper(trim(_reg))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.student_lookup(text) TO anon;
GRANT EXECUTE ON FUNCTION public.student_lookup(text) TO authenticated;