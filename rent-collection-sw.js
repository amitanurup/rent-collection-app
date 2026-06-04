const CACHE_NAME = "rent-collection-v32";
const APP_ASSETS = [
  "./index.html",
  "./tenant-portal.html",
  "./tenant-intake.html",
  "./rent-collection.webmanifest",
  "./rent-collection-sw.js",
  "./assets/css/rent-collection.css?v=20260602-lock-flow-3",
  "./assets/css/tenant-public.css?v=20260525-intake-backend-fix-8",
  "./assets/js/rent-collection.js?v=20260602-lock-flow-4",
  "./assets/js/tenant-public.js?v=20260525-intake-backend-fix-8",
  "./assets/branding/krishna-residency-logo.png",
  "./assets/branding/krishna-residency-logo-receipt.jpg",
  "./assets/icons/rent-collection-icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
          return networkResponse;
        }
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
          return null;
        });
      })
  );
});
