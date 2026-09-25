import { createClient, type User } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export interface CloudUserProgress {
  user_id: string;
  current_day: number;
  streak: number;
  best_streak: number;
  total_xp: number;
  completed_tasks: Record<string, Record<string, boolean>>;
  daily_log: Record<string, unknown>;
  session_log: Record<string, unknown>;
  notes: Record<string, string>;
  thumun_ratings: Record<string, string>;
  edited_thumuns: Record<string, unknown>;
  khatma_completed_at: string | null;
  maintain: { active: boolean; day: number };
  settings: Record<string, unknown>;
  updated_at: string;
}

export type CloudProgressInput = Omit<CloudUserProgress, "user_id" | "updated_at"> & {
  updated_at?: string;
};

// ─── Authentication ────────────────────────────────────────────

export async function signInWithEmailPassword(email: string, password: string) {
  if (!supabase) return { data: null, error: { message: "المزامنة السحابية غير مهيأة" } };
  return await supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmailPassword(email: string, password: string) {
  if (!supabase) return { data: null, error: { message: "المزامنة السحابية غير مهيأة" } };
  return await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
  });
}

export async function signInWithMagicLink(email: string) {
  if (!supabase) return { data: null, error: { message: "المزامنة السحابية غير مهيأة" } };
  return await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
    },
  });
}

export async function sendPasswordReset(email: string) {
  if (!supabase) return { data: null, error: { message: "المزامنة السحابية غير مهيأة" } };
  return await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
  });
}

export async function signOutUser() {
  if (!supabase) return { error: null };
  return await supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<User | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** Subscribe to auth changes (magic-link return, cross-tab, token refresh). */
export function onAuthChange(cb: (user: User | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user ?? null);
  });
  return () => data.subscription.unsubscribe();
}

// ─── Cloud progress sync ───────────────────────────────────────

export async function fetchProgressFromCloud() {
  if (!supabase) return { data: null, error: { message: "Supabase not configured" } };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: { message: "User not authenticated" } };

  const { data, error } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  return { data: data as CloudUserProgress | null, error };
}

export async function syncProgressToCloud(input: CloudProgressInput) {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: "User not authenticated" } };

  const payload: CloudUserProgress = {
    ...input,
    user_id: user.id,
    updated_at: input.updated_at ?? new Date().toISOString(),
  };
  const { error } = await supabase
    .from("user_progress")
    .upsert(payload, { onConflict: "user_id" });
  return { error };
}

export async function deleteCloudData() {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: "User not authenticated" } };
  const { error } = await supabase.from("user_progress").delete().eq("user_id", user.id);
  return { error };
}

// ─── Community corrections (بيانات الأثمان) ─────────────────────

export async function submitThumunCorrection(input: {
  thumunId: number;
  fields: Record<string, unknown>;
  note: string;
}) {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("thumun_corrections").insert({
    thumun_id: input.thumunId,
    fields: input.fields,
    note: input.note,
    user_id: user?.id ?? null,
  });
  return { error };
}

// ─── Merge helper (device-safe two-way merge) ───────────────────

/**
 * Merge two progress snapshots deterministically:
 * - "amount" fields take the maximum (never lose progress),
 * - map fields union with LOCAL entries winning on key conflicts,
 * - timestamps take the newest.
 */
export function mergeProgress<
  T extends {
    currentDay: number;
    streak: number;
    bestStreak: number;
    totalXp: number;
    completedTasks: Record<number | string, Record<string, boolean>>;
    dailyLog: Record<string, { tasks: number; days: number[]; date: string }>;
    notes: Record<number | string, string>;
    thumunRatings: Record<number | string, string>;
    editedThumuns: Record<number | string, unknown>;
  },
>(local: T, remote: T): T {
  const completedTasks = {
    ...remote.completedTasks,
    ...local.completedTasks,
    // union per-day flags (a check on either device counts)
    ...Object.fromEntries(
      Object.keys(local.completedTasks)
        .filter((k) => remote.completedTasks[k])
        .map((k) => [
          k,
          { ...remote.completedTasks[k], ...local.completedTasks[k] },
        ]),
    ),
  } as T["completedTasks"];

  const dailyLog = { ...remote.dailyLog, ...local.dailyLog } as T["dailyLog"];

  return {
    ...local,
    currentDay: Math.max(local.currentDay, remote.currentDay),
    streak: Math.max(local.streak, remote.streak),
    bestStreak: Math.max(local.bestStreak, remote.bestStreak),
    totalXp: Math.max(local.totalXp, remote.totalXp),
    completedTasks,
    dailyLog,
    notes: { ...remote.notes, ...local.notes },
    thumunRatings: { ...remote.thumunRatings, ...local.thumunRatings },
    editedThumuns: { ...remote.editedThumuns, ...local.editedThumuns },
  };
}
