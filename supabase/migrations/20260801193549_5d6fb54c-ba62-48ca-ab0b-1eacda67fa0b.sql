-- VOS-001F — Gestão dos Participantes do Beta

-- 1. Enums
CREATE TYPE public.beta_participant_status AS ENUM (
  'invited', 'accepted', 'active', 'inactive', 'removed', 'converted'
);

CREATE TYPE public.beta_participant_interest AS ENUM (
  'no', 'maybe', 'yes', 'already_customer', 'unknown'
);

CREATE TYPE public.beta_participant_event_type AS ENUM (
  'created', 'invited', 'accepted', 'activated', 'deactivated',
  'removed', 'converted', 'interest_changed', 'notes_changed',
  'linked_user', 'reopened'
);

-- 2. Sequence (nunca reutiliza; segura em concorrência)
CREATE SEQUENCE public.beta_participant_code_seq START WITH 1 INCREMENT BY 1 NO CYCLE;

-- 3. Tabelas
CREATE TABLE public.beta_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  beta_program_id uuid NOT NULL REFERENCES public.beta_programs(id) ON DELETE RESTRICT,
  saas_product_id uuid NOT NULL REFERENCES public.saas_products(id) ON DELETE RESTRICT,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  name text NOT NULL,
  status public.beta_participant_status NOT NULL DEFAULT 'invited',
  interest_to_subscribe public.beta_participant_interest NOT NULL DEFAULT 'unknown',
  invitation_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  accepted_at timestamptz,
  activated_at timestamptz,
  ended_at timestamptz,
  converted_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT beta_participants_email_format CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CONSTRAINT beta_participants_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT beta_participants_unique_email_per_program UNIQUE (beta_program_id, email)
);

CREATE INDEX idx_beta_participants_program ON public.beta_participants(beta_program_id);
CREATE INDEX idx_beta_participants_product ON public.beta_participants(saas_product_id);
CREATE INDEX idx_beta_participants_status ON public.beta_participants(status);
CREATE INDEX idx_beta_participants_interest ON public.beta_participants(interest_to_subscribe);
CREATE INDEX idx_beta_participants_user ON public.beta_participants(user_id);
CREATE INDEX idx_beta_participants_email_lower ON public.beta_participants(lower(email));
CREATE INDEX idx_beta_participants_name_trgm ON public.beta_participants(lower(name));
CREATE INDEX idx_beta_participants_updated_at ON public.beta_participants(updated_at DESC);

CREATE TABLE public.beta_participant_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beta_participant_id uuid NOT NULL REFERENCES public.beta_participants(id) ON DELETE RESTRICT,
  type public.beta_participant_event_type NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_beta_participant_events_participant
  ON public.beta_participant_events(beta_participant_id, created_at DESC);

-- 4. Código automático (banco é a única fonte)
CREATE OR REPLACE FUNCTION public.generate_beta_participant_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  NEW.code := 'BTP-' || lpad(nextval('public.beta_participant_code_seq')::text, 6, '0');
  RETURN NEW;
END $function$;

CREATE TRIGGER tr_beta_participants_code
BEFORE INSERT ON public.beta_participants
FOR EACH ROW EXECUTE FUNCTION public.generate_beta_participant_code();

-- Imutabilidade de código / token / autoria
CREATE OR REPLACE FUNCTION public.beta_participants_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NEW.code IS DISTINCT FROM OLD.code THEN
    RAISE EXCEPTION 'O código do participante é imutável.' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.invitation_token IS DISTINCT FROM OLD.invitation_token THEN
    RAISE EXCEPTION 'O token de convite é imutável.' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'A autoria do cadastro é imutável.' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.beta_program_id IS DISTINCT FROM OLD.beta_program_id THEN
    RAISE EXCEPTION 'O programa beta do participante é imutável.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $function$;

CREATE TRIGGER tr_beta_participants_immutable
BEFORE UPDATE ON public.beta_participants
FOR EACH ROW EXECUTE FUNCTION public.beta_participants_immutable_fields();

