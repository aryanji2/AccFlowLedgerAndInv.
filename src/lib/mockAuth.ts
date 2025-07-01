// Mock authentication service for development
// This will be replaced with actual Supabase calls when configured

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'accountant' | 'field_staff';
  is_active: boolean;
  created_at: string;
}

interface Firm {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  gst_number: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface UserFirmAccess {
  user_id: string;
  firm_id: string;
}

class MockAuthService {
  private users: User[] = [
    {
      id: 'admin-1',
      email: 'admin@accflow.com',
      full_name: 'Admin User',
      role: 'admin',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'accountant-1',
      email: 'accountant@accflow.com',
      full_name: 'John Accountant',
      role: 'accountant',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'field-1',
      email: 'field@accflow.com',
      full_name: 'Field Staff',
      role: 'field_staff',
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ];

  private firms: Firm[] = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Demo Electronics Ltd',
      address: '123 Business District, Mumbai, MH 400001',
      phone: '+91 22 1234 5678',
      email: 'info@demoelectronics.com',
      gst_number: '27DEMO1234F1Z5',
      status: 'active',
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
      status: 'active',
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
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ];

  private userFirmAccess: UserFirmAccess[] = [
    { user_id: 'admin-1', firm_id: '00000000-0000-0000-0000-000000000001' },
    { user_id: 'admin-1', firm_id: '00000000-0000-0000-0000-000000000002' },
    { user_id: 'admin-1', firm_id: '00000000-0000-0000-0000-000000000003' },
    { user_id: 'accountant-1', firm_id: '00000000-0000-0000-0000-000000000001' },
    { user_id: 'accountant-1', firm_id: '00000000-0000-0000-0000-000000000002' },
    { user_id: 'field-1', firm_id: '00000000-0000-0000-0000-000000000001' },
  ];

  async signIn(email: string, password: string) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const user = this.users.find(u => u.email === email);
    if (!user) {
      throw new Error('Invalid login credentials');
    }
    
    return {
      user: {
        id: user.id,
        email: user.email,
      },
      profile: user
    };
  }

  async getUserProfile(userId: string) {
    return this.users.find(u => u.id === userId) || null;
  }

  async getAllUsers() {
    // Add user_firm_access to each user
    return this.users.map(user => {
      const userAccess = this.userFirmAccess.filter(access => access.user_id === user.id);
      return {
        ...user,
        user_firm_access: userAccess.map(access => {
          const firm = this.firms.find(f => f.id === access.firm_id);
          return {
            firm_id: access.firm_id,
            firms: firm ? { id: firm.id, name: firm.name } : null
          };
        })
      };
    });
  }

