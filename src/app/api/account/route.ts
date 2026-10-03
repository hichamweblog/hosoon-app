import { createClient } from "@supabase/supabase-js";
export const runtime = "nodejs";
const reply = (error: string, status: number) => Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
async function limitedBody(request: Request): Promise<string> {
  const reader = request.body?.getReader(); if (!reader) throw new Error("No body");
  const chunks: Uint8Array[] = []; let bytes = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    bytes += value.byteLength; if (bytes > 256) { await reader.cancel(); throw new Error("Too large"); } chunks.push(value);
  }
  return chunks.map((chunk) => new TextDecoder().decode(chunk)).join("");
}
/** Server-only admin key. Target ID comes from verified JWT; browser ID is an intent guard only. */
export async function DELETE(request: Request) {
  const url = process.env.SUPABASE_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !adminKey || url === "/supabase") return reply("حذف الحساب يحتاج إعداد جهة الخادم. لم يُحذف شيء.", 503);
  try {
    const origin = request.headers.get("origin"), host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host"))?.split(",")[0].trim();
    if (origin && new URL(origin).host !== host && origin !== new URL(request.url).origin) return reply("مصدر الطلب غير مسموح", 403);
  } catch { return reply("مصدر الطلب غير صالح", 403); }
  const bearer = request.headers.get("authorization");
  if (!bearer?.startsWith("Bearer ") || bearer.length > 10000) return reply("سجّل دخولك أولًا", 401);
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return reply("طلب غير صالح", 400);
  try {
    const body = JSON.parse(await limitedBody(request));
    if (!body || body.confirmation !== "DELETE" || typeof body.ownerId !== "string" || Object.keys(body).length !== 2) return reply("تأكيد الحذف مطلوب", 400);
    const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await auth.auth.getUser(bearer.slice(7));
    if (error || !data.user) return reply("الجلسة غير صالحة؛ سجّل دخولك مجددًا", 401);
    if (data.user.id !== body.ownerId) return reply("تغيّر الحساب؛ أُلغي طلب الحذف القديم", 409);
    const admin = createClient(url, adminKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: correctionsError } = await admin.from("thumun_corrections").delete().eq("user_id", data.user.id);
    if (correctionsError) return reply("تعذّر إزالة اقتراحاتك؛ لم يؤكد حذف الحساب", 502);
    const { error: deletionError } = await admin.auth.admin.deleteUser(data.user.id);
    if (deletionError) return reply("تعذّر حذف الحساب. ربما أزيلت الاقتراحات، لكن حذف الحساب لم يتأكد.", 502);
    return Response.json({ deleted: true }, { headers: { "Cache-Control": "no-store" } });
  } catch { return reply("تعذّر تنفيذ الطلب؛ لم يُؤكد حذف الحساب", 400); }
}
