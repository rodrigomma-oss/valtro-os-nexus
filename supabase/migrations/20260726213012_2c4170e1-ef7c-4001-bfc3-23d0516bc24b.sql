CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

ALTER TABLE public.calendar_integrations
  ADD COLUMN IF NOT EXISTS worker_running_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_cron_run_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_cron_result JSONB;

-- Grava o segredo do cron no Vault. Chamada exclusivamente pelo servidor
-- (service_role); o valor nunca trafega para o cliente nem para logs.
CREATE OR REPLACE FUNCTION public.set_calendar_cron_secret(_value TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pg_temp
AS $$
DECLARE
  _id UUID;
BEGIN
  IF _value IS NULL OR length(_value) < 32 THEN
    RAISE EXCEPTION 'Segredo do cron inválido.';
  END IF;

  SELECT id INTO _id FROM vault.secrets WHERE name = 'google_calendar_cron_secret';

  IF _id IS NULL THEN
    PERFORM vault.create_secret(_value, 'google_calendar_cron_secret',
                                'Bearer usado pelo pg_cron para chamar /api/public/google-calendar/sync');
  ELSE
    PERFORM vault.update_secret(_id, _value);
  END IF;

  RETURN TRUE;
END $$;

REVOKE ALL ON FUNCTION public.set_calendar_cron_secret(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_calendar_cron_secret(TEXT) TO service_role;