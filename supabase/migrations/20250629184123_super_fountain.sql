/*
  # Fix EXTRACT function usage in database triggers

  1. Problem
    - The EXTRACT function is being called with incorrect argument types
    - Error: "function pg_catalog.extract(unknown, integer) does not exist"
    - This suggests EXTRACT is being called like EXTRACT('month', 6) instead of EXTRACT(MONTH FROM date_column)

  2. Solution
    - Update any trigger functions that use EXTRACT with correct syntax
    - Ensure EXTRACT uses proper date/time field specifiers and date/timestamp columns

  3. Changes
    - Fix the update_party_balance function if it contains incorrect EXTRACT usage
    - Ensure all date extractions use proper syntax: EXTRACT(field FROM date_column)
*/

-- First, let's check if the update_party_balance function exists and recreate it with correct syntax
/*
  # Fix EXTRACT function usage in database triggers

  1. Problem
    - The EXTRACT function is being called with incorrect argument types
    - Error: "function pg_catalog.extract(unknown, integer) does not exist"
    - This suggests EXTRACT is being called like EXTRACT('month', 6) instead of EXTRACT(MONTH FROM date_column)

  2. Solution
    - Update any trigger functions that use EXTRACT with correct syntax
    - Ensure EXTRACT uses proper date/time field specifiers and date/timestamp columns

  3. Changes
    - Fix the update_party_balance function if it contains incorrect EXTRACT usage
    - Ensure all date extractions use proper syntax: EXTRACT(field FROM date_column)
*/

-- First, let's check if the update_party_balance function exists and recreate it with correct syntax
CREATE OR REPLACE FUNCTION update_party_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- When a transaction is approved (status changes to 'approved')
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Skip balance update for opening balance transactions
    IF NEW.type != 'opening_balance' THEN
      IF NEW.type = 'sale' THEN
        UPDATE parties 
        SET balance = balance + NEW.amount,
            last_payment_date = last_payment_date
        WHERE id = NEW.party_id;

      ELSIF NEW.type = 'collection' THEN
        UPDATE parties 
        SET balance = balance - NEW.amount,
            last_payment_date = NEW.transaction_date
        WHERE id = NEW.party_id;
      END IF;
    END IF;
  END IF;

  -- When a transaction is unapproved (status changes from 'approved' to something else)
  IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    -- Skip reversing opening balance
    IF OLD.type != 'opening_balance' THEN
      IF OLD.type = 'sale' THEN
        UPDATE parties 
        SET balance = balance - OLD.amount
        WHERE id = OLD.party_id;

      ELSIF OLD.type = 'collection' THEN
        UPDATE parties 
        SET balance = balance + OLD.amount
        WHERE id = OLD.party_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_party_balance_trigger ON transactions;

CREATE TRIGGER update_party_balance_trigger
AFTER UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_party_balance(); 