/*
  # Set Default Admin Role for New Users
  
  Updates the handle_new_user function to create new users as 'admin' by default
  so they have access to all dashboard pages.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'admin'
  );
  RETURN new;
END;
$$;
