
-- 1) Enums
CREATE TYPE public.lead_contact_channel AS ENUM ('whatsapp','email','telefone','reuniao','outro');
CREATE TYPE public.lead_contact_type    AS ENUM ('primeiro_contato','follow_up','envio_briefing','lembrete','apresentacao','proposta','outro');
CREATE TYPE public.lead_contact_result  AS ENUM ('sem_resposta','respondido','interessado','nao_interessado','agendado','concluido');

-- Extend lead_event_type
ALTER TYPE public.lead_event_type ADD VALUE IF NOT EXISTS 'contato_registrado';
ALTER TYPE public.lead_event_type ADD VALUE IF NOT EXISTS 'follow_up_agendado';
ALTER TYPE public.lead_event_type ADD VALUE IF NOT EXISTS 'follow_up_concluido';

-- 2) leads: follow-up columns
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS next_follow_up_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_follow_up_reason   TEXT,
  ADD COLUMN IF NOT EXISTS next_follow_up_owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_next_follow_up_at ON public.leads (next_follow_up_at);

-- 3) lead_contacts
CREATE TABLE public.lead_contacts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  channel     public.lead_contact_channel NOT NULL,
  type        public.lead_contact_type    NOT NULL,
  result      public.lead_contact_result  NOT NULL DEFAULT 'sem_resposta',
  notes       TEXT,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lead_contacts_notes_len CHECK (notes IS NULL OR char_length(notes) <= 2000)
);

CREATE INDEX idx_lead_contacts_lead_id ON public.lead_contacts (lead_id, created_at DESC);
CREATE INDEX idx_lead_contacts_created_by ON public.lead_contacts (created_by);

-- Profile FK for reading author name
ALTER TABLE public.lead_contacts
  ADD CONSTRAINT lead_contacts_created_by_profile_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_contacts TO authenticated;
GRANT ALL ON public.lead_contacts TO service_role;

ALTER TABLE public.lead_contacts ENABLE ROW LEVEL SECURITY;

-- SELECT: admin, viewer, or operator owner of the lead
CREATE POLICY "lead_contacts_select"
  ON public.lead_contacts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_contacts.lead_id
        AND (
          public.has_role(auth.uid(), 'admin')
          OR public.has_role(auth.uid(), 'viewer')
          OR (public.has_role(auth.uid(), 'operator') AND l.owner_id = auth.uid())
        )
    )
  );

-- INSERT: admin, or operator owner of the lead
CREATE POLICY "lead_contacts_insert"
  ON public.lead_contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_contacts.lead_id
        AND (
          public.has_role(auth.uid(), 'admin')
          OR (public.has_role(auth.uid(), 'operator') AND l.owner_id = auth.uid())
        )
    )
    AND (created_by = auth.uid() OR created_by IS NULL)
  );

-- UPDATE: admin, or operator author of the row
CREATE POLICY "lead_contacts_update"
  ON public.lead_contacts FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'operator') AND created_by = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'operator') AND created_by = auth.uid())
  );

-- DELETE: admin, or operator author of the row
CREATE POLICY "lead_contacts_delete"
  ON public.lead_contacts FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'operator') AND created_by = auth.uid())
  );

-- updated_at trigger
CREATE TRIGGER update_lead_contacts_updated_at
  BEFORE UPDATE ON public.lead_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Trigger: log lead_contact insert into lead_events
CREATE OR REPLACE FUNCTION public.log_lead_contact_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _channel_label TEXT;
  _type_label    TEXT;
BEGIN
  _channel_label := CASE NEW.channel
    WHEN 'whatsapp' THEN 'WhatsApp'
    WHEN 'email'    THEN 'E-mail'
    WHEN 'telefone' THEN 'Telefone'
    WHEN 'reuniao'  THEN 'Reunião'
    ELSE 'Outro'
  END;
  _type_label := CASE NEW.type
    WHEN 'primeiro_contato' THEN 'Primeiro contato'
    WHEN 'follow_up'        THEN 'Follow-up'
    WHEN 'envio_briefing'   THEN 'Envio de briefing'
    WHEN 'lembrete'         THEN 'Lembrete'
    WHEN 'apresentacao'     THEN 'Apresentação'
    WHEN 'proposta'         THEN 'Proposta'
    ELSE 'Outro'
  END;

  INSERT INTO public.lead_events (lead_id, type, description, created_by, metadata)
  VALUES (
    NEW.lead_id,
    'contato_registrado',
    format('Contato registrado (%s · %s).', _channel_label, _type_label),
    NEW.created_by,
    jsonb_build_object('contact_id', NEW.id, 'channel', NEW.channel, 'type', NEW.type, 'result', NEW.result)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_lead_contact_created
  AFTER INSERT ON public.lead_contacts
  FOR EACH ROW EXECUTE FUNCTION public.log_lead_contact_created();

-- 5) Trigger: log follow-up changes on leads
CREATE OR REPLACE FUNCTION public.log_lead_follow_up_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.next_follow_up_at IS DISTINCT FROM OLD.next_follow_up_at THEN
    IF NEW.next_follow_up_at IS NULL AND OLD.next_follow_up_at IS NOT NULL THEN
      INSERT INTO public.lead_events (lead_id, type, description, created_by, metadata)
      VALUES (
        NEW.id,
        'follow_up_concluido',
        'Follow-up concluído.',
        auth.uid(),
        jsonb_build_object('previous_at', OLD.next_follow_up_at)
      );
    ELSE
      INSERT INTO public.lead_events (lead_id, type, description, created_by, metadata)
      VALUES (
        NEW.id,
        'follow_up_agendado',
        format('Follow-up agendado para %s.', to_char(NEW.next_follow_up_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')),
        auth.uid(),
        jsonb_build_object(
          'next_follow_up_at', NEW.next_follow_up_at,
          'reason', NEW.next_follow_up_reason,
          'owner_id', NEW.next_follow_up_owner_id
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_lead_follow_up_change
  AFTER UPDATE OF next_follow_up_at ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.log_lead_follow_up_change();
