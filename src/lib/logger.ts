// Application Logger with localStorage persistence
export type LogLevel = "info" | "success" | "warning" | "error";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  details?: string;
  code?: string;
}

const LOG_STORAGE_KEY = "bapp_dashboard_logs";
const MAX_LOGS = 500; // Maximum number of logs to keep

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Get all logs from localStorage
export function getLogs(): LogEntry[] {
  if (typeof window === "undefined") return [];
  
  try {
    const stored = localStorage.getItem(LOG_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save logs to localStorage
function saveLogs(logs: LogEntry[]): void {
  if (typeof window === "undefined") return;
  
  try {
    // Keep only the most recent logs
    const trimmedLogs = logs.slice(-MAX_LOGS);
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(trimmedLogs));
  } catch (error) {
    console.error("Failed to save logs:", error);
  }
}

// Add a new log entry
export function addLog(
  level: LogLevel,
  message: string,
  details?: string,
  code?: string
): LogEntry {
  const entry: LogEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    level,
    message,
    details,
    code,
  };

  const logs = getLogs();
  logs.push(entry);
  saveLogs(logs);

  // Also log to console for debugging
  const consoleMethod = level === "error" ? "error" : level === "warning" ? "warn" : "log";
  console[consoleMethod](`[${level.toUpperCase()}] ${message}`, details || "");

  return entry;
}

// Clear all logs
export function clearLogs(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LOG_STORAGE_KEY);
}

// Export logs to JSON file
export function exportLogsAsJson(): void {
  const logs = getLogs();
  const dataStr = JSON.stringify(logs, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bapp-logs-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export logs to CSV file
export function exportLogsAsCsv(): void {
  const logs = getLogs();
  const headers = ["Timestamp", "Level", "Message", "Details", "Code"];
  const rows = logs.map((log) => [
    log.timestamp,
    log.level,
    `"${log.message.replace(/"/g, '""')}"`,
    `"${(log.details || "").replace(/"/g, '""')}"`,
    log.code || "",
  ]);
  
  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bapp-logs-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Get logs filtered by level
export function getLogsByLevel(level: LogLevel): LogEntry[] {
  return getLogs().filter((log) => log.level === level);
}

// Get logs from last N hours
export function getRecentLogs(hours: number): LogEntry[] {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - hours);
  return getLogs().filter((log) => new Date(log.timestamp) >= cutoff);
}

// Helper functions for common log types
export const logger = {
  info: (message: string, details?: string) => addLog("info", message, details),
  success: (message: string, details?: string) => addLog("success", message, details),
  warning: (message: string, details?: string, code?: string) => addLog("warning", message, details, code),
  error: (message: string, details?: string, code?: string) => addLog("error", message, details, code),
};
