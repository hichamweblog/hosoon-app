import { expect, test } from "@playwright/test";
import { getThumunAudioUrl } from "../../src/lib/quran-audio";
import { guest, seed, open, modal } from "./helpers";
function wave() {
  const rate = 8000, seconds = 20, bytes = rate * seconds * 2, buffer = Buffer.alloc(44 + bytes);
  buffer.write("RIFF", 0); buffer.writeUInt32LE(36 + bytes, 4); buffer.write("WAVEfmt ", 8); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write("data", 36); buffer.writeUInt32LE(bytes, 40);
  for (let i = 0; i < rate * seconds; i++) buffer.writeInt16LE(Math.floor(Math.sin(i * 2 * Math.PI * 220 / rate) * 500), 44 + i * 2);
  return buffer;
}
const audioPlaying = () => { const audio = document.querySelector("audio"); return !!audio && !audio.paused && audio.readyState >= 2; };
test("صوت واحد فعلي وMediaSession للنشط، وانتقال الجلسة إلى القارئ دون تراكب", async ({ page }) => {
  await seed(page); await page.route(/https:\/\/.*\.mp3(?:\?.*)?$/, (route) => route.fulfill({ status: 200, contentType: "audio/wav", body: wave() })); await open(page);
  await page.getByRole("button", { name: /^تفاصيل.*الحزب$/ }).click(); await page.getByRole("button", { name: "ابدأ الاستماع", exact: true }).click(); const session = await modal(page, "جلسة الاستماع");
  await session.getByRole("button", { name: /^تشغيل الحزب / }).click(); await expect.poll(() => page.evaluate(audioPlaying)).toBe(true); expect(await page.locator("audio").count()).toBe(1);
  await session.getByRole("button", { name: "إغلاق جلسة الاستماع" }).click(); await page.getByRole("button", { name: "فتح المصحف الشريف" }).click(); await modal(page, "المصحف — الثمن 1"); await page.getByRole("button", { name: "الاستماع إلى الثمن المحدد" }).click();
  const player = page.locator("[data-audio-target='thumun:1']"); await player.getByRole("button", { name: /^تشغيل الثمن / }).click(); await expect.poll(() => page.evaluate(audioPlaying)).toBe(true);
  expect(await page.locator("audio").count()).toBe(1); expect(await page.locator("audio").getAttribute("src")).toBe(getThumunAudioUrl("sayed", 1));
  expect(await page.evaluate(() => navigator.mediaSession.metadata?.title)).toContain("الثمن");
  await player.getByRole("button", { name: "الأدوات", exact: true }).click(); await expect.poll(() => page.evaluate(() => document.querySelector("audio")!.currentTime)).toBeGreaterThan(1);
  await player.getByRole("button", { name: "بداية المقطع A" }).click(); const range = player.getByRole("slider", { name: "موضع التشغيل الصوتي" }); const box = (await range.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2); await player.getByRole("button", { name: "نهاية المقطع B" }).click(); await expect(player.getByText(/^A .* · B /)).toBeVisible();
});
test("الصفحة 480 المشتركة: تحديد 477 يطابق عنوانه وصوته H60-T05", async ({ page }) => {
  await seed(page, guest(476)); await page.route(/https:\/\/.*\.mp3(?:\?.*)?$/, (route) => route.fulfill({ status: 200, contentType: "audio/wav", body: wave() })); await open(page); await page.getByRole("button", { name: "فتح المصحف الشريف" }).click(); await modal(page, "المصحف — الثمن 477"); await page.getByRole("button", { name: "الصفحة التالية", exact: true }).click();
  await expect(page.getByTestId("shared-page-context")).toContainText("ثمن المحدد ٤٧٧"); await page.getByRole("button", { name: "الاستماع إلى الثمن المحدد" }).click(); const player = page.locator("[data-audio-target='thumun:477']"); await expect(player).toBeVisible(); await player.getByRole("button", { name: /^تشغيل الثمن / }).click();
  await expect.poll(() => page.evaluate(audioPlaying)).toBe(true); expect(await page.locator("audio").getAttribute("src")).toBe(getThumunAudioUrl("sayed", 477));
  await page.getByRole("button", { name: "ثمن تالٍ", exact: true }).click(); await expect(page.locator("[data-audio-target='thumun:478']")).toBeVisible(); expect(await page.evaluate(() => document.querySelector("audio")!.paused)).toBe(true);
});
test("فشل الصوت واضح حتى في العرض المختصر، وإعادة المحاولة متاحة", async ({ page }) => {
  await seed(page); await page.route(/https:\/\/.*\.mp3(?:\?.*)?$/, (route) => route.abort()); await open(page); await page.getByRole("button", { name: "فتح المصحف الشريف" }).click(); await modal(page, "المصحف — الثمن 1"); await page.getByRole("button", { name: "الاستماع إلى الثمن المحدد" }).click(); const player = page.locator("[data-audio-target='thumun:1']"); await player.getByRole("button", { name: /^تشغيل الثمن / }).click(); await expect(player.getByRole("alert")).toBeVisible(); await expect(player.getByRole("button", { name: "إعادة المحاولة", exact: true })).toBeVisible();
});
