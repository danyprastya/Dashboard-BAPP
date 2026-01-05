"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  type AppSettings,
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings as saveSettingsToStorage,
  applyTheme,
  applyCompactMode,
  initializeSettings,
} from "@/lib/settings";

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resetSettings: () => void;
  isLoaded: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize settings on mount
  useEffect(() => {
    const loadedSettings = initializeSettings();
    setSettings(loadedSettings);
    setIsLoaded(true);
  }, []);

  // Listen for settings changes from other tabs/components
  useEffect(() => {
    const handleSettingsChange = (event: CustomEvent<AppSettings>) => {
      setSettings(event.detail);
    };

    window.addEventListener(
      "settings-changed",
      handleSettingsChange as EventListener
    );
    return () => {
      window.removeEventListener(
        "settings-changed",
        handleSettingsChange as EventListener
      );
    };
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };

      // Apply changes immediately
      if (newSettings.theme !== undefined) {
        applyTheme(newSettings.theme);
      }
      if (newSettings.compactMode !== undefined) {
        applyCompactMode(newSettings.compactMode);
      }

      // Save to localStorage
      saveSettingsToStorage(updated);

      return updated;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    applyTheme(DEFAULT_SETTINGS.theme);
    applyCompactMode(DEFAULT_SETTINGS.compactMode);
    saveSettingsToStorage(DEFAULT_SETTINGS);
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        resetSettings,
        isLoaded,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
