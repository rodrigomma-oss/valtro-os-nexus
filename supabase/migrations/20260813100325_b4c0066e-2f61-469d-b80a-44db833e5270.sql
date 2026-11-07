ALTER TABLE public.calendar_sync_links
  DROP CONSTRAINT calendar_sync_links_entity_type_check;

ALTER TABLE public.calendar_sync_links
  ADD CONSTRAINT calendar_sync_links_entity_type_check
  CHECK (entity_type IN ('follow_up', 'project_meeting'));