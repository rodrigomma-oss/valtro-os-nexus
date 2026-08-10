-- 1.1 Schema: Adicionar invited_at
ALTER TABLE public.beta_participants 
ADD COLUMN IF NOT EXISTS invited_at timestamptz NULL;

COMMENT ON COLUMN public.beta_participants.invited_at IS 'Momento em que o convite foi efetivamente registrado como enviado.';

-- 1.2 Registro de evento e Trigger
CREATE OR REPLACE FUNCTION public.log_beta_participant_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  _actor uuid := auth.uid();
  _type public.beta_participant_event_type;
BEGIN
  -- INSERT: Registro inicial
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.beta_participant_events (beta_participant_id, type, description, created_by, metadata)
    VALUES (NEW.id, 'created', format('Participante %s cadastrado.', NEW.code),
            COALESCE(_actor, NEW.created_by),
            jsonb_build_object('status', NEW.status, 'email', NEW.email,
                               'beta_program_id', NEW.beta_program_id,
                               'saas_product_id', NEW.saas_product_id,
                               'interest_to_subscribe', NEW.interest_to_subscribe));
    
    IF NEW.invited_at IS NOT NULL THEN
      INSERT INTO public.beta_participant_events (beta_participant_id, type, description, created_by, metadata)
      VALUES (NEW.id, 'invited', 'Convite registrado para o participante.',
              COALESCE(_actor, NEW.created_by),
              jsonb_build_object('email', NEW.email, 'invited_at', NEW.invited_at));
    END IF;
    
    RETURN NULL;
  END IF;

  -- UPDATE: Mudança de status
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

  -- UPDATE: Registro de convite (invited_at)
  IF NEW.invited_at IS DISTINCT FROM OLD.invited_at AND NEW.invited_at IS NOT NULL THEN
    INSERT INTO public.beta_participant_events (beta_participant_id, type, description, created_by, metadata)
    VALUES (NEW.id, 'invited', 'Convite registrado como enviado.', _actor,
            jsonb_build_object('invited_at', NEW.invited_at));
  END IF;

  -- UPDATE: Interesse
  IF NEW.interest_to_subscribe IS DISTINCT FROM OLD.interest_to_subscribe THEN
    INSERT INTO public.beta_participant_events (beta_participant_id, type, description, created_by, metadata)
    VALUES (NEW.id, 'interest_changed',
            format('Interesse alterado para "%s".', NEW.interest_to_subscribe), _actor,
            jsonb_build_object('from', OLD.interest_to_subscribe, 'to', NEW.interest_to_subscribe));
  END IF;

  RETURN NULL;
END;
$function$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_bugs_saas_product_id ON public.bugs (saas_product_id);
CREATE INDEX IF NOT EXISTS idx_feedback_saas_product_id ON public.feedback (saas_product_id);
CREATE INDEX IF NOT EXISTS idx_feedback_participant_email_lower ON public.feedback (lower(participant_email));
