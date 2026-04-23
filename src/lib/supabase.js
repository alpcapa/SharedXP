import { createClient } from "@supabase/supabase-js";

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = typeof rawUrl === "string" ? rawUrl.trim() : "";
const supabaseAnonKey = typeof rawKey === "string" ? rawKey.trim() : "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel."
  );
}

let supabase;
try {
  supabase = createClient(
    supabaseUrl || "https://placeholder.supabase.co",
    supabaseAnonKey || "placeholder"
  );
} catch (e) {
  console.error("Failed to initialise Supabase client:", e);
  supabase = createClient("https://placeholder.supabase.co", "placeholder");
}

export { supabase };
