-- ============================================================
-- Fase 1A — Encerramento de contratações
-- ============================================================
-- Objetivos:
--  1. Registrar motivo, observação, responsável e data do encerramento.
--  2. Auditar o encerramento em `client_service_events` com o evento
--     dedicado `terminated`, sem duplicar o evento de status já gravado
--     pela trigger existente `log_client_service_status_change_trg`
--     (`completed` / `cancelled`).
--  3. Não alterar nenhuma política RLS, trigger existente ou dado.
--
-- Idempotência: cada coluna e cada constraint são verificados
-- individualmente; a migração pode ser reexecutada com segurança.
-- ============================================================

-- 1) Colunas de encerramento — verificadas uma a uma (reexecução parcial segura).
ALTER TABLE public.client_services
  ADD COLUMN IF NOT EXISTS termination_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS termination_note TEXT NULL,
  ADD COLUMN IF NOT EXISTS terminated_by UUID NULL,
  ADD COLUMN IF NOT EXISTS terminated_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.client_services.termination_reason IS
  'Motivo do encerramento: servico_concluido | cancelamento | nao_renovacao (motivo, nao status).';
COMMENT ON COLUMN public.client_services.termination_note IS
  'Observação livre registrada no encerramento da contratação.';
COMMENT ON COLUMN public.client_services.terminated_by IS
  'Usuário responsável pelo encerramento da contratação.';
COMMENT ON COLUMN public.client_services.terminated_at IS
  'Data e hora do encerramento da contratação.';

-- 2) Valor de enum do evento dedicado de encerramento.
ALTER TYPE public.client_service_event_type ADD VALUE IF NOT EXISTS 'terminated';

-- 3) Constraints de consistência (idempotentes; a verificação inclui a
--    tabela via `conrelid`, evitando falso positivo de nome homônimo).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'client_services_termination_reason_check'
      AND conrelid = 'public.client_services'::regclass
  ) THEN
    ALTER TABLE public.client_services
      ADD CONSTRAINT client_services_termination_reason_check
      CHECK (
        termination_reason IS NULL
        OR termination_reason IN ('servico_concluido', 'cancelamento', 'nao_renovacao')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'client_services_termination_consistency_check'
      AND conrelid = 'public.client_services'::regclass
  ) THEN
    ALTER TABLE public.client_services
      ADD CONSTRAINT client_services_termination_consistency_check
      CHECK (
        (
          termination_reason IS NULL
          AND termination_note IS NULL
          AND terminated_by IS NULL
          AND terminated_at IS NULL
        )
        OR
        (
          termination_reason IS NOT NULL
          AND status IN ('concluido', 'cancelado')
          AND terminated_at IS NOT NULL
          AND terminated_by IS NOT NULL
        )
      );
  END IF;
END $$;

-- 4) Trigger de auditoria do encerramento.
--    A trigger de status existente continua responsável pelo evento
--    `completed`/`cancelled`; aqui registramos o MOTIVO, uma única vez.
CREATE OR REPLACE FUNCTION public.log_client_service_termination()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  _actor UUID;
  _title TEXT;
BEGIN
  -- Encerramento já registrado é imutável (motivo não pode ser alterado
  -- nem removido depois de gravado).
  IF OLD.termination_reason IS NOT NULL
     AND NEW.termination_reason IS DISTINCT FROM OLD.termination_reason THEN
    RAISE EXCEPTION 'O encerramento da contratação já foi registrado e não pode ser alterado.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.termination_reason IS NULL THEN
    RETURN NEW;
  END IF;

  -- Consistência: motivo só existe com status final, data e responsável.
  IF NEW.status NOT IN ('concluido', 'cancelado') THEN
    RAISE EXCEPTION 'Encerramento exige status final (concluido ou cancelado). Recebido: %.', NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.terminated_at IS NULL OR NEW.terminated_by IS NULL THEN
    RAISE EXCEPTION 'Encerramento exige data e responsável registrados.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Integridade referencial do responsável (validada na escrita).
  IF to_regclass('auth.users') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = NEW.terminated_by) THEN
    RAISE EXCEPTION 'Responsável pelo encerramento inexistente: %.', NEW.terminated_by
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Só audita a primeira transição de status que registra o encerramento
  -- (evita repetir o mesmo evento em updates posteriores).
  IF OLD.termination_reason IS NULL
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    _actor := COALESCE(auth.uid(), NEW.terminated_by);
    _title := CASE NEW.termination_reason
      WHEN 'servico_concluido' THEN 'Contratação encerrada — serviço concluído'
      WHEN 'cancelamento' THEN 'Contratação encerrada — cancelamento'
      WHEN 'nao_renovacao' THEN 'Contratação encerrada — não renovação'
      ELSE 'Contratação encerrada'
    END;

    INSERT INTO public.client_service_events(
      client_service_id, event_type, title, description, actor_id, metadata
    ) VALUES (
      NEW.id,
      'terminated',
      _title,
      NEW.termination_note,
      _actor,
      jsonb_build_object(
        'reason', NEW.termination_reason,
        'note', NEW.termination_note,
        'from', OLD.status,
        'to', NEW.status,
        'terminated_by', NEW.terminated_by,
        'terminated_at', NEW.terminated_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_client_service_termination_trg ON public.client_services;
CREATE TRIGGER log_client_service_termination_trg
AFTER UPDATE ON public.client_services
FOR EACH ROW
EXECUTE FUNCTION public.log_client_service_termination();

-- 5) Permissões: a função só é executada pela trigger (owner).
REVOKE ALL ON FUNCTION public.log_client_service_termination() FROM PUBLIC, anon, authenticated;

-- 6) Índices de leitura do histórico de encerramento.
CREATE INDEX IF NOT EXISTS idx_client_services_termination_reason
  ON public.client_services (termination_reason)
  WHERE termination_reason IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_services_terminated_at
  ON public.client_services (terminated_at DESC)
  WHERE terminated_at IS NOT NULL;
