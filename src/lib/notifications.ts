// Notification System Types and Functions

export type NotificationPriority = "low" | "medium" | "high" | "urgent";
export type NotificationType = 
  | "deadline_warning" 
  | "progress_update" 
  | "contract_created"
  | "contract_deleted"
  | "reminder"
  | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface EmailNotificationSettings {
  enabled: boolean;
  recipients: string[];
  sendDeadlineWarnings: boolean;
  sendWeeklySummary: boolean;
  sendProgressAlerts: boolean;
  deadlineWarningDays: number; // Days before deadline to send warning
}

// Default email notification settings
export const defaultEmailSettings: EmailNotificationSettings = {
  enabled: false,
  recipients: [],
  sendDeadlineWarnings: true,
  sendWeeklySummary: false,
  sendProgressAlerts: true,
  deadlineWarningDays: 7,
};

// Local storage keys
const NOTIFICATIONS_KEY = "bapp_notifications";
const EMAIL_SETTINGS_KEY = "bapp_email_settings";

// Get notifications from localStorage
export function getNotifications(): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save notifications to localStorage
export function saveNotifications(notifications: Notification[]): void {
  if (typeof window === "undefined") return;
  try {
    // Keep only last 100 notifications
    const trimmed = notifications.slice(0, 100);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error("Failed to save notifications:", error);
  }
}

// Add a new notification
export function addNotification(
  notification: Omit<Notification, "id" | "timestamp" | "read">
): Notification {
  const newNotification: Notification = {
    ...notification,
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    read: false,
  };

  const existing = getNotifications();
  const updated = [newNotification, ...existing];
  saveNotifications(updated);

  return newNotification;
}

// Mark notification as read
export function markAsRead(notificationId: string): void {
  const notifications = getNotifications();
  const updated = notifications.map((n) =>
    n.id === notificationId ? { ...n, read: true } : n
  );
  saveNotifications(updated);
}

// Mark all notifications as read
export function markAllAsRead(): void {
  const notifications = getNotifications();
  const updated = notifications.map((n) => ({ ...n, read: true }));
  saveNotifications(updated);
}

// Delete a notification
export function deleteNotification(notificationId: string): void {
  const notifications = getNotifications();
  const updated = notifications.filter((n) => n.id !== notificationId);
  saveNotifications(updated);
}

// Clear all notifications
export function clearNotifications(): void {
  saveNotifications([]);
}

// Get unread count
export function getUnreadCount(): number {
  return getNotifications().filter((n) => !n.read).length;
}

// Get email notification settings
export function getEmailSettings(): EmailNotificationSettings {
  if (typeof window === "undefined") return defaultEmailSettings;
  try {
    const stored = localStorage.getItem(EMAIL_SETTINGS_KEY);
    return stored ? { ...defaultEmailSettings, ...JSON.parse(stored) } : defaultEmailSettings;
  } catch {
    return defaultEmailSettings;
  }
}

// Save email notification settings
export function saveEmailSettings(settings: EmailNotificationSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EMAIL_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save email settings:", error);
  }
}

// Priority colors for UI
export const priorityColors: Record<NotificationPriority, string> = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  urgent: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
};

export const priorityBorderColors: Record<NotificationPriority, string> = {
  low: "border-l-slate-400",
  medium: "border-l-blue-500",
  high: "border-l-amber-500",
  urgent: "border-l-rose-500",
};

// Type icons mapping
export const typeLabels: Record<NotificationType, string> = {
  deadline_warning: "Peringatan Deadline",
  progress_update: "Update Progress",
  contract_created: "Kontrak Baru",
  contract_deleted: "Kontrak Dihapus",
  reminder: "Pengingat",
  system: "Sistem",
};

// Generate deadline warning notifications for contracts
export function checkDeadlineWarnings(
  contracts: Array<{
    name: string;
    customerName: string;
    monthlyProgress: Array<{ month: number; percentage: number }>;
  }>,
  currentMonth: number,
  warningDays: number = 7
): void {
  const currentDay = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), currentMonth, 0).getDate();
  const daysRemaining = daysInMonth - currentDay;

  if (daysRemaining > warningDays) return;

  contracts.forEach((contract) => {
    const currentProgress = contract.monthlyProgress.find(
      (p) => p.month === currentMonth
    );

    if (currentProgress && currentProgress.percentage < 100) {
      // Check if we already have a warning for this contract this month
      const existing = getNotifications();
      const hasWarning = existing.some(
        (n) =>
          n.type === "deadline_warning" &&
          n.metadata?.contractName === contract.name &&
          n.metadata?.month === currentMonth
      );

      if (!hasWarning) {
        addNotification({
          type: "deadline_warning",
          priority: currentProgress.percentage < 50 ? "urgent" : "high",
          title: `Deadline Mendekati: ${contract.name}`,
          message: `Kontrak ${contract.name} (${contract.customerName}) memiliki progress ${currentProgress.percentage}% dengan ${daysRemaining} hari tersisa di bulan ini.`,
          metadata: {
            contractName: contract.name,
            customerName: contract.customerName,
            month: currentMonth,
            progress: currentProgress.percentage,
          },
        });
      }
    }
  });
}
