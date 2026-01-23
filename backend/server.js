import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import pkg from "pg";
import Stripe from "stripe";
import QRCode from "qrcode";
import crypto from "crypto";

dotenv.config();

const { Pool } = pkg;
const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/* ===============================
   PATH FIX (ESM)
================================ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ===============================
   POSTGRES
================================ */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* ===============================
   CORS
================================ */
app.use(
  cors({
    origin: [
      "https://roomno4.com",
      "https://www.roomno4.com",
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Stripe-Signature"],
  })
);

/* ===============================
   STRIPE WEBHOOK (RAW BODY!)
   MUSI BYĆ PRZED express.json()
================================ */
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature error:", err.message);
      return res.status(400).send("Webhook Error");
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const email = session.customer_details?.email;

      if (!email) {
        return res.json({ received: true });
      }

      const client = await pool.connect();

      try {
        const ticketCode = crypto.randomUUID();
        const qrData = await QRCode.toDataURL(ticketCode);

        await client.query(
          `INSERT INTO tickets (email, ticket_code, qr_data, paid)
           VALUES ($1, $2, $3, true)`,
          [email, ticketCode, qrData]
        );

        await sendTelegramMessage(
`🎟️ PAID TICKET
Email: ${email}
Ticket: ${ticketCode}`
        );

      } catch (err) {
        console.error("DB / QR error:", err);
      } finally {
        client.release();
      }
    }

    res.json({ received: true });
  }
);

/* ===============================
   JSON (PO WEBHOOKU)
================================ */
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
      text,
    }),
  });
}

/* ===============================
   API
================================ */

// STATUS (zostawione – używane w JS)
app.get("/api/status", async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) FROM signups");
    res.json({
      limit: 400,
      count: Number(result.rows[0].count),
    });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

/* ===============================
   CREATE STRIPE CHECKOUT
================================ */
app.post("/api/create-checkout", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "blik"],
      line_items: [
        {
          price: process.env.PRICE_ID,
          quantity: 1,
        },
      ],
      success_url:
        "https://roomno4.com/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://roomno4.com/cancel",
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    res.status(500).json({ error: "Stripe error" });
  }
});

/* ===============================
   GET TICKET FOR SUCCESS PAGE
================================ */
app.get("/api/ticket", async (req, res) => {
  const { session_id } = req.query;

  if (!session_id) {
    return res.status(400).json({ error: "Missing session_id" });
  }

  try {
    // 1. Pobierz sesję Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      return res.status(403).json({ error: "Not paid" });
    }

    const email = session.customer_details?.email;
    if (!email) {
      return res.status(404).json({ error: "Email not found" });
    }

    // 2. Pobierz ticket z DB
    const { rows } = await pool.query(
      `SELECT ticket_code, qr_data
       FROM tickets
       WHERE email = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    // 3. Zwróć QR dla klienta
    res.json({
      email,
      ticketCode: rows[0].ticket_code,
      qr: rows[0].qr_data,
    });

  } catch (err) {
    console.error("Ticket fetch error:", err);
    res.status(500).json({ error: "Server error" });
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
  console.log("Server running on port", PORT);
});
