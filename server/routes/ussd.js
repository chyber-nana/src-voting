const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Africa's Talking sends POST requests for USSD callbacks
router.post("/callback", (req, res) => {
  const { sessionId, serviceCode, phoneNumber, text } = req.body;

  res.set("Content-Type", "text/plain");

  const input = (text || "").trim();

  // Step 1: first screen
  if (input === "") {
    return res.send(
      "CON Welcome to SRC Voting\n" +
      "1. Vote\n" +
      "2. Check nominee votes"
    );
  }

  // Step 2: choose category
  if (input === "1") {
    return db.all("SELECT id, name FROM categories ORDER BY id ASC", [], (err, rows) => {
      if (err) {
        return res.send("END Sorry, a system error occurred.");
      }

      if (!rows.length) {
        return res.send("END No categories available.");
      }

      let menu = "CON Select category\n";
      rows.forEach((row, i) => {
        menu += `${i + 1}. ${row.name}\n`;
      });

      return res.send(menu.trim());
    });
  }

  // Step 3: after user chooses category from menu 1
  // Example input: 1*2
  if (/^1\*\d+$/.test(input)) {
    const [, categoryChoice] = input.split("*");

    return db.all("SELECT id, name FROM categories ORDER BY id ASC", [], (err, categories) => {
      if (err || !categories.length) {
        return res.send("END Sorry, could not load categories.");
      }

      const categoryIndex = Number(categoryChoice) - 1;
      const selectedCategory = categories[categoryIndex];

      if (!selectedCategory) {
        return res.send("END Invalid category choice.");
      }

      return db.all(
        "SELECT id, name FROM nominees WHERE category_id = ? ORDER BY id ASC",
        [selectedCategory.id],
        (err2, nominees) => {
          if (err2) {
            return res.send("END Sorry, could not load nominees.");
          }

          if (!nominees.length) {
            return res.send("END No nominees found for this category.");
          }

          let menu = `CON ${selectedCategory.name} nominees\n`;
          nominees.forEach((nominee, i) => {
            menu += `${i + 1}. ${nominee.name}\n`;
          });

          return res.send(menu.trim());
        }
      );
    });
  }

  // Step 4: choose nominee
  // Example input: 1*2*1
  if (/^1\*\d+\*\d+$/.test(input)) {
    const [, categoryChoice, nomineeChoice] = input.split("*");

    return db.all("SELECT id, name FROM categories ORDER BY id ASC", [], (err, categories) => {
      if (err || !categories.length) {
        return res.send("END Sorry, could not load categories.");
      }

      const selectedCategory = categories[Number(categoryChoice) - 1];
      if (!selectedCategory) {
        return res.send("END Invalid category choice.");
      }

      return db.all(
        "SELECT id, name FROM nominees WHERE category_id = ? ORDER BY id ASC",
        [selectedCategory.id],
        (err2, nominees) => {
          if (err2 || !nominees.length) {
            return res.send("END Sorry, could not load nominees.");
          }

          const selectedNominee = nominees[Number(nomineeChoice) - 1];
          if (!selectedNominee) {
            return res.send("END Invalid nominee choice.");
          }

          return res.send(
            `CON Enter number of votes for ${selectedNominee.name}`
          );
        }
      );
    });
  }

  // Step 5: enter vote count
  // Example input: 1*2*1*5
  if (/^1\*\d+\*\d+\*\d+$/.test(input)) {
    const [, categoryChoice, nomineeChoice, votesInput] = input.split("*");

    const votesCount = Number(votesInput);
    if (!votesCount || votesCount < 1) {
      return res.send("END Invalid vote count.");
    }

    return db.all("SELECT id, name FROM categories ORDER BY id ASC", [], (err, categories) => {
      if (err || !categories.length) {
        return res.send("END Sorry, could not load categories.");
      }

      const selectedCategory = categories[Number(categoryChoice) - 1];
      if (!selectedCategory) {
        return res.send("END Invalid category choice.");
      }

      return db.all(
        "SELECT id, name FROM nominees WHERE category_id = ? ORDER BY id ASC",
        [selectedCategory.id],
        (err2, nominees) => {
          if (err2 || !nominees.length) {
            return res.send("END Sorry, could not load nominees.");
          }

          const selectedNominee = nominees[Number(nomineeChoice) - 1];
          if (!selectedNominee) {
            return res.send("END Invalid nominee choice.");
          }

          const amount = votesCount * 1;

          return res.send(
            `CON Confirm vote\n` +
            `Nominee: ${selectedNominee.name}\n` +
            `Votes: ${votesCount}\n` +
            `Amount: GHS ${amount}\n` +
            `1. Confirm\n` +
            `2. Cancel`
          );
        }
      );
    });
  }

  // Step 6: confirm and save pending vote
  // Example input: 1*2*1*5*1
  if (/^1\*\d+\*\d+\*\d+\*[12]$/.test(input)) {
    const [, categoryChoice, nomineeChoice, votesInput, confirmChoice] = input.split("*");

    if (confirmChoice === "2") {
      return res.send("END Transaction cancelled.");
    }

    const votesCount = Number(votesInput);
    const amountPaid = votesCount * 1;

    return db.all("SELECT id, name FROM categories ORDER BY id ASC", [], (err, categories) => {
      if (err || !categories.length) {
        return res.send("END Sorry, could not load categories.");
      }

      const selectedCategory = categories[Number(categoryChoice) - 1];
      if (!selectedCategory) {
        return res.send("END Invalid category choice.");
      }

      return db.all(
        "SELECT id, name FROM nominees WHERE category_id = ? ORDER BY id ASC",
        [selectedCategory.id],
        (err2, nominees) => {
          if (err2 || !nominees.length) {
            return res.send("END Sorry, could not load nominees.");
          }

          const selectedNominee = nominees[Number(nomineeChoice) - 1];
          if (!selectedNominee) {
            return res.send("END Invalid nominee choice.");
          }

          const transId = `USSD-${sessionId}`;

          db.run(
            `INSERT INTO votes (
              voter_phone,
              nominee_id,
              nominee_name,
              votes_count,
              amount_paid,
              momo_trans_id,
              status
            ) VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
            [
              phoneNumber,
              selectedNominee.id,
              selectedNominee.name,
              votesCount,
              amountPaid,
              transId
            ],
            function (insertErr) {
              if (insertErr) {
                console.error(insertErr);
                return res.send("END Sorry, could not save your vote.");
              }

              return res.send(
                `END Vote submitted successfully.\n` +
                `Nominee: ${selectedNominee.name}\n` +
                `Votes: ${votesCount}\n` +
                `Reference: ${transId}`
              );
            }
          );
        }
      );
    });
  }

  // Optional check flow
  if (input === "2") {
    return res.send("END Voting is active.");
  }

  return res.send("END Invalid input.");
});

module.exports = router;