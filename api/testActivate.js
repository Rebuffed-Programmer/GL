// api/testActivate.js
import { createClient } from '@vercel/kv';

const kv = createClient({
  url: process.env.armazenamentoplus_KV_REST_API_URL,
  token: process.env.armazenamentoplus_KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  const { email, days } = req.body;

  const expiry = Date.now() + days * 24 * 60 * 60 * 1000;

  await kv.set(email, {
    status: "active",
    expiry,
    plan: "TESTE"
  });

  res.json({ ok: true });
}
