/*
  # Fix handle_new_user Function
  
  The profiles table requires `full_name` (NOT NULL), but the trigger function
  wasn't providing a value, causing user registration to fail.
  
  This migration updates the function to provide a default full_name value
  derived from the email address.
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
    'agent'
  );
  RETURN new;
END;
$$;
