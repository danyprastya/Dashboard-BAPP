"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Loader2,
  AlertCircle,
  Info,
  ShieldX,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
} from "lucide-react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const { signIn, signUp, isPlaceholderMode } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check for error params from middleware redirect (only show if just redirected)
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "unauthorized") {
      setError(
        "Email Anda tidak terdaftar dalam sistem. Hubungi administrator untuk mendapatkan akses.",
      );
      // Clear the error param from URL to prevent showing on refresh
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.pathname);
    } else if (errorParam === "unauthenticated") {
      setError(
        "Silakan login terlebih dahulu untuk mengakses halaman tersebut.",
      );
      // Clear the error param from URL
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.pathname);
    } else if (errorParam === "profile_error") {
      setError(
        "Terjadi kesalahan saat membuat profil pengguna. Silakan coba lagi atau hubungi administrator.",
      );
      // Clear the error param from URL
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.pathname);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (isRegisterMode) {
        // Registration
        if (password !== confirmPassword) {
          setError("Password dan konfirmasi password tidak cocok.");
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setError("Password minimal 6 karakter.");
          setIsLoading(false);
          return;
        }

        const { error } = await signUp(email, password, fullName);

        if (error) {
          if (
            error.message.includes("already registered") ||
            error.message.includes("already exists")
          ) {
            setError("Email sudah terdaftar. Silakan login.");
          } else if (error.message.includes("Email not confirmed")) {
            setError(
              "Email belum dikonfirmasi. Cek inbox email Anda untuk link konfirmasi.",
            );
          } else {
            setError(error.message);
          }
        } else {
          setSuccessMessage(
            "Registrasi berhasil! Silakan login dengan akun Anda.",
          );
          setIsRegisterMode(false);
          setPassword("");
          setConfirmPassword("");
        }
      } else {
        // Login
        const { error } = await signIn(email, password);

        if (error) {
          if (error.message.includes("Email not confirmed")) {
            setError(
              "Email belum dikonfirmasi. Cek inbox email Anda untuk link konfirmasi, atau hubungi administrator.",
            );
          } else if (error.message.includes("Invalid login credentials")) {
            setError("Email atau password salah.");
          } else {
            setError(error.message);
          }
        } else {
          router.push("/dashboard");
          router.refresh();
        }
      }
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setError(null);
    setSuccessMessage(null);
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Dashboard BAPP
        </CardTitle>
        <CardDescription className="text-center">
          {isRegisterMode
            ? "Buat akun baru untuk mengakses dashboard"
            : "Masuk untuk mengakses dashboard monitoring kontrak"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isPlaceholderMode && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Mode Demo</p>
              <p className="text-blue-600 dark:text-blue-400">
                Supabase belum dikonfigurasi. Masukkan email apapun untuk masuk
                dengan data placeholder.
              </p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegisterMode && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Nama Lengkap</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Masukkan nama lengkap"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Masukkan email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder=""
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!isPlaceholderMode}
                disabled={isLoading}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {isRegisterMode && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder=""
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className={`pr-10 ${confirmPassword && password !== confirmPassword ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Password dan konfirmasi password tidak cocok
                </p>
              )}
            </div>
          )}

          {error && (
            <div
              className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
                searchParams.get("error") === "unauthorized"
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {searchParams.get("error") === "unauthorized" ? (
                <ShieldX className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Memproses..." : isRegisterMode ? "Daftar" : "Masuk"}
          </Button>
        </form>

      </CardContent>
      <CardFooter className="flex justify-center">
        <Button
          variant="link"
          className="text-sm text-muted-foreground"
          onClick={toggleMode}
        >
          {isRegisterMode ? (
            <>
              <LogIn className="mr-1 h-4 w-4" />
              Sudah punya akun? Masuk
            </>
          ) : (
            <>
              <UserPlus className="mr-1 h-4 w-4" />
              Belum punya akun? Daftar
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
