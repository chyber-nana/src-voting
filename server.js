const express = require("express");
const path = require("path");
const cors = require("cors");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const ussdRoutes = require("./server/routes/ussd");
require("dotenv").config();

const { pool } = require("./server/config/db");

const app = express();

app.set("trust proxy", 1);

// middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  store: new pgSession({
    pool,
    tableName: "user_sessions"
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

app.use(express.static(path.join(__dirname, "public")));

const categoryRoutes = require("./server/routes/categoryRoutes");
const nomineeRoutes = require("./server/routes/nomineeRoutes");
const voteRoutes = require("./server/routes/voteRoutes");
const dashboardRoutes = require("./server/routes/dashboardRoutes");
const paymentRoutes = require("./server/routes/paymentRoutes");
const adminRoutes = require("./server/routes/admin");
const authRoutes = require("./server/routes/auth");


app.use("/api/ussd", ussdRoutes);

function requireAdmin(req, res, next) {
  if (!req.session.admin) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  next();
}

app.use("/api/categories", categoryRoutes);
app.use("/api/nominees", nomineeRoutes);
app.use("/api/votes", voteRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", requireAdmin, adminRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/payment/callback", async (req, res) => {
  const { reference } = req.query;
  if (!reference) {
    return res.send("Missing reference");
  }

  res.redirect(`/payment-success.html?reference=${encodeURIComponent(reference)}`);
});

app.get("/admin", (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/admin-login.html");
  }

  res.sendFile(path.join(__dirname, "private", "admin.html"));
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});