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
    const fullKeys = [];
    let cursor = "0";
    do {
      const [next, batch] = await redis.scan(cursor, { match: matchPattern, count: 500 });
      cursor = String(next);
      for (const k of batch) fullKeys.push(k);
    } while (cursor !== "0");

    if (fullKeys.length === 0) {
      return res.status(200).json({ items: [], prefix, shared: true });
    }

    // Single MGET round-trip for all values
    const values = await redis.mget(...fullKeys);

    const items = [];
    for (let i = 0; i < fullKeys.length; i++) {
      const v = values[i];
      if (v == null) continue;
      const stringValue = typeof v === "string" ? v : JSON.stringify(v);
      items.push({
        key: fullKeys[i].slice(KEY_PREFIX.length),
        value: stringValue
      });
    }

    return res.status(200).json({ items, prefix, shared: true });
  } catch (err) {
    console.error("storage/getAll error", err);
    return res.status(500).json({ error: err?.message || "internal error" });
  }
}
