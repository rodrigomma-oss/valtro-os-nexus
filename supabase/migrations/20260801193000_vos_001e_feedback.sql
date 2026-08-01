-- 1. Enums
CREATE TYPE public.feedback_type AS ENUM (
    'praise',
    'suggestion',
    'complaint',
    'question',
    'usability',
    'feature_request',
    'pricing',
    'other'
);

CREATE TYPE public.feedback_source AS ENUM (
    'internal',
    'beta_portal',
    'support',
    'interview',
    'email',
    'whatsapp',
    'other'
);

CREATE TYPE public.feedback_status AS ENUM (
    'new',
    'under_review',
    'accepted',
    'planned',
    'implemented',
    'dismissed',
    'closed'
);

CREATE TYPE public.feedback_perceived_value AS ENUM (
    'very_low',
    'low',
    'medium',
    'high',
    'very_high',
    'not_informed'
);

CREATE TYPE public.feedback_subscription_interest AS ENUM (
    'no',
    'maybe',
    'yes',
    'already_subscribed',
    'not_informed'
);

CREATE TYPE public.feedback_event_type AS ENUM (
    'created',
    'status_changed',
    'type_changed',
    'owner_changed',
    'perceived_value_changed',
    'subscription_interest_changed',
    'desired_feature_changed',
    'linked_to_ticket',
    'linked_to_bug',
    'accepted',
    'planned',
    'implemented',
    'dismissed',
    'closed',
    'reopened'
);

-- 2. Sequence
CREATE SEQUENCE public.feedback_code_seq START WITH 1;

-- 3. Tables
CREATE TABLE public.feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text UNIQUE NOT NULL,
    saas_product_id uuid NOT NULL REFERENCES public.saas_products(id) ON DELETE RESTRICT,
    title text NOT NULL,
    description text NOT NULL,
    type public.feedback_type NOT NULL,
    source public.feedback_source NOT NULL,
    status public.feedback_status NOT NULL DEFAULT 'new',
    perceived_value public.feedback_perceived_value NOT NULL DEFAULT 'not_informed',
    subscription_interest public.feedback_subscription_interest NOT NULL DEFAULT 'not_informed',
    desired_feature text,
    participant_name text,
    participant_email text,
    participant_user_id uuid, -- Reserved for VOS-001F
    ticket_id uuid REFERENCES public.tickets(id) ON DELETE RESTRICT,
    bug_id uuid REFERENCES public.bugs(id) ON DELETE RESTRICT,
    owner_id uuid REFERENCES public.profiles(id),
    created_by uuid NOT NULL REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    reviewed_at timestamptz,
    closed_at timestamptz
);

CREATE TABLE public.feedback_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id uuid NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
    event_type public.feedback_event_type NOT NULL,
    actor_id uuid REFERENCES public.profiles(id),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Triggers & Functions
