"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
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
  const initRef = useRef(false);
  const profileFetchingRef = useRef(false);

  // Fetch user profile with timeout protection
  const fetchUserProfile = useCallback(
    async (
      userId: string,
      userEmail?: string,
      userName?: string,
    ): Promise<UserProfile | null> => {
      // Prevent duplicate fetches
      if (profileFetchingRef.current) {
        console.log("[Auth] Profile fetch already in progress, skipping");
        return null;
      }
      profileFetchingRef.current = true;

      console.log("[Auth] fetchUserProfile called for:", userId);
      const supabase = createClient();
      if (!supabase) {
        console.log("[Auth] No supabase client, returning null");
        profileFetchingRef.current = false;
        return null;
      }

      // Create timeout promise (3 seconds)
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          console.warn("[Auth] Profile fetch timeout (3s)");
          resolve(null);
        }, 3000);
      });

      try {
        // Race between actual fetch and timeout
        const fetchPromise = (async () => {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

          if (data) {
            console.log(
              "[Auth] Profile found:",
              data.email,
              "role:",
              data.role,
            );
            return data as UserProfile;
          }

          // Profile not found (PGRST116) - only for brand-new users
          if (error?.code === "PGRST116" && userEmail) {
            console.log("[Auth] Profile not found, creating for:", userEmail);

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
                console.log("[Auth] Race condition, fetching existing profile");
                const { data: existing } = await supabase
                  .from("profiles")
                  .select("*")
                  .eq("id", userId)
                  .single();
                if (existing) return existing as UserProfile;
              }
              console.warn("[Auth] Profile insert issue:", insertError.message);
            } else if (newProfile) {
              console.log("[Auth] New profile created:", newProfile.email);
              return newProfile as UserProfile;
            }
          }

          if (error && error.code !== "PGRST116") {
            console.error("[Auth] fetchUserProfile error:", error.message);
          }

          return null;
        })();

        const result = await Promise.race([fetchPromise, timeoutPromise]);
        return result;
      } catch (err: unknown) {
        console.error("[Auth] fetchUserProfile exception:", err);
        return null;
      } finally {
        profileFetchingRef.current = false;
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
    // Prevent double initialization in React Strict Mode
    if (initRef.current) return;
    initRef.current = true;

    console.log("[Auth] Initializing auth provider...");

    const supabase = createClient();

    if (!supabase) {
      // Placeholder mode - simulate logged in user for development
      console.log("[Auth] No Supabase config, entering placeholder mode");
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
        role: "super_admin",
        created_at: new Date().toISOString(),
      });
      setLoading(false);
      return;
    }

    // STEP 1: Initialize with explicit getSession() with timeout protection
    const initializeAuth = async () => {
      console.log("[Auth] Step 1: Getting session...");

      // Create getSession with timeout (3 seconds)
      const sessionTimeout = new Promise<{
        data: { session: null };
        error: { message: string };
      }>((resolve) => {
        setTimeout(() => {
          console.warn("[Auth] getSession timeout (3s)");
          resolve({
            data: { session: null },
            error: { message: "Session check timeout" },
          });
        }, 3000);
      });

      try {
        const result = await Promise.race([
          supabase.auth.getSession(),
          sessionTimeout,
        ]);

        const {
          data: { session },
          error: sessionError,
        } = result;

        if (sessionError) {
          console.error("[Auth] getSession error:", sessionError.message);
          setUser(null);
          setUserProfile(null);
          // Set loading false immediately
          console.log("[Auth] Setting loading to false (session error)");
          setLoading(false);
          return;
        }

        if (session?.user) {
          console.log("[Auth] Session found for:", session.user.email);
          setUser(session.user);

          // Set loading false IMMEDIATELY - don't wait for profile
          console.log("[Auth] Setting loading to false (session found)");
          setLoading(false);

          // Fetch profile ASYNC - not blocking
          fetchUserProfile(
            session.user.id,
            session.user.email || undefined,
            session.user.user_metadata?.full_name || undefined,
          ).then((profile) => {
            setUserProfile(profile);
            console.log(
              "[Auth] Profile loaded async, role:",
              profile?.role || "none",
            );
          });
        } else {
          console.log("[Auth] No session found");
          setUser(null);
          setUserProfile(null);
          console.log("[Auth] Setting loading to false (no session)");
          setLoading(false);
        }
      } catch (err) {
        console.error("[Auth] initializeAuth exception:", err);
        setUser(null);
        setUserProfile(null);
        console.log("[Auth] Setting loading to false (exception)");
        setLoading(false);
      }
    };

    // Run initialization
    initializeAuth();

    // STEP 2: Setup listener for SUBSEQUENT auth changes (sign in, sign out, token refresh)
    // This listener does NOT control initial loading - only reacts to changes
    console.log("[Auth] Step 2: Setting up auth state listener...");
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        console.log("[Auth] Auth state changed:", event);

        // Skip INITIAL_SESSION since we handle it above with getSession()
        if (event === "INITIAL_SESSION") {
          console.log(
            "[Auth] Skipping INITIAL_SESSION (handled by getSession)",
          );
          return;
        }

        // Handle actual auth changes
        if (event === "SIGNED_OUT") {
          console.log("[Auth] User signed out");
          setUser(null);
          setUserProfile(null);
          return;
        }

        if (session?.user) {
          console.log("[Auth] Session updated for:", session.user.email);
          setUser(session.user);

          // Fetch updated profile async - NOT awaiting/blocking
          fetchUserProfile(
            session.user.id,
            session.user.email || undefined,
            session.user.user_metadata?.full_name || undefined,
          ).then((profile) => {
            setUserProfile(profile);
            console.log("[Auth] Profile updated for:", session.user.email);
          });
        } else {
          setUser(null);
          setUserProfile(null);
        }
      },
    );

    return () => {
      console.log("[Auth] Cleaning up subscription");
      subscription.unsubscribe();
    };
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
