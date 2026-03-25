const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const { pool } = require("../config/db");

const VOTING_END = new Date(
  process.env.VOTING_END || "2026-03-26T12:00:00.000Z",
);

function votingEnded() {
  return new Date() >= VOTING_END;
}

function escapeCsv(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function alreadyFinalized(client) {
  const result = await client.query(
    "SELECT value FROM system_flags WHERE key = 'voting_finalized'",
  );
  return result.rows.length > 0 && result.rows[0].value === "true";
}

async function markFinalized(client) {
  await client.query(
    `
    INSERT INTO system_flags (key, value, updated_at)
    VALUES ('voting_finalized', 'true', NOW())
    ON CONFLICT (key)
    DO UPDATE SET value = 'true', updated_at = NOW()
    `,
  );
}

async function getRankedResults(client) {
  const categoriesResult = await client.query(`
    SELECT id, name
    FROM categories
    ORDER BY id ASC
  `);

  const categories = categoriesResult.rows;
  const finalRows = [];

  for (const category of categories) {
    const nomineesResult = await client.query(
      `
      SELECT id, name, COALESCE(votes, 0) AS votes
      FROM nominees
      WHERE category_id = $1
      ORDER BY COALESCE(votes, 0) DESC, name ASC
      `,
      [category.id],
    );

    const nominees = nomineesResult.rows;

    const highestVotes = nominees.length ? Number(nominees[0].votes) : 0;

    nominees.forEach((nominee, index) => {
      const nomineeVotes = Number(nominee.votes);

      finalRows.push({
        category_id: category.id,
        category_name: category.name,
        rank: index + 1,
        nominee_id: nominee.id,
        nominee_name: nominee.name,
        votes: nomineeVotes,
        status: nomineeVotes === highestVotes ? "Winner" : "Nominee",
      });
    });
  }

  return finalRows;
}

function buildCsv(rows) {
  const headers = [
    "Category ID",
    "Category Name",
    "Rank",
    "Nominee ID",
    "Nominee Name",
    "Votes",
    "Status",
  ];

  const lines = [headers.map(escapeCsv).join(",")];

  for (const row of rows) {
    lines.push(
      [
        row.category_id,
        row.category_name,
        row.rank,
        row.nominee_id,
        row.nominee_name,
        row.votes,
        row.status,
      ]
        .map(escapeCsv)
        .join(","),
    );
  }

  return lines.join("\n");
}

async function sendResultsEmail(csvPath) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.RESULTS_TO_EMAIL,
    subject: "Voting Results CSV",
    text: "Attached is the final voting results CSV with nominees ranked by highest votes and winners marked by category.",
    attachments: [
      {
        filename: path.basename(csvPath),
        path: csvPath,
      },
    ],
  });
}

async function finalizeVotingIfNeeded() {
  if (!votingEnded()) return;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const done = await alreadyFinalized(client);
    if (done) {
      await client.query("COMMIT");
      return;
    }

    const rankedRows = await getRankedResults(client);
    const csv = buildCsv(rankedRows);

    const exportDir = path.join(process.cwd(), "exports");
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const fileName = `voting_results_${Date.now()}.csv`;
    const csvPath = path.join(exportDir, fileName);

    fs.writeFileSync(csvPath, csv, "utf8");

    await sendResultsEmail(csvPath);
    await markFinalized(client);

    await client.query("COMMIT");
    console.log("Voting finalized, CSV created, and email sent.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error finalizing voting:", error);
  } finally {
    client.release();
  }
}

module.exports = {
  votingEnded,
  finalizeVotingIfNeeded,
};
