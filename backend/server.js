import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import pkg from "pg";

dotenv.config();

const { Pool } = pkg;
const app = express();

/* ===============================
   PATH FIX (ES MODULES)
================================ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ===============================
   POSTGRES (RAILWAY)
================================ */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* ===============================
   CORS – TYLKO TWOJE DOMENY
================================ */
app.use(cors({
  origin: [
    "https://roomno4.com",
    "https://www.roomno4.com"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

app.options("*", cors());
app.use(express.json());

/* ===============================
   STATIC FRONTEND
================================ */
app.use(express.static(path.join(__dirname, "public")));

/* ===============================
   TELEGRAM
================================ */
async function sendTelegramMessage(text) {
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text
    })
  });
}

/* ===============================
   API
================================ */

// STATUS
app.get("/api/status", async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) FROM signups");
    res.json({
      limit: 400,
      count: Number(result.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// SIGNUP
app.post("/api/signup", async (req, res) => {
  const { name, email, phone } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ error: "Missing data" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // sprawdź czy już istnieje
    const exists = await client.query(
      "SELECT 1 FROM signups WHERE email = $1 OR phone = $2",
      [email, phone]
    );

    if (exists.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Already registered" });
    }

    // numer = MAX + 1 (NIE resetuje się)
    const nextNumberResult = await client.query(
      "SELECT COALESCE(MAX(number), 0) + 1 AS next FROM signups"
    );

    const number = nextNumberResult.rows[0].next;
    const LIMIT = 400;

    if (number > LIMIT) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Limit reached" });
    }

    // insert
    await client.query(
      `INSERT INTO signups (number, name, email, phone)
       VALUES ($1, $2, $3, $4)`,
      [number, name, email, phone]
    );

    await client.query("COMMIT");

    // telegram
    await sendTelegramMessage(
`🆕 NOWY ZAPIS #${number}

👤 ${name}
📧 ${email}
📞 ${phone}`
    );

    res.json({
      success: true,
      number,
      limit: LIMIT
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

/* ===============================
   FRONTEND FALLBACK
================================ */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ===============================
   START
================================ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
