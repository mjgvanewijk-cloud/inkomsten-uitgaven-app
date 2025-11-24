const CACHE_NAME = "finflow-cache-v14";

const ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "Icons/icon-512.png",
  "styles/app.css",
  "scripts/main.js",
  "scripts/ui.js",
  "scripts/storage.js",
  "scripts/state.js",
  "scripts/categories.js",
  "scripts/month.js",
  "scripts/year.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then(
      (response) => response || fetch(event.request)
    )
  );
});