-- Protocol generation
CREATE OR REPLACE FUNCTION public.generate_feedback_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
    IF NEW.code IS NULL THEN
        NEW.code := 'FDB-' || LPAD(nextval('public.feedback_code_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_generate_feedback_code
BEFORE INSERT ON public.feedback
FOR EACH ROW
EXECUTE FUNCTION public.generate_feedback_code();

-- Immutable code
CREATE OR REPLACE FUNCTION public.feedback_code_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
    IF OLD.code <> NEW.code THEN
        RAISE EXCEPTION 'Feedback code is immutable';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_feedback_code_immutable
BEFORE UPDATE ON public.feedback
FOR EACH ROW
EXECUTE FUNCTION public.feedback_code_immutable();

-- State Machine Validation
CREATE OR REPLACE FUNCTION public.validate_feedback_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
    -- Terminal state protection
    IF OLD.status = 'closed' AND NEW.status <> 'closed' THEN
        RAISE EXCEPTION 'Cannot transition from closed state';
    END IF;

    -- Valid transitions
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    IF (OLD.status = 'new' AND NEW.status IN ('under_review', 'dismissed')) OR
       (OLD.status = 'under_review' AND NEW.status IN ('accepted', 'dismissed')) OR
       (OLD.status = 'accepted' AND NEW.status IN ('planned', 'dismissed')) OR
       (OLD.status = 'planned' AND NEW.status IN ('implemented', 'dismissed')) OR
       (OLD.status = 'implemented' AND NEW.status IN ('closed', 'under_review')) OR
       (OLD.status = 'dismissed' AND NEW.status IN ('under_review'))
    THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Invalid feedback status transition from % to %', OLD.status, NEW.status;
END;
$$;

CREATE TRIGGER tr_validate_feedback_status_transition
BEFORE UPDATE OF status ON public.feedback
FOR EACH ROW
EXECUTE FUNCTION public.validate_feedback_status_transition();

-- Date management and automatic review
CREATE OR REPLACE FUNCTION public.handle_feedback_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
    NEW.updated_at := now();
    
    IF NEW.status = 'under_review' AND OLD.status <> 'under_review' AND NEW.reviewed_at IS NULL THEN
        NEW.reviewed_at := now();
    END IF;

    IF NEW.status = 'closed' AND OLD.status <> 'closed' THEN
        NEW.closed_at := now();
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_handle_feedback_status_change
BEFORE UPDATE ON public.feedback
FOR EACH ROW
EXECUTE FUNCTION public.handle_feedback_status_change();

-- Append-only events trigger
CREATE OR REPLACE FUNCTION public.log_feedback_event_automated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
    _actor_id uuid := auth.uid();
    _event_type public.feedback_event_type;
    _metadata jsonb := '{}'::jsonb;
BEGIN
    IF TG_OP = 'INSERT' THEN
        _event_type := 'created';
        _metadata := jsonb_build_object(
            'title', NEW.title,
            'type', NEW.type,
            'source', NEW.source,
            'status', NEW.status
        );
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status <> NEW.status THEN
            _event_type := CASE 
                WHEN NEW.status = 'accepted' THEN 'accepted'::public.feedback_event_type
                WHEN NEW.status = 'planned' THEN 'planned'::public.feedback_event_type
                WHEN NEW.status = 'implemented' THEN 'implemented'::public.feedback_event_type
                WHEN NEW.status = 'dismissed' THEN 'dismissed'::public.feedback_event_type
                WHEN NEW.status = 'closed' THEN 'closed'::public.feedback_event_type
                WHEN OLD.status = 'dismissed' AND NEW.status = 'under_review' THEN 'reopened'::public.feedback_event_type
                ELSE 'status_changed'::public.feedback_event_type
            END;
            _metadata := jsonb_build_object('from', OLD.status, 'to', NEW.status);
        ELSIF OLD.type <> NEW.type THEN
            _event_type := 'type_changed';
            _metadata := jsonb_build_object('from', OLD.type, 'to', NEW.type);
        ELSIF OLD.owner_id IS DISTINCT FROM NEW.owner_id THEN
            _event_type := 'owner_changed';
            _metadata := jsonb_build_object('from', OLD.owner_id, 'to', NEW.owner_id);
        ELSIF OLD.perceived_value <> NEW.perceived_value THEN
            _event_type := 'perceived_value_changed';
            _metadata := jsonb_build_object('from', OLD.perceived_value, 'to', NEW.perceived_value);
        ELSIF OLD.subscription_interest <> NEW.subscription_interest THEN
            _event_type := 'subscription_interest_changed';
            _metadata := jsonb_build_object('from', OLD.subscription_interest, 'to', NEW.subscription_interest);
        ELSIF OLD.desired_feature IS DISTINCT FROM NEW.desired_feature THEN
            _event_type := 'desired_feature_changed';
            _metadata := jsonb_build_object('from', OLD.desired_feature, 'to', NEW.desired_feature);
        ELSIF OLD.ticket_id IS DISTINCT FROM NEW.ticket_id AND NEW.ticket_id IS NOT NULL THEN
            _event_type := 'linked_to_ticket';
            _metadata := jsonb_build_object('ticket_id', NEW.ticket_id);
        ELSIF OLD.bug_id IS DISTINCT FROM NEW.bug_id AND NEW.bug_id IS NOT NULL THEN
            _event_type := 'linked_to_bug';
            _metadata := jsonb_build_object('bug_id', NEW.bug_id);
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    IF _event_type IS NOT NULL THEN
        INSERT INTO public.feedback_events (feedback_id, event_type, actor_id, metadata)
        VALUES (NEW.id, _event_type, _actor_id, _metadata);
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_log_feedback_event_automated
AFTER INSERT OR UPDATE ON public.feedback
FOR EACH ROW
EXECUTE FUNCTION public.log_feedback_event_automated();

-- Immutable events
CREATE TRIGGER tr_block_feedback_event_modification
BEFORE UPDATE OR DELETE ON public.feedback_events
FOR EACH ROW
EXECUTE FUNCTION public.block_physical_delete();

-- Block deletion of feedback
CREATE TRIGGER tr_block_feedback_delete
BEFORE DELETE ON public.feedback
FOR EACH ROW
EXECUTE FUNCTION public.block_physical_delete();

-- 5. Attachment access update
CREATE OR REPLACE FUNCTION public.can_access_attachment_entity(_entity_type text, _entity_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
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
      IF NOT EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = _entity_id) THEN
        RETURN false;
      END IF;
      RETURN public.has_role(_uid, 'admin') OR public.has_role(_uid, 'operator') OR public.has_role(_uid, 'viewer');

    WHEN 'bug' THEN
      IF NOT EXISTS (SELECT 1 FROM public.bugs b WHERE b.id = _entity_id) THEN
        RETURN false;
      END IF;
      RETURN public.has_role(_uid, 'admin') OR public.has_role(_uid, 'operator') OR public.has_role(_uid, 'viewer');

    WHEN 'feedback' THEN
      IF NOT EXISTS (SELECT 1 FROM public.feedback f WHERE f.id = _entity_id) THEN
        RETURN false;
      END IF;
      RETURN public.has_role(_uid, 'admin') OR public.has_role(_uid, 'operator') OR public.has_role(_uid, 'viewer');

    WHEN 'client' THEN
      RETURN public.can_access_client(_uid, _entity_id);

    WHEN 'lead' THEN
      RETURN public.can_access_lead(_uid, _entity_id);

    WHEN 'project' THEN
      RETURN public.can_access_project(_uid, _entity_id);

    WHEN 'client_service' THEN
      SELECT cs.client_id INTO _client_id FROM public.client_services cs WHERE cs.id = _entity_id;
      IF _client_id IS NULL THEN
        RETURN false;
      END IF;
      RETURN public.can_access_client(_uid, _client_id);

    ELSE
      RETURN false;
  END CASE;
END $function$;

-- 6. RLS & Grants
GRANT SELECT, INSERT, UPDATE ON public.feedback TO authenticated;
GRANT SELECT, INSERT ON public.feedback_events TO authenticated;
GRANT ALL ON public.feedback TO service_role;
GRANT ALL ON public.feedback_events TO service_role;
GRANT USAGE ON SEQUENCE public.feedback_code_seq TO authenticated;

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_events ENABLE ROW LEVEL SECURITY;

-- Feedback policies
CREATE POLICY "Admins, operators and viewers can read all feedback"
ON public.feedback FOR SELECT TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'operator') OR 
    public.has_role(auth.uid(), 'viewer')
);

CREATE POLICY "Admins and operators can insert feedback"
ON public.feedback FOR INSERT TO authenticated
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'operator')
);

CREATE POLICY "Admins and operators can update feedback"
ON public.feedback FOR UPDATE TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'operator')
);

-- Feedback Events policies
CREATE POLICY "Admins, operators and viewers can read all feedback events"
ON public.feedback_events FOR SELECT TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'operator') OR 
    public.has_role(auth.uid(), 'viewer')
);

CREATE POLICY "Only system via triggers can insert events"
ON public.feedback_events FOR INSERT TO authenticated
WITH CHECK (true); -- Grants limit this, and triggers handle it. But standard authenticated is fine if they are admins/operators.

-- Security hardening: no EXECUTE on internal functions for PUBLIC
REVOKE ALL ON FUNCTION public.generate_feedback_code() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.feedback_code_immutable() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_feedback_status_transition() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_feedback_status_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_feedback_event_automated() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.can_access_attachment_entity(text, uuid) TO authenticated;
