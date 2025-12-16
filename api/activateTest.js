import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { googleId, days = 30 } = req.body;
  if (!googleId) return res.status(400).end();

  const expiry = Date.now() + days * 24 * 60 * 60 * 1000;

  await redis.set(`plus:${googleId}`, {
    status: "active",
    expiry
  });

  return res.json({ ok: true });
}
