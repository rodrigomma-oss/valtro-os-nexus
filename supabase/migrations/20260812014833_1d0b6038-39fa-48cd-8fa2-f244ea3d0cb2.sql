-- 1. search_path fixo
ALTER FUNCTION public.enforce_api_immutability() SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = pg_catalog, public, pg_temp;

-- 2. Revoga EXECUTE de anon/authenticated em TODAS as funções public,
--    reconcedendo apenas as que o app realmente chama diretamente.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon, authenticated', r.sig);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_client(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_lead(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_project(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_onboarding(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_attachment_entity(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_lead_to_client(uuid) TO authenticated;

-- 3. feedback_events: nada de INSERT por usuário; apenas triggers (SECURITY DEFINER) e service_role
DROP POLICY IF EXISTS "Only system via triggers can insert events" ON public.feedback_events;
REVOKE INSERT, UPDATE, DELETE ON public.feedback_events FROM anon, authenticated;

-- 4. onboarding_responses / briefing_responses: gravação exclusivamente server-side
REVOKE INSERT, UPDATE, DELETE ON public.onboarding_responses FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.briefing_responses FROM anon, authenticated;
REVOKE ALL ON public.onboarding_responses FROM anon;
REVOKE ALL ON public.briefing_responses FROM anon;

-- 5. storage.objects: policies de propriedade para o bucket privado os-attachments
DROP POLICY IF EXISTS "os_attachments_select_authorized" ON storage.objects;
DROP POLICY IF EXISTS "os_attachments_insert_authorized" ON storage.objects;
DROP POLICY IF EXISTS "os_attachments_update_authorized" ON storage.objects;
DROP POLICY IF EXISTS "os_attachments_delete_authorized" ON storage.objects;

CREATE POLICY "os_attachments_select_authorized"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'os-attachments'
  AND EXISTS (
    SELECT 1 FROM public.attachments a
    WHERE a.storage_path = storage.objects.name
      AND a.deleted_at IS NULL
      AND public.can_access_attachment_entity(a.entity_type::text, a.entity_id)
  )
);

CREATE POLICY "os_attachments_insert_authorized"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'os-attachments'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'operator'::public.app_role)
  )
);

CREATE POLICY "os_attachments_update_authorized"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'os-attachments'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'operator'::public.app_role)
  )
  AND EXISTS (
    SELECT 1 FROM public.attachments a
    WHERE a.storage_path = storage.objects.name
      AND public.can_access_attachment_entity(a.entity_type::text, a.entity_id)
  )
)
WITH CHECK (bucket_id = 'os-attachments');

CREATE POLICY "os_attachments_delete_authorized"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'os-attachments'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'operator'::public.app_role)
  )
  AND EXISTS (
    SELECT 1 FROM public.attachments a
    WHERE a.storage_path = storage.objects.name
      AND public.can_access_attachment_entity(a.entity_type::text, a.entity_id)
  )
);