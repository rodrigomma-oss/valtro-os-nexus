GRANT SELECT, INSERT, UPDATE ON public.bugs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.feedback TO authenticated;
GRANT ALL ON public.bugs TO service_role;
GRANT ALL ON public.feedback TO service_role;