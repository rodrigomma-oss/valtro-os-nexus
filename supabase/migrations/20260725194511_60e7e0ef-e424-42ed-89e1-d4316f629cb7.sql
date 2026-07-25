
REVOKE ALL ON FUNCTION public.log_client_service_created() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_client_service_status_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.client_service_events_immutable() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.client_services_block_delete() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.client_services_validate_transition() FROM PUBLIC, anon, authenticated;
