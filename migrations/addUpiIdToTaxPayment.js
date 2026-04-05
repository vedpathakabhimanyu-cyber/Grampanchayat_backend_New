/**
 * Migration: Add UPI ID field to tax_payment table
 * 
 * This migration adds the upi_id column to the tax_payment table
 * to store the UPI ID for verification messages on the frontend
 */

// Load environment variables FIRST
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const { pool } = require("../config/database");

const migration = {
  name: "addUpiIdToTaxPayment",
  
  up: async () => {
    const client = await pool.connect();
    
    try {
      console.log("Running migration: addUpiIdToTaxPayment...");
      
      // Check if tax_payment table exists
      const tableCheckQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'tax_payment'
        )
      `;
      const tableCheckResult = await client.query(tableCheckQuery);
      const tableExists = tableCheckResult.rows[0].exists;
      
      if (!tableExists) {
        console.log("Creating tax_payment table...");
        const createTableQuery = `
          CREATE TABLE IF NOT EXISTS tax_payment (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            qr_file_path TEXT,
            qr_file_url TEXT,
            qr_file_type VARCHAR(50),
            tax_info TEXT,
            bank_name VARCHAR(255),
            account_name VARCHAR(255),
            account_no VARCHAR(50),
            ifsc_code VARCHAR(20),
            upi_id VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;
        await client.query(createTableQuery);
        console.log("✓ tax_payment table created successfully");
      } else {
        // Check if upi_id column exists
        const columnCheckQuery = `
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'tax_payment' 
            AND column_name = 'upi_id'
          )
        `;
        const columnCheckResult = await client.query(columnCheckQuery);
        const columnExists = columnCheckResult.rows[0].exists;
        
        if (!columnExists) {
          console.log("Adding upi_id column to tax_payment table...");
          const addColumnQuery = `
            ALTER TABLE tax_payment 
            ADD COLUMN upi_id VARCHAR(100)
          `;
          await client.query(addColumnQuery);
          console.log("✓ upi_id column added successfully");
        } else {
          console.log("✓ upi_id column already exists");
        }
      }
      
      // Add trigger if it doesn't exist
      const triggerCheckQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.triggers 
          WHERE trigger_name = 'update_tax_payment_updated_at'
        )
      `;
      const triggerCheckResult = await client.query(triggerCheckQuery);
      const triggerExists = triggerCheckResult.rows[0].exists;
      
      if (!triggerExists) {
        console.log("Adding updated_at trigger to tax_payment table...");
        
        // Check if function exists
        const functionCheckQuery = `
          SELECT EXISTS (
            SELECT FROM information_schema.routines 
            WHERE routine_name = 'update_updated_at_column'
          )
        `;
        const functionCheckResult = await client.query(functionCheckQuery);
        
        if (!functionCheckResult.rows[0].exists) {
          const createFunctionQuery = `
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
              NEW.updated_at = CURRENT_TIMESTAMP;
              RETURN NEW;
            END;
            $$ language 'plpgsql'
          `;
          await client.query(createFunctionQuery);
        }
        
        const createTriggerQuery = `
          CREATE TRIGGER update_tax_payment_updated_at 
          BEFORE UPDATE ON tax_payment 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column()
        `;
        await client.query(createTriggerQuery);
        console.log("✓ Trigger added successfully");
      } else {
        console.log("✓ Trigger already exists");
      }
      
      // Enable RLS if not already enabled
      const rlsCheckQuery = `
        SELECT row_security_enabled
        FROM information_schema.table_security
        WHERE table_name = 'tax_payment'
      `;
      
      try {
        const rlsCheckResult = await client.query(rlsCheckQuery);
        
        if (!rlsCheckResult.rows[0]?.row_security_enabled) {
          console.log("Enabling RLS on tax_payment table...");
          await client.query("ALTER TABLE tax_payment ENABLE ROW LEVEL SECURITY");
          
          // Create public read policy
          const policyCheckQuery = `
            SELECT EXISTS (
              SELECT FROM information_schema.table_constraints 
              WHERE constraint_type = 'POLICY' 
              AND table_name = 'tax_payment'
              AND constraint_name LIKE '%Public%'
            )
          `;
          const policyCheckResult = await client.query(policyCheckQuery);
          
          if (!policyCheckResult.rows[0]?.exists) {
            await client.query(`
              CREATE POLICY "Public read access" ON tax_payment 
              FOR SELECT USING (true)
            `);
          }
          console.log("✓ RLS and policies configured");
        }
      } catch (e) {
        console.log("Note: Could not check RLS status (might not be supported in all environments)");
      }
      
      console.log("✓ Migration completed successfully!");
      return true;
      
    } catch (error) {
      console.error("❌ Migration failed:", error.message);
      throw error;
    } finally {
      client.release();
    }
  },
  
  down: async () => {
    const client = await pool.connect();
    
    try {
      console.log("Rolling back migration: addUpiIdToTaxPayment...");
      
      // Drop trigger
      const dropTriggerQuery = `
        DROP TRIGGER IF EXISTS update_tax_payment_updated_at ON tax_payment
      `;
      await client.query(dropTriggerQuery);
      
      // Drop column
      const dropColumnQuery = `
        ALTER TABLE tax_payment 
        DROP COLUMN IF EXISTS upi_id
      `;
      await client.query(dropColumnQuery);
      
      console.log("✓ Rollback completed successfully!");
      return true;
      
    } catch (error) {
      console.error("❌ Rollback failed:", error.message);
      throw error;
    } finally {
      client.release();
    }
  }
};

// Run migration if executed directly
if (require.main === module) {
  migration.up()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = migration;
