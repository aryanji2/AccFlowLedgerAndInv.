-- Create helper functions first

-- Create a function to check if a user is an admin (if it doesn't exist)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if a user is an admin or accountant (if it doesn't exist)
CREATE OR REPLACE FUNCTION is_admin_or_accountant()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'accountant')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can access transactions for their firms" ON transactions;
DROP POLICY IF EXISTS "Users can access orders for their firms" ON orders;
DROP POLICY IF EXISTS "Users can access order items through orders" ON order_items;
DROP POLICY IF EXISTS "Users can access cheques for their firms" ON cheques;
DROP POLICY IF EXISTS "Users can access bills for their firms" ON bills;
DROP POLICY IF EXISTS "Users can access bill items through bills" ON bill_items;
DROP POLICY IF EXISTS "Only admins can assign firm access" ON user_firm_access;
DROP POLICY IF EXISTS "User can view own firm access" ON user_firm_access;
DROP POLICY IF EXISTS "Users can see own firm access" ON user_firm_access;
DROP POLICY IF EXISTS "Allow users to insert firms they create" ON firms;
DROP POLICY IF EXISTS "Allow all users to read firms" ON firms;

-- Create policies for transactions
CREATE POLICY "Users can access transactions for their firms" ON transactions
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM user_firm_access
      WHERE user_firm_access.user_id = auth.uid() AND user_firm_access.firm_id = transactions.firm_id
    )
  );

-- Create policies for orders
CREATE POLICY "Users can access orders for their firms" ON orders
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM user_firm_access
      WHERE user_firm_access.user_id = auth.uid() AND user_firm_access.firm_id = orders.firm_id
    )
  );

-- Create policies for order items
CREATE POLICY "Users can access order items through orders" ON order_items
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM orders o
      JOIN user_firm_access ufa ON ufa.firm_id = o.firm_id
      WHERE ufa.user_id = auth.uid() AND o.id = order_items.order_id
    )
  );

-- Create policies for cheques
CREATE POLICY "Users can access cheques for their firms" ON cheques
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM user_firm_access
      WHERE user_firm_access.user_id = auth.uid() AND user_firm_access.firm_id = cheques.firm_id
    )
  );

-- Create policies for bills
CREATE POLICY "Users can access bills for their firms" ON bills
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM user_firm_access
      WHERE user_firm_access.user_id = auth.uid() AND user_firm_access.firm_id = bills.firm_id
    )
  );

-- Create policies for bill items
CREATE POLICY "Users can access bill items through bills" ON bill_items
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM bills b
      JOIN user_firm_access ufa ON ufa.firm_id = b.firm_id
      WHERE ufa.user_id = auth.uid() AND b.id = bill_items.bill_id
    )
  );

-- Add policies for user_firm_access
CREATE POLICY "Only admins can assign firm access" ON user_firm_access
  FOR INSERT
  TO public
  WITH CHECK (is_admin());

CREATE POLICY "User can view own firm access" ON user_firm_access
  FOR SELECT
  TO public
  USING (user_id = auth.uid());

-- Add policies for firms
CREATE POLICY "Allow users to insert firms they create" ON firms
  FOR INSERT
  TO public
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Allow all users to read firms" ON firms
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM user_firm_access ufa
      WHERE ufa.user_id = auth.uid() AND ufa.firm_id = firms.id
    )
  );