-- OPS-INT-002B: Associação entre API Application e saas_products
-- Objetivo: Permitir que uma aplicação da API seja vinculada a um produto SaaS específico para descoberta automática de contexto.

BEGIN;

-- 1. Adicionar a coluna product_id na tabela api_applications
-- Usamos UUID pois saas_products utiliza UUID como PK (padrão do projeto).
-- ON DELETE RESTRICT garante que não possamos deletar um produto que ainda possui aplicações vinculadas.
ALTER TABLE public.api_applications
ADD COLUMN IF NOT EXISTS saas_product_id UUID REFERENCES public.saas_products(id) ON DELETE RESTRICT;

-- 2. Index para performance em lookups de contexto de produto
CREATE INDEX IF NOT EXISTS idx_api_applications_saas_product_id ON public.api_applications(saas_product_id);

-- 3. Comentários para documentação do schema
COMMENT ON COLUMN public.api_applications.saas_product_id IS 'Vínculo opcional com um produto SaaS para descoberta automática de contexto em endpoints de domínio.';

-- 4. Grants (Garantir que as roles administrativas continuem tendo acesso total)
GRANT SELECT, INSERT, UPDATE ON public.api_applications TO authenticated;
GRANT ALL ON public.api_applications TO service_role;

COMMIT;