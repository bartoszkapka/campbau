import { redis, KEY_PREFIX, isValidKey, ensureRedis } from "../_redis.js";

// Helper — Vercel Node functions usually parse JSON automatically when
// Content-Type is application/json, but body can be string, Buffer, or undefined
// depending on runtime configuration. Handle all cases.
const parseBody = async (req) => {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer?.(req.body)) {
    return req.body;
  }
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  // Stream fallback for cases where body is not auto-parsed
  if (typeof req.on === "function") {
    return new Promise((resolve) => {
      let data = "";
      req.on("data", chunk => { data += chunk; });
      req.on("end", () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
      req.on("error", () => resolve(null));
    });
  }
  return null;
};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!ensureRedis(res)) return;

  try {
    if (req.method === "GET") {
      const { key } = req.query;
      if (!isValidKey(key)) return res.status(400).json({ error: "invalid key", got: key });
      const value = await redis.get(KEY_PREFIX + key);
      if (value == null) return res.status(404).json({ error: "not found" });
      const stringValue = typeof value === "string" ? value : JSON.stringify(value);
      return res.status(200).json({ key, value: stringValue, shared: true });
    }

    if (req.method === "POST") {
      const body = await parseBody(req);
      if (!body) return res.status(400).json({ error: "missing or invalid JSON body" });
      const { key, value } = body;
      if (!isValidKey(key)) return res.status(400).json({ error: "invalid key", got: key });
      if (typeof value !== "string") return res.status(400).json({ error: "value must be string", got: typeof value });
      if (value.length > 5 * 1024 * 1024) return res.status(413).json({ error: "value too large" });
      await redis.set(KEY_PREFIX + key, value);
      return res.status(200).json({ key, value, shared: true });
    }

    if (req.method === "DELETE") {
      const { key } = req.query;
      if (!isValidKey(key)) return res.status(400).json({ error: "invalid key", got: key });
      await redis.del(KEY_PREFIX + key);
      return res.status(200).json({ key, deleted: true, shared: true });
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ error: "method not allowed" });
  } catch (err) {
    console.error("storage handler error", err);
    return res.status(500).json({ error: err?.message || "internal error", stack: err?.stack });
  }
}
