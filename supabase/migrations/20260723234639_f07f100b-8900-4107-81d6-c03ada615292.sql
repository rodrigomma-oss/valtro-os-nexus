
REVOKE EXECUTE ON FUNCTION public.generate_project_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_project_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_project_updated() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.convert_lead_to_client(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_lead_to_client(UUID) TO authenticated;
