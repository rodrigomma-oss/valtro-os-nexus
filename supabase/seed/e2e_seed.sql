-- =====================================================================
-- SEED IDEMPOTENTE — AMBIENTE DEV / E2E DA VALTRO LABS
-- =====================================================================
-- Este arquivo é aplicado EXCLUSIVAMENTE no projeto Lovable de
-- desenvolvimento (valtro-vision-forge-dev). NÃO deve ser executado
-- no banco de produção sob nenhuma circunstância.
--
-- Objetivo:
--   - Garantir a existência de um Lead permanente para os testes E2E
--     (TEST_LEAD_ID fixo), com dados claramente marcados como fictícios.
--   - Estabelecer o vínculo com o operador E2E (via handle_new_user).
--
-- Idempotência:
--   - Todas as instruções usam ON CONFLICT DO NOTHING / DO UPDATE.
--   - Pode ser reexecutado a cada deploy sem duplicar registros.
--
-- Usuário E2E:
--   O usuário e2e@valtrolabs.dev deve ser criado UMA vez via Auth
--   (fluxo padrão de signup) no ambiente dev. O trigger handle_new_user
--   cria o profile automaticamente. Este seed NÃO cria usuários no
--   schema auth — isso é feito pela plataforma.
-- =====================================================================

-- Lead permanente de E2E ----------------------------------------------
INSERT INTO public.leads (
  id,
  contact_name,
  company_name,
  email,
  phone,
  status,
  origin,
  segment,
  notes,
  created_by,
  owner_id
) VALUES (
  '00000000-0000-0000-0000-00000000e2e0'::uuid,
  '[E2E] Contato de Teste',
  '[E2E] Valtro QA Fixture',
  'e2e-lead@valtrolabs.dev',
  '11999990000',
  'novo',
  'site',
  'tecnologia',
  'Registro fictício mantido exclusivamente para a suíte E2E. NÃO REMOVER.',
  NULL,
  NULL
)
ON CONFLICT (id) DO UPDATE
SET contact_name = EXCLUDED.contact_name,
    company_name = EXCLUDED.company_name,
    notes = EXCLUDED.notes;

-- Marcador de origem no timeline (opcional / idempotente) --------------
INSERT INTO public.lead_events (lead_id, type, description, metadata)
SELECT
  '00000000-0000-0000-0000-00000000e2e0'::uuid,
  'lead_criado',
  'Lead criado pelo seed E2E (ambiente dev).',
  jsonb_build_object('source', 'e2e_seed')
WHERE NOT EXISTS (
  SELECT 1 FROM public.lead_events
  WHERE lead_id = '00000000-0000-0000-0000-00000000e2e0'::uuid
    AND metadata->>'source' = 'e2e_seed'
);