  async createUser(userData: {
    email: string;
    password: string;
    full_name: string;
    role: 'admin' | 'accountant' | 'field_staff';
    firms: string[];
  }) {
    const newUser: User = {
      id: `user-${Date.now()}`,
      email: userData.email,
      full_name: userData.full_name,
      role: userData.role,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    
    this.users.push(newUser);
    
    // Create user-firm access entries
    if (userData.firms && userData.firms.length > 0) {
      for (const firmId of userData.firms) {
        this.userFirmAccess.push({
          user_id: newUser.id,
          firm_id: firmId
        });
      }
    }
    
    return newUser;
  }

  async updateUser(userId: string, updates: Partial<User> & { firms?: string[] }) {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    
    // Update user profile
    const { firms, ...userUpdates } = updates;
    this.users[userIndex] = { ...this.users[userIndex], ...userUpdates };
    
    // Update firm assignments if provided
    if (firms) {
      // Remove existing assignments
      this.userFirmAccess = this.userFirmAccess.filter(access => access.user_id !== userId);
      
      // Add new assignments
      for (const firmId of firms) {
        this.userFirmAccess.push({
          user_id: userId,
          firm_id: firmId
        });
      }
    }
    
    return this.users[userIndex];
  }

  async updateUserRole(userId: string, role: 'admin' | 'accountant' | 'field_staff') {
    return this.updateUser(userId, { role });
  }

  async toggleUserStatus(userId: string) {
    const user = this.users.find(u => u.id === userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    return this.updateUser(userId, { is_active: !user.is_active });
  }

  async deleteUser(userId: string) {
    this.users = this.users.filter(u => u.id !== userId);
    // Also remove firm access entries
    this.userFirmAccess = this.userFirmAccess.filter(access => access.user_id !== userId);
    return true;
  }

  async getFirms() {
    return this.firms;
  }

  async getUserFirms(userId: string) {
    // Get firm IDs for this user
    const userAccess = this.userFirmAccess.filter(access => access.user_id === userId);
    
    // Map to actual firm objects
    return userAccess.map(access => {
      const firm = this.firms.find(f => f.id === access.firm_id);
      return firm || null;
    }).filter(Boolean);
  }

  async createFirm(firmData: Partial<Firm>) {
    const newFirm: Firm = {
      id: `00000000-0000-0000-0000-${Date.now().toString().slice(-12)}`,
      name: firmData.name || 'New Firm',
      address: firmData.address || '',
      phone: firmData.phone || '',
      email: firmData.email || '',
      gst_number: firmData.gst_number || '',
      status: firmData.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    this.firms.push(newFirm);
    return newFirm;
  }

  async updateFirm(firmId: string, updates: Partial<Firm>) {
    const firmIndex = this.firms.findIndex(f => f.id === firmId);
    if (firmIndex === -1) {
      throw new Error('Firm not found');
    }
    
    this.firms[firmIndex] = { 
      ...this.firms[firmIndex], 
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    return this.firms[firmIndex];
  }

  async deleteFirm(firmId: string) {
    this.firms = this.firms.filter(f => f.id !== firmId);
    // Also remove firm access entries
    this.userFirmAccess = this.userFirmAccess.filter(access => access.firm_id !== firmId);
    return true;
  }

  async assignUserToFirm(userId: string, firmId: string) {
    // Check if assignment already exists
    const exists = this.userFirmAccess.some(
      access => access.user_id === userId && access.firm_id === firmId
    );
    
    if (!exists) {
      this.userFirmAccess.push({ user_id: userId, firm_id: firmId });
    }
    
    return true;
  }

  async removeUserFromFirm(userId: string, firmId: string) {
    this.userFirmAccess = this.userFirmAccess.filter(
      access => !(access.user_id === userId && access.firm_id === firmId)
    );
    
    return true;
  }

  async getParties(firmId: string) {
    // Mock parties data
    return [
      {
        id: 'party-1',
        firm_id: firmId,
        name: 'ABC Retailers',
        contact_person: 'John Smith',
        phone: '+91 98765 43210',
        email: 'john@abcretailers.com',
        balance: 75000,
        type: 'customer',
        created_at: new Date().toISOString(),
      },
      {
        id: 'party-2',
        firm_id: firmId,
        name: 'XYZ Distributors',
        contact_person: 'Sarah Johnson',
        phone: '+91 87654 32109',
        email: 'sarah@xyzdist.com',
        balance: 180000,
        type: 'customer',
        created_at: new Date().toISOString(),
      },
      {
        id: 'party-3',
        firm_id: firmId,
        name: 'Quick Mart',
        contact_person: 'Mike Chen',
        phone: '+91 76543 21098',
        email: 'mike@quickmart.com',
        balance: 95000,
        type: 'customer',
        created_at: new Date().toISOString(),
      },
      {
        id: 'party-4',
        firm_id: firmId,
        name: 'Super Store',
        contact_person: 'Lisa Wang',
        phone: '+91 65432 10987',
        email: 'lisa@superstore.com',
        balance: 120000,
        type: 'customer',
        created_at: new Date().toISOString(),
      },
      {
        id: 'party-5',
        firm_id: firmId,
        name: 'Global Suppliers',
        contact_person: 'Raj Patel',
        phone: '+91 54321 09876',
        email: 'raj@globalsuppliers.com',
        balance: -50000,
        type: 'supplier',
        created_at: new Date().toISOString(),
      }
    ];
  }
}

export const mockAuth = new MockAuthService();