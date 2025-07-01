/*
  # Fix User Profiles RLS Policies

  1. Security Changes
    - Drop existing problematic RLS policies on user_profiles table
    - Create new, non-recursive policies that prevent infinite recursion
    - Ensure users can only access their own profile data

  2. Policy Changes
    - SELECT: Allow users to read their own profile using auth.uid()
    - INSERT: Allow authenticated users to create their own profile
    - UPDATE: Allow users to update their own profile
*/

-- Drop existing policies that may be causing recursion
DROP POLICY IF EXISTS "Allow profile creation" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Create new, safe policies without recursion
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can create own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);