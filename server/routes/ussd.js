const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");

const PRICE_PER_VOTE = 1;

// Africa's Talking USSD callback
router.post("/callback", async (req, res) => {
  const { sessionId, serviceCode, phoneNumber, text } = req.body;

  res.set("Content-Type", "text/plain");

  const input = (text || "").trim();

  try {
    // Step 1: First screen
    if (input === "") {
      return res.send(
        "CON Welcome to SRC Voting\n" + "1. Vote\n" + "2. Check nominee votes",
      );
    }

    // Step 2: Show categories
    if (input === "1") {
      const categoriesResult = await pool.query(
        "SELECT id, name FROM categories ORDER BY id ASC",
      );

      const categories = categoriesResult.rows;

      if (!categories.length) {
        return res.send("END No categories available.");
      }

      let menu = "CON Select category\n";
      categories.forEach((row, i) => {
        menu += `${i + 1}. ${row.name}\n`;
      });

      return res.send(menu.trim());
    }

    // Step 3: Show nominees in selected category
    // Example: 1*2
    if (/^1\*\d+$/.test(input)) {
      const [, categoryChoice] = input.split("*");

      const categoriesResult = await pool.query(
        "SELECT id, name FROM categories ORDER BY id ASC",
      );
      const categories = categoriesResult.rows;

      const categoryIndex = Number(categoryChoice) - 1;
      const selectedCategory = categories[categoryIndex];

      if (!selectedCategory) {
        return res.send("END Invalid category choice.");
      }

      const nomineesResult = await pool.query(
        "SELECT id, name FROM nominees WHERE category_id = $1 ORDER BY id ASC",
        [selectedCategory.id],
      );

      const nominees = nomineesResult.rows;

      if (!nominees.length) {
        return res.send("END No nominees found for this category.");
      }

      let menu = `CON ${selectedCategory.name} nominees\n`;
      nominees.forEach((nominee, i) => {
        menu += `${i + 1}. ${nominee.name}\n`;
      });

      return res.send(menu.trim());
    }

    // Step 4: Choose nominee
    // Example: 1*2*1
    if (/^1\*\d+\*\d+$/.test(input)) {
      const [, categoryChoice, nomineeChoice] = input.split("*");

      const categoriesResult = await pool.query(
        "SELECT id, name FROM categories ORDER BY id ASC",
      );
      const categories = categoriesResult.rows;

      const selectedCategory = categories[Number(categoryChoice) - 1];

      if (!selectedCategory) {
        return res.send("END Invalid category choice.");
      }

      const nomineesResult = await pool.query(
        "SELECT id, name FROM nominees WHERE category_id = $1 ORDER BY id ASC",
        [selectedCategory.id],
      );
      const nominees = nomineesResult.rows;

      if (!nominees.length) {
        return res.send("END No nominees found for this category.");
      }

      const selectedNominee = nominees[Number(nomineeChoice) - 1];

      if (!selectedNominee) {
        return res.send("END Invalid nominee choice.");
      }

      return res.send(`CON Enter number of votes for ${selectedNominee.name}`);
    }

    // Step 5: Enter number of votes
    // Example: 1*2*1*5
    if (/^1\*\d+\*\d+\*\d+$/.test(input)) {
      const [, categoryChoice, nomineeChoice, votesInput] = input.split("*");

      const votesCount = Number(votesInput);

      if (!votesCount || votesCount < 1) {
        return res.send("END Invalid vote count.");
      }

      const categoriesResult = await pool.query(
        "SELECT id, name FROM categories ORDER BY id ASC",
      );
      const categories = categoriesResult.rows;

      const selectedCategory = categories[Number(categoryChoice) - 1];

      if (!selectedCategory) {
        return res.send("END Invalid category choice.");
      }

      const nomineesResult = await pool.query(
        "SELECT id, name FROM nominees WHERE category_id = $1 ORDER BY id ASC",
        [selectedCategory.id],
      );
      const nominees = nomineesResult.rows;

      if (!nominees.length) {
        return res.send("END No nominees found for this category.");
      }

      const selectedNominee = nominees[Number(nomineeChoice) - 1];

      if (!selectedNominee) {
        return res.send("END Invalid nominee choice.");
      }

      const amount = votesCount * PRICE_PER_VOTE;

      return res.send(
        `CON Confirm vote\n` +
          `Nominee: ${selectedNominee.name}\n` +
          `Votes: ${votesCount}\n` +
          `Amount: GHS ${amount}\n` +
          `1. Confirm\n` +
          `2. Cancel`,
      );
    }

    // Step 6: Confirm and save vote
    // Example: 1*2*1*5*1
    if (/^1\*\d+\*\d+\*\d+\*[12]$/.test(input)) {
      const [, categoryChoice, nomineeChoice, votesInput, confirmChoice] =
        input.split("*");

      if (confirmChoice === "2") {
        return res.send("END Transaction cancelled.");
      }

      const votesCount = Number(votesInput);

      if (!votesCount || votesCount < 1) {
        return res.send("END Invalid vote count.");
      }

      const categoriesResult = await pool.query(
        "SELECT id, name FROM categories ORDER BY id ASC",
      );
      const categories = categoriesResult.rows;

      const selectedCategory = categories[Number(categoryChoice) - 1];

      if (!selectedCategory) {
        return res.send("END Invalid category choice.");
      }

      const nomineesResult = await pool.query(
        "SELECT id, name FROM nominees WHERE category_id = $1 ORDER BY id ASC",
        [selectedCategory.id],
      );
      const nominees = nomineesResult.rows;

      if (!nominees.length) {
        return res.send("END No nominees found for this category.");
      }

      const selectedNominee = nominees[Number(nomineeChoice) - 1];

      if (!selectedNominee) {
        return res.send("END Invalid nominee choice.");
      }

      const amountPaid = votesCount * PRICE_PER_VOTE;
      const transId = `USSD-${sessionId}`;

      await pool.query(
        `INSERT INTO votes (
          voter_phone,
          nominee_id,
          votes_count,
          amount_paid,
          momo_trans_id,
          status,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          phoneNumber,
          selectedNominee.id,
          votesCount,
          amountPaid,
          transId,
          "pending",
        ],
      );

      await pool.query(
        `UPDATE nominees
   SET votes = COALESCE(votes, 0) + $1
   WHERE id = $2`,
        [votesCount, selectedNominee.id],
      );

      return res.send(
        `END Vote submitted successfully.\n` +
          `Nominee: ${selectedNominee.name}\n` +
          `Votes: ${votesCount}\n` +
          `Reference: ${transId}`,
      );
    }

    // Check nominee votes flow
    if (input === "2") {
      const categoriesResult = await pool.query(
        "SELECT id, name FROM categories ORDER BY id ASC",
      );

      const categories = categoriesResult.rows;

      if (!categories.length) {
        return res.send("END No categories available.");
      }

      let menu = "CON Select category to check\n";
      categories.forEach((row, i) => {
        menu += `${i + 1}. ${row.name}\n`;
      });

      return res.send(menu.trim());
    }

    // Example: 2*1
    if (/^2\*\d+$/.test(input)) {
      const [, categoryChoice] = input.split("*");

      const categoriesResult = await pool.query(
        "SELECT id, name FROM categories ORDER BY id ASC",
      );
      const categories = categoriesResult.rows;

      const selectedCategory = categories[Number(categoryChoice) - 1];

      if (!selectedCategory) {
        return res.send("END Invalid category choice.");
      }

      const nomineesResult = await pool.query(
        `SELECT id, name, votes
         FROM nominees
         WHERE category_id = $1
         ORDER BY votes DESC, id ASC`,
        [selectedCategory.id],
      );

      const nominees = nomineesResult.rows;

      if (!nominees.length) {
        return res.send("END No nominees found for this category.");
      }

      let response = `END ${selectedCategory.name}\n`;
      nominees.forEach((nominee, i) => {
        response += `${i + 1}. ${nominee.name} - ${nominee.votes || 0}\n`;
      });

      return res.send(response.trim());
    }

    return res.send("END Invalid input.");
  } catch (error) {
    console.error("USSD callback error:", error);
    return res.send("END Sorry, a system error occurred.");
  }
});

module.exports = router;


// const express = require("express");
// const router = express.Router();

// router.post("/callback", (req, res) => {
//   console.log("USSD HIT:", req.body);
//   res.set("Content-Type", "text/plain");
//   return res.send("END USSD callback reached successfully.");
// });

// module.exports = router;