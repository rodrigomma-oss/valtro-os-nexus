-- 1. Campos obrigatórios (tabela vazia; nenhum dado afetado)
ALTER TABLE public.tickets
  ALTER COLUMN description SET NOT NULL,
  ALTER COLUMN product_id SET NOT NULL;

ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_title_not_blank CHECK (btrim(title) <> ''),
  ADD CONSTRAINT tickets_description_not_blank CHECK (btrim(description) <> ''),
  ADD CONSTRAINT tickets_protocol_format CHECK (protocol ~ '^TCK-[0-9]{6,}$');

-- 2. Protocolo: sempre gerado no banco, ignorando valor vindo do cliente, e imutável
CREATE OR REPLACE FUNCTION public.generate_ticket_protocol()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Protocolo é sempre gerado pelo banco; qualquer valor enviado é descartado.
  NEW.protocol := 'TCK-' || lpad(nextval('public.ticket_protocol_seq')::text, 6, '0');
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.tickets_protocol_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.protocol IS DISTINCT FROM OLD.protocol THEN
    RAISE EXCEPTION 'O protocolo do chamado é imutável.' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Dados de criação do chamado são imutáveis.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS tickets_protocol_immutable_trg ON public.tickets;
CREATE TRIGGER tickets_protocol_immutable_trg
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.tickets_protocol_immutable();

-- 3. Máquina de estados
CREATE OR REPLACE FUNCTION public.ticket_transition_allowed(_from ticket_status, _to ticket_status)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT CASE
    WHEN _from = _to THEN false
    WHEN _from = 'open'             AND _to IN ('waiting_customer','waiting_internal','resolved','closed','cancelled') THEN true
    WHEN _from = 'waiting_customer' AND _to IN ('open','waiting_internal','resolved','closed','cancelled') THEN true
    WHEN _from = 'waiting_internal' AND _to IN ('open','waiting_customer','resolved','closed','cancelled') THEN true
    WHEN _from = 'resolved'         AND _to IN ('open','closed','cancelled') THEN true
    WHEN _from = 'closed'           AND _to = 'open' THEN true
    ELSE false
  END
$function$;

CREATE OR REPLACE FUNCTION public.tickets_validate_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT public.ticket_transition_allowed(OLD.status, NEW.status) THEN
    RAISE EXCEPTION 'Transição de status inválida: % -> %.', OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS tickets_validate_transition_trg ON public.tickets;
CREATE TRIGGER tickets_validate_transition_trg
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.tickets_validate_transition();

-- 4. closed_at coerente: apenas encerrado/cancelado
CREATE OR REPLACE FUNCTION public.tickets_sync_dates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.title := btrim(NEW.title);
  NEW.description := btrim(NEW.description);
  IF NEW.status IN ('closed','cancelled') THEN
    NEW.closed_at := COALESCE(NEW.closed_at, now());
  ELSE
    NEW.closed_at := NULL;
  END IF;
  RETURN NEW;
END $function$;

-- 5. Grants mínimos explícitos
REVOKE ALL ON public.tickets FROM anon;
REVOKE ALL ON public.ticket_events FROM anon;
REVOKE ALL ON public.ticket_protocol_seq FROM anon;
REVOKE ALL ON public.tickets FROM authenticated;
REVOKE ALL ON public.ticket_events FROM authenticated;
REVOKE ALL ON public.ticket_protocol_seq FROM authenticated;

GRANT SELECT, INSERT, UPDATE ON public.tickets TO authenticated;
GRANT SELECT, INSERT ON public.ticket_events TO authenticated;
GRANT ALL ON public.tickets TO service_role;
GRANT ALL ON public.ticket_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.ticket_protocol_seq TO service_role;
