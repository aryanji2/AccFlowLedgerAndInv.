/*
  # Initial Database Schema for AccFlow Business Management System

  1. New Tables
    - `firms` - Business firms/companies
    - `users` - System users with role-based access
    - `user_firm_access` - Many-to-many relationship between users and firms
    - `location_groups` - Geographic groupings for parties
    - `parties` - Customers and suppliers
    - `categories` - Product categories
    - `products` - Product catalog
    - `transactions` - Sales, collections, and payments
    - `orders` - Purchase orders
    - `order_items` - Items within orders
    - `cheques` - Cheque management
    - `bills` - Bill uploads and OCR data
    - `bill_items` - Items within bills

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Firms table
CREATE TABLE IF NOT EXISTS firms (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  address text,
  phone text,
  email text,
  gst_number text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Users profile table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'accountant', 'field_staff')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User firm access (many-to-many)
CREATE TABLE IF NOT EXISTS user_firm_access (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  firm_id uuid REFERENCES firms(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, firm_id)
);

-- Location groups
CREATE TABLE IF NOT EXISTS location_groups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id uuid REFERENCES firms(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id uuid REFERENCES firms(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT 'bg-blue-500',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id uuid REFERENCES firms(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  pieces_per_case integer DEFAULT 1,
  unit_price decimal(10,2) DEFAULT 0,
  available_pieces integer DEFAULT 0,
  reserved_pieces integer DEFAULT 0,
  low_stock_threshold integer DEFAULT 50,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Parties (customers/suppliers)
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
  balance decimal(12,2) DEFAULT 0,
  debtor_days integer DEFAULT 0,
  last_payment_date date,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id uuid REFERENCES firms(id) ON DELETE CASCADE,
  party_id uuid REFERENCES parties(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('sale', 'collection', 'payment')),
  amount decimal(12,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  bill_number text,
  payment_method text CHECK (payment_method IN ('cash', 'upi', 'cheque', 'bank_transfer', 'goods_return')),
  reference_number text,
  notes text,
  transaction_date date DEFAULT CURRENT_DATE,
  created_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id uuid REFERENCES firms(id) ON DELETE CASCADE,
  party_id uuid REFERENCES parties(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  total_amount decimal(12,2) DEFAULT 0,
  order_date date DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  pieces integer NOT NULL,
  cases integer DEFAULT 0,
  pieces_per_case integer DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  total_price decimal(12,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Cheques
CREATE TABLE IF NOT EXISTS cheques (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id uuid REFERENCES firms(id) ON DELETE CASCADE,
  party_id uuid REFERENCES parties(id) ON DELETE CASCADE,
  cheque_number text NOT NULL,
  amount decimal(12,2) NOT NULL,
  received_date date NOT NULL,
  due_date date NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'cleared', 'bounced', 'cancelled')),
  bank_name text,
  notes text,
  cleared_date date,
  bounced_date date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Bills
CREATE TABLE IF NOT EXISTS bills (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id uuid REFERENCES firms(id) ON DELETE CASCADE,
  bill_number text NOT NULL,
  supplier_name text NOT NULL,
  total_amount decimal(12,2) NOT NULL,
  bill_date date NOT NULL,
  category text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  file_url text,
  ocr_text text,
  parsed_data jsonb,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Bill items
CREATE TABLE IF NOT EXISTS bill_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id uuid REFERENCES bills(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  quantity integer NOT NULL,
  pieces_per_case integer DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  total_price decimal(12,2) NOT NULL,
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_firm_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cheques ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User profiles: Users can read their own profile, admins can read all
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Firms: Users can only access firms they have access to
CREATE POLICY "Users can access assigned firms" ON firms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_firm_access 
      WHERE user_id = auth.uid() AND firm_id = firms.id
    )
  );

-- Location groups: Users can access location groups for their firms
CREATE POLICY "Users can access location groups for their firms" ON location_groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_firm_access 
      WHERE user_id = auth.uid() AND firm_id = location_groups.firm_id
    )
  );

-- Categories: Users can access categories for their firms
CREATE POLICY "Users can access categories for their firms" ON categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_firm_access 
      WHERE user_id = auth.uid() AND firm_id = categories.firm_id
    )
  );

-- Products: Users can access products for their firms
CREATE POLICY "Users can access products for their firms" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_firm_access 
      WHERE user_id = auth.uid() AND firm_id = products.firm_id
    )
  );

-- Parties: Users can access parties for their firms
CREATE POLICY "Users can access parties for their firms" ON parties
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_firm_access 
      WHERE user_id = auth.uid() AND firm_id = parties.firm_id
    )
  );

-- Transactions: Users can access transactions for their firms
CREATE POLICY "Users can access transactions for their firms" ON transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_firm_access 
      WHERE user_id = auth.uid() AND firm_id = transactions.firm_id
    )
  );

-- Orders: Users can access orders for their firms
CREATE POLICY "Users can access orders for their firms" ON orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_firm_access 
      WHERE user_id = auth.uid() AND firm_id = orders.firm_id
    )
  );

-- Order items: Users can access order items through orders
CREATE POLICY "Users can access order items through orders" ON order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN user_firm_access ufa ON ufa.firm_id = o.firm_id
      WHERE ufa.user_id = auth.uid() AND o.id = order_items.order_id
    )
  );

-- Cheques: Users can access cheques for their firms
CREATE POLICY "Users can access cheques for their firms" ON cheques
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_firm_access 
      WHERE user_id = auth.uid() AND firm_id = cheques.firm_id
    )
  );

-- Bills: Users can access bills for their firms
CREATE POLICY "Users can access bills for their firms" ON bills
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_firm_access 
      WHERE user_id = auth.uid() AND firm_id = bills.firm_id
    )
  );

-- Bill items: Users can access bill items through bills
CREATE POLICY "Users can access bill items through bills" ON bill_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM bills b
      JOIN user_firm_access ufa ON ufa.firm_id = b.firm_id
      WHERE ufa.user_id = auth.uid() AND b.id = bill_items.bill_id
    )
  );

-- User firm access: Users can only see their own access
CREATE POLICY "Users can see own firm access" ON user_firm_access
  FOR SELECT USING (auth.uid() = user_id);

-- Functions and Triggers

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_firms_updated_at BEFORE UPDATE ON firms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_location_groups_updated_at BEFORE UPDATE ON location_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parties_updated_at BEFORE UPDATE ON parties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cheques_updated_at BEFORE UPDATE ON cheques
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, role)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', new.email), 'field_staff');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update party balance when transactions are approved
CREATE OR REPLACE FUNCTION update_party_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update balance when status changes to approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    IF NEW.type = 'sale' THEN
      -- Increase party balance (amount owed to us)
      UPDATE parties 
      SET balance = balance + NEW.amount,
          debtor_days = CASE 
            WHEN last_payment_date IS NULL THEN 
              EXTRACT(days FROM (CURRENT_DATE - NEW.transaction_date))
            ELSE 
              EXTRACT(days FROM (CURRENT_DATE - last_payment_date))
          END
      WHERE id = NEW.party_id;
    ELSIF NEW.type = 'collection' THEN
      -- Decrease party balance (payment received)
      UPDATE parties 
      SET balance = balance - NEW.amount,
          last_payment_date = NEW.transaction_date,
          debtor_days = 0
      WHERE id = NEW.party_id;
    ELSIF NEW.type = 'payment' THEN
      -- Increase party balance (we owe them)
      UPDATE parties 
      SET balance = balance - NEW.amount
      WHERE id = NEW.party_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for party balance updates
CREATE TRIGGER update_party_balance_trigger
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_party_balance();

-- Function to update product inventory when orders are approved
CREATE OR REPLACE FUNCTION update_inventory_on_order_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- When order is approved, reduce available inventory and reserved inventory
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    UPDATE products 
    SET available_pieces = available_pieces - oi.pieces,
        reserved_pieces = GREATEST(0, reserved_pieces - oi.pieces)
    FROM order_items oi 
    WHERE oi.order_id = NEW.id AND products.id = oi.product_id;
  END IF;
  
  -- When order is rejected, release reserved inventory
  IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    UPDATE products 
    SET reserved_pieces = GREATEST(0, reserved_pieces - oi.pieces)
    FROM order_items oi 
    WHERE oi.order_id = NEW.id AND products.id = oi.product_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for inventory updates on order approval
CREATE TRIGGER update_inventory_on_order_approval_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_on_order_approval();

-- Function to add inventory when bills are approved
CREATE OR REPLACE FUNCTION update_inventory_on_bill_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- When bill is approved, add to inventory
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- For each bill item, try to find matching product or create new one
    INSERT INTO products (firm_id, name, pieces_per_case, unit_price, available_pieces, created_by)
    SELECT 
      NEW.firm_id,
      bi.product_name,
      bi.pieces_per_case,
      bi.unit_price,
      bi.quantity,
      NEW.approved_by
    FROM bill_items bi 
    WHERE bi.bill_id = NEW.id
    ON CONFLICT (firm_id, name) DO UPDATE SET
      available_pieces = products.available_pieces + EXCLUDED.available_pieces,
      unit_price = EXCLUDED.unit_price,
      pieces_per_case = EXCLUDED.pieces_per_case;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for inventory updates on bill approval
CREATE TRIGGER update_inventory_on_bill_approval_trigger
  AFTER UPDATE ON bills
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_on_bill_approval();