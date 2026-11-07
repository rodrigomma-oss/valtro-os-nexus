-- VOS-001D — Gestão de Bugs (Entidades e Enums)

-- 1. Enums
DO $$ BEGIN
    CREATE TYPE public.bug_status AS ENUM (
        'new',
        'confirmed',
        'in_progress',
        'waiting_deploy',
        'fixed',
        'closed',
        'wont_fix',
        'duplicate'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.bug_severity AS ENUM (
        'low',
        'normal',
        'high',
        'critical',
        'blocker'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.bug_category AS ENUM (
        'ui_ux',
        'backend',
        'frontend',
        'security',
        'performance',
        'localization',
        'data_integrity',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.bug_environment AS ENUM (
        'production',
        'staging',
        'development',
        'local'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.bug_event_type AS ENUM (
        'created',
        'status_changed',
        'severity_changed',
        'assigned',
        'fixed',
        'confirmed',
        'commented',
        'closed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Tabela bugs
CREATE TABLE IF NOT EXISTS public.bugs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    saas_product_id UUID NOT NULL REFERENCES public.saas_products(id) ON DELETE RESTRICT,
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE RESTRICT,
    reported_by UUID NOT NULL REFERENCES auth.users(id),
    owner_id UUID REFERENCES auth.users(id),
    status public.bug_status NOT NULL DEFAULT 'new',
    severity public.bug_severity NOT NULL DEFAULT 'normal',
    category public.bug_category NOT NULL DEFAULT 'other',
    environment public.bug_environment NOT NULL DEFAULT 'production',
    affected_version TEXT,
    fixed_version TEXT,
    request_id TEXT,
    external_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    confirmed_at TIMESTAMPTZ,
    fixed_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ
);

-- Trigger updated_at
CREATE TRIGGER trg_bugs_updated_at
BEFORE UPDATE ON public.bugs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sequence para o código BUG-000000
CREATE SEQUENCE IF NOT EXISTS bug_code_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_bug_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.code IS NULL THEN
        NEW.code := 'BUG-' || LPAD(nextval('bug_code_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bugs_generate_code
BEFORE INSERT ON public.bugs
FOR EACH ROW EXECUTE FUNCTION public.generate_bug_code();

-- 3. Tabela bug_events
CREATE TABLE IF NOT EXISTS public.bug_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bug_id UUID NOT NULL REFERENCES public.bugs(id) ON DELETE CASCADE,
    type public.bug_event_type NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. RLS e Grants
ALTER TABLE public.bugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_events ENABLE ROW LEVEL SECURITY;

-- PostgREST Data API access
GRANT SELECT ON public.bugs TO authenticated;
GRANT INSERT, UPDATE ON public.bugs TO authenticated;
GRANT SELECT ON public.bug_events TO authenticated;
GRANT INSERT ON public.bug_events TO authenticated;
GRANT ALL ON public.bugs TO service_role;
GRANT ALL ON public.bug_events TO service_role;

-- Policies bugs
CREATE POLICY "Admins can do everything on bugs"
ON public.bugs FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Operators can see all bugs"
ON public.bugs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'operator'));

CREATE POLICY "Operators can update assigned or reported bugs"
ON public.bugs FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'operator') AND (owner_id = auth.uid() OR reported_by = auth.uid()));

CREATE POLICY "Operators can insert bugs"
ON public.bugs FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'operator'));

CREATE POLICY "Viewers can see all bugs"
ON public.bugs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'viewer'));

-- Policies bug_events
CREATE POLICY "Anyone authenticated can see events of accessible bugs"
ON public.bug_events FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.bugs WHERE id = bug_events.bug_id));

CREATE POLICY "Admins and Operators can insert events"
ON public.bug_events FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));
