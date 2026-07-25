-- Sprint 13.6 — Ciclos e recorrência das contratações (sem cobrança).

CREATE TYPE public.client_service_cycle_status AS ENUM ('previsto','ativo','concluido','cancelado');

ALTER TYPE public.client_service_event_type ADD VALUE IF NOT EXISTS 'cycle_created';
ALTER TYPE public.client_service_event_type ADD VALUE IF NOT EXISTS 'cycle_started';
ALTER TYPE public.client_service_event_type ADD VALUE IF NOT EXISTS 'cycle_completed';
ALTER TYPE public.client_service_event_type ADD VALUE IF NOT EXISTS 'cycle_cancelled';

CREATE TABLE public.client_service_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_service_id UUID NOT NULL REFERENCES public.client_services(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL CHECK (sequence >= 1),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  status public.client_service_cycle_status NOT NULL DEFAULT 'previsto',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT client_service_cycles_period_valid CHECK (period_end >= period_start),
  CONSTRAINT uq_cs_cycles_period UNIQUE (client_service_id, period_start),
  CONSTRAINT uq_cs_cycles_sequence UNIQUE (client_service_id, sequence)
);

CREATE INDEX idx_cs_cycles_client_service ON public.client_service_cycles (client_service_id, sequence DESC);

GRANT SELECT, INSERT, UPDATE ON public.client_service_cycles TO authenticated;
GRANT ALL ON public.client_service_cycles TO service_role;

ALTER TABLE public.client_service_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY cs_cycles_select_authenticated
  ON public.client_service_cycles FOR SELECT TO authenticated USING (true);

CREATE POLICY cs_cycles_insert_admin_operator
  ON public.client_service_cycles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));

CREATE POLICY cs_cycles_update_admin_operator
  ON public.client_service_cycles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));

-- Sem DELETE físico: ciclo cancelado permanece registrado.
CREATE OR REPLACE FUNCTION public.client_service_cycles_block_delete()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'Ciclos não podem ser excluídos; use o status cancelado.' USING ERRCODE = 'check_violation';
END $$;

CREATE TRIGGER trg_cs_cycles_block_delete
  BEFORE DELETE ON public.client_service_cycles
  FOR EACH ROW EXECUTE FUNCTION public.client_service_cycles_block_delete();

CREATE TRIGGER trg_cs_cycles_updated_at
  BEFORE UPDATE ON public.client_service_cycles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Elegibilidade + continuidade de sequência validadas no banco.
CREATE OR REPLACE FUNCTION public.client_service_cycles_validate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  _cs public.client_services%ROWTYPE;
  _max_seq INT;
BEGIN
  SELECT * INTO _cs FROM public.client_services WHERE id = NEW.client_service_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contratação % não encontrada.', NEW.client_service_id USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF _cs.billing_type_snapshot <> 'recorrente' OR _cs.billing_interval_snapshot IS NULL THEN
      RAISE EXCEPTION 'Somente contratações recorrentes com periodicidade definida possuem ciclos.'
        USING ERRCODE = 'check_violation';
    END IF;
    IF _cs.status <> 'ativo' THEN
      RAISE EXCEPTION 'Somente contratações ativas podem iniciar novos ciclos.'
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT COALESCE(MAX(sequence), 0) INTO _max_seq
      FROM public.client_service_cycles WHERE client_service_id = NEW.client_service_id;
    IF NEW.sequence <> _max_seq + 1 THEN
      RAISE EXCEPTION 'Sequência de ciclo inválida: esperado %.', _max_seq + 1
        USING ERRCODE = 'check_violation';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Snapshot financeiro e período são imutáveis.
    IF NEW.amount_cents IS DISTINCT FROM OLD.amount_cents
       OR NEW.period_start IS DISTINCT FROM OLD.period_start
       OR NEW.period_end IS DISTINCT FROM OLD.period_end
       OR NEW.sequence IS DISTINCT FROM OLD.sequence
       OR NEW.client_service_id IS DISTINCT FROM OLD.client_service_id THEN
      RAISE EXCEPTION 'Período, sequência e valor do ciclo são imutáveis.' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.status = 'ativo' AND OLD.status = 'previsto' AND NEW.started_at IS NULL THEN
      NEW.started_at := now();
    END IF;
    IF NEW.status = 'concluido' AND NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;
    IF NEW.status = 'cancelado' AND NEW.cancelled_at IS NULL THEN
      NEW.cancelled_at := now();
    END IF;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_cs_cycles_validate
  BEFORE INSERT OR UPDATE ON public.client_service_cycles
  FOR EACH ROW EXECUTE FUNCTION public.client_service_cycles_validate();

-- Timeline operacional da contratação.
CREATE OR REPLACE FUNCTION public.log_client_service_cycle_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  _type public.client_service_event_type;
  _title TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _type := 'cycle_created'; _title := 'Ciclo criado';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'ativo' THEN _type := 'cycle_started'; _title := 'Ciclo iniciado';
    ELSIF NEW.status = 'concluido' THEN _type := 'cycle_completed'; _title := 'Ciclo concluído';
    ELSIF NEW.status = 'cancelado' THEN _type := 'cycle_cancelled'; _title := 'Ciclo cancelado';
    ELSE RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.client_service_events (client_service_id, event_type, title, description, actor_id, metadata)
  VALUES (
    NEW.client_service_id, _type, _title,
    format('Ciclo #%s (%s a %s).', NEW.sequence,
           to_char(NEW.period_start,'DD/MM/YYYY'), to_char(NEW.period_end,'DD/MM/YYYY')),
    COALESCE(NEW.created_by, auth.uid()),
    jsonb_build_object(
      'cycle_id', NEW.id,
      'sequence', NEW.sequence,
      'period_start', NEW.period_start,
      'period_end', NEW.period_end,
      'amount_cents', NEW.amount_cents
    )
  );
  RETURN NEW;
END $$;

CREATE TRIGGER trg_cs_cycles_log
  AFTER INSERT OR UPDATE ON public.client_service_cycles
  FOR EACH ROW EXECUTE FUNCTION public.log_client_service_cycle_event();

REVOKE ALL ON FUNCTION public.client_service_cycles_block_delete() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.client_service_cycles_validate() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_client_service_cycle_event() FROM PUBLIC, anon, authenticated;