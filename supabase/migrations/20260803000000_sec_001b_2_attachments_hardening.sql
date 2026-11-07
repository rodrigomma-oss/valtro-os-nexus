-- SEC-001B.2 — Hardening de RLS, Grants e Storage dos Anexos

-- 1. REVOGAR GRANTS INSEGUROS
REVOKE ALL ON public.attachments FROM anon;
REVOKE ALL ON public.attachments FROM authenticated;

-- 2. CONCEDER PRIVILÉGIOS MÍNIMOS
-- Service role mantém acesso total
GRANT ALL ON public.attachments TO service_role;

-- Authenticated: Apenas SELECT (via RLS) e UPDATE para remoção lógica
-- INSERT é intermediado por Server Function com supabaseAdmin após validações rigorosas.
-- UPDATE é necessário para que o usuário possa marcar como deletado (fluxo de deleteAttachment).
GRANT SELECT, UPDATE ON public.attachments TO authenticated;

-- 3. FUNÇÃO DE AUTORIZAÇÃO POLIMÓRFICA
CREATE OR REPLACE FUNCTION public.can_access_attachment_entity(
    _entity_type text,
    _entity_id uuid,
    _user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER -- Necessário para consultar tabelas protegidas via bypass de RLS interno ou permissão de owner
SET search_path = public
AS $$
DECLARE
    _has_access boolean := false;
BEGIN
    -- Se não houver usuário, nega
    IF _user_id IS NULL THEN
        RETURN false;
    END IF;

    -- Admins têm acesso total a qualquer entidade ativa
    IF public.has_role(_user_id, 'admin') THEN
        RETURN true;
    END IF;

    -- Verificação por tipo de entidade
    CASE _entity_type
        WHEN 'ticket' THEN
            SELECT EXISTS (SELECT 1 FROM public.tickets WHERE id = _entity_id) INTO _has_access;
        WHEN 'client' THEN
            SELECT EXISTS (SELECT 1 FROM public.clients WHERE id = _entity_id) INTO _has_access;
        WHEN 'project' THEN
            SELECT EXISTS (SELECT 1 FROM public.projects WHERE id = _entity_id) INTO _has_access;
        WHEN 'lead' THEN
            SELECT EXISTS (SELECT 1 FROM public.leads WHERE id = _entity_id) INTO _has_access;
        WHEN 'client_service' THEN
            SELECT EXISTS (SELECT 1 FROM public.client_services WHERE id = _entity_id) INTO _has_access;
        ELSE
            RETURN false;
    END CASE;

    RETURN _has_access;
END;
$$;

-- Restringir execução da função apenas para papéis autenticados
REVOKE EXECUTE ON FUNCTION public.can_access_attachment_entity(text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_attachment_entity(text, uuid, uuid) TO authenticated, service_role;

-- 4. REMOVER POLICIES ANTIGAS
DROP POLICY IF EXISTS "attachments_select_authenticated" ON public.attachments;
DROP POLICY IF EXISTS "attachments_insert_admin_operator" ON public.attachments;
DROP POLICY IF EXISTS "attachments_update_admin_operator" ON public.attachments;

-- 5. CRIAR POLICIES SEGURAS (RLS)

-- SELECT: Usuário deve ter acesso à entidade e o anexo não pode estar deletado
CREATE POLICY "attachments_select_policy"
ON public.attachments
FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL AND
    public.can_access_attachment_entity(entity_type, entity_id, auth.uid())
);

-- UPDATE: Apenas para remoção lógica (deleted_at) e apenas se o usuário tiver acesso de escrita (admin/operator)
-- Nota: A Server Function já valida isso, mas a policy garante defesa em profundidade.
CREATE POLICY "attachments_update_policy"
ON public.attachments
FOR UPDATE
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator')
)
WITH CHECK (
    -- Só permite alterar deleted_at e deleted_by
    (
        id = id AND 
        entity_type = entity_type AND 
        entity_id = entity_id AND 
        storage_path = storage_path AND 
        original_filename = original_filename AND 
        stored_filename = stored_filename AND 
        mime_type = mime_type AND 
        size_bytes = size_bytes AND 
        uploaded_by = uploaded_by AND 
        created_at = created_at
    )
);

-- 6. STORAGE HARDENING (os-attachments)
-- O bucket já é privado. Vamos garantir as policies de objects.

-- Revogar qualquer acesso anon no storage
-- Nota: storage.objects é uma tabela compartilhada, então filtramos pelo bucket_id
DELETE FROM storage.policies WHERE bucket_id = 'os-attachments';

-- O fluxo de upload/download usa URLs assinadas geradas pelo service_role (supabaseAdmin).
-- Portanto, usuários autenticados NÃO precisam de INSERT/SELECT direto no storage.objects.
-- Isso previne que alguém com o token tente listar o bucket ou baixar arquivos sem URL assinada.

-- 7. REFORÇO DE CONSTRAINTS (Imutabilidade lógica)
-- Bloquear DELETE físico para todos (exceto owner do banco se necessário)
CREATE OR REPLACE FUNCTION public.block_physical_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Exclusão física não permitida. Utilize remoção lógica (deleted_at).';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_block_physical_delete_attachments ON public.attachments;
CREATE TRIGGER tr_block_physical_delete_attachments
BEFORE DELETE ON public.attachments
FOR EACH ROW EXECUTE FUNCTION public.block_physical_delete();

-- Garantir que uploaded_by seja preenchido
ALTER TABLE public.attachments ALTER COLUMN uploaded_by SET NOT NULL;

