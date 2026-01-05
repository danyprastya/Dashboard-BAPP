"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  LogOut,
  User,
  LayoutDashboard,
  Settings,
  ScrollText,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { SettingsDialog } from "./settings-dialog";
import { LogViewerDialog } from "./log-viewer-dialog";

export function DashboardHeader() {
  const { user, signOut, isPlaceholderMode } = useAuth();
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);
  const [showLogViewer, setShowLogViewer] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  const userInitials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : "U";

  const userName = user?.user_metadata?.full_name || user?.email || "Pengguna";

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-6 w-6" />
              <h1 className="text-xl font-semibold">Dashboard BAPP</h1>
            </div>
            {isPlaceholderMode && (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                Mode Demo
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {userName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowSettings(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Pengaturan</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowLogViewer(true)}>
                  <ScrollText className="mr-2 h-4 w-4" />
                  <span>Lihat Log</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Keluar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Settings Dialog */}
      <SettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        onOpenLogViewer={() => setShowLogViewer(true)}
      />

      {/* Log Viewer Dialog */}
      <LogViewerDialog open={showLogViewer} onOpenChange={setShowLogViewer} />
    </>
  );
}
