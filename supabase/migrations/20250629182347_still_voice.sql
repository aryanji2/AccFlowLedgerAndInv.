/*
  # Fix Firms Table RLS Policy

  1. Security Updates
    - Drop existing problematic INSERT policy for firms
    - Create new INSERT policy that properly allows authenticated users to create firms
    - Ensure the policy works with the user_profiles table structure
    - Add policy for admins to manage all firms

  2. Changes
    - Allow authenticated users to insert firms they create
    - Allow admins to manage all firm operations
    - Ensure proper access control based on user roles
*/

-- Drop existing INSERT policy that might be causing issues
DROP POLICY IF EXISTS "Allow users to insert firms they create" ON firms;
DROP POLICY IF EXISTS "Users can insert firms they create" ON firms;

-- Create new INSERT policy for firms
CREATE POLICY "Authenticated users can create firms"
  ON firms
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    created_by = auth.uid()
  );

-- Ensure admins can manage all firms
DROP POLICY IF EXISTS "Admins can manage all firms" ON firms;
CREATE POLICY "Admins can manage all firms"
  ON firms
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Ensure users can read firms they have access to
DROP POLICY IF EXISTS "Users can access assigned firms" ON firms;
CREATE POLICY "Users can access assigned firms"
  ON firms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_firm_access
      WHERE user_firm_access.user_id = auth.uid()
      AND user_firm_access.firm_id = firms.id
    )
  );

-- Allow users to update firms they created (non-admins)
DROP POLICY IF EXISTS "Users can update own firms" ON firms;
CREATE POLICY "Users can update own firms"
  ON firms
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());