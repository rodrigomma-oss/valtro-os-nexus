-- 1) Enum completion
ALTER TYPE public.bug_status ADD VALUE IF NOT EXISTS 'triage' AFTER 'new';
ALTER TYPE public.bug_status ADD VALUE IF NOT EXISTS 'in_testing' AFTER 'in_progress';
ALTER TYPE public.bug_status ADD VALUE IF NOT EXISTS 'rejected';

ALTER TYPE public.bug_event_type ADD VALUE IF NOT EXISTS 'category_changed';
ALTER TYPE public.bug_event_type ADD VALUE IF NOT EXISTS 'owner_changed';
ALTER TYPE public.bug_event_type ADD VALUE IF NOT EXISTS 'affected_version_changed';
ALTER TYPE public.bug_event_type ADD VALUE IF NOT EXISTS 'fixed_version_changed';
ALTER TYPE public.bug_event_type ADD VALUE IF NOT EXISTS 'request_id_changed';
ALTER TYPE public.bug_event_type ADD VALUE IF NOT EXISTS 'linked_to_ticket';
ALTER TYPE public.bug_event_type ADD VALUE IF NOT EXISTS 'reopened';
ALTER TYPE public.bug_event_type ADD VALUE IF NOT EXISTS 'rejected';
