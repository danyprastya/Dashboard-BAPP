"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Moon,
  Sun,
  Monitor,
  Bell,
  Palette,
  Database,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { showSuccessToast, showInfoToast } from "@/lib/toast";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenLogViewer: () => void;
}

interface AppSettings {
  theme: "light" | "dark" | "system";
  compactMode: boolean;
  showNotifications: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
  showProgressPercentage: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  compactMode: false,
  showNotifications: true,
  autoRefresh: false,
  refreshInterval: 30,
  showProgressPercentage: true,
};

const SETTINGS_STORAGE_KEY = "bapp_dashboard_settings";

function getSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return stored
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
      : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function SettingsDialog({
  open,
  onOpenChange,
  onOpenLogViewer,
}: SettingsDialogProps) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  // Handle dialog open/close - load settings when opening
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        setSettings(getSettings());
        setHasChanges(false);
      }
      onOpenChange(isOpen);
    },
    [onOpenChange]
  );

  const updateSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveSettings(settings);
    setHasChanges(false);

    // Apply theme
    applyTheme(settings.theme);

    showSuccessToast("Pengaturan berhasil disimpan");
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setHasChanges(true);
    showInfoToast("Pengaturan dikembalikan ke default");
  };

  const applyTheme = (theme: "light" | "dark" | "system") => {
    const root = document.documentElement;

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      root.classList.toggle("dark", systemTheme === "dark");
    } else {
      root.classList.toggle("dark", theme === "dark");
    }
  };

  const clearAllData = () => {
    if (
      confirm(
        "Apakah Anda yakin ingin menghapus semua data lokal? Ini termasuk log dan pengaturan."
      )
    ) {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
      localStorage.removeItem("bapp_dashboard_logs");
      setSettings(DEFAULT_SETTINGS);
      showSuccessToast("Data lokal berhasil dihapus");
    }
  };

  const themeIcon = {
    light: <Sun className="h-4 w-4" />,
    dark: <Moon className="h-4 w-4" />,
    system: <Monitor className="h-4 w-4" />,
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Pengaturan
          </DialogTitle>
          <DialogDescription>
            Konfigurasi tampilan dan preferensi aplikasi
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Theme Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Palette className="h-4 w-4" />
              Tampilan
            </div>

            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="theme" className="flex items-center gap-2">
                  {themeIcon[settings.theme]}
                  Tema
                </Label>
                <Select
                  value={settings.theme}
                  onValueChange={(v) =>
                    updateSetting("theme", v as AppSettings["theme"])
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Terang</SelectItem>
                    <SelectItem value="dark">Gelap</SelectItem>
                    <SelectItem value="system">Sistem</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="compact-mode">Mode Kompak</Label>
                <Switch
                  id="compact-mode"
                  checked={settings.compactMode}
                  onCheckedChange={(v) => updateSetting("compactMode", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show-percentage">Tampilkan Persentase</Label>
                <Switch
                  id="show-percentage"
                  checked={settings.showProgressPercentage}
                  onCheckedChange={(v) =>
                    updateSetting("showProgressPercentage", v)
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Notifications Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Bell className="h-4 w-4" />
              Notifikasi
            </div>

            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications">Aktifkan Notifikasi</Label>
                <Switch
                  id="notifications"
                  checked={settings.showNotifications}
                  onCheckedChange={(v) => updateSetting("showNotifications", v)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Auto Refresh Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <RefreshCw className="h-4 w-4" />
              Refresh Otomatis
            </div>

            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-refresh">Aktifkan Auto Refresh</Label>
                <Switch
                  id="auto-refresh"
                  checked={settings.autoRefresh}
                  onCheckedChange={(v) => updateSetting("autoRefresh", v)}
                />
              </div>

              {settings.autoRefresh && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="refresh-interval">Interval (detik)</Label>
                  <Select
                    value={settings.refreshInterval.toString()}
                    onValueChange={(v) =>
                      updateSetting("refreshInterval", parseInt(v))
                    }
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="60">60</SelectItem>
                      <SelectItem value="120">120</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Data Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Database className="h-4 w-4" />
              Data & Log
            </div>

            <div className="space-y-3 pl-6">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  onOpenChange(false);
                  setTimeout(onOpenLogViewer, 100);
                }}
              >
                <Database className="mr-2 h-4 w-4" />
                Lihat Log Aktivitas
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={clearAllData}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Hapus Semua Data Lokal
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleReset}>
            Reset ke Default
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
