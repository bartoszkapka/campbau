// Minimal service worker — required by browsers for PWA install eligibility.
// We don't aggressively cache the app shell to avoid stale-content issues
// (the app changes often). Just a passthrough fetch handler is enough for
// "installable" status in Chrome/Edge.

const CACHE_NAME = "campbau-v1";

self.addEventListener("install", (event) => {
  // Skip waiting so updates apply immediately on next load.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
  // Clear out any old named caches.
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
});

self.addEventListener("fetch", (event) => {
  // Network-first for navigations; falls back to cache only if offline.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }
  // For everything else, just let the network handle it.
});
