import { createClient } from '@vercel/kv';

const kv = createClient({
  url: process.env.armazenamentoplus_KV_REST_API_URL,
  token: process.env.armazenamentoplus_KV_REST_API_TOKEN,
});

const DURATION = {
  MENSAL: 30 * 24 * 60 * 60 * 1000,
  ANUAL: 365 * 24 * 60 * 60 * 1000,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const data = req.body?.data || req.body;
  const status = data?.status;
  const email = data?.payer?.email;
  const plan = data?.metadata?.plan || "MENSAL";

  if (!email) {
    return res.status(200).json({ ok: true });
  }

  try {
    if (status === "approved") {
      const expiry = Date.now() + (DURATION[plan] || DURATION.MENSAL);

      await kv.set(email, {
        status: "active",
        expiry,
        plan,
        paymentId: data.id
      });

      console.log("✅ Plus+ ATIVADO:", email);
    }

    if (["cancelled", "refunded", "rejected"].includes(status)) {
      await kv.set(email, {
        status: "expired",
        expiry: Date.now()
      });

      console.log("❌ Plus+ REVOGADO:", email);
    }

    return res.json({ received: true });

  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ error: true });
  }
}
