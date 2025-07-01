-- Ensure categories table exists
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

-- Enable RLS on categories table if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'categories' AND rowsecurity = true
  ) THEN
    ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Add RLS policies for categories (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'categories' AND policyname = 'Users can access categories for their firms'
  ) THEN
    CREATE POLICY "Users can access categories for their firms" ON categories
      FOR ALL
      TO public
      USING (
        EXISTS (
          SELECT 1
          FROM user_firm_access
          WHERE user_firm_access.user_id = auth.uid() AND user_firm_access.firm_id = categories.firm_id
        )
      );
  END IF;
END $$;

-- Add updated_at trigger for categories (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_categories_updated_at'
  ) THEN
    CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Ensure products table has category_id foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE products ADD COLUMN category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for better performance (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_categories_firm_id'
  ) THEN
    CREATE INDEX idx_categories_firm_id ON categories(firm_id);
  END IF;
END $$;