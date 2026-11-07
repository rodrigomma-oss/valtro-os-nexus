DELETE FROM public.api_idempotency_keys 
WHERE application_id = '42330f39-c465-45f2-8eb0-b9cf80a25a50' 
AND idempotency_key IN ('bf209574-8c87-4366-a619-3709207891d7', 'b26aa283-3916-4c1a-8688-d679187b9e74');