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

  const { email, plan } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email required" });
  }

  const expiry = Date.now() + (DURATION[plan] || DURATION.MENSAL);

  await kv.set(email, {
    status: "active",
    expiry
  });

  return res.json({ ok: true, expiry });
}
