// Service Worker: speichert die App-Dateien, damit sie auch offline funktioniert.
// Wenn du etwas an der App änderst, erhöhe die Versionsnummer (v1 -> v2).
const CACHE = "wurst-speck-v1";
const DATEIEN = ["./", "./index.html", "./style.css", "./app.js", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(DATEIEN)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  e.respondWith(
    fetch(e.request)
      .then(antwort => {
        const kopie = antwort.clone();
        caches.open(CACHE).then(c => c.put(e.request, kopie));
        return antwort;
      })
      .catch(() => caches.match(e.request))
  );
});
