-- SQL Migration Script: Add UPI ID to tax_payment table
-- Run this script directly in Supabase SQL Editor if needed

-- Add upi_id column if it doesn't exist
ALTER TABLE tax_payment
ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);

-- Add updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_tax_payment_updated_at') THEN
        CREATE TRIGGER update_tax_payment_updated_at 
        BEFORE UPDATE ON tax_payment 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tax_payment' 
ORDER BY ordinal_position;
