import { supabase } from './supabase';
import { mockAuth } from './mockAuth';

interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'accountant' | 'field_staff';
  firms: string[];
}

interface UpdateUserData {
  full_name?: string;
  role?: 'admin' | 'accountant' | 'field_staff';
  is_active?: boolean;
  firms?: string[];
}

class UserService {
  private hasValidSupabaseConfig() {
    return import.meta.env.VITE_SUPABASE_URL && 
           import.meta.env.VITE_SUPABASE_ANON_KEY &&
           !import.meta.env.VITE_SUPABASE_URL.includes('placeholder') &&
           !import.meta.env.VITE_SUPABASE_ANON_KEY.includes('placeholder');
  }

  private async getAuthToken() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  private async testSupabaseConnection() {
    try {
      const { data, error } = await supabase.from('user_profiles').select('id').limit(1);
      return !error;
    } catch (error) {
      return false;
    }
  }

  private async getCurrentUserRole() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return profile?.role;
    } catch (error) {
      console.error('Error getting current user role:', error);
      return null;
    }
  }

  private async ensureCurrentUserIsAdmin() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Check if user profile exists
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // User profile doesn't exist, check if they should be the first admin
        console.log('User profile not found, checking if this should be the first admin');
        
        // Count total admin users
        const { data: adminUsers, error: countError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('role', 'admin');

        if (!countError && (!adminUsers || adminUsers.length === 0)) {
          // If no admin users exist, create this user as admin
          console.log('No admin users found, creating first admin profile');
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert({
              id: user.id,
              full_name: user.user_metadata?.full_name || user.email || 'Admin User',
              role: 'admin',
              is_active: true,
              username: user.email
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating admin profile:', createError);
            return false;
          }

          console.log('Successfully created first admin profile:', newProfile);
          return true;
        } else {
          console.log('Other admin users exist, current user needs profile created by admin');
          return false;
        }
      } else if (error) {
        console.error('Error checking user profile:', error);
        return false;
      }

      // User profile exists, check if they are admin
      return profile.role === 'admin';
    } catch (error) {
      console.error('Error ensuring user is admin:', error);
      return false;
    }
  }

  async createAdminProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user found. Please log in first.');
      }

      // Check if profile already exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Error checking existing profile: ${checkError.message}`);
      }

      if (existingProfile) {
        // Profile exists, update role to admin if not already
        if (existingProfile.role !== 'admin') {
          const { data: updatedProfile, error: updateError } = await supabase
            .from('user_profiles')
            .update({ 
              role: 'admin',
              is_active: true 
            })
            .eq('id', user.id)
            .select()
            .single();

          if (updateError) {
            throw new Error(`Failed to update profile to admin: ${updateError.message}`);
          }

          return updatedProfile;
        } else {
          return existingProfile;
        }
      } else {
        // Create new admin profile
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || user.email || 'Admin User',
            role: 'admin',
            is_active: true,
            username: user.email
          })
          .select()
          .single();

        if (createError) {
          throw new Error(`Failed to create admin profile: ${createError.message}`);
        }

        return newProfile;
      }
    } catch (error) {
      console.error('Error creating admin profile:', error);
      throw error;
    }
  }

  async getAllUsers() {
    // Always check config first
    if (!this.hasValidSupabaseConfig()) {
      console.log('Using mock user data - invalid Supabase config');
      return mockAuth.getAllUsers();
    }

    // Test connection
    const connectionValid = await this.testSupabaseConnection();
    if (!connectionValid) {
      console.log('Using mock user data - connection issues');
      return mockAuth.getAllUsers();
    }

    try {
      // Ensure current user has admin permissions
      const isAdmin = await this.ensureCurrentUserIsAdmin();
      if (!isAdmin) {
        console.log('Using mock user data - insufficient permissions');
        return mockAuth.getAllUsers();
      }

      // Try to use Edge Function for secure user fetching
      const token = await this.getAuthToken();
      if (token) {
        try {
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-all-users`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const users = await response.json();
            return users;
          } else {
            console.log('Edge function failed, falling back to direct query');
          }
        } catch (fetchError) {
          console.log('Edge function fetch failed, falling back to direct query:', fetchError);
        }
      }

      // Fallback to direct query with the correct foreign key relationship
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select(`
            *,
            user_firm_access!user_firm_access_user_id_fkey_profiles (
              firm_id,
              firms (
                id,
                name
              )
            )
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching users from Supabase:', error);
          console.log('Falling back to mock data due to Supabase query error');
          return mockAuth.getAllUsers();
        }

        return data || [];
      } catch (directQueryError) {
        console.error('Direct query failed:', directQueryError);
        console.log('Falling back to mock data due to direct query failure');
        return mockAuth.getAllUsers();
      }
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      console.log('Falling back to mock data due to general error');
      return mockAuth.getAllUsers();
    }
  }

  async createUser(userData: CreateUserData) {
    if (!this.hasValidSupabaseConfig()) {
      console.log('Using mock user creation - invalid Supabase config');
      return mockAuth.createUser(userData);
    }

    // Test connection first
    const connectionValid = await this.testSupabaseConnection();
    if (!connectionValid) {
      console.log('Using mock user creation - connection issues');
      return mockAuth.createUser(userData);
    }

    try {
      // Ensure current user has admin permissions
      const isAdmin = await this.ensureCurrentUserIsAdmin();
      if (!isAdmin) {
        throw new Error('Insufficient permissions - only admin users can create new users. Please ensure your account has admin role in the database.');
      }

      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required - please log in again');
      }

      console.log('Attempting to create user via Edge Function...');
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edge function error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        // Handle specific error cases with better user messaging
        if (errorData.error?.includes('User profile not found')) {
          throw new Error('Your account does not have a user profile. Please contact an administrator to create your profile with admin permissions.');
        } else if (errorData.error?.includes('Insufficient permissions')) {
          if (errorData.details) {
            throw new Error(`${errorData.error}: ${errorData.details}`);
          } else {
            throw new Error('Your account does not have admin permissions. Please contact an administrator or manually update your role to "admin" in the user_profiles table.');
          }
        } else if (errorData.error?.includes('Invalid authorization')) {
          throw new Error('Invalid authorization - please log out and log back in');
        } else if (errorData.error?.includes('Missing authorization')) {
          throw new Error('Authentication required - please log in again');
        } else if (errorData.error?.includes('Database connection error')) {
          throw new Error('Database connection error. Please check your Supabase configuration and try again.');
        } else {
          throw new Error(`Failed to create user: ${errorData.error || 'Unknown error'}`);
        }
      }

      const result = await response.json();
      console.log('User created successfully:', result);
      return result.user || result;
    } catch (error) {
      console.error('Error creating user:', error);
      
      // If it's a network error, fall back to mock
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.log('Network error during user creation, falling back to mock');
        return mockAuth.createUser(userData);
      }
      
      // Re-throw our custom errors
      throw error;
    }
  }

  async updateUser(userId: string, updates: UpdateUserData) {
    if (!this.hasValidSupabaseConfig()) {
      return mockAuth.updateUser(userId, updates);
    }

    // Test connection first
    const connectionValid = await this.testSupabaseConnection();
    if (!connectionValid) {
      return mockAuth.updateUser(userId, updates);
    }

    try {
      // Ensure current user has admin permissions
      const isAdmin = await this.ensureCurrentUserIsAdmin();
      if (!isAdmin) {
        throw new Error('Insufficient permissions - only admin users can update users');
      }

      // Update user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .update({
          full_name: updates.full_name,
          role: updates.role,
          is_active: updates.is_active
        })
        .eq('id', userId)
        .select()
        .single();

      if (profileError) {
        console.error('Error updating user profile:', profileError);
        throw new Error('Failed to update user profile');
      }

      // Update firm access if provided
      if (updates.firms) {
        // Remove existing firm access
        const { error: deleteError } = await supabase
          .from('user_firm_access')
          .delete()
          .eq('user_id', userId);
          
        if (deleteError) {
          console.error('Error removing existing firm access:', deleteError);
        }

        // Add new firm access
        if (updates.firms.length > 0) {
          const firmAccess = updates.firms.map(firmId => ({
            user_id: userId,
            firm_id: firmId
          }));

          const { error: accessError } = await supabase
            .from('user_firm_access')
            .insert(firmAccess);

          if (accessError) {
            console.error('Error adding new firm access:', accessError);
          }
        }
      }

      return profileData;
    } catch (error) {
      console.error('Error updating user:', error);
      
      // If it's a network error, fall back to mock
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.log('Network error during user update, falling back to mock');
        return mockAuth.updateUser(userId, updates);
      }
      
      if (error.message.includes('Insufficient permissions')) {
        throw error;
      }
      
      return mockAuth.updateUser(userId, updates);
    }
  }

  async updateUserRole(userId: string, role: 'admin' | 'accountant' | 'field_staff') {
    return this.updateUser(userId, { role });
  }

  async toggleUserStatus(userId: string, newStatus?: boolean) {
    if (!this.hasValidSupabaseConfig()) {
      return mockAuth.toggleUserStatus(userId);
    }

    // Test connection first
    const connectionValid = await this.testSupabaseConnection();
    if (!connectionValid) {
      return mockAuth.toggleUserStatus(userId);
    }

    try {
      // Ensure current user has admin permissions
      const isAdmin = await this.ensureCurrentUserIsAdmin();
      if (!isAdmin) {
        throw new Error('Insufficient permissions - only admin users can modify user status');
      }

      let targetStatus = newStatus;
      
      // If no status provided, get current status and toggle it
      if (targetStatus === undefined) {
        const { data: currentUser, error: fetchError } = await supabase
          .from('user_profiles')
          .select('is_active')
          .eq('id', userId)
          .single();

        if (fetchError) {
          console.error('Error fetching user status:', fetchError);
          throw new Error('Failed to fetch current user status');
        }

        targetStatus = !currentUser.is_active;
      }

      // Update status
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ is_active: targetStatus })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error toggling user status:', error);
        throw new Error('Failed to update user status');
      }
      
      return data;
    } catch (error) {
      console.error('Error toggling user status:', error);
      
      // If it's a network error, fall back to mock
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.log('Network error during status toggle, falling back to mock');
        return mockAuth.toggleUserStatus(userId);
      }
      
      if (error.message.includes('Insufficient permissions')) {
        throw error;
      }
      
      return mockAuth.toggleUserStatus(userId);
    }
  }

  async deleteUser(userId: string) {
    if (!this.hasValidSupabaseConfig()) {
      return mockAuth.deleteUser(userId);
    }

    // Test connection first
    const connectionValid = await this.testSupabaseConnection();
    if (!connectionValid) {
      return mockAuth.deleteUser(userId);
    }

    try {
      // Ensure current user has admin permissions
      const isAdmin = await this.ensureCurrentUserIsAdmin();
      if (!isAdmin) {
        throw new Error('Insufficient permissions - only admin users can delete users');
      }

      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required - please log in again');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edge function error:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        // Handle specific error cases
        if (errorData.error?.includes('Insufficient permissions')) {
          throw new Error('Insufficient permissions - your account does not have admin role');
        } else if (errorData.error?.includes('Invalid authorization')) {
          throw new Error('Invalid authorization - please log out and log back in');
        } else {
          throw new Error(`Failed to delete user: ${errorData.error || 'Unknown error'}`);
        }
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error deleting user:', error);
      
      // If it's a network error, fall back to mock
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.log('Network error during user deletion, falling back to mock');
        return mockAuth.deleteUser(userId);
      }
      
      // Re-throw our custom errors
      throw error;
    }
  }

  async assignUserToFirm(userId: string, firmId: string) {
    if (!this.hasValidSupabaseConfig()) {
      return mockAuth.assignUserToFirm(userId, firmId);
    }

    // Test connection first
    const connectionValid = await this.testSupabaseConnection();
    if (!connectionValid) {
      return mockAuth.assignUserToFirm(userId, firmId);
    }

    try {
      // Check if assignment already exists
      const { data: existingAccess, error: checkError } = await supabase
        .from('user_firm_access')
        .select('*')
        .eq('user_id', userId)
        .eq('firm_id', firmId)
        .maybeSingle();
        
      if (checkError) {
        console.error('Error checking existing firm access:', checkError);
        return mockAuth.assignUserToFirm(userId, firmId);
      }
      
      // If assignment already exists, return success
      if (existingAccess) {
        return true;
      }
      
      // Create new assignment
      const { error } = await supabase
        .from('user_firm_access')
        .insert({ user_id: userId, firm_id: firmId });

      if (error) {
        console.error('Error assigning user to firm:', error);
        return mockAuth.assignUserToFirm(userId, firmId);
      }
      
      return true;
    } catch (error) {
      console.error('Error assigning user to firm:', error);
      
      // If it's a network error, fall back to mock
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.log('Network error during firm assignment, falling back to mock');
      }
      
      return mockAuth.assignUserToFirm(userId, firmId);
    }
  }

  async removeUserFromFirm(userId: string, firmId: string) {
    if (!this.hasValidSupabaseConfig()) {
      return mockAuth.removeUserFromFirm(userId, firmId);
    }

    // Test connection first
    const connectionValid = await this.testSupabaseConnection();
    if (!connectionValid) {
      return mockAuth.removeUserFromFirm(userId, firmId);
    }

    try {
      const { error } = await supabase
        .from('user_firm_access')
        .delete()
        .eq('user_id', userId)
        .eq('firm_id', firmId);

      if (error) {
        console.error('Error removing user from firm:', error);
        return mockAuth.removeUserFromFirm(userId, firmId);
      }
      
      return true;
    } catch (error) {
      console.error('Error removing user from firm:', error);
      
      // If it's a network error, fall back to mock
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.log('Network error during firm removal, falling back to mock');
      }
      
      return mockAuth.removeUserFromFirm(userId, firmId);
    }
  }

  async getUserFirms(userId: string) {
    if (!this.hasValidSupabaseConfig()) {
      return mockAuth.getUserFirms(userId);
    }

    // Test connection first
    const connectionValid = await this.testSupabaseConnection();
    if (!connectionValid) {
      return mockAuth.getUserFirms(userId);
    }

    try {
      const { data, error } = await supabase
        .from('user_firm_access')
        .select(`
          firm_id,
          firms (*)
        `)
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user firms:', error);
        return mockAuth.getUserFirms(userId);
      }
      
      return data.map(item => item.firms).filter(Boolean);
    } catch (error) {
      console.error('Error fetching user firms:', error);
      
      // If it's a network error, fall back to mock
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.log('Network error during firm fetching, falling back to mock');
      }
      
      return mockAuth.getUserFirms(userId);
    }
  }
}

export const userService = new UserService();