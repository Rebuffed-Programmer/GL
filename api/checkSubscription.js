import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

export default async function handler(req, res) {
  const { googleId } = req.query;
  if (!googleId) return res.json({ active: false });

  const data = await redis.get(`plus:${googleId}`);

  if (!data) return res.json({ active: false });

  if (data.expiry && Date.now() > data.expiry) {
    await redis.del(`plus:${googleId}`);
    return res.json({ active: false });
  }

  return res.json({ active: true, ...data });
}
