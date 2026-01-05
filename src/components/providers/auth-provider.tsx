"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isPlaceholderMode: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaceholderMode, setIsPlaceholderMode] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    if (!supabase) {
      // Placeholder mode - simulate logged in user for development
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPlaceholderMode(true);
      setUser({
        id: "placeholder-user",
        email: "demo@example.com",
        app_metadata: {},
        user_metadata: { full_name: "Demo User" },
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as User);
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const supabase = createClient();

    if (!supabase) {
      // Placeholder mode - simulate successful login
      setUser({
        id: "placeholder-user",
        email: email,
        app_metadata: {},
        user_metadata: { full_name: "Demo User" },
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as User);
      logger.info("Login berhasil (Demo Mode)", email);
      return { error: null };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.error("Login gagal", error.message);
    } else {
      logger.success("Login berhasil", email);
    }

    return { error: error as Error | null };
  };

  const signOut = async () => {
    const supabase = createClient();

    if (!supabase) {
      setUser(null);
      logger.info("Logout berhasil (Demo Mode)");
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
    logger.info("Logout berhasil");
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, isPlaceholderMode, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
