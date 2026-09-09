REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;

DROP POLICY IF EXISTS "Admins view loans" ON public.loan_requests;
CREATE POLICY "Admins view loans" ON public.loan_requests FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'leader'));
DROP POLICY IF EXISTS "Admins update loans" ON public.loan_requests;
CREATE POLICY "Admins update loans" ON public.loan_requests FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'leader'));
DROP POLICY IF EXISTS "Admins delete loans" ON public.loan_requests;
CREATE POLICY "Admins delete loans" ON public.loan_requests FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins view challenges" ON public.challenges;
CREATE POLICY "Admins view challenges" ON public.challenges FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'leader'));
DROP POLICY IF EXISTS "Admins update challenges" ON public.challenges;
CREATE POLICY "Admins update challenges" ON public.challenges FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'leader'));
DROP POLICY IF EXISTS "Admins delete challenges" ON public.challenges;
CREATE POLICY "Admins delete challenges" ON public.challenges FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins and leaders view" ON public.department_submissions;
CREATE POLICY "Admins and leaders view" ON public.department_submissions FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'leader'));
DROP POLICY IF EXISTS "Admins and leaders update" ON public.department_submissions;
CREATE POLICY "Admins and leaders update" ON public.department_submissions FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'leader'));
DROP POLICY IF EXISTS "Admins delete" ON public.department_submissions;
CREATE POLICY "Admins delete" ON public.department_submissions FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins update deaths" ON public.deaths;
CREATE POLICY "Admins update deaths" ON public.deaths FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'leader'));
DROP POLICY IF EXISTS "Admins delete deaths" ON public.deaths;
CREATE POLICY "Admins delete deaths" ON public.deaths FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));