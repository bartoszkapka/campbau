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

// ============================================================
// Cache layer
//
// Two-tier:
//   1. In-memory Map for fast reads within a single page session.
//   2. localStorage for cross-session persistence — hard refresh can serve
//      "stale" data instantly while a background refetch happens.
//
// Strategy: stale-while-revalidate.
//   - If we have a fresh cached value (under FRESH_TTL_MS): return it.
//   - If we have a stale value (under STALE_TTL_MS): return it AND refetch
//     in the background, updating consumers via a custom event.
//   - Otherwise: do the network fetch synchronously like before.
//
// Mutations (set/delete) invalidate cache entries that could be affected.
// ============================================================

const CACHE_LS_PREFIX = "campbau:cache:";
// FRESH_TTL_MS = how long a cached value is returned without re-fetching.
// We keep this short (30s) so writes from other clients become visible
// quickly during a multi-user session — when SWR sees a stale value it
// returns it immediately AND fires a background refetch, so there's no
// latency penalty for users; just better freshness.
const FRESH_TTL_MS  = 30 * 1000;
const STALE_TTL_MS  = 24 * 60 * 60 * 1000; // 24 hr — return + refetch in bg

const cache = new Map(); // key -> { value, ts }
const inflight = new Map(); // key -> Promise (dedupe parallel fetches)

const cacheKeyForGet     = (key)    => "get:" + key;
const cacheKeyForList    = (prefix) => "list:" + (prefix || "");
const cacheKeyForGetAll  = (prefix) => "getAll:" + (prefix || "");

const lsRead = (k) => {
  try {
    const v = localStorage.getItem(CACHE_LS_PREFIX + k);
    if (v == null) return undefined;
    const parsed = JSON.parse(v);
    if (parsed && typeof parsed.ts === "number") return parsed;
  } catch {}
  return undefined;
};
const lsWrite = (k, value, ts) => {
  try {
    // Skip very large items to avoid blowing the localStorage quota
    const json = JSON.stringify({ value, ts });
    if (json.length > 500_000) return;
    localStorage.setItem(CACHE_LS_PREFIX + k, json);
  } catch {}
};
const lsDelete = (k) => {
  try { localStorage.removeItem(CACHE_LS_PREFIX + k); } catch {}
};

const cacheGet = (k) => {
  let e = cache.get(k);
  if (!e) {
    const fromLs = lsRead(k);
    if (fromLs) { cache.set(k, fromLs); e = fromLs; }
  }
  if (!e) return null;
  const age = Date.now() - e.ts;
  if (age <= FRESH_TTL_MS) return { value: e.value, fresh: true };
  if (age <= STALE_TTL_MS) return { value: e.value, fresh: false };
  // Expired beyond stale window — drop it
  cache.delete(k);
  lsDelete(k);
  return null;
};

const cacheSet = (k, value) => {
  const ts = Date.now();
  cache.set(k, { value, ts });
  lsWrite(k, value, ts);
};

const cacheInvalidate = (key) => {
  const drop = (k) => { cache.delete(k); lsDelete(k); };
  drop(cacheKeyForGet(key));
  const colon = key.indexOf(":");
  if (colon >= 0) {
    const prefix = key.slice(0, colon + 1);
    drop(cacheKeyForGetAll(prefix));
    drop(cacheKeyForList(prefix));
  }
  drop(cacheKeyForGetAll(""));
  drop(cacheKeyForList(""));
};

// Notify listeners that a cached entry was refreshed in the background.
// Components can listen to this event and reload state if they care.
const emitRefresh = (cacheKey, value) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("storage:refresh", {
      detail: { cacheKey, value }
    }));
  }
};

// Wrap an async fetcher with stale-while-revalidate semantics.
// Returns: a value (possibly stale). If stale, kicks off a background refresh.
const swr = async (cacheKey, fetcher) => {
  const cached = cacheGet(cacheKey);
  if (cached?.fresh) return cached.value;

  // If cached but stale, return it AND refresh in background (deduped)
  if (cached) {
    if (!inflight.has(cacheKey)) {
      const p = (async () => {
        try {
          const fresh = await fetcher();
          cacheSet(cacheKey, fresh);
          emitRefresh(cacheKey, fresh);
          return fresh;
        } catch (err) {
          // Swallow background errors silently — UI still has stale data
          console.warn("swr bg refresh failed", cacheKey, err?.message || err);
          return cached.value;
        } finally {
          inflight.delete(cacheKey);
        }
      })();
      inflight.set(cacheKey, p);
    }
    return cached.value;
  }

  // No cached value — fetch synchronously, dedupe parallel calls
  if (inflight.has(cacheKey)) return inflight.get(cacheKey);
  const p = (async () => {
    try {
      const value = await fetcher();
      cacheSet(cacheKey, value);
      return value;
    } finally {
      inflight.delete(cacheKey);
    }
  })();
  inflight.set(cacheKey, p);
  return p;
};

