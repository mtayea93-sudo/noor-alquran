/* Service Worker — نور القرآن */
const CACHE = "noor-quran-v4";
const SHELL = ["./", "index.html", "style.css", "app.js", "manifest.json", "mtayea-signature.js", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;

  // ملفات التطبيق: الكاش أولًا (شغال بدون نت)
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }))
    );
    return;
  }

  // ملفات مكتبة القراءة (data/): الكاش أولًا — بتشتغل بدون نت بعد أول مرة
  if (url.pathname.includes("/data/")) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request)))
    );
    return;
  }

  // الـ API: الشبكة أولًا، ولو فشلت ندور في الكاش
  if (url.hostname.includes("api.alquran.cloud")) {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request))
    );
  }
});

/* الصوتيات: الكاش أولًا — الاستماع أوفلاين فورًا بعد أول تشغيل (الملفات ثابتة لا تتغير) */
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.hostname === "cdn.islamic.network" || url.hostname === "www.mp3quran.net" || url.hostname === "server.mp3quran.net") {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open("noor-quran-v4").then(c => c.put(e.request, copy));
        return res;
      }))
    );
  }
});
