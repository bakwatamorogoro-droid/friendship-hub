REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.promote_first_user_to_admin() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;