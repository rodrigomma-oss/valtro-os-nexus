-- 1) Snapshot imutável de identidade na trilha de auditoria
ALTER TABLE public.user_admin_audit_events
  ADD COLUMN IF NOT EXISTS actor_email  text,
  ADD COLUMN IF NOT EXISTS actor_name   text,
  ADD COLUMN IF NOT EXISTS target_email text,
  ADD COLUMN IF NOT EXISTS target_name  text;

-- 2) Restringe as ações auditáveis: 'delete' deixa de existir no domínio
ALTER TABLE public.user_admin_audit_events
  DROP CONSTRAINT IF EXISTS user_admin_audit_events_action_check;

ALTER TABLE public.user_admin_audit_events
  ADD CONSTRAINT user_admin_audit_events_action_check
  CHECK (action IN ('invite', 'role_change', 'block', 'unblock')) NOT VALID;

-- 3) log_user_admin_event passa a persistir os snapshots de identidade
CREATE OR REPLACE FUNCTION public.log_user_admin_event(
  _actor_id uuid,
  _target_user_id uuid,
  _action text,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    _event_id uuid;
    _actor_email text;
    _actor_name text;
    _target_email text;
    _target_name text;
BEGIN
    IF _action NOT IN ('invite', 'role_change', 'block', 'unblock') THEN
        RAISE EXCEPTION 'Ação de auditoria não suportada: %', _action
          USING ERRCODE = 'check_violation';
    END IF;

    SELECT u.email INTO _actor_email FROM auth.users u WHERE u.id = _actor_id;
    SELECT p.full_name INTO _actor_name FROM public.profiles p WHERE p.id = _actor_id;

    IF _target_user_id IS NOT NULL THEN
        SELECT u.email INTO _target_email FROM auth.users u WHERE u.id = _target_user_id;
        SELECT p.full_name INTO _target_name FROM public.profiles p WHERE p.id = _target_user_id;
    END IF;

    INSERT INTO public.user_admin_audit_events (
        actor_id, target_user_id, action, metadata,
        actor_email, actor_name, target_email, target_name
    )
    VALUES (
        _actor_id, _target_user_id, _action, COALESCE(_metadata, '{}'::jsonb),
        _actor_email, _actor_name, _target_email, _target_name
    )
    RETURNING id INTO _event_id;

    RETURN _event_id;
END;
$function$;

-- 4) Defesa em profundidade: torna a exclusão física de usuários impossível.
--    profiles e user_roles deixam de cascatear; qualquer DELETE em auth.users falha.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;