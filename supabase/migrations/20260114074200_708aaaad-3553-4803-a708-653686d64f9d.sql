-- Update has_role function to validate that caller can only check their own role
-- unless they're an admin
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure the caller can only check their own role or is an admin
  IF _user_id != auth.uid() THEN
    -- Allow admins to check any user's role
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
      RETURN false;
    END IF;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;