"use client";

import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
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
  BellOff,
  Palette,
  Database,
  RefreshCw,
  Trash2,
  Minimize2,
  Percent,
  Clock,
  FileText,
  Info,
} from "lucide-react";
import { useSettings } from "@/components/providers/settings-provider";
import { showSuccessToast, showInfoToast } from "@/lib/toast";
import { clearLogs, getLogs } from "@/lib/logger";
import type { AppSettings } from "@/lib/settings";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenLogViewer: () => void;
}

export function SettingsDialog({
  open,
  onOpenChange,
  onOpenLogViewer,
}: SettingsDialogProps) {
  const { settings, updateSettings, resetSettings, isLoaded } = useSettings();
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [logCount, setLogCount] = useState(0);

  // Sync local settings when dialog opens or settings change
  useEffect(() => {
    if (open && isLoaded) {
      setLocalSettings(settings);
      setHasChanges(false);
      setLogCount(getLogs().length);
    }
  }, [open, isLoaded, settings]);

  const updateLocalSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettings(localSettings);
    setHasChanges(false);
    showSuccessToast("Pengaturan berhasil disimpan", { force: true });
  };

  const handleReset = () => {
    const defaultSettings: AppSettings = {
      theme: "system",
      compactMode: false,
      showNotifications: true,
      autoRefresh: false,
      refreshInterval: 30,
      showProgressPercentage: true,
    };
    resetSettings();
    setLocalSettings(defaultSettings);
    setHasChanges(false);
    showInfoToast("Pengaturan dikembalikan ke default", { force: true });
  };

  const clearAllData = () => {
    if (
      confirm(
        "Apakah Anda yakin ingin menghapus semua data lokal? Ini termasuk log dan pengaturan."
      )
    ) {
      clearLogs();
      handleReset();
      setLogCount(0);
      showSuccessToast("Data lokal berhasil dihapus", { force: true });
    }
  };

  const themeIcon = {
    light: <Sun className="h-4 w-4" />,
    dark: <Moon className="h-4 w-4" />,
    system: <Monitor className="h-4 w-4" />,
  };

  const themeLabel = {
    light: "Terang",
    dark: "Gelap",
    system: "Sistem",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Pengaturan
          </DialogTitle>
          <DialogDescription>
            Konfigurasi tampilan dan preferensi aplikasi. Semua pengaturan
            disimpan di browser Anda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto flex-1">
          {/* Theme Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Palette className="h-4 w-4" />
              Tampilan
            </div>

            <div className="space-y-4 pl-6">
              {/* Theme Selector */}
              <div className="flex items-center justify-between">
                <Label htmlFor="theme" className="flex items-center gap-2">
                  {themeIcon[localSettings.theme]}
                  <span>Tema</span>
                  <Badge variant="secondary" className="text-xs">
                    {themeLabel[localSettings.theme]}
                  </Badge>
                </Label>
                <Select
                  value={localSettings.theme}
                  onValueChange={(v) =>
                    updateLocalSetting("theme", v as AppSettings["theme"])
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        Terang
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        Gelap
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        Sistem
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Compact Mode */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="compact-mode"
                    className="flex items-center gap-2"
                  >
                    <Minimize2 className="h-4 w-4" />
                    Mode Kompak
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Kurangi padding dan spacing untuk tampilan lebih padat
                  </p>
                </div>
                <Switch
                  id="compact-mode"
                  checked={localSettings.compactMode}
                  onCheckedChange={(v) => updateLocalSetting("compactMode", v)}
                />
              </div>

              {/* Show Percentage */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="show-percentage"
                    className="flex items-center gap-2"
                  >
                    <Percent className="h-4 w-4" />
                    Tampilkan Persentase
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Tampilkan angka persentase di progress bar
                  </p>
                </div>
                <Switch
                  id="show-percentage"
                  checked={localSettings.showProgressPercentage}
                  onCheckedChange={(v) =>
                    updateLocalSetting("showProgressPercentage", v)
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

            <div className="space-y-4 pl-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="notifications"
                    className="flex items-center gap-2"
                  >
                    {localSettings.showNotifications ? (
                      <Bell className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <BellOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    Aktifkan Notifikasi
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Tampilkan toast untuk sukses, info, dan warning. Error
                    selalu ditampilkan.
                  </p>
                </div>
                <Switch
                  id="notifications"
                  checked={localSettings.showNotifications}
                  onCheckedChange={(v) =>
                    updateLocalSetting("showNotifications", v)
                  }
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

            <div className="space-y-4 pl-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="auto-refresh"
                    className="flex items-center gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    Aktifkan Auto Refresh
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Data dashboard akan diperbarui secara otomatis
                  </p>
                </div>
                <Switch
                  id="auto-refresh"
                  checked={localSettings.autoRefresh}
                  onCheckedChange={(v) => updateLocalSetting("autoRefresh", v)}
                />
              </div>

              {localSettings.autoRefresh && (
                <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                  <Label htmlFor="refresh-interval" className="text-sm">
                    Interval Refresh
                  </Label>
                  <Select
                    value={localSettings.refreshInterval.toString()}
                    onValueChange={(v) =>
                      updateLocalSetting("refreshInterval", parseInt(v))
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 detik</SelectItem>
                      <SelectItem value="30">30 detik</SelectItem>
                      <SelectItem value="60">1 menit</SelectItem>
                      <SelectItem value="120">2 menit</SelectItem>
                      <SelectItem value="300">5 menit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Data & Log Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Database className="h-4 w-4" />
              Data & Log
            </div>

            <div className="space-y-3 pl-6">
              {/* Log Info */}
              <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Log Aktivitas</span>
                </div>
                <Badge variant="secondary">{logCount} entri</Badge>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  onOpenChange(false);
                  setTimeout(onOpenLogViewer, 100);
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
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

              {/* Info */}
              <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950 p-3 text-xs text-blue-700 dark:text-blue-300">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  Semua pengaturan dan log disimpan di browser lokal Anda. Data
                  ini tidak dikirim ke server dan akan hilang jika Anda
                  menghapus data browser.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 shrink-0 border-t pt-4">
          <Button variant="ghost" onClick={handleReset} size="sm">
            Reset ke Default
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges} size="sm">
            Simpan Perubahan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
