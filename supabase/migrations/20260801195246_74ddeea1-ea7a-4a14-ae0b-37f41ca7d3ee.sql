DO $$
BEGIN
  IF (SELECT count(*) FROM public.beta_participants) = 0 THEN
    ALTER SEQUENCE public.beta_participant_code_seq RESTART WITH 1;
  END IF;
END $$;