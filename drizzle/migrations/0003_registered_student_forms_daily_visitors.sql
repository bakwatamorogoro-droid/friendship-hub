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