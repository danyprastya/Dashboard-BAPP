import { LoginForm } from "@/components/auth/login-form";


export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Left side - Login Form */}
      <div className="flex w-full items-center justify-center p-4">
          <LoginForm />
      </div>
    </div>
  );
}
