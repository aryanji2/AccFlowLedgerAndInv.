/*
  # Fix User Profiles RLS Policies

  1. Security Changes
    - Remove all existing policies on user_profiles that might cause recursion
    - Create simple, non-recursive policies for user access
    - Ensure proper access control without circular references

  2. Policy Updates
    - Users can read their own profile (simple condition)
    - Users can create their own profile (for new signups)
    - Users can update their own profile (simple condition)
*/

-- Drop all existing policies on user_profiles to start fresh
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own basic profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON user_profiles;

-- Create simple, non-recursive policies
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can create their own profile
CREATE POLICY "Users can create own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

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