-- 5. Máquina de estados
CREATE OR REPLACE FUNCTION public.beta_participant_transition_allowed(
  _from public.beta_participant_status,
  _to public.beta_participant_status
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT CASE
    WHEN _from = _to THEN false
    WHEN _from = 'invited'   AND _to IN ('accepted','removed') THEN true
    WHEN _from = 'accepted'  AND _to IN ('active','inactive','removed') THEN true
    WHEN _from = 'active'    AND _to IN ('converted','inactive','removed') THEN true
    WHEN _from = 'inactive'  AND _to IN ('active','removed') THEN true
    ELSE false
  END
$function$;

CREATE OR REPLACE FUNCTION public.beta_participants_validate_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status IN ('converted','removed') THEN
      RAISE EXCEPTION 'Participante em situação final ("%") não permite novas transições.', OLD.status
        USING ERRCODE = 'check_violation';
    END IF;
    IF NOT public.beta_participant_transition_allowed(OLD.status, NEW.status) THEN
      RAISE EXCEPTION 'Transição de situação inválida: % -> %.', OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $function$;

CREATE TRIGGER tr_beta_participants_validate_transition
BEFORE UPDATE OF status ON public.beta_participants
FOR EACH ROW EXECUTE FUNCTION public.beta_participants_validate_transition();

-- Datas automáticas
CREATE OR REPLACE FUNCTION public.beta_participants_sync_dates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  NEW.updated_at := now();

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'accepted' THEN
      NEW.accepted_at := COALESCE(NEW.accepted_at, now());
    ELSIF NEW.status = 'active' THEN
      NEW.activated_at := COALESCE(NEW.activated_at, now());
      NEW.ended_at := NULL;
    ELSIF NEW.status IN ('inactive','removed') THEN
      NEW.ended_at := COALESCE(NEW.ended_at, now());
    ELSIF NEW.status = 'converted' THEN
      NEW.converted_at := COALESCE(NEW.converted_at, now());
    END IF;
  END IF;

  RETURN NEW;
END $function$;

CREATE TRIGGER tr_beta_participants_sync_dates
BEFORE UPDATE ON public.beta_participants
FOR EACH ROW EXECUTE FUNCTION public.beta_participants_sync_dates();

-- 6. Timeline automática (append-only)
CREATE OR REPLACE FUNCTION public.log_beta_participant_event()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  _actor uuid := auth.uid();
  _type public.beta_participant_event_type;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.beta_participant_events (beta_participant_id, type, description, created_by, metadata)
    VALUES (NEW.id, 'created', format('Participante %s cadastrado.', NEW.code),
            COALESCE(_actor, NEW.created_by),
            jsonb_build_object('status', NEW.status, 'email', NEW.email,
                               'beta_program_id', NEW.beta_program_id,
                               'saas_product_id', NEW.saas_product_id,
                               'interest_to_subscribe', NEW.interest_to_subscribe));

    IF NEW.status = 'invited' THEN
      INSERT INTO public.beta_participant_events (beta_participant_id, type, description, created_by, metadata)
      VALUES (NEW.id, 'invited', 'Convite registrado para o participante.',
              COALESCE(_actor, NEW.created_by),
              jsonb_build_object('email', NEW.email));
    END IF;
    RETURN NULL;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    _type := CASE NEW.status
      WHEN 'accepted'  THEN 'accepted'
      WHEN 'active'    THEN CASE WHEN OLD.status = 'inactive' THEN 'reopened' ELSE 'activated' END
      WHEN 'inactive'  THEN 'deactivated'
      WHEN 'removed'   THEN 'removed'
      WHEN 'converted' THEN 'converted'
      ELSE 'created'
    END;
    INSERT INTO public.beta_participant_events (beta_participant_id, type, description, created_by, metadata)
    VALUES (NEW.id, _type,
            format('Situação alterada de "%s" para "%s".', OLD.status, NEW.status), _actor,
            jsonb_build_object('field','status','from', OLD.status, 'to', NEW.status,
                               'accepted_at', NEW.accepted_at, 'activated_at', NEW.activated_at,
                               'ended_at', NEW.ended_at, 'converted_at', NEW.converted_at));
  END IF;

  IF NEW.interest_to_subscribe IS DISTINCT FROM OLD.interest_to_subscribe THEN
    INSERT INTO public.beta_participant_events (beta_participant_id, type, description, created_by, metadata)
    VALUES (NEW.id, 'interest_changed', 'Interesse em assinar alterado.', _actor,
            jsonb_build_object('field','interest_to_subscribe',
                               'from', OLD.interest_to_subscribe, 'to', NEW.interest_to_subscribe));
  END IF;

  IF NEW.notes IS DISTINCT FROM OLD.notes THEN
    INSERT INTO public.beta_participant_events (beta_participant_id, type, description, created_by, metadata)
    VALUES (NEW.id, 'notes_changed', 'Observações atualizadas.', _actor,
            jsonb_build_object('field','notes'));
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.beta_participant_events (beta_participant_id, type, description, created_by, metadata)
    VALUES (NEW.id, 'linked_user', 'Usuário do sistema vinculado ao participante.', _actor,
            jsonb_build_object('field','user_id','from', OLD.user_id, 'to', NEW.user_id));
  END IF;

  RETURN NULL;
END $function$;

CREATE TRIGGER tr_log_beta_participant_event
AFTER INSERT OR UPDATE ON public.beta_participants
FOR EACH ROW EXECUTE FUNCTION public.log_beta_participant_event();

-- 7. Bloqueios: sem DELETE físico, eventos imutáveis
CREATE OR REPLACE FUNCTION public.beta_participants_block_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'Participantes do beta não podem ser excluídos; use a situação removed.'
    USING ERRCODE = 'check_violation';
END $function$;

CREATE TRIGGER tr_beta_participants_block_delete
BEFORE DELETE ON public.beta_participants
FOR EACH ROW EXECUTE FUNCTION public.beta_participants_block_delete();

CREATE OR REPLACE FUNCTION public.beta_participant_events_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'Eventos de participante do beta são imutáveis (append-only).'
    USING ERRCODE = 'check_violation';
END $function$;

CREATE TRIGGER tr_beta_participant_events_immutable
BEFORE UPDATE OR DELETE ON public.beta_participant_events
FOR EACH ROW EXECUTE FUNCTION public.beta_participant_events_immutable();

-- 8. Grants (sem anon; sem DELETE/TRUNCATE/REFERENCES/TRIGGER para authenticated)
GRANT SELECT, INSERT, UPDATE ON public.beta_participants TO authenticated;
GRANT SELECT, INSERT ON public.beta_participant_events TO authenticated;
GRANT ALL ON public.beta_participants TO service_role;
GRANT ALL ON public.beta_participant_events TO service_role;
GRANT USAGE ON SEQUENCE public.beta_participant_code_seq TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.generate_beta_participant_code() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.beta_participants_immutable_fields() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.beta_participants_validate_transition() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.beta_participants_sync_dates() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_beta_participant_event() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.beta_participants_block_delete() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.beta_participant_events_immutable() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.beta_participant_transition_allowed(public.beta_participant_status, public.beta_participant_status) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.beta_participant_transition_allowed(public.beta_participant_status, public.beta_participant_status) TO authenticated, service_role;

-- 9. RLS (papéis explícitos, sem USING (true))
ALTER TABLE public.beta_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_participant_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe interna lê participantes do beta"
ON public.beta_participants FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'operator')
  OR public.has_role(auth.uid(), 'viewer')
);

