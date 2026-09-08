-- Roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'leader', 'student');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  course TEXT NOT NULL,
  phone TEXT NOT NULL,
  challenge_type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenges TO authenticated;
GRANT INSERT ON public.challenges TO anon;
GRANT ALL ON public.challenges TO service_role;

CREATE TABLE public.loan_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  form_four_index TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  course TEXT NOT NULL,
  year_of_study TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  problem_type TEXT NOT NULL,
  problem_description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_requests TO authenticated;
GRANT INSERT ON public.loan_requests TO anon;
GRANT ALL ON public.loan_requests TO service_role;

CREATE TABLE public.deaths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deceased_name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  student_name TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  phone TEXT NOT NULL,
  death_date DATE NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deaths TO authenticated;
GRANT SELECT, INSERT ON public.deaths TO anon;
GRANT ALL ON public.deaths TO service_role;

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT SELECT ON public.announcements TO anon;
GRANT ALL ON public.announcements TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deaths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can submit challenges" ON public.challenges FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view challenges" ON public.challenges FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'leader'));
CREATE POLICY "Admins update challenges" ON public.challenges FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'leader'));
CREATE POLICY "Admins delete challenges" ON public.challenges FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can submit loans" ON public.loan_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view loans" ON public.loan_requests FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'leader'));
CREATE POLICY "Admins update loans" ON public.loan_requests FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'leader'));
CREATE POLICY "Admins delete loans" ON public.loan_requests FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can submit deaths" ON public.deaths FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view deaths" ON public.deaths FOR SELECT USING (true);
CREATE POLICY "Admins update deaths" ON public.deaths FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'leader'));
CREATE POLICY "Admins delete deaths" ON public.deaths FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone views announcements" ON public.announcements FOR SELECT USING (published = true);
CREATE POLICY "Admins view all announcements" ON public.announcements FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'leader'));
CREATE POLICY "Admins create announcements" ON public.announcements FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'leader'));
CREATE POLICY "Admins update announcements" ON public.announcements FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'leader'));
CREATE POLICY "Admins delete announcements" ON public.announcements FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.hero_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hero_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hero_images TO authenticated;
GRANT ALL ON public.hero_images TO service_role;
ALTER TABLE public.hero_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views hero images" ON public.hero_images FOR SELECT USING (true);
CREATE POLICY "Admins manage hero images" ON public.hero_images FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'leader'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'leader'::app_role));

CREATE POLICY "Public read hero-images" ON storage.objects FOR SELECT USING (bucket_id = 'hero-images');
CREATE POLICY "Admins upload hero-images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'hero-images' AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'leader'::app_role)));
CREATE POLICY "Admins update hero-images" ON storage.objects FOR UPDATE
  USING (bucket_id = 'hero-images' AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'leader'::app_role)));
CREATE POLICY "Admins delete hero-images" ON storage.objects FOR DELETE
  USING (bucket_id = 'hero-images' AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'leader'::app_role)));

CREATE OR REPLACE FUNCTION public.promote_first_user_to_admin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created_promote_first
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.promote_first_user_to_admin();

CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url text,
  phone text,
  email text,
  address text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads site settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage site settings" ON public.site_settings FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
INSERT INTO public.site_settings (phone, email, address)
  VALUES ('+255 700 000 000', 'mumso@chuo.ac.tz', 'Ofisi ya MUMSO, Chuo');

CREATE TABLE public.service_status (
  key text PRIMARY KEY,
  label text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_status TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_status TO authenticated;
GRANT ALL ON public.service_status TO service_role;
ALTER TABLE public.service_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads service status" ON public.service_status FOR SELECT USING (true);
CREATE POLICY "Admins manage service status" ON public.service_status FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
INSERT INTO public.service_status (key,label) VALUES
  ('huduma','Huduma za Wanafunzi'),
  ('mikopo','Huduma ya Mikopo'),
  ('misiba','Taarifa za Misiba'),
  ('matangazo','Matangazo');

CREATE TABLE public.form_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.form_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_categories TO authenticated;
GRANT ALL ON public.form_categories TO service_role;
ALTER TABLE public.form_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads categories" ON public.form_categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.form_categories FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
INSERT INTO public.form_categories (service_key,label,sort_order) VALUES
  ('huduma','Kitaaluma',1),('huduma','Kifedha',2),('huduma','Afya',3),('huduma','Ushauri',4),('huduma','Nyingine',5),
  ('mikopo','Disbursement Problem',1),('mikopo','Allocation Problem',2),('mikopo','Appealed Loan Issue',3),('mikopo','No Loan Received',4),('mikopo','Other Loan Challenges',5);

CREATE POLICY "Public read site-assets" ON storage.objects FOR SELECT USING (bucket_id='site-assets');
CREATE POLICY "Admins upload site-assets" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id='site-assets' AND has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins update site-assets" ON storage.objects FOR UPDATE
  USING (bucket_id='site-assets' AND has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins delete site-assets" ON storage.objects FOR DELETE
  USING (bucket_id='site-assets' AND has_role(auth.uid(),'admin'::app_role));

ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS mum_logo_url text;

CREATE TABLE IF NOT EXISTS public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  leader_name text,
  leader_contact text,
  icon text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT ON public.departments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read active departments" ON public.departments FOR SELECT
  USING (active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage departments" ON public.departments FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.graduations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  event_date date,
  image_url text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT ON public.graduations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.graduations TO authenticated;
GRANT ALL ON public.graduations TO service_role;
ALTER TABLE public.graduations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read published graduations" ON public.graduations FOR SELECT
  USING (published = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage graduations" ON public.graduations FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.departments (name, slug, description, sort_order) VALUES
  ('Idara ya Mkopo na Fedha', 'mkopo-na-fedha', 'Huduma zote za mikopo ya HESLB, disbursement, allocation, na masuala ya kifedha ya wanafunzi.', 1),
  ('Idara ya Taaluma', 'taaluma', 'Changamoto za kitaaluma, mitihani, results, na registration.', 2),
  ('Idara ya Afya na Ustawi', 'afya-na-ustawi', 'Huduma za afya, ushauri, na ustawi wa mwanafunzi.', 3),
  ('Idara ya Mahusiano na Malalamiko', 'mahusiano', 'Malalamiko ya jumla, mahusiano ya wanafunzi na chuo.', 4)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS system_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS maintenance_message TEXT;

CREATE TABLE public.department_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  form_four_index text,
  registration_number text NOT NULL,
  course text,
  year_of_study text,
  phone text NOT NULL,
  category text,
  description text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.department_submissions TO authenticated;
GRANT INSERT ON public.department_submissions TO anon;
GRANT ALL ON public.department_submissions TO service_role;
ALTER TABLE public.department_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit" ON public.department_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins and leaders view" ON public.department_submissions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'leader'::app_role));
CREATE POLICY "Admins and leaders update" ON public.department_submissions FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'leader'::app_role));
CREATE POLICY "Admins delete" ON public.department_submissions FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.leader_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number text NOT NULL,
  full_name text NOT NULL,
  position text NOT NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  phone text,
  password_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  approved_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leader_applications TO authenticated;
