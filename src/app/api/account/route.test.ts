import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ userId: "11111111-1111-4111-8111-111111111111", authError: false, correctionsError: false, deleteError: false, deleteUser: vi.fn(), deleteCorrections: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: (_url: string, key: string) => key === "test-server-only-admin" ? {
  from: () => ({ delete: () => ({ eq: async (_column: string, id: string) => { mock.deleteCorrections(id); return { error: mock.correctionsError ? { message: "internal" } : null }; } }) }),
  auth: { admin: { deleteUser: async (id: string) => { mock.deleteUser(id); return { error: mock.deleteError ? { message: "internal" } : null }; } } },
} : { auth: { getUser: async () => ({ data: { user: mock.authError ? null : { id: mock.userId } }, error: mock.authError ? { message: "invalid" } : null }) } } }));
import { DELETE } from "./route";
const A = "11111111-1111-4111-8111-111111111111", B = "22222222-2222-4222-8222-222222222222";
function req(body: unknown = { confirmation: "DELETE", ownerId: A }, headers: Record<string, string> = {}) {
  return new Request("https://app.example.invalid/api/account", { method: "DELETE", headers: { "content-type": "application/json", authorization: "Bearer test-token", host: "app.example.invalid", origin: "https://app.example.invalid", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
}
beforeEach(() => {
  mock.userId = A; mock.authError = false; mock.correctionsError = false; mock.deleteError = false; mock.deleteUser.mockClear(); mock.deleteCorrections.mockClear();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://local.supabase.invalid"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon"); vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-server-only-admin");
});
afterEach(() => vi.unstubAllEnvs());
describe("حذف حساب عبر verified JWT فقط، مع حارس نية الهوية", () => {
  it("إعداد الخادم الناقص لا يحذف شيئًا", async () => { vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", ""); expect((await DELETE(req())).status).toBe(503); expect(mock.deleteUser).not.toHaveBeenCalled(); });
  it("Bearer غير موجود/منتهي مرفوض", async () => {
    expect((await DELETE(req(undefined, { authorization: "" }))).status).toBe(401); mock.authError = true;
    expect((await DELETE(req())).status).toBe(401); expect(mock.deleteUser).not.toHaveBeenCalled();
  });
  it("Origin خارجي أو فاسد مرفوض قبل عمليات الإدارة", async () => {
    expect((await DELETE(req(undefined, { origin: "https://evil.example.invalid" }))).status).toBe(403);
    expect((await DELETE(req(undefined, { origin: "bad-url" }))).status).toBe(403); expect(mock.deleteUser).not.toHaveBeenCalled();
  });
  it("تأكيد أو بنية خاطئة لا ينفذ الحذف", async () => {
    expect((await DELETE(req({ confirmation: "NO", ownerId: A }))).status).toBe(400);
    expect((await DELETE(req({ confirmation: "DELETE", ownerId: A, victim: B }))).status).toBe(400);
    expect(mock.deleteUser).not.toHaveBeenCalled();
  });
  it("هوية مختلفة أثناء العملية لا تحذف الحساب الجديد B", async () => { mock.userId = B; expect((await DELETE(req())).status).toBe(409); expect(mock.deleteUser).not.toHaveBeenCalled(); expect(mock.deleteCorrections).not.toHaveBeenCalled(); });
  it("الطلب الضخم يقطع قراءة جسمه ولا يتصل بالإدارة", async () => { expect((await DELETE(req("x".repeat(10000)))).status).toBe(400); expect(mock.deleteUser).not.toHaveBeenCalled(); });
  it("فشل حذف التفسير الخاص يمنع تأكيد حذف الحساب", async () => { mock.correctionsError = true; expect((await DELETE(req())).status).toBe(502); expect(mock.deleteUser).not.toHaveBeenCalled(); });
  it("فشل Auth admin واضح وليس نجاحًا وهميًا", async () => { mock.deleteError = true; expect((await DELETE(req())).status).toBe(502); });
  it("الحساب المحذوف هو UID الموثق، مع no-store ودون أي سر في الاستجابة", async () => {
    const response = await DELETE(req()); expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store"); expect(mock.deleteUser).toHaveBeenCalledWith(A); expect(mock.deleteCorrections).toHaveBeenCalledWith(A);
    expect(await response.json()).toEqual({ deleted: true });
  });
});
