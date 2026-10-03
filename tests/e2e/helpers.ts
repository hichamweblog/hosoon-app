import { expect, type Page } from "@playwright/test";
import { emptyProgress, deriveProgress } from "../../src/lib/progress/derive";
import type { ProgressData } from "../../src/lib/progress/types";
export const OWNER_A = "11111111-1111-4111-8111-111111111111", OWNER_B = "22222222-2222-4222-8222-222222222222";
export function guest(prior = 0): ProgressData {
  const data = emptyProgress(); data.showOnboarding = false; data.currentDay = Math.min(480, prior + 1); data.settings.quietMode = true;
  for (let id = 1; id <= prior; id++) data.memorization[id] = { memorized: true, source: "prior", at: data.startDate, stamp: { clock: 1, device: "fixture" } };
  return deriveProgress(data);
}
export async function seed(page: Page, data = guest(), extra: Record<string, string> = {}) {
  await page.addInitScript(({ state, other }) => {
    if (!sessionStorage.getItem("hosoon-e2e-seeded")) {
      localStorage.clear(); localStorage.setItem(`hosoon-progress:${state.ownerId ?? "guest"}`, JSON.stringify({ state, version: 4 }));
      for (const [key, value] of Object.entries(other)) localStorage.setItem(key, value);
      sessionStorage.setItem("hosoon-e2e-seeded", "1");
    }
  }, { state: data, other: extra });
}
export async function open(page: Page) { await page.goto("/"); await expect(page.getByRole("heading", { name: "وردك اليوم" })).toBeVisible(); }
export async function readProgress(page: Page, owner: string | null = null) {
  return page.evaluate((id) => JSON.parse(localStorage.getItem(`hosoon-progress:${id ?? "guest"}`)!).state, owner) as Promise<ProgressData>;
}
export async function overflow(page: Page) { return page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); }
export async function modal(page: Page, title: string) { const dialog = page.getByRole("dialog", { name: title, exact: true }); await expect(dialog).toBeVisible(); return dialog; }
