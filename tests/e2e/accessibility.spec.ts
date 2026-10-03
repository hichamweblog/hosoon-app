import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { guest, seed, open, modal, overflow } from "./helpers";
const THEMES = ["dark", "ocean-dark", "ocean", "warm", "light"];
async function axe(page: Page, screen: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })) })), screen).toEqual([]);
}
for (const theme of THEMES) {
  test(`axe — ${theme}: اليوم والإحصائيات والإعدادات والحساب`, async ({ page }) => {
    await seed(page, guest(24), { theme }); await open(page); await axe(page, `${theme} home`);
    await page.getByRole("button", { name: "إحصائيات", exact: true }).click(); await expect(page.getByRole("heading", { name: "إحصائياتك" })).toBeVisible(); await axe(page, `${theme} stats`);
    await page.getByRole("button", { name: "الإعدادات", exact: true }).click(); const settings = await modal(page, "الإعدادات"); await axe(page, `${theme} settings`);
    await settings.getByRole("button", { name: /دخول لحفظ|الحساب \(المزامنة/ }).click(); await modal(page, "الحساب والمزامنة"); await axe(page, `${theme} auth`);
  });
}
test("Tab لا يهرب من أعلى نافذة، Escape يغلقها وحدها ويرجع التركيز", async ({ page }) => {
  await seed(page); await open(page); const trigger = page.getByRole("button", { name: "الإعدادات", exact: true }); await trigger.click(); const settings = await modal(page, "الإعدادات");
  await settings.getByRole("button", { name: /دخول لحفظ|الحساب \(المزامنة/ }).click(); const auth = await modal(page, "الحساب والمزامنة");
  for (let i = 0; i < 12; i++) { await page.keyboard.press("Tab"); expect(await auth.evaluate((node) => node.contains(document.activeElement))).toBe(true); }
  await page.keyboard.press("Escape"); await expect(auth).not.toBeVisible(); await expect(settings).toBeVisible();
  await page.keyboard.press("Escape"); await expect(settings).not.toBeVisible(); await expect(trigger).toBeFocused();
});
test("200% تكبير نص و320px: لا overflow، زر الإجراء والمصحف قابلان للوصول", async ({ page }) => {
  await seed(page); await open(page); await page.setViewportSize({ width: 320, height: 700 }); await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  expect(await overflow(page)).toBe(false); await page.getByRole("button", { name: "إحصائيات", exact: true }).click(); await expect(page.getByRole("heading", { name: "إحصائياتك" })).toBeVisible(); expect(await overflow(page)).toBe(false);
  await page.getByRole("button", { name: "فتح المصحف الشريف" }).click(); await modal(page, "المصحف — الثمن 1"); expect(await overflow(page)).toBe(false); await expect(page.getByRole("button", { name: "إغلاق القارئ" })).toBeInViewport();
});
test("axe في الجلسة والقارئ، وfieldset/slider بأسماء", async ({ page }) => {
  await seed(page); await open(page); await page.getByRole("button", { name: "ابدأ التلاوة", exact: true }).click(); const session = await modal(page, "جلسة التلاوة"); await axe(page, "session");
  await session.getByRole("button", { name: "اقرأ الجزء من المصحف" }).click(); await modal(page, "المصحف — الثمن 1"); await page.getByRole("button", { name: "الاستماع إلى الثمن المحدد" }).click(); await axe(page, "reader");
});
