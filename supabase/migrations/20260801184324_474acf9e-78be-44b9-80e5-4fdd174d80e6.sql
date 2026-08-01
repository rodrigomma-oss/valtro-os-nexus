-- VOS-001D.1 — Hardening de Eventos e Máquina de Estados Final

-- 1. Máquina de Estados (Transições permitidas e rejeitadas)
CREATE OR REPLACE FUNCTION public.validate_bug_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- Rejected é terminal
    IF OLD.status = 'wont_fix' OR OLD.status = 'duplicate' THEN
        RAISE EXCEPTION 'O bug está em estado terminal (%) e não pode ser alterado.', OLD.status;
    END IF;

    -- Validar transições específicas
    -- new -> confirmed, wont_fix, duplicate
    IF OLD.status = 'new' AND NEW.status NOT IN ('confirmed', 'wont_fix', 'duplicate', 'in_progress') THEN
        RAISE EXCEPTION 'Transição inválida de new para %.', NEW.status;
    END IF;

    -- fixed -> closed, in_progress
    IF OLD.status = 'fixed' AND NEW.status NOT IN ('closed', 'in_progress') THEN
        RAISE EXCEPTION 'Transição inválida de fixed para %.', NEW.status;
    END IF;

    -- closed -> in_progress (reabertura explícita)
    IF OLD.status = 'closed' AND NEW.status != 'in_progress' THEN
        RAISE EXCEPTION 'Bugs fechados só podem ser reabertos para in_progress.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bugs_status_transition
BEFORE UPDATE ON public.bugs
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.validate_bug_status_transition();

-- 2. Trigger para Eventos Automáticos (Hardening)
CREATE OR REPLACE FUNCTION public.log_bug_event_automated()
RETURNS TRIGGER AS $$
DECLARE
    v_type public.bug_event_type;
    v_metadata JSONB := '{}';
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.bug_events (bug_id, type, created_by, metadata)
        VALUES (NEW.id, 'created', auth.uid(), jsonb_build_object('initial', row_to_json(NEW)));
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_type := 'status_changed';
            IF NEW.status = 'fixed' THEN v_type := 'fixed'; END IF;
            IF NEW.status = 'closed' THEN v_type := 'closed'; END IF;
            IF OLD.status = 'closed' AND NEW.status = 'in_progress' THEN v_type := 'commented'; v_metadata := '{"action": "reopened"}'; END IF;
            
            INSERT INTO public.bug_events (bug_id, type, created_by, metadata)
            VALUES (NEW.id, v_type, auth.uid(), jsonb_build_object('from', OLD.status, 'to', NEW.status) || v_metadata);
        END IF;

        IF OLD.severity IS DISTINCT FROM NEW.severity THEN
            INSERT INTO public.bug_events (bug_id, type, created_by, metadata)
            VALUES (NEW.id, 'severity_changed', auth.uid(), jsonb_build_object('from', OLD.severity, 'to', NEW.severity));
        END IF;

        IF OLD.owner_id IS DISTINCT FROM NEW.owner_id THEN
            INSERT INTO public.bug_events (bug_id, type, created_by, metadata)
            VALUES (NEW.id, 'assigned', auth.uid(), jsonb_build_object('from', OLD.owner_id, 'to', NEW.owner_id));
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bugs_audit_events
AFTER INSERT OR UPDATE ON public.bugs
FOR EACH ROW EXECUTE FUNCTION public.log_bug_event_automated();