GRANT INSERT ON public.leader_applications TO anon;
GRANT ALL ON public.leader_applications TO service_role;
ALTER TABLE public.leader_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can apply" ON public.leader_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view applications" ON public.leader_applications FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update applications" ON public.leader_applications FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete applications" ON public.leader_applications FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.form_categories ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE TABLE public.official_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.official_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.official_links TO authenticated;
GRANT ALL ON public.official_links TO service_role;
ALTER TABLE public.official_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read active links" ON public.official_links FOR SELECT USING (active = true);
CREATE POLICY "admin manage links" ON public.official_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.official_links (label, url, sort_order) VALUES
  ('MUM Official Website', 'https://mum.ac.tz', 1),
  ('MUM Admission', 'https://mum.ac.tz/admission', 2),
  ('HESLB (Bodi ya Mikopo)', 'https://www.heslb.go.tz', 3),
  ('TCU', 'https://www.tcu.go.tz', 4);

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS theme_primary text,
  ADD COLUMN IF NOT EXISTS theme_accent text;

ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS theme_background text;

DROP POLICY IF EXISTS "Leaders manage own department categories" ON public.form_categories;
CREATE POLICY "Leaders manage own department categories"
ON public.form_categories FOR ALL
USING (
  has_role(auth.uid(), 'leader'::app_role)
  AND department_id IN (SELECT department_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'leader'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'leader'::app_role)
  AND department_id IN (SELECT department_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'leader'::app_role)
);

ALTER TABLE public.department_submissions
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_name text;

CREATE POLICY "Anyone can upload submission attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'submissions');

CREATE POLICY "Admins and leaders read submission attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'submissions' AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'leader'::app_role)));

CREATE POLICY "Admins delete submission attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'submissions' AND public.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS president_name text,
  ADD COLUMN IF NOT EXISTS president_title text,
  ADD COLUMN IF NOT EXISTS president_message text,
  ADD COLUMN IF NOT EXISTS president_photo_url text;

CREATE TABLE public.leaders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  full_name text NOT NULL,
  position text NOT NULL,
  short_message text,
  bio text,
  photo_url text,
  phone text,
  email text,
  sort_order integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.leaders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leaders TO authenticated;
GRANT ALL ON public.leaders TO service_role;

ALTER TABLE public.leaders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published leaders"
ON public.leaders FOR SELECT TO anon, authenticated
USING (published = true);

CREATE POLICY "Admins can view all leaders"
ON public.leaders FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert leaders"
ON public.leaders FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update leaders"
ON public.leaders FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete leaders"
ON public.leaders FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_leaders_updated_at
BEFORE UPDATE ON public.leaders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_loan_requests_created_at ON public.loan_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loan_requests_reg ON public.loan_requests (registration_number);
CREATE INDEX IF NOT EXISTS idx_loan_requests_status ON public.loan_requests (status);
CREATE INDEX IF NOT EXISTS idx_dept_sub_created_at ON public.department_submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dept_sub_dept ON public.department_submissions (department_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dept_sub_reg ON public.department_submissions (registration_number);
CREATE INDEX IF NOT EXISTS idx_deaths_created_at ON public.deaths (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenges_created_at ON public.challenges (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_pub_created ON public.announcements (published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaders_pub_sort ON public.leaders (published, sort_order);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles (user_id);

ALTER TABLE public.loan_requests ADD COLUMN IF NOT EXISTS admin_note text, ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS admin_note text, ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.department_submissions ADD COLUMN IF NOT EXISTS admin_note text;

DROP TRIGGER IF EXISTS set_loan_requests_updated_at ON public.loan_requests;
CREATE TRIGGER set_loan_requests_updated_at BEFORE UPDATE ON public.loan_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_challenges_updated_at ON public.challenges;
CREATE TRIGGER set_challenges_updated_at BEFORE UPDATE ON public.challenges FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_department_submissions_updated_at ON public.department_submissions;
CREATE TRIGGER set_department_submissions_updated_at BEFORE UPDATE ON public.department_submissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS loan_requests_phone_idx ON public.loan_requests (phone);
CREATE INDEX IF NOT EXISTS challenges_phone_idx ON public.challenges (phone);
CREATE INDEX IF NOT EXISTS department_submissions_phone_idx ON public.department_submissions (phone);