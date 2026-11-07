
-- INSERT trigger: log "briefing_gerado" on new briefing_tokens rows
CREATE OR REPLACE FUNCTION public.log_briefing_token_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.lead_events (lead_id, type, description, created_by, metadata)
  VALUES (
    NEW.lead_id,
    'briefing_gerado',
    'Briefing gerado.',
    NEW.created_by,
    jsonb_build_object('token_id', NEW.id, 'service_type', NEW.service_type, 'template_type', NEW.template_type)
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.log_briefing_token_created() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_briefing_token_created ON public.briefing_tokens;
CREATE TRIGGER trg_briefing_token_created
AFTER INSERT ON public.briefing_tokens
FOR EACH ROW
EXECUTE FUNCTION public.log_briefing_token_created();

-- UPDATE trigger: log "briefing_revogado" and "briefing_reenviado"
CREATE OR REPLACE FUNCTION public.log_briefing_token_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Revogação: transição para 'revogado'
  IF NEW.status = 'revogado' AND OLD.status IS DISTINCT FROM 'revogado' THEN
    INSERT INTO public.lead_events (lead_id, type, description, created_by, metadata)
    VALUES (
      NEW.lead_id,
      'briefing_revogado',
      'Briefing revogado.',
      auth.uid(),
      jsonb_build_object('token_id', NEW.id)
    );
  END IF;

  -- Reenvio: expires_at foi estendido e status voltou/está ativo (não é criação nem revogação)
  IF NEW.expires_at IS DISTINCT FROM OLD.expires_at
     AND NEW.status = 'ativo'
     AND OLD.status IN ('ativo', 'pendente', 'expirado') THEN
    INSERT INTO public.lead_events (lead_id, type, description, created_by, metadata)
    VALUES (
      NEW.lead_id,
      'briefing_reenviado',
      'Briefing reenviado.',
      auth.uid(),
      jsonb_build_object('token_id', NEW.id, 'expires_at', NEW.expires_at)
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.log_briefing_token_updated() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_briefing_token_updated ON public.briefing_tokens;
CREATE TRIGGER trg_briefing_token_updated
AFTER UPDATE ON public.briefing_tokens
FOR EACH ROW
EXECUTE FUNCTION public.log_briefing_token_updated();