CREATE POLICY "Admin e operator cadastram participantes do beta"
ON public.beta_participants FOR INSERT TO authenticated
WITH CHECK (
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'))
  AND created_by = auth.uid()
);

CREATE POLICY "Admin e operator atualizam participantes do beta"
ON public.beta_participants FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));

CREATE POLICY "Equipe interna lê eventos de participantes do beta"
ON public.beta_participant_events FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'operator')
  OR public.has_role(auth.uid(), 'viewer')
);

CREATE POLICY "Admin e operator registram eventos de participantes do beta"
ON public.beta_participant_events FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator')
);

-- 10. Anexos: reaproveita infraestrutura existente
CREATE OR REPLACE FUNCTION public.can_access_attachment_entity(_entity_type text, _entity_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _client_id uuid;
BEGIN
  IF _uid IS NULL OR _entity_id IS NULL OR _entity_type IS NULL THEN
    RETURN false;
  END IF;

  CASE _entity_type
    WHEN 'ticket' THEN
      IF NOT EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = _entity_id) THEN
        RETURN false;
      END IF;
      RETURN public.has_role(_uid, 'admin') OR public.has_role(_uid, 'operator') OR public.has_role(_uid, 'viewer');

    WHEN 'bug' THEN
      IF NOT EXISTS (SELECT 1 FROM public.bugs b WHERE b.id = _entity_id) THEN
        RETURN false;
      END IF;
      RETURN public.has_role(_uid, 'admin') OR public.has_role(_uid, 'operator') OR public.has_role(_uid, 'viewer');

    WHEN 'feedback' THEN
      IF NOT EXISTS (SELECT 1 FROM public.feedback f WHERE f.id = _entity_id) THEN
        RETURN false;
      END IF;
      RETURN public.has_role(_uid, 'admin') OR public.has_role(_uid, 'operator') OR public.has_role(_uid, 'viewer');

    WHEN 'beta_participant' THEN
      IF NOT EXISTS (SELECT 1 FROM public.beta_participants p WHERE p.id = _entity_id) THEN
        RETURN false;
      END IF;
      RETURN public.has_role(_uid, 'admin') OR public.has_role(_uid, 'operator') OR public.has_role(_uid, 'viewer');

    WHEN 'client' THEN
      RETURN public.can_access_client(_uid, _entity_id);

    WHEN 'lead' THEN
      RETURN public.can_access_lead(_uid, _entity_id);

    WHEN 'project' THEN
      RETURN public.can_access_project(_uid, _entity_id);

    WHEN 'client_service' THEN
      SELECT cs.client_id INTO _client_id FROM public.client_services cs WHERE cs.id = _entity_id;
      IF _client_id IS NULL THEN
        RETURN false;
      END IF;
      RETURN public.can_access_client(_uid, _client_id);

    ELSE
      RETURN false;
  END CASE;
END $function$;

REVOKE ALL ON FUNCTION public.can_access_attachment_entity(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_attachment_entity(text, uuid) TO authenticated, service_role;