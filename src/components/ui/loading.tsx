"use client";

import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({
  size = "md",
  text,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className={`animate-spin text-primary ${sizeClasses[size]}`} />
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}

export function TableLoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header skeleton */}
      <div className="flex gap-2">
        <div className="h-10 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-10 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-10 w-48 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-10 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-12 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800"
          />
        ))}
      </div>
      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-2">
          <div className="h-12 w-16 animate-pulse rounded bg-neutral-100 dark:bg-neutral-900" />
          <div className="h-12 w-32 animate-pulse rounded bg-neutral-100 dark:bg-neutral-900" />
          <div className="h-12 w-48 animate-pulse rounded bg-neutral-100 dark:bg-neutral-900" />
          <div className="h-12 w-20 animate-pulse rounded bg-neutral-100 dark:bg-neutral-900" />
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="h-12 w-12 animate-pulse rounded bg-neutral-100 dark:bg-neutral-900"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardLoadingSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="space-y-3">
        <div className="h-4 w-1/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-8 w-1/2 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>
    </div>
  );
}

export function ContainerSpinner({
  text,
  className,
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className || "min-h-50"}`}
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}

export function TimeoutFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-5 text-center max-w-md px-4">
        <AlertCircle className="h-14 w-14 text-destructive" />
        <div>
          <h2 className="text-lg font-semibold">
            Server Terlalu Lama Merespons
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Koneksi ke server memakan waktu terlalu lama. Silakan muat ulang
            halaman.
          </p>
        </div>
        <Button onClick={onRetry} size="lg">
          <RefreshCw className="mr-2 h-4 w-4" />
          Muat Ulang Halaman
        </Button>
      </div>
    </div>
  );
}
