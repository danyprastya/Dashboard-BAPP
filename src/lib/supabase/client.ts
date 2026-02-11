import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Singleton Supabase browser client - reused across all calls
let cachedClient: SupabaseClient | null = null;

// Supabase client for browser/client components (singleton pattern)
export function createClient(): SupabaseClient | null {
  // Return cached client if exists and valid
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Support both key names for flexibility
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("[Supabase] Credentials not found. Using placeholder mode.");
    return null;
  }

  console.log("[Supabase] Creating new browser client");
  cachedClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return cachedClient;
}

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  const hasKey = !!(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                   process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY);
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && hasKey);
}
