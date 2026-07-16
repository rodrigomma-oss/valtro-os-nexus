
REVOKE EXECUTE ON FUNCTION public.log_lead_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_lead_status_change() FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.has_any_role(uuid);
