// ============================================================
// Storage client
// In production: calls /api/storage (Vercel KV-backed).
// In dev (or if API is unreachable): falls back to localStorage.
// Mirrors the API surface of the original window.storage.
// ============================================================

const LS_PREFIX = "campbau:";
const useLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
  import.meta.env.VITE_FORCE_API !== "1";

const lsImpl = {
  async get(key) {
    try {
      const v = localStorage.getItem(LS_PREFIX + key);
      return v == null ? null : { key, value: v, shared: true };
    } catch { return null; }
  },
  async set(key, value) {
    try {
      localStorage.setItem(LS_PREFIX + key, value);
      return { key, value, shared: true };
    } catch { return null; }
  },
  async delete(key) {
    try {
      localStorage.removeItem(LS_PREFIX + key);
      return { key, deleted: true, shared: true };
    } catch { return null; }
  },
  async list(prefix) {
    try {
      const keys = [];
      const scan = LS_PREFIX + (prefix || "");
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(scan)) keys.push(k.slice(LS_PREFIX.length));
      }
      return { keys, prefix, shared: true };
    } catch { return { keys: [] }; }
  },
  async getAll(prefix) {
    try {
      const items = [];
      const scan = LS_PREFIX + (prefix || "");
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(scan)) {
          const v = localStorage.getItem(k);
          if (v != null) items.push({ key: k.slice(LS_PREFIX.length), value: v });
        }
      }
      return { items, prefix, shared: true };
    } catch { return { items: [] }; }
  }
};

const apiImpl = {
  async get(key) {
    const r = await fetch(`/api/storage?key=${encodeURIComponent(key)}`);
    if (r.status === 404) return null;
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      throw new Error(`get ${key} -> ${r.status}: ${detail.slice(0, 200)}`);
    }
    return r.json();
  },
  async set(key, value) {
    const r = await fetch(`/api/storage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value })
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      throw new Error(`set ${key} -> ${r.status}: ${detail.slice(0, 200)}`);
    }
    return r.json();
  },
  async delete(key) {
    const r = await fetch(`/api/storage?key=${encodeURIComponent(key)}`, { method: "DELETE" });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      throw new Error(`delete ${key} -> ${r.status}: ${detail.slice(0, 200)}`);
    }
    return r.json();
  },
  async list(prefix) {
    const r = await fetch(`/api/storage/list?prefix=${encodeURIComponent(prefix || "")}`);
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      throw new Error(`list ${prefix} -> ${r.status}: ${detail.slice(0, 200)}`);
    }
    return r.json();
  },
  async getAll(prefix) {
    const r = await fetch(`/api/storage/getAll?prefix=${encodeURIComponent(prefix || "")}`);
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      throw new Error(`getAll ${prefix} -> ${r.status}: ${detail.slice(0, 200)}`);
    }
    return r.json();
  }
};

const impl = useLocal ? lsImpl : apiImpl;

// Public API matching the original window.storage shape
export const rawStorage = {
  get: impl.get,
  set: impl.set,
  delete: impl.delete,
  list: impl.list,
  getAll: impl.getAll
};

// JSON-helper layer (matches what the app's own `storage` helper used to do)
const emitError = (op, key, err) => {
  const msg = err?.message || String(err);
  console.warn(`storage.${op} failed`, key, msg);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("storage:error", {
      detail: { op, key, message: msg }
    }));
  }
};

// Simple in-memory cache. Cleared on any mutation that affects a key.
// TTL keeps us safe from staleness if multiple tabs/users edit at once.
const CACHE_TTL_MS = 30_000;
const cache = new Map(); // key/prefix -> { value, ts }

const cacheGet = (k) => {
  const e = cache.get(k);
  if (!e) return undefined;
  if (Date.now() - e.ts > CACHE_TTL_MS) { cache.delete(k); return undefined; }
  return e.value;
};
const cacheSet = (k, v) => cache.set(k, { value: v, ts: Date.now() });
const cacheInvalidate = (key) => {
  cache.delete("get:" + key);
  // Invalidate any prefix that this key would match (e.g. setting `cnota:abc` invalidates `getAll:cnota:`)
  const colon = key.indexOf(":");
  if (colon >= 0) {
    const prefix = key.slice(0, colon + 1);
    cache.delete("getAll:" + prefix);
    cache.delete("list:" + prefix);
  }
  cache.delete("getAll:");
  cache.delete("list:");
};

export const storage = {
  async get(key) {
    const cached = cacheGet("get:" + key);
    if (cached !== undefined) return cached;
    try {
      const r = await rawStorage.get(key);
      const value = r ? JSON.parse(r.value) : null;
      cacheSet("get:" + key, value);
      return value;
    } catch (err) {
      if (!String(err?.message || "").includes("404")) {
        console.warn("storage.get failed", key, err);
      }
      return null;
    }
  },
  async set(key, value) {
    try {
      await rawStorage.set(key, JSON.stringify(value));
      cacheInvalidate(key);
      cacheSet("get:" + key, value);
      return true;
    } catch (err) {
      emitError("set", key, err);
      return false;
    }
  },
  async delete(key) {
    try {
      await rawStorage.delete(key);
      cacheInvalidate(key);
      return true;
    } catch (err) { emitError("delete", key, err); return false; }
  },
  async list(prefix) {
    const cached = cacheGet("list:" + (prefix || ""));
    if (cached !== undefined) return cached;
    try {
      const r = await rawStorage.list(prefix);
      const keys = r?.keys || [];
      cacheSet("list:" + (prefix || ""), keys);
      return keys;
    } catch (err) {
      emitError("list", prefix, err);
      return [];
    }
  },
  async getAll(prefix) {
    const cached = cacheGet("getAll:" + (prefix || ""));
    if (cached !== undefined) return cached;
    try {
      const r = await rawStorage.getAll(prefix);
      const items = r?.items || [];
      const result = [];
      for (const item of items) {
        try {
          const parsed = JSON.parse(item.value);
          result.push(parsed);
          // Prime the per-key get cache too — saves round-trips when detail page opens
          cacheSet("get:" + item.key, parsed);
        } catch {}
      }
      cacheSet("getAll:" + (prefix || ""), result);
      return result;
    } catch (err) {
      emitError("getAll", prefix, err);
      return [];
    }
  },
  // Manual cache controls for special cases
  invalidateAll() { cache.clear(); }
};
