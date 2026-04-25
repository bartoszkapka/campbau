import { redis, KEY_PREFIX, isValidKey, ensureRedis } from "../_redis.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!ensureRedis(res)) return;

  try {
    if (req.method === "GET") {
      const { key } = req.query;
      if (!isValidKey(key)) return res.status(400).json({ error: "invalid key" });
      const value = await redis.get(KEY_PREFIX + key);
      if (value == null) return res.status(404).json({ error: "not found" });
      // Upstash auto-deserializes JSON. We always store strings, so coerce back.
      const stringValue = typeof value === "string" ? value : JSON.stringify(value);
      return res.status(200).json({ key, value: stringValue, shared: true });
    }

    if (req.method === "POST") {
      const { key, value } = req.body || {};
      if (!isValidKey(key)) return res.status(400).json({ error: "invalid key" });
      if (typeof value !== "string") return res.status(400).json({ error: "value must be string" });
      if (value.length > 5 * 1024 * 1024) return res.status(413).json({ error: "value too large" });
      await redis.set(KEY_PREFIX + key, value);
      return res.status(200).json({ key, value, shared: true });
    }

    if (req.method === "DELETE") {
      const { key } = req.query;
      if (!isValidKey(key)) return res.status(400).json({ error: "invalid key" });
      await redis.del(KEY_PREFIX + key);
      return res.status(200).json({ key, deleted: true, shared: true });
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ error: "method not allowed" });
  } catch (err) {
    console.error("storage handler error", err);
    return res.status(500).json({ error: err?.message || "internal error" });
  }
}
