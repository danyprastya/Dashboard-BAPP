"use client";

import { useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Keyboard, Command } from "lucide-react";

// Keyboard shortcut definitions
export const SHORTCUTS = {
  // Navigation
  SEARCH_FOCUS: { keys: ["Ctrl", "K"], description: "Fokus ke pencarian" },
  CLOSE_DIALOG: { keys: ["Escape"], description: "Tutup dialog" },

  // Actions
  NEW_CONTRACT: { keys: ["Ctrl", "N"], description: "Tambah kontrak baru" },
  EXPORT: { keys: ["Ctrl", "E"], description: "Export data" },
  REFRESH: { keys: ["Ctrl", "R"], description: "Refresh data" },

  // View
  TOGGLE_THEME: { keys: ["Ctrl", "Shift", "T"], description: "Ganti tema" },
  SHOW_SHORTCUTS: { keys: ["Ctrl", "/"], description: "Tampilkan shortcuts" },
  SHOW_NOTIFICATIONS: { keys: ["Ctrl", "B"], description: "Buka notifikasi" },

  // Year navigation
  PREV_YEAR: { keys: ["Ctrl", "←"], description: "Tahun sebelumnya" },
  NEXT_YEAR: { keys: ["Ctrl", "→"], description: "Tahun berikutnya" },
} as const;

type ShortcutAction = keyof typeof SHORTCUTS;

interface UseKeyboardShortcutsOptions {
  onAction?: (action: ShortcutAction) => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onAction,
  enabled = true,
}: UseKeyboardShortcutsOptions = {}) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Allow Escape to close dialogs even in inputs
        if (event.key === "Escape") {
          onAction?.("CLOSE_DIALOG");
        }
        return;
      }

      const ctrl = event.ctrlKey || event.metaKey;
      const shift = event.shiftKey;
      const key = event.key.toLowerCase();

      // Ctrl + K - Search focus
      if (ctrl && key === "k") {
        event.preventDefault();
        onAction?.("SEARCH_FOCUS");
        return;
      }

      // Ctrl + N - New contract
      if (ctrl && key === "n") {
        event.preventDefault();
        onAction?.("NEW_CONTRACT");
        return;
      }

      // Ctrl + E - Export
      if (ctrl && key === "e") {
        event.preventDefault();
        onAction?.("EXPORT");
        return;
      }

      // Ctrl + R - Refresh (custom, prevent browser refresh)
      if (ctrl && key === "r") {
        event.preventDefault();
        onAction?.("REFRESH");
        return;
      }

      // Ctrl + Shift + T - Toggle theme
      if (ctrl && shift && key === "t") {
        event.preventDefault();
        onAction?.("TOGGLE_THEME");
        return;
      }

      // Ctrl + / - Show shortcuts
      if (ctrl && key === "/") {
        event.preventDefault();
        onAction?.("SHOW_SHORTCUTS");
        return;
      }

      // Ctrl + B - Show notifications
      if (ctrl && key === "b") {
        event.preventDefault();
        onAction?.("SHOW_NOTIFICATIONS");
        return;
      }

      // Ctrl + Left Arrow - Previous year
      if (ctrl && event.key === "ArrowLeft") {
        event.preventDefault();
        onAction?.("PREV_YEAR");
        return;
      }

      // Ctrl + Right Arrow - Next year
      if (ctrl && event.key === "ArrowRight") {
        event.preventDefault();
        onAction?.("NEXT_YEAR");
        return;
      }

      // Escape - Close dialog
      if (event.key === "Escape") {
        onAction?.("CLOSE_DIALOG");
        return;
      }
    },
    [enabled, onAction]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handleKeyDown]);
}

// Keyboard shortcuts help dialog
interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  const shortcutGroups = [
    {
      title: "Navigasi",
      shortcuts: [
        SHORTCUTS.SEARCH_FOCUS,
        SHORTCUTS.CLOSE_DIALOG,
        SHORTCUTS.PREV_YEAR,
        SHORTCUTS.NEXT_YEAR,
      ],
    },
    {
      title: "Aksi",
      shortcuts: [SHORTCUTS.NEW_CONTRACT, SHORTCUTS.EXPORT, SHORTCUTS.REFRESH],
    },
    {
      title: "Tampilan",
      shortcuts: [
        SHORTCUTS.TOGGLE_THEME,
        SHORTCUTS.SHOW_SHORTCUTS,
        SHORTCUTS.SHOW_NOTIFICATIONS,
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Gunakan shortcut untuk navigasi lebih cepat
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {shortcutGroups.map((group) => (
            <div key={group.title} className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                {group.title}
              </h4>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, index) => (
                        <span key={index}>
                          <Badge
                            variant="outline"
                            className="px-2 py-0.5 text-xs font-mono"
                          >
                            {key === "Ctrl" ? (
                              <span className="flex items-center gap-0.5">
                                <Command className="h-3 w-3" />
                              </span>
                            ) : (
                              key
                            )}
                          </Badge>
                          {index < shortcut.keys.length - 1 && (
                            <span className="mx-1 text-muted-foreground">
                              +
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Tekan{" "}
          <Badge
            variant="outline"
            className="mx-1 px-1.5 py-0 text-xs font-mono"
          >
            Ctrl
          </Badge>{" "}
          +{" "}
          <Badge
            variant="outline"
            className="mx-1 px-1.5 py-0 text-xs font-mono"
          >
            /
          </Badge>{" "}
          kapan saja untuk melihat shortcuts
        </p>
      </DialogContent>
    </Dialog>
  );
}

// Shortcut indicator component for buttons
interface ShortcutHintProps {
  shortcut: { keys: readonly string[] };
  className?: string;
}

export function ShortcutHint({ shortcut, className = "" }: ShortcutHintProps) {
  return (
    <span
      className={`hidden sm:inline-flex items-center gap-0.5 ml-2 text-xs text-muted-foreground ${className}`}
    >
      {shortcut.keys.map((key, index) => (
        <span key={index}>
          <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">
            {key === "Ctrl" ? "⌘" : key}
          </kbd>
          {index < shortcut.keys.length - 1 && (
            <span className="mx-0.5">+</span>
          )}
        </span>
      ))}
    </span>
  );
}
