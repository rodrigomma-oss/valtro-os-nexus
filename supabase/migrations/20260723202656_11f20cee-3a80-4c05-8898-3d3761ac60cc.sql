
REVOKE EXECUTE ON FUNCTION public.log_lead_contact_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_lead_follow_up_change() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_lead_contact_created() TO service_role;
GRANT EXECUTE ON FUNCTION public.log_lead_follow_up_change() TO service_role;
