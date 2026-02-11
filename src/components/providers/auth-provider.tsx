"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";

// User roles
export type UserRole = "user" | "admin" | "super_admin";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isPlaceholderMode: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  // Role checks
  isUser: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  canEdit: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaceholderMode, setIsPlaceholderMode] = useState(false);

  // Fetch user profile from profiles table (read-only, never overwrites roles)
  const fetchUserProfile = useCallback(
    async (
      userId: string,
      userEmail?: string,
      userName?: string,
    ): Promise<UserProfile | null> => {
      const supabase = createClient();
      if (!supabase) return null;

      try {
        // Fetch profile from DB - single source of truth for roles
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (data) {
          return data as UserProfile;
        }

        // Profile not found (PGRST116) - only for brand-new users
        if (error?.code === "PGRST116" && userEmail) {
          console.log("Profile not found, creating for new user:", userEmail);

          const { data: newProfile, error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: userId,
              email: userEmail,
              full_name: userName || userEmail.split("@")[0],
              role: "user",
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (insertError) {
            if (insertError.code === "23505") {
              // Race condition: profile was created elsewhere, fetch it
              const { data: existing } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .single();
              if (existing) return existing as UserProfile;
            }
            console.warn("Profile insert issue:", insertError.message);
          } else if (newProfile) {
            return newProfile as UserProfile;
          }
        }

        if (error && error.code !== "PGRST116") {
          console.error("fetchUserProfile DB error:", error.message);
        }

        return null;
      } catch (err: unknown) {
        console.error("fetchUserProfile exception:", err);
        return null;
      }
    },
    [],
  );

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profile = await fetchUserProfile(
        user.id,
        user.email || undefined,
        user.user_metadata?.full_name || undefined,
      );
      setUserProfile(profile);
    }
  }, [user, fetchUserProfile]);

  useEffect(() => {
    const supabase = createClient();

    if (!supabase) {
      // Placeholder mode - simulate logged in user for development
      setIsPlaceholderMode(true);
      setUser({
        id: "placeholder-user",
        email: "demo@example.com",
        app_metadata: {},
        user_metadata: { full_name: "Demo User" },
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as User);
      setUserProfile({
        id: "placeholder-user",
        email: "demo@example.com",
        full_name: "Demo User",
        role: "super_admin", // Demo mode has full access
        created_at: new Date().toISOString(),
      });
      setLoading(false);
      return;
    }

    // Single source of truth: onAuthStateChange handles all auth events
    // INITIAL_SESSION fires first with current session, then SIGNED_IN/OUT etc.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        try {
          setUser(session?.user ?? null);

          if (session?.user) {
            const profile = await fetchUserProfile(
              session.user.id,
              session.user.email || undefined,
              session.user.user_metadata?.full_name || undefined,
            );
            setUserProfile(profile);
          } else {
            setUserProfile(null);
          }
        } catch (err) {
          console.error("Auth state change error:", err);
          setUserProfile(null);
        } finally {
          setLoading(false);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

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
      setUserProfile({
        id: "placeholder-user",
        email: email,
        full_name: "Demo User",
        role: "super_admin",
        created_at: new Date().toISOString(),
      });
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

  const signUp = async (email: string, password: string, fullName: string) => {
    const supabase = createClient();

    if (!supabase) {
      // Placeholder mode
      logger.info("Registrasi berhasil (Demo Mode)", email);
      return { error: null };
    }

    try {
      // Step 1: Create user in auth.users
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        logger.error("Registrasi gagal", error.message);
        return { error: error as Error };
      }

      // Step 2: Create profile in profiles table using upsert (handles race conditions)
      if (data.user) {
        console.log("Creating profile for user:", data.user.id, email);

        const { error: profileError } = await supabase.from("profiles").upsert(
          {
            id: data.user.id,
            email: email,
            full_name: fullName,
            role: "user",
            created_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );

        if (profileError && profileError.code !== "23505") {
          console.warn("Profile upsert issue:", profileError.message);
        } else {
          console.log("Profile upserted/created for:", email);
        }
      }

      logger.success("Registrasi berhasil", email);
      return { error: null };
    } catch (err) {
      console.error("SignUp exception:", err);
      return { error: new Error("Terjadi kesalahan saat registrasi") };
    }
  };

  const signInWithGoogle = async () => {
    const supabase = createClient();

    if (!supabase) {
      // Placeholder mode
      logger.info("Google login tidak tersedia (Demo Mode)");
      return {
        error: new Error("Google login tidak tersedia dalam mode demo"),
      };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      logger.error("Google login gagal", error.message);
    }

    return { error: error as Error | null };
  };

  const signOut = async () => {
    const supabase = createClient();

    if (!supabase) {
      setUser(null);
      setUserProfile(null);
      logger.info("Logout berhasil (Demo Mode)");
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
    logger.info("Logout berhasil");
  };

  // Role checks
  const role = userProfile?.role || "user";
  const isUser = role === "user";
  const isAdmin = role === "admin" || role === "super_admin";
  const isSuperAdmin = role === "super_admin";
  const canEdit = isAdmin; // admin and super_admin can edit

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        isPlaceholderMode,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        refreshProfile,
        isUser,
        isAdmin,
        isSuperAdmin,
        canEdit,
      }}
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
