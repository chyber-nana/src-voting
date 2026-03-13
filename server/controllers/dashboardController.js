const { pool } = require("../config/db");

const getDashboardStats = async (req, res) => {
  try {
    const categoriesResult = await pool.query(
      "SELECT * FROM categories ORDER BY id ASC"
    );

    const categories = categoriesResult.rows;

    if (!categories.length) {
      return res.json({
        categories: [],
        totalMoney: 0
      });
    }

    const formattedCategories = await Promise.all(
      categories.map(async (category) => {
        const nomineesResult = await pool.query(
          `SELECT id, name, votes, amount_made
           FROM nominees
           WHERE category_id = $1
           ORDER BY id ASC`,
          [category.id]
        );

        const nominees = nomineesResult.rows.map((n) => ({
          id: n.id,
          name: n.name,
          votes: n.votes,
          amount: `GH₵ ${Number(n.amount_made).toFixed(2)}`
        }));

        return {
          id: category.id,
          name: category.name,
          nominees
        };
      })
    );

    const totalResult = await pool.query(
      `SELECT COALESCE(SUM(amount_paid), 0) AS total FROM votes`
    );

    res.json({
      categories: formattedCategories,
      totalMoney: Number(totalResult.rows[0].total)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getDashboardStats };