CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  registration_number TEXT NOT NULL UNIQUE,
  year_of_study TEXT NOT NULL,
  course TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT INSERT ON public.students TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can register as a student" ON public.students FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Signed-in users can view students" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can update students" ON public.students FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete students" ON public.students FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.leader_applications ADD COLUMN IF NOT EXISTS course TEXT;
ALTER TABLE public.leader_applications ADD COLUMN IF NOT EXISTS year_of_study TEXT;