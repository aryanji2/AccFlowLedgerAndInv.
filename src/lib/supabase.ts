import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Validate Supabase configuration
export const isValidSupabaseConfig = () => {
  return supabaseUrl && 
         supabaseAnonKey && 
         supabaseUrl !== 'https://placeholder.supabase.co' &&
         supabaseUrl !== 'https://your-project-id.supabase.co' &&
         supabaseAnonKey !== 'placeholder-key' &&
         supabaseAnonKey !== 'your-anon-key-here' &&
         !supabaseUrl.includes('placeholder') &&
         !supabaseUrl.includes('your-project-id') &&
         !supabaseAnonKey.includes('placeholder') &&
         !supabaseAnonKey.includes('your-anon-key') &&
         supabaseUrl.startsWith('https://') &&
         supabaseUrl.includes('.supabase.co');
};

// Create client with proper error handling
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Test connection function - only test if config is valid
export const testSupabaseConnection = async () => {
  try {
    // First check if we have valid configuration
    if (!isValidSupabaseConfig()) {
      console.log('Supabase configuration is invalid or missing');
      return false;
    }

    // Only attempt connection if config is valid
    const { error } = await supabase.from('user_profiles').select('count').limit(1);
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return false;
  }
};

// Database types
export interface Database {
  public: {
    Tables: {
      firms: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          phone: string | null;
          email: string | null;
          gst_number: string | null;
          status: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          gst_number?: string | null;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          gst_number?: string | null;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          username: string | null;
          full_name: string;
          role: 'admin' | 'accountant' | 'field_staff';
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          full_name: string;
          role: 'admin' | 'accountant' | 'field_staff';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          full_name?: string;
          role?: 'admin' | 'accountant' | 'field_staff';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      parties: {
        Row: {
          id: string;
          firm_id: string;
          name: string;
          contact_person: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          location_group_id: string | null;
          type: 'customer' | 'supplier';
          balance: number;
          debtor_days: number;
          last_payment_date: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          firm_id: string;
          name: string;
          contact_person?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          location_group_id?: string | null;
          type: 'customer' | 'supplier';
          balance?: number;
          debtor_days?: number;
          last_payment_date?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          firm_id?: string;
          name?: string;
          contact_person?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          location_group_id?: string | null;
          type?: 'customer' | 'supplier';
          balance?: number;
          debtor_days?: number;
          last_payment_date?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          firm_id: string;
          party_id: string;
          type: 'sale' | 'collection' | 'payment';
          amount: number;
          status: 'pending' | 'approved' | 'rejected';
          bill_number: string | null;
          payment_method: string | null;
          reference_number: string | null;
          notes: string | null;
          transaction_date: string;
          created_by: string | null;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          firm_id: string;
          party_id: string;
          type: 'sale' | 'collection' | 'payment';
          amount: number;
          status?: 'pending' | 'approved' | 'rejected';
          bill_number?: string | null;
          payment_method?: string | null;
          reference_number?: string | null;
          notes?: string | null;
          transaction_date?: string;
          created_by?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          firm_id?: string;
          party_id?: string;
          type?: 'sale' | 'collection' | 'payment';
          amount?: number;
          status?: 'pending' | 'approved' | 'rejected';
          bill_number?: string | null;
          payment_method?: string | null;
          reference_number?: string | null;
          notes?: string | null;
          transaction_date?: string;
          created_by?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          firm_id: string;
          party_id: string;
          order_number: string;
          status: 'draft' | 'pending' | 'approved' | 'rejected';
          total_amount: number;
          order_date: string;
          notes: string | null;
          created_by: string | null;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          firm_id: string;
          party_id: string;
          order_number: string;
          status?: 'draft' | 'pending' | 'approved' | 'rejected';
          total_amount?: number;
          order_date?: string;
          notes?: string | null;
          created_by?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          firm_id?: string;
          party_id?: string;
          order_number?: string;
          status?: 'draft' | 'pending' | 'approved' | 'rejected';
          total_amount?: number;
          order_date?: string;
          notes?: string | null;
          created_by?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}