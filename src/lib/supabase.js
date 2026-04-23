import { createClient } from "@supabase/supabase-js";

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Normalize URL to just the origin (strips /rest/v1/ or any other path suffix)
let supabaseUrl = "";
try {
  supabaseUrl = new URL(rawUrl?.trim() ?? "").origin;
} catch {
  supabaseUrl = "";
}

const supabaseAnonKey = typeof rawKey === "string" ? rawKey.trim() : "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing or invalid Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel."
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
