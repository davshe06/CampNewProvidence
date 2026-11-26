/* Offline support for the Wars in America Map.
   The page and its data files are cached on first visit. Same-site requests are served from the
   cache at once and refreshed in the background (stale-while-revalidate), so the map opens with
   no signal and picks up updates on the next visit. Portraits from Wikimedia are cached as they load. */
const CACHE = "wiam-v3", IMAGES = "wiam-images-v1";
const CORE = ["./", "index.html", "basemap-lo.json", "basemap.json", "homes.json", "charleston-water.json", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== IMAGES).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    e.respondWith(caches.open(CACHE).then(async (c) => {
      const hit = await c.match(req, { ignoreSearch: true });
      const net = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit || Response.error());
      if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
      return net;
    }));
  } else if (/(^|\.)wikimedia\.org$/.test(url.hostname)) {
    e.respondWith(caches.open(IMAGES).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const r = await fetch(req);
      if (r.ok || r.type === "opaque") c.put(req, r.clone());
      return r;
    }));
  }
});
