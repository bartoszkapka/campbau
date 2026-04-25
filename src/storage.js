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
  }
};

const impl = useLocal ? lsImpl : apiImpl;

// Public API matching the original window.storage shape
export const rawStorage = {
  get: impl.get,
  set: impl.set,
  delete: impl.delete,
  list: impl.list
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

export const storage = {
  async get(key) {
    try {
      const r = await rawStorage.get(key);
      return r ? JSON.parse(r.value) : null;
    } catch (err) {
      // get is allowed to "fail" (404 means missing) without alarming UI
      if (!String(err?.message || "").includes("404")) {
        console.warn("storage.get failed", key, err);
      }
      return null;
    }
  },
  async set(key, value) {
    try {
      await rawStorage.set(key, JSON.stringify(value));
      return true;
    } catch (err) {
      emitError("set", key, err);
      return false;
    }
  },
  async delete(key) {
    try { await rawStorage.delete(key); return true; }
    catch (err) { emitError("delete", key, err); return false; }
  },
  async list(prefix) {
    try {
      const r = await rawStorage.list(prefix);
      return r?.keys || [];
    } catch (err) {
      emitError("list", prefix, err);
      return [];
    }
  },
  async getAll(prefix) {
    const keys = await this.list(prefix);
    const items = await Promise.all(keys.map(k => this.get(k)));
    return items.filter(Boolean);
  }
};
