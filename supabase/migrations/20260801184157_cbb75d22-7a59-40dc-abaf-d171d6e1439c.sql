-- VOS-001D.1 — Correção da Fundação e Backend de Bugs

-- 1. Correção do Código e Sequence
-- Garante que comece em 1 para gerar BUG-000001
ALTER SEQUENCE IF EXISTS public.bug_code_seq RESTART WITH 1;

-- 2. Correção das Políticas de RLS (Evolução para Sprint 1)
-- Remove restrição de ownership para leitura conforme VOS-001D.1
DROP POLICY IF EXISTS "Operators can see all bugs" ON public.bugs;
DROP POLICY IF EXISTS "Operators can update assigned or reported bugs" ON public.bugs;
DROP POLICY IF EXISTS "Operators can insert bugs" ON public.bugs;

-- Políticas de Leitura (Explícitas por Role, sem ownership global nesta sprint)
CREATE POLICY "Admins can select all bugs" 
ON public.bugs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Operators can select all bugs" 
ON public.bugs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'operator'));

CREATE POLICY "Viewers can select all bugs" 
ON public.bugs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'viewer'));

-- Políticas de Escrita (Admin e Operator)
CREATE POLICY "Admins and Operators can insert bugs" 
ON public.bugs FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));

CREATE POLICY "Admins and Operators can update bugs" 
ON public.bugs FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));

-- 3. Máquina de Estados e Hardening de Tabelas
-- Bloqueio de DELETE físico (já coberto por falta de policies de DELETE, mas adicionando trigger de segurança)
CREATE OR REPLACE FUNCTION public.block_bug_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Exclusão física de bugs não é permitida. Use status closed/rejected.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bugs_block_delete
BEFORE DELETE ON public.bugs
FOR EACH ROW EXECUTE FUNCTION public.block_bug_delete();

-- Auditoria de FKs e Índices
CREATE INDEX IF NOT EXISTS idx_bugs_request_id ON public.bugs(request_id);
CREATE INDEX IF NOT EXISTS idx_bugs_status ON public.bugs(status);
CREATE INDEX IF NOT EXISTS idx_bugs_code ON public.bugs(code);

-- 4. Bug Events Hardening (Append-only)
CREATE OR REPLACE FUNCTION public.block_bug_event_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Eventos de bug são imutáveis (append-only).';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bug_events_immutable
BEFORE UPDATE OR DELETE ON public.bug_events
FOR EACH ROW EXECUTE FUNCTION public.block_bug_event_modification();

-- 5. Status Transitions e Automatização
CREATE OR REPLACE FUNCTION public.handle_bug_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Validação de fixed_version
    IF NEW.status = 'fixed' AND NEW.fixed_version IS NULL THEN
        RAISE EXCEPTION 'A versão de correção (fixed_version) é obrigatória para o status fixed.';
    END IF;

    -- Datas automáticas
    IF NEW.status = 'fixed' AND OLD.status != 'fixed' THEN
        NEW.fixed_at := now();
    ELSIF NEW.status != 'fixed' AND OLD.status = 'fixed' THEN
        NEW.fixed_at := NULL;
    END IF;

    IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
        NEW.closed_at := now();
    ELSIF NEW.status != 'closed' AND OLD.status = 'closed' THEN
        NEW.closed_at := NULL;
    END IF;

    IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
        NEW.confirmed_at := now();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bugs_status_handler
BEFORE UPDATE ON public.bugs
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.handle_bug_status_change();
