import { createClient } from '@vercel/kv';

const kv = createClient({
  url: process.env.armazenamentoplus_KV_REST_API_URL,
  token: process.env.armazenamentoplus_KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  const email = req.query.email;

  if (!email) {
    return res.status(400).json({ active: false, error: "email_required" });
  }

  try {
    const record = await kv.get(email);

    if (!record || record.status !== "active") {
      return res.json({ active: false });
    }

    if (Date.now() > record.expiry) {
      await kv.set(email, { ...record, status: "expired" });
      return res.json({ active: false });
    }

    return res.json({
      active: true,
      expiry: record.expiry,
      plan: record.plan || "MENSAL"
    });

  } catch (err) {
    console.error("checkSubscription error:", err);
    return res.status(500).json({ active: false });
  }
}
