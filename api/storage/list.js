import { redis, KEY_PREFIX, ensureRedis } from "../_redis.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!ensureRedis(res)) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method not allowed" });
  }

  try {
    const { prefix = "" } = req.query;
    const matchPattern = `${KEY_PREFIX}${prefix}*`;
    const keys = [];
    let cursor = "0";
    do {
      // @upstash/redis returns [cursor: string, keys: string[]]
      const [next, batch] = await redis.scan(cursor, { match: matchPattern, count: 200 });
      cursor = String(next);
      for (const k of batch) keys.push(k.slice(KEY_PREFIX.length));
    } while (cursor !== "0");
    return res.status(200).json({ keys, prefix, shared: true });
  } catch (err) {
    console.error("storage/list error", err);
    return res.status(500).json({ error: err?.message || "internal error" });
  }
}
