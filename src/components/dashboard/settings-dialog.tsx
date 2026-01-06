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
import { Input } from "@/components/ui/input";
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
  Mail,
  Plus,
  X,
} from "lucide-react";
import { useSettings } from "@/components/providers/settings-provider";
import { showSuccessToast, showInfoToast } from "@/lib/toast";
import { clearLogs, getLogs } from "@/lib/logger";
import {
  getEmailSettings,
  saveEmailSettings,
  type EmailNotificationSettings,
  defaultEmailSettings,
} from "@/lib/notifications";
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

  // Email notification settings
  const [emailSettings, setEmailSettings] =
    useState<EmailNotificationSettings>(defaultEmailSettings);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  // Sync local settings when dialog opens or settings change
  useEffect(() => {
    if (open && isLoaded) {
      setLocalSettings(settings);
      setEmailSettings(getEmailSettings());
      setHasChanges(false);
      setLogCount(getLogs().length);
      setNewEmail("");
      setEmailError("");
    }
  }, [open, isLoaded, settings]);

  const updateLocalSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateEmailSetting = <K extends keyof EmailNotificationSettings>(
    key: K,
    value: EmailNotificationSettings[K]
  ) => {
    setEmailSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const addEmailRecipient = () => {
    setEmailError("");
    const email = newEmail.trim().toLowerCase();

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Format email tidak valid");
      return;
    }

    if (emailSettings.recipients.includes(email)) {
      setEmailError("Email sudah ada dalam daftar");
      return;
    }

    setEmailSettings((prev) => ({
      ...prev,
      recipients: [...prev.recipients, email],
    }));
    setNewEmail("");
    setHasChanges(true);
  };

  const removeEmailRecipient = (email: string) => {
    setEmailSettings((prev) => ({
      ...prev,
      recipients: prev.recipients.filter((e) => e !== email),
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettings(localSettings);
    saveEmailSettings(emailSettings);
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
    setEmailSettings(defaultEmailSettings);
    saveEmailSettings(defaultEmailSettings);
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

          {/* Email Notification Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4" />
              Notifikasi Email
            </div>

            <div className="space-y-4 pl-6">
              {/* Enable Email Notifications */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="email-notifications"
                    className="flex items-center gap-2"
                  >
                    {emailSettings.enabled ? (
                      <Mail className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    )}
                    Aktifkan Notifikasi Email
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Kirim notifikasi ke email untuk deadline dan progress
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={emailSettings.enabled}
                  onCheckedChange={(v) => updateEmailSetting("enabled", v)}
                />
              </div>

              {emailSettings.enabled && (
                <>
                  {/* Email Recipients */}
                  <div className="space-y-2">
                    <Label className="text-sm">Daftar Penerima</Label>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="email@contoh.com"
                        value={newEmail}
                        onChange={(e) => {
                          setNewEmail(e.target.value);
                          setEmailError("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addEmailRecipient();
                          }
                        }}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={addEmailRecipient}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {emailError && (
                      <p className="text-xs text-destructive">{emailError}</p>
                    )}
                    {emailSettings.recipients.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {emailSettings.recipients.map((email) => (
                          <Badge
                            key={email}
                            variant="secondary"
                            className="pr-1 flex items-center gap-1"
                          >
                            {email}
                            <button
                              type="button"
                              onClick={() => removeEmailRecipient(email)}
                              className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Belum ada email penerima
                      </p>
                    )}
                  </div>

                  <Separator className="my-2" />

                  {/* Email Options */}
                  <div className="space-y-3">
                    {/* Deadline Warnings */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Peringatan Deadline</Label>
                        <p className="text-xs text-muted-foreground">
                          Ingatkan sebelum deadline kontrak
                        </p>
                      </div>
                      <Switch
                        checked={emailSettings.sendDeadlineWarnings}
                        onCheckedChange={(v) =>
                          updateEmailSetting("sendDeadlineWarnings", v)
                        }
                      />
                    </div>

                    {emailSettings.sendDeadlineWarnings && (
                      <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                        <Label className="text-sm">Ingatkan</Label>
                        <Select
                          value={emailSettings.deadlineWarningDays.toString()}
                          onValueChange={(v) =>
                            updateEmailSetting(
                              "deadlineWarningDays",
                              parseInt(v)
                            )
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3">3 hari</SelectItem>
                            <SelectItem value="7">7 hari</SelectItem>
                            <SelectItem value="14">14 hari</SelectItem>
                            <SelectItem value="30">30 hari</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Weekly Summary */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Ringkasan Mingguan</Label>
                        <p className="text-xs text-muted-foreground">
                          Kirim laporan progress setiap minggu
                        </p>
                      </div>
                      <Switch
                        checked={emailSettings.sendWeeklySummary}
                        onCheckedChange={(v) =>
                          updateEmailSetting("sendWeeklySummary", v)
                        }
                      />
                    </div>

                    {/* Progress Alerts */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Alert Progress</Label>
                        <p className="text-xs text-muted-foreground">
                          Notifikasi saat kontrak selesai atau bermasalah
                        </p>
                      </div>
                      <Switch
                        checked={emailSettings.sendProgressAlerts}
                        onCheckedChange={(v) =>
                          updateEmailSetting("sendProgressAlerts", v)
                        }
                      />
                    </div>
                  </div>
                </>
              )}
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
