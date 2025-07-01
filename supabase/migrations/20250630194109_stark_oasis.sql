/*
  # Fix Admin Login and User Management

  1. Changes
    - Update handle_new_user function to properly set admin role for first user
    - Create a function to promote a user to admin role
    - Add a function to set role for any user
    - Ensure all users can manage other users
*/

-- Create a function to promote a user to admin
CREATE OR REPLACE FUNCTION promote_to_admin(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Update the user's role to admin
  UPDATE user_profiles
  SET 
    role = 'admin',
    updated_at = now()
  WHERE id = target_user_id
  RETURNING to_jsonb(user_profiles.*) INTO result;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to set a user's role
CREATE OR REPLACE FUNCTION set_user_role(target_user_id UUID, new_role TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Validate role
  IF new_role NOT IN ('admin', 'accountant', 'field_staff') THEN
    RAISE EXCEPTION 'Invalid role: must be admin, accountant, or field_staff';
  END IF;

  -- Update the user's role
  UPDATE user_profiles
  SET 
    role = new_role,
    updated_at = now()
  WHERE id = target_user_id
  RETURNING to_jsonb(user_profiles.*) INTO result;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update handle_new_user function to properly set admin role for first user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  admin_count INTEGER;
  new_role TEXT;
BEGIN
  -- Count existing users and admins
  SELECT COUNT(*) INTO user_count FROM user_profiles;
  SELECT COUNT(*) INTO admin_count FROM user_profiles WHERE role = 'admin';
  
  -- Determine role - first user or if no admins exist, make admin
  IF user_count = 0 OR admin_count = 0 THEN
    new_role := 'admin';
  ELSE
    new_role := COALESCE(NEW.raw_user_meta_data->>'role', 'field_staff');
  END IF;
  
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
    new_role,
    true,
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    role = CASE 
      WHEN user_profiles.role = 'field_staff' AND new_role = 'admin' THEN 'admin'
      ELSE user_profiles.role
    END,
    is_active = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION promote_to_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION set_user_role(UUID, TEXT) TO authenticated;

-- Promote existing users to admin if no admins exist
DO $$
DECLARE
  admin_count INTEGER;
  first_user_id UUID;
BEGIN
  -- Count existing admins
  SELECT COUNT(*) INTO admin_count FROM user_profiles WHERE role = 'admin';
  
  -- If no admins exist, promote the first user to admin
  IF admin_count = 0 THEN
    SELECT id INTO first_user_id FROM user_profiles ORDER BY created_at LIMIT 1;
    
    IF first_user_id IS NOT NULL THEN
      UPDATE user_profiles SET role = 'admin' WHERE id = first_user_id;
      RAISE NOTICE 'Promoted user % to admin role', first_user_id;
    END IF;
  END IF;
END $$;