// Application Settings Manager
// Centralized settings with real functionality

export interface AppSettings {
  theme: "light" | "dark" | "system";
  compactMode: boolean;
  showNotifications: boolean;
  autoRefresh: boolean;
  refreshInterval: number; // in seconds
  showProgressPercentage: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  compactMode: false,
  showNotifications: true,
  autoRefresh: false,
  refreshInterval: 30,
  showProgressPercentage: true,
};

const SETTINGS_STORAGE_KEY = "bapp_dashboard_settings";

// Get settings from localStorage
export function getSettings(): AppSettings {
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

// Save settings to localStorage
export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  
  // Dispatch custom event to notify all components
  window.dispatchEvent(new CustomEvent("settings-changed", { detail: settings }));
}

// Apply theme to document
export function applyTheme(theme: AppSettings["theme"]): void {
  if (typeof window === "undefined") return;
  
  const root = document.documentElement;

  if (theme === "system") {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    root.classList.toggle("dark", systemTheme === "dark");
  } else {
    root.classList.toggle("dark", theme === "dark");
  }
}

// Apply compact mode to document
export function applyCompactMode(compact: boolean): void {
  if (typeof window === "undefined") return;
  
  const root = document.documentElement;
  root.classList.toggle("compact-mode", compact);
}

// Initialize settings on app load
export function initializeSettings(): AppSettings {
  const settings = getSettings();
  applyTheme(settings.theme);
  applyCompactMode(settings.compactMode);
  
  // Listen for system theme changes
  if (settings.theme === "system") {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", () => {
      const currentSettings = getSettings();
      if (currentSettings.theme === "system") {
        applyTheme("system");
      }
    });
  }
  
  return settings;
}

// Check if notifications are enabled
export function areNotificationsEnabled(): boolean {
  return getSettings().showNotifications;
}

// Check if percentage should be shown
export function shouldShowPercentage(): boolean {
  return getSettings().showProgressPercentage;
}

// Check if compact mode is enabled
export function isCompactMode(): boolean {
  return getSettings().compactMode;
}

// Get auto refresh settings
export function getAutoRefreshSettings(): { enabled: boolean; interval: number } {
  const settings = getSettings();
  return {
    enabled: settings.autoRefresh,
    interval: settings.refreshInterval * 1000, // Convert to milliseconds
  };
}
