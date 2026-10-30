/* عامل الخدمة: يستقبل إشعارات الدفعة ويفتح التطبيق عند الضغط. لا يخزّن الصفحات حتى لا تعلق نسخة قديمة. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("push", (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "وتواصوا", {
    body: d.body || "", icon: "./icon-192.png", badge: "./icon-192.png", dir: "rtl", lang: "ar", tag: d.tag || "ww", renotify: !!d.tag, data: { url: d.url || "./" },
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "./", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => { const c = cs.find((x) => x.url.startsWith(self.registration.scope)); return c ? c.focus().then(() => c.navigate ? c.navigate(url) : undefined) : self.clients.openWindow(url); }));
});
/* صفحة التطبيق تُجلب دائمًا من الشبكة مع إعادة التحقق (GitHub Pages يخزّنها ١٠ دقائق) حتى تصل النسخة الجديدة فور النشر */
self.addEventListener("fetch", (e) => {
  const r = e.request; if (r.mode !== "navigate") return;
  e.respondWith(fetch(r, { cache: "no-cache" }).catch(() => fetch(r)));
});
