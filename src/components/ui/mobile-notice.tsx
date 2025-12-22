"use client";

import { useState, useEffect } from "react";
import { X, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MobileNotice() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed in this session
    const dismissed = sessionStorage.getItem("mobile-notice-dismissed");
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Check if mobile device (screen width < 768px)
    const checkMobile = () => {
      setIsVisible(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem("mobile-notice-dismissed", "true");
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Monitor className="h-5 w-5 shrink-0" />
          <p className="text-sm">
            <span className="font-medium">Pengalaman terbaik di Desktop.</span>{" "}
            Buka di laptop/PC untuk tampilan optimal.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="h-8 w-8 text-white hover:bg-white/20 shrink-0"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Tutup</span>
        </Button>
      </div>
    </div>
  );
}