export const storage = {
  async get(key) {
    return swr(cacheKeyForGet(key), async () => {
      try {
        const r = await rawStorage.get(key);
        return r ? JSON.parse(r.value) : null;
      } catch (err) {
        if (!String(err?.message || "").includes("404")) {
          console.warn("storage.get failed", key, err?.message || err);
        }
        return null;
      }
    });
  },
  // Strict variant — distinguishes between "key absent" and "fetch failed".
  // Returns null only when the underlying store responds with a definitive
  // "no such key" (HTTP 404 or empty payload). On any other error (network
  // blip, 5xx, timeout, parse failure) it throws.
  //
  // Use this anywhere that "absent" would trigger a destructive write
  // (seeding, default-record creation). The previous behaviour collapsed
  // both cases to null and caused at least one production data-wipe of
  // the bau profile when an Upstash hiccup made `get("user:bau")` look
  // like the key didn't exist; the bootstrap then helpfully overwrote
  // the live record with an empty default.
  //
  // Bypasses the SWR cache to make sure we get a real, current answer.
  // The caller is expected to gate critical writes on this — never on the
  // permissive `get`.
  async getStrict(key) {
    let r;
    try {
      r = await rawStorage.get(key);
    } catch (err) {
      const msg = String(err?.message || "");
      if (msg.includes("404")) return null; // genuine miss
      throw err;
    }
    if (!r) return null;
    try {
      return JSON.parse(r.value);
    } catch (err) {
      // Corrupt JSON in the store — treat as fetch failure to be safe
      throw new Error(`Corrupt JSON for ${key}: ${err?.message || err}`);
    }
  },
  async set(key, value) {
    try {
      await rawStorage.set(key, JSON.stringify(value));
      cacheInvalidate(key);
      cacheSet(cacheKeyForGet(key), value);
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
    return swr(cacheKeyForList(prefix), async () => {
      try {
        const r = await rawStorage.list(prefix);
        return r?.keys || [];
      } catch (err) {
        emitError("list", prefix, err);
        return [];
      }
    });
  },
  async getAll(prefix) {
    return swr(cacheKeyForGetAll(prefix), async () => {
      try {
        const r = await rawStorage.getAll(prefix);
        const items = r?.items || [];
        const result = [];
        for (const item of items) {
          try {
            const parsed = JSON.parse(item.value);
            result.push(parsed);
            // Prime the per-key get cache too
            cacheSet(cacheKeyForGet(item.key), parsed);
          } catch {}
        }
        return result;
      } catch (err) {
        emitError("getAll", prefix, err);
        return [];
      }
    });
  },
  // Prefetch a getAll in the background — useful right after login.
  // Returns immediately; result lands in the cache when ready.
  prefetchAll(prefix) {
    this.getAll(prefix).catch(() => {});
  },
  // Drop the cached freshness window for a prefix so the next read goes
  // to the network. Used for live-update polling — call this on a timer
  // and on visibility change to pick up writes from other clients without
  // forcing the user to hard-refresh.
  //
  // Concretely: removes the in-memory entries and the localStorage cache
  // entries for the prefix-level getAll/list keys. Per-item get caches
  // are left alone — a subsequent getAll() will re-prime them in one
  // network roundtrip and emit storage:refresh, which views can listen to.
  revalidatePrefix(prefix) {
    const dropMemAndLs = (k) => { cache.delete(k); lsDelete(k); };
    dropMemAndLs(cacheKeyForGetAll(prefix));
    dropMemAndLs(cacheKeyForList(prefix));
    // Also clear per-item gets under this prefix, so any view that does
    // get("user:foo") will refetch instead of returning a 5-minute-old
    // copy.
    const memPrefix = "get:" + (prefix || "");
    for (const k of Array.from(cache.keys())) {
      if (k.startsWith(memPrefix)) cache.delete(k);
    }
    try {
      const lsPrefix = CACHE_LS_PREFIX + memPrefix;
      const toDelete = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(lsPrefix)) toDelete.push(k);
      }
      toDelete.forEach(k => localStorage.removeItem(k));
    } catch {}
  },
  // Manual cache controls for special cases
  invalidateAll() {
    cache.clear();
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(CACHE_LS_PREFIX)) keys.push(k);
      }
      keys.forEach(k => localStorage.removeItem(k));
    } catch {}
  }
};
