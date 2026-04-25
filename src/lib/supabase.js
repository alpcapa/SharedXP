import { createClient } from "@supabase/supabase-js";

const FALLBACK_URL = "https://bwdkelprrvhztpviiujo.supabase.co";
const FALLBACK_KEY = "sb_publishable_eR4cMdFvm8y4RGBRJfUe2g_BrqlDLFP";

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseUrl = FALLBACK_URL;
try {
  if (rawUrl?.trim()) supabaseUrl = new URL(rawUrl.trim()).origin;
} catch {
  supabaseUrl = FALLBACK_URL;
}

const supabaseAnonKey =
  typeof rawKey === "string" && rawKey.trim() ? rawKey.trim() : FALLBACK_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export { supabaseUrl, supabaseAnonKey };
