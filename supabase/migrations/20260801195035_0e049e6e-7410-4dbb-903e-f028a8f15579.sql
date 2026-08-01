-- VOS-001F Quality Gate — correções técnicas e de segurança

-- 1. Token de convite: nenhum fluxo público consome; remover credencial em texto puro
CREATE OR REPLACE FUNCTION public.beta_participants_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NEW.code IS DISTINCT FROM OLD.code THEN
    RAISE EXCEPTION 'O código do participante é imutável.' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'A autoria do cadastro é imutável.' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.beta_program_id IS DISTINCT FROM OLD.beta_program_id THEN
    RAISE EXCEPTION 'O programa beta do participante é imutável.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $function$;

ALTER TABLE public.beta_participants DROP COLUMN IF EXISTS invitation_token;

-- 2. Normalização de nome/e-mail no banco
CREATE OR REPLACE FUNCTION public.beta_participants_normalize()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  NEW.email := lower(btrim(NEW.email));
  NEW.name := btrim(NEW.name);
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS tr_beta_participants_a_normalize ON public.beta_participants;
CREATE TRIGGER tr_beta_participants_a_normalize
  BEFORE INSERT OR UPDATE OF email, name ON public.beta_participants
  FOR EACH ROW EXECUTE FUNCTION public.beta_participants_normalize();

-- 3. Coerência produto × programa
CREATE OR REPLACE FUNCTION public.beta_participants_enforce_product()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  _program_product uuid;
BEGIN
  SELECT saas_product_id INTO _program_product
  FROM public.beta_programs WHERE id = NEW.beta_program_id;

  IF _program_product IS NULL THEN
    RAISE EXCEPTION 'Programa beta inexistente.' USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF NEW.saas_product_id IS NULL THEN
    NEW.saas_product_id := _program_product;
  ELSIF NEW.saas_product_id IS DISTINCT FROM _program_product THEN
    RAISE EXCEPTION 'O produto do participante deve ser o mesmo produto do programa beta.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS tr_beta_participants_enforce_product ON public.beta_participants;
CREATE TRIGGER tr_beta_participants_enforce_product
  BEFORE INSERT OR UPDATE OF beta_program_id, saas_product_id ON public.beta_participants
  FOR EACH ROW EXECUTE FUNCTION public.beta_participants_enforce_product();

-- 4. Unicidade case-insensitive por programa + usuário único por programa
ALTER TABLE public.beta_participants
  DROP CONSTRAINT IF EXISTS beta_participants_unique_email_per_program;

CREATE UNIQUE INDEX IF NOT EXISTS beta_participants_unique_email_per_program
  ON public.beta_participants (beta_program_id, lower(email));

CREATE UNIQUE INDEX IF NOT EXISTS beta_participants_unique_user_per_program
  ON public.beta_participants (beta_program_id, user_id)
  WHERE user_id IS NOT NULL;

-- 5. Grants mínimos
REVOKE ALL ON public.beta_participants FROM anon, authenticated, PUBLIC;
REVOKE ALL ON public.beta_participant_events FROM anon, authenticated, PUBLIC;
REVOKE ALL ON SEQUENCE public.beta_participant_code_seq FROM anon, authenticated, PUBLIC;

GRANT SELECT, INSERT, UPDATE ON public.beta_participants TO authenticated;
GRANT SELECT, INSERT ON public.beta_participant_events TO authenticated;
GRANT ALL ON public.beta_participants TO service_role;
GRANT ALL ON public.beta_participant_events TO service_role;
GRANT USAGE ON SEQUENCE public.beta_participant_code_seq TO service_role;

-- 6. EXECUTE das funções internas apenas para postgres/service_role
REVOKE ALL ON FUNCTION public.beta_participants_normalize() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.beta_participants_enforce_product() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.beta_participants_immutable_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.beta_participants_sync_dates() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.beta_participants_validate_transition() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.beta_participants_block_delete() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.beta_participant_events_immutable() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_beta_participant_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_beta_participant_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.beta_participant_transition_allowed(beta_participant_status, beta_participant_status) FROM PUBLIC, anon;