import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { mockAuth } from '../lib/mockAuth';
import { testSupabaseConnection, isValidSupabaseConfig } from '../lib/supabase';
import type { Database } from '../lib/supabase';
import { supabase } from '../lib/supabase'; 

type Firm = Database['public']['Tables']['firms']['Row'];

interface AppContextType {
  selectedFirm: Firm | null;
  firms: Firm[];
  setSelectedFirm: (firm: Firm | null) => void;
  loading: boolean;
  refreshFirms: () => Promise<void>;
  assignUserToFirm: (userId: string, firmId: string) => Promise<void>;
  removeUserFromFirm: (userId: string, firmId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const { user, userProfile } = useAuth();
  const [selectedFirm, setSelectedFirm] = useState<Firm | null>(null);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && userProfile) {
      fetchFirms();
    } else {
      setFirms([]);
      setSelectedFirm(null);
      setLoading(false);
    }
  }, [user, userProfile]);

  // Load selected firm from localStorage when firms are loaded
  useEffect(() => {
    if (firms.length > 0 && !selectedFirm) {
      const savedFirmId = localStorage.getItem('selectedFirmId');
      if (savedFirmId) {
        const firm = firms.find(f => f.id === savedFirmId);
        if (firm) {
          setSelectedFirm(firm);
        } else {
          // If saved firm not found, select the first one
          setSelectedFirm(firms[0]);
          localStorage.setItem('selectedFirmId', firms[0].id);
        }
      } else {
        // If no saved firm, select the first one
        setSelectedFirm(firms[0]);
        localStorage.setItem('selectedFirmId', firms[0].id);
      }
    }
  }, [firms, selectedFirm]);

  // Save selected firm to localStorage when it changes
  useEffect(() => {
    if (selectedFirm) {
      localStorage.setItem('selectedFirmId', selectedFirm.id);
    }
  }, [selectedFirm]);

  const createDefaultFirms = (userId: string) => {
    return [
      {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Demo Electronics Ltd',
        address: '123 Business District, Mumbai, MH 400001',
        phone: '+91 22 1234 5678',
        email: 'info@demoelectronics.com',
        gst_number: '27DEMO1234F1Z5',
        status: 'active' as const,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        name: 'XYZ Trading Co',
        address: '456 Trade Center, Delhi, DL 110001',
        phone: '+91 11 9876 5432',
        email: 'contact@xyztrading.com',
        gst_number: '07XYZAB5678C1D2',
        status: 'active' as const,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        name: 'Demo Supplies Inc',
        address: '789 Industrial Area, Bangalore, KA 560001',
        phone: '+91 80 5555 6666',
        email: 'hello@demosupplies.com',
        gst_number: '29DEMO5678E1F3',
        status: 'active' as const,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ];
  };

  const setFirmsAndSelectFirst = (firmsList: Firm[]) => {
    setFirms(firmsList);
    
    if (!selectedFirm && firmsList.length > 0) {
      const savedFirmId = localStorage.getItem('selectedFirmId');
      if (savedFirmId) {
        const firm = firmsList.find(f => f.id === savedFirmId);
        if (firm) {
          setSelectedFirm(firm);
        } else {
          setSelectedFirm(firmsList[0]);
          localStorage.setItem('selectedFirmId', firmsList[0].id);
        }
      } else {
        setSelectedFirm(firmsList[0]);
        localStorage.setItem('selectedFirmId', firmsList[0].id);
      }
    }
  };

  const fetchFirms = async () => {
    if (!user || !userProfile) return;
    
    try {
      setLoading(true);
      
      // Check if we have valid Supabase configuration
      if (!isValidSupabaseConfig()) {
        console.log('Using mock firms data - invalid Supabase config');
        const mockFirms = await mockAuth.getUserFirms(user.id);
        
        if (mockFirms && mockFirms.length > 0) {
          setFirmsAndSelectFirst(mockFirms);
        } else {
          const defaultFirms = createDefaultFirms(user.id);
          setFirmsAndSelectFirst(defaultFirms);
        }
        
        setLoading(false);
        return;
      }

      // Test connection first
      const connectionValid = await testSupabaseConnection();
      if (!connectionValid) {
        console.log('Using mock firms data due to connection issues');
        const mockFirms = await mockAuth.getUserFirms(user.id);
        
        if (mockFirms && mockFirms.length > 0) {
          setFirmsAndSelectFirst(mockFirms);
        } else {
          const defaultFirms = createDefaultFirms(user.id);
          setFirmsAndSelectFirst(defaultFirms);
        }
        
        setLoading(false);
        return;
      }

      // If we have valid config and connection, try to fetch from Supabase
      try {
        // First, check if the user has a profile
        const { data: userProfileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          console.error('Error fetching user profile:', profileError);
          // Create a profile if it doesn't exist
          if (profileError.code === 'PGRST116' || profileError.message?.includes('No rows')) {
            try {
              const { data: newProfile, error: createError } = await supabase
                .from('user_profiles')
                .insert({
                  id: user.id,
                  full_name: user.email || 'User',
                  role: 'admin', // Default to admin for first user
                  is_active: true
                })
                .select()
                .single();
                
              if (createError) {
                console.error('Error creating user profile:', createError);
                throw createError;
              } else {
                console.log('Created new user profile:', newProfile);
              }
            } catch (createProfileError) {
              console.error('Failed to create user profile:', createProfileError);
              // Continue with fallback data
              const defaultFirms = createDefaultFirms(user.id);
              setFirmsAndSelectFirst(defaultFirms);
              setLoading(false);
              return;
            }
          } else {
            // Other profile errors, use fallback
            const defaultFirms = createDefaultFirms(user.id);
            setFirmsAndSelectFirst(defaultFirms);
            setLoading(false);
            return;
          }
        }
        
        // Try a simpler query first to get firms
        const { data: allFirms, error: firmsError } = await supabase
          .from('firms')
          .select('*')
          .order('name');
          
        if (firmsError) {
          console.error('Error fetching all firms:', firmsError);
          throw firmsError;
        }
        
        if (allFirms && allFirms.length > 0) {
          // Now check if the user has access to any of these firms
          try {
            const { data: userFirmAccess, error: accessError } = await supabase
              .from('user_firm_access')
              .select('firm_id')
              .eq('user_id', user.id);
              
            if (accessError) {
              console.error('Error fetching user firm access:', accessError);
              // If we can't get access info, just use all firms for admin users
              if (userProfile?.role === 'admin') {
                setFirmsAndSelectFirst(allFirms);
              } else {
                // For non-admin users, grant access to first firm
                const firstFirm = allFirms[0];
                
                try {
                  const { error: grantError } = await supabase
                    .from('user_firm_access')
                    .insert({
                      user_id: user.id,
                      firm_id: firstFirm.id
                    });
                    
                  if (grantError) {
                    console.error('Error granting firm access:', grantError);
                  }
                } catch (grantAccessError) {
                  console.error('Failed to grant firm access:', grantAccessError);
                }
                
                setFirmsAndSelectFirst([firstFirm]);
              }
            } else {
              // If user has firm access, filter firms
              if (userFirmAccess && userFirmAccess.length > 0) {
                const firmIds = userFirmAccess.map(access => access.firm_id);
                const accessibleFirms = allFirms.filter(firm => firmIds.includes(firm.id));
                
                if (accessibleFirms.length > 0) {
                  setFirmsAndSelectFirst(accessibleFirms);
                } else {
                  // User has access entries but no matching firms
                  // Grant access to the first firm
                  const firstFirm = allFirms[0];
                  
                  try {
                    const { error: grantError } = await supabase
                      .from('user_firm_access')
                      .insert({
                        user_id: user.id,
                        firm_id: firstFirm.id
                      });
                      
                    if (grantError) {
                      console.error('Error granting firm access:', grantError);
                    }
                  } catch (grantAccessError) {
                    console.error('Failed to grant firm access:', grantAccessError);
                  }
                  
                  setFirmsAndSelectFirst([firstFirm]);
                }
              } else {
                // User has no firm access, grant access to first firm
                const firstFirm = allFirms[0];
                
                try {
                  const { error: grantError } = await supabase
                    .from('user_firm_access')
                    .insert({
                      user_id: user.id,
                      firm_id: firstFirm.id
                    });
                    
                  if (grantError) {
                    console.error('Error granting firm access:', grantError);
                  }
                } catch (grantAccessError) {
                  console.error('Failed to grant firm access:', grantAccessError);
                }
                
                setFirmsAndSelectFirst([firstFirm]);
              }
            }
          } catch (accessFetchError) {
            console.error('Failed to fetch user firm access:', accessFetchError);
            // Fallback to using all firms for admin, first firm for others
            if (userProfile?.role === 'admin') {
              setFirmsAndSelectFirst(allFirms);
            } else {
              setFirmsAndSelectFirst([allFirms[0]]);
            }
          }
        } else {
          // No firms exist, create a default one
          const defaultFirm = {
            name: 'Demo Electronics Ltd',
            address: '123 Business District, Mumbai, MH 400001',
            phone: '+91 22 1234 5678',
            email: 'info@demoelectronics.com',
            gst_number: '27DEMO1234F1Z5',
            status: 'active',
            created_by: user.id
          };
          
          try {
            const { data: newFirm, error: createError } = await supabase
              .from('firms')
              .insert(defaultFirm)
              .select()
              .single();
              
            if (createError) {
              console.error('Error creating default firm:', createError);
              throw createError;
            }
            
            // Grant the user access to the new firm
            try {
              const { error: grantError } = await supabase
                .from('user_firm_access')
                .insert({
                  user_id: user.id,
                  firm_id: newFirm.id
                });
                
              if (grantError) {
                console.error('Error granting firm access:', grantError);
              }
            } catch (grantAccessError) {
              console.error('Failed to grant firm access:', grantAccessError);
            }
            
            console.log('Created new firm with access:', newFirm);
            setFirmsAndSelectFirst([newFirm]);
          } catch (createFirmError) {
            console.error('Failed to create default firm:', createFirmError);
            // Use mock data as final fallback
            const defaultFirms = createDefaultFirms(user.id);
            setFirmsAndSelectFirst(defaultFirms);
          }
        }
      } catch (supabaseError) {
        console.error('Error fetching firms from Supabase:', supabaseError);
        // Fallback to mock data on error
        const mockFirms = await mockAuth.getUserFirms(user.id);
        
        if (mockFirms && mockFirms.length > 0) {
          setFirmsAndSelectFirst(mockFirms);
        } else {
          const defaultFirms = createDefaultFirms(user.id);
          setFirmsAndSelectFirst(defaultFirms);
        }
      }
    } catch (error) {
      console.error('Error in fetchFirms:', error);
      // Final fallback
      const defaultFirms = createDefaultFirms(user?.id || '');
      setFirmsAndSelectFirst(defaultFirms);
    } finally {
      setLoading(false);
    }
  };

  const refreshFirms = async () => {
    await fetchFirms();
  };

  const assignUserToFirm = async (userId: string, firmId: string) => {
    try {
      // Check if we have valid Supabase configuration
      if (!isValidSupabaseConfig()) {
        console.log('Using mock user-firm assignment');
        await mockAuth.assignUserToFirm(userId, firmId);
        return;
      }

      // Test connection first
      const connectionValid = await testSupabaseConnection();
      if (!connectionValid) {
        console.log('Using mock user-firm assignment due to connection issues');
        await mockAuth.assignUserToFirm(userId, firmId);
        return;
      }

      const { error } = await supabase
        .from('user_firm_access')
        .insert({ user_id: userId, firm_id: firmId });
        
      if (error) {
        console.error('Error assigning user to firm:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error assigning user to firm:', error);
      throw error;
    }
  };

  const removeUserFromFirm = async (userId: string, firmId: string) => {
    try {
      // Check if we have valid Supabase configuration
      if (!isValidSupabaseConfig()) {
        console.log('Using mock user-firm removal');
        await mockAuth.removeUserFromFirm(userId, firmId);
        return;
      }

      // Test connection first
      const connectionValid = await testSupabaseConnection();
      if (!connectionValid) {
        console.log('Using mock user-firm removal due to connection issues');
        await mockAuth.removeUserFromFirm(userId, firmId);
        return;
      }

      const { error } = await supabase
        .from('user_firm_access')
        .delete()
        .eq('user_id', userId)
        .eq('firm_id', firmId);
        
      if (error) {
        console.error('Error removing user from firm:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error removing user from firm:', error);
      throw error;
    }
  };

  const value = {
    selectedFirm,
    firms,
    setSelectedFirm,
    loading,
    refreshFirms,
    assignUserToFirm,
    removeUserFromFirm
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}