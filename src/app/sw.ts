/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry } from "@serwist/precaching";
import { Serwist, CacheFirst, NetworkOnly, CacheableResponsePlugin, ExpirationPlugin } from "serwist";
declare const self: ServiceWorkerGlobalScope & { __SW_MANIFEST?: (PrecacheEntry | string)[] };
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST, skipWaiting: false, clientsClaim: true, navigationPreload: true,
  runtimeCaching: [
    { matcher: ({ url, request }) => request.destination === "audio" || /\.(mp3|m4a|ogg|wav)$/i.test(url.pathname) || request.headers.has("authorization") || url.pathname.startsWith("/api/") || url.pathname.startsWith("/supabase/") || url.hostname.endsWith(".supabase.co"), handler: new NetworkOnly() },
    { matcher: ({ url, request }) => url.origin === self.location.origin && url.pathname.startsWith("/mushaf/pages/") && request.cache !== "no-store", handler: new CacheFirst({ cacheName: "hosoon-mushaf-v1", plugins: [new CacheableResponsePlugin({ statuses: [200] }), new ExpirationPlugin({ maxEntries: 500, purgeOnQuotaError: true })] }) },
    ...defaultCache,
  ],
});
serwist.addEventListeners();
self.addEventListener("message", (event) => { if (event.data?.type === "ACTIVATE_UPDATE") void self.skipWaiting(); });
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const client = clients.find((c) => new URL(c.url).origin === self.location.origin);
    return client ? client.focus() : self.clients.openWindow("/");
  }));
});
