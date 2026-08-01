-- ============================================================
-- VOS-001B.2A — Produtos SaaS, Programa Beta e Backend de Anexos
-- ============================================================

-- 1) Enums
DO $$ BEGIN
    CREATE TYPE public.saas_product_status AS ENUM ('active', 'inactive', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.beta_program_status AS ENUM ('draft', 'planned', 'active', 'paused', 'completed', 'cancelled', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2) Tabela saas_products
CREATE TABLE IF NOT EXISTS public.saas_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status public.saas_product_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT saas_products_code_snake_case CHECK (code ~ '^[a-z0-9_]+$')
);

-- Trigger updated_at
CREATE TRIGGER trg_saas_products_updated_at
BEFORE UPDATE ON public.saas_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.saas_products ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.saas_products TO authenticated;
GRANT INSERT, UPDATE ON public.saas_products TO authenticated; -- Scoped by policies
GRANT ALL ON public.saas_products TO service_role;

CREATE POLICY "saas_products_read_all"
ON public.saas_products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "saas_products_admin_all"
ON public.saas_products FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) Tabela beta_programs
CREATE TABLE IF NOT EXISTS public.beta_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saas_product_id UUID NOT NULL REFERENCES public.saas_products(id) ON DELETE RESTRICT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status public.beta_program_status NOT NULL DEFAULT 'draft',
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    enrollment_starts_at TIMESTAMPTZ,
    enrollment_ends_at TIMESTAMPTZ,
    target_participants INTEGER CHECK (target_participants > 0),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    archived_at TIMESTAMPTZ,
    CONSTRAINT beta_programs_code_snake_case CHECK (code ~ '^[a-z0-9_]+$'),
    CONSTRAINT beta_programs_dates_check CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at),
    CONSTRAINT beta_programs_enrollment_dates_check CHECK (enrollment_ends_at IS NULL OR enrollment_starts_at IS NULL OR enrollment_ends_at >= enrollment_starts_at)
);

-- Trigger updated_at
CREATE TRIGGER trg_beta_programs_updated_at
BEFORE UPDATE ON public.beta_programs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.beta_programs ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.beta_programs TO authenticated;
GRANT INSERT, UPDATE ON public.beta_programs TO authenticated; -- Scoped by policies
GRANT ALL ON public.beta_programs TO service_role;

CREATE POLICY "beta_programs_read_all"
ON public.beta_programs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "beta_programs_admin_operator_write"
ON public.beta_programs FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));

-- 4) Tabela attachments (Genérica)
CREATE TABLE IF NOT EXISTS public.attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    bucket_name TEXT NOT NULL DEFAULT 'os-attachments',
    storage_path TEXT UNIQUE NOT NULL,
    original_filename TEXT NOT NULL,
    stored_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 20971520), -- 20MB
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- RLS
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.attachments TO authenticated;
GRANT INSERT ON public.attachments TO authenticated;
GRANT ALL ON public.attachments TO service_role;

CREATE POLICY "attachments_read_policy"
ON public.attachments FOR SELECT
TO authenticated
USING (deleted_at IS NULL); -- Final validation happens in server functions

CREATE POLICY "attachments_admin_read_all"
ON public.attachments FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5) Inserts iniciais (Idempotentes)
INSERT INTO public.saas_products (code, name, status, description)
VALUES (
    'valtro_pricing',
    'Valtro Pricing',
    'active',
    'Plataforma de precificação e análise financeira para vendedores de marketplaces.'
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.beta_programs (saas_product_id, code, name, status, created_by)
SELECT 
    id,
    'valtro_pricing_closed_beta',
    'Beta Fechado — Valtro Pricing',
    'draft',
    (SELECT id FROM auth.users WHERE email = 'rodrigomma@gmail.com' LIMIT 1) -- Use the known admin email
FROM public.saas_products 
WHERE code = 'valtro_pricing'
ON CONFLICT (code) DO NOTHING;

-- 6) Storage initialization (Bucket)
-- Nota: Supabase Storage configuration through SQL is limited but we ensure bucket existence
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'os-attachments',
    'os-attachments',
    false,
    20971520,
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/plain', 'application/json', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Storage Policies
CREATE POLICY "os_attachments_upload_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'os-attachments'); -- Scoped by server functions using signed URLs or direct control

CREATE POLICY "os_attachments_read_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'os-attachments'); -- Access controlled via signed URLs

