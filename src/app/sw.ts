// @ts-nocheck
// Service Worker for PWA offline support
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry } from "@serwist/precaching";
import { Serwist } from "@serwist/precaching";

declare const self: any;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST as (PrecacheEntry | string)[] | undefined,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
