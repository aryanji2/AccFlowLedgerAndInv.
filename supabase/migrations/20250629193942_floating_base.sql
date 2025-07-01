-- Function to calculate debtor days based on transaction history
CREATE OR REPLACE FUNCTION calculate_debtor_days(p_party_id UUID)
RETURNS INTEGER AS $$
DECLARE
  last_payment_date DATE;
  first_unpaid_date DATE;
  current_balance NUMERIC;
  days INTEGER;
BEGIN
  -- Get the party's current balance
  SELECT balance INTO current_balance
  FROM parties
  WHERE id = p_party_id;
  
  -- If balance is zero or negative, debtor days is zero
  IF current_balance <= 0 THEN
    RETURN 0;
  END IF;
  
  -- Get the last payment date
  SELECT MAX(transaction_date) INTO last_payment_date
  FROM transactions
  WHERE party_id = p_party_id
    AND type = 'collection'
    AND status = 'approved';
  
  -- If there's a last payment, calculate days since then
  IF last_payment_date IS NOT NULL THEN
    -- Update the last_payment_date in parties table
    UPDATE parties
    SET last_payment_date = last_payment_date
    WHERE id = p_party_id;
    
    -- Calculate days since last payment
    days := (CURRENT_DATE - last_payment_date);
    RETURN days;
  END IF;
  
  -- If no payment found, find the first unpaid transaction
  SELECT MIN(transaction_date) INTO first_unpaid_date
  FROM transactions
  WHERE party_id = p_party_id
    AND type = 'sale'
    AND status = 'approved';
  
  -- If there's a first unpaid transaction, calculate days since then
  IF first_unpaid_date IS NOT NULL THEN
    days := (CURRENT_DATE - first_unpaid_date);
    RETURN days;
  END IF;
  
  -- Default to zero if no relevant transactions found
  RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- Update the party_balance function to properly update debtor days
CREATE OR REPLACE FUNCTION update_party_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update balance when status changes to approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    IF NEW.type = 'sale' THEN
      -- Increase party balance (amount owed to us)
      UPDATE parties 
      SET balance = balance + NEW.amount
      WHERE id = NEW.party_id;
    ELSIF NEW.type = 'collection' THEN
      -- Decrease party balance (payment received)
      UPDATE parties 
      SET balance = balance - NEW.amount,
          last_payment_date = NEW.transaction_date
      WHERE id = NEW.party_id;
    ELSIF NEW.type = 'payment' THEN
      -- Increase party balance (we owe them)
      UPDATE parties 
      SET balance = balance - NEW.amount
      WHERE id = NEW.party_id;
    END IF;
    
    -- Recalculate debtor days
    UPDATE parties
    SET debtor_days = calculate_debtor_days(NEW.party_id)
    WHERE id = NEW.party_id;
  END IF;
  
  -- Update party balance when transaction status changes from approved to something else
  IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    IF NEW.type = 'sale' THEN
      -- Reverse the sale amount
      UPDATE parties 
      SET balance = balance - NEW.amount
      WHERE id = NEW.party_id;
    ELSIF NEW.type = 'collection' THEN
      -- Reverse the collection amount
      UPDATE parties 
      SET balance = balance + NEW.amount
      WHERE id = NEW.party_id;
    ELSIF NEW.type = 'payment' THEN
      -- Reverse the payment amount
      UPDATE parties 
      SET balance = balance + NEW.amount
      WHERE id = NEW.party_id;
    END IF;
    
    -- Recalculate debtor days
    UPDATE parties
    SET debtor_days = calculate_debtor_days(NEW.party_id)
    WHERE id = NEW.party_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update debtor days for all parties
CREATE OR REPLACE FUNCTION update_all_debtor_days()
RETURNS VOID AS $$
DECLARE
  party_record RECORD;
BEGIN
  FOR party_record IN SELECT id FROM parties WHERE balance > 0 LOOP
    UPDATE parties
    SET debtor_days = calculate_debtor_days(party_record.id)
    WHERE id = party_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Update debtor days for all existing parties
SELECT update_all_debtor_days();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_debtor_days(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_all_debtor_days() TO authenticated;