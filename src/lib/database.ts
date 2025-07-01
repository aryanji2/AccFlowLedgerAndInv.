import { supabase } from './supabase';
import type { Database } from './supabase';

// Type aliases for easier use
type Tables = Database['public']['Tables'];
type Firm = Tables['firms']['Row'];
type UserProfile = Tables['user_profiles']['Row'];
type Party = Tables['parties']['Row'];
type Transaction = Tables['transactions']['Row'];
type Order = Tables['orders']['Row'];

// Firm operations
export const firmService = {
  async getAll() {
    const { data, error } = await supabase
      .from('firms')
      .select('*')
      .eq('status', 'active')
      .order('name');
    
    if (error) throw error;
    return data;
  },

  async create(firm: Tables['firms']['Insert']) {
    const { data, error } = await supabase
      .from('firms')
      .insert(firm)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Tables['firms']['Update']) {
    const { data, error } = await supabase
      .from('firms')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('firms')
      .update({ status: 'inactive' })
      .eq('id', id);
    
    if (error) throw error;
  }
};

// User profile operations
export const userService = {
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateProfile(userId: string, updates: Tables['user_profiles']['Update']) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getUserFirms(userId: string) {
    const { data, error } = await supabase
      .from('user_firm_access')
      .select(`
        firm_id,
        firms (*)
      `)
      .eq('user_id', userId);
    
    if (error) throw error;
    return data.map(item => item.firms).filter(Boolean);
  },

  async assignUserToFirm(userId: string, firmId: string) {
    const { error } = await supabase
      .from('user_firm_access')
      .insert({ user_id: userId, firm_id: firmId });
    
    if (error) throw error;
    return true;
  },

  async removeUserFromFirm(userId: string, firmId: string) {
    const { error } = await supabase
      .from('user_firm_access')
      .delete()
      .eq('user_id', userId)
      .eq('firm_id', firmId);
    
    if (error) throw error;
    return true;
  }
};

// Party operations
export const partyService = {
  async getAll(firmId: string) {
    const { data, error } = await supabase
      .from('parties')
      .select(`
        *,
        location_groups (
          id,
          name,
          description
        )
      `)
      .eq('firm_id', firmId)
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    return data;
  },

  async create(party: Tables['parties']['Insert']) {
    const { data, error } = await supabase
      .from('parties')
      .insert(party)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Tables['parties']['Update']) {
    const { data, error } = await supabase
      .from('parties')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('parties')
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Transaction operations
export const transactionService = {
  async getAll(firmId: string) {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        parties (
          id,
          name,
          type
        )
      `)
      .eq('firm_id', firmId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async create(transaction: Tables['transactions']['Insert']) {
    const { data, error } = await supabase
      .from('transactions')
      .insert(transaction)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: 'approved' | 'rejected', approvedBy?: string) {
    const updates: Tables['transactions']['Update'] = {
      status,
      approved_by: approvedBy,
      approved_at: status === 'approved' ? new Date().toISOString() : null
    };

    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Order operations
export const orderService = {
  async getAll(firmId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        parties (
          id,
          name,
          contact_person
        ),
        order_items (
          id,
          product_name,
          pieces,
          cases,
          unit_price,
          total_price
        )
      `)
      .eq('firm_id', firmId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async create(order: Tables['orders']['Insert'], items: any[]) {
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert(order)
      .select()
      .single();
    
    if (orderError) throw orderError;

    if (items.length > 0) {
      const orderItems = items.map(item => ({
        order_id: orderData.id,
        product_id: item.productId,
        product_name: item.productName,
        pieces: item.pieces,
        cases: item.cases,
        pieces_per_case: item.piecesPerCase,
        unit_price: item.unitPrice,
        total_price: item.totalPrice
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
      
      if (itemsError) throw itemsError;
    }

    return orderData;
  },

  async updateStatus(id: string, status: 'approved' | 'rejected', approvedBy?: string) {
    const updates: Tables['orders']['Update'] = {
      status,
      approved_by: approvedBy,
      approved_at: status === 'approved' ? new Date().toISOString() : null
    };

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Location group operations
export const locationGroupService = {
  async getAll(firmId: string) {
    const { data, error } = await supabase
      .from('location_groups')
      .select('*')
      .eq('firm_id', firmId)
      .order('name');
    
    if (error) throw error;
    return data;
  },

  async create(locationGroup: Tables['location_groups']['Insert']) {
    const { data, error } = await supabase
      .from('location_groups')
      .insert(locationGroup)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Tables['location_groups']['Update']) {
    const { data, error } = await supabase
      .from('location_groups')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('location_groups')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Category operations
export const categoryService = {
  async getAll(firmId: string) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('firm_id', firmId)
      .order('name');
    
    if (error) throw error;
    return data;
  },

  async create(category: Tables['categories']['Insert']) {
    const { data, error } = await supabase
      .from('categories')
      .insert(category)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Tables['categories']['Update']) {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Product operations
export const productService = {
  async getAll(firmId: string) {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        categories (
          id,
          name,
          color
        )
      `)
      .eq('firm_id', firmId)
      .order('name');
    
    if (error) throw error;
    return data;
  },

  async create(product: Tables['products']['Insert']) {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Tables['products']['Update']) {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateInventory(id: string, availablePieces: number, reservedPieces?: number) {
    const updates: Tables['products']['Update'] = { available_pieces: availablePieces };
    if (reservedPieces !== undefined) {
      updates.reserved_pieces = reservedPieces;
    }

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Cheque operations
export const chequeService = {
  async getAll(firmId: string) {
    const { data, error } = await supabase
      .from('cheques')
      .select(`
        *,
        parties (
          id,
          name,
          contact_person
        )
      `)
      .eq('firm_id', firmId)
      .order('due_date');
    
    if (error) throw error;
    return data;
  },

  async create(cheque: Tables['cheques']['Insert']) {
    const { data, error } = await supabase
      .from('cheques')
      .insert(cheque)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: 'cleared' | 'bounced' | 'cancelled', notes?: string) {
    const updates: any = { status, notes };
    
    if (status === 'cleared') {
      updates.cleared_date = new Date().toISOString().split('T')[0];
    } else if (status === 'bounced') {
      updates.bounced_date = new Date().toISOString().split('T')[0];
    }

    const { data, error } = await supabase
      .from('cheques')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Bill operations
export const billService = {
  async getAll(firmId: string) {
    const { data, error } = await supabase
      .from('bills')
      .select(`
        *,
        bill_items (
          id,
          product_name,
          quantity,
          pieces_per_case,
          unit_price,
          total_price,
          category
        )
      `)
      .eq('firm_id', firmId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async create(bill: Tables['bills']['Insert'], items: any[]) {
    const { data: billData, error: billError } = await supabase
      .from('bills')
      .insert(bill)
      .select()
      .single();
    
    if (billError) throw billError;

    if (items.length > 0) {
      const billItems = items.map(item => ({
        bill_id: billData.id,
        product_name: item.product_name,
        quantity: item.quantity,
        pieces_per_case: item.pieces_per_case,
        unit_price: item.unit_price,
        total_price: item.total_price,
        category: item.category
      }));

      const { error: itemsError } = await supabase
        .from('bill_items')
        .insert(billItems);
      
      if (itemsError) throw itemsError;
    }

    return billData;
  },

  async updateStatus(id: string, status: 'approved' | 'rejected', approvedBy?: string) {
    const updates: Tables['bills']['Update'] = {
      status,
      approved_by: approvedBy,
      approved_at: status === 'approved' ? new Date().toISOString() : null
    };

    const { data, error } = await supabase
      .from('bills')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};