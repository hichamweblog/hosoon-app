import { createClient } from "@supabase/supabase-js";

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
  completed_tasks: Record<string, any>;
  daily_log: Record<string, any>;
  notes: Record<string, any>;
  edited_thumuns: Record<string, any>;
  updated_at: string;
}

/**
 * Sync user progress to Supabase
 */
export async function syncProgressToCloud(progress: {
  currentDay: number;
  streak: number;
  bestStreak: number;
  totalXp: number;
  completedTasks: Record<number, any>;
  dailyLog: Record<string, any>;
  notes: Record<number, string>;
  editedThumuns: Record<number, any>;
}) {
  if (!supabase) return { error: "Supabase not configured" };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "User not authenticated" };

  const payload: CloudUserProgress = {
    user_id: user.id,
    current_day: progress.currentDay,
    streak: progress.streak,
    best_streak: progress.bestStreak,
    total_xp: progress.totalXp,
    completed_tasks: progress.completedTasks,
    daily_log: progress.dailyLog,
    notes: progress.notes,
    edited_thumuns: progress.editedThumuns,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("user_progress")
    .upsert(payload, { onConflict: "user_id" });

  return { error };
}

/**
 * Fetch user progress from Supabase
 */
export async function fetchProgressFromCloud() {
  if (!supabase) return { data: null, error: "Supabase not configured" };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "User not authenticated" };

  const { data, error } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return { data, error };
}
