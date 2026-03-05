-- Remove the redundant user_email column (email can be fetched from auth.users via user_id)
ALTER TABLE public.feedback DROP COLUMN user_email;

-- Make user_id NOT NULL to prevent orphaned feedback entries
-- First, delete any existing feedback with null user_id
DELETE FROM public.feedback WHERE user_id IS NULL;

-- Then make the column NOT NULL
ALTER TABLE public.feedback ALTER COLUMN user_id SET NOT NULL;