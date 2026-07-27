-- 1) Enum de status de pagamento do ciclo
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cycle_payment_status') THEN
    CREATE TYPE public.cycle_payment_status AS ENUM ('pendente', 'pago', 'vencido', 'dispensado');
  END IF;
END $$;

-- 2) Novo tipo de evento na timeline operacional
ALTER TYPE public.client_service_event_type ADD VALUE IF NOT EXISTS 'cycle_payment_registered';

-- 3) Colunas financeiras (mínimas) no ciclo
ALTER TABLE public.client_service_cycles
  ADD COLUMN IF NOT EXISTS payment_status public.cycle_payment_status NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS paid_amount_cents INTEGER,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_notes TEXT,
  ADD COLUMN IF NOT EXISTS payment_registered_by UUID;

ALTER TABLE public.client_service_cycles
  DROP CONSTRAINT IF EXISTS client_service_cycles_paid_amount_nonneg;
ALTER TABLE public.client_service_cycles
  ADD CONSTRAINT client_service_cycles_paid_amount_nonneg
  CHECK (paid_amount_cents IS NULL OR paid_amount_cents >= 0);

CREATE INDEX IF NOT EXISTS idx_client_service_cycles_payment_status
  ON public.client_service_cycles (payment_status);

-- 4) Backfill não-destrutivo ANTES de qualquer trigger que use o novo enum
UPDATE public.client_service_cycles
SET due_date = period_start
WHERE due_date IS NULL;

-- 5) Coerência dos campos financeiros + due_date padrão = period_start
CREATE OR REPLACE FUNCTION public.client_service_cycles_payment_coherence()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NEW.due_date IS NULL THEN
    NEW.due_date := NEW.period_start;
  END IF;

  IF NEW.payment_status = 'pago' THEN
    IF NEW.paid_amount_cents IS NULL THEN
      RAISE EXCEPTION 'Informe o valor recebido para marcar o ciclo como pago.'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.paid_at IS NULL THEN
      NEW.paid_at := now();
    END IF;
  ELSE
    NEW.paid_amount_cents := NULL;
    NEW.paid_at := NULL;
    NEW.payment_method := NULL;
  END IF;

  IF NEW.payment_notes IS NOT NULL AND btrim(NEW.payment_notes) = '' THEN
    NEW.payment_notes := NULL;
  END IF;
  IF NEW.payment_method IS NOT NULL AND btrim(NEW.payment_method) = '' THEN
    NEW.payment_method := NULL;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_client_service_cycles_payment_coherence ON public.client_service_cycles;
CREATE TRIGGER trg_client_service_cycles_payment_coherence
  BEFORE INSERT OR UPDATE ON public.client_service_cycles
  FOR EACH ROW EXECUTE FUNCTION public.client_service_cycles_payment_coherence();

-- 6) Registro imutável na timeline quando o pagamento muda
CREATE OR REPLACE FUNCTION public.log_cycle_payment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.paid_amount_cents IS DISTINCT FROM OLD.paid_amount_cents
     OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
     OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
     OR NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    INSERT INTO public.client_service_events
      (client_service_id, event_type, title, description, actor_id, metadata)
    VALUES (
      NEW.client_service_id,
      'cycle_payment_registered',
      'Pagamento do ciclo atualizado',
      format('Ciclo #%s: pagamento "%s" → "%s".', NEW.sequence, OLD.payment_status, NEW.payment_status),
      COALESCE(NEW.payment_registered_by, auth.uid()),
      jsonb_build_object(
        'cycle_id', NEW.id,
        'sequence', NEW.sequence,
        'from', OLD.payment_status,
        'to', NEW.payment_status,
        'amount_cents', NEW.amount_cents,
        'paid_amount_cents', NEW.paid_amount_cents,
        'paid_at', NEW.paid_at,
        'payment_method', NEW.payment_method,
        'due_date', NEW.due_date
      )
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log_cycle_payment_change ON public.client_service_cycles;
CREATE TRIGGER trg_log_cycle_payment_change
  AFTER UPDATE ON public.client_service_cycles
  FOR EACH ROW EXECUTE FUNCTION public.log_cycle_payment_change();