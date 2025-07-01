-- Drop all existing policies on user_profiles to start fresh
DROP POLICY IF EXISTS "Users can manage own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Create simple, non-recursive policies for user_profiles
-- Allow all authenticated users to read all profiles
CREATE POLICY "Allow authenticated users to read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow all authenticated users to create profiles
CREATE POLICY "Allow authenticated users to create profiles"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow all authenticated users to update profiles
CREATE POLICY "Allow authenticated users to update profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow all authenticated users to delete profiles
CREATE POLICY "Allow authenticated users to delete profiles"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (true);

-- Drop existing function before recreating with different return type
DROP FUNCTION IF EXISTS create_or_update_user_profile(UUID, TEXT, TEXT, BOOLEAN);

-- Create a function to safely create or update user profiles
CREATE OR REPLACE FUNCTION create_or_update_user_profile(
  user_id UUID,
  user_full_name TEXT,
  user_role TEXT DEFAULT 'field_staff',
  user_is_active BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Check if profile exists
  IF EXISTS (SELECT 1 FROM user_profiles WHERE id = user_id) THEN
    -- Update existing profile
    UPDATE user_profiles 
    SET 
      full_name = user_full_name,
      role = user_role,
      is_active = user_is_active,
      updated_at = now()
    WHERE id = user_id
    RETURNING to_jsonb(user_profiles.*) INTO result;
  ELSE
    -- Create new profile
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
    RETURNING to_jsonb(user_profiles.*) INTO result;
  END IF;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to safely delete a user profile
CREATE OR REPLACE FUNCTION delete_user_profile(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Delete user_firm_access entries
  DELETE FROM user_firm_access WHERE user_id = user_id;
  
  -- Delete user profile
  DELETE FROM user_profiles WHERE id = user_id;
  
  RETURN FOUND;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error deleting user profile: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to assign a user to a firm
CREATE OR REPLACE FUNCTION assign_user_to_firm(user_id UUID, firm_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO user_firm_access (user_id, firm_id)
  VALUES (user_id, firm_id)
  ON CONFLICT (user_id, firm_id) DO NOTHING;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error assigning user to firm: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to remove a user from a firm
CREATE OR REPLACE FUNCTION remove_user_from_firm(user_id UUID, firm_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM user_firm_access 
  WHERE user_id = user_id AND firm_id = firm_id;
  
  RETURN FOUND;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error removing user from firm: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix user_firm_access policies
DROP POLICY IF EXISTS "Users can view own firm access" ON user_firm_access;
DROP POLICY IF EXISTS "Admins can manage all firm access" ON user_firm_access;

-- Allow all authenticated users to read all firm access records
CREATE POLICY "Allow authenticated users to read all firm access"
  ON user_firm_access
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow all authenticated users to create firm access records
CREATE POLICY "Allow authenticated users to create firm access"
  ON user_firm_access
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow all authenticated users to delete firm access records
CREATE POLICY "Allow authenticated users to delete firm access"
  ON user_firm_access
  FOR DELETE
  TO authenticated
  USING (true);

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION create_or_update_user_profile(UUID, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_user_to_firm(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_user_from_firm(UUID, UUID) TO authenticated;

-- Create or update the handle_new_user trigger function to avoid conflicts
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

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_firm_access_user_id ON user_firm_access(user_id);