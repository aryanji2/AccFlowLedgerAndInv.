import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, testSupabaseConnection, isValidSupabaseConfig } from '../lib/supabase';
import { mockAuth } from '../lib/mockAuth';
import type { Database } from '../lib/supabase';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  // Load user profile whenever session changes
  useEffect(() => {
    if (session?.user) {
      loadUserProfile(session.user.id);
    } else {
      setUserProfile(null);
      setLoading(false);
    }
  }, [session]);

  const initializeAuth = async () => {
    try {
      if (!isValidSupabaseConfig()) {
        console.log('Using mock authentication - invalid or missing Supabase config');
        // Use mock auth for demo purposes
        const mockUser = {
          id: 'admin-1',
          email: 'admin@accflow.com',
        } as User;
        
        setUser(mockUser);
        const mockProfile = await mockAuth.getUserProfile(mockUser.id);
        if (mockProfile) {
          setUserProfile({
            id: mockUser.id,
            username: null,
            full_name: mockProfile.full_name,
            role: mockProfile.role,
            is_active: mockProfile.is_active,
            created_at: mockProfile.created_at,
            updated_at: mockProfile.created_at,
          });
        }
        setLoading(false);
        return;
      }

      // Test connection first
      const connectionValid = await testSupabaseConnection();
      if (!connectionValid) {
        console.log('Falling back to mock authentication due to connection issues');
        // Use mock auth for demo purposes
        const mockUser = {
          id: 'admin-1',
          email: 'admin@accflow.com',
        } as User;
        
        setUser(mockUser);
        const mockProfile = await mockAuth.getUserProfile(mockUser.id);
        if (mockProfile) {
          setUserProfile({
            id: mockUser.id,
            username: null,
            full_name: mockProfile.full_name,
            role: mockProfile.role,
            is_active: mockProfile.is_active,
            created_at: mockProfile.created_at,
            updated_at: mockProfile.created_at,
          });
        }
        setLoading(false);
        return;
      }

      // Get initial session
      const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        setLoading(false);
        return;
      }

      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        console.log('Auth state changed:', event);
        setSession(newSession);
        setUser(newSession?.user ?? null);
      });

      return () => subscription.unsubscribe();
    } catch (error) {
      console.error('Auth initialization failed:', error);
      console.log('Falling back to mock authentication');
      // Use mock auth for demo purposes
      const mockUser = {
        id: 'admin-1',
        email: 'admin@accflow.com',
      } as User;
      
      setUser(mockUser);
      const mockProfile = await mockAuth.getUserProfile(mockUser.id);
      if (mockProfile) {
        setUserProfile({
          id: mockUser.id,
          username: null,
          full_name: mockProfile.full_name,
          role: mockProfile.role,
          is_active: mockProfile.is_active,
          created_at: mockProfile.created_at,
          updated_at: mockProfile.created_at,
        });
      }
      setLoading(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      if (!isValidSupabaseConfig()) {
        console.log('Using mock profile - invalid Supabase config');
        const mockProfile = await mockAuth.getUserProfile(userId);
        if (mockProfile) {
          setUserProfile({
            id: userId,
            username: null,
            full_name: mockProfile.full_name,
            role: mockProfile.role,
            is_active: mockProfile.is_active,
            created_at: mockProfile.created_at,
            updated_at: mockProfile.created_at,
          });
        } else {
          setUserProfile({
            id: userId,
            username: null,
            full_name: 'Mock User',
            role: 'field_staff',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
        setLoading(false);
        return;
      }

      // Test connection first
      const connectionValid = await testSupabaseConnection();
      if (!connectionValid) {
        console.log('Using mock profile due to connection issues');
        const mockProfile = await mockAuth.getUserProfile(userId);
        if (mockProfile) {
          setUserProfile({
            id: userId,
            username: null,
            full_name: mockProfile.full_name,
            role: mockProfile.role,
            is_active: mockProfile.is_active,
            created_at: mockProfile.created_at,
            updated_at: mockProfile.created_at,
          });
        } else {
          setUserProfile({
            id: userId,
            username: null,
            full_name: 'Mock User',
            role: 'field_staff',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
        setLoading(false);
        return;
      }

      console.log('Loading user profile for:', userId);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Profile loading error:', error);
        
        // If profile doesn't exist, create a default one
        if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
          console.log('User profile not found, creating default profile...');
          await createDefaultProfile(userId);
          return;
        }
        
        // For other errors, set a default profile to prevent loading loop
        console.log('Setting default profile due to error');
        setUserProfile({
          id: userId,
          username: null,
          full_name: session?.user?.user_metadata?.full_name || session?.user?.email || 'User',
          role: 'field_staff',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        setLoading(false);
        return;
      }
      
      console.log('Profile loaded successfully:', data);
      setUserProfile(data);
    } catch (error) {
      console.error('Error loading user profile:', error);
      
      // Check if it's a network error
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.log('Network error detected, using fallback profile');
      }
      
      // Set a default profile to prevent infinite loading
      setUserProfile({
        id: userId,
        username: null,
        full_name: session?.user?.user_metadata?.full_name || session?.user?.email || 'User',
        role: 'field_staff',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const createDefaultProfile = async (userId: string) => {
    try {
      console.log('Creating default profile for user:', userId);
      
      // Get user email from current session
      const userEmail = session?.user?.email || user?.email;
      const userName = session?.user?.user_metadata?.full_name || userEmail || 'User';
      
      // Check if any admin users exist
      const { count, error: countError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');
        
      if (countError) {
        console.error('Error checking for admin users:', countError);
      }
      
      // Determine role - first user becomes admin
      const role = (count === 0) ? 'admin' : 'field_staff';
      console.log(`Setting role to ${role} (admin count: ${count})`);
      
      // Use the create_or_update_user_profile function to avoid conflicts
      const { data, error } = await supabase
        .rpc('create_or_update_user_profile', {
          user_id: userId,
          user_full_name: userName,
          user_role: role,
          user_is_active: true
        });

      if (error) {
        console.error('Error creating profile with RPC:', error);
        
        // Fallback to direct insert with conflict handling
        const { data: insertData, error: insertError } = await supabase
          .from('user_profiles')
          .upsert({
            id: userId,
            full_name: userName,
            role: role,
            is_active: true,
            username: userEmail
          }, {
            onConflict: 'id'
          })
          .select();
          
        if (insertError) {
          console.error('Error with fallback profile creation:', insertError);
          // Set default profile even if creation fails
          setUserProfile({
            id: userId,
            username: userEmail || null,
            full_name: userName,
            role: role,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        } else if (insertData && insertData.length > 0) {
          console.log('Profile created with fallback method:', insertData[0]);
          setUserProfile(insertData[0]);
        }
      } else {
        console.log('Profile created successfully with RPC');
        
        // Fetch the newly created profile
        const { data: newProfile, error: fetchError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (fetchError) {
          console.error('Error fetching new profile:', fetchError);
          // Set default profile
          setUserProfile({
            id: userId,
            username: userEmail || null,
            full_name: userName,
            role: role,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        } else {
          console.log('Fetched new profile:', newProfile);
          setUserProfile(newProfile);
        }
      }
    } catch (error) {
      console.error('Error creating default profile:', error);
      
      // Set a fallback profile
      setUserProfile({
        id: userId,
        username: null,
        full_name: session?.user?.user_metadata?.full_name || session?.user?.email || 'User',
        role: 'field_staff',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      if (!isValidSupabaseConfig()) {
        // Use mock authentication
        console.log('Using mock authentication for sign in');
        const result = await mockAuth.signIn(email, password);
        setUser({ id: result.user.id, email: result.user.email } as User);
        setUserProfile(result.profile);
        return;
      }

      // Test connection first
      const connectionValid = await testSupabaseConnection();
      if (!connectionValid) {
        console.log('Using mock authentication due to connection issues');
        const result = await mockAuth.signIn(email, password);
        setUser({ id: result.user.id, email: result.user.email } as User);
        setUserProfile(result.profile);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Sign in error:', error);
      
      // If it's a network error, try mock auth as fallback
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.log('Network error during sign in, trying mock authentication');
        try {
          const result = await mockAuth.signIn(email, password);
          setUser({ id: result.user.id, email: result.user.email } as User);
          setUserProfile(result.profile);
          return;
        } catch (mockError) {
          throw error; // Throw original error if mock also fails
        }
      }
      
      throw error;
    }
  };

  const signOut = async () => {
    try {
      if (!isValidSupabaseConfig()) {
        // Mock sign out
        setUser(null);
        setUserProfile(null);
        setSession(null);
        return;
      }

      // Only attempt sign out if we have a session
      if (!session) {
        console.log('No session to sign out');
        setUser(null);
        setUserProfile(null);
        return;
      }

      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        // Force sign out even if there's an error
      }
      
      // Clear state regardless of API response
      setUser(null);
      setUserProfile(null);
      setSession(null);
    } catch (error) {
      console.error('Sign out error:', error);
      // Force sign out even if there's an error
      setUser(null);
      setUserProfile(null);
      setSession(null);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!isValidSupabaseConfig()) {
      throw new Error('Supabase configuration is not valid. Please check your environment variables.');
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    
    if (error) throw error;
  };

  const value = {
    user,
    userProfile,
    session,
    loading,
    signIn,
    signOut,
    signUp,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}