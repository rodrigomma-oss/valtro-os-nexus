REVOKE ALL ON SEQUENCE public.bug_code_seq FROM authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.bug_code_seq TO authenticated;
GRANT ALL ON SEQUENCE public.bug_code_seq TO service_role;