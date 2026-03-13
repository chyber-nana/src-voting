const { pool } = require("../config/db");

const getNomineesByCategory = async (req, res) => {
  const { categoryId } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM nominees WHERE category_id = $1 ORDER BY votes DESC",
      [categoryId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createNominee = async (req, res) => {
  const { name, category_id } = req.body;

  if (!name || !category_id) {
    return res.status(400).json({ error: "Name and category_id are required" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO nominees (name, category_id) VALUES ($1, $2) RETURNING id, name, category_id",
      [name.trim(), category_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateNominee = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    await pool.query(
      "UPDATE nominees SET name = $1 WHERE id = $2",
      [name.trim(), id]
    );

    res.json({ message: "Nominee updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteNominee = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM nominees WHERE id = $1", [id]);
    res.json({ message: "Nominee deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getNomineesByCategory,
  createNominee,
  updateNominee,
  deleteNominee
};