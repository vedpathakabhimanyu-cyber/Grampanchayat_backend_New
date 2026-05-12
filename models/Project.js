const { pool } = require("../config/database");
const { deleteFromSupabase } = require("../middleware/upload");

class Project {
  static async find() {
    try {
      const result = await pool.query(
        "SELECT * FROM projects ORDER BY created_at DESC"
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const result = await pool.query("SELECT * FROM projects WHERE id = $1", [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async save(data) {
    const {
      id,
      name,
      type,
      description,
      cost,
      start_date,
      end_date,
      status,
      image,
      image_url,
    } = data;
    
    // Convert empty strings to null for optional fields
    const formattedCost = cost === "" ? null : cost;
    const formattedStartDate = start_date === "" ? null : start_date;
    const formattedEndDate = end_date === "" ? null : end_date;
    const formattedStatus = status === "" ? "प्रस्तावित" : status;
    const formattedImage = image ?? image_url ?? null;

    try {
      if (id) {
        // Update
        const result = await pool.query(
          `UPDATE projects SET 
            name = $1, 
            type = $2, 
            description = $3, 
            cost = $4, 
            start_date = $5, 
            end_date = $6, 
            status = $7,
            image = $8,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $9 RETURNING *`,
          [
            name,
            type,
            description,
            formattedCost,
            formattedStartDate,
            formattedEndDate,
            formattedStatus,
            formattedImage,
            id,
          ]
        );
        return result.rows[0];
      } else {
        // Create
        const result = await pool.query(
          `INSERT INTO projects (name, type, description, cost, start_date, end_date, status, image)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [
            name,
            type,
            description,
            formattedCost,
            formattedStartDate,
            formattedEndDate,
            formattedStatus,
            formattedImage,
          ]
        );
        return result.rows[0];
      }
    } catch (error) {
      throw error;
    }
  }

  static async delete(id) {
    try {
      const existing = await pool.query("SELECT image FROM projects WHERE id = $1", [id]);
      await pool.query("DELETE FROM projects WHERE id = $1", [id]);

      const image = existing.rows[0]?.image;
      if (image) {
        await deleteFromSupabase(image);
      }

      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Project;
