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