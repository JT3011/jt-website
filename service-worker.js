const CACHE_VERSION = "jt-performance-hub-20260827.1";
const OFFLINE_URL = "/performance-hub-offline.html";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/pwa-register.js?v=20260827.1",
  "/images/jt-hub-icon.svg?v=20260827.1",
  "/images/jt-hub-icon-192.png?v=20260827.1",
  "/images/jt-hub-icon-512.png?v=20260827.1",
  "/images/jt-hub-icon-maskable-512.png?v=20260827.1",
  "/images/jt-hub-apple-touch-icon.png?v=20260827.1"
];

const SAFE_STATIC_PATHS = new Set([
  "/manifest.webmanifest",
  "/pwa-register.js",
  "/images/jt-hub-icon.svg",
  "/images/jt-hub-icon-192.png",
  "/images/jt-hub-icon-512.png",
  "/images/jt-hub-icon-maskable-512.png",
  "/images/jt-hub-apple-touch-icon.png"
]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("jt-performance-hub-") && key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache or proxy cross-origin traffic. This keeps Supabase auth,
  // API responses, private storage and third-party services out of Cache Storage.
  if (url.origin !== self.location.origin) return;

  const isHubNavigation =
    request.mode === "navigate" &&
    url.pathname.startsWith("/performance-hub-");

  if (isHubNavigation) {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Only the explicitly listed public PWA assets are cacheable.
  if (SAFE_STATIC_PATHS.has(url.pathname)) {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          if (!response || !response.ok || response.type !== "basic") return response;
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        });
      })
    );
  }
});
