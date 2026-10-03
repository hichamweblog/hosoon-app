import { expect, test } from "@playwright/test";
import { guest, seed, open, readProgress, overflow, modal } from "./helpers";

test("تهيئة ثلاث خطوات دون إذن تلقائي، والتصريح لا يختلق 60 وردًا", async ({ page }) => {
  await page.addInitScript(() => { localStorage.clear(); (window as unknown as { permissionPrompts: number }).permissionPrompts = 0; if ("Notification" in window) Notification.requestPermission = async () => { (window as unknown as { permissionPrompts: number }).permissionPrompts++; return "denied"; }; });
  await page.goto("/"); await expect(page.getByRole("heading", { name: "رحلة هادئة مع القرآن" })).toBeVisible(); await page.getByRole("button", { name: "التالي", exact: true }).click();
  await page.getByLabel("عدد الأثمان المحفوظة من البداية").fill("60"); await page.getByRole("button", { name: "التالي", exact: true }).click(); await page.getByRole("button", { name: "ابدأ وردي" }).click();
  await expect(page.getByRole("heading", { name: "وردك اليوم" })).toBeVisible(); const data = await readProgress(page);
  expect(Object.values(data.memorization).filter((m) => m.memorized)).toHaveLength(60); expect(data.currentDay).toBe(61); expect(data.totalXp).toBe(0); expect(data.streak).toBe(0); expect(data.completions).toEqual({});
  expect(await page.evaluate(() => (window as unknown as { permissionPrompts: number }).permissionPrompts)).toBe(0);
});

test("4/4 = 100% و110 XP، ثم إعادة الفتح تبقي الإنجاز", async ({ page }) => {
  await seed(page); await open(page);
  await expect(page.getByRole("button", { name: "ابدأ التلاوة", exact: true })).toBeInViewport();
  const boxes = page.getByRole("checkbox"); expect(await boxes.count()).toBe(4);
  for (let i = 0; i < 4; i++) await boxes.nth(i).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "4"); expect((await readProgress(page)).totalXp).toBe(110);
  await page.reload(); await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "4"); expect((await readProgress(page)).totalXp).toBe(110);
});

test("جلسة → مصحف → Back يحفظ المؤقت والقفل، ثم تأكيد المغادرة", async ({ page }) => {
  await seed(page); await open(page); await page.getByRole("button", { name: "ابدأ التلاوة", exact: true }).click(); const session = await modal(page, "جلسة التلاوة");
  await page.clock.install({ time: new Date() }); await session.getByRole("button", { name: "بدء المؤقت", exact: true }).click(); await page.clock.fastForward(2000);
  const before = await session.getByLabel(/^متبقي /).textContent(); await session.getByRole("button", { name: "اقرأ الجزء من المصحف" }).click(); await modal(page, "المصحف — الثمن 1");
  await page.clock.fastForward(3000); await page.evaluate(() => history.back()); await expect(page.getByRole("button", { name: "إغلاق القارئ" })).not.toBeVisible(); await expect(session).toBeVisible();
  expect(await session.getByLabel(/^متبقي /).textContent()).not.toBe(before);
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toMatch(/hidden|clip/);
  await page.evaluate(() => history.back()); const confirm = await modal(page, "إنهاء الجلسة؟"); await confirm.getByRole("button", { name: "احفظ الوقت وأنهِ" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0); expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toMatch(/hidden|clip/);
  const data = await readProgress(page); expect(Object.values(data.sessions)).toHaveLength(1); expect(Object.values(data.sessions)[0].seconds).toBeGreaterThanOrEqual(5); expect(data.totalXp).toBe(0);
});

test("معاينة مستقبلية لا تمنح XP أو تقييمًا، والبحث ٢/2/۲ متساوٍ", async ({ page }) => {
  await seed(page); await open(page); await page.getByRole("button", { name: "الخطة", exact: true }).click();
  const search = page.getByRole("searchbox", { name: "البحث في خطة الأثمان" });
  for (const number of ["٢", "2", "۲"]) { await search.fill(number); await expect(page.getByRole("button", { name: "معاينة الثمن 2", exact: true })).toBeVisible(); expect(await page.getByRole("button", { name: /^معاينة الثمن / }).count()).toBe(1); }
  await search.fill("7"); await page.getByRole("button", { name: "معاينة الثمن 7", exact: true }).click(); const preview = await modal(page, "محطة الثمن ٧");
  await preview.getByRole("button", { name: "مراجعة القريب — معاينة" }).click(); const review = await modal(page, "مراجعة القريب"); await expect(review.getByRole("button", { name: "جيد", exact: true })).toHaveCount(0);
  await review.getByRole("button", { name: "حفظ وقت الدراسة الحرة" }).click(); expect((await readProgress(page)).totalXp).toBe(0); expect((await readProgress(page)).thumunRatings).toEqual({});
});

test("تثبيت ثمن ضعيف واحد لا يكمل 16 ثمن مراجعة بعيد", async ({ page }) => {
  const data = guest(24); data.thumunRatings[1] = "weak"; await seed(page, data); await open(page); await page.getByRole("button", { name: "المراجعة", exact: true }).click();
  await page.getByRole("button", { name: "ثبّت هذا الثمن", exact: true }).first().click(); const dialog = await modal(page, "تثبيت حر"); await dialog.getByRole("button", { name: "ضعيف", exact: true }).click(); await dialog.getByRole("button", { name: "حفظ التثبيت الحر", exact: true }).click();
  const saved = await readProgress(page); expect(saved.thumunRatings[1]).toBe("weak"); expect(Object.keys(saved.reviewAttempts)).toHaveLength(1); expect(saved.totalXp).toBe(0); expect(Object.values(saved.completions).some((c) => c.task === "review_far" && c.done)).toBe(false);
});

test("نسخة مشوهة لا تستبدل الحالة، وround-trip صالح مع نسخة رجوع", async ({ page }) => {
  const data = guest(); data.notes[1] = "do-not-lose"; await seed(page, data); await open(page); await page.getByRole("button", { name: "الإعدادات", exact: true }).click(); const settings = await modal(page, "الإعدادات");
  await settings.getByLabel("ملف النسخة الاحتياطية").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ app: "hosoon", version: 4, state: { ...data, currentDay: 1.5, resetProgress: "override" } })) });
  expect((await readProgress(page)).notes[1]).toBe("do-not-lose"); await expect(page.getByRole("dialog", { name: "معاينة الاستيراد" })).toHaveCount(0);
  const imported = guest(3); imported.notes[3] = "imported";
  await settings.getByLabel("ملف النسخة الاحتياطية").setInputFiles({ name: "good.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ app: "hosoon", version: 4, exportedAt: new Date().toISOString(), state: imported })) });
  const preview = await modal(page, "معاينة الاستيراد"); await preview.getByRole("button", { name: "أوافق على الاستبدال" }).click(); expect((await readProgress(page)).notes[3]).toBe("imported");
  expect(await page.evaluate(() => Object.keys(localStorage).some((key) => key.startsWith("hosoon-recovery:guest:") && localStorage.getItem(key)?.includes("do-not-lose")))).toBe(true);
});

test("خطأ الصورة يظهر إعادة محاولة، والقارئ في 320 و390 والاتجاه الأفقي", async ({ page }) => {
  await seed(page); let fail = true; await page.route("**/mushaf/pages/page1.jpg*", async (route) => { if (fail) await route.abort(); else await route.continue(); }); await open(page); await page.getByRole("button", { name: "فتح المصحف الشريف" }).click(); await modal(page, "المصحف — الثمن 1");
  await expect(page.getByText("تعذّر تحميل صورة هذه الصفحة.")).toBeVisible(); fail = false; await page.getByRole("button", { name: "إعادة تحميل الصورة" }).click(); await expect(page.locator("img[alt*='صورة صفحة']")).toBeVisible();
  for (const size of [{ width: 320, height: 700 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) { await page.setViewportSize(size); expect(await overflow(page)).toBe(false); await expect(page.getByRole("button", { name: "إغلاق القارئ" })).toBeInViewport(); await expect(page.getByRole("button", { name: "الصفحة التالية", exact: true })).toBeInViewport(); }
});
