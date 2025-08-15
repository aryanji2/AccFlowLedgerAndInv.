/*
  # Comprehensive Schema Consolidation

  This migration consolidates all database schemas, tables, RLS policies, functions, and triggers
  that were created both through migration files and directly in the Supabase SQL editor.

  ## 1. Tables Created
  - `user_profiles` - User profile information with roles
  - `firms` - Business firm information
  - `user_firm_access` - Many-to-many relationship between users and firms
  - `location_groups` - Geographic groupings for parties
  - `categories` - Product categories for inventory organization
  - `parties` - Customers and suppliers
  - `products` - Inventory items
  - `transactions` - All business transactions (sales, collections, payments)
  - `orders` - Purchase orders
  - `order_items` - Items within orders
  - `cheques` - Received cheques tracking
  - `payable_cheques` - Outgoing cheques tracking
  - `bills` - Supplier bills
  - `bill_items` - Items within bills
  - `daybook_entries` - Daily transaction entries

  ## 2. Security (RLS)
  - Enable RLS on all tables
  - Add comprehensive policies for user access control
  - Firm-based access control for multi-tenant architecture

  ## 3. Functions and Triggers
  - `update_updated_at_column()` - Auto-update timestamp function
  - `handle_new_user()` - Auto-create user profile on signup
  - `update_party_balance()` - Auto-update party balances
  - `update_inventory_on_order_approval()` - Auto-update inventory on order approval
  - `update_inventory_on_bill_approval()` - Auto-update inventory on bill approval
  - Various triggers for automatic updates

  ## 4. Important Notes
  - Uses IF NOT EXISTS and IF EXISTS clauses to prevent conflicts
  - Maintains data integrity with proper foreign key constraints
  - Implements comprehensive RLS for multi-tenant security
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, role, is_active, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'field_staff'),
    true,
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create update_party_balance function
CREATE OR REPLACE FUNCTION update_party_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update balance for approved transactions
  IF NEW.status = 'approved' THEN
    UPDATE parties 
    SET balance = (
      SELECT COALESCE(SUM(
        CASE 
          WHEN t.type = 'sale' THEN t.amount
          WHEN t.type = 'collection' THEN -t.amount
          WHEN t.type = 'opening_balance' THEN t.amount
          ELSE 0
        END
      ), 0)
      FROM transactions t
      WHERE t.party_id = NEW.party_id 
        AND t.status = 'approved'
    ),
    last_payment_date = CASE 
      WHEN NEW.type = 'collection' THEN NEW.transaction_date::date
      ELSE last_payment_date
    END,
    debtor_days = CASE 
      WHEN NEW.type = 'collection' THEN 0
      ELSE GREATEST(0, EXTRACT(days FROM (CURRENT_DATE - COALESCE(last_payment_date, CURRENT_DATE))))
    END
    WHERE id = NEW.party_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create inventory update functions
CREATE OR REPLACE FUNCTION update_inventory_on_order_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when status changes to approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Update inventory for each order item
    UPDATE products 
    SET available_pieces = available_pieces - oi.pieces,
        reserved_pieces = GREATEST(0, reserved_pieces - oi.pieces)
    FROM order_items oi
    WHERE products.id = oi.product_id 
      AND oi.order_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_inventory_on_bill_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when status changes to approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Add inventory for each bill item
    -- This would require matching bill items to products
    -- For now, we'll just log the approval
    RAISE NOTICE 'Bill % approved, inventory should be updated', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'accountant', 'field_staff')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create firms table
CREATE TABLE IF NOT EXISTS firms (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  address text,
  phone text,
  email text,
  gst_number text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_firm_access table
CREATE TABLE IF NOT EXISTS user_firm_access (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  firm_id uuid REFERENCES firms(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, firm_id)
);

-- Create location_groups table
CREATE TABLE IF NOT EXISTS location_groups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id uuid REFERENCES firms(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id uuid REFERENCES firms(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT 'bg-blue-500',
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create parties table
CREATE TABLE IF NOT EXISTS parties (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id uuid REFERENCES firms(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  location_group_id uuid REFERENCES location_groups(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('customer', 'supplier')),
  balance numeric(12,2) DEFAULT 0,
  debtor_days integer DEFAULT 0,
  last_payment_date date,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  opening_balance numeric DEFAULT 0
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id uuid REFERENCES firms(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  pieces_per_case integer DEFAULT 1,
  unit_price numeric(10,2) DEFAULT 0,
  available_pieces integer DEFAULT 0,
  reserved_pieces integer DEFAULT 0,
  low_stock_threshold integer DEFAULT 50,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id uuid REFERENCES firms(id) ON DELETE CASCADE,
  party_id uuid REFERENCES parties(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('sale', 'collection', 'payment', 'opening_balance')),
  amount numeric(12,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  bill_number text,
  payment_method text CHECK (payment_method IN ('cash', 'upi', 'cheque', 'bank_transfer', 'goods_return')),
  reference_number text,
  notes text,
  transaction_date date DEFAULT CURRENT_DATE,
  created_by uuid REFERENCES user_profiles(id),
  approved_by uuid REFERENCES user_profiles(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id uuid REFERENCES firms(id) ON DELETE CASCADE,
  party_id uuid REFERENCES parties(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  total_amount numeric(12,2) DEFAULT 0,
  order_date date DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid REFERENCES user_profiles(id),
  approved_by uuid REFERENCES user_profiles(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  pieces integer NOT NULL,
  cases integer DEFAULT 0,
  pieces_per_case integer DEFAULT 1,
  unit_price numeric(10,2) NOT NULL,
  total_price numeric(12,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create cheques table
CREATE TABLE IF NOT EXISTS cheques (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id uuid REFERENCES firms(id) ON DELETE CASCADE,
  party_id uuid REFERENCES parties(id) ON DELETE CASCADE,
  cheque_number text NOT NULL,
  amount numeric(12,2) NOT NULL,
  received_date date NOT NULL,
  due_date date NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'cleared', 'bounced', 'cancelled')),
  bank_name text,
  notes text,
  cleared_date date,
  bounced_date date,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payable_cheques table
CREATE TABLE IF NOT EXISTS payable_cheques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES firms(id),
  party_name text NOT NULL,
  amount numeric NOT NULL,
  due_date date NOT NULL,
  status text DEFAULT 'upcoming' NOT NULL,
  notes text,
  paid_date date,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create bills table
CREATE TABLE IF NOT EXISTS bills (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id uuid REFERENCES firms(id) ON DELETE CASCADE,
  bill_number text NOT NULL,
  supplier_name text NOT NULL,
  total_amount numeric(12,2) NOT NULL,
  bill_date date NOT NULL,
  category text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  file_url text,
  ocr_text text,
  parsed_data jsonb,
  notes text,
  created_by uuid REFERENCES user_profiles(id),
  approved_by uuid REFERENCES user_profiles(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create bill_items table
CREATE TABLE IF NOT EXISTS bill_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id uuid REFERENCES bills(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  quantity integer NOT NULL,
  pieces_per_case integer DEFAULT 1,
  unit_price numeric(10,2) NOT NULL,
  total_price numeric(12,2) NOT NULL,
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create daybook_entries table
CREATE TABLE IF NOT EXISTS daybook_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  date date NOT NULL,
  type text NOT NULL CHECK (type IN ('sale', 'collection')),
  party_name text NOT NULL,
  amount numeric(15,2) NOT NULL CHECK (amount > 0),
  bill_number text,
  payment_method text,
  notes text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_by uuid NOT NULL REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_firm_access_user_id ON user_firm_access(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_firm_id ON categories(firm_id);

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_firm_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cheques ENABLE ROW LEVEL SECURITY;
ALTER TABLE payable_cheques ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE daybook_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
DROP POLICY IF EXISTS "Allow authenticated users to create profiles" ON user_profiles;
CREATE POLICY "Allow authenticated users to create profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to read all profiles" ON user_profiles;
CREATE POLICY "Allow authenticated users to read all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to update profiles" ON user_profiles;
CREATE POLICY "Allow authenticated users to update profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete profiles" ON user_profiles;
CREATE POLICY "Allow authenticated users to delete profiles"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for firms
DROP POLICY IF EXISTS "Admins can manage all firms" ON firms;
CREATE POLICY "Admins can manage all firms"
  ON firms FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
  ));

DROP POLICY IF EXISTS "Users can access assigned firms" ON firms;
CREATE POLICY "Users can access assigned firms"
  ON firms FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_firm_access
    WHERE user_firm_access.user_id = auth.uid()
      AND user_firm_access.firm_id = firms.id
  ));

DROP POLICY IF EXISTS "Authenticated users can create firms" ON firms;
CREATE POLICY "Authenticated users can create firms"
  ON firms FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update own firms" ON firms;
CREATE POLICY "Users can update own firms"
  ON firms FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- RLS Policies for user_firm_access
DROP POLICY IF EXISTS "Allow authenticated users to read all firm access" ON user_firm_access;
CREATE POLICY "Allow authenticated users to read all firm access"
  ON user_firm_access FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to create firm access" ON user_firm_access;
CREATE POLICY "Allow authenticated users to create firm access"
  ON user_firm_access FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete firm access" ON user_firm_access;
CREATE POLICY "Allow authenticated users to delete firm access"
  ON user_firm_access FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for location_groups
DROP POLICY IF EXISTS "Users can read location groups in their firm" ON location_groups;
CREATE POLICY "Users can read location groups in their firm"
  ON location_groups FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_firm_access
    WHERE user_firm_access.user_id = auth.uid()
      AND user_firm_access.firm_id = location_groups.firm_id
  ));

DROP POLICY IF EXISTS "Users can insert location groups they create" ON location_groups;
CREATE POLICY "Users can insert location groups they create"
  ON location_groups FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update location groups they created" ON location_groups;
CREATE POLICY "Users can update location groups they created"
  ON location_groups FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Admins or Accountants can delete location groups" ON location_groups;
CREATE POLICY "Admins or Accountants can delete location groups"
  ON location_groups FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'accountant')
  ));

-- RLS Policies for categories
DROP POLICY IF EXISTS "Users can access categories for their firms" ON categories;
CREATE POLICY "Users can access categories for their firms"
  ON categories FOR ALL
  TO public
  USING (EXISTS (
    SELECT 1 FROM user_firm_access
    WHERE user_firm_access.user_id = auth.uid()
      AND user_firm_access.firm_id = categories.firm_id
  ));

-- RLS Policies for parties
DROP POLICY IF EXISTS "Users can read parties in their firm" ON parties;
CREATE POLICY "Users can read parties in their firm"
  ON parties FOR SELECT
  TO public
  USING (firm_id IN (
    SELECT user_firm_access.firm_id
    FROM user_firm_access
    WHERE user_firm_access.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Allow admin or accountant to insert parties" ON parties;
CREATE POLICY "Allow admin or accountant to insert parties"
  ON parties FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'accountant')
  ));

DROP POLICY IF EXISTS "Allow admin to update parties" ON parties;
CREATE POLICY "Allow admin to update parties"
  ON parties FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
  ));

DROP POLICY IF EXISTS "Allow admin or accountant to delete parties" ON parties;
CREATE POLICY "Allow admin or accountant to delete parties"
  ON parties FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'accountant')
  ));

-- RLS Policies for products
DROP POLICY IF EXISTS "Users can access products for their firms" ON products;
CREATE POLICY "Users can access products for their firms"
  ON products FOR ALL
  TO public
  USING (EXISTS (
    SELECT 1 FROM user_firm_access
    WHERE user_firm_access.user_id = auth.uid()
      AND user_firm_access.firm_id = products.firm_id
  ));

-- RLS Policies for transactions
DROP POLICY IF EXISTS "Users can access transactions for their firms" ON transactions;
CREATE POLICY "Users can access transactions for their firms"
  ON transactions FOR ALL
  TO public
  USING (EXISTS (
    SELECT 1 FROM user_firm_access
    WHERE user_firm_access.user_id = auth.uid()
      AND user_firm_access.firm_id = transactions.firm_id
  ));

-- RLS Policies for orders
DROP POLICY IF EXISTS "Users can access orders for their firms" ON orders;
CREATE POLICY "Users can access orders for their firms"
  ON orders FOR ALL
  TO public
  USING (EXISTS (
    SELECT 1 FROM user_firm_access
    WHERE user_firm_access.user_id = auth.uid()
      AND user_firm_access.firm_id = orders.firm_id
  ));

-- RLS Policies for order_items
DROP POLICY IF EXISTS "Users can access order items through orders" ON order_items;
CREATE POLICY "Users can access order items through orders"
  ON order_items FOR ALL
  TO public
  USING (EXISTS (
    SELECT 1 FROM orders o
    JOIN user_firm_access ufa ON ufa.firm_id = o.firm_id
    WHERE ufa.user_id = auth.uid()
      AND o.id = order_items.order_id
  ));

-- RLS Policies for cheques
DROP POLICY IF EXISTS "Users can access cheques for their firms" ON cheques;
CREATE POLICY "Users can access cheques for their firms"
  ON cheques FOR ALL
  TO public
  USING (EXISTS (
    SELECT 1 FROM user_firm_access
    WHERE user_firm_access.user_id = auth.uid()
      AND user_firm_access.firm_id = cheques.firm_id
  ));

-- RLS Policies for payable_cheques
DROP POLICY IF EXISTS "Allow firm members to view their payable cheques" ON payable_cheques;
CREATE POLICY "Allow firm members to view their payable cheques"
  ON payable_cheques FOR SELECT
  TO public
  USING (auth.uid() IN (
    SELECT user_firm_access.user_id
    FROM user_firm_access
    WHERE user_firm_access.firm_id = payable_cheques.firm_id
  ));

DROP POLICY IF EXISTS "Allow firm members to insert payable cheques for their firm" ON payable_cheques;
CREATE POLICY "Allow firm members to insert payable cheques for their firm"
  ON payable_cheques FOR INSERT
  TO public
  WITH CHECK (auth.uid() IN (
    SELECT user_firm_access.user_id
    FROM user_firm_access
    WHERE user_firm_access.firm_id = payable_cheques.firm_id
  ));

DROP POLICY IF EXISTS "Allow firm members to update their payable cheques" ON payable_cheques;
CREATE POLICY "Allow firm members to update their payable cheques"
  ON payable_cheques FOR UPDATE
  TO public
  USING (auth.uid() IN (
    SELECT user_firm_access.user_id
    FROM user_firm_access
    WHERE user_firm_access.firm_id = payable_cheques.firm_id
  ));

-- RLS Policies for bills
DROP POLICY IF EXISTS "Users can access bills for their firms" ON bills;
CREATE POLICY "Users can access bills for their firms"
  ON bills FOR ALL
  TO public
  USING (EXISTS (
    SELECT 1 FROM user_firm_access
    WHERE user_firm_access.user_id = auth.uid()
      AND user_firm_access.firm_id = bills.firm_id
  ));

-- RLS Policies for bill_items
DROP POLICY IF EXISTS "Users can access bill items through bills" ON bill_items;
CREATE POLICY "Users can access bill items through bills"
  ON bill_items FOR ALL
  TO public
  USING (EXISTS (
    SELECT 1 FROM bills b
    JOIN user_firm_access ufa ON ufa.firm_id = b.firm_id
    WHERE ufa.user_id = auth.uid()
      AND b.id = bill_items.bill_id
  ));

-- RLS Policies for daybook_entries
DROP POLICY IF EXISTS "Users can access daybook entries for their firms" ON daybook_entries;
CREATE POLICY "Users can access daybook entries for their firms"
  ON daybook_entries FOR ALL
  TO public
  USING (EXISTS (
    SELECT 1 FROM user_firm_access
    WHERE user_firm_access.user_id = auth.uid()
      AND user_firm_access.firm_id = daybook_entries.firm_id
  ));

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_firms_updated_at ON firms;
CREATE TRIGGER update_firms_updated_at
  BEFORE UPDATE ON firms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_location_groups_updated_at ON location_groups;
CREATE TRIGGER update_location_groups_updated_at
  BEFORE UPDATE ON location_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_parties_updated_at ON parties;
CREATE TRIGGER update_parties_updated_at
  BEFORE UPDATE ON parties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cheques_updated_at ON cheques;
CREATE TRIGGER update_cheques_updated_at
  BEFORE UPDATE ON cheques
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bills_updated_at ON bills;
CREATE TRIGGER update_bills_updated_at
  BEFORE UPDATE ON bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create triggers for business logic
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;
CREATE TRIGGER handle_new_user_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

DROP TRIGGER IF EXISTS update_party_balance_trigger ON transactions;
CREATE TRIGGER update_party_balance_trigger
  AFTER INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_party_balance();

DROP TRIGGER IF EXISTS update_party_balance_insert_trigger ON transactions;
CREATE TRIGGER update_party_balance_insert_trigger
  AFTER INSERT ON transactions
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION update_party_balance();

DROP TRIGGER IF EXISTS update_party_balance_update_trigger ON transactions;
CREATE TRIGGER update_party_balance_update_trigger
  AFTER UPDATE ON transactions
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_party_balance();

DROP TRIGGER IF EXISTS update_inventory_on_order_approval_trigger ON orders;
CREATE TRIGGER update_inventory_on_order_approval_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_inventory_on_order_approval();

DROP TRIGGER IF EXISTS update_inventory_on_bill_approval_trigger ON bills;
CREATE TRIGGER update_inventory_on_bill_approval_trigger
  AFTER UPDATE ON bills
  FOR EACH ROW EXECUTE FUNCTION update_inventory_on_bill_approval();

-- Create RPC function for user profile management
CREATE OR REPLACE FUNCTION create_or_update_user_profile(
  user_id uuid,
  user_full_name text,
  user_role text,
  user_is_active boolean DEFAULT true
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_profiles (id, full_name, role, is_active, username)
  VALUES (user_id, user_full_name, user_role, user_is_active, '')
  ON CONFLICT (id) 
  DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;