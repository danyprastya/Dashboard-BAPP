import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { LoadingSpinner } from "@/components/ui/loading";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Left side - Login Form */}
      <div className="flex w-full items-center justify-center p-4">
        <Suspense fallback={<LoadingSpinner size="lg" text="Memuat..." />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
