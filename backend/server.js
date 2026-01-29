import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import pkg from "pg";
import Stripe from "stripe";
import QRCode from "qrcode";
import crypto from "crypto";
import nodemailer from "nodemailer";

dotenv.config();

const { Pool } = pkg;
const app = express();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

app.use(
  cors({
    origin: ["https://roomno4.com", "https://www.roomno4.com"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Stripe-Signature"],
  })
);

/* ===============================
   STRIPE WEBHOOK
================================ */
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"],
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch {
      return res.status(400).send("Webhook Error");
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const email = session.customer_details?.email;
      const sessionId = session.id;

      if (!email || !sessionId) {
        return res.json({ received: true });
      }

      const client = await pool.connect();

      try {
        const existing = await client.query(
          "SELECT id FROM tickets WHERE stripe_session_id = $1",
          [sessionId]
        );

        if (existing.rows.length > 0) {
          return res.json({ received: true });
        }

        const countResult = await client.query(
          "SELECT COUNT(*) FROM tickets"
        );
        const saleNumber = Number(countResult.rows[0].count) + 1;

        const ticketCode = crypto.randomUUID();
        const qrData = await QRCode.toDataURL(ticketCode);

        await client.query(
          `
          INSERT INTO tickets
          (email, ticket_code, qr_data, paid, stripe_session_id)
          VALUES ($1, $2, $3, true, $4)
        `,
          [email, ticketCode, qrData, sessionId]
        );

        await mailer.sendMail({
          from: process.env.SMTP_FROM,
          to: email,
          subject: "Your ticket – NO.4",
          html: `
            <div style="background:#000;color:#f5f3ee;padding:32px;text-align:center;font-family:Arial">
              <h2>Your ticket</h2>
              <p>${ticketCode}</p>
              <img src="${qrData}" width="260" />
              <p>Show this QR code at the entrance.</p>
            </div>
          `,
        });

        const telegramText =
          `NEW TICKET SOLD\n\n` +
          `Sale: ${saleNumber}/400\n` +
          `Email: ${email}\n` +
          `Ticket: ${ticketCode}\n` +
          `Session: ${sessionId}`;

        await fetch(
          `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: process.env.TELEGRAM_CHAT_ID,
              text: telegramText,
            }),
          }
        );
      } finally {
        client.release();
      }
    }

    res.json({ received: true });
  }
);

/* ===============================
   MIDDLEWARE
================================ */
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* ===============================
   STATUS
================================ */
app.get("/api/status", async (req, res) => {
  const result = await pool.query("SELECT COUNT(*) FROM tickets");
  const count = Number(result.rows[0].count);
  res.json({
    limit: 400,
    count,
    soldOut: count >= 400,
  });
});

/* ===============================
   CREATE CHECKOUT
================================ */
app.post("/api/create-checkout", async (req, res) => {
  const { email } = req.body;

  const result = await pool.query("SELECT COUNT(*) FROM tickets");
  if (Number(result.rows[0].count) >= 400) {
    return res.status(403).json({ error: "SOLD_OUT" });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    line_items: [{ price: process.env.PRICE_ID, quantity: 1 }],
    success_url:
      "https://roomno4.com/success?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: "https://roomno4.com/cancel",
  });

  res.json({ url: session.url });
});

/* ===============================
   GET TICKET
================================ */
app.get("/api/ticket", async (req, res) => {
  const { session_id } = req.query;

  if (!session_id) {
    return res.status(400).json({ error: "Missing session_id" });
  }

  const session = await stripe.checkout.sessions.retrieve(session_id);

  if (session.payment_status !== "paid") {
    return res.status(403).json({ error: "Not paid" });
  }

  const { rows } = await pool.query(
    `
    SELECT ticket_code, qr_data
    FROM tickets
    WHERE stripe_session_id = $1
    LIMIT 1
  `,
    [session_id]
  );

  if (!rows.length) {
    return res.status(404).json({ error: "Ticket not found" });
  }

  res.json({
    ticketCode: rows[0].ticket_code,
    qr: rows[0].qr_data,
  });
});

/* ===============================
   SIGN UP – POPRAWIONE (NUMBER)
================================ */
app.post("/api/signup", async (req, res) => {
  const { name, email, phone } = req.body;

  if (
    !/^[A-Za-zÀ-ž\s]{2,30}$/.test(name) ||
    email.length < 5 ||
    email.length > 60 ||
    !/^[0-9]{9,15}$/.test(phone)
  ) {
    return res.status(400).json({ error: "INVALID_DATA" });
  }

  const client = await pool.connect();

  try {
    const { rows: n } = await client.query(
      "SELECT COALESCE(MAX(number), 0) + 1 AS next FROM signups"
    );

    const nextNumber = n[0].next;

    const result = await client.query(
      `
      INSERT INTO signups (number, name, email, phone)
      VALUES ($1, $2, $3, $4)
      RETURNING number
    `,
      [nextNumber, name, email, phone]
    );

    const number = result.rows[0].number;

    const telegramText =
      `NEW SIGN UP\n\n` +
      `#${number}\n` +
      `Name: ${name}\n` +
      `Email: ${email}\n` +
      `Phone: ${phone}`;

    await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: telegramText,
        }),
      }
    );

    res.json({ number });
  } finally {
    client.release();
  }
});

/* ===============================
   SPA FALLBACK
================================ */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ===============================
   START SERVER
================================ */
app.listen(process.env.PORT || 8080);
