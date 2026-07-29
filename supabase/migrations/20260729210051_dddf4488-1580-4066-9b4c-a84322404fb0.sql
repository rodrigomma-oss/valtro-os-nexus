CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
      AND (
        _user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur2
          WHERE ur2.user_id = auth.uid() AND ur2.role = 'admin'
        )
        OR auth.uid() IS NULL
      )
  );
$$;

CREATE TABLE public.user_admin_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('invite','role_change','block','unblock','delete','resend_invite','cancel_invite')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.user_admin_audit_events TO authenticated;
GRANT ALL ON public.user_admin_audit_events TO service_role;

ALTER TABLE public.user_admin_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit events"
ON public.user_admin_audit_events FOR SELECT
TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit events"
ON public.user_admin_audit_events FOR INSERT
TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

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
AS $$
DECLARE
    _event_id uuid;
BEGIN
    INSERT INTO public.user_admin_audit_events (actor_id, target_user_id, action, metadata)
    VALUES (_actor_id, _target_user_id, _action, _metadata)
    RETURNING id INTO _event_id;
    RETURN _event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_roles_protect_admins()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _admin_count int;
BEGIN
    IF TG_OP = 'DELETE' AND OLD.role = 'admin' THEN
        SELECT count(*) INTO _admin_count FROM public.user_roles WHERE role = 'admin';
        IF _admin_count <= 1 THEN
            RAISE EXCEPTION 'Não é possível remover o último administrador do sistema.';
        END IF;
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.role = 'admin' AND NEW.role != 'admin' THEN
        SELECT count(*) INTO _admin_count FROM public.user_roles WHERE role = 'admin';
        IF _admin_count <= 1 THEN
            RAISE EXCEPTION 'Não é possível rebaixar o último administrador do sistema.';
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS user_roles_protect_admins ON public.user_roles;
CREATE TRIGGER user_roles_protect_admins
BEFORE DELETE OR UPDATE OF role ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.user_roles_protect_admins();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _assigned_role public.app_role;
    _role_from_meta text;
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;

    _role_from_meta := NEW.raw_user_meta_data->>'role';
    IF _role_from_meta IN ('admin', 'operator', 'viewer') THEN
        _assigned_role := _role_from_meta::public.app_role;
    ELSIF lower(NEW.email) = lower('rodrigomma@gmail.com') THEN
        _assigned_role := 'admin';
    ELSE
        _assigned_role := 'viewer';
    END IF;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _assigned_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN NEW;
END;
$$;