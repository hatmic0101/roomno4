import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ⬇️ POPRAWKA: TEN SAM PLIK CO U CIEBIE
const DATA_FILE = path.join(process.cwd(), "data.json");

// ===============================
// HELPERS
// ===============================
function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { limit: 500, signups: [] };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ===============================
// TELEGRAM
// ===============================
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

// ===============================
// STATUS
// ===============================
app.get("/api/status", (req, res) => {
  const data = readData();
  res.json({
    limit: data.limit,
    count: data.signups.length
  });
});

// ===============================
// SIGN UP
// ===============================
app.post("/api/signup", async (req, res) => {
  const { name, email, phone } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ error: "Missing data" });
  }

  const data = readData();

  if (data.signups.find(s => s.email === email || s.phone === phone)) {
    return res.status(409).json({ error: "Already registered" });
  }

  if (data.signups.length >= data.limit) {
    return res.status(403).json({ error: "Limit reached" });
  }

  const number = data.signups.length + 1;

  const signup = {
    number,
    name,
    email,
    phone,
    createdAt: new Date().toISOString()
  };

  data.signups.push(signup);
  saveData(data);

  // 📩 TELEGRAM
  try {
    await sendTelegramMessage(
`🆕 NOWY ZAPIS #${number}

👤 Imię: ${name}
📧 Email: ${email}
📞 Telefon: ${phone}`
    );
  } catch (err) {
    console.error("❌ Telegram error", err);
  }

  res.json({
    success: true,
    number,
    limit: data.limit
  });
});

// ===============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
