/*
  # Fix User Profiles Duplicate Key Constraint

  1. Problem
    - The "duplicate key value violates unique constraint user_profiles_pkey" error occurs when:
      - The trigger tries to create a profile for a user that already has one
      - Manual profile creation attempts to insert a record with an existing ID
    - This happens because multiple processes might try to create the same profile

  2. Solution
    - Update the handle_new_user trigger function to use ON CONFLICT DO NOTHING
    - Fix any existing user_profiles issues
    - Ensure proper error handling in application code
*/

-- First, fix the handle_new_user function to handle conflicts properly
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count FROM user_profiles;
  
  -- Insert user profile with conflict handling
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
  )
  ON CONFLICT (id) DO NOTHING; -- Skip if profile already exists
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to safely create or update user profiles
CREATE OR REPLACE FUNCTION create_or_update_user_profile(
  user_id UUID,
  user_full_name TEXT,
  user_role TEXT DEFAULT 'field_staff',
  user_is_active BOOLEAN DEFAULT true
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO user_profiles (
    id,
    full_name,
    role,
    is_active,
    username
  )
  VALUES (
    user_id,
    user_full_name,
    user_role,
    user_is_active,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
    
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating/updating user profile: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION create_or_update_user_profile(UUID, TEXT, TEXT, BOOLEAN) TO authenticated;

-- Fix any existing issues with user_profiles
DO $$
DECLARE
  auth_user RECORD;
BEGIN
  -- For each auth user without a profile, create one
  FOR auth_user IN 
    SELECT au.id, au.email 
    FROM auth.users au 
    LEFT JOIN public.user_profiles up ON au.id = up.id 
    WHERE up.id IS NULL
  LOOP
    BEGIN
      INSERT INTO user_profiles (id, full_name, role, is_active, username)
      VALUES (
        auth_user.id,
        COALESCE(auth_user.email, 'User'),
        'field_staff',
        true,
        auth_user.email
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error creating profile for %: %', auth_user.email, SQLERRM;
    END;
  END LOOP;
END $$;