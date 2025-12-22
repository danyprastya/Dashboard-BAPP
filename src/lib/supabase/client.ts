import { createBrowserClient } from "@supabase/ssr";

// Supabase client for browser/client components
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Support both key names for flexibility
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "Supabase credentials not found. Using placeholder mode."
    );
    // Return null to indicate placeholder mode
    return null;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  const hasKey = !!(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                   process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY);
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && hasKey);
}
