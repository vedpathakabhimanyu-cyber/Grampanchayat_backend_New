require("dotenv").config({ path: ".env" });
const { pool } = require("./config/database");

async function verify() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tax_payment' 
      ORDER BY ordinal_position
    `);
    
    console.log("✓ Tax Payment Table Columns:");
    console.log("=====================================");
    result.rows.forEach(row => {
      console.log(`  ${row.column_name.padEnd(20)} | ${row.data_type}`);
    });
    console.log("=====================================");
    
    // Check if upi_id exists
    const hasUpiId = result.rows.some(r => r.column_name === 'upi_id');
    if (hasUpiId) {
      console.log("✓ UPI ID column successfully added!");
    } else {
      console.log("✗ UPI ID column not found");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

verify();
