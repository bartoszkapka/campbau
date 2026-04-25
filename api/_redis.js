import { Redis } from "@upstash/redis";

// The Upstash Vercel integration auto-injects either:
// - UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN  (newer integration)
// - KV_REST_API_URL / KV_REST_API_TOKEN                 (legacy KV-style)
// We try both so the app works regardless of integration version.
const url =
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL;
const token =
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN;

if (!url || !token) {
  // Don't throw at module load — that breaks every API route.
  // Throw inside handlers so the error reaches the client.
  console.warn(
    "[storage] No Upstash Redis credentials found. Set UPSTASH_REDIS_REST_URL/TOKEN or KV_REST_API_URL/TOKEN."
  );
}

export const redis = url && token ? new Redis({ url, token }) : null;

export const KEY_PREFIX = "campbau:";

export const isValidKey = (k) =>
  typeof k === "string" &&
  k.length > 0 &&
  k.length < 200 &&
  !/[\s/\\'"]/.test(k);

export const ensureRedis = (res) => {
  if (!redis) {
    res.status(500).json({ error: "Redis not configured. See README for setup." });
    return false;
  }
  return true;
};
