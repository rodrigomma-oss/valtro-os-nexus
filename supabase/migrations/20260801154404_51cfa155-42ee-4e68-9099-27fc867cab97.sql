-- SEC-001F — Hardening final dos anexos (isolado; sem revisão geral de SECURITY DEFINER)

-- 1) Remove a policy dependente antes de trocar a assinatura da função.
DROP POLICY IF EXISTS attachments_select_policy ON public.attachments;
DROP POLICY IF EXISTS attachments_update_policy ON public.attachments;

-- 2) Função antiga (assinatura com _user_id arbitrário) é eliminada.
DROP FUNCTION IF EXISTS public.can_access_attachment_entity(text, uuid, uuid);

-- 3) Nova função: identidade exclusivamente de auth.uid(); regra real por domínio.
CREATE OR REPLACE FUNCTION public.can_access_attachment_entity(_entity_type text, _entity_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
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
      -- Regra aprovada para Chamados: papéis internos (admin/operator/viewer).
      IF NOT EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = _entity_id) THEN
        RETURN false;
      END IF;
      RETURN public.has_role(_uid, 'admin')
          OR public.has_role(_uid, 'operator')
          OR public.has_role(_uid, 'viewer');

    WHEN 'client' THEN
      RETURN public.can_access_client(_uid, _entity_id);

    WHEN 'lead' THEN
      RETURN public.can_access_lead(_uid, _entity_id);

    WHEN 'project' THEN
      RETURN public.can_access_project(_uid, _entity_id);

    WHEN 'client_service' THEN
      SELECT cs.client_id INTO _client_id
        FROM public.client_services cs
       WHERE cs.id = _entity_id;
      IF _client_id IS NULL THEN
        RETURN false;
      END IF;
      RETURN public.can_access_client(_uid, _client_id);

    ELSE
      RETURN false;
  END CASE;
END;
$function$;

ALTER FUNCTION public.can_access_attachment_entity(text, uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.can_access_attachment_entity(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_attachment_entity(text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_access_attachment_entity(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_attachment_entity(text, uuid) TO service_role;

-- 4) Policy de SELECT: apenas registros ativos e entidade realmente acessível.
CREATE POLICY attachments_select_policy
  ON public.attachments
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.can_access_attachment_entity(entity_type, entity_id)
  );

-- 5) UPDATE direto pelo navegador eliminado (remoção lógica só via Server Function).
REVOKE UPDATE, INSERT, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.attachments FROM authenticated;
REVOKE ALL ON public.attachments FROM anon;
GRANT SELECT ON public.attachments TO authenticated;
GRANT ALL ON public.attachments TO service_role;

-- 6) Remoção lógica idempotente: registro já removido não pode ser removido novamente
--    e campos imutáveis não podem ser reatribuídos nem pelo backend.
CREATE OR REPLACE FUNCTION public.attachments_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.entity_type IS DISTINCT FROM OLD.entity_type
     OR NEW.entity_id IS DISTINCT FROM OLD.entity_id
     OR NEW.storage_path IS DISTINCT FROM OLD.storage_path
     OR NEW.original_filename IS DISTINCT FROM OLD.original_filename
     OR NEW.stored_filename IS DISTINCT FROM OLD.stored_filename
     OR NEW.mime_type IS DISTINCT FROM OLD.mime_type
     OR NEW.size_bytes IS DISTINCT FROM OLD.size_bytes
     OR NEW.uploaded_by IS DISTINCT FROM OLD.uploaded_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.metadata IS DISTINCT FROM OLD.metadata THEN
    RAISE EXCEPTION 'Metadados de anexo são imutáveis.' USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Anexo já removido.' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.deleted_at IS NULL OR NEW.deleted_by IS NULL THEN
    RAISE EXCEPTION 'Remoção lógica exige deleted_at e deleted_by.' USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tr_attachments_guard_update ON public.attachments;
CREATE TRIGGER tr_attachments_guard_update
  BEFORE UPDATE ON public.attachments
  FOR EACH ROW EXECUTE FUNCTION public.attachments_guard_update();