DROP POLICY IF EXISTS "Anyone can read published knowledge" ON public.ai_knowledge;
CREATE POLICY "Public read published knowledge" ON public.ai_knowledge FOR SELECT TO anon, authenticated USING (published = true);
CREATE POLICY "Admins read all knowledge" ON public.ai_knowledge FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "read active departments" ON public.departments;
CREATE POLICY "Public read active departments" ON public.departments FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "Admins read all departments" ON public.departments FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "read published graduations" ON public.graduations;
CREATE POLICY "Public read published graduations" ON public.graduations FOR SELECT TO anon, authenticated USING (published = true);
CREATE POLICY "Admins read all graduations" ON public.graduations FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins view all announcements" ON public.announcements;
CREATE POLICY "Admins view all announcements" ON public.announcements FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'leader'));

DROP POLICY IF EXISTS "Admins view applications" ON public.leader_applications;
CREATE POLICY "Admins view applications" ON public.leader_applications FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins view all roles" ON public.user_roles;
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));