/*
  # Fix User Management Permissions

  1. Database Structure Fixes
    - Fix foreign key inconsistencies in user_profiles and related tables
    - Ensure proper relationship between auth.users and user_profiles
    - Add proper indexes for performance

  2. Admin User Setup
    - Create a function to automatically assign admin role to the first user
    - Add trigger to handle new user profile creation
    - Ensure current user gets admin permissions

  3. Security Policies
    - Update RLS policies to properly handle admin permissions
    - Fix permission checking logic
*/

-- First, let's fix the foreign key relationships
-- The user_profiles table should reference auth.users, not a separate users table

-- Drop existing foreign keys that might be causing issues
DO $$
BEGIN
  -- Drop foreign keys that reference non-existent users table
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_profiles_id_fkey' 
    AND table_name = 'user_profiles'
  ) THEN
    ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_id_fkey;
  END IF;

  -- Drop other problematic foreign keys
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_firm_access_user_id_fkey' 
    AND table_name = 'user_firm_access'
  ) THEN
    ALTER TABLE user_firm_access DROP CONSTRAINT user_firm_access_user_id_fkey;
  END IF;
END $$;

-- Create or update the user_profiles table to properly reference auth.users
DO $$
BEGIN
  -- Add foreign key constraint to auth.users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_profiles_id_fkey_auth' 
    AND table_name = 'user_profiles'
  ) THEN
    ALTER TABLE user_profiles 
    ADD CONSTRAINT user_profiles_id_fkey_auth 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Fix user_firm_access to reference user_profiles properly
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_firm_access_user_id_fkey_profiles' 
    AND table_name = 'user_firm_access'
  ) THEN
    ALTER TABLE user_firm_access 
    ADD CONSTRAINT user_firm_access_user_id_fkey_profiles 
    FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create a function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count FROM user_profiles;
  
  -- Insert user profile
  INSERT INTO user_profiles (
    id, 
    full_name, 
    role, 
    is_active,
    username
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE 
      WHEN user_count = 0 THEN 'admin'  -- First user becomes admin
      ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'field_staff')
    END,
    true,
    NEW.email
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role 
  FROM user_profiles 
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, 'field_staff');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for user_profiles
DROP POLICY IF EXISTS "Users can create own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow user to insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to select their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to delete their own profile" ON user_profiles;

-- Create comprehensive RLS policies for user_profiles
CREATE POLICY "Users can manage own profile"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can manage all profiles"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Update RLS policies for user_firm_access
DROP POLICY IF EXISTS "Only admins can assign firm access" ON user_firm_access;
DROP POLICY IF EXISTS "User can view own firm access" ON user_firm_access;

CREATE POLICY "Users can view own firm access"
  ON user_firm_access
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all firm access"
  ON user_firm_access
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Ensure the current user has admin role if they're the only user
DO $$
DECLARE
  current_user_id UUID;
  user_count INTEGER;
BEGIN
  -- Get current user ID from auth context if available
  SELECT auth.uid() INTO current_user_id;
  
  -- Count total users
  SELECT COUNT(*) INTO user_count FROM user_profiles;
  
  -- If there's only one user or no users, make the current user admin
  IF user_count <= 1 AND current_user_id IS NOT NULL THEN
    INSERT INTO user_profiles (id, full_name, role, is_active, username)
    VALUES (
      current_user_id,
      'Admin User',
      'admin',
      true,
      (SELECT email FROM auth.users WHERE id = current_user_id)
    )
    ON CONFLICT (id) DO UPDATE SET
      role = 'admin',
      is_active = true;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(is_active);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;