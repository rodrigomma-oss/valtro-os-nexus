
CREATE OR REPLACE FUNCTION public.sync_lead_from_briefing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _has_other boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Briefing gerado: mover Lead para briefing_enviado se estiver em estado compatível.
    UPDATE public.leads
    SET status = 'briefing_enviado',
        next_action = 'aguardar_retorno'
    WHERE id = NEW.lead_id
      AND status IN ('novo','em_triagem','contato','qualificado','aguardando_briefing');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Conclusão do briefing.
    IF NEW.status = 'concluido' AND OLD.status IS DISTINCT FROM 'concluido' THEN
      UPDATE public.leads
      SET status = 'em_analise',
          next_action = 'preparar_proposta'
      WHERE id = NEW.lead_id
        AND status IN ('briefing_enviado','aguardando_briefing','em_triagem','contato','qualificado','novo');
    END IF;

    -- Revogação: recalcular estado quando não sobrar briefing ativo/concluído.
    IF NEW.status = 'revogado' AND OLD.status IS DISTINCT FROM 'revogado' THEN
      SELECT EXISTS(
        SELECT 1 FROM public.briefing_tokens
        WHERE lead_id = NEW.lead_id
          AND id <> NEW.id
          AND status IN ('pendente','ativo','concluido')
      ) INTO _has_other;

      IF NOT _has_other THEN
        UPDATE public.leads
        SET status = 'aguardando_briefing',
            next_action = NULL
        WHERE id = NEW.lead_id
          AND status = 'briefing_enviado';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_lead_from_briefing_ins ON public.briefing_tokens;
CREATE TRIGGER sync_lead_from_briefing_ins
AFTER INSERT ON public.briefing_tokens
FOR EACH ROW EXECUTE FUNCTION public.sync_lead_from_briefing();

DROP TRIGGER IF EXISTS sync_lead_from_briefing_upd ON public.briefing_tokens;
CREATE TRIGGER sync_lead_from_briefing_upd
AFTER UPDATE OF status ON public.briefing_tokens
FOR EACH ROW EXECUTE FUNCTION public.sync_lead_from_briefing();
