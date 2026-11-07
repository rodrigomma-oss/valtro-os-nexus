-- SEC-001G (complemento): última função sem search_path fixo.
ALTER FUNCTION public.block_physical_delete() SET search_path = pg_catalog, public, pg_temp;
REVOKE ALL ON FUNCTION public.block_physical_delete() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.block_physical_delete() TO service_role;
