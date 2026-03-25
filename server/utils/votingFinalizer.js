const fs = require("fs");
const path = require("path");
const { Resend } = require("resend");
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
  console.log("Preparing Resend email...");
  console.log("From:", process.env.RESEND_FROM);
  console.log("To:", process.env.RESULTS_TO_EMAIL);

  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY");
  }

  if (!process.env.RESEND_FROM) {
    throw new Error("Missing RESEND_FROM");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const csvBuffer = fs.readFileSync(csvPath);
  const recipients = process.env.RESULTS_TO_EMAIL
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM,
    to: recipients,
    subject: "Voting Results CSV",
    html: `
      <h2>Voting Results</h2>
      <p>Attached is the final voting results CSV with nominees ranked by highest votes and winners marked by category.</p>
    `,
    text: "Attached is the final voting results CSV with nominees ranked by highest votes and winners marked by category.",
    attachments: [
      {
        filename: path.basename(csvPath),
        content: csvBuffer.toString("base64"),
      },
    ],
  });

  if (error) {
    console.error("Resend send error:", error);
    throw new Error(
      typeof error === "string" ? error : JSON.stringify(error),
    );
  }

  console.log("Resend email sent successfully:", data);
}

async function finalizeVotingIfNeeded() {
  console.log("finalizeVotingIfNeeded called");
  console.log("Now:", new Date().toISOString());
  console.log("Voting end:", VOTING_END.toISOString());

  if (!votingEnded()) {
    console.log("Voting has not ended yet");
    return false;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    console.log("DB transaction started");

    const done = await alreadyFinalized(client);
    console.log("Already finalized:", done);

    if (done) {
      await client.query("COMMIT");
      console.log("Skipping because already finalized");
      return "already_finalized";
    }

    const rankedRows = await getRankedResults(client);
    console.log("Ranked rows count:", rankedRows.length);

    const csv = buildCsv(rankedRows);

    const exportDir = path.join(process.cwd(), "exports");
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const fileName = `voting_results_${Date.now()}.csv`;
    const csvPath = path.join(exportDir, fileName);

    fs.writeFileSync(csvPath, csv, "utf8");
    console.log("CSV written to:", csvPath);

    await sendResultsEmail(csvPath);
    console.log("Email send function completed");

    await markFinalized(client);
    console.log("Marked finalized in system_flags");

    await client.query("COMMIT");
    console.log("Voting finalized, CSV created, and email sent.");

    return "sent";
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error finalizing voting:", error);
    return "error";
  } finally {
    client.release();
  }
}

module.exports = {
  votingEnded,
  finalizeVotingIfNeeded,
};
