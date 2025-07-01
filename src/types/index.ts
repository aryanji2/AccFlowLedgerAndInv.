export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: 'admin' | 'accountant' | 'field_staff';
  is_active: boolean;
  created_at: string;
}

export interface Firm {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface LocationGroup {
  id: string;
  firm_id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
}

export interface Party {
  id: string;
  firm_id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  location_group_id: string;
  location_group?: LocationGroup;
  balance: number;
  type: 'customer' | 'supplier';
  debtor_days: number;
  last_payment_date?: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  firm_id: string;
  party_id: string;
  type: 'sale' | 'collection' | 'payment';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  bill_number?: string;
  payment_method?: 'cash' | 'upi' | 'cheque';
  created_by: string;
  created_at: string;
  party?: Party;
}

export interface Product {
  id: string;
  firm_id: string;
  category_id: string;
  name: string;
  pieces_per_case: number;
  unit_price: number;
  created_at: string;
}

export interface Order {
  id: string;
  firm_id: string;
  party_id: string;
  order_number: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  total_amount: number;
  created_by: string;
  created_at: string;
  party?: Party;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  pieces: number;
  cases: number;
  unit_price: number;
  total_price: number;
  product?: Product;
}

export interface BillUpload {
  id: string;
  firm_id: string;
  file_url: string;
  ocr_text?: string;
  parsed_data?: any;
  review_status: 'pending' | 'approved' | 'rejected';
  created_by: string;
  created_at: string;
}

export interface DashboardStats {
  totalSales: number;
  totalCollections: number;
  pendingApprovals: number;
  overdueParties: number;
  totalParties: number;
  pendingCheques: number;
  salesGrowth: number;
  collectionsGrowth: number;
  urgentApprovals: number;
  criticalOverdue: number;
  newParties: number;
  chequesToday: number;
}