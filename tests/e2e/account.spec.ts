import { expect, test } from "@playwright/test";
import { account, AUTH_KEY, MockBackend, session } from "./mock-backend";
import { guest, seed, open, readProgress, modal, OWNER_A, OWNER_B } from "./helpers";

test("استعادة كاملة للحساب، JSONB مختلف الترتيب لا يسبب رفعًا في الخمول", async ({ page }) => {
  const backend = new MockBackend(); backend.put(OWNER_A, account(OWNER_A, "A_PRIVATE", 25)); await backend.install(page);
  await seed(page, guest(), { [AUTH_KEY]: JSON.stringify(session(OWNER_A)) }); await open(page);
  await expect.poll(async () => (await readProgress(page, OWNER_A)).notes[1]).toBe("A_PRIVATE"); await expect.poll(async () => (await readProgress(page, OWNER_A)).currentDay).toBe(25);
  await expect.poll(() => backend.writes().length).toBe(1); const count = backend.writes().length;
  await page.clock.install({ time: new Date() }); await page.clock.fastForward(20000); expect(backend.writes()).toHaveLength(count);
  expect(backend.rows.get(OWNER_A)?.snapshot.notes[1]).toBe("A_PRIVATE"); expect(backend.writes()[0].body?.p_snapshot).toMatchObject({ ownerId: OWNER_A, currentDay: 25 });
});

test("فشل أول جلب لا يولد خطة افتراضية ولا يرفع حالة الضيف", async ({ page }) => {
  const backend = new MockBackend(); backend.put(OWNER_A, account(OWNER_A, "CLOUD_ONLY", 200)); backend.failReads = true; await backend.install(page);
  const local = guest(40); local.notes[1] = "GUEST_ONLY"; await seed(page, local, { [AUTH_KEY]: JSON.stringify(session(OWNER_A)) }); await open(page);
  await expect(page.getByText("المزامنة متوقفة · النسخة المحلية محفوظة")).toBeVisible(); expect(backend.writes()).toHaveLength(0);
  const data = await readProgress(page, OWNER_A); expect(data.dailyPlans).toEqual({}); expect(data.notes).toEqual({}); expect(backend.rows.get(OWNER_A)?.snapshot.notes[1]).toBe("CLOUD_ONLY");
  expect((await readProgress(page)).notes[1]).toBe("GUEST_ONLY");
});

test("خروج A ثم دخول B لا يخلط الملاحظات، ونقل الضيف اختيار صريح", async ({ page }) => {
  const backend = new MockBackend(); backend.put(OWNER_A, account(OWNER_A, "A_PRIVATE")); backend.put(OWNER_B, account(OWNER_B, "B_PRIVATE")); await backend.install(page);
  const local = guest(); local.notes[2] = "GUEST_SECOND"; await seed(page, local, { [AUTH_KEY]: JSON.stringify(session(OWNER_A)) }); await open(page);
  await expect.poll(async () => (await readProgress(page, OWNER_A)).notes[1]).toBe("A_PRIVATE"); await page.getByRole("button", { name: "الإعدادات", exact: true }).click(); const aSettings = await modal(page, "الإعدادات"); await aSettings.getByRole("button", { name: "خروج إلى الضيف" }).click();
  await expect.poll(async () => (await readProgress(page)).notes[2]).toBe("GUEST_SECOND"); await page.getByRole("button", { name: "الإعدادات", exact: true }).click(); const settings = await modal(page, "الإعدادات"); await settings.getByRole("button", { name: "دخول لحفظ نسخة سحابية" }).click(); const auth = await modal(page, "الحساب والمزامنة");
  await auth.getByLabel("البريد الإلكتروني").fill("b@example.invalid"); await auth.getByLabel("كلمة المرور", { exact: true }).fill("e2e-password-only"); await auth.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();
  await expect.poll(async () => (await readProgress(page, OWNER_B)).notes[1]).toBe("B_PRIVATE"); expect((await readProgress(page, OWNER_B)).notes[2]).toBeUndefined(); expect(backend.rows.get(OWNER_B)?.snapshot.notes[1]).toBe("B_PRIVATE");
  expect(backend.requests.filter((r) => r.owner === OWNER_B && r.body?.p_snapshot).some((r) => JSON.stringify(r.body).includes("A_PRIVATE"))).toBe(false);
  await page.getByRole("button", { name: "الإعدادات", exact: true }).click(); const bSettings = await modal(page, "الإعدادات"); await bSettings.getByRole("button", { name: "نقل بيانات الضيف إلى حسابي" }).click(); const transfer = await modal(page, "نقل بيانات الضيف؟"); await transfer.getByRole("button", { name: "انقل بياناتي" }).click();
  await expect.poll(() => backend.rows.get(OWNER_B)?.snapshot.notes[2]).toBe("GUEST_SECOND"); expect(backend.rows.get(OWNER_B)?.snapshot.notes[1]).toBe("B_PRIVATE"); expect((await readProgress(page, OWNER_A)).notes[1]).toBe("A_PRIVATE");
});

test("reset فاشل لا يمس المحلي؛ النجاح يرفع epoch ويمنع العودة القديمة", async ({ page }) => {
  const backend = new MockBackend(); backend.put(OWNER_A, account(OWNER_A, "KEEP")); backend.failResets = true; await backend.install(page); await seed(page, guest(), { [AUTH_KEY]: JSON.stringify(session(OWNER_A)) }); await open(page);
  await expect.poll(async () => (await readProgress(page, OWNER_A)).notes[1]).toBe("KEEP"); await page.getByRole("button", { name: "الإعدادات", exact: true }).click(); const settings = await modal(page, "الإعدادات"); await settings.getByRole("button", { name: "تصفير تقدم الحساب على كل الأجهزة" }).click(); const reset = await modal(page, "تأكيد إعادة الضبط"); await reset.getByRole("button", { name: "أؤكد", exact: true }).click();
  await expect(page.getByText("تعذّر الاتصال بالمزامنة. بقي تقدمك محليًا؛ حاول لاحقًا.")).toBeVisible(); expect((await readProgress(page, OWNER_A)).notes[1]).toBe("KEEP"); expect(backend.rows.get(OWNER_A)?.epoch).toBe(0);
  backend.failResets = false; await reset.getByRole("button", { name: "أؤكد", exact: true }).click(); await expect.poll(() => backend.rows.get(OWNER_A)?.epoch).toBe(1); await expect.poll(async () => (await readProgress(page, OWNER_A)).epoch).toBe(1); expect((await readProgress(page, OWNER_A)).notes).toEqual({});
});

test("recovery رابط صالح ينتهي بكلمة مرور جديدة، والمنتهي يعرض خطأ", async ({ page }) => {
  const backend = new MockBackend(); await backend.install(page); await seed(page, guest(), { [AUTH_KEY]: JSON.stringify(session(OWNER_A)) }); await page.goto("/auth/recovery");
  await expect(page.getByLabel("كلمة المرور الجديدة", { exact: true })).toBeVisible(); await page.getByLabel("كلمة المرور الجديدة", { exact: true }).fill("replacement-e2e-password"); await page.getByLabel("تأكيد كلمة المرور", { exact: true }).fill("replacement-e2e-password"); await page.getByRole("button", { name: "حفظ كلمة المرور والعودة" }).click();
  await expect(page).toHaveURL(/\/$/); expect(backend.passwordChanged).toBe(true); await page.goto("/auth/recovery?error_code=otp_expired"); await expect(page.getByRole("alert").filter({ hasText: "الرابط غير صالح أو منتهي" })).toBeVisible(); await expect(page.getByLabel("كلمة المرور الجديدة", { exact: true })).toHaveCount(0);
});
