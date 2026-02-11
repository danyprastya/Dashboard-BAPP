import { createBrowserClient } from "@supabase/ssr";

// Singleton Supabase browser client - reused across all calls
let cachedClient: ReturnType<typeof createBrowserClient> | null = null;
let checkedEnv = false;

// Supabase client for browser/client components (singleton pattern)
export function createClient() {
  // If we already checked and env vars were missing, return null fast
  if (checkedEnv && cachedClient === null) {
    return null;
  }

  if (cachedClient) {
    return cachedClient;
  }

  checkedEnv = true;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Support both key names for flexibility
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "Supabase credentials not found. Using placeholder mode."
    );
    return null;
  }

  cachedClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return cachedClient;
}

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  const hasKey = !!(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                   process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY);
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && hasKey);
}
