const { pool } = require("../config/db");

const getCategories = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM categories ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createCategory = async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Category name is required" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO categories (name) VALUES ($1) RETURNING id, name",
      [name.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    await pool.query(
      "UPDATE categories SET name = $1 WHERE id = $2",
      [name.trim(), id]
    );

    res.json({ message: "Category updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM categories WHERE id = $1", [id]);
    res.json({ message: "Category deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};