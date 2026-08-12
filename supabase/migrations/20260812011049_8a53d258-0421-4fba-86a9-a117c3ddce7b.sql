-- OPS-AUTH-002 — BLOCO 3 — GATE DE ADMISSÃO E PROVISIONAMENTO SEGURO
-- Objetivo: Impedir admissão automática de usuários não convidados.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bootstrap_email TEXT := 'rodrigomma@gmail.com';
  _assigned_role public.app_role;
  _meta_role TEXT;
BEGIN
  -- 1. Criar perfil básico (identidade)
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Determinar papel (autorização)
  -- Prioridade 1: Bootstrap Admin
  IF lower(NEW.email) = lower(_bootstrap_email) THEN
    _assigned_role := 'admin';
  
  -- Prioridade 2: Metadados de convite administrativo
  ELSE
    _meta_role := NEW.raw_user_meta_data->>'role';
    
    IF _meta_role IS NOT NULL AND _meta_role IN ('admin', 'operator', 'viewer') THEN
      _assigned_role := _meta_role::public.app_role;
    ELSE
      -- Fallback: NENHUMA role. O usuário existe em auth.users mas não tem acesso ao CRM.
      _assigned_role := NULL;
    END IF;
  END IF;

  -- 3. Inserir papel se houver autorização explícita
  IF _assigned_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _assigned_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;