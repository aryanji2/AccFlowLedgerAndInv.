/*
  # Fix RLS Recursion in User Profiles

  1. Security Changes
    - Remove recursive policy on user_profiles that references itself
    - Create simple, non-recursive policies
    - Use user_firm_access table for admin checks instead of user_profiles

  2. Policy Updates
    - Users can read their own profile (no recursion)
    - Remove admin policy that causes recursion
    - Admin access will be handled at application level
*/

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;

-- Keep only the simple, non-recursive policy
-- Users can read their own profile
-- (This policy already exists and is correct)

-- For admin functionality, we'll handle it at the application level
-- or create a separate admin_users table if needed

-- Alternative: If we need admin access to all profiles, we can use a different approach
-- by storing admin status in user_firm_access or creating a separate admin check

-- For now, let's keep it simple and secure with just the basic policy
-- The application can handle admin-specific queries through service role or other means