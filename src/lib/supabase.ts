import { createClient, type User, type AuthChangeEvent } from "@supabase/supabase-js";
import { correctionFieldsSchema } from "./progress/schema";
import { decodeCloudRow, type CloudRecord } from "./progress/cloud-dto";
import { parseProgress } from "./progress/schema";
import { snapshotOf, type ProgressData } from "./progress/types";

const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Local development can proxy Supabase through the same preview origin.
const url = publicUrl === "/supabase" ? `${typeof window !== "undefined" ? window.location.origin : process.env.APP_ORIGIN ?? "https://hosoon.invalid"}/supabase` : publicUrl;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = !!(url && key && !url.includes("your-project") && !key.includes("your-anon"));
export const AUTH_STORAGE_KEY = url ? `sb-${new URL(url).hostname.split(".")[0]}-auth-token` : "hosoon-auth-unconfigured";
export const supabase = isSupabaseConfigured ? createClient(url!, key!, { auth: { storageKey: AUTH_STORAGE_KEY } }) : null;
const unavailable = () => ({ data: null, error: { message: "المزامنة السحابية غير مهيأة" } });
const origin = () => typeof window !== "undefined" ? window.location.origin : undefined;
export async function signInWithEmailPassword(email: string, password: string) {
  return supabase ? supabase.auth.signInWithPassword({ email: email.trim(), password }) : unavailable();
}
export async function signUpWithEmailPassword(email: string, password: string) {
  return supabase ? supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: origin() } }) : unavailable();
}
export async function signInWithMagicLink(email: string) {
  return supabase ? supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: origin() } }) : unavailable();
}
export async function sendPasswordReset(email: string) {
  return supabase ? supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: origin() ? `${origin()}/auth/recovery` : undefined }) : unavailable();
}
export async function updatePassword(password: string) {
  if (!supabase) return unavailable();
  if (password.length < 8) return { data: null, error: { message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" } };
  return supabase.auth.updateUser({ password });
}
export async function signOutUser(expectedOwner?: string) {
  if (supabase && expectedOwner) { const { data } = await supabase.auth.getSession(); if (data.session?.user.id !== expectedOwner) return { error: { message: "تغيّر الحساب؛ أُلغيت عملية الخروج القديمة" } }; }
  return supabase ? supabase.auth.signOut({ scope: "local" }) : { error: null };
}
export async function getCurrentUser(): Promise<User | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}
export function onAuthChange(cb: (user: User | null, event: AuthChangeEvent) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    // Never await Supabase calls inside its auth lock.
    queueMicrotask(() => cb(session?.user ?? null, event));
  });
  return () => data.subscription.unsubscribe();
}
async function requireOwner(owner: string) {
  if (!supabase) throw new Error("المزامنة السحابية غير مهيأة");
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.id !== owner) throw new Error("انتهت الجلسة أو تغير الحساب؛ لم تُرفع بياناتك");
}
function cloudError(error: { message: string; code?: string }): Error {
  if (["40001", "HSC01"].includes(error.code ?? "") || error.message.includes("HOSOON_CONFLICT")) return new CloudConflict();
  if (error.code === "42883" || error.message.includes("schema cache")) return new Error("انشر ترحيل Supabase الآمن قبل تفعيل المزامنة");
  return new Error("تعذّر الاتصال بالمزامنة. بقي تقدمك محليًا؛ حاول لاحقًا.");
}
export class CloudConflict extends Error { constructor() { super("تغيّر إصدار الخادم؛ يُعاد الدمج قبل الكتابة"); this.name = "CloudConflict"; } }
export async function fetchCloudProgress(owner: string, signal?: AbortSignal): Promise<CloudRecord> {
  await requireOwner(owner);
  let query = supabase!.from("user_progress").select("*").eq("user_id", owner);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.maybeSingle();
  if (error) throw cloudError(error); // Error is NEVER interpreted as an empty row.
  return decodeCloudRow(data, owner);
}
export async function saveCloudProgress(owner: string, data: ProgressData, expected: CloudRecord, signal?: AbortSignal): Promise<CloudRecord> {
  await requireOwner(owner);
  const snapshot = parseProgress(snapshotOf(data));
  if (snapshot.ownerId !== owner || snapshot.epoch !== expected.epoch) throw new Error("رفض رفع بيانات بملكية أو حقبة غير مطابقة");
  let query = supabase!.rpc("save_hosoon_progress", {
    p_expected_revision: expected.revision, p_expected_epoch: expected.epoch, p_snapshot: snapshot,
  });
  if (signal) query = query.abortSignal(signal);
  const { data: result, error } = await query;
  if (error) throw cloudError(error);
  return decodeCloudRow(Array.isArray(result) ? result[0] : result, owner);
}
export async function replaceCloudProgress(owner: string, data: ProgressData, expected: CloudRecord): Promise<CloudRecord> {
  await requireOwner(owner);
  const snapshot = parseProgress({ ...snapshotOf(data), ownerId: owner, epoch: expected.epoch });
  const { data: result, error } = await supabase!.rpc("reset_hosoon_progress", {
    p_expected_revision: expected.revision, p_snapshot: snapshot,
  });
  if (error) throw cloudError(error);
  return decodeCloudRow(Array.isArray(result) ? result[0] : result, owner);
}
export async function submitThumunCorrection(input: { thumunId: number; fields: Record<string, unknown>; note: string; source?: string; expectedOwnerId: string }) {
  if (!supabase) return unavailable();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || user.id !== input.expectedOwnerId) return { error: { message: "سجّل دخولك لإرسال الاقتراح؛ يمكنك حفظ المسودة محليًا" } };
  if (!Number.isInteger(input.thumunId) || input.thumunId < 1 || input.thumunId > 480) return { error: { message: "رقم ثمن غير صالح" } };
  const fields = correctionFieldsSchema.safeParse(input.fields);
  if (!fields.success || input.note.trim().length < 10 || input.note.length > 2000 || !input.source?.trim() || input.source.length > 1000)
    return { error: { message: "تحقق من حدود الآيات وأضف سببًا ومصدرًا للاقتراح" } };
  return supabase.from("thumun_corrections").insert({
    thumun_id: input.thumunId, fields: fields.data, note: input.note.trim(), source: input.source.trim(), user_id: user.id,
  });
}
export async function deleteAccount(expectedOwnerId: string) {
  if (!supabase) return { error: { message: "الحساب غير مهيأ" } };
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || session.user.id !== expectedOwnerId) return { error: { message: "سجّل دخولك أولًا" } };
  try {
    const response = await fetch("/api/account", {
      method: "DELETE", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: "DELETE", ownerId: expectedOwnerId }),
    });
    const body = await response.json();
    if (!response.ok) return { error: { message: typeof body.error === "string" ? body.error : "تعذّر حذف الحساب" } };
    return { error: null };
  } catch { return { error: { message: "تعذّر الاتصال. لم يُؤكد حذف الحساب." } }; }
}
export { mergeProgress } from "./progress/merge";

export async function fetchCloudMetadata(owner: string): Promise<CloudRecord> {
  await requireOwner(owner);
  const { data, error } = await supabase!.from("user_progress").select("user_id,revision,epoch").eq("user_id", owner).maybeSingle();
  if (error) throw cloudError(error);
  if (!data) return { snapshot: null, revision: 0, epoch: 0 };
  if (data.user_id !== owner || !Number.isSafeInteger(data.revision) || data.revision < 0 || !Number.isSafeInteger(data.epoch) || data.epoch < 0) throw new Error("لم يؤكد الخادم بيانات الملكية/الإصدار");
  return { snapshot: null, revision: data.revision, epoch: data.epoch };
}

export async function clearDeletedLocalSession(expectedOwner: string) {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    const session = raw ? JSON.parse(raw) : null;
    if (session?.user?.id === expectedOwner) {
      await supabase?.auth.stopAutoRefresh();
      localStorage.removeItem(AUTH_STORAGE_KEY); localStorage.removeItem(`${AUTH_STORAGE_KEY}-user`);
    }
  } catch { /* The caller still clears this owner's app workspace, never another owner. */ }
}
export async function fetchCloudRecoveries(owner: string): Promise<{ revision: number; snapshot: unknown; legacy_row: unknown; created_at: string }[]> {
  await requireOwner(owner);
  const { data, error } = await supabase!.from("progress_recoveries").select("revision,snapshot,legacy_row,created_at").eq("user_id", owner).order("revision", { ascending: false }).limit(3);
  if (error) throw cloudError(error);
  return data ?? [];
}
