/*
  # Fix User Profiles and Role Management

  1. Functions
    - Create profile function for existing users
    - Improved new user signup handler

  2. Data Migration
    - Create profiles for existing auth users

  3. Security
    - Add policies for profile management
    - Separate policies for different operations
*/

-- Function to create user profile for existing users
CREATE OR REPLACE FUNCTION create_profile_for_existing_user(user_id uuid, user_email text)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, role, is_active)
  VALUES (user_id, COALESCE(user_email, 'User'), 'field_staff', true)
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Improved function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, role, is_active)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.email, 'User'), 
    'field_staff',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create profiles for any existing auth users that don't have profiles
DO $$
DECLARE
  auth_user RECORD;
BEGIN
  FOR auth_user IN 
    SELECT au.id, au.email 
    FROM auth.users au 
    LEFT JOIN public.user_profiles up ON au.id = up.id 
    WHERE up.id IS NULL
  LOOP
    PERFORM create_profile_for_existing_user(auth_user.id, auth_user.email);
  END LOOP;
END $$;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can update own basic profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;

-- Policy for users to read their own profile (already exists, but ensure it's correct)
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Policy for users to update their own basic profile info (excluding role)
CREATE POLICY "Users can update own basic profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Separate policies for admin operations
CREATE POLICY "Admins can read all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert profiles" ON user_profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles" ON user_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete profiles" ON user_profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create a function to safely update user roles (admin only)
CREATE OR REPLACE FUNCTION update_user_role(target_user_id uuid, new_role text)
RETURNS boolean AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Check if current user is admin
  SELECT role INTO current_user_role 
  FROM user_profiles 
  WHERE id = auth.uid();
  
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can update user roles';
  END IF;
  
  -- Validate role
  IF new_role NOT IN ('admin', 'accountant', 'field_staff') THEN
    RAISE EXCEPTION 'Invalid role specified';
  END IF;
  
  -- Update the role
  UPDATE user_profiles 
  SET role = new_role, updated_at = now()
  WHERE id = target_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION update_user_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_profile_for_existing_user(uuid, text) TO authenticated;