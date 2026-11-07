-- =========================================================
-- Sprint 14.1 — Integração real Google Calendar
-- CRM = fonte de verdade; Google = projeção.
-- =========================================================

CREATE TYPE public.calendar_integration_status AS ENUM ('conectado', 'desconectado', 'erro');

CREATE TABLE public.calendar_integrations (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider                  TEXT NOT NULL DEFAULT 'google' CHECK (provider = 'google'),
  calendar_scope            public.calendar_scope NOT NULL DEFAULT 'empresa',
  calendar_owner_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  calendar_id               TEXT,
  calendar_summary          TEXT,
  google_account_email      TEXT,
  granted_scopes            TEXT,
  access_token_ciphertext   TEXT,
  refresh_token_ciphertext  TEXT,
  access_token_expires_at   TIMESTAMPTZ,
  status                    public.calendar_integration_status NOT NULL DEFAULT 'desconectado',
  last_error                TEXT,
  connected_by              UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  connected_at              TIMESTAMPTZ,
  disconnected_at           TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_calendar_integrations_target
  ON public.calendar_integrations (
    provider,
    calendar_scope,
    COALESCE(calendar_owner_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- Somente o servidor (service_role) enxerga tokens. Nenhum GRANT a anon/authenticated.
GRANT ALL ON public.calendar_integrations TO service_role;
ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_calendar_integrations_updated_at
  BEFORE UPDATE ON public.calendar_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------
-- Estados OAuth de uso único (anti-CSRF / anti-replay)
-- ---------------------------------------------------------
CREATE TABLE public.calendar_oauth_states (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nonce        TEXT NOT NULL UNIQUE,
  created_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  redirect_uri TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  consumed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_oauth_states_expires ON public.calendar_oauth_states (expires_at);

GRANT ALL ON public.calendar_oauth_states TO service_role;
ALTER TABLE public.calendar_oauth_states ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------
-- Fila: retry com backoff e operação desejada
-- ---------------------------------------------------------
ALTER TABLE public.calendar_sync_links
  ADD COLUMN IF NOT EXISTS next_attempt_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_attempt_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_calendar_sync_links_next_attempt
  ON public.calendar_sync_links (sync_status, next_attempt_at);

GRANT ALL ON public.calendar_sync_links TO service_role;

-- Reenfileirar sempre reinicia o backoff.
CREATE OR REPLACE FUNCTION public.enqueue_follow_up_calendar_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO public.calendar_sync_links (
    entity_type, entity_id, provider, calendar_scope, sync_status, payload_hash, next_attempt_at
  )
  VALUES ('follow_up', NEW.id, 'google', 'empresa', 'pendente',
          md5(NEW.scheduled_at::text || COALESCE(NEW.reason,'') || NEW.duration_minutes::text || NEW.status::text),
          now())
  ON CONFLICT (provider, entity_type, entity_id, calendar_scope, COALESCE(calendar_owner_id, '00000000-0000-0000-0000-000000000000'::uuid))
  DO UPDATE SET sync_status    = 'pendente',
                payload_hash   = EXCLUDED.payload_hash,
                sync_attempts  = 0,
                next_attempt_at = now(),
                last_error     = NULL,
                updated_at     = now();
  RETURN NEW;
END $function$;
