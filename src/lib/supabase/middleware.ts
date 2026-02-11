import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Support both key names for flexibility
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  // If Supabase is not configured, allow access in dev mode (placeholder mode)
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Define public routes that don't require authentication
  const publicRoutes = ["/login", "/auth/callback"];
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Define protected routes that require authentication + email in database
  const protectedRoutes = ["/dashboard"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Redirect to login if not authenticated and trying to access protected route
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "unauthenticated");
    return NextResponse.redirect(url);
  }

  // If user is authenticated and trying to access protected route, verify/create profile in database
  if (user && isProtectedRoute) {
    // Check if user's email exists in the profiles table
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, email, role")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      // Profile not found - try to create it
      console.log("Middleware: Profile not found for user, creating...", user.email);
      
      const { error: createError } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
          role: "user",
          created_at: new Date().toISOString(),
        });

      if (createError) {
        console.error("Middleware: Profile creation failed:", createError.message);
        // Only sign out if profile creation truly fails and profile doesn't exist
        // Check one more time if profile exists (might be race condition)
        const { data: retryProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();
        
        if (!retryProfile) {
          // Profile really doesn't exist and can't be created
          await supabase.auth.signOut();
          const url = request.nextUrl.clone();
          url.pathname = "/login";
          url.searchParams.set("error", "profile_error");
          return NextResponse.redirect(url);
        }
      } else {
        console.log("Middleware: Profile created successfully for", user.email);
      }
    }
  }

  // Redirect to login if not authenticated and not on a public route
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect to dashboard if authenticated and on login page
  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
