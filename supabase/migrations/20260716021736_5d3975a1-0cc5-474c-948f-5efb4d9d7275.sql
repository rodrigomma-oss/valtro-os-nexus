
ALTER TABLE public.leads
  ADD CONSTRAINT leads_owner_id_profile_fkey
  FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.lead_events
  ADD CONSTRAINT lead_events_created_by_profile_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.lead_notes
  ADD CONSTRAINT lead_notes_created_by_profile_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
