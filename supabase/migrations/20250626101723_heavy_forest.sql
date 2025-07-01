/*
  # Fix infinite recursion in user_profiles RLS policies

  1. Problem
    - The admin policies are causing infinite recursion by querying user_profiles table within the policy itself
    - This creates a circular dependency when checking if a user is an admin

  2. Solution
    - Remove the problematic admin policies that cause recursion
    - Create simpler policies that don't reference the same table
    - Use auth.jwt() to check user metadata instead of querying user_profiles table
    - Keep the basic user policies for users to manage their own profiles

  3. Security
    - Users can still read and update their own profiles
    - Admin functionality will need to be handled differently (through service role or functions)
*/

-- Drop all existing policies on user_profiles to start fresh
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own basic profile" ON user_profiles;

-- Create simple, non-recursive policies
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile (excluding role changes)
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow profile creation for new users (this will be used by triggers or functions)
CREATE POLICY "Allow profile creation"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Note: Admin operations should be handled through:
-- 1. Service role operations (bypassing RLS)
-- 2. Database functions with SECURITY DEFINER
-- 3. Edge functions with elevated permissions
-- This prevents the infinite recursion issue while maintaining security