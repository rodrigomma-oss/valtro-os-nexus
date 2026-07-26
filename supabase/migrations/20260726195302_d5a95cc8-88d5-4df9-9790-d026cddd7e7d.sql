REVOKE ALL ON FUNCTION public.sync_lead_next_follow_up() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_follow_up_status_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_follow_up_calendar_sync() FROM PUBLIC, anon, authenticated;