-- Backfill `public.users` rows for Supabase Auth accounts that never got one.
--
-- These accounts were created before createUser() wrote the row itself, back
-- when the code assumed a `handle_new_user` trigger existed. It never did, so
-- every account created through Settings landed in auth.users alone.
--
-- Only backfills accounts whose metadata carries BOTH a name and a valid role,
-- so nothing gets an invented identity or an invented permission level.
-- Accounts without metadata (e.g. ones created straight from the Supabase
-- dashboard) are deliberately skipped — decide those by hand.
--
-- Safe to run more than once.

BEGIN;

INSERT INTO public.users (id, email, name, role, created_at, updated_at)
SELECT
  auth_user.id::text,                                   -- users.id is text, auth.users.id is uuid
  auth_user.email,
  auth_user.raw_user_meta_data ->> 'name',
  (auth_user.raw_user_meta_data ->> 'role')::"UserRole",
  auth_user.created_at::timestamp,
  now()
FROM auth.users AS auth_user
LEFT JOIN public.users AS existing ON existing.id = auth_user.id::text
WHERE existing.id IS NULL
  AND auth_user.email IS NOT NULL
  AND NULLIF(auth_user.raw_user_meta_data ->> 'name', '') IS NOT NULL
  AND auth_user.raw_user_meta_data ->> 'role' IN ('DOCTOR', 'RECEPTIONIST')
  -- users.email is UNIQUE; never collide with a row that already claims it
  AND NOT EXISTS (
    SELECT 1 FROM public.users AS by_email WHERE by_email.email = auth_user.email
  )
ON CONFLICT (id) DO NOTHING;

-- Report what is still unmirrored, so nothing is silently left behind.
SELECT auth_user.email,
       COALESCE(auth_user.raw_user_meta_data ->> 'name', '(no name)') AS meta_name,
       COALESCE(auth_user.raw_user_meta_data ->> 'role', '(no role)') AS meta_role
FROM auth.users AS auth_user
LEFT JOIN public.users AS existing ON existing.id = auth_user.id::text
WHERE existing.id IS NULL;

COMMIT;